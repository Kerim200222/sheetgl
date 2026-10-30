/**
 * Enterprise Row Grouping Engine for SheetGL
 * Transforms flat data arrays into virtual hierarchical group trees with O(N) complexity,
 * supporting multi-level grouping, expand/collapse toggles, and live column aggregations.
 */

export interface GroupRowMetadata {
  __isGroup: true;
  groupKey: string;
  groupField: string;
  groupValue: any;
  level: number;
  childrenCount: number;
  isExpanded: boolean;
  aggregations?: Record<string, number>;
  [key: string]: any;
}

export type GroupedRow<T = Record<string, any>> = T | GroupRowMetadata;

export interface GroupAggregation {
  field: string;
  type: 'sum' | 'avg' | 'min' | 'max' | 'count';
}

export interface RowGroupingConfig {
  groupBy: string[];
  expandedKeys?: Set<string> | string[];
  aggregations?: GroupAggregation[];
  defaultExpanded?: boolean;
}

export interface GroupNode<T = Record<string, any>> {
  groupKey: string;
  groupField: string;
  groupValue: any;
  level: number;
  childrenCount: number;
  isExpanded: boolean;
  aggregations: Record<string, number>;
  items: T[];
  subGroups: Map<any, GroupNode<T>>;
}

/**
 * Type guard to check if a row is a virtual Group Header row.
 */
export function isGroupRow(row: any): row is GroupRowMetadata {
  return Boolean(row && typeof row === 'object' && row.__isGroup === true);
}

export class RowGroupingEngine<T extends Record<string, any> = Record<string, any>> {
  private rawData: T[] = [];
  private groupByKeys: string[] = [];
  private expandedKeys: Set<string> = new Set();
  private aggregations: GroupAggregation[] = [];
  private defaultExpanded: boolean = true;
  private cachedFlattenedRows: GroupedRow<T>[] | null = null;

  constructor(config?: Partial<RowGroupingConfig>) {
    if (config?.groupBy) {
      this.groupByKeys = [...config.groupBy];
    }
    if (config?.expandedKeys) {
      this.expandedKeys = new Set(config.expandedKeys);
    }
    if (config?.aggregations) {
      this.aggregations = [...config.aggregations];
    }
    if (config?.defaultExpanded !== undefined) {
      this.defaultExpanded = config.defaultExpanded;
    }
  }

  /**
   * Sets the dataset to group and clears internal caches.
   */
  public setData(data: T[]): this {
    this.rawData = data || [];
    this.cachedFlattenedRows = null;
    return this;
  }

  /**
   * Sets the grouping fields hierarchy in order of precedence.
   * e.g., ['country', 'department', 'role']
   */
  public setGroupBy(keys: string[]): this {
    this.groupByKeys = keys || [];
    this.cachedFlattenedRows = null;
    return this;
  }

  /**
   * Gets current groupBy keys.
   */
  public getGroupBy(): string[] {
    return [...this.groupByKeys];
  }

  /**
   * Sets aggregation specifications for numeric or counted fields in group headers.
   */
  public setAggregations(aggs: GroupAggregation[]): this {
    this.aggregations = aggs || [];
    this.cachedFlattenedRows = null;
    return this;
  }

  /**
   * Explicitly sets which group keys are expanded.
   */
  public setExpandedKeys(keys: Set<string> | string[]): this {
    this.expandedKeys = new Set(keys);
    this.cachedFlattenedRows = null;
    return this;
  }

  /**
   * Returns a copy of the current expanded group keys.
   */
  public getExpandedKeys(): Set<string> {
    return new Set(this.expandedKeys);
  }

  /**
   * Checks whether a specific group key is currently expanded.
   */
  public isExpanded(groupKey: string): boolean {
    if (this.expandedKeys.has(groupKey)) return true;
    if (this.defaultExpanded && !this.expandedKeys.has(`!${groupKey}`)) {
      return true;
    }
    return false;
  }

  /**
   * Toggles the expanded/collapsed state of a group.
   */
  public toggleGroup(groupKey: string): boolean {
    const currentlyExpanded = this.isExpanded(groupKey);
    if (currentlyExpanded) {
      this.collapseGroup(groupKey);
      return false;
    } else {
      this.expandGroup(groupKey);
      return true;
    }
  }

  /**
   * Expands a group by key.
   */
  public expandGroup(groupKey: string): this {
    this.expandedKeys.add(groupKey);
    this.expandedKeys.delete(`!${groupKey}`);
    this.cachedFlattenedRows = null;
    return this;
  }

  /**
   * Collapses a group by key.
   */
  public collapseGroup(groupKey: string): this {
    this.expandedKeys.delete(groupKey);
    if (this.defaultExpanded) {
      this.expandedKeys.add(`!${groupKey}`);
    }
    this.cachedFlattenedRows = null;
    return this;
  }

  /**
   * Expands all groups across all levels.
   */
  public expandAll(): this {
    this.defaultExpanded = true;
    this.expandedKeys.clear();
    this.cachedFlattenedRows = null;
    return this;
  }

  /**
   * Collapses all groups across all levels.
   */
  public collapseAll(): this {
    this.defaultExpanded = false;
    this.expandedKeys.clear();
    this.cachedFlattenedRows = null;
    return this;
  }

  /**
   * Transforms and flattens the dataset into a 1D virtual row stream for the grid.
   * Runs in O(K * N) where K is number of grouping keys and N is row count.
   */
  public getFlattenedRows(): GroupedRow<T>[] {
    if (this.cachedFlattenedRows) {
      return this.cachedFlattenedRows;
    }

    if (!this.groupByKeys || this.groupByKeys.length === 0) {
      this.cachedFlattenedRows = [...this.rawData];
      return this.cachedFlattenedRows;
    }

    const result: GroupedRow<T>[] = [];
    RowGroupingEngine.groupRecursive(
      this.rawData,
      this.groupByKeys,
      0,
      '',
      (key) => this.isExpanded(key),
      this.aggregations,
      result
    );

    this.cachedFlattenedRows = result;
    return result;
  }

  /**
   * Static helper: Format raw group values consistently.
   */
  public static formatGroupValue(raw: any): string {
    if (raw === null || raw === undefined || raw === '') return '(Blank)';
    if (Array.isArray(raw)) {
      return raw.length > 0 ? raw.join(', ') : '(Blank)';
    }
    if (typeof raw === 'object') {
      const entries = Object.entries(raw);
      return entries.length > 0
        ? entries.map(([k, v]) => `${k}: ${String(v)}`).join(' • ')
        : '(Blank)';
    }
    return String(raw);
  }

  /**
   * Computes column aggregations (sum, avg, min, max, count) for a bucket of rows in a single pass.
   */
  public static computeAggregations<T extends Record<string, any>>(
    items: T[],
    aggregations: GroupAggregation[]
  ): Record<string, number> {
    const results: Record<string, number> = {};
    if (!aggregations || aggregations.length === 0 || items.length === 0) {
      return results;
    }

    for (const agg of aggregations) {
      const { field, type } = agg;
      if (type === 'count') {
        results[field] = items.length;
        continue;
      }

      let sum = 0;
      let count = 0;
      let min = Infinity;
      let max = -Infinity;

      for (let i = 0; i < items.length; i++) {
        const raw = items[i][field];
        const num = typeof raw === 'number' ? raw : parseFloat(String(raw));
        if (raw !== null && raw !== undefined && raw !== '' && !isNaN(num)) {
          sum += num;
          count++;
          if (num < min) min = num;
          if (num > max) max = num;
        }
      }

      if (count > 0) {
        if (type === 'sum') results[field] = sum;
        else if (type === 'avg') results[field] = sum / count;
        else if (type === 'min') results[field] = min;
        else if (type === 'max') results[field] = max;
      }
    }

    return results;
  }

  /**
   * Recursive grouping worker: partitions data into buckets and flattens visible rows in O(N).
   */
  private static groupRecursive<T extends Record<string, any>>(
    items: T[],
    groupByKeys: string[],
    level: number,
    parentKey: string,
    isExpandedPredicate: (key: string) => boolean,
    aggregations: GroupAggregation[],
    out: GroupedRow<T>[]
  ): void {
    if (level >= groupByKeys.length) {
      for (let i = 0; i < items.length; i++) {
        out.push(items[i]);
      }
      return;
    }

    const field = groupByKeys[level];
    const buckets = new Map<any, T[]>();

    // Single-pass partitioning into buckets
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const val = RowGroupingEngine.formatGroupValue(item[field]);
      let bucket = buckets.get(val);
      if (!bucket) {
        bucket = [];
        buckets.set(val, bucket);
      }
      bucket.push(item);
    }

    for (const [val, bucketItems] of buckets.entries()) {
      const groupKey = parentKey ? `${parentKey}|${field}:${val}` : `${field}:${val}`;
      const isExpanded = isExpandedPredicate(groupKey);
      const computedAggs = RowGroupingEngine.computeAggregations(bucketItems, aggregations);

      const groupRow: GroupRowMetadata = {
        __isGroup: true,
        groupKey,
        groupField: field,
        groupValue: val,
        level,
        childrenCount: bucketItems.length,
        isExpanded,
        aggregations: computedAggs,
        // Populate field column with formatted group title for direct cell rendering
        [field]: val,
      };

      out.push(groupRow);

      // Only recurse into children if this group node is expanded
      if (isExpanded) {
        RowGroupingEngine.groupRecursive(
          bucketItems,
          groupByKeys,
          level + 1,
          groupKey,
          isExpandedPredicate,
          aggregations,
          out
        );
      }
    }
  }

  /**
   * One-shot static transformation utility:
   * Takes raw data and grouping parameters and returns the flattened rows array directly.
   */
  public static transform<T extends Record<string, any>>(
    data: T[],
    groupBy: string[],
    options?: {
      expandedKeys?: Set<string> | string[];
      aggregations?: GroupAggregation[];
      defaultExpanded?: boolean;
    }
  ): GroupedRow<T>[] {
    const engine = new RowGroupingEngine<T>({
      groupBy,
      expandedKeys: options?.expandedKeys,
      aggregations: options?.aggregations,
      defaultExpanded: options?.defaultExpanded ?? true,
    });
    engine.setData(data);
    return engine.getFlattenedRows();
  }
}
