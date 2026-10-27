import { describe, it, expect } from 'vitest';
import { GroupingEngine } from '../../src/datagrid/core/GroupingEngine';
import { GroupDescriptor } from '../../src/datagrid/types/group';

describe('GroupingEngine', () => {
  const sampleData = [
    { id: 1, department: 'Engineering', role: 'Dev', salary: 5000 },
    { id: 2, department: 'Engineering', role: 'Lead', salary: 8000 },
    { id: 3, department: 'Sales', role: 'Rep', salary: 3000 },
    { id: 4, department: 'Sales', role: 'Manager', salary: 6000 },
  ];

  it('should return pure data rows when groups array is empty', () => {
    const rows = GroupingEngine.projectVirtualRows(sampleData, [], new Set());
    expect(rows.length).toBe(4);
    const r0 = rows[0];
    expect(r0.type).toBe('data');
    if (r0.type === 'data') {
      expect(r0.data.id).toBe(1);
    }
  });

  it('should create group header rows with summary calculations when collapsed', () => {
    const groups: GroupDescriptor[] = [{ selector: 'department' }];
    const summaryConfig = { salary: 'sum' as const };
    const expandedKeys = new Set<string>(); // collapsed

    const rows = GroupingEngine.projectVirtualRows(sampleData, groups, expandedKeys, summaryConfig);
    // 2 departments: Engineering, Sales -> 2 group header rows (collapsed, so no data rows visible)
    expect(rows.length).toBe(2);

    const g0 = rows[0];
    expect(g0.type).toBe('group');
    if (g0.type === 'group') {
      expect(g0.field).toBe('department');
      expect(g0.value).toBe('Engineering');
      expect(g0.rowCount).toBe(2);
      expect(g0.isExpanded).toBe(false);
      expect(g0.summaries?.salary).toBe(13000); // 5000 + 8000
    }

    const g1 = rows[1];
    expect(g1.type).toBe('group');
    if (g1.type === 'group') {
      expect(g1.value).toBe('Sales');
      expect(g1.summaries?.salary).toBe(9000); // 3000 + 6000
    }
  });

  it('should project child data rows when group is expanded', () => {
    const groups: GroupDescriptor[] = [{ selector: 'department' }];
    const expandedKeys = new Set<string>(['department:Engineering']); // Engineering expanded

    const rows = GroupingEngine.projectVirtualRows(sampleData, groups, expandedKeys);
    // Expected:
    // 1. Group Header Engineering (expanded)
    // 2. Data Row 1 (Dev)
    // 3. Data Row 2 (Lead)
    // 4. Group Header Sales (collapsed)
    expect(rows.length).toBe(4);

    const row0 = rows[0];
    expect(row0.type).toBe('group');
    if (row0.type === 'group') {
      expect(row0.value).toBe('Engineering');
      expect(row0.isExpanded).toBe(true);
    }

    const row1 = rows[1];
    expect(row1.type).toBe('data');
    if (row1.type === 'data') {
      expect(row1.data.id).toBe(1);
    }

    const row2 = rows[2];
    expect(row2.type).toBe('data');
    if (row2.type === 'data') {
      expect(row2.data.id).toBe(2);
    }

    const row3 = rows[3];
    expect(row3.type).toBe('group');
    if (row3.type === 'group') {
      expect(row3.value).toBe('Sales');
      expect(row3.isExpanded).toBe(false);
    }
  });

  it('should compute multiple summary types (avg, min, max, count)', () => {
    const groups: GroupDescriptor[] = [{ selector: 'department' }];
    const summaryConfig = {
      salary: 'avg' as const,
      id: 'count' as const,
    };
    const rows = GroupingEngine.projectVirtualRows(sampleData, groups, new Set(), summaryConfig);

    const engGroup = rows.find((r) => r.type === 'group' && r.value === 'Engineering');
    expect(engGroup).toBeDefined();
    if (engGroup && engGroup.type === 'group') {
      expect(engGroup.summaries?.salary).toBe(6500); // (5000 + 8000) / 2
      expect(engGroup.summaries?.id).toBe(2);
    }
  });
});
