// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { LocaleEngine } from '../../src/datagrid/i18n/LocaleEngine';
import { enUS } from '../../src/datagrid/i18n/locales/enUS';
import { trTR } from '../../src/datagrid/i18n/locales/trTR';
import { IGridLocale } from '../../src/datagrid/i18n/IGridLocale';

describe('LocaleEngine & Internationalization', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Standard Preset Resolution', () => {
    it('should resolve en and en-US to English locale', () => {
      expect(LocaleEngine.resolve('en')).toBe(enUS);
      expect(LocaleEngine.resolve('en-US')).toBe(enUS);
    });

    it('should resolve tr and tr-TR to Turkish locale', () => {
      expect(LocaleEngine.resolve('tr')).toBe(trTR);
      expect(LocaleEngine.resolve('tr-TR')).toBe(trTR);
    });

    it('should resolve regional Turkish codes (e.g. tr-CY) to trTR', () => {
      expect(LocaleEngine.resolve('tr-CY')).toBe(trTR);
      expect(LocaleEngine.resolve('TR')).toBe(trTR);
    });

    it('should fallback to enUS for unknown locale strings', () => {
      expect(LocaleEngine.resolve('es-ES')).toBe(enUS);
      expect(LocaleEngine.resolve('ja')).toBe(enUS);
      expect(LocaleEngine.resolve('unknown-code')).toBe(enUS);
    });
  });

  describe('Browser Locale Detection', () => {
    it('should detect Turkish browser language when navigator starts with tr', () => {
      vi.spyOn(navigator, 'language', 'get').mockReturnValue('tr-TR');
      expect(LocaleEngine.detectBrowserLocaleCode()).toBe('tr');
      expect(LocaleEngine.resolve('auto')).toBe(trTR);
      expect(LocaleEngine.resolve(undefined)).toBe(trTR);
    });

    it('should detect English browser language when navigator is not Turkish', () => {
      vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-GB');
      expect(LocaleEngine.detectBrowserLocaleCode()).toBe('en');
      expect(LocaleEngine.resolve('auto')).toBe(enUS);
      expect(LocaleEngine.resolve(undefined)).toBe(enUS);
    });
  });

  describe('Custom Locale Registration and Overrides', () => {
    it('should register and resolve a custom locale', () => {
      const deDE: IGridLocale = {
        ...enUS,
        code: 'de-DE',
        language: 'Deutsch',
        trueText: 'Wahr',
        falseText: 'Falsch',
      };

      LocaleEngine.registerLocale('de-DE', deDE);
      LocaleEngine.registerLocale('de', deDE);

      expect(LocaleEngine.resolve('de-DE')).toBe(deDE);
      expect(LocaleEngine.resolve('de')).toBe(deDE);
    });

    it('should merge partial custom locale object with enUS defaults', () => {
      const partialInput = {
        code: 'fr-FR',
        trueText: 'Vrai',
      };

      const resolved = LocaleEngine.resolve(partialInput);

      expect(resolved.code).toBe('fr-FR');
      expect(resolved.trueText).toBe('Vrai');
      // Preserved default enUS properties
      expect(resolved.falseText).toBe(enUS.falseText);
      expect(resolved.selectAll).toBe(enUS.selectAll);
    });
  });

  describe('Locale Dictionary Integrity', () => {
    it('should guarantee required translation keys exist in both enUS and trTR', () => {
      const requiredKeys: (keyof IGridLocale)[] = [
        'code',
        'language',
        'searchPlaceholder',
        'addGroup',
        'exportCsv',
        'rows',
        'columns',
        'systemTheme',
        'formulaBarPlaceholder',
        'totalRecords',
        'searchValuesPlaceholder',
        'selectAll',
        'clear',
        'apply',
        'loading',
        'noMatches',
        'emptyText',
        'trueText',
        'falseText',
        'ratingOutOf',
        'groupRecordCount',
      ];

      for (const key of requiredKeys) {
        expect(enUS[key], `Missing key '${key}' in enUS`).toBeDefined();
        expect(trTR[key], `Missing key '${key}' in trTR`).toBeDefined();
      }
    });

    it('should execute formatter functions properly', () => {
      expect(enUS.ratingOutOf(4.5)).toBe('4.5 / 5 Stars');
      expect(trTR.ratingOutOf(4.5)).toBe('4.5 / 5 Yıldız');
      expect(enUS.groupRecordCount(12)).toBe('12 records');
      expect(trTR.groupRecordCount(12)).toBe('12 kayıt');
    });
  });
});
