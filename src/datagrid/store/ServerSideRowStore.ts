import {
  IDataStore,
  BatchChanges,
} from '../types/store';
import { FilterDescriptor, SortDescriptor, DistinctItem } from '../types/filter';
import { GroupDescriptor, VirtualRow, SummaryType } from '../types/group';
import {
  IDatasource,
  IServerSideGetRowsParams,
  ServerSideStoreOptions,
} from '../types/ssrm';

/**
 * Enterprise Server-Side Row Model (SSRM) & Block Cache Engine.
 * Dynamically fetches, caches, and manages virtualized row windows via IDatasource.
 */
export class ServerSideRowStore implements IDataStore {
  private datasource: IDatasource;
  public readonly blockSize: number;
  private readonly maxBlocks: number;
  private readonly debounceMs: number;
  public readonly keyField: string;

  private rowCount: number;
  private isLastRowKnown: boolean = false;
  private hasInitialFetchTriggered: boolean = false;

  private cache = new Map<number, any[]>();
  private loadingBlocks = new Set<number>();
  private pendingDebounceBlocks = new Set<number>();
  private debounceTimer: any = null;

  private currentSort: any = [];
  private currentFilter: any = null;
  private currentSearch: string = '';
  private currentGroupKeys: string[] = [];

  private listeners = new Map<string, Set<Function>>();
  private subscribers = new Set<() => void>();
  private dirtyCells = new Map<string, boolean>();
  private pendingChanges: BatchChanges = { inserted: [], updated: [], deleted: [] };
  private batchMode: boolean = false;

  constructor(options: ServerSideStoreOptions) {
    this.datasource = options.datasource;
    this.blockSize = Math.max(10, options.blockSize ?? 100);
    this.maxBlocks = Math.max(5, options.maxBlocksInCache ?? 30);
    this.debounceMs = Math.max(0, options.debounceMs ?? 80);
    this.keyField = options.keyField ?? 'id';
    this.rowCount = Math.max(0, options.initialRowCount ?? this.blockSize);
  }

  // ============================================================================
  // CORE BLOCK CACHE & ACCESSORS
  // ============================================================================

  /**
   * Translates a global row index to its corresponding block index.
   */
  public getBlockIndex(rowIndex: number): number {
    return Math.floor(rowIndex / this.blockSize);
  }

  /**
   * Retrieves a single row by index. If the block is not loaded, triggers an on-demand fetch
   * and returns a placeholder loading stub in the meantime.
   */
  public getRow(index: number): any {
    if (index < 0 || (this.isLastRowKnown && index >= this.rowCount)) {
      return undefined;
    }

    const blockIndex = this.getBlockIndex(index);
    const block = this.cache.get(blockIndex);

    if (block) {
      // LRU refresh: move accessed block to end of Map iteration order
      this.cache.delete(blockIndex);
      this.cache.set(blockIndex, block);

      const offset = index % this.blockSize;
      return block[offset];
    }

    // Trigger on-demand block fetch if missing and not currently in flight
    if (!this.loadingBlocks.has(blockIndex)) {
      this.triggerFetchBlock(blockIndex);
    }

    // Return loading placeholder stub for the pending row
    return {
      __isLoading: true,
      [this.keyField]: `__loading_${index}`,
    };
  }

  /**
   * Checks whether a specific block is currently resident in memory.
   */
  public hasBlock(blockIndex: number): boolean {
    return this.cache.has(blockIndex);
  }

  /**
   * Checks whether a specific block is currently being fetched.
   */
  public isBlockLoading(blockIndex: number): boolean {
    return this.loadingBlocks.has(blockIndex);
  }

  // ============================================================================
  // IDATASTORE READABLE IMPLEMENTATION
  // ============================================================================

  public getRowCount(): number {
    return this.rowCount;
  }

  public getFilteredRowCount(): number {
    return this.rowCount;
  }

  public getTotalDatasetRowCount(): number {
    return this.rowCount;
  }

  public getViewRow(rowIndex: number): VirtualRow | undefined {
    const row = this.getRow(rowIndex);
    if (!row) return undefined;

    return {
      type: 'data',
      rawIndex: rowIndex,
      data: row,
    };
  }

  public async ensureRange(startRow: number, endRow: number): Promise<void> {
    if (!this.hasInitialFetchTriggered && this.cache.size === 0 && this.loadingBlocks.size === 0) {
      this.hasInitialFetchTriggered = true;
      this.triggerFetchBlock(0, true);
    }

    const startBlock = this.getBlockIndex(startRow);
    const endBlock = this.getBlockIndex(endRow);

    const missingBlocks: number[] = [];
    for (let b = startBlock; b <= endBlock; b++) {
      if (!this.cache.has(b) && !this.loadingBlocks.has(b)) {
        missingBlocks.push(b);
      }
    }

    if (missingBlocks.length === 0) {
      return Promise.resolve();
    }

    for (const b of missingBlocks) {
      this.triggerFetchBlock(b);
    }
  }

  public isRemote(): boolean {
    return true;
  }

  public getKeyField(): string {
    return this.keyField;
  }

  // ============================================================================
  // EVENT SUBSCRIPTIONS
  // ============================================================================

  public on(event: 'loading' | 'loaded' | 'error', callback: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public off(event: 'loading' | 'loaded' | 'error', callback: (...args: any[]) => void): void {
    this.listeners.get(event)?.delete(callback);
  }
  public subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(): void {
    for (const callback of this.subscribers) {
      try {
        callback();
      } catch (err) {
        console.error('Error in ServerSideRowStore subscriber:', err);
      }
    }
  }


  private emit(event: 'loading' | 'loaded' | 'error', ...args: any[]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((fn) => {
        try {
          fn(...args);
        } catch (err) {
          console.error(`Error in ServerSideRowStore '${event}' listener:`, err);
        }
      });
    }
  }

  // ============================================================================
  // FETCH & DEBOUNCE SCHEDULING
  // ============================================================================

  private triggerFetchBlock(blockIndex: number, immediate: boolean = false): void {
    this.loadingBlocks.add(blockIndex);
    this.pendingDebounceBlocks.add(blockIndex);

    if (immediate || this.debounceMs <= 0 || (blockIndex === 0 && !this.hasInitialFetchTriggered)) {
      this.hasInitialFetchTriggered = true;
      this.flushPendingBlocks();
      return;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.flushPendingBlocks();
    }, this.debounceMs);
  }

  private flushPendingBlocks(): void {
    const blocksToFetch = Array.from(this.pendingDebounceBlocks);
    this.pendingDebounceBlocks.clear();

    if (blocksToFetch.length === 0) return;

    this.emit('loading');

    for (const blockIndex of blocksToFetch) {
      this.executeBlockFetch(blockIndex);
    }
  }

  private executeBlockFetch(blockIndex: number): void {
    const startRow = blockIndex * this.blockSize;
    const endRow = startRow + this.blockSize;

    const params: IServerSideGetRowsParams = {
      request: {
        startRow,
        endRow,
        sortModel: this.currentSort,
        filterModel: this.currentFilter,
        groupKeys: this.currentGroupKeys.length > 0 ? this.currentGroupKeys : undefined,
      },
      success: (rows: any[], lastRow?: number) => {
        this.handleFetchSuccess(blockIndex, rows, lastRow);
      },
      fail: (error?: any) => {
        this.handleFetchFail(blockIndex, error);
      },
    };

    try {
      this.datasource.getRows(params);
    } catch (err) {
      this.handleFetchFail(blockIndex, err);
    }
  }

  private handleFetchSuccess(blockIndex: number, rows: any[], lastRow?: number): void {
    this.loadingBlocks.delete(blockIndex);

    // Apply LRU cache insertion and eviction
    if (this.cache.has(blockIndex)) {
      this.cache.delete(blockIndex);
    } else if (this.cache.size >= this.maxBlocks) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(blockIndex, rows);

    // Dynamic row count resolution
    if (typeof lastRow === 'number' && lastRow >= 0) {
      this.rowCount = lastRow;
      this.isLastRowKnown = true;
    } else if (rows.length < this.blockSize) {
      this.rowCount = blockIndex * this.blockSize + rows.length;
      this.isLastRowKnown = true;
    } else if (!this.isLastRowKnown) {
      // If server didn't provide a definitive lastRow and full block was returned,
      // expand rowCount so user can seamlessly virtualize and scroll downward
      const currentFetchedEnd = (blockIndex + 1) * this.blockSize;
      if (currentFetchedEnd >= this.rowCount) {
        this.rowCount = currentFetchedEnd + this.blockSize;
      }
    }

    this.emit('loaded');
    this.notifySubscribers();
  }

  private handleFetchFail(blockIndex: number, error?: any): void {
    this.loadingBlocks.delete(blockIndex);
    this.emit('error', error);
  }

  // ============================================================================
  // SORTING, FILTERING & GROUPING
  // ============================================================================

  public async setSorting(sortRules: SortDescriptor[]): Promise<void> {
    this.currentSort = sortRules;
    this.purgeCache();
    await this.ensureRange(0, this.blockSize - 1);
  }

  public async setFilter(filter: FilterDescriptor | null): Promise<void> {
    this.currentFilter = filter;
    this.purgeCache();
    await this.ensureRange(0, this.blockSize - 1);
  }

  public async setSearch(keyword: string): Promise<void> {
    this.currentSearch = keyword;
    this.purgeCache();
    await this.ensureRange(0, this.blockSize - 1);
  }

  public async setGrouping(groupDescriptors: GroupDescriptor[]): Promise<void> {
    this.currentGroupKeys = groupDescriptors.map((g) => g.selector);
    this.purgeCache();
    await this.ensureRange(0, this.blockSize - 1);
  }

  public async toggleGroup(groupKey: string): Promise<void> {
    const idx = this.currentGroupKeys.indexOf(groupKey);
    if (idx !== -1) {
      this.currentGroupKeys.splice(idx, 1);
    } else {
      this.currentGroupKeys.push(groupKey);
    }
    this.purgeCache();
    await this.ensureRange(0, this.blockSize - 1);
  }

  public async getDistinctValues(
    _columnId: string,
    _search?: string,
    _baseFilter?: FilterDescriptor | null
  ): Promise<DistinctItem[]> {
    return [];
  }

  public getSummaries(): Record<string, number> | undefined {
    return undefined;
  }

  public getSummaryTypes?(): Record<string, SummaryType> {
    return {};
  }

  public setSummaryType?(_columnId: string, _summaryType: SummaryType): void {}

  // ============================================================================
  // MUTATION & EDITING
  // ============================================================================

  public async setCell(rowKey: any, columnId: string, value: any): Promise<void> {
    // Locate the row in active cached blocks and update in memory
    for (const [_blockIdx, rows] of this.cache.entries()) {
      const found = rows.find((r) => (r[this.keyField] ?? r.id) === rowKey);
      if (found) {
        found[columnId] = value;
        this.dirtyCells.set(`${rowKey}_${columnId}`, true);
        break;
      }
    }
    this.emit('loaded');
  }

  public isCellDirty(rowKey: any, columnId: string): boolean {
    return this.dirtyCells.has(`${rowKey}_${columnId}`);
  }

  public setBatchMode(enabled: boolean): void {
    this.batchMode = enabled;
  }

  public isBatchMode(): boolean {
    return this.batchMode;
  }

  public getPendingChanges(): BatchChanges {
    return this.pendingChanges;
  }

  public hasPendingChanges(): boolean {
    return (
      (this.pendingChanges.inserted?.length ?? 0) > 0 ||
      (this.pendingChanges.updated?.length ?? 0) > 0 ||
      (this.pendingChanges.deleted?.length ?? 0) > 0
    );
  }

  public async commitBatch(changes: BatchChanges): Promise<void> {
    if (changes.updated) {
      for (const u of changes.updated) {
        await this.setCell(u.key, Object.keys(u.values)[0], Object.values(u.values)[0]);
      }
    }
    this.pendingChanges = { inserted: [], updated: [], deleted: [] };
    this.dirtyCells.clear();
  }

  // ============================================================================
  // LIFECYCLE & CACHE INVALIDATION
  // ============================================================================

  /**
   * Clears in-memory block cache and resets the row window.
   */
  public purgeCache(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.cache.clear();
    this.loadingBlocks.clear();
    this.pendingDebounceBlocks.clear();
    this.isLastRowKnown = false;
    this.hasInitialFetchTriggered = false;
    this.emit('loaded');
    this.notifySubscribers();
  }

  /**
   * Refreshes the store by purging cache and re-fetching the initial block window.
   */
  public async refresh(): Promise<void> {
    this.purgeCache();
    await this.ensureRange(0, this.blockSize - 1);
  }

  /**
   * Destroys datasource connections and cancels pending background timers.
   */
  public destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.cache.clear();
    this.loadingBlocks.clear();
    this.pendingDebounceBlocks.clear();
    this.listeners.clear();
    this.subscribers.clear();
    this.datasource.destroy?.();
  }
}
