import { describe, it, expect } from 'vitest';
import { SortEngine } from '../../src/datagrid/core/SortEngine';
import { SortDescriptor } from '../../src/datagrid/types/filter';

describe('SortEngine', () => {
  describe('compareValues', () => {
    it('should compare numbers accurately', () => {
      expect(SortEngine.compareValues(10, 20)).toBeLessThan(0);
      expect(SortEngine.compareValues(30, 20)).toBeGreaterThan(0);
      expect(SortEngine.compareValues(15, 15)).toBe(0);
    });

    it('should push null, undefined, or empty values to the bottom', () => {
      expect(SortEngine.compareValues(null, 'test')).toBe(1);
      expect(SortEngine.compareValues('test', null)).toBe(-1);
      expect(SortEngine.compareValues(undefined, 100)).toBe(1);
      expect(SortEngine.compareValues(100, undefined)).toBe(-1);
      expect(SortEngine.compareValues('', 'abc')).toBe(1);
      expect(SortEngine.compareValues('abc', '')).toBe(-1);
    });

    it('should compare Date objects', () => {
      const d1 = new Date('2026-01-01');
      const d2 = new Date('2026-06-01');
      expect(SortEngine.compareValues(d1, d2)).toBeLessThan(0);
      expect(SortEngine.compareValues(d2, d1)).toBeGreaterThan(0);
      expect(SortEngine.compareValues(d1, new Date('2026-01-01'))).toBe(0);
    });

    it('should compare booleans (false before true)', () => {
      expect(SortEngine.compareValues(false, true)).toBe(-1);
      expect(SortEngine.compareValues(true, false)).toBe(1);
      expect(SortEngine.compareValues(true, true)).toBe(0);
    });

    it('should support natural number and Turkish-sensitive collation', () => {
      // Natural sorting: 'Item 2' before 'Item 10'
      expect(SortEngine.compareValues('Item 2', 'Item 10')).toBeLessThan(0);

      // Turkish collation: 'ç' comes after 'c'
      expect(SortEngine.compareValues('can', 'çan')).toBeLessThan(0);
      expect(SortEngine.compareValues('şeker', 'seker')).toBeGreaterThan(0);
    });
  });

  describe('createComparator (Multi-field sorting)', () => {
    const list = [
      { id: 1, dept: 'Sales', salary: 3000 },
      { id: 2, dept: 'Engineering', salary: 5000 },
      { id: 3, dept: 'Engineering', salary: 7000 },
      { id: 4, dept: 'Sales', salary: 4000 },
      { id: 5, dept: 'Marketing', salary: 3500 },
    ];

    it('should return 0 comparator if sort rules are empty', () => {
      const cmp = SortEngine.createComparator([]);
      expect(cmp(list[0], list[1])).toBe(0);
    });

    it('should sort by single column ascending and descending', () => {
      const ascCmp = SortEngine.createComparator([{ selector: 'salary', desc: false }]);
      const sortedAsc = [...list].sort(ascCmp);
      expect(sortedAsc.map((x) => x.salary)).toEqual([3000, 3500, 4000, 5000, 7000]);

      const descCmp = SortEngine.createComparator([{ selector: 'salary', desc: true }]);
      const sortedDesc = [...list].sort(descCmp);
      expect(sortedDesc.map((x) => x.salary)).toEqual([7000, 5000, 4000, 3500, 3000]);
    });

    it('should perform tie-breaking multi-level sort (dept asc, salary desc)', () => {
      const multiRules: SortDescriptor[] = [
        { selector: 'dept', desc: false },
        { selector: 'salary', desc: true },
      ];
      const multiCmp = SortEngine.createComparator(multiRules);
      const sorted = [...list].sort(multiCmp);

      expect(sorted.map((x) => `${x.dept}-${x.salary}`)).toEqual([
        'Engineering-7000',
        'Engineering-5000',
        'Marketing-3500',
        'Sales-4000',
        'Sales-3000',
      ]);
    });
  });
});
