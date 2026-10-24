import { FilterDescriptor, SortDescriptor, DistinctItem } from './filter';
import { GroupDescriptor, SummaryDescriptor, SummaryType, VirtualRow } from './group';

export interface DataGridQuery {
  skip?: number;
  take?: number;
  filter?: FilterDescriptor | null;
  sort?: SortDescriptor[];
  group?: GroupDescriptor[];
  groupSummary?: SummaryDescriptor[];
  totalSummary?: SummaryDescriptor[];
  search?: string;
}

export interface LoadResult {
  data: any[];
  totalCount: number;
  summary?: number[];
  groupCount?: number;
}

export interface RemoteOperationsConfig {
  paging?: boolean;
  filtering?: boolean;
  sorting?: boolean;
  grouping?: boolean;
  summary?: boolean;
  distinct?: boolean;
}

export interface BatchUpdatedItem {
  key: any;
  values: Record<string, any>;
  oldValues?: Record<string, any>;
  rowData?: Record<string, any>;
}

export interface BatchDeletedItem {
  key: any;
  data: Record<string, any>;
}

export interface BatchChanges {
  inserted?: any[];
  updated?: BatchUpdatedItem[];
  deleted?: any[];
  deletedRowsData?: BatchDeletedItem[];
}

export interface IReadableStore {
  getRowCount(): number;
  /** Returns matching data record count after active filters/search (independent of collapsed group rows) */
  getFilteredRowCount?(): number;
  /** Returns total unfiltered dataset record count */
  getTotalDatasetRowCount?(): number;
  getViewRow(rowIndex: number): VirtualRow | undefined;
  ensureRange(startRow: number, endRow: number): Promise<void>;
  on(event: 'loading' | 'loaded' | 'error', callback: (...args: any[]) => void): void;
  off(event: 'loading' | 'loaded' | 'error', callback: (...args: any[]) => void): void;
}

export interface IFilterableStore {
  setFilter(filter: FilterDescriptor | null): Promise<void>;
  setSearch(keyword: string): Promise<void>;
  getDistinctValues(
    columnId: string,
    search?: string,
    baseFilter?: FilterDescriptor | null
  ): Promise<DistinctItem[]>;
}

export interface ISortableStore {
  setSorting(sortRules: SortDescriptor[]): Promise<void>;
}

export interface IGroupableStore {
  setGrouping(groupDescriptors: GroupDescriptor[]): Promise<void>;
  toggleGroup(groupKey: string): Promise<void>;
  expandAllGroups?(): void;
  collapseAllGroups?(): void;
}

export interface IMutableStore {
  setCell(rowKey: any, columnId: string, value: any): Promise<void>;
  setCellsBatch?(updates: Array<{ rowKey: any; columnId: string; value: any }>): Promise<void>;
  commitBatch(changes: BatchChanges): Promise<void>;
  updateRowFields?(rowKey: any, patch: Record<string, any>): Promise<void>;
  insertRow?(rowData: Record<string, any>, targetViewRowIndex?: number): Promise<any>;
  duplicateRow?(rowKey: any, targetViewRowIndex?: number): Promise<any>;
  deleteRow?(rowKey: any): Promise<void>;
  deleteRowsBatch?(
    rowKeys: any[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<number>;
  restoreRow?(rowData: Record<string, any>, rawIndex?: number): Promise<void>;
  setBatchMode?(enabled: boolean): void;
  isBatchMode?(): boolean;
  getPendingChanges?(): BatchChanges;
  getPendingChangesCount?(): number;
  hasPendingChanges?(): boolean;
  isCellDirty?(rowKey: any, columnId: string): boolean;
  isColumnDirty?(columnId: string): boolean;
  isRowInserted?(rowKey: any): boolean;
  saveBatchChanges?(): Promise<BatchChanges>;
  discardBatchChanges?(): void;
  revertPendingDelete?(rowKey: any): void;
  revertPendingUpdate?(rowKey: any, columnId?: string): void;
  revertPendingInsert?(rowKey: any): void;
}

export interface IDataStore
  extends IReadableStore,
    IFilterableStore,
    ISortableStore,
    IGroupableStore,
    IMutableStore {
  getSummaries(): Record<string, number> | undefined;
  getSummaryTypes?(): Record<string, SummaryType>;
  setSummaryType?(columnId: string, summaryType: SummaryType): void;
  isRemote(): boolean;
}
