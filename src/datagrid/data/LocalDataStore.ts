import { IDataStore, BatchChanges } from '../types/store';
import { FilterDescriptor, SortDescriptor, DistinctItem } from '../types/filter';
import { GroupDescriptor, SummaryType, VirtualRow } from '../types/group';
import { FilterEngine, BLANK_FILTER_TOKEN } from '../core/FilterEngine';
import { SortEngine } from '../core/SortEngine';
import { GroupingEngine } from '../core/GroupingEngine';

export interface LocalDataStoreOptions {
  data: any[];
  keyField?: string;
  batchMode?: boolean;
  initialSummaries?: Record<string, SummaryType>;
}

export class LocalDataStore implements IDataStore {
  private rawData: any[] = [];
  private keyField: string;

  // Filtered & sorted data
  private processedData: any[] = [];
  // Projected virtual rows (data + group headers)
  private virtualRows: VirtualRow[] = [];

  private currentFilter: FilterDescriptor | null = null;
  private currentSearch: string = '';
  private currentSort: SortDescriptor[] = [];
  private currentGroups: GroupDescriptor[] = [];
  private expandedGroupKeys = new Set<string>();

  // Configurable summary types per column
  private summaryTypes: Record<string, SummaryType> = {};

  // Batch / Dirty tracking
  private batchMode: boolean = true;
  private originalRowSnapshots = new Map<any, Record<string, any>>();
  private dirtyCells = new Map<any, Set<string>>();
  private insertedKeys = new Set<any>();
  private deletedRows = new Map<any, { data: Record<string, any>; index: number }>();
  private distinctCache = new Map<string, DistinctItem[]>();

  private listeners = new Map<string, Set<(...args: any[]) => void>>();

  constructor(options: LocalDataStoreOptions) {
    this.keyField = options.keyField || 'id';
    this.batchMode = options.batchMode ?? true;
    if (options.initialSummaries) {
      this.summaryTypes = { ...options.initialSummaries };
    }
    this.setData(options.data || []);
  }

  public isRemote(): boolean {
    return false;
  }

  public setData(data: any[]): void {
    this.rawData = data.map((item, idx) => ({
      ...item,
      __rawIndex: idx,
      [this.keyField]: item[this.keyField] ?? idx + 1,
    }));

    // Auto-initialize default summary types if empty
    if (Object.keys(this.summaryTypes).length === 0 && this.rawData.length > 0) {
      const sample = this.rawData[0];
      for (const key of Object.keys(sample)) {
        if (key === this.keyField || key.startsWith('__')) continue;
        if (typeof sample[key] === 'number') {
          if (key === 'rating' || key === 'progress') {
            this.summaryTypes[key] = 'avg';
          } else {
            this.summaryTypes[key] = 'sum';
          }
        }
      }
    }

    this.originalRowSnapshots.clear();
    this.dirtyCells.clear();
    this.insertedKeys.clear();
    this.deletedRows.clear();
    this.distinctCache.clear();

    this.recompute();
  }

  public getRowCount(): number {
    return this.virtualRows.length;
  }

  public getFilteredRowCount(): number {
    return this.processedData.length;
  }

  public getTotalDatasetRowCount(): number {
    return this.rawData.length;
  }

  public getViewRow(rowIndex: number): VirtualRow | undefined {
    return this.virtualRows[rowIndex];
  }

  public getRawData(): any[] {
    return this.rawData;
  }

  public getRawRowByKey(rowKey: any): Record<string, any> | undefined {
    return this.rawData.find((r) => r[this.keyField] === rowKey);
  }

  public async ensureRange(_startRow: number, _endRow: number): Promise<void> {
    return Promise.resolve();
  }

  public async setFilter(filter: FilterDescriptor | null): Promise<void> {
    this.currentFilter = filter;
    this.recompute();
    return Promise.resolve();
  }

  public async setSearch(keyword: string): Promise<void> {
    this.currentSearch = keyword;
    this.recompute();
    return Promise.resolve();
  }

  public async setSorting(sortRules: SortDescriptor[]): Promise<void> {
    this.currentSort = sortRules;
    this.recompute();
    return Promise.resolve();
  }

  public async setGrouping(groupDescriptors: GroupDescriptor[]): Promise<void> {
    this.currentGroups = groupDescriptors;
    // Start groups collapsed so all group headers & summaries are immediately visible
    this.expandedGroupKeys.clear();
    for (const g of groupDescriptors) {
      if (g.isExpanded) {
        const keys = GroupingEngine.collectGroupKeys(this.processedData, groupDescriptors, 0);
        keys.forEach((k) => this.expandedGroupKeys.add(k));
        break;
      }
    }
    this.recompute();
    return Promise.resolve();
  }

  public async toggleGroup(groupKey: string): Promise<void> {
    if (this.expandedGroupKeys.has(groupKey)) {
      this.expandedGroupKeys.delete(groupKey);
    } else {
      this.expandedGroupKeys.add(groupKey);
    }
    this.recomputeVirtualRowsOnly();
    return Promise.resolve();
  }

  public expandAllGroups(): void {
    const allKeys = GroupingEngine.collectGroupKeys(
      this.processedData,
      this.currentGroups,
      this.currentGroups.length
    );
    this.expandedGroupKeys = allKeys;
    this.recomputeVirtualRowsOnly();
  }

  public collapseAllGroups(): void {
    this.expandedGroupKeys.clear();
    this.recomputeVirtualRowsOnly();
  }

  private isValueEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
      }
      return true;
    }
    if (
      a &&
      b &&
      typeof a === 'object' &&
      typeof b === 'object' &&
      !Array.isArray(a) &&
      !Array.isArray(b)
    ) {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    return false;
  }

  private ensureSnapshot(rowKey: any, item: Record<string, any>): void {
    if (!this.originalRowSnapshots.has(rowKey) && !this.insertedKeys.has(rowKey)) {
      const snap: Record<string, any> = {};
      for (const [k, v] of Object.entries(item)) {
        snap[k] = Array.isArray(v)
          ? [...v]
          : v && typeof v === 'object'
          ? { ...v }
          : v;
      }
      this.originalRowSnapshots.set(rowKey, snap);
    }
  }

  private markCellDirty(rowKey: any, columnId: string, newValue: any): void {
    if (this.insertedKeys.has(rowKey)) return;
    const orig = this.originalRowSnapshots.get(rowKey);
    let set = this.dirtyCells.get(rowKey);
    if (!set) {
      set = new Set<string>();
      this.dirtyCells.set(rowKey, set);
    }
    if (orig && this.isValueEqual(orig[columnId], newValue)) {
      set.delete(columnId);
      if (set.size === 0) {
        this.dirtyCells.delete(rowKey);
      }
    } else {
      set.add(columnId);
    }
  }

  public async setCell(rowKey: any, columnId: string, value: any): Promise<void> {
    const item = this.rawData.find((r) => r[this.keyField] === rowKey);
    if (item) {
      if (this.isValueEqual(item[columnId], value)) return Promise.resolve();
      if (this.batchMode) {
        this.ensureSnapshot(rowKey, item);
        this.markCellDirty(rowKey, columnId, value);
      }
      item[columnId] = Array.isArray(value) ? [...value] : value;
      delete item.__searchIndex;
      this.distinctCache.clear();
      this.recompute();
    }
    return Promise.resolve();
  }

  public async setCellsBatch(
    updates: Array<{ rowKey: any; columnId: string; value: any }>
  ): Promise<void> {
    if (!updates || updates.length === 0) return Promise.resolve();
    const rowMap = new Map<any, Record<string, any>>();
    for (const r of this.rawData) {
      rowMap.set(r[this.keyField], r);
    }

    let changed = false;
    for (const u of updates) {
      const item = rowMap.get(u.rowKey);
      if (item && item[u.columnId] !== u.value) {
        if (this.batchMode) {
          this.ensureSnapshot(u.rowKey, item);
          this.markCellDirty(u.rowKey, u.columnId, u.value);
        }
        item[u.columnId] = u.value;
        delete item.__searchIndex;
        changed = true;
      }
    }

    if (changed) {
      this.distinctCache.clear();
      this.recompute();
    }
    return Promise.resolve();
  }

  public async updateRowFields(rowKey: any, patch: Record<string, any>): Promise<void> {
    const item = this.rawData.find((r) => r[this.keyField] === rowKey);
    if (item) {
      for (const [colId, val] of Object.entries(patch)) {
        if (colId === this.keyField || colId.startsWith('__')) continue;
        if (this.batchMode) {
          this.ensureSnapshot(rowKey, item);
          this.markCellDirty(rowKey, colId, val);
        }
        item[colId] = val;
      }
      delete item.__searchIndex;
      this.distinctCache.clear();
      this.recompute();
    }
    return Promise.resolve();
  }

  private generateNextKey(): any {
    let maxId = 0;
    for (const r of this.rawData) {
      const k = Number(r[this.keyField]);
      if (!isNaN(k) && k > maxId) maxId = k;
    }
    return maxId > 0 ? maxId + 1 : Date.now();
  }

  public async insertRow(
    rowData: Record<string, any>,
    targetViewRowIndex?: number
  ): Promise<Record<string, any>> {
    const newKey = rowData[this.keyField] ?? this.generateNextKey();
    const newRow: Record<string, any> = {
      ...rowData,
      [this.keyField]: newKey,
      __rawIndex: this.rawData.length,
    };

    let insertIdx = 0; // Default at top so user immediately sees newly added row
    if (targetViewRowIndex !== undefined && targetViewRowIndex >= 0) {
      const vRow = this.virtualRows[targetViewRowIndex];
      if (vRow && vRow.type === 'data') {
        const rawIdx = this.rawData.findIndex(
          (r) => r[this.keyField] === vRow.data[this.keyField]
        );
        if (rawIdx !== -1) {
          insertIdx = rawIdx + 1;
        }
      } else if (targetViewRowIndex >= this.virtualRows.length) {
        insertIdx = this.rawData.length;
      }
    }

    this.rawData.splice(insertIdx, 0, newRow);
    // Reindex __rawIndex
    for (let i = 0; i < this.rawData.length; i++) {
      this.rawData[i].__rawIndex = i;
    }

    if (this.batchMode) {
      this.insertedKeys.add(newKey);
    }

    this.distinctCache.clear();
    this.recompute();
    return Promise.resolve(newRow);
  }

  public async duplicateRow(
    rowKey: any,
    targetViewRowIndex?: number
  ): Promise<Record<string, any> | null> {
    const sourceIdx = this.rawData.findIndex((r) => r[this.keyField] === rowKey);
    if (sourceIdx === -1) return Promise.resolve(null);

    const source = this.rawData[sourceIdx];
    const newKey = this.generateNextKey();

    // Deep clone arrays/objects inside row (like sparkline)
    const cloned: Record<string, any> = {};
    for (const [k, v] of Object.entries(source)) {
      if (Array.isArray(v)) cloned[k] = [...v];
      else if (v && typeof v === 'object') cloned[k] = { ...v };
      else cloned[k] = v;
    }

    cloned[this.keyField] = newKey;
    if (typeof cloned.code === 'string' && cloned.code.startsWith('ACC-')) {
      cloned.code = `ACC-${100000 + Number(newKey)}`;
    }

    const insertIdx =
      targetViewRowIndex !== undefined ? sourceIdx + 1 : sourceIdx + 1;
    this.rawData.splice(insertIdx, 0, cloned);

    for (let i = 0; i < this.rawData.length; i++) {
      this.rawData[i].__rawIndex = i;
    }

    if (this.batchMode) {
      this.insertedKeys.add(newKey);
    }

    this.distinctCache.clear();
    this.recompute();
    return Promise.resolve(cloned);
  }

  public async deleteRow(rowKey: any): Promise<void> {
    const idx = this.rawData.findIndex((r) => r[this.keyField] === rowKey);
    if (idx === -1) return Promise.resolve();

    const [removed] = this.rawData.splice(idx, 1);
    if (this.batchMode) {
      if (this.insertedKeys.has(rowKey)) {
        this.insertedKeys.delete(rowKey);
      } else {
        const origData = this.originalRowSnapshots.get(rowKey) || removed;
        this.deletedRows.set(rowKey, { data: { ...origData }, index: idx });
      }
      this.dirtyCells.delete(rowKey);
    }

    for (let i = 0; i < this.rawData.length; i++) {
      this.rawData[i].__rawIndex = i;
    }

    this.distinctCache.clear();
    this.recompute();
    return Promise.resolve();
  }

  public async deleteRowsBatch(
    rowKeys: any[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<number> {
    if (!rowKeys || rowKeys.length === 0) return 0;
    const keySet = new Set<any>(rowKeys);
    const totalToProcess = keySet.size;
    const totalRaw = this.rawData.length;
    const keptRows: Record<string, any>[] = [];
    let removedCount = 0;

    // Process in chunks so the UI progress bar updates smoothly at 60 FPS without freezing on 100k rows
    const chunkSize = totalToProcess > 2000 ? Math.max(4000, Math.floor(totalRaw / 6)) : totalRaw + 1;

    for (let start = 0; start < totalRaw; start += chunkSize) {
      const end = Math.min(totalRaw, start + chunkSize);
      for (let i = start; i < end; i++) {
        const row = this.rawData[i];
        const rk = row[this.keyField];
        if (keySet.has(rk)) {
          removedCount++;
          if (this.batchMode) {
            if (this.insertedKeys.has(rk)) {
              this.insertedKeys.delete(rk);
            } else {
              const origData = this.originalRowSnapshots.get(rk) || row;
              this.deletedRows.set(rk, { data: origData, index: i });
            }
            this.dirtyCells.delete(rk);
          }
        } else {
          row.__rawIndex = keptRows.length;
          keptRows.push(row);
        }
      }

      if (onProgress) {
        onProgress(Math.min(totalToProcess, removedCount), totalToProcess);
      }
      if (end < totalRaw) {
        await new Promise((r) => setTimeout(r, 16));
      }
    }

    this.rawData = keptRows;
    this.distinctCache.clear();
    this.recompute();
    onProgress?.(totalToProcess, totalToProcess);
    return removedCount;
  }

  public async restoreRow(rowData: Record<string, any>, rawIndex?: number): Promise<void> {
    const key = rowData[this.keyField];
    const existingIdx = this.rawData.findIndex((r) => r[this.keyField] === key);
    if (existingIdx !== -1) return Promise.resolve();

    const targetIdx =
      rawIndex !== undefined ? Math.min(Math.max(0, rawIndex), this.rawData.length) : 0;
    this.rawData.splice(targetIdx, 0, { ...rowData });
    this.deletedRows.delete(key);

    for (let i = 0; i < this.rawData.length; i++) {
      this.rawData[i].__rawIndex = i;
    }

    this.distinctCache.clear();
    this.recompute();
    return Promise.resolve();
  }

  // ============================================================================
  // BATCH MODE & DIRTY STATE METHODS
  // ============================================================================
  public setBatchMode(enabled: boolean): void {
    this.batchMode = enabled;
  }

  public isBatchMode(): boolean {
    return this.batchMode;
  }

  public isCellDirty(rowKey: any, columnId: string): boolean {
    return this.dirtyCells.get(rowKey)?.has(columnId) ?? false;
  }

  public isColumnDirty(columnId: string): boolean {
    for (const cols of this.dirtyCells.values()) {
      if (cols.has(columnId)) return true;
    }
    return false;
  }

  public isRowInserted(rowKey: any): boolean {
    return this.insertedKeys.has(rowKey);
  }

  public hasPendingChanges(): boolean {
    return (
      this.insertedKeys.size > 0 ||
      this.dirtyCells.size > 0 ||
      this.deletedRows.size > 0
    );
  }

  public getPendingChangesCount(): number {
    return this.insertedKeys.size + this.dirtyCells.size + this.deletedRows.size;
  }

  public getPendingChanges(): BatchChanges {
    const inserted: any[] = [];
    for (const key of this.insertedKeys) {
      const row = this.rawData.find((r) => r[this.keyField] === key);
      if (row) {
        const clean = { ...row };
        delete clean.__rawIndex;
        inserted.push(clean);
      }
    }

    const updated: Array<{
      key: any;
      values: Record<string, any>;
      oldValues?: Record<string, any>;
      rowData?: Record<string, any>;
    }> = [];
    for (const [key, cols] of this.dirtyCells.entries()) {
      if (cols.size === 0 || this.insertedKeys.has(key)) continue;
      const row = this.rawData.find((r) => r[this.keyField] === key);
      if (row) {
        const orig = this.originalRowSnapshots.get(key) || {};
        const values: Record<string, any> = {};
        const oldValues: Record<string, any> = {};
        for (const c of cols) {
          values[c] = row[c];
          oldValues[c] = orig[c];
        }
        const cleanRow = { ...row };
        delete cleanRow.__rawIndex;
        updated.push({ key, values, oldValues, rowData: cleanRow });
      }
    }

    const deleted = Array.from(this.deletedRows.keys());
    const deletedRowsData = Array.from(this.deletedRows.entries()).map(([key, entry]) => {
      const clean = { ...entry.data };
      delete clean.__rawIndex;
      return { key, data: clean };
    });

    return { inserted, updated, deleted, deletedRowsData };
  }

  public revertPendingDelete(rowKey: any): void {
    const entry = this.deletedRows.get(rowKey);
    if (!entry) return;
    const idx = Math.min(Math.max(0, entry.index), this.rawData.length);
    this.rawData.splice(idx, 0, { ...entry.data });
    this.deletedRows.delete(rowKey);
    for (let i = 0; i < this.rawData.length; i++) {
      this.rawData[i].__rawIndex = i;
    }
    this.distinctCache.clear();
    this.recompute();
  }

  public revertPendingUpdate(rowKey: any, columnId?: string): void {
    const orig = this.originalRowSnapshots.get(rowKey);
    const cols = this.dirtyCells.get(rowKey);
    const row = this.rawData.find((r) => r[this.keyField] === rowKey);
    if (!orig || !cols || !row) return;

    if (columnId) {
      row[columnId] = orig[columnId];
      cols.delete(columnId);
      if (cols.size === 0) {
        this.dirtyCells.delete(rowKey);
        this.originalRowSnapshots.delete(rowKey);
      }
    } else {
      for (const c of cols) {
        row[c] = orig[c];
      }
      this.dirtyCells.delete(rowKey);
      this.originalRowSnapshots.delete(rowKey);
    }
    delete row.__searchIndex;
    this.distinctCache.clear();
    this.recompute();
  }

  public revertPendingInsert(rowKey: any): void {
    if (!this.insertedKeys.has(rowKey)) return;
    this.insertedKeys.delete(rowKey);
    this.rawData = this.rawData.filter((r) => r[this.keyField] !== rowKey);
    for (let i = 0; i < this.rawData.length; i++) {
      this.rawData[i].__rawIndex = i;
    }
    this.distinctCache.clear();
    this.recompute();
  }

  public async saveBatchChanges(): Promise<BatchChanges> {
    const changes = this.getPendingChanges();
    this.originalRowSnapshots.clear();
    this.dirtyCells.clear();
    this.insertedKeys.clear();
    this.deletedRows.clear();
    this.emit('loaded');
    return Promise.resolve(changes);
  }

  public discardBatchChanges(): void {
    // 1. Remove uncommitted inserted rows
    if (this.insertedKeys.size > 0) {
      this.rawData = this.rawData.filter((r) => !this.insertedKeys.has(r[this.keyField]));
    }

    // 2. Restore deleted rows
    if (this.deletedRows.size > 0) {
      const entries = Array.from(this.deletedRows.values()).sort((a, b) => a.index - b.index);
      for (const entry of entries) {
        const idx = Math.min(entry.index, this.rawData.length);
        this.rawData.splice(idx, 0, { ...entry.data });
      }
    }

    // 3. Revert modified cells to original snapshots
    for (const [key, orig] of this.originalRowSnapshots.entries()) {
      const row = this.rawData.find((r) => r[this.keyField] === key);
      if (row) {
        Object.assign(row, orig);
      }
    }

    for (let i = 0; i < this.rawData.length; i++) {
      this.rawData[i].__rawIndex = i;
    }

    this.originalRowSnapshots.clear();
    this.dirtyCells.clear();
    this.insertedKeys.clear();
    this.deletedRows.clear();
    this.distinctCache.clear();

    this.recompute();
  }

  public async commitBatch(changes: BatchChanges): Promise<void> {
    if (changes.updated) {
      for (const u of changes.updated) {
        const item = this.rawData.find((r) => r[this.keyField] === u.key);
        if (item) Object.assign(item, u.values);
      }
    }
    if (changes.inserted) {
      for (const ins of changes.inserted) {
        this.rawData.unshift({
          ...ins,
          __rawIndex: 0,
          [this.keyField]: ins[this.keyField] ?? this.generateNextKey(),
        });
      }
    }
    if (changes.deleted) {
      const delKeys = new Set(changes.deleted);
      this.rawData = this.rawData.filter((r) => !delKeys.has(r[this.keyField]));
    }
    this.originalRowSnapshots.clear();
    this.dirtyCells.clear();
    this.insertedKeys.clear();
    this.deletedRows.clear();
    this.distinctCache.clear();
    this.recompute();
    return Promise.resolve();
  }

  public async getDistinctValues(
    columnId: string,
    search?: string,
    baseFilter?: FilterDescriptor | null
  ): Promise<DistinctItem[]> {
    const hasBaseFilter =
      baseFilter !== undefined &&
      baseFilter !== null &&
      Array.isArray(baseFilter) &&
      baseFilter.length > 0;
    const filterKey = hasBaseFilter ? JSON.stringify(baseFilter) : '__NO_FILTER__';
    const cleanGlobalSearch = this.currentSearch ? this.currentSearch.toLowerCase().trim() : '';
    const cacheKey = `${columnId}::f=${filterKey}::s=${cleanGlobalSearch}`;

    let baseItems = this.distinctCache.get(cacheKey);

    if (!baseItems) {
      let sourceRows = this.rawData;
      if (hasBaseFilter) {
        sourceRows = sourceRows.filter((row) => FilterEngine.evaluateRow(row, baseFilter!));
      }
      if (cleanGlobalSearch) {
        sourceRows = sourceRows.filter((row) => FilterEngine.matchSearch(row, cleanGlobalSearch));
      }

      const counts = new Map<any, number>();
      let blankCount = 0;

      for (let i = 0; i < sourceRows.length; i++) {
        const val = sourceRows[i][columnId];
        if (
          val === undefined ||
          val === null ||
          val === '' ||
          (Array.isArray(val) && val.length === 0) ||
          (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0)
        ) {
          blankCount++;
        } else if (Array.isArray(val)) {
          for (const elem of val) {
            if (elem !== undefined && elem !== null && elem !== '') {
              counts.set(elem, (counts.get(elem) || 0) + 1);
            }
          }
        } else if (typeof val === 'object') {
          const formatted = Object.entries(val)
            .map(([k, v]) => `${k}: ${String(v)}`)
            .join(' • ');
          counts.set(formatted, (counts.get(formatted) || 0) + 1);
        } else {
          counts.set(val, (counts.get(val) || 0) + 1);
        }
      }

      baseItems = Array.from(counts.entries()).map(([val, count]) => ({
        value: val,
        label: String(val),
        count,
      }));

      baseItems.sort((a, b) => SortEngine.compareValues(a.value, b.value));

      if (blankCount > 0) {
        baseItems.unshift({
          value: BLANK_FILTER_TOKEN,
          label: '(Blank)',
          count: blankCount,
        });
      }

      this.distinctCache.set(cacheKey, baseItems);
    }

    if (search) {
      const s = search.toLowerCase().trim();
      if (s) {
        return Promise.resolve(baseItems.filter((it) => it.label.toLowerCase().includes(s)));
      }
    }

    return Promise.resolve(baseItems);
  }

  // ============================================================================
  // DYNAMIC SUMMARY ENGINE
  // ============================================================================
  public getSummaryTypes(): Record<string, SummaryType> {
    return { ...this.summaryTypes };
  }

  public setSummaryType(columnId: string, summaryType: SummaryType): void {
    if (summaryType === 'none') {
      delete this.summaryTypes[columnId];
    } else {
      this.summaryTypes[columnId] = summaryType;
    }
    this.recomputeVirtualRowsOnly();
  }

  public getSummaries(): Record<string, number> | undefined {
    if (this.processedData.length === 0) return undefined;
    const result: Record<string, number> = {};

    for (const [colId, sType] of Object.entries(this.summaryTypes)) {
      if (!sType || sType === 'none') continue;

      if (sType === 'count') {
        let nonNullCount = 0;
        for (let i = 0; i < this.processedData.length; i++) {
          const v = this.processedData[i][colId];
          if (v !== null && v !== undefined && v !== '') nonNullCount++;
        }
        result[colId] = nonNullCount;
        continue;
      }

      let sum = 0;
      let count = 0;
      let min = Infinity;
      let max = -Infinity;

      for (let i = 0; i < this.processedData.length; i++) {
        const raw = this.processedData[i][colId];
        const num = typeof raw === 'number' ? raw : FilterEngine.parseNumeric(raw);
        if (raw !== null && raw !== undefined && raw !== '' && !isNaN(num)) {
          sum += num;
          count++;
          if (num < min) min = num;
          if (num > max) max = num;
        }
      }

      if (count > 0) {
        if (sType === 'sum') result[colId] = sum;
        else if (sType === 'avg') result[colId] = sum / count;
        else if (sType === 'min') result[colId] = min;
        else if (sType === 'max') result[colId] = max;
      } else {
        result[colId] = 0;
      }
    }

    return result;
  }

  public on(event: string, callback: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public off(event: string, callback: (...args: any[]) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach((cb) => cb(...args));
  }

  private recompute(): void {
    this.emit('loading');

    // 1. Filter
    let filtered = this.rawData;
    if (this.currentFilter) {
      filtered = filtered.filter((row) => FilterEngine.evaluateRow(row, this.currentFilter));
    }

    // 2. Global Search (Fast Lowercase Pre-Indexed Substring Search)
    if (this.currentSearch) {
      const cleanKeyword = this.currentSearch.toLowerCase().trim();
      if (cleanKeyword) {
        filtered = filtered.filter((row) => FilterEngine.matchSearch(row, cleanKeyword));
      }
    }

    // 3. Multi-Sort
    if (this.currentSort.length > 0) {
      const cmp = SortEngine.createComparator(this.currentSort);
      filtered = [...filtered].sort(cmp);
    }

    this.processedData = filtered;

    // 4. Grouping & Virtual Row Projection
    this.recomputeVirtualRowsOnly();
  }

  private recomputeVirtualRowsOnly(): void {
    this.virtualRows = GroupingEngine.projectVirtualRows(
      this.processedData,
      this.currentGroups,
      this.expandedGroupKeys,
      this.summaryTypes
    );
    this.emit('loaded');
  }
}
