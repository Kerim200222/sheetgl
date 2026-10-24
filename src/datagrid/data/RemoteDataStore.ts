import {
  IDataStore,
  BatchChanges,
  RemoteOperationsConfig,
  DataGridQuery,
  LoadResult,
} from '../types/store';
import { FilterDescriptor, SortDescriptor, DistinctItem } from '../types/filter';
import { GroupDescriptor, VirtualRow } from '../types/group';
import { BlockCache } from './BlockCache';
import { FilterEngine, BLANK_FILTER_TOKEN } from '../core/FilterEngine';
import { SortEngine } from '../core/SortEngine';

export interface RemoteDateTreeDayPayload {
  day: number;
  isoDate?: string;
  count: number;
  values?: any[];
}

export interface RemoteDateTreeMonthPayload {
  month: number;
  count: number;
  days?: RemoteDateTreeDayPayload[];
}

export interface RemoteDateTreeYearPayload {
  year: number;
  count: number;
  months?: RemoteDateTreeMonthPayload[];
}

export interface RemoteDataStoreOptions {
  url?: string;
  keyField?: string;
  remoteOperations?: RemoteOperationsConfig;
  headers?: Record<string, string>;
  blockSize?: number;
  /** Alias for blockSize as documented in REMOTE_OPERATIONS_GUIDE.md */
  chunkSize?: number;
  method?: 'GET' | 'POST';
  /** Custom loader function for advanced environments (e.g. Qmi custom API client) */
  load?: (query: DataGridQuery) => Promise<LoadResult>;
  /** Alias for load */
  customLoad?: (query: DataGridQuery) => Promise<LoadResult>;
  /** Custom distinct value loader for remote column filters */
  loadDistinct?: (
    columnId: string,
    search?: string,
    baseFilter?: FilterDescriptor | null
  ) => Promise<DistinctItem[]>;
  /** Custom single cell updater */
  update?: (key: any, values: Record<string, any>) => Promise<void>;
  /** Custom batch changes committer */
  commit?: (changes: BatchChanges) => Promise<void>;
}

export class RemoteDataStore implements IDataStore {
  private url: string;
  private keyField: string;
  private headers: Record<string, string>;
  private method: 'GET' | 'POST';
  private remoteOperations: Required<RemoteOperationsConfig>;
  private cache: BlockCache<any>;
  private customLoad?: (query: DataGridQuery) => Promise<LoadResult>;
  private customLoadDistinct?: (
    columnId: string,
    search?: string,
    baseFilter?: FilterDescriptor | null
  ) => Promise<DistinctItem[]>;
  private customUpdate?: (key: any, values: Record<string, any>) => Promise<void>;
  private customCommit?: (changes: BatchChanges) => Promise<void>;

  private totalCount: number = 0;
  private unfilteredTotalCount: number = 0;
  private hasInitialFetchTriggered: boolean = false;
  private summaries?: Record<string, number>;
  private currentFilter: FilterDescriptor | null = null;
  private currentSearch: string = '';
  private currentSort: SortDescriptor[] = [];
  private currentGroups: GroupDescriptor[] = [];

  private currentAbortController: AbortController | null = null;
  private pendingBlockRequests = new Set<number>();
  private distinctCache = new Map<string, DistinctItem[]>();
  private listeners = new Map<string, Set<(...args: any[]) => void>>();

  constructor(options: RemoteDataStoreOptions) {
    this.url = options.url || '';
    this.keyField = options.keyField || 'id';
    this.headers = options.headers || { 'Content-Type': 'application/json' };
    this.method = options.method || 'POST';
    this.customLoad = options.load || options.customLoad;
    this.customLoadDistinct = options.loadDistinct;
    this.customUpdate = options.update;
    this.customCommit = options.commit;

    this.remoteOperations = {
      paging: options.remoteOperations?.paging ?? true,
      filtering: options.remoteOperations?.filtering ?? true,
      sorting: options.remoteOperations?.sorting ?? true,
      grouping: options.remoteOperations?.grouping ?? true,
      summary: options.remoteOperations?.summary ?? true,
      distinct: options.remoteOperations?.distinct ?? true,
    };

    const resolvedBlockSize = options.blockSize || options.chunkSize || 100;
    this.cache = new BlockCache<any>(resolvedBlockSize, 50);

    // Immediately trigger initial load of block 0
    this.fetchBlock(0).catch(() => {});
  }

  public isRemote(): boolean {
    return true;
  }

  public getRowCount(): number {
    return this.totalCount;
  }

  public getTotalCount(): number {
    return this.totalCount;
  }

  public setTotalCount(count: number): void {
    this.totalCount = count;
    this.emit('loaded');
  }

  public getFilteredRowCount(): number {
    return this.totalCount;
  }

  public getTotalDatasetRowCount(): number {
    return this.unfilteredTotalCount > 0 ? this.unfilteredTotalCount : this.totalCount;
  }

  public getViewRow(rowIndex: number): VirtualRow | undefined {
    const data = this.cache.getRow(rowIndex);
    if (!data) {
      if (this.totalCount > 0 && rowIndex < this.totalCount) {
        this.ensureRange(
          rowIndex,
          Math.min(this.totalCount - 1, rowIndex + this.cache.blockSize)
        );
      }
      return undefined;
    }
    return {
      type: 'data',
      rawIndex: rowIndex,
      data,
    };
  }

  public async ensureRange(startRow: number, endRow: number): Promise<void> {
    if (
      !this.hasInitialFetchTriggered &&
      this.totalCount === 0 &&
      this.pendingBlockRequests.size === 0
    ) {
      this.hasInitialFetchTriggered = true;
      return this.fetchBlock(0);
    }

    const startBlock = this.cache.getBlockIndex(startRow);
    const endBlock = this.cache.getBlockIndex(endRow);

    const missingBlocks: number[] = [];
    for (let b = startBlock; b <= endBlock; b++) {
      if (!this.cache.hasBlock(b) && !this.pendingBlockRequests.has(b)) {
        missingBlocks.push(b);
      }
    }

    if (missingBlocks.length === 0) return Promise.resolve();

    return Promise.all(missingBlocks.map((b) => this.fetchBlock(b))).then(() => {});
  }

  private buildRequestUrlWithParams(payload: Record<string, any>): string {
    const [baseUrl, query] = this.url.split('?');
    const params = new URLSearchParams(query || '');
    if (payload.skip !== undefined) params.set('skip', String(payload.skip));
    if (payload.take !== undefined) params.set('take', String(payload.take));
    if (payload.requireTotalCount !== undefined) {
      params.set('requireTotalCount', String(payload.requireTotalCount));
    }
    if (payload.filter) params.set('filter', JSON.stringify(payload.filter));
    if (payload.sort && payload.sort.length > 0) params.set('sort', JSON.stringify(payload.sort));
    if (payload.group && payload.group.length > 0) params.set('group', JSON.stringify(payload.group));
    if (payload.search) params.set('search', String(payload.search));
    return `${baseUrl}?${params.toString()}`;
  }

  private async fetchBlock(blockIndex: number): Promise<void> {
    this.pendingBlockRequests.add(blockIndex);
    this.hasInitialFetchTriggered = true;

    const skip = this.remoteOperations.paging ? blockIndex * this.cache.blockSize : 0;
    const take = this.remoteOperations.paging ? this.cache.blockSize : 10000;

    if (!this.currentAbortController) {
      this.currentAbortController = new AbortController();
    }
    const signal = this.currentAbortController.signal;

    const payload: DataGridQuery = {
      skip,
      take,
      filter: this.remoteOperations.filtering ? this.currentFilter : null,
      sort: this.remoteOperations.sorting ? this.currentSort : [],
      search: this.remoteOperations.filtering ? this.currentSearch : '',
      group: this.remoteOperations.grouping ? this.currentGroups : [],
    };

    try {
      this.emit('loading');
      let json: any;

      if (this.customLoad) {
        json = await this.customLoad(payload);
      } else if (this.method === 'GET') {
        const reqUrl = this.buildRequestUrlWithParams(payload);
        const res = await fetch(reqUrl, {
          method: 'GET',
          headers: this.headers,
          signal,
        });
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        json = await res.json();
      } else if (this.url) {
        const res = await fetch(this.url, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(payload),
          signal,
        });
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        json = await res.json();
      } else {
        json = { data: [], totalCount: 0 };
      }

      let rows: any[] = json.data || json.rows || [];

      // Client-side fallback when specific remoteOperations flags are disabled
      if (!this.remoteOperations.filtering) {
        if (this.currentFilter) {
          rows = rows.filter((r) => FilterEngine.evaluateRow(r, this.currentFilter));
        }
        if (this.currentSearch) {
          const clean = this.currentSearch.toLowerCase().trim();
          if (clean) {
            rows = rows.filter((r) => FilterEngine.matchSearch(r, clean));
          }
        }
      }
      if (!this.remoteOperations.sorting && this.currentSort.length > 0) {
        const cmp = SortEngine.createComparator(this.currentSort);
        rows = [...rows].sort(cmp);
      }

      this.totalCount = json.totalCount ?? json.total_count ?? rows.length;
      if (typeof json.unfilteredTotalCount === 'number') {
        this.unfilteredTotalCount = json.unfilteredTotalCount;
      } else if (!this.currentFilter && !this.currentSearch) {
        this.unfilteredTotalCount = this.totalCount;
      } else if (this.unfilteredTotalCount === 0) {
        this.unfilteredTotalCount = this.totalCount;
      }

      if (json.summary && typeof json.summary === 'object' && !Array.isArray(json.summary)) {
        this.summaries = json.summary;
      } else if (
        json.summaries &&
        typeof json.summaries === 'object' &&
        !Array.isArray(json.summaries)
      ) {
        this.summaries = json.summaries;
      }

      if (!this.remoteOperations.paging) {
        const totalBlocks = Math.ceil(rows.length / this.cache.blockSize);
        for (let b = 0; b < totalBlocks; b++) {
          const slice = rows.slice(b * this.cache.blockSize, (b + 1) * this.cache.blockSize);
          this.cache.setBlock(b, slice);
        }
      } else {
        this.cache.setBlock(blockIndex, rows);
      }

      this.pendingBlockRequests.delete(blockIndex);
      this.emit('loaded');
    } catch (err: any) {
      this.pendingBlockRequests.delete(blockIndex);
      if (err?.name !== 'AbortError') {
        this.emit('error', err);
      }
    }
  }

  public async setFilter(filter: FilterDescriptor | null): Promise<void> {
    this.currentFilter = filter;
    await this.resetAndReloadAsync();
  }

  public async setSearch(keyword: string): Promise<void> {
    this.currentSearch = keyword;
    await this.resetAndReloadAsync();
  }

  public async setSorting(sortRules: SortDescriptor[]): Promise<void> {
    this.currentSort = sortRules;
    await this.resetAndReloadAsync();
  }

  public async setGrouping(groupDescriptors: GroupDescriptor[]): Promise<void> {
    this.currentGroups = groupDescriptors;
    await this.resetAndReloadAsync();
  }

  public async toggleGroup(_groupKey: string): Promise<void> {
    await this.resetAndReloadAsync();
  }

  public async setCell(rowKey: any, columnId: string, value: any): Promise<void> {
    try {
      if (this.customUpdate) {
        await this.customUpdate(rowKey, { [columnId]: value });
      } else if (this.url) {
        const [baseUrl, query] = this.url.split('?');
        const qs = query ? `?${query}` : '';
        await fetch(`${baseUrl}/${rowKey}${qs}`, {
          method: 'PATCH',
          headers: this.headers,
          body: JSON.stringify({ [columnId]: value }),
        });
      }
      this.distinctCache.clear();
      await this.resetAndReloadAsync();
    } catch (err) {
      this.emit('error', err);
    }
  }

  public async commitBatch(changes: BatchChanges): Promise<void> {
    try {
      if (this.customCommit) {
        await this.customCommit(changes);
      } else if (this.url) {
        const [baseUrl, query] = this.url.split('?');
        const qs = query ? `?${query}` : '';
        await fetch(`${baseUrl}/batch${qs}`, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(changes),
        });
      }
      this.distinctCache.clear();
      await this.resetAndReloadAsync();
    } catch (err) {
      this.emit('error', err);
    }
  }

  /**
   * Flattens a server-side semantic Year > Month > Day tree payload into DistinctItem[]
   * so HeaderFilterPopover builds the exact hierarchical date tree with server row counts.
   */
  private static normalizeRemoteDateTree(
    yearsPayload: RemoteDateTreeYearPayload[],
    blankCount?: number
  ): DistinctItem[] {
    const items: DistinctItem[] = [];
    if (blankCount && blankCount > 0) {
      items.push({
        value: BLANK_FILTER_TOKEN,
        label: '(Blank)',
        count: blankCount,
      });
    }

    for (const yNode of yearsPayload) {
      const yr = Number(yNode.year);
      if (isNaN(yr)) continue;
      if (Array.isArray(yNode.months) && yNode.months.length > 0) {
        for (const mNode of yNode.months) {
          const mo = Number(mNode.month);
          if (isNaN(mo)) continue;
          const mPad = String(mo).padStart(2, '0');
          if (Array.isArray(mNode.days) && mNode.days.length > 0) {
            for (const dNode of mNode.days) {
              const dy = Number(dNode.day);
              const dPad = String(dy).padStart(2, '0');
              const iso = dNode.isoDate || `${yr}-${mPad}-${dPad}`;
              items.push({
                value: iso,
                label: iso,
                count: dNode.count ?? 1,
              });
            }
          } else {
            // Month-level summary node fallback -> represent as first day of month
            const iso = `${yr}-${mPad}-01`;
            items.push({
              value: iso,
              label: iso,
              count: mNode.count ?? 1,
            });
          }
        }
      } else {
        const iso = `${yr}-01-01`;
        items.push({
          value: iso,
          label: iso,
          count: yNode.count ?? 1,
        });
      }
    }

    return items;
  }

  public async getDistinctValues(
    columnId: string,
    search?: string,
    baseFilter?: FilterDescriptor | null
  ): Promise<DistinctItem[]> {
    if (this.customLoadDistinct) {
      return this.customLoadDistinct(columnId, search, baseFilter);
    }
    if (!this.url) return [];

    const effectiveFilter = baseFilter !== undefined ? baseFilter : this.currentFilter;
    const filterKey =
      effectiveFilter && Array.isArray(effectiveFilter) && effectiveFilter.length > 0
        ? JSON.stringify(effectiveFilter)
        : '__NO_FILTER__';
    const cleanSearch = (search || '').trim();
    const globalSearchKey = this.currentSearch ? this.currentSearch.toLowerCase().trim() : '';
    const cacheKey = `${columnId}::f=${filterKey}::gs=${globalSearchKey}::s=${cleanSearch}`;

    const cached = this.distinctCache.get(cacheKey);
    if (cached) return cached;

    try {
      const [baseUrl, query] = this.url.split('?');
      const params = new URLSearchParams(query || '');
      params.set('column', columnId);
      params.set('field', columnId);
      params.set('action', 'distinct');
      if (cleanSearch) params.set('search', cleanSearch);
      if (effectiveFilter && Array.isArray(effectiveFilter) && effectiveFilter.length > 0) {
        params.set('filter', JSON.stringify(effectiveFilter));
      }
      if (globalSearchKey) {
        params.set('globalSearch', globalSearchKey);
      }

      // Supports both REST /distinct subpath and query parameters
      const distinctBase = baseUrl.endsWith('/') ? `${baseUrl}distinct` : `${baseUrl}/distinct`;
      const distinctUrl = `${distinctBase}?${params.toString()}`;

      const res = await fetch(distinctUrl, {
        method: 'GET',
        headers: this.headers,
      });
      if (!res.ok) return [];
      const json = await res.json();

      let items: DistinctItem[] = [];
      if (Array.isArray(json.tree) || Array.isArray(json.years)) {
        items = RemoteDataStore.normalizeRemoteDateTree(
          json.tree || json.years,
          json.blankCount
        );
      } else if (Array.isArray(json.items)) {
        items = json.items;
      } else if (Array.isArray(json.data)) {
        items = json.data;
      }

      const normalizedItems: DistinctItem[] = items.map((it: any) => {
        if (typeof it === 'object' && it !== null && 'value' in it) {
          return {
            value: it.value,
            label: it.label !== undefined ? String(it.label) : String(it.value),
            count: typeof it.count === 'number' ? it.count : undefined,
          };
        }
        return {
          value: it,
          label: String(it),
        };
      });

      this.distinctCache.set(cacheKey, normalizedItems);
      return normalizedItems;
    } catch {
      return [];
    }
  }

  public getSummaries(): Record<string, number> | undefined {
    return this.summaries;
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

  private async resetAndReloadAsync(): Promise<void> {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    this.currentAbortController = new AbortController();
    this.cache.clear();
    this.pendingBlockRequests.clear();
    this.hasInitialFetchTriggered = true;
    await this.fetchBlock(0);
  }

  public resetAndReload(): void {
    this.resetAndReloadAsync().catch(() => {});
  }
}
