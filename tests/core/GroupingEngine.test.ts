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
    expect(rows[0].type).toBe('data');
    expect(rows[0].data.id).toBe(1);
  });

  it('should create group header rows with summary calculations when collapsed', () => {
    const groups: GroupDescriptor[] = [{ selector: 'department' }];
    const summaryConfig = { salary: 'sum' as const };
    const expandedKeys = new Set<string>(); // collapsed

    const rows = GroupingEngine.projectVirtualRows(sampleData, groups, expandedKeys, summaryConfig);
    // 2 departments: Engineering, Sales -> 2 group header rows (collapsed, so no data rows visible)
    expect(rows.length).toBe(2);
    expect(rows[0].type).toBe('group');
    expect(rows[0].field).toBe('department');
    expect(rows[0].value).toBe('Engineering');
    expect(rows[0].rowCount).toBe(2);
    expect(rows[0].isExpanded).toBe(false);
    expect(rows[0].summaries?.salary).toBe(13000); // 5000 + 8000

    expect(rows[1].value).toBe('Sales');
    expect(rows[1].summaries?.salary).toBe(9000); // 3000 + 6000
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
    expect(rows[0].type).toBe('group');
    expect(rows[0].value).toBe('Engineering');
    expect(rows[0].isExpanded).toBe(true);

    expect(rows[1].type).toBe('data');
    expect(rows[1].data.id).toBe(1);
    expect(rows[2].type).toBe('data');
    expect(rows[2].data.id).toBe(2);

    expect(rows[3].type).toBe('group');
    expect(rows[3].value).toBe('Sales');
    expect(rows[3].isExpanded).toBe(false);
  });

  it('should compute multiple summary types (avg, min, max, count)', () => {
    const groups: GroupDescriptor[] = [{ selector: 'department' }];
    const summaryConfig = {
      salary: 'avg' as const,
      id: 'count' as const,
    };
    const rows = GroupingEngine.projectVirtualRows(sampleData, groups, new Set(), summaryConfig);

    const engGroup = rows.find((r) => r.value === 'Engineering');
    expect(engGroup?.summaries?.salary).toBe(6500); // (5000 + 8000) / 2
    expect(engGroup?.summaries?.id).toBe(2);
  });
});
