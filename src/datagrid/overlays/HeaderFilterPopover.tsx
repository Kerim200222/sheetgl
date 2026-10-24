import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ColumnDef } from '../types/grid';
import { IGridThemeTokens } from '../theme/IGridTheme';
import { IGridLocale } from '../i18n/IGridLocale';
import { IDataStore } from '../types/store';
import { ColumnFilterState, DistinctItem, FilterOperation } from '../types/filter';
import { BLANK_FILTER_TOKEN, FilterEngine } from '../core/FilterEngine';
import { MaterialIcon } from '../ui/MaterialIcon';

export interface HeaderFilterPopoverProps {
  column: ColumnDef;
  anchorRect: { x: number; y: number; width: number; height: number };
  viewportWidth?: number;
  theme: IGridThemeTokens;
  locale: IGridLocale;
  store: IDataStore;
  activeFilter?: ColumnFilterState;
  onApply: (filterState: ColumnFilterState | null) => void;
  onSort?: (desc: boolean) => void;
  onToggleGroup?: () => void;
  isGrouped?: boolean;
  onClose: () => void;
}

const NUMERIC_COLUMN_TYPES = new Set([
  'number',
  'currency',
  'percent',
  'progress',
  'rating',
]);

const TR_MONTH_NAMES = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

const EN_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface DateDayNode {
  year: number;
  month: number;
  day: number;
  isoDate: string;
  rawValues: any[];
  count: number;
}

interface DateMonthNode {
  year: number;
  month: number;
  monthKey: string;
  rawValues: any[];
  count: number;
  days: DateDayNode[];
}

interface DateYearNode {
  year: number;
  rawValues: any[];
  count: number;
  months: DateMonthNode[];
}

type FlatDateTreeRow =
  | {
      kind: 'blank';
      key: string;
      item: DistinctItem;
    }
  | {
      kind: 'year';
      key: string;
      year: number;
      rawValues: any[];
      count: number;
      monthCount: number;
      expanded: boolean;
    }
  | {
      kind: 'month';
      key: string;
      monthKey: string;
      year: number;
      month: number;
      rawValues: any[];
      count: number;
      dayCount: number;
      expanded: boolean;
    }
  | {
      kind: 'day';
      key: string;
      year: number;
      month: number;
      day: number;
      isoDate: string;
      rawValues: any[];
      count: number;
    }
  | {
      kind: 'other';
      key: string;
      item: DistinctItem;
    };

/**
 * Formats a raw cell value identically to how the cell painter renders it on Canvas.
 */
export function formatCellStructureValue(
  rawVal: any,
  column: ColumnDef,
  locale: IGridLocale
): string {
  if (rawVal === BLANK_FILTER_TOKEN || rawVal === null || rawVal === undefined || rawVal === '') {
    return locale.emptyText;
  }

  const isTR = locale.code.startsWith('tr');

  const colType = (column.type || '').toLowerCase();
  if (colType === 'date' || colType === 'datetime') {
    return FilterEngine.formatLocalizedDate(
      rawVal,
      locale.code,
      colType === 'datetime'
    );
  }

  // Fallback: If value matches ISO date string pattern, format semantically
  if (typeof rawVal === 'string' && /^\d{4}-\d{2}-\d{2}/.test(rawVal.trim())) {
    const parsed = FilterEngine.parseDateParts(rawVal);
    if (parsed) {
      return FilterEngine.formatLocalizedDate(rawVal, locale.code, false);
    }
  }

  if (column.type === 'currency') {
    const num = FilterEngine.parseNumeric(rawVal);
    if (isNaN(num)) return String(rawVal);
    const digits = column.decimalDigits ?? 2;
    const sym = column.currencySymbol || '$';
    const numStr = num.toLocaleString(locale.code, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    return isTR ? `${numStr} ${sym}` : `${sym}${numStr}`;
  }

  if (column.type === 'number') {
    const num = FilterEngine.parseNumeric(rawVal);
    if (isNaN(num)) return String(rawVal);
    const isInt = column.decimalDigits === 0 || (column.decimalDigits === undefined && Number.isInteger(num));
    const digits = isInt ? 0 : column.decimalDigits ?? 2;
    return num.toLocaleString(locale.code, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  if (column.type === 'percent') {
    const num = FilterEngine.parseNumeric(rawVal);
    if (isNaN(num)) return String(rawVal);
    const digits = column.decimalDigits ?? 1;
    const numStr = num.toLocaleString(locale.code, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    const sign = (column.showVarianceSign ?? true) && num > 0 ? '+' : '';
    return `${sign}${numStr}%`;
  }

  if (column.type === 'progress') {
    const num = FilterEngine.parseNumeric(rawVal);
    if (isNaN(num)) return String(rawVal);
    return isTR ? `%${Math.round(num)}` : `${Math.round(num)}%`;
  }

  if (column.type === 'rating') {
    const num = Math.max(0, Math.min(5, Math.round(FilterEngine.parseNumeric(rawVal) || 0)));
    return `${'★'.repeat(num)}${'☆'.repeat(5 - num)} (${num})`;
  }

  if (column.type === 'boolean') {
    const b =
      typeof rawVal === 'boolean'
        ? rawVal
        : ['true', '1', 'evet', 'doğru', 'yes'].includes(String(rawVal).toLowerCase());
    return b ? locale.trueText : locale.falseText;
  }

  if (
    (column.type === 'select' ||
      column.type === 'dropdown' ||
      column.type === 'lookup' ||
      column.type === 'multiselect') &&
    column.options
  ) {
    const opt = column.options.find((o) => String(o.value) === String(rawVal));
    if (opt) return opt.subtitle ? `${opt.label} (${opt.subtitle})` : opt.label;
  }

  if (column.type === 'object' && typeof rawVal === 'object' && !Array.isArray(rawVal)) {
    return Object.entries(rawVal)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(' • ');
  }

  return String(rawVal);
}

/**
 * Sanitizes numeric input while typing without mutating thousands separators or jumping the cursor.
 * Accepts digits, leading minus, and both '.' and ',' separators across TR/EN keyboards.
 */
function sanitizeNumericTyping(rawInput: string): string {
  const stripped = rawInput.replace(/[^0-9.,+-]/g, '');
  if (!stripped) return '';
  const isNeg = stripped.startsWith('-');
  const unsigned = stripped.replace(/[+-]/g, '');
  return `${isNeg ? '-' : ''}${unsigned}`;
}

function formatNumericDisplay(num: number, isTR: boolean): string {
  if (isNaN(num)) return '';
  return num.toLocaleString(isTR ? 'tr-TR' : 'en-US', {
    maximumFractionDigits: 4,
  });
}

function initialConditionInputDisplay(rawVal: any, column: ColumnDef, isTR: boolean): string {
  if (rawVal === undefined || rawVal === null || rawVal === '') return '';
  if (column.type === 'date' || column.type === 'datetime') {
    const parsed = FilterEngine.parseDateParts(rawVal);
    if (parsed) return parsed.isoDate;
  }
  if (NUMERIC_COLUMN_TYPES.has(column.type)) {
    const num = FilterEngine.parseNumeric(rawVal);
    if (!isNaN(num)) {
      return formatNumericDisplay(num, isTR);
    }
  }
  return String(rawVal);
}

function toIsoDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const HeaderFilterPopover: React.FC<HeaderFilterPopoverProps> = ({
  column,
  anchorRect,
  viewportWidth = 1000,
  theme,
  locale,
  store,
  activeFilter,
  onApply,
  onSort,
  onToggleGroup,
  isGrouped,
  onClose,
}) => {
  const isTR = locale.code.startsWith('tr');
  const colType = (column.type || '').toLowerCase();
  const isNumericCol = NUMERIC_COLUMN_TYPES.has(colType) || NUMERIC_COLUMN_TYPES.has(column.type);
  const isDateCol = colType === 'date' || colType === 'datetime';
  const monthNames = isTR ? TR_MONTH_NAMES : EN_MONTH_NAMES;

  const [tab, setTab] = useState<'values' | 'condition'>(activeFilter?.mode || 'values');
  const [allItems, setAllItems] = useState<DistinctItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedSet, setSelectedSet] = useState<Set<any>>(
    () => new Set(activeFilter?.selectedValues || [])
  );
  const [listScrollTop, setListScrollTop] = useState<number>(0);

  // Hierarchical Year > Month > Day expansion state for date/datetime columns
  const [expandedYears, setExpandedYears] = useState<Set<number>>(() => new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => new Set());
  const [isRangeDriven, setIsRangeDriven] = useState<boolean>(
    Boolean(isDateCol && activeFilter?.mode === 'condition' && activeFilter?.operator === 'between')
  );

  // Condition filter states
  const defaultOp: FilterOperation = isDateCol
    ? 'between'
    : isNumericCol
    ? '<'
    : column.type === 'time' || column.type === 'boolean'
    ? '='
    : 'contains';

  const [operator, setOperator] = useState<FilterOperation>(activeFilter?.operator || defaultOp);
  const [condVal1, setCondVal1] = useState<string>(() =>
    initialConditionInputDisplay(activeFilter?.value1, column, isTR)
  );
  const [condVal2, setCondVal2] = useState<string>(() =>
    initialConditionInputDisplay(activeFilter?.value2, column, isTR)
  );

  const popoverRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const condInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch all distinct values once when opened for this column
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    store.getDistinctValues(column.id).then((res) => {
      if (!mounted) return;
      setAllItems(res);

      // Initialize Year > Month > Day tree expansion for date columns
      if (isDateCol) {
        const yearsSet = new Set<number>();
        const monthsSet = new Set<string>();
        let dayTotal = 0;
        for (const r of res) {
          const p = FilterEngine.parseDateParts(r.value);
          if (p) {
            yearsSet.add(p.year);
            monthsSet.add(`${p.year}-${p.month}`);
            dayTotal++;
          }
        }
        setExpandedYears(yearsSet);
        if (dayTotal <= 120) {
          setExpandedMonths(monthsSet);
        } else {
          setExpandedMonths(new Set());
        }
      }

      if (activeFilter && activeFilter.mode === 'values' && activeFilter.selectedValues) {
        setSelectedSet(new Set(activeFilter.selectedValues));
      } else if (activeFilter && activeFilter.mode === 'condition' && activeFilter.operator) {
        const op = activeFilter.operator;
        const target =
          op === 'between'
            ? [activeFilter.value1, activeFilter.value2]
            : activeFilter.value1;
        const matchedValues: any[] = [];
        for (const r of res) {
          const rawVal = r.value === BLANK_FILTER_TOKEN ? '' : r.value;
          if (FilterEngine.match(rawVal, op, target)) {
            matchedValues.push(r.value);
          }
        }
        setSelectedSet(new Set(matchedValues));
      } else {
        setSelectedSet(new Set(res.map((r) => r.value)));
      }
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [column.id, store]);

  useEffect(() => {
    if (tab === 'values') {
      searchInputRef.current?.focus();
    } else {
      condInputRef.current?.focus();
    }
  }, [tab]);

  // Outside click listener
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutside, true);
    return () => document.removeEventListener('mousedown', handleOutside, true);
  }, [onClose]);

  const formatItemLabel = (it: DistinctItem): string => {
    if (isDateCol || (typeof it.value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(it.value.trim()))) {
      return FilterEngine.formatLocalizedDate(it.value, locale.code, colType === 'datetime');
    }
    return formatCellStructureValue(it.value, column, locale);
  };

  // Helper to sync non-date condition inputs with selectedSet so Value List & Condition Rule stay synchronized
  const syncConditionToSelection = (
    nextV1: string,
    nextV2: string,
    nextOp: FilterOperation
  ) => {
    setCondVal1(nextV1);
    setCondVal2(nextV2);
    setOperator(nextOp);

    const hasInput =
      nextV1.trim() !== '' || (nextOp === 'between' && nextV2.trim() !== '');
    if (!hasInput && nextOp !== '=') {
      setSelectedSet(new Set(allItems.map((r) => r.value)));
      return;
    }

    const parsedV1 = isNumericCol ? FilterEngine.parseNumeric(nextV1) : nextV1;
    const parsedV2 = isNumericCol ? FilterEngine.parseNumeric(nextV2) : nextV2;
    const target = nextOp === 'between' ? [parsedV1, parsedV2] : parsedV1;

    const nextSel = new Set<any>();
    for (let i = 0; i < allItems.length; i++) {
      const it = allItems[i];
      const rawVal = it.value === BLANK_FILTER_TOKEN ? '' : it.value;
      if (FilterEngine.match(rawVal, nextOp, target)) {
        nextSel.add(it.value);
      }
    }
    setSelectedSet(nextSel);
  };

  // Helper to sync Between date range inputs with the Year > Month > Day tree selection
  const applyDateRangeToTree = (nextStart: string, nextEnd: string, nextOp: FilterOperation = 'between') => {
    setCondVal1(nextStart);
    setCondVal2(nextEnd);
    setOperator(nextOp);
    setListScrollTop(0);

    const hasStart = nextStart.trim() !== '';
    const hasEnd = nextEnd.trim() !== '';
    if (!hasStart && !hasEnd) {
      setIsRangeDriven(false);
      setSelectedSet(new Set(allItems.map((r) => r.value)));
      return;
    }

    setIsRangeDriven(true);
    const target = nextOp === 'between' ? [nextStart, nextEnd] : nextStart || nextEnd;
    const nextSel = new Set<any>();
    const matchYears = new Set<number>();
    const matchMonths = new Set<string>();

    for (const it of allItems) {
      if (it.value === BLANK_FILTER_TOKEN) continue;
      if (FilterEngine.match(it.value, nextOp, target)) {
        nextSel.add(it.value);
        const p = FilterEngine.parseDateParts(it.value);
        if (p) {
          matchYears.add(p.year);
          matchMonths.add(`${p.year}-${p.month}`);
        }
      }
    }

    setSelectedSet(nextSel);
    if (matchYears.size > 0) {
      setExpandedYears((prev) => new Set([...prev, ...matchYears]));
      if (matchMonths.size <= 36) {
        setExpandedMonths((prev) => new Set([...prev, ...matchMonths]));
      }
    }
  };

  // Build semantic Year > Month > Day hierarchy for date/datetime columns
  const dateHierarchy = useMemo(() => {
    if (!isDateCol) {
      return {
        blankItem: null as DistinctItem | null,
        years: [] as DateYearNode[],
        otherItems: [] as DistinctItem[],
        minIsoDate: '',
        maxIsoDate: '',
      };
    }

    let blankItem: DistinctItem | null = null;
    const otherItems: DistinctItem[] = [];
    const yearMap = new Map<
      number,
      {
        rawValues: any[];
        count: number;
        monthMap: Map<
          number,
          {
            rawValues: any[];
            count: number;
            dayMap: Map<number, { isoDate: string; rawValues: any[]; count: number }>;
          }
        >;
      }
    >();

    let minIsoDate = '';
    let maxIsoDate = '';
    const q = search.toLowerCase().trim();

    for (const it of allItems) {
      if (
        it.value === BLANK_FILTER_TOKEN ||
        it.value === null ||
        it.value === undefined ||
        it.value === ''
      ) {
        if (!q || locale.emptyText.toLowerCase().includes(q)) {
          blankItem = it;
        }
        continue;
      }

      const parsed = FilterEngine.parseDateParts(it.value);
      if (!parsed) {
        const lbl = formatItemLabel(it).toLowerCase();
        if (!q || lbl.includes(q)) {
          otherItems.push(it);
        }
        continue;
      }

      if (!minIsoDate || parsed.isoDate < minIsoDate) minIsoDate = parsed.isoDate;
      if (!maxIsoDate || parsed.isoDate > maxIsoDate) maxIsoDate = parsed.isoDate;

      const mName = monthNames[parsed.month - 1].toLowerCase();
      const mNumPad = String(parsed.month).padStart(2, '0');
      const dNumPad = String(parsed.day).padStart(2, '0');
      const dmyStr = `${dNumPad}.${mNumPad}.${parsed.year}`;

      if (q) {
        const matchesQuery =
          String(parsed.year).includes(q) ||
          mName.includes(q) ||
          mNumPad.includes(q) ||
          dNumPad.includes(q) ||
          parsed.isoDate.includes(q) ||
          dmyStr.includes(q);
        if (!matchesQuery) continue;
      }

      const itemCount = it.count ?? 1;

      let yEntry = yearMap.get(parsed.year);
      if (!yEntry) {
        yEntry = { rawValues: [], count: 0, monthMap: new Map() };
        yearMap.set(parsed.year, yEntry);
      }
      yEntry.rawValues.push(it.value);
      yEntry.count += itemCount;

      let mEntry = yEntry.monthMap.get(parsed.month);
      if (!mEntry) {
        mEntry = { rawValues: [], count: 0, dayMap: new Map() };
        yEntry.monthMap.set(parsed.month, mEntry);
      }
      mEntry.rawValues.push(it.value);
      mEntry.count += itemCount;

      let dEntry = mEntry.dayMap.get(parsed.day);
      if (!dEntry) {
        dEntry = { isoDate: parsed.isoDate, rawValues: [], count: 0 };
        mEntry.dayMap.set(parsed.day, dEntry);
      }
      dEntry.rawValues.push(it.value);
      dEntry.count += itemCount;
    }

    const years: DateYearNode[] = Array.from(yearMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, yData]) => {
        const months: DateMonthNode[] = Array.from(yData.monthMap.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([month, mData]) => {
            const days: DateDayNode[] = Array.from(mData.dayMap.entries())
              .sort((a, b) => a[0] - b[0])
              .map(([day, dData]) => ({
                year,
                month,
                day,
                isoDate: dData.isoDate,
                rawValues: dData.rawValues,
                count: dData.count,
              }));
            return {
              year,
              month,
              monthKey: `${year}-${month}`,
              rawValues: mData.rawValues,
              count: mData.count,
              days,
            };
          });
        return {
          year,
          rawValues: yData.rawValues,
          count: yData.count,
          months,
        };
      });

    return { blankItem, years, otherItems, minIsoDate, maxIsoDate };
  }, [isDateCol, allItems, search, locale, monthNames]);

  // Flatten visible Year > Month > Day tree rows for virtualized rendering
  const flatDateTreeRows = useMemo<FlatDateTreeRow[]>(() => {
    if (!isDateCol) return [];
    const rows: FlatDateTreeRow[] = [];
    const forceExpand = search.trim().length > 0;

    if (dateHierarchy.blankItem) {
      rows.push({
        kind: 'blank',
        key: '__blank__',
        item: dateHierarchy.blankItem,
      });
    }

    for (const yNode of dateHierarchy.years) {
      const yExpanded = forceExpand || expandedYears.has(yNode.year);
      rows.push({
        kind: 'year',
        key: `y_${yNode.year}`,
        year: yNode.year,
        rawValues: yNode.rawValues,
        count: yNode.count,
        monthCount: yNode.months.length,
        expanded: yExpanded,
      });

      if (yExpanded) {
        for (const mNode of yNode.months) {
          const mExpanded = forceExpand || expandedMonths.has(mNode.monthKey);
          rows.push({
            kind: 'month',
            key: `m_${mNode.monthKey}`,
            monthKey: mNode.monthKey,
            year: mNode.year,
            month: mNode.month,
            rawValues: mNode.rawValues,
            count: mNode.count,
            dayCount: mNode.days.length,
            expanded: mExpanded,
          });

          if (mExpanded) {
            for (const dNode of mNode.days) {
              rows.push({
                kind: 'day',
                key: `d_${dNode.isoDate}`,
                year: dNode.year,
                month: dNode.month,
                day: dNode.day,
                isoDate: dNode.isoDate,
                rawValues: dNode.rawValues,
                count: dNode.count,
              });
            }
          }
        }
      }
    }

    for (const oItem of dateHierarchy.otherItems) {
      rows.push({
        kind: 'other',
        key: `o_${String(oItem.value)}`,
        item: oItem,
      });
    }

    return rows;
  }, [isDateCol, dateHierarchy, expandedYears, expandedMonths, search]);

  const visibleItems = useMemo(() => {
    if (!search.trim()) return allItems;
    const q = search.toLowerCase().trim();
    if (isDateCol) {
      const matchedRawSet = new Set<any>();
      if (dateHierarchy.blankItem) matchedRawSet.add(dateHierarchy.blankItem.value);
      for (const y of dateHierarchy.years) {
        for (const rv of y.rawValues) matchedRawSet.add(rv);
      }
      for (const o of dateHierarchy.otherItems) matchedRawSet.add(o.value);
      return allItems.filter((it) => matchedRawSet.has(it.value));
    }
    return allItems.filter((it) => {
      const display = formatItemLabel(it).toLowerCase();
      return display.includes(q) || String(it.value).toLowerCase().includes(q);
    });
  }, [allItems, search, column, locale, isDateCol, dateHierarchy]);

  // Numeric column min/max/average statistics for quick condition presets
  const numericColumnStats = useMemo(() => {
    if (!isNumericCol || allItems.length === 0) return null;
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    let totalCount = 0;
    let hasNegative = false;

    for (let i = 0; i < allItems.length; i++) {
      const it = allItems[i];
      if (it.value === BLANK_FILTER_TOKEN) continue;
      const num = FilterEngine.parseNumeric(it.value);
      if (!isNaN(num)) {
        const c = it.count ?? 1;
        if (num < min) min = num;
        if (num > max) max = num;
        if (num < 0) hasNegative = true;
        sum += num * c;
        totalCount += c;
      }
    }

    if (totalCount === 0 || !isFinite(min) || !isFinite(max)) return null;
    const avg = Math.round((sum / totalCount) * 100) / 100;
    return { min, max, avg, hasNegative };
  }, [isNumericCol, allItems]);

  // Live count of rows matching the current Condition Rule
  const conditionMatchCount = useMemo(() => {
    const hasCondInput = condVal1.trim() !== '' || (operator === 'between' && condVal2.trim() !== '');
    if (!hasCondInput && operator !== '=') return null;
    const v1 = isNumericCol ? FilterEngine.parseNumeric(condVal1) : condVal1;
    const v2 = isNumericCol ? FilterEngine.parseNumeric(condVal2) : condVal2;
    const target = operator === 'between' ? [v1, v2] : v1;

    let matched = 0;
    let total = 0;
    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      const itemCount = item.count ?? 1;
      total += itemCount;
      const rawVal = item.value === BLANK_FILTER_TOKEN ? '' : item.value;
      if (FilterEngine.match(rawVal, operator, target)) {
        matched += itemCount;
      }
    }
    return { matched, total };
  }, [condVal1, condVal2, operator, allItems, isNumericCol]);

  const areAllVisibleChecked =
    visibleItems.length > 0 && visibleItems.every((it) => selectedSet.has(it.value));

  const isIndeterminate =
    visibleItems.some((it) => selectedSet.has(it.value)) && !areAllVisibleChecked;

  const toggleAllVisible = () => {
    setIsRangeDriven(false);
    const next = new Set(selectedSet);
    if (areAllVisibleChecked) {
      for (const it of visibleItems) {
        next.delete(it.value);
      }
    } else {
      for (const it of visibleItems) {
        next.add(it.value);
      }
    }
    setSelectedSet(next);
  };

  const toggleSingleItem = (val: any) => {
    setIsRangeDriven(false);
    const next = new Set(selectedSet);
    if (next.has(val)) {
      next.delete(val);
    } else {
      next.add(val);
    }
    setSelectedSet(next);
  };

  const toggleGroupValues = (rawValues: any[]) => {
    setIsRangeDriven(false);
    const next = new Set(selectedSet);
    const allChecked = rawValues.length > 0 && rawValues.every((v) => next.has(v));
    if (allChecked) {
      for (const v of rawValues) next.delete(v);
    } else {
      for (const v of rawValues) next.add(v);
    }
    setSelectedSet(next);
  };

  const toggleExpandYear = (year: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const toggleExpandMonth = (monthKey: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(monthKey)) next.delete(monthKey);
      else next.add(monthKey);
      return next;
    });
  };

  const areAllDateNodesExpanded = useMemo(() => {
    if (!isDateCol || dateHierarchy.years.length === 0) return false;
    return dateHierarchy.years.every(
      (y) =>
        expandedYears.has(y.year) &&
        y.months.every((m) => expandedMonths.has(m.monthKey))
    );
  }, [isDateCol, dateHierarchy.years, expandedYears, expandedMonths]);

  const toggleExpandCollapseAllDates = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (areAllDateNodesExpanded) {
      setExpandedYears(new Set());
      setExpandedMonths(new Set());
    } else {
      const ySet = new Set<number>();
      const mSet = new Set<string>();
      for (const y of dateHierarchy.years) {
        ySet.add(y.year);
        for (const m of y.months) {
          mSet.add(m.monthKey);
        }
      }
      setExpandedYears(ySet);
      setExpandedMonths(mSet);
    }
  };

  const applyQuickDatePreset = (preset: 'today' | 'last7' | 'last30' | 'thisMonth' | 'thisYear' | 'lastYear' | 'fullRange') => {
    const now = new Date();
    let start = '';
    let end = '';

    if (preset === 'today') {
      start = toIsoDateString(now);
      end = start;
    } else if (preset === 'last7') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      start = toIsoDateString(d);
      end = toIsoDateString(now);
    } else if (preset === 'last30') {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      start = toIsoDateString(d);
      end = toIsoDateString(now);
    } else if (preset === 'thisMonth') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      start = toIsoDateString(first);
      end = toIsoDateString(last);
    } else if (preset === 'thisYear') {
      start = `${now.getFullYear()}-01-01`;
      end = `${now.getFullYear()}-12-31`;
    } else if (preset === 'lastYear') {
      const ly = now.getFullYear() - 1;
      start = `${ly}-01-01`;
      end = `${ly}-12-31`;
    } else if (preset === 'fullRange') {
      start = dateHierarchy.minIsoDate;
      end = dateHierarchy.maxIsoDate;
    }

    applyDateRangeToTree(start, end, 'between');
  };

  const handleApply = () => {
    const hasBetweenInput =
      isDateCol &&
      operator === 'between' &&
      (condVal1.trim() !== '' || condVal2.trim() !== '');

    if (tab === 'values' && !(isRangeDriven && hasBetweenInput)) {
      if (allItems.length > 0 && selectedSet.size === allItems.length) {
        onApply(null);
      } else {
        onApply({
          columnId: column.id,
          mode: 'values',
          selectedValues: Array.from(selectedSet),
        });
      }
    } else {
      const hasAnyVal =
        condVal1.trim() !== '' || (operator === 'between' && condVal2.trim() !== '');
      if (!hasAnyVal && operator !== '=') {
        onApply(null);
      } else {
        const normalizedV1 = isNumericCol
          ? (() => {
              const n = FilterEngine.parseNumeric(condVal1);
              return isNaN(n) ? condVal1 : n;
            })()
          : condVal1;
        const normalizedV2 = isNumericCol
          ? (() => {
              const n = FilterEngine.parseNumeric(condVal2);
              return isNaN(n) ? condVal2 : n;
            })()
          : condVal2;

        onApply({
          columnId: column.id,
          mode: 'condition',
          operator,
          value1: normalizedV1,
          value2: normalizedV2,
        });
      }
    }
    onClose();
  };

  const handleClear = () => {
    setSearch('');
    setCondVal1('');
    setCondVal2('');
    setIsRangeDriven(false);
    setSelectedSet(new Set(allItems.map((r) => r.value)));
    onApply(null);
    onClose();
  };

  const renderStructuredConditionInput = (
    val: string,
    setVal: (v: string) => void,
    placeholder: string,
    autoFocusRef?: React.RefObject<HTMLInputElement | null>
  ) => {
    // 1. Boolean Column -> True / False Select
    if (column.type === 'boolean') {
      return (
        <select
          value={val || 'true'}
          onChange={(e) => setVal(e.target.value)}
          style={{
            width: '100%',
            padding: '7px 8px',
            backgroundColor: theme.dom.inputBg,
            color: theme.dom.inputText,
            border: `1px solid ${theme.dom.inputBorder}`,
            borderRadius: 6,
            outline: 'none',
            fontSize: 12,
          }}
        >
          <option value="">{isTR ? 'Seçiniz...' : 'Select...'}</option>
          <option value="true">✓ {locale.trueText}</option>
          <option value="false">✕ {locale.falseText}</option>
        </select>
      );
    }

    // 2. Select / Dropdown / Lookup / MultiSelect with Options
    if (
      (column.type === 'select' ||
        column.type === 'dropdown' ||
        column.type === 'lookup' ||
        column.type === 'multiselect') &&
      column.options &&
      column.options.length > 0 &&
      (operator === '=' || operator === '<>' || operator === 'contains')
    ) {
      return (
        <select
          value={val}
          onChange={(e) => setVal(e.target.value)}
          style={{
            width: '100%',
            padding: '7px 8px',
            backgroundColor: theme.dom.inputBg,
            color: theme.dom.inputText,
            border: `1px solid ${theme.dom.inputBorder}`,
            borderRadius: 6,
            outline: 'none',
            fontSize: 12,
          }}
        >
          <option value="">{isTR ? 'Seçenek seçin...' : 'Choose option...'}</option>
          {column.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} {opt.subtitle ? `(${opt.subtitle})` : ''}
            </option>
          ))}
        </select>
      );
    }

    // 3. Date / DateTime Column -> Native Date Picker
    if (isDateCol) {
      return (
        <input
          ref={autoFocusRef}
          type="date"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: theme.dom.inputBg,
            color: theme.dom.inputText,
            border: `1px solid ${theme.dom.inputBorder}`,
            borderRadius: 6,
            outline: 'none',
            fontSize: 12,
            fontFamily: 'monospace',
            boxSizing: 'border-box',
          }}
        />
      );
    }

    // 4. Time Column -> Native Time Picker
    if (column.type === 'time') {
      return (
        <input
          ref={autoFocusRef}
          type="time"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: theme.dom.inputBg,
            color: theme.dom.inputText,
            border: `1px solid ${theme.dom.inputBorder}`,
            borderRadius: 6,
            outline: 'none',
            fontSize: 12,
            fontFamily: 'monospace',
            boxSizing: 'border-box',
          }}
        />
      );
    }

    // 5. Currency / Number / Percent / Progress / Rating -> Live Formatted Cell-Structured Input
    if (isNumericCol) {
      const sym =
        column.type === 'currency'
          ? column.currencySymbol || '$'
          : column.type === 'percent' || column.type === 'progress'
          ? '%'
          : column.type === 'rating'
          ? '★'
          : '';
      const prefixSym =
        (column.type === 'currency' && !isTR) || (column.type === 'progress' && isTR) ? sym : '';
      const suffixSym =
        (column.type === 'currency' && isTR) ||
        (column.type === 'progress' && !isTR) ||
        column.type === 'percent' ||
        column.type === 'rating'
          ? sym
          : '';

      const parsedNum = FilterEngine.parseNumeric(val);
      const cellPreview =
        val.trim() !== '' && !isNaN(parsedNum)
          ? formatCellStructureValue(parsedNum, column, locale)
          : null;

      return (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: theme.dom.inputBg,
              border: `1px solid ${theme.dom.inputBorder}`,
              borderRadius: 6,
              padding: '0 8px',
            }}
          >
            {prefixSym && (
              <span
                style={{
                  color: theme.dom.accentColor,
                  fontWeight: 700,
                  fontSize: 12,
                  marginRight: 6,
                  fontFamily: 'monospace',
                }}
              >
                {prefixSym}
              </span>
            )}
            <input
              ref={autoFocusRef}
              type="text"
              inputMode="decimal"
              value={val}
              onChange={(e) => {
                setVal(sanitizeNumericTyping(e.target.value));
              }}
              onBlur={() => {
                if (val.trim() !== '') {
                  const num = FilterEngine.parseNumeric(val);
                  if (!isNaN(num)) {
                    setVal(formatNumericDisplay(num, isTR));
                  }
                }
              }}
              placeholder={
                column.type === 'currency'
                  ? isTR
                    ? '15.000,47'
                    : '15,000.47'
                  : column.type === 'progress' || column.type === 'percent'
                  ? '20'
                  : placeholder
              }
              style={{
                flex: 1,
                padding: '6px 0',
                backgroundColor: 'transparent',
                color: theme.dom.inputText,
                border: 'none',
                outline: 'none',
                fontSize: 12.5,
                fontWeight: 600,
                fontFamily: theme.fontFamily,
                textAlign:
                  column.type === 'currency' || column.type === 'number' || column.type === 'percent'
                    ? 'right'
                    : 'left',
              }}
            />
            {suffixSym && (
              <span
                style={{
                  color: theme.dom.accentColor,
                  fontWeight: 700,
                  fontSize: 12,
                  marginLeft: 6,
                  fontFamily: 'monospace',
                }}
              >
                {suffixSym}
              </span>
            )}
          </div>
          {cellPreview && (
            <div
              style={{
                marginTop: 4,
                fontSize: 11,
                color: theme.dom.accentColor,
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 600,
              }}
            >
              <span>{isTR ? 'Hücre biçimi:' : 'Cell format:'}</span>
              <span style={{ fontFamily: 'monospace' }}>{cellPreview}</span>
            </div>
          )}
        </div>
      );
    }

    // 6. Default Text / Email / URL / Phone / Object Input
    return (
      <input
        ref={autoFocusRef}
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '6px 8px',
          backgroundColor: theme.dom.inputBg,
          color: theme.dom.inputText,
          border: `1px solid ${theme.dom.inputBorder}`,
          borderRadius: 6,
          outline: 'none',
          fontSize: 12,
          boxSizing: 'border-box',
        }}
      />
    );
  };

  // Compute safe horizontal position inside viewport
  const popoverWidth = isDateCol ? Math.min(336, Math.max(295, viewportWidth - 20)) : 295;
  const rawLeft = anchorRect.x + anchorRect.width - popoverWidth;
  const safeLeft = Math.max(8, Math.min(rawLeft, viewportWidth - popoverWidth - 16));

  return (
    <div
      ref={popoverRef}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') onClose();
        if (e.key === 'Enter') handleApply();
      }}
      style={{
        position: 'absolute',
        left: safeLeft,
        top: anchorRect.y + anchorRect.height + 4,
        width: popoverWidth,
        zIndex: 150,
        backgroundColor: theme.dom.popoverBg,
        color: theme.dom.popoverText,
        border: `1px solid ${theme.dom.popoverBorder}`,
        borderRadius: 10,
        boxShadow: theme.dom.popoverShadow,
        backdropFilter: theme.dom.glassBackdrop,
        fontFamily: theme.fontFamily,
        fontSize: 12,
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Header Title & Quick Sort/Group Actions */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: `1px solid ${theme.dom.popoverBorder}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 12 }}>{column.title}</span>
          <span
            style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 4,
              backgroundColor: theme.dom.badgeBg,
              color: theme.dom.badgeText,
              textTransform: 'uppercase',
              fontFamily: 'monospace',
            }}
          >
            {column.type}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {column.sortable !== false && onSort && (
            <>
              <button
                type="button"
                onClick={() => {
                  onSort(false);
                  onClose();
                }}
                style={{
                  flex: 1,
                  padding: '4px 6px',
                  fontSize: 11,
                  borderRadius: 5,
                  border: `1px solid ${theme.dom.popoverBorder}`,
                  backgroundColor: 'transparent',
                  color: theme.dom.popoverText,
                  cursor: 'pointer',
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <MaterialIcon name="arrow_upward" size={13} color={theme.dom.accentColor} />
                <span>{isTR ? 'Artan Sırala' : 'Sort A → Z'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSort(true);
                  onClose();
                }}
                style={{
                  flex: 1,
                  padding: '4px 6px',
                  fontSize: 11,
                  borderRadius: 5,
                  border: `1px solid ${theme.dom.popoverBorder}`,
                  backgroundColor: 'transparent',
                  color: theme.dom.popoverText,
                  cursor: 'pointer',
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <MaterialIcon name="arrow_downward" size={13} color={theme.dom.accentColor} />
                <span>{isTR ? 'Azalan Sırala' : 'Sort Z → A'}</span>
              </button>
            </>
          )}
          {column.groupable !== false &&
            column.type !== 'sparkline' &&
            column.type !== 'action' &&
            onToggleGroup && (
              <button
                type="button"
                onClick={() => {
                  onToggleGroup();
                  onClose();
                }}
                style={{
                  padding: '4px 8px',
                  fontSize: 11,
                  borderRadius: 5,
                  border: `1px solid ${theme.dom.popoverBorder}`,
                  backgroundColor: isGrouped ? theme.dom.accentColor : 'transparent',
                  color: isGrouped ? '#FFFFFF' : theme.dom.popoverText,
                  cursor: 'pointer',
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <MaterialIcon
                  name="workspaces"
                  size={13}
                  color={isGrouped ? '#FFFFFF' : theme.dom.accentColor}
                />
                <span>
                  {isGrouped ? (isTR ? 'Grubu Kaldır' : 'Ungroup') : isTR ? 'Grupla' : 'Group'}
                </span>
              </button>
            )}
        </div>
      </div>

      {/* Mode Tabs: Values (Yıl > Ay > Gün for Dates) vs Condition (Tarih Aralığı / Between for Dates) */}
      <div
        style={{
          display: 'flex',
          borderBottom: `1px solid ${theme.dom.popoverBorder}`,
          backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        }}
      >
        <button
          type="button"
          onClick={() => setTab('values')}
          style={{
            flex: 1,
            padding: '7px 4px',
            fontSize: 11,
            fontWeight: tab === 'values' ? 700 : 500,
            border: 'none',
            borderBottom:
              tab === 'values' ? `2px solid ${theme.dom.accentColor}` : '2px solid transparent',
            backgroundColor: 'transparent',
            color: tab === 'values' ? theme.dom.accentColor : theme.dom.popoverText,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <MaterialIcon
            name={isDateCol ? 'account_tree' : 'checklist'}
            size={14}
            color={tab === 'values' ? theme.dom.accentColor : '#8E8E93'}
          />
          <span>
            {isDateCol
              ? isTR
                ? `Yıl > Ay > Gün (${selectedSet.size}/${allItems.length})`
                : `Year > Month > Day (${selectedSet.size}/${allItems.length})`
              : isTR
              ? `Değer Listesi (${selectedSet.size}/${allItems.length})`
              : `Value List (${selectedSet.size}/${allItems.length})`}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('condition');
            if (isDateCol && !activeFilter?.operator) {
              setOperator('between');
            }
          }}
          style={{
            flex: 1,
            padding: '7px 4px',
            fontSize: 11,
            fontWeight: tab === 'condition' ? 700 : 500,
            border: 'none',
            borderBottom:
              tab === 'condition' ? `2px solid ${theme.dom.accentColor}` : '2px solid transparent',
            backgroundColor: 'transparent',
            color: tab === 'condition' ? theme.dom.accentColor : theme.dom.popoverText,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <MaterialIcon
            name={isDateCol ? 'date_range' : 'filter_alt'}
            size={14}
            color={tab === 'condition' ? theme.dom.accentColor : '#8E8E93'}
          />
          <span>
            {isDateCol
              ? isTR
                ? 'Tarih Aralığı (Between)'
                : 'Date Range (Between)'
              : isTR
              ? 'Koşul Filtresi'
              : 'Condition Rule'}
          </span>
        </button>
      </div>

      {tab === 'values' ? (
        <>
          {/* Inline Between Date Range Selector for Date / DateTime Columns */}
          {isDateCol && (
            <div
              style={{
                padding: '8px 12px',
                borderBottom: `1px solid ${theme.dom.popoverBorder}`,
                backgroundColor: theme.isDark
                  ? 'rgba(10, 132, 255, 0.06)'
                  : 'rgba(0, 122, 255, 0.035)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: theme.dom.accentColor,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <MaterialIcon name="date_range" size={14} color={theme.dom.accentColor} />
                  <span>{isTR ? 'Tarih Aralığı (Between)' : 'Date Range (Between)'}</span>
                </span>
                {(condVal1 || condVal2) && (
                  <button
                    type="button"
                    onClick={() => applyDateRangeToTree('', '', 'between')}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#EF4444',
                      fontSize: 10.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    <MaterialIcon name="close" size={13} color="#EF4444" />
                    <span>{isTR ? 'Aralığı Sıfırla' : 'Reset Range'}</span>
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="date"
                  value={condVal1}
                  onChange={(e) => applyDateRangeToTree(e.target.value, condVal2, 'between')}
                  title={isTR ? 'Başlangıç Tarihi' : 'Start Date'}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '4px 6px',
                    backgroundColor: theme.dom.inputBg,
                    color: theme.dom.inputText,
                    border: `1px solid ${
                      condVal1 ? theme.dom.accentColor : theme.dom.inputBorder
                    }`,
                    borderRadius: 5,
                    outline: 'none',
                    fontSize: 11,
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                  }}
                />
                <MaterialIcon name="arrow_forward" size={14} color="#8E8E93" />
                <input
                  type="date"
                  value={condVal2}
                  onChange={(e) => applyDateRangeToTree(condVal1, e.target.value, 'between')}
                  title={isTR ? 'Bitiş Tarihi' : 'End Date'}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '4px 6px',
                    backgroundColor: theme.dom.inputBg,
                    color: theme.dom.inputText,
                    border: `1px solid ${
                      condVal2 ? theme.dom.accentColor : theme.dom.inputBorder
                    }`,
                    borderRadius: 5,
                    outline: 'none',
                    fontSize: 11,
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}

          {/* Search Input */}
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${theme.dom.popoverBorder}` }}>
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => {
                const nextQuery = e.target.value;
                setSearch(nextQuery);
                setListScrollTop(0);
                const q = nextQuery.toLowerCase().trim();
                if (q) {
                  if (isDateCol) {
                    const matched: any[] = [];
                    for (const it of allItems) {
                      if (
                        it.value === BLANK_FILTER_TOKEN ||
                        it.value === null ||
                        it.value === undefined ||
                        it.value === ''
                      ) {
                        if (locale.emptyText.toLowerCase().includes(q)) matched.push(it.value);
                        continue;
                      }
                      const p = FilterEngine.parseDateParts(it.value);
                      if (p) {
                        const mName = monthNames[p.month - 1].toLowerCase();
                        const mNumPad = String(p.month).padStart(2, '0');
                        const dNumPad = String(p.day).padStart(2, '0');
                        const dmyStr = `${dNumPad}.${mNumPad}.${p.year}`;
                        if (
                          String(p.year).includes(q) ||
                          mName.includes(q) ||
                          mNumPad.includes(q) ||
                          dNumPad.includes(q) ||
                          p.isoDate.includes(q) ||
                          dmyStr.includes(q)
                        ) {
                          matched.push(it.value);
                        }
                      } else if (String(it.value).toLowerCase().includes(q)) {
                        matched.push(it.value);
                      }
                    }
                    setSelectedSet(new Set(matched));
                  } else {
                    const matched = allItems.filter((it) => {
                      const display = formatItemLabel(it).toLowerCase();
                      return display.includes(q) || String(it.value).toLowerCase().includes(q);
                    });
                    setSelectedSet(new Set(matched.map((m) => m.value)));
                  }
                } else if (
                  activeFilter &&
                  activeFilter.mode === 'values' &&
                  activeFilter.selectedValues
                ) {
                  setSelectedSet(new Set(activeFilter.selectedValues));
                } else {
                  setSelectedSet(new Set(allItems.map((r) => r.value)));
                }
              }}
              placeholder={
                isDateCol
                  ? isTR
                    ? 'Yıl, ay veya gün ara (ör. 2026, Haziran)...'
                    : 'Search year, month or day (e.g. 2026, June)...'
                  : locale.searchValuesPlaceholder
              }
              style={{
                width: '100%',
                padding: '6px 8px',
                backgroundColor: theme.dom.inputBg,
                color: theme.dom.inputText,
                border: `1px solid ${theme.dom.inputBorder}`,
                borderRadius: 5,
                outline: 'none',
                fontSize: 12,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Select All Bar + Expand/Collapse All for Date Tree */}
          <div
            onClick={toggleAllVisible}
            style={{
              padding: '7px 12px',
              borderBottom: `1px solid ${theme.dom.popoverBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              fontWeight: 600,
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={areAllVisibleChecked}
                ref={(el) => {
                  if (el) el.indeterminate = isIndeterminate;
                }}
                onChange={() => {}}
                style={{
                  cursor: 'pointer',
                  accentColor: theme.dom.accentColor,
                  width: 14,
                  height: 14,
                }}
              />
              <span>
                {search.trim()
                  ? isTR
                    ? '(Arama Sonuçlarını Seç)'
                    : '(Select Search Results)'
                  : locale.selectAll}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isDateCol && dateHierarchy.years.length > 0 && (
                <button
                  type="button"
                  onClick={toggleExpandCollapseAllDates}
                  style={{
                    padding: '2px 6px',
                    fontSize: 10,
                    fontWeight: 600,
                    borderRadius: 4,
                    border: `1px solid ${theme.dom.popoverBorder}`,
                    backgroundColor: 'transparent',
                    color: theme.dom.accentColor,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <MaterialIcon
                    name={areAllDateNodesExpanded ? 'unfold_less' : 'unfold_more'}
                    size={13}
                    color={theme.dom.accentColor}
                  />
                  <span>
                    {areAllDateNodesExpanded
                      ? isTR
                        ? 'Daralt'
                        : 'Collapse'
                      : isTR
                      ? 'Tümünü Aç'
                      : 'Expand All'}
                  </span>
                </button>
              )}
              <span style={{ fontSize: 10, color: '#8E8E93' }}>
                {selectedSet.size} / {allItems.length}
              </span>
            </div>
          </div>

          {/* Virtualized Distinct Values or Semantic Year > Month > Day Tree */}
          <div
            onScroll={(e) => setListScrollTop(e.currentTarget.scrollTop)}
            style={{ height: 210, overflowY: 'auto', padding: '4px 6px', position: 'relative' }}
          >
            {loading ? (
              <div style={{ padding: '12px 8px', color: '#8E8E93' }}>{locale.loading}</div>
            ) : isDateCol ? (
              flatDateTreeRows.length === 0 ? (
                <div style={{ padding: '12px 8px', color: '#8E8E93' }}>{locale.noMatches}</div>
              ) : (
                (() => {
                  const ITEM_H = 28;
                  const totalH = flatDateTreeRows.length * ITEM_H;
                  const startIdx = Math.max(0, Math.floor(listScrollTop / ITEM_H) - 3);
                  const endIdx = Math.min(
                    flatDateTreeRows.length - 1,
                    Math.ceil((listScrollTop + 210) / ITEM_H) + 3
                  );
                  const slice = flatDateTreeRows.slice(startIdx, endIdx + 1);

                  return (
                    <div style={{ height: totalH, position: 'relative' }}>
                      {slice.map((row, idx) => {
                        const realIdx = startIdx + idx;
                        const topPos = realIdx * ITEM_H;

                        if (row.kind === 'blank' || row.kind === 'other') {
                          const it = row.item;
                          const isChecked = selectedSet.has(it.value);
                          return (
                            <div
                              key={row.key}
                              onClick={() => toggleSingleItem(it.value)}
                              style={{
                                position: 'absolute',
                                top: topPos,
                                left: 0,
                                right: 0,
                                height: ITEM_H - 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0 8px',
                                borderRadius: 5,
                                cursor: 'pointer',
                                backgroundColor: isChecked
                                  ? theme.isDark
                                    ? 'rgba(10, 132, 255, 0.12)'
                                    : 'rgba(0, 122, 255, 0.06)'
                                  : 'transparent',
                                boxSizing: 'border-box',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  style={{
                                    cursor: 'pointer',
                                    accentColor: theme.dom.accentColor,
                                    width: 14,
                                    height: 14,
                                  }}
                                />
                                <span style={{ fontWeight: isChecked ? 600 : 400 }}>
                                  {formatItemLabel(it)}
                                </span>
                              </div>
                              {it.count !== undefined && (
                                <span style={{ color: '#8E8E93', fontSize: 11 }}>{it.count}</span>
                              )}
                            </div>
                          );
                        }

                        if (row.kind === 'year') {
                          const isChecked =
                            row.rawValues.length > 0 &&
                            row.rawValues.every((v) => selectedSet.has(v));
                          const isIndet =
                            !isChecked && row.rawValues.some((v) => selectedSet.has(v));

                          return (
                            <div
                              key={row.key}
                              onClick={() => toggleExpandYear(row.year)}
                              style={{
                                position: 'absolute',
                                top: topPos,
                                left: 0,
                                right: 0,
                                height: ITEM_H - 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0 8px 0 6px',
                                borderRadius: 6,
                                cursor: 'pointer',
                                backgroundColor: isChecked
                                  ? theme.isDark
                                    ? 'rgba(10, 132, 255, 0.14)'
                                    : 'rgba(0, 122, 255, 0.08)'
                                  : 'transparent',
                                boxSizing: 'border-box',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span
                                  style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: 4,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: row.expanded
                                      ? theme.isDark
                                        ? 'rgba(10, 132, 255, 0.22)'
                                        : 'rgba(0, 122, 255, 0.14)'
                                      : theme.isDark
                                      ? 'rgba(255, 255, 255, 0.07)'
                                      : 'rgba(0, 0, 0, 0.05)',
                                    flexShrink: 0,
                                  }}
                                >
                                  <MaterialIcon
                                    name={row.expanded ? 'expand_more' : 'chevron_right'}
                                    size={16}
                                    color={theme.dom.accentColor}
                                  />
                                </span>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  ref={(el) => {
                                    if (el) el.indeterminate = isIndet;
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleGroupValues(row.rawValues);
                                  }}
                                  onChange={() => {}}
                                  style={{
                                    cursor: 'pointer',
                                    accentColor: theme.dom.accentColor,
                                    width: 14,
                                    height: 14,
                                  }}
                                />
                                <MaterialIcon
                                  name="calendar_today"
                                  size={13}
                                  color={theme.dom.accentColor}
                                />
                                <span style={{ fontWeight: 700, fontSize: 12.5 }}>{row.year}</span>
                                <span
                                  style={{
                                    fontSize: 9.5,
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                    backgroundColor: theme.dom.badgeBg,
                                    color: theme.dom.badgeText,
                                    fontWeight: 600,
                                  }}
                                >
                                  {isTR ? 'YIL' : 'YEAR'}
                                </span>
                              </div>
                              <span style={{ color: '#8E8E93', fontSize: 11, fontWeight: 600 }}>
                                {row.count}
                              </span>
                            </div>
                          );
                        }

                        if (row.kind === 'month') {
                          const isChecked =
                            row.rawValues.length > 0 &&
                            row.rawValues.every((v) => selectedSet.has(v));
                          const isIndet =
                            !isChecked && row.rawValues.some((v) => selectedSet.has(v));
                          const mName = monthNames[row.month - 1];
                          const mNumStr = String(row.month).padStart(2, '0');

                          return (
                            <div
                              key={row.key}
                              onClick={() => toggleExpandMonth(row.monthKey)}
                              style={{
                                position: 'absolute',
                                top: topPos,
                                left: 0,
                                right: 0,
                                height: ITEM_H - 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0 8px 0 22px',
                                borderRadius: 6,
                                cursor: 'pointer',
                                backgroundColor: isChecked
                                  ? theme.isDark
                                    ? 'rgba(10, 132, 255, 0.1)'
                                    : 'rgba(0, 122, 255, 0.05)'
                                  : 'transparent',
                                boxSizing: 'border-box',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span
                                  style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: 4,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: row.expanded
                                      ? theme.isDark
                                        ? 'rgba(10, 132, 255, 0.18)'
                                        : 'rgba(0, 122, 255, 0.12)'
                                      : theme.isDark
                                      ? 'rgba(255, 255, 255, 0.06)'
                                      : 'rgba(0, 0, 0, 0.04)',
                                    flexShrink: 0,
                                  }}
                                >
                                  <MaterialIcon
                                    name={row.expanded ? 'expand_more' : 'chevron_right'}
                                    size={15}
                                    color={row.expanded ? theme.dom.accentColor : '#8E8E93'}
                                  />
                                </span>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  ref={(el) => {
                                    if (el) el.indeterminate = isIndet;
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleGroupValues(row.rawValues);
                                  }}
                                  onChange={() => {}}
                                  style={{
                                    cursor: 'pointer',
                                    accentColor: theme.dom.accentColor,
                                    width: 14,
                                    height: 14,
                                  }}
                                />
                                <MaterialIcon
                                  name="date_range"
                                  size={13}
                                  color={isChecked ? theme.dom.accentColor : '#8E8E93'}
                                />
                                <span style={{ fontWeight: 600, fontSize: 12 }}>
                                  {mNumStr} - {mName}
                                </span>
                              </div>
                              <span style={{ color: '#8E8E93', fontSize: 11 }}>{row.count}</span>
                            </div>
                          );
                        }

                        // row.kind === 'day'
                        const isChecked =
                          row.rawValues.length > 0 &&
                          row.rawValues.every((v) => selectedSet.has(v));
                        const dayStr = String(row.day).padStart(2, '0');
                        const mNameShort = monthNames[row.month - 1];

                        return (
                          <div
                            key={row.key}
                            onClick={() => toggleGroupValues(row.rawValues)}
                            style={{
                              position: 'absolute',
                              top: topPos,
                              left: 0,
                              right: 0,
                              height: ITEM_H - 2,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0 8px 0 46px',
                              borderRadius: 6,
                              cursor: 'pointer',
                              backgroundColor: isChecked
                                ? theme.isDark
                                  ? 'rgba(10, 132, 255, 0.12)'
                                  : 'rgba(0, 122, 255, 0.06)'
                                : 'transparent',
                              boxSizing: 'border-box',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                style={{
                                  cursor: 'pointer',
                                  accentColor: theme.dom.accentColor,
                                  width: 14,
                                  height: 14,
                                }}
                              />
                              <MaterialIcon
                                name="event"
                                size={13}
                                color={isChecked ? theme.dom.accentColor : '#8E8E93'}
                              />
                              <span style={{ fontWeight: isChecked ? 700 : 500, fontSize: 12 }}>
                                {dayStr} {mNameShort}
                              </span>
                              <span
                                style={{
                                  fontSize: 10.5,
                                  color: '#8E8E93',
                                  fontFamily: 'monospace',
                                }}
                              >
                                ({FilterEngine.formatLocalizedDate(row.isoDate, locale.code)})
                              </span>
                            </div>
                            <span style={{ color: '#8E8E93', fontSize: 11 }}>{row.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )
            ) : visibleItems.length === 0 ? (
              <div style={{ padding: '12px 8px', color: '#8E8E93' }}>{locale.noMatches}</div>
            ) : (
              (() => {
                const ITEM_H = 28;
                const totalH = visibleItems.length * ITEM_H;
                const startIdx = Math.max(0, Math.floor(listScrollTop / ITEM_H) - 3);
                const endIdx = Math.min(
                  visibleItems.length - 1,
                  Math.ceil((listScrollTop + 210) / ITEM_H) + 3
                );
                const slice = visibleItems.slice(startIdx, endIdx + 1);

                return (
                  <div style={{ height: totalH, position: 'relative' }}>
                    {slice.map((it, idx) => {
                      const realIdx = startIdx + idx;
                      const isChecked = selectedSet.has(it.value);
                      const optMatch =
                        column.type === 'select' ||
                        column.type === 'dropdown' ||
                        column.type === 'lookup' ||
                        column.type === 'multiselect'
                          ? column.options?.find((o) => o.value === it.value)
                          : undefined;
                      return (
                        <div
                          key={String(it.value)}
                          onClick={() => toggleSingleItem(it.value)}
                          style={{
                            position: 'absolute',
                            top: realIdx * ITEM_H,
                            left: 0,
                            right: 0,
                            height: ITEM_H - 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0 8px',
                            borderRadius: 5,
                            cursor: 'pointer',
                            backgroundColor: isChecked
                              ? theme.isDark
                                ? 'rgba(10, 132, 255, 0.12)'
                                : 'rgba(0, 122, 255, 0.06)'
                              : 'transparent',
                            boxSizing: 'border-box',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              overflow: 'hidden',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              style={{
                                cursor: 'pointer',
                                accentColor: theme.dom.accentColor,
                                width: 14,
                                height: 14,
                                flexShrink: 0,
                              }}
                            />
                            {optMatch && (
                              <span
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor: theme.isDark
                                    ? optMatch.darkFg || '#60A5FA'
                                    : optMatch.fg || '#2563EB',
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            {column.type === 'color' && typeof it.value === 'string' && (
                              <span
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: 3,
                                  backgroundColor: it.value,
                                  border: '1px solid rgba(255,255,255,0.25)',
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            <span
                              style={{
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                fontWeight: isChecked ? 600 : 400,
                              }}
                            >
                              {formatItemLabel(it)}
                            </span>
                          </div>
                          {it.count !== undefined && (
                            <span
                              style={{
                                color: '#8E8E93',
                                fontSize: 11,
                                marginLeft: 6,
                                flexShrink: 0,
                              }}
                            >
                              {it.count}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>
        </>
      ) : (
        /* Condition / Date Range (Between) Filter Tab */
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: '#8E8E93', marginBottom: 4 }}>
              {isDateCol
                ? isTR
                  ? 'Tarih Filtre Modu'
                  : 'Date Filter Mode'
                : isTR
                ? 'Operatör'
                : 'Operator'}
            </label>
            <select
              value={operator}
              onChange={(e) => {
                const nextOp = e.target.value as FilterOperation;
                if (isDateCol) {
                  applyDateRangeToTree(condVal1, condVal2, nextOp);
                } else {
                  syncConditionToSelection(condVal1, condVal2, nextOp);
                }
              }}
              style={{
                width: '100%',
                padding: '6px 8px',
                backgroundColor: theme.dom.inputBg,
                color: theme.dom.inputText,
                border: `1px solid ${theme.dom.inputBorder}`,
                borderRadius: 6,
                outline: 'none',
                fontSize: 12,
              }}
            >
              {isDateCol ? (
                <>
                  <option value="between">
                    {isTR ? 'Tarih Aralığı (Between)' : 'Date Range (Between)'}
                  </option>
                  <option value=">=">
                    {isTR ? 'Başlangıç Tarihi ve Sonrası (≥)' : 'On or After (≥)'}
                  </option>
                  <option value="<=">
                    {isTR ? 'Bitiş Tarihi ve Öncesi (≤)' : 'On or Before (≤)'}
                  </option>
                  <option value="=">{isTR ? 'Tam Tarih Eşittir (=)' : 'Exact Date (=)'}</option>
                  <option value="<>">
                    {isTR ? 'Bu Tarih Hariç (≠)' : 'Does Not Equal (≠)'}
                  </option>
                  <option value=">">{isTR ? 'Bu Tarihten Sonra (>)' : 'After (>)'}</option>
                  <option value="<">{isTR ? 'Bu Tarihten Önce (<)' : 'Before (<)'}</option>
                </>
              ) : isNumericCol ? (
                <>
                  <option value="<">{isTR ? 'Küçüktür (<)' : 'Less than (<)'}</option>
                  <option value="<=">{isTR ? 'Küçük veya Eşit (≤)' : 'Less or equal (≤)'}</option>
                  <option value=">">{isTR ? 'Büyüktür (>)' : 'Greater than (>)'}</option>
                  <option value=">=">{isTR ? 'Büyük veya Eşit (≥)' : 'Greater or equal (≥)'}</option>
                  <option value="=">{isTR ? 'Eşittir (=)' : 'Equals (=)'}</option>
                  <option value="<>">{isTR ? 'Eşit Değildir (≠)' : 'Does not equal (≠)'}</option>
                  <option value="between">{isTR ? 'Arasında (Between)' : 'Between'}</option>
                  <option value="contains">{isTR ? 'İçerir (Contains)' : 'Contains'}</option>
                </>
              ) : (
                <>
                  <option value="contains">{isTR ? 'İçerir (Contains)' : 'Contains'}</option>
                  <option value="notcontains">
                    {isTR ? 'İçermez (Does not contain)' : 'Does not contain'}
                  </option>
                  <option value="=">{isTR ? 'Eşittir (=)' : 'Equals (=)'}</option>
                  <option value="<>">{isTR ? 'Eşit Değildir (≠)' : 'Does not equal (≠)'}</option>
                  <option value="startswith">{isTR ? 'İle Başlar (Starts with)' : 'Starts with'}</option>
                  <option value="endswith">{isTR ? 'İle Biter (Ends with)' : 'Ends with'}</option>
                  <option value=">">{isTR ? 'Büyüktür (>)' : 'Greater than (>)'}</option>
                  <option value=">=">{isTR ? 'Büyük veya Eşit (≥)' : 'Greater or equal (≥)'}</option>
                  <option value="<">{isTR ? 'Küçüktür (<)' : 'Less than (<)'}</option>
                  <option value="<=">{isTR ? 'Küçük veya Eşit (≤)' : 'Less or equal (≤)'}</option>
                  <option value="between">{isTR ? 'Arasında (Between)' : 'Between'}</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: '#8E8E93', marginBottom: 4 }}>
              {operator === 'between'
                ? isDateCol
                  ? isTR
                    ? 'Başlangıç Tarihi (Yıl - Ay - Gün)'
                    : 'Start Date (YYYY-MM-DD)'
                  : isTR
                  ? 'Başlangıç Değeri'
                  : 'Minimum Value'
                : isDateCol
                ? isTR
                  ? 'Tarih (Yıl - Ay - Gün)'
                  : 'Date (YYYY-MM-DD)'
                : isTR
                ? 'Değer'
                : 'Value'}
            </label>
            {renderStructuredConditionInput(
              condVal1,
              (v) => {
                if (isDateCol) applyDateRangeToTree(v, condVal2, operator);
                else syncConditionToSelection(v, condVal2, operator);
              },
              isTR ? 'Değer girin...' : 'Enter value...',
              condInputRef
            )}
          </div>

          {operator === 'between' && (
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#8E8E93', marginBottom: 4 }}>
                {isDateCol
                  ? isTR
                    ? 'Bitiş Tarihi (Yıl - Ay - Gün)'
                    : 'End Date (YYYY-MM-DD)'
                  : isTR
                  ? 'Bitiş Değeri'
                  : 'Maximum Value'}
              </label>
              {renderStructuredConditionInput(
                condVal2,
                (v) => {
                  if (isDateCol) applyDateRangeToTree(condVal1, v, operator);
                  else syncConditionToSelection(condVal1, v, operator);
                },
                isTR ? 'Maksimum değer...' : 'Enter max value...'
              )}
            </div>
          )}

          {/* Quick Numeric Threshold Presets */}
          {isNumericCol && numericColumnStats && (
            <div>
              <label style={{ display: 'block', fontSize: 10.5, color: '#8E8E93', marginBottom: 5 }}>
                {isTR ? 'Hızlı Eşik Seçimi' : 'Quick Threshold Presets'}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {[
                  ...(numericColumnStats.hasNegative
                    ? [
                        {
                          id: 'pos',
                          label: isTR ? 'Pozitif (> 0)' : 'Positive (> 0)',
                          op: '>' as FilterOperation,
                          v1: '0',
                          v2: '',
                        },
                        {
                          id: 'neg',
                          label: isTR ? 'Negatif (< 0)' : 'Negative (< 0)',
                          op: '<' as FilterOperation,
                          v1: '0',
                          v2: '',
                        },
                      ]
                    : []),
                  {
                    id: 'leAvg',
                    label: isTR
                      ? `≤ Ort. (${formatCellStructureValue(numericColumnStats.avg, column, locale)})`
                      : `≤ Avg (${formatCellStructureValue(numericColumnStats.avg, column, locale)})`,
                    op: '<=' as FilterOperation,
                    v1: formatNumericDisplay(numericColumnStats.avg, isTR),
                    v2: '',
                  },
                  {
                    id: 'geAvg',
                    label: isTR
                      ? `≥ Ort. (${formatCellStructureValue(numericColumnStats.avg, column, locale)})`
                      : `≥ Avg (${formatCellStructureValue(numericColumnStats.avg, column, locale)})`,
                    op: '>=' as FilterOperation,
                    v1: formatNumericDisplay(numericColumnStats.avg, isTR),
                    v2: '',
                  },
                  {
                    id: 'minMax',
                    label: isTR
                      ? `Min → Maks (${formatNumericDisplay(numericColumnStats.min, isTR)} – ${formatNumericDisplay(numericColumnStats.max, isTR)})`
                      : `Min → Max (${formatNumericDisplay(numericColumnStats.min, isTR)} – ${formatNumericDisplay(numericColumnStats.max, isTR)})`,
                    op: 'between' as FilterOperation,
                    v1: formatNumericDisplay(numericColumnStats.min, isTR),
                    v2: formatNumericDisplay(numericColumnStats.max, isTR),
                  },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => syncConditionToSelection(preset.v1, preset.v2, preset.op)}
                    style={{
                      padding: '4px 8px',
                      fontSize: 10.5,
                      fontWeight: 600,
                      borderRadius: 5,
                      border: `1px solid ${theme.dom.popoverBorder}`,
                      backgroundColor: theme.isDark
                        ? 'rgba(255,255,255,0.04)'
                        : 'rgba(0,0,0,0.03)',
                      color: theme.dom.popoverText,
                      cursor: 'pointer',
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Semantic Date Range Presets */}
          {isDateCol && (
            <div>
              <label style={{ display: 'block', fontSize: 10.5, color: '#8E8E93', marginBottom: 5 }}>
                {isTR ? 'Hızlı Tarih Aralığı Seçimi' : 'Quick Date Range Presets'}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {[
                  { id: 'today' as const, label: isTR ? 'Bugün' : 'Today' },
                  { id: 'last7' as const, label: isTR ? 'Son 7 Gün' : 'Last 7 Days' },
                  { id: 'last30' as const, label: isTR ? 'Son 30 Gün' : 'Last 30 Days' },
                  { id: 'thisMonth' as const, label: isTR ? 'Bu Ay' : 'This Month' },
                  { id: 'thisYear' as const, label: isTR ? 'Bu Yıl' : 'This Year' },
                  { id: 'lastYear' as const, label: isTR ? 'Geçen Yıl' : 'Last Year' },
                  ...(dateHierarchy.minIsoDate && dateHierarchy.maxIsoDate
                    ? [
                        {
                          id: 'fullRange' as const,
                          label: isTR
                            ? `Tüm Veri (${FilterEngine.formatLocalizedDate(dateHierarchy.minIsoDate, locale.code)} → ${FilterEngine.formatLocalizedDate(dateHierarchy.maxIsoDate, locale.code)})`
                            : `Full Data (${FilterEngine.formatLocalizedDate(dateHierarchy.minIsoDate, locale.code)} → ${FilterEngine.formatLocalizedDate(dateHierarchy.maxIsoDate, locale.code)})`,
                        },
                      ]
                    : []),
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyQuickDatePreset(p.id)}
                    style={{
                      padding: '4px 8px',
                      fontSize: 10.5,
                      fontWeight: 600,
                      borderRadius: 5,
                      border: `1px solid ${theme.dom.popoverBorder}`,
                      backgroundColor: theme.isDark
                        ? 'rgba(255,255,255,0.04)'
                        : 'rgba(0,0,0,0.03)',
                      color: theme.dom.popoverText,
                      cursor: 'pointer',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live Matching Rows Feedback */}
          {conditionMatchCount && (
            <div
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                backgroundColor:
                  conditionMatchCount.matched > 0
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'rgba(245, 158, 11, 0.14)',
                color: conditionMatchCount.matched > 0 ? '#10B981' : '#F59E0B',
                fontSize: 11.5,
                fontWeight: 600,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{isTR ? 'Eşleşen Kayıt:' : 'Matching Rows:'}</span>
              <span>
                {conditionMatchCount.matched.toLocaleString(locale.code)} /{' '}
                {conditionMatchCount.total.toLocaleString(locale.code)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Footer Buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          borderTop: `1px solid ${theme.dom.popoverBorder}`,
          backgroundColor: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
        }}
      >
        <button
          type="button"
          onClick={handleClear}
          style={{
            padding: '5px 10px',
            backgroundColor: 'transparent',
            color: theme.dom.popoverText,
            border: `1px solid ${theme.dom.popoverBorder}`,
            borderRadius: 5,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {locale.clear}
        </button>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '5px 10px',
              backgroundColor: 'transparent',
              color: '#8E8E93',
              border: 'none',
              borderRadius: 5,
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            {isTR ? 'İptal' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleApply}
            style={{
              padding: '5px 14px',
              backgroundColor: theme.dom.accentColor,
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 5,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 11,
            }}
          >
            {locale.apply}
          </button>
        </div>
      </div>
    </div>
  );
};
