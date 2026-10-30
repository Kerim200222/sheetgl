import { SortDescriptor } from '../types/filter';
import { FilterEngine } from './FilterEngine';

export class SortEngine {
  private static collator = new Intl.Collator('tr-TR', {
    numeric: true,
    sensitivity: 'base',
  });

  public static createComparator(sortRules: SortDescriptor[]): (a: any, b: any) => number {
    if (!sortRules || sortRules.length === 0) {
      return () => 0;
    }

    return (a: any, b: any) => {
      for (const rule of sortRules) {
        let valA = a?.[rule.selector];
        let valB = b?.[rule.selector];

        if (rule.selector === 'id') {
          if (a?.legacy_id !== undefined && a?.legacy_id !== null && a?.legacy_id !== '') {
            valA = Number(a.legacy_id);
          } else if (typeof valA === 'string' && valA.includes('-') && a?.legacy_id) {
            valA = Number(a.legacy_id);
          }
          if (b?.legacy_id !== undefined && b?.legacy_id !== null && b?.legacy_id !== '') {
            valB = Number(b.legacy_id);
          } else if (typeof valB === 'string' && valB.includes('-') && b?.legacy_id) {
            valB = Number(b.legacy_id);
          }
        }

        const diff = this.compareValues(valA, valB);
        if (diff !== 0) {
          return rule.desc ? -diff : diff;
        }
      }
      return 0;
    };
  }

  public static compareValues(a: any, b: any): number {
    if (a === b) return 0;
    if (a === null || a === undefined || a === '') return 1;
    if (b === null || b === undefined || b === '') return -1;

    // Sayısal karşılaştırma
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }

    // Tarih karşılaştırması (Date veya semantik tarih string)
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }
    const dateA = FilterEngine.parseDateParts(a);
    const dateB = FilterEngine.parseDateParts(b);
    if (dateA && dateB) {
      return dateA.exactMs - dateB.exactMs;
    }

    // Boolean karşılaştırması
    if (typeof a === 'boolean' && typeof b === 'boolean') {
      return a === b ? 0 : a ? 1 : -1;
    }

    const strA =
      typeof a === 'object' && a !== null
        ? Array.isArray(a)
          ? a.join(', ')
          : JSON.stringify(a)
        : String(a);
    const strB =
      typeof b === 'object' && b !== null
        ? Array.isArray(b)
          ? b.join(', ')
          : JSON.stringify(b)
        : String(b);

    // Metin karşılaştırması (Türkçe ve doğal sayı duyarlı)
    return this.collator.compare(strA, strB);
  }
}
