import { describe, it, expect, afterEach } from 'vitest';
import { FilterEngine, BLANK_FILTER_TOKEN } from '../../src/datagrid/core/FilterEngine';
import { FilterDescriptor } from '../../src/datagrid/types/filter';

describe('FilterEngine', () => {
  describe('parseNumeric', () => {
    it('should return number as-is', () => {
      expect(FilterEngine.parseNumeric(42)).toBe(42);
      expect(FilterEngine.parseNumeric(0)).toBe(0);
      expect(FilterEngine.parseNumeric(-15.5)).toBe(-15.5);
    });

    it('should handle null, undefined and empty strings with NaN', () => {
      expect(FilterEngine.parseNumeric(null)).toBeNaN();
      expect(FilterEngine.parseNumeric(undefined)).toBeNaN();
      expect(FilterEngine.parseNumeric('')).toBeNaN();
      expect(FilterEngine.parseNumeric('   ')).toBeNaN();
    });

    it('should correctly parse Turkish / EU formatted numbers (comma decimal, dot thousands)', () => {
      expect(FilterEngine.parseNumeric('15.000,47')).toBe(15000.47);
      expect(FilterEngine.parseNumeric('1.250.000')).toBe(1250000);
      expect(FilterEngine.parseNumeric('250,50')).toBe(250.5);
      expect(FilterEngine.parseNumeric('₺ 3.450,25')).toBe(3450.25);
    });

    it('should correctly parse US / UK formatted numbers (dot decimal, comma thousands)', () => {
      expect(FilterEngine.parseNumeric('15,000.47')).toBe(15000.47);
      expect(FilterEngine.parseNumeric('40,000,000')).toBe(40000000);
      expect(FilterEngine.parseNumeric('$1,999.99')).toBe(1999.99);
    });
  });

  describe('Single Filter Operations (match)', () => {
    it('should match equality (=) for strings and numbers', () => {
      expect(FilterEngine.match('active', '=', 'active')).toBe(true);
      expect(FilterEngine.match('Active', '=', 'active')).toBe(true); // case-insensitive
      expect(FilterEngine.match(100, '=', 100)).toBe(true);
      expect(FilterEngine.match(100, '=', '100')).toBe(true);
      expect(FilterEngine.match('pending', '=', 'active')).toBe(false);
    });

    it('should match inequality (<>)', () => {
      expect(FilterEngine.match('active', '<>', 'passive')).toBe(true);
      expect(FilterEngine.match(100, '<>', 200)).toBe(true);
      expect(FilterEngine.match(100, '<>', 100)).toBe(false);
    });

    it('should evaluate numeric comparisons (<, <=, >, >=)', () => {
      expect(FilterEngine.match(25, '>', 18)).toBe(true);
      expect(FilterEngine.match(18, '>=', 18)).toBe(true);
      expect(FilterEngine.match(10, '<', 20)).toBe(true);
      expect(FilterEngine.match(20, '<=', 20)).toBe(true);
      expect(FilterEngine.match(15, '>', 30)).toBe(false);
    });

    it('should evaluate between operator', () => {
      expect(FilterEngine.match(25, 'between', [20, 30])).toBe(true);
      expect(FilterEngine.match(20, 'between', [20, 30])).toBe(true);
      expect(FilterEngine.match(30, 'between', [20, 30])).toBe(true);
      expect(FilterEngine.match(15, 'between', [20, 30])).toBe(false);
      expect(FilterEngine.match(35, 'between', [20, 30])).toBe(false);
      // reversed bounds
      expect(FilterEngine.match(25, 'between', [30, 20])).toBe(true);
    });

    it('should evaluate string operations (contains, notcontains, startswith, endswith)', () => {
      expect(FilterEngine.match('Antigravity IDE', 'contains', 'gravity')).toBe(true);
      expect(FilterEngine.match('Antigravity IDE', 'contains', 'vscode')).toBe(false);
      expect(FilterEngine.match('Antigravity IDE', 'notcontains', 'vscode')).toBe(true);
      expect(FilterEngine.match('SheetGL Grid', 'startswith', 'sheet')).toBe(true);
      expect(FilterEngine.match('SheetGL Grid', 'endswith', 'grid')).toBe(true);
    });

    it('should evaluate in and notin set operations with caching', () => {
      const allowed = ['admin', 'manager', 'editor'];
      expect(FilterEngine.match('Admin', 'in', allowed)).toBe(true);
      expect(FilterEngine.match('guest', 'in', allowed)).toBe(false);
      expect(FilterEngine.match('guest', 'notin', allowed)).toBe(true);
      expect(FilterEngine.match('Admin', 'notin', allowed)).toBe(false);
    });

    it('should handle blank values in in/notin filters', () => {
      const targetWithBlank = ['active', BLANK_FILTER_TOKEN];
      expect(FilterEngine.match(null, 'in', targetWithBlank)).toBe(true);
      expect(FilterEngine.match('', 'in', targetWithBlank)).toBe(true);
      expect(FilterEngine.match(undefined, 'in', targetWithBlank)).toBe(true);
      expect(FilterEngine.match('active', 'in', targetWithBlank)).toBe(true);
      expect(FilterEngine.match('inactive', 'in', targetWithBlank)).toBe(false);

      expect(FilterEngine.match(null, 'notin', targetWithBlank)).toBe(false);
      expect(FilterEngine.match('other', 'notin', targetWithBlank)).toBe(true);
    });

    it('should handle boolean matching including Turkish variations', () => {
      expect(FilterEngine.match(true, '=', true)).toBe(true);
      expect(FilterEngine.match(true, '=', 'true')).toBe(true);
      expect(FilterEngine.match(true, '=', 'evet')).toBe(true);
      expect(FilterEngine.match(true, '=', 'doğru')).toBe(true);
      expect(FilterEngine.match(false, '=', 'false')).toBe(true);
      expect(FilterEngine.match(false, '=', 'evet')).toBe(false);
    });

    it('should evaluate semantic date matching across ISO, ISO-timestamp, and localized formats', () => {
      // ISO date equality with timestamp
      expect(FilterEngine.match('2026-10-30T14:30:00Z', '=', '2026-10-30')).toBe(true);
      expect(FilterEngine.match('2026-10-30', '=', '2026-10-30T00:00:00Z')).toBe(true);

      // European/Turkish dot-delimited date vs ISO date
      expect(FilterEngine.match('30.10.2026', '=', '2026-10-30')).toBe(true);
      expect(FilterEngine.match('2026-10-30', '=', '30.10.2026')).toBe(true);

      // Date comparison operators
      expect(FilterEngine.match('2026-10-30', '>', '2026-10-01')).toBe(true);
      expect(FilterEngine.match('2026-05-15', '<', '2026-10-30')).toBe(true);
      expect(FilterEngine.match('2026-10-30', 'between', ['2026-10-01', '2026-10-31'])).toBe(true);
      expect(FilterEngine.match('2026-11-01', 'between', ['2026-10-01', '2026-10-31'])).toBe(false);
    });
  });

  describe('evaluateRow (Compound and Nested Filter Descriptors)', () => {
    const sampleRow = {
      id: 1,
      name: 'Ibrahim Shaar',
      role: 'Admin',
      age: 26,
      department: 'Engineering',
      city: 'Istanbul',
      status: 'active',
    };

    it('should return true for empty or null filters', () => {
      expect(FilterEngine.evaluateRow(sampleRow, null)).toBe(true);
      expect(FilterEngine.evaluateRow(sampleRow, [])).toBe(true);
    });

    it('should evaluate a single filter correctly', () => {
      expect(FilterEngine.evaluateRow(sampleRow, ['role', '=', 'Admin'])).toBe(true);
      expect(FilterEngine.evaluateRow(sampleRow, ['age', '>', 30])).toBe(false);
    });

    it('should evaluate compound AND filters', () => {
      const andFilter: FilterDescriptor = [
        ['role', '=', 'Admin'],
        'and',
        ['age', '>=', 25],
        'and',
        ['city', '=', 'Istanbul'],
      ];
      expect(FilterEngine.evaluateRow(sampleRow, andFilter)).toBe(true);

      const failingAndFilter: FilterDescriptor = [
        ['role', '=', 'Admin'],
        'and',
        ['city', '=', 'Ankara'],
      ];
      expect(FilterEngine.evaluateRow(sampleRow, failingAndFilter)).toBe(false);
    });

    it('should evaluate compound OR filters', () => {
      const orFilter: FilterDescriptor = [
        ['city', '=', 'Ankara'],
        'or',
        ['city', '=', 'Istanbul'],
      ];
      expect(FilterEngine.evaluateRow(sampleRow, orFilter)).toBe(true);

      const failingOrFilter: FilterDescriptor = [
        ['city', '=', 'Izmir'],
        'or',
        ['role', '=', 'Guest'],
      ];
      expect(FilterEngine.evaluateRow(sampleRow, failingOrFilter)).toBe(false);
    });

    it('should evaluate nested grouped filters', () => {
      // (city == Istanbul OR city == Ankara) AND age < 30
      const nestedFilter: FilterDescriptor = [
        [['city', '=', 'Istanbul'], 'or', ['city', '=', 'Ankara']],
        'and',
        ['age', '<', 30],
      ];
      expect(FilterEngine.evaluateRow(sampleRow, nestedFilter)).toBe(true);
    });
  });

  describe('buildRowSearchIndex and matchSearch', () => {
    it('should build row search index ignoring internal double underscore keys and sparklines', () => {
      const row = {
        id: 101,
        title: 'MacBook Pro',
        category: 'Electronics',
        price: 2499,
        __rawIndex: 0,
        __searchIndex: undefined,
        sparkline: [10, 20, 30],
      };

      const index = FilterEngine.buildRowSearchIndex(row);
      expect(index).toContain('macbook pro');
      expect(index).toContain('electronics');
      expect(index).toContain('2499');
      expect(index).not.toContain('sparkline');
      expect(index).not.toContain('__rawIndex');
      expect(row.__searchIndex).toBe(index);
    });

    it('should match keyword in row correctly', () => {
      const row: any = {
        id: 101,
        title: 'MacBook Pro M3 Max',
        brand: 'Apple',
      };
      expect(FilterEngine.matchSearch(row, 'apple')).toBe(true);
      expect(FilterEngine.matchSearch(row, 'm3')).toBe(true);
      expect(FilterEngine.matchSearch(row, 'windows')).toBe(false);
      expect(FilterEngine.matchSearch(row, '')).toBe(true);
    });
  });

  describe('Date Formatting and Configurable Pattern (v2.1.2+)', () => {
    const originalDefaultFormat = FilterEngine.getDefaultDateFormat();

    afterEach(() => {
      FilterEngine.setDefaultDateFormat(originalDefaultFormat);
    });

    it('should have d/m/Y as initial default date format', () => {
      expect(FilterEngine.getDefaultDateFormat()).toBe('d/m/Y');
    });

    it('should allow configuring default date format via setDefaultDateFormat', () => {
      FilterEngine.setDefaultDateFormat('Y-m-d');
      expect(FilterEngine.getDefaultDateFormat()).toBe('Y-m-d');

      FilterEngine.setDefaultDateFormat('d.m.Y');
      expect(FilterEngine.getDefaultDateFormat()).toBe('d.m.Y');
    });

    it('should ignore invalid or whitespace date formats in setDefaultDateFormat', () => {
      FilterEngine.setDefaultDateFormat('d/m/Y');
      FilterEngine.setDefaultDateFormat('');
      expect(FilterEngine.getDefaultDateFormat()).toBe('d/m/Y');

      FilterEngine.setDefaultDateFormat('   ');
      expect(FilterEngine.getDefaultDateFormat()).toBe('d/m/Y');

      FilterEngine.setDefaultDateFormat(undefined);
      expect(FilterEngine.getDefaultDateFormat()).toBe('d/m/Y');
    });

    it('should format ParsedDateInfo with custom pattern via formatWithPattern', () => {
      const parsed = {
        year: 2026,
        month: 5,
        day: 9,
        hour: 14,
        minute: 30,
        second: 0,
        hasTime: true,
        isoDate: '2026-05-09',
        startOfDayMs: 0,
        endOfDayMs: 0,
        exactMs: 0,
      };

      expect(FilterEngine.formatWithPattern(parsed, 'YYYY-MM-DD')).toBe('2026-05-09');
      expect(FilterEngine.formatWithPattern(parsed, 'd/m/Y')).toBe('09/05/2026');
      expect(FilterEngine.formatWithPattern(parsed, 'd.m.Y')).toBe('09.05.2026');
      expect(FilterEngine.formatWithPattern(parsed, 'm/d/Y')).toBe('05/09/2026');
    });

    it('should format localized date according to default format (d/m/Y)', () => {
      FilterEngine.setDefaultDateFormat('d/m/Y');
      expect(FilterEngine.formatLocalizedDate('2026-11-09')).toBe('09/11/2026');
      expect(FilterEngine.formatLocalizedDate(new Date(2026, 10, 9))).toBe('09/11/2026');
    });

    it('should respect customFormat parameter overriding default format', () => {
      FilterEngine.setDefaultDateFormat('d/m/Y');
      expect(FilterEngine.formatLocalizedDate('2026-11-09', 'tr-TR', false, 'Y-m-d')).toBe(
        '2026-11-09'
      );
      expect(FilterEngine.formatLocalizedDate('2026-11-09', 'tr-TR', false, 'd.m.Y')).toBe(
        '09.11.2026'
      );
    });

    it('should append time when includeTime is true', () => {
      FilterEngine.setDefaultDateFormat('d/m/Y');
      const formatted = FilterEngine.formatLocalizedDate(
        '2026-11-09T15:45:00',
        'tr-TR',
        true
      );
      expect(formatted).toBe('09/11/2026 15:45');
    });

    it('should return empty string for null, undefined, empty string and BLANK_FILTER_TOKEN', () => {
      expect(FilterEngine.formatLocalizedDate(null)).toBe('');
      expect(FilterEngine.formatLocalizedDate(undefined)).toBe('');
      expect(FilterEngine.formatLocalizedDate('')).toBe('');
      expect(FilterEngine.formatLocalizedDate(BLANK_FILTER_TOKEN)).toBe('');
    });

    it('should return string as-is when input is not a valid date', () => {
      expect(FilterEngine.formatLocalizedDate('not-a-date')).toBe('not-a-date');
    });
  });
});
