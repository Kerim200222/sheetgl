/**
 * Server-Side Row Model (SSRM) Protocols & Contracts
 */

export interface IServerSideGetRowsRequest {
  /** Start row index of the requested block/window (inclusive) */
  startRow: number;
  /** End row index of the requested block/window (exclusive) */
  endRow: number;
  /** Active sort configuration / model */
  sortModel?: any;
  /** Active filter configuration / model */
  filterModel?: any;
  /** Active group keys if row grouping is enabled */
  groupKeys?: string[];
}

export interface IServerSideGetRowsParams {
  /** Request specification specifying row bounds, sorting, filtering, and grouping */
  request: IServerSideGetRowsRequest;
  /**
   * Callback invoked by the datasource on successful fetch.
   * @param rows The array of loaded row data.
   * @param lastRow The total dataset count if known, or the last known row index (optional / dynamic).
   */
  success: (rows: any[], lastRow?: number) => void;
  /** Callback invoked by the datasource if fetching fails */
  fail: (error?: any) => void;
}

export interface IDatasource {
  /** Callback triggered by ServerSideRowStore to load a block/window of rows */
  getRows: (params: IServerSideGetRowsParams) => void;
  /** Optional cleanup when datasource or grid is destroyed */
  destroy?: () => void;
}

export interface ServerSideStoreOptions {
  /** Datasource supplying rows on demand */
  datasource: IDatasource;
  /** Number of rows per block (default: 100) */
  blockSize?: number;
  /** Maximum number of blocks retained in memory before LRU eviction (default: 30) */
  maxBlocksInCache?: number;
  /** Debounce delay in ms when coalescing rapid scroll block requests (default: 80) */
  debounceMs?: number;
  /** Unique primary key field for records (default: 'id') */
  keyField?: string;
  /** Estimated or initial row count before server returns definitive count (default: 100) */
  initialRowCount?: number;
}

