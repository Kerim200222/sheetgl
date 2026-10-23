import {
  IDataStore,
  BatchChanges,
  RemoteOperationsConfig,
  DataGridQuery,
  LoadResult,
} from '../types/store';
import { FilterDescriptor, SortDescriptor, DistinctItem } from '../types/filter';
import { GroupDescriptor, VirtualRow, SummaryType } from '../types/group';
import { BlockCache } from './BlockCache';

export interface RemoteDataStoreOptions {
  url?: string;
  keyField?: string;
  remoteOperations?: RemoteOperationsConfig;
  headers?: Record<string, string>;
  blockSize?: number;
  /** Custom loader function for advanced environments (e.g. Qmi custom API client) */
  load?: (query: DataGridQuery) => Promise<LoadResult>;
  /** Custom distinct value loader for remote column filters */
  loadDistinct?: (columnId: string, search?: string) => Promise<DistinctItem[]>;
  /** Custom single cell updater */
  update?: (key: any, values: Record<string, any>) => Promise<void>;
  /** Custom batch changes committer */
  commit?: (changes: BatchChanges) => Promise<void>;
}

export class RemoteDataStore implements IDataStore {
  private url: string;
  private keyField: string;
  private headers: Record<string, string>;
  private cache: BlockCache<any>;
  private customLoad?: (query: DataGridQuery) => Promise<LoadResult>;
  private customLoadDistinct?: (columnId: string, search?: string) => Promise<DistinctItem[]>;
  private customUpdate?: (key: any, values: Record<string, any>) => Promise<void>;
  private customCommit?: (changes: BatchChanges) => Promise<void>;

  private totalCount: number = 0;
  private summaries?: Record<string, number>;
  private currentFilter: FilterDescriptor | null = null;
  private currentSearch: string = '';
  private currentSort: SortDescriptor[] = [];
  private currentGroups: GroupDescriptor[] = [];

  private currentAbortController: AbortController | null = null;
  private pendingBlockRequests = new Set<number>();
  private listeners = new Map<string, Set<(...args: any[]) => void>>();

  constructor(options: RemoteDataStoreOptions) {
    this.url = options.url || '';
    this.keyField = options.keyField || 'id';
    this.headers = options.headers || { 'Content-Type': 'application/json' };
    this.cache = new BlockCache<any>(options.blockSize || 100, 50);
    this.customLoad = options.load;
    this.customLoadDistinct = options.loadDistinct;
    this.customUpdate = options.update;
    this.customCommit = options.commit;

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

  private async fetchBlock(blockIndex: number): Promise<void> {
    this.pendingBlockRequests.add(blockIndex);
    const skip = blockIndex * this.cache.blockSize;
    const take = this.cache.blockSize;

    const payload: DataGridQuery = {
      skip,
      take,
      filter: this.currentFilter,
      sort: this.currentSort,
      search: this.currentSearch,
      group: this.currentGroups,
    };

    try {
      this.emit('loading');
      let rows: any[] = [];
      let total = 0;
      let summaries: Record<string, number> | undefined;

      if (this.customLoad) {
        const res = await this.customLoad(payload);
        rows = res.data || [];
        total = res.totalCount ?? rows.length;
        if (res.summary && typeof res.summary === 'object' && !Array.isArray(res.summary)) {
          summaries = res.summary as any;
        }
      } else if (this.url) {
        const res = await fetch(this.url, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

        const json = await res.json();
        rows = json.data || json.rows || [];
        total = json.totalCount ?? json.total_count ?? rows.length;
        summaries = json.summary || json.summaries;
      }

      this.totalCount = total;
      if (summaries) {
        this.summaries = summaries;
      }

      this.cache.setBlock(blockIndex, rows);
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
      await this.resetAndReloadAsync();
    } catch (err) {
      this.emit('error', err);
    }
  }

  public async getDistinctValues(columnId: string, search?: string): Promise<DistinctItem[]> {
    if (this.customLoadDistinct) {
      return this.customLoadDistinct(columnId, search);
    }
    if (!this.url) return [];
    try {
      const sep = this.url.includes('?') ? '&' : '?';
      const distinctUrl = `${this.url}${sep}action=distinct&column=${encodeURIComponent(
        columnId
      )}&search=${encodeURIComponent(search || '')}`;
      const res = await fetch(distinctUrl, {
        method: 'GET',
        headers: this.headers,
      });
      if (!res.ok) return [];
      const json = await res.json();
      const items = json.items || json.data || [];
      return items.map((it: any) => {
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
    await this.fetchBlock(0);
  }

  public resetAndReload(): void {
    this.resetAndReloadAsync().catch(() => {});
  }
}
