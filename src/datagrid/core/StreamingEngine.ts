import { IDataStore } from '../types/store';

export type FlashType = 'up' | 'down' | 'neutral';

export interface CellFlash {
  type: FlashType;
  timestamp: number;
}

export interface CellFlashState {
  type: FlashType;
  opacity: number;
}

export class StreamingEngine {
  /**
   * Active flash entries mapped by `${rowId}:${colId}`
   */
  public flashMap: Map<string, CellFlash> = new Map();

  /**
   * Duration of the pulse animation in milliseconds (default: 600ms)
   */
  public flashDuration: number = 600;

  /**
   * Apply high-frequency updates in bulk, compare old vs new values to compute pulse directions,
   * record timestamped flash states, and commit changes to the data store.
   */
  public async applyTransaction(
    updates: any[],
    idField: string = 'id',
    store: IDataStore
  ): Promise<void> {
    if (!updates || updates.length === 0) return;

    const now = performance.now();

    // 1. Build an efficient index of existing rows for old vs new value comparisons
    const existingRowMap = new Map<any, Record<string, any>>();

    // Check if store has direct rawData access
    const rawData = (store as any).rawData;
    if (Array.isArray(rawData)) {
      for (const row of rawData) {
        if (row && row[idField] !== undefined) {
          existingRowMap.set(row[idField], row);
        }
      }
    } else {
      // Fallback: inspect currently loaded virtual rows
      const rowCount = store.getRowCount();
      for (let r = 0; r < rowCount; r++) {
        const vRow = store.getViewRow(r);
        if (vRow && vRow.type === 'data' && vRow.data) {
          const rowKey = vRow.data[idField] ?? (vRow.data.id ?? r);
          existingRowMap.set(rowKey, vRow.data);
        }
      }
    }

    // 2. Identify delta changes and calculate flash direction ('up' | 'down' | 'neutral')
    const batchCellUpdates: Array<{ rowKey: any; columnId: string; value: any }> = [];

    for (const update of updates) {
      if (!update) continue;
      const rowId = update[idField] ?? update.id;
      if (rowId === undefined || rowId === null) continue;

      const oldRow = existingRowMap.get(rowId);

      for (const [colId, newVal] of Object.entries(update)) {
        if (colId === idField || colId.startsWith('__')) continue;

        batchCellUpdates.push({ rowKey: rowId, columnId: colId, value: newVal });

        const oldVal = oldRow ? oldRow[colId] : undefined;

        // Only flash if value actually changed
        if (oldVal !== newVal) {
          let flashType: FlashType = 'neutral';

          const numOld = typeof oldVal === 'number' ? oldVal : parseFloat(String(oldVal));
          const numNew = typeof newVal === 'number' ? newVal : parseFloat(String(newVal));

          if (!isNaN(numOld) && !isNaN(numNew)) {
            if (numNew > numOld) {
              flashType = 'up';
            } else if (numNew < numOld) {
              flashType = 'down';
            }
          }

          this.flashMap.set(`${rowId}:${colId}`, {
            type: flashType,
            timestamp: now,
          });
        }
      }
    }

    // 3. Commit mutations to the store in bulk
    if (typeof (store as any).setCellsBatch === 'function') {
      await (store as any).setCellsBatch(batchCellUpdates);
    } else if (typeof (store as any).updateRowFields === 'function') {
      for (const update of updates) {
        const rowId = update[idField] ?? update.id;
        if (rowId !== undefined) {
          await (store as any).updateRowFields(rowId, update);
        }
      }
    } else {
      for (const u of batchCellUpdates) {
        await store.setCell(u.rowKey, u.columnId, u.value);
      }
    }
  }

  /**
   * Get active flashes that haven't expired, purging expired ones.
   */
  public getActiveFlashes(now: number = performance.now()): Map<string, CellFlash> {
    for (const [key, flash] of this.flashMap.entries()) {
      if (now - flash.timestamp > this.flashDuration) {
        this.flashMap.delete(key);
      }
    }
    return this.flashMap;
  }

  /**
   * Retrieve the current flash state and fading opacity for a specific cell.
   * Returns null if the flash has expired or was not triggered.
   */
  public getFlash(
    rowId: any,
    colId: string,
    now: number = performance.now()
  ): CellFlashState | null {
    const key = `${rowId}:${colId}`;
    const flash = this.flashMap.get(key);
    if (!flash) return null;

    const elapsed = now - flash.timestamp;
    if (elapsed > this.flashDuration) {
      this.flashMap.delete(key);
      return null;
    }

    const opacity = Math.max(0, 1 - elapsed / this.flashDuration);
    return {
      type: flash.type,
      opacity,
    };
  }

  /**
   * Returns true if there is at least one active flash currently animating.
   */
  public hasActiveFlashes(now: number = performance.now()): boolean {
    for (const [key, flash] of this.flashMap.entries()) {
      if (now - flash.timestamp > this.flashDuration) {
        this.flashMap.delete(key);
      }
    }
    return this.flashMap.size > 0;
  }

  /**
   * Clear all active flashes immediately.
   */
  public clear(): void {
    this.flashMap.clear();
  }
}
