import { FilterDescriptor, FilterOperation, SingleFilter } from '../types/filter';

export const BLANK_FILTER_TOKEN = '__SHEETGL_BLANK__';

export interface ParsedDateInfo {
  year: number;
  month: number; // 1..12
  day: number; // 1..31
  hour: number;
  minute: number;
  second: number;
  hasTime: boolean;
  isoDate: string; // YYYY-MM-DD
  startOfDayMs: number;
  endOfDayMs: number;
  exactMs: number;
}

interface CompiledSetCache {
  rawSet: Set<any>;
  lowerSet: Set<string>;
  isoDateSet: Set<string>;
  isoMonthSet: Set<string>;
  isoYearSet: Set<number>;
  hasBlank: boolean;
}

export class FilterEngine {
  private static inSetCache = new WeakMap<any[], CompiledSetCache>();
  private static dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

  public static formatLocalizedDate(
    val: any,
    localeCode: string = 'tr-TR',
    includeTime: boolean = false
  ): string {
    if (val === null || val === undefined || val === '' || val === BLANK_FILTER_TOKEN) {
      return '';
    }
    const parsed = this.parseDateParts(val);
    if (!parsed) return String(val);

    const code = localeCode || 'tr-TR';
    let fmt = this.dateFormatterCache.get(code);
    if (!fmt) {
      try {
        fmt = new Intl.DateTimeFormat(code, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          timeZone: 'UTC',
        });
      } catch {
        fmt = new Intl.DateTimeFormat('tr-TR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          timeZone: 'UTC',
        });
      }
      this.dateFormatterCache.set(code, fmt);
    }

    const dateStr = fmt.format(new Date(parsed.startOfDayMs));
    if (includeTime) {
      const hh = String(parsed.hasTime ? parsed.hour : 9).padStart(2, '0');
      const mm = String(parsed.hasTime ? parsed.minute : 0).padStart(2, '0');
      return `${dateStr} ${hh}:${mm}`;
    }
    return dateStr;
  }

  private static getCompiledSet(targetVal: any[]): CompiledSetCache {
    let cached = this.inSetCache.get(targetVal);
    if (!cached) {
      const rawSet = new Set<any>();
      const lowerSet = new Set<string>();
      const isoDateSet = new Set<string>();
      const isoMonthSet = new Set<string>();
      const isoYearSet = new Set<number>();
      let hasBlank = false;
      for (let i = 0; i < targetVal.length; i++) {
        const t = targetVal[i];
        if (t === BLANK_FILTER_TOKEN || t === '' || t === null || t === undefined) {
          hasBlank = true;
        } else {
          rawSet.add(t);
          const s = typeof t === 'string' ? t.trim() : String(t).trim();
          lowerSet.add(s.toLowerCase());

          if (/^\d{4}$/.test(s)) {
            const yr = parseInt(s, 10);
            if (yr >= 1000 && yr <= 9999) {
              isoYearSet.add(yr);
            }
          } else if (/^\d{4}-\d{1,2}$/.test(s)) {
            const [yStr, mStr] = s.split('-');
            const yr = parseInt(yStr, 10);
            const mo = parseInt(mStr, 10);
            if (yr >= 1000 && yr <= 9999 && mo >= 1 && mo <= 12) {
              isoMonthSet.add(`${yr}-${String(mo).padStart(2, '0')}`);
            }
          } else {
            const pd = this.parseDateParts(t);
            if (pd && !pd.hasTime) {
              isoDateSet.add(pd.isoDate);
            }
          }
        }
      }
      cached = { rawSet, lowerSet, isoDateSet, isoMonthSet, isoYearSet, hasBlank };
      this.inSetCache.set(targetVal, cached);
    }
    return cached;
  }

  private static matchesCompiledDateSet(rawVal: any, compiled: CompiledSetCache): boolean {
    if (
      compiled.isoDateSet.size === 0 &&
      compiled.isoMonthSet.size === 0 &&
      compiled.isoYearSet.size === 0
    ) {
      return false;
    }
    const rd = this.parseDateParts(rawVal);
    if (!rd) return false;
    if (compiled.isoDateSet.has(rd.isoDate)) return true;
    if (
      compiled.isoMonthSet.size > 0 &&
      compiled.isoMonthSet.has(`${rd.year}-${String(rd.month).padStart(2, '0')}`)
    ) {
      return true;
    }
    if (compiled.isoYearSet.size > 0 && compiled.isoYearSet.has(rd.year)) {
      return true;
    }
    return false;
  }

  public static evaluateRow(row: Record<string, any>, filter: FilterDescriptor | null): boolean {
    if (!filter || !Array.isArray(filter) || filter.length === 0) {
      return true;
    }

    if (this.isSingleFilter(filter)) {
      return this.evaluateSingleFilter(row, filter as SingleFilter);
    }

    let logicalOp: 'and' | 'or' = 'and';
    let currentResult = true;

    for (let i = 0; i < filter.length; i++) {
      const item = filter[i];

      if (typeof item === 'string') {
        const lower = item.toLowerCase();
        if (lower === 'and' || lower === 'or') {
          logicalOp = lower;
        }
        continue;
      }

      const itemResult = this.evaluateRow(row, item as FilterDescriptor);

      if (i === 0) {
        currentResult = itemResult;
      } else {
        if (logicalOp === 'and') {
          currentResult = currentResult && itemResult;
          if (!currentResult) return false;
        } else {
          currentResult = currentResult || itemResult;
          if (currentResult) return true;
        }
      }
    }

    return currentResult;
  }

  private static isSingleFilter(filter: any[]): boolean {
    return (
      filter.length === 3 &&
      typeof filter[0] === 'string' &&
      typeof filter[1] === 'string' &&
      !['and', 'or'].includes(filter[1].toLowerCase())
    );
  }

  private static evaluateSingleFilter(row: Record<string, any>, [field, op, targetVal]: SingleFilter): boolean {
    const rawVal = row[field];
    return this.match(rawVal, op, targetVal);
  }

  public static parseDateParts(val: any): ParsedDateInfo | null {
    if (
      val === null ||
      val === undefined ||
      val === '' ||
      val === BLANK_FILTER_TOKEN ||
      typeof val === 'number' ||
      typeof val === 'boolean'
    ) {
      return null;
    }

    if (val instanceof Date) {
      if (isNaN(val.getTime())) return null;
      const year = val.getFullYear();
      const month = val.getMonth() + 1;
      const day = val.getDate();
      const hour = val.getHours();
      const minute = val.getMinutes();
      const second = val.getSeconds();
      const hasTime = hour !== 0 || minute !== 0 || second !== 0;
      const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const startOfDayMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
      const endOfDayMs = Date.UTC(year, month - 1, day, 23, 59, 59, 999);
      const exactMs = hasTime ? Date.UTC(year, month - 1, day, hour, minute, second, 0) : startOfDayMs;
      return { year, month, day, hour, minute, second, hasTime, isoDate, startOfDayMs, endOfDayMs, exactMs };
    }

    if (typeof val !== 'string') return null;
    const str = val.trim();
    if (str.length < 8 || str.length > 35) return null;

    // 1. ISO / Year-first: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD with optional time
    const ymdMatch = str.match(
      /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\.\d+)?Z?)?$/
    );
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10);
      const day = parseInt(ymdMatch[3], 10);
      if (year >= 1000 && year <= 9999 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const hasTime = ymdMatch[4] !== undefined;
        const hour = hasTime ? parseInt(ymdMatch[4], 10) : 0;
        const minute = ymdMatch[5] !== undefined ? parseInt(ymdMatch[5], 10) : 0;
        const second = ymdMatch[6] !== undefined ? parseInt(ymdMatch[6], 10) : 0;
        const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const startOfDayMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
        const endOfDayMs = Date.UTC(year, month - 1, day, 23, 59, 59, 999);
        const exactMs = hasTime ? Date.UTC(year, month - 1, day, hour, minute, second, 0) : startOfDayMs;
        return { year, month, day, hour, minute, second, hasTime, isoDate, startOfDayMs, endOfDayMs, exactMs };
      }
    }

    // 2. Day-first (DD.MM.YYYY / DD/MM/YYYY) or US Month-first (MM/DD/YYYY when p2 > 12)
    const dmyMatch = str.match(
      /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[T\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
    );
    if (dmyMatch) {
      const p1 = parseInt(dmyMatch[1], 10);
      const p2 = parseInt(dmyMatch[2], 10);
      const year = parseInt(dmyMatch[3], 10);
      const isMdy = p2 > 12 && p1 >= 1 && p1 <= 12;
      const day = isMdy ? p2 : p1;
      const month = isMdy ? p1 : p2;
      if (year >= 1000 && year <= 9999 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const hasTime = dmyMatch[4] !== undefined;
        const hour = hasTime ? parseInt(dmyMatch[4], 10) : 0;
        const minute = dmyMatch[5] !== undefined ? parseInt(dmyMatch[5], 10) : 0;
        const second = dmyMatch[6] !== undefined ? parseInt(dmyMatch[6], 10) : 0;
        const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const startOfDayMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
        const endOfDayMs = Date.UTC(year, month - 1, day, 23, 59, 59, 999);
        const exactMs = hasTime ? Date.UTC(year, month - 1, day, hour, minute, second, 0) : startOfDayMs;
        return { year, month, day, hour, minute, second, hasTime, isoDate, startOfDayMs, endOfDayMs, exactMs };
      }
    }

    return null;
  }

  public static parseNumeric(val: any): number {
    if (typeof val === 'number') return val;
    if (val === null || val === undefined || val === '' || typeof val === 'boolean') return NaN;
    const str = String(val).trim();
    if (!str) return NaN;

    // Strip standalone ISO currency codes (TL, TRY, USD, EUR, GBP, JPY, CHF, CAD, AUD) while preserving identifier checks like "ACC-100001"
    const withoutCurrencyCode = str
      .replace(/(?:^|\s)(TL|TRY|USD|EUR|GBP|JPY|CHF|CAD|AUD)(?=$|\s)/gi, '')
      .trim();

    // Reject strings containing remaining alphabetic characters (e.g. "ACC-100001", "ISO-27001")
    if (/[a-zA-ZğüşöçıİĞÜŞÖÇ]/.test(withoutCurrencyCode)) return NaN;

    const isPercentStr = str.includes('%');
    const raw = withoutCurrencyCode.replace(/[^0-9.,+-]/g, '').trim();
    if (!raw || !/\d/.test(raw)) return NaN;

    const hasDot = raw.includes('.');
    const hasComma = raw.includes(',');

    if (hasDot && hasComma) {
      if (raw.lastIndexOf(',') > raw.lastIndexOf('.')) {
        // TR/EU format: 15.000,47 -> 15000.47
        return parseFloat(raw.replace(/\./g, '').replace(',', '.'));
      } else {
        // US/UK format: 15,000.47 -> 15000.47
        return parseFloat(raw.replace(/,/g, ''));
      }
    }

    if (hasComma) {
      // Multiple commas or US thousands grouping without decimals (when not a percent string)
      if (!isPercentStr && /^[+-]?[1-9]\d{0,2}(,\d{3})+$/.test(raw) && (raw.indexOf(',') !== raw.lastIndexOf(',') || raw.endsWith(',000'))) {
        return parseFloat(raw.replace(/,/g, ''));
      }
      if (raw.indexOf(',') !== raw.lastIndexOf(',')) {
        return parseFloat(raw.replace(/,/g, ''));
      }
      // Decimal comma: 15000,47 or +%14,2 or 0,500 -> 15000.47 / 14.2 / 0.5
      return parseFloat(raw.replace(',', '.'));
    }

    if (hasDot) {
      // Multiple dots are always thousands separators: 1.250.000 -> 1250000
      if (raw.indexOf('.') !== raw.lastIndexOf('.')) {
        return parseFloat(raw.replace(/\./g, ''));
      }
      // Single dot with exact .000 suffix (and not a percentage string like "+%14.250") -> TR integer thousands separator (e.g. "15.000")
      if (!isPercentStr && /^[+-]?[1-9]\d{0,2}\.000$/.test(raw)) {
        return parseFloat(raw.replace(/\./g, ''));
      }
      return parseFloat(raw);
    }

    return parseFloat(raw);
  }

  private static stringifyValue(rawVal: any): string {
    if (rawVal === null || rawVal === undefined) return '';
    if (Array.isArray(rawVal)) return rawVal.join(', ');
    if (typeof rawVal === 'object') {
      return Object.entries(rawVal)
        .map(([k, v]) => `${k}: ${String(v)}`)
        .join(' • ');
    }
    return String(rawVal);
  }

  private static matchesFormattedNumber(numVal: number, targetStr: string, mode: 'contains' | 'startswith' | 'endswith'): boolean {
    const tr2 = numVal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).toLowerCase();
    const tr0 = numVal.toLocaleString('tr-TR').toLowerCase();
    const en2 = numVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).toLowerCase();
    const cleanTarget = targetStr.replace(/[$€₺£%\s]/g, '').trim();
    if (!cleanTarget) return false;

    if (mode === 'contains') {
      return tr2.includes(cleanTarget) || tr0.includes(cleanTarget) || en2.includes(cleanTarget);
    }
    if (mode === 'startswith') {
      return tr2.startsWith(cleanTarget) || tr0.startsWith(cleanTarget) || en2.startsWith(cleanTarget);
    }
    return tr2.endsWith(cleanTarget) || tr0.endsWith(cleanTarget) || en2.endsWith(cleanTarget);
  }

  public static match(rawVal: any, op: FilterOperation, targetVal: any): boolean {
    const isRawBlank =
      rawVal === null ||
      rawVal === undefined ||
      rawVal === '' ||
      (Array.isArray(rawVal) && rawVal.length === 0) ||
      (typeof rawVal === 'object' && !Array.isArray(rawVal) && Object.keys(rawVal).length === 0);

    if (op === 'in') {
      if (!Array.isArray(targetVal) || targetVal.length === 0) return false;
      const compiled = this.getCompiledSet(targetVal);
      if (isRawBlank) return compiled.hasBlank;
      if (Array.isArray(rawVal)) {
        for (let i = 0; i < rawVal.length; i++) {
          const elem = rawVal[i];
          if (compiled.rawSet.has(elem) || compiled.lowerSet.has(String(elem).toLowerCase())) {
            return true;
          }
        }
        return false;
      }
      if (compiled.rawSet.has(rawVal)) return true;
      if (compiled.lowerSet.has(this.stringifyValue(rawVal).toLowerCase())) return true;
      return this.matchesCompiledDateSet(rawVal, compiled);
    }

    if (op === 'notin') {
      if (!Array.isArray(targetVal) || targetVal.length === 0) return true;
      const compiled = this.getCompiledSet(targetVal);
      if (isRawBlank) return !compiled.hasBlank;
      if (Array.isArray(rawVal)) {
        for (let i = 0; i < rawVal.length; i++) {
          const elem = rawVal[i];
          if (compiled.rawSet.has(elem) || compiled.lowerSet.has(String(elem).toLowerCase())) {
            return false;
          }
        }
        return true;
      }
      if (compiled.rawSet.has(rawVal)) return false;
      if (compiled.lowerSet.has(this.stringifyValue(rawVal).toLowerCase())) return false;
      return !this.matchesCompiledDateSet(rawVal, compiled);
    }

    if (op === '=' && (targetVal === null || targetVal === undefined || targetVal === '' || targetVal === BLANK_FILTER_TOKEN)) {
      return isRawBlank;
    }

    if (isRawBlank) {
      return op === '<>' || op === 'notcontains';
    }

    const valStr = this.stringifyValue(rawVal).toLowerCase();
    const targetStr = String(targetVal ?? '').toLowerCase().trim();
    const rawDate = this.parseDateParts(rawVal);
    const targetDate = Array.isArray(targetVal) ? null : this.parseDateParts(targetVal);
    const numRaw = typeof rawVal === 'number' ? rawVal : rawDate ? NaN : this.parseNumeric(rawVal);
    const numTarget = targetDate ? NaN : this.parseNumeric(targetVal);
    const bothNumeric = !isNaN(numRaw) && !isNaN(numTarget);
    const bothDate = rawDate !== null && targetDate !== null;

    switch (op) {
      case 'contains':
        if (valStr.includes(targetStr)) return true;
        if (rawDate) {
          const dmy = `${String(rawDate.day).padStart(2, '0')}.${String(rawDate.month).padStart(2, '0')}.${rawDate.year}`;
          if (rawDate.isoDate.includes(targetStr) || dmy.includes(targetStr)) return true;
        }
        if (!isNaN(numRaw)) {
          return this.matchesFormattedNumber(numRaw, targetStr, 'contains');
        }
        return false;
      case 'notcontains':
        if (valStr.includes(targetStr)) return false;
        if (rawDate) {
          const dmy = `${String(rawDate.day).padStart(2, '0')}.${String(rawDate.month).padStart(2, '0')}.${rawDate.year}`;
          if (rawDate.isoDate.includes(targetStr) || dmy.includes(targetStr)) return false;
        }
        if (!isNaN(numRaw) && this.matchesFormattedNumber(numRaw, targetStr, 'contains')) {
          return false;
        }
        return true;
      case 'startswith':
        if (valStr.startsWith(targetStr)) return true;
        if (!isNaN(numRaw)) {
          return this.matchesFormattedNumber(numRaw, targetStr, 'startswith');
        }
        return false;
      case 'endswith':
        if (valStr.endsWith(targetStr)) return true;
        if (!isNaN(numRaw)) {
          return this.matchesFormattedNumber(numRaw, targetStr, 'endswith');
        }
        return false;
      case '=':
        if (bothDate) {
          if (!targetDate.hasTime) return rawDate.isoDate === targetDate.isoDate;
          return rawDate.exactMs === targetDate.exactMs;
        }
        if (bothNumeric) {
          return Math.abs(numRaw - numTarget) < 0.0001;
        }
        if (typeof rawVal === 'boolean') {
          if (typeof targetVal === 'boolean') return rawVal === targetVal;
          const bTarget = ['true', '1', 'evet', 'doğru', 'yes'].includes(targetStr);
          return rawVal === bTarget;
        }
        return valStr === targetStr;
      case '<>':
        if (bothDate) {
          if (!targetDate.hasTime) return rawDate.isoDate !== targetDate.isoDate;
          return rawDate.exactMs !== targetDate.exactMs;
        }
        if (bothNumeric) {
          return Math.abs(numRaw - numTarget) >= 0.0001;
        }
        return valStr !== targetStr;
      case '<':
        if (bothDate) {
          return rawDate.exactMs < (targetDate.hasTime ? targetDate.exactMs : targetDate.startOfDayMs);
        }
        if (bothNumeric) return numRaw < numTarget;
        return valStr < targetStr;
      case '<=':
        if (bothDate) {
          return rawDate.exactMs <= (targetDate.hasTime ? targetDate.exactMs : targetDate.endOfDayMs);
        }
        if (bothNumeric) return numRaw <= numTarget;
        return valStr <= targetStr;
      case '>':
        if (bothDate) {
          return rawDate.exactMs > (targetDate.hasTime ? targetDate.exactMs : targetDate.endOfDayMs);
        }
        if (bothNumeric) return numRaw > numTarget;
        return valStr > targetStr;
      case '>=':
        if (bothDate) {
          return rawDate.exactMs >= (targetDate.hasTime ? targetDate.exactMs : targetDate.startOfDayMs);
        }
        if (bothNumeric) return numRaw >= numTarget;
        return valStr >= targetStr;
      case 'between': {
        const [minRaw, maxRaw] = Array.isArray(targetVal) ? targetVal : [targetVal, ''];
        const minDate = this.parseDateParts(minRaw);
        const maxDate = this.parseDateParts(maxRaw);
        if (rawDate && (minDate || maxDate)) {
          if (minDate && maxDate) {
            const [loD, hiD] =
              minDate.startOfDayMs <= maxDate.startOfDayMs ? [minDate, maxDate] : [maxDate, minDate];
            const loMs = loD.hasTime ? loD.exactMs : loD.startOfDayMs;
            const hiMs = hiD.hasTime ? hiD.exactMs : hiD.endOfDayMs;
            return rawDate.exactMs >= loMs && rawDate.exactMs <= hiMs;
          }
          if (minDate) {
            const loMs = minDate.hasTime ? minDate.exactMs : minDate.startOfDayMs;
            return rawDate.exactMs >= loMs;
          }
          if (maxDate) {
            const hiMs = maxDate.hasTime ? maxDate.exactMs : maxDate.endOfDayMs;
            return rawDate.exactMs <= hiMs;
          }
        }
        const minNum = this.parseNumeric(minRaw);
        const maxNum = this.parseNumeric(maxRaw);
        if (!isNaN(numRaw) && (!isNaN(minNum) || !isNaN(maxNum))) {
          if (!isNaN(minNum) && !isNaN(maxNum)) {
            const lo = Math.min(minNum, maxNum);
            const hi = Math.max(minNum, maxNum);
            return numRaw >= lo && numRaw <= hi;
          }
          if (!isNaN(minNum)) return numRaw >= minNum;
          if (!isNaN(maxNum)) return numRaw <= maxNum;
        }
        const minS = String(minRaw ?? '').toLowerCase().trim();
        const maxS = String(maxRaw ?? '').toLowerCase().trim();
        if (minS && maxS) {
          const [loS, hiS] = minS <= maxS ? [minS, maxS] : [maxS, minS];
          return valStr >= loS && valStr <= hiS;
        }
        if (minS) return valStr >= minS;
        if (maxS) return valStr <= maxS;
        return true;
      }
      default:
        return true;
    }
  }

  public static buildRowSearchIndex(row: Record<string, any>): string {
    const parts: string[] = [];
    for (const k in row) {
      if (k.startsWith('__') || k === 'sparkline') continue;
      const v = row[k];
      if (v !== null && v !== undefined && v !== '') {
        parts.push(this.stringifyValue(v));
        if (typeof v === 'string' && v.length >= 8 && v.length <= 25) {
          const pd = this.parseDateParts(v);
          if (pd) {
            const dStr = String(pd.day).padStart(2, '0');
            const mStr = String(pd.month).padStart(2, '0');
            parts.push(`${dStr}.${mStr}.${pd.year}`);
            parts.push(`${mStr}/${dStr}/${pd.year}`);
          }
        }
      }
    }
    const idx = parts.join('\x1f').toLowerCase();
    row.__searchIndex = idx;
    return idx;
  }

  public static matchSearch(row: Record<string, any>, cleanKeyword: string): boolean {
    if (!cleanKeyword) return true;
    const indexStr: string = row.__searchIndex ?? this.buildRowSearchIndex(row);
    return indexStr.includes(cleanKeyword);
  }
}
