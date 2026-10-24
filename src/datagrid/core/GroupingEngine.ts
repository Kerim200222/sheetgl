import { GroupDescriptor, SummaryType, VirtualRow } from '../types/group';
import { FilterEngine } from './FilterEngine';

export class GroupingEngine {
  private static formatGroupKeyVal(raw: any): string {
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

  public static collectGroupKeys(
    data: any[],
    groups: GroupDescriptor[],
    maxAutoExpandLevel: number = 0
  ): Set<string> {
    const keys = new Set<string>();
    if (!groups || groups.length === 0) return keys;

    const visit = (items: any[], level: number, parentKey: string) => {
      if (level >= groups.length || level > maxAutoExpandLevel) return;
      const field = groups[level].selector;
      const buckets = new Map<any, any[]>();
      for (let i = 0; i < items.length; i++) {
        const val = this.formatGroupKeyVal(items[i][field]);
        let b = buckets.get(val);
        if (!b) {
          b = [];
          buckets.set(val, b);
        }
        b.push(items[i]);
      }
      for (const [val, bucketItems] of buckets.entries()) {
        const groupKey = parentKey ? `${parentKey}|${field}:${val}` : `${field}:${val}`;
        keys.add(groupKey);
        visit(bucketItems, level + 1, groupKey);
      }
    };

    visit(data, 0, '');
    return keys;
  }

  public static projectVirtualRows(
    data: any[],
    groups: GroupDescriptor[],
    expandedKeys: Set<string>,
    summaryConfig?: Record<string, SummaryType>
  ): VirtualRow[] {
    if (!groups || groups.length === 0) {
      return data.map((item, rawIndex) => ({
        type: 'data',
        rawIndex,
        data: item,
      }));
    }

    const result: VirtualRow[] = [];
    this.groupRecursive(data, groups, 0, '', expandedKeys, result, summaryConfig);
    return result;
  }

  private static groupRecursive(
    items: any[],
    groups: GroupDescriptor[],
    level: number,
    parentKey: string,
    expandedKeys: Set<string>,
    out: VirtualRow[],
    summaryConfig?: Record<string, SummaryType>
  ): void {
    if (level >= groups.length) {
      for (const item of items) {
        out.push({
          type: 'data',
          rawIndex: item.__rawIndex ?? 0,
          data: item,
        });
      }
      return;
    }

    const currentGroup = groups[level];
    const field = currentGroup.selector;

    const buckets = new Map<any, any[]>();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const val = this.formatGroupKeyVal(item[field]);
      let bucket = buckets.get(val);
      if (!bucket) {
        bucket = [];
        buckets.set(val, bucket);
      }
      bucket.push(item);
    }

    for (const [val, bucketItems] of buckets.entries()) {
      const groupKey = parentKey ? `${parentKey}|${field}:${val}` : `${field}:${val}`;
      const isExpanded = expandedKeys.has(groupKey);

      const summaries: Record<string, number> = {};
      const summaryTypes: Record<string, SummaryType> = {};

      if (summaryConfig) {
        for (const [sf, sType] of Object.entries(summaryConfig)) {
          if (!sType || sType === 'none') continue;
          if (sType === 'count') {
            summaries[sf] = bucketItems.length;
            summaryTypes[sf] = 'count';
            continue;
          }
          let sum = 0;
          let count = 0;
          let min = Infinity;
          let max = -Infinity;
          for (const bi of bucketItems) {
            const raw = bi[sf];
            const num = typeof raw === 'number' ? raw : FilterEngine.parseNumeric(raw);
            if (raw !== null && raw !== undefined && raw !== '' && !isNaN(num)) {
              sum += num;
              count++;
              if (num < min) min = num;
              if (num > max) max = num;
            }
          }
          if (count > 0) {
            summaryTypes[sf] = sType;
            if (sType === 'sum') summaries[sf] = sum;
            else if (sType === 'avg') summaries[sf] = sum / count;
            else if (sType === 'min') summaries[sf] = min;
            else if (sType === 'max') summaries[sf] = max;
          }
        }
      }

      out.push({
        type: 'group',
        level,
        groupKey,
        field,
        value: val,
        rowCount: bucketItems.length,
        isExpanded,
        summaries,
        summaryTypes,
      });

      if (isExpanded) {
        this.groupRecursive(
          bucketItems,
          groups,
          level + 1,
          groupKey,
          expandedKeys,
          out,
          summaryConfig
        );
      }
    }
  }
}
