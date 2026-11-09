// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ExportEngine,
  CsvExportOptions,
  ExcelExportOptions,
} from '../../src/datagrid/export/ExportEngine';
import { ColumnDef } from '../../src/datagrid/types/grid';
import { LocalDataStore } from '../../src/datagrid/data/LocalDataStore';
import { ColumnTypeRegistry } from '../../src/datagrid/columns/ColumnTypeRegistry';
import { IColumnTypePlugin } from '../../src/datagrid/columns/IColumnTypePlugin';

function createCol(def: Partial<ColumnDef> & { id: string }): ColumnDef {
  return {
    title: def.id,
    type: 'text',
    width: 100,
    ...def,
  };
}

describe('ExportEngine', () => {
  describe('getExportableColumns', () => {
    it('should filter out __selection__ columns', () => {
      const columns: ColumnDef[] = [
        createCol({ id: '__selection__', width: 40 }),
        createCol({ id: 'name', title: 'Full Name', width: 120 }),
      ];
      const result = ExportEngine.getExportableColumns(columns);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('name');
    });

    it('should filter out columns where visible is false', () => {
      const columns: ColumnDef[] = [
        createCol({ id: 'id', title: 'ID', visible: false }),
        createCol({ id: 'name', title: 'Full Name', visible: true }),
        createCol({ id: 'email', title: 'Email' }), // visible undefined defaults to visible
      ];
      const result = ExportEngine.getExportableColumns(columns);
      expect(result.map((c) => c.id)).toEqual(['name', 'email']);
    });

    it('should maintain column ordering and return empty array when all hidden', () => {
      expect(ExportEngine.getExportableColumns([])).toEqual([]);
      const allHidden: ColumnDef[] = [
        createCol({ id: 'a', visible: false }),
        createCol({ id: '__selection__' }),
      ];
      expect(ExportEngine.getExportableColumns(allHidden)).toEqual([]);
    });
  });

  describe('escapeCsvField', () => {
    it('should return safe alphanumeric strings unchanged', () => {
      expect(ExportEngine.escapeCsvField('John Doe')).toBe('John Doe');
      expect(ExportEngine.escapeCsvField('12345')).toBe('12345');
      expect(ExportEngine.escapeCsvField('active')).toBe('active');
    });

    it('should wrap in double quotes if value contains delimiter', () => {
      expect(ExportEngine.escapeCsvField('Istanbul, Turkey', ',')).toBe('"Istanbul, Turkey"');
      expect(ExportEngine.escapeCsvField('A;B', ';')).toBe('"A;B"');
    });

    it('should escape internal double quotes by doubling them and wrapping in quotes', () => {
      expect(ExportEngine.escapeCsvField('Hello "World"')).toBe('"Hello ""World"""');
    });

    it('should wrap in double quotes if value contains newline or carriage return', () => {
      expect(ExportEngine.escapeCsvField('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
      expect(ExportEngine.escapeCsvField('Line 1\r\nLine 2')).toBe('"Line 1\r\nLine 2"');
    });

    it('should handle null, undefined and empty strings', () => {
      expect(ExportEngine.escapeCsvField(null as any)).toBe('');
      expect(ExportEngine.escapeCsvField(undefined as any)).toBe('');
      expect(ExportEngine.escapeCsvField('')).toBe('');
    });
  });

  describe('escapeXml', () => {
    it('should escape XML entities correctly', () => {
      expect(ExportEngine.escapeXml('Tom & Jerry')).toBe('Tom &amp; Jerry');
      expect(ExportEngine.escapeXml('<tag>')).toBe('&lt;tag&gt;');
      expect(ExportEngine.escapeXml('"quote"')).toBe('&quot;quote&quot;');
      expect(ExportEngine.escapeXml("'single'")).toBe('&apos;single&apos;');
    });

    it('should escape multiple entities in a single string', () => {
      const raw = '<div class="alert" data-id=\'1\'>AT&T</div>';
      const escaped = '&lt;div class=&quot;alert&quot; data-id=&apos;1&apos;&gt;AT&amp;T&lt;/div&gt;';
      expect(ExportEngine.escapeXml(raw)).toBe(escaped);
    });

    it('should handle null, undefined and empty values', () => {
      expect(ExportEngine.escapeXml(null as any)).toBe('');
      expect(ExportEngine.escapeXml(undefined as any)).toBe('');
      expect(ExportEngine.escapeXml('')).toBe('');
    });
  });

  describe('getFormattedValue', () => {
    it('should return empty string for null and undefined', () => {
      const col = createCol({ id: 'test' });
      expect(ExportEngine.getFormattedValue(col, null)).toBe('');
      expect(ExportEngine.getFormattedValue(col, undefined)).toBe('');
    });

    it('should format Date instance as ISO string', () => {
      const col = createCol({ id: 'created_at', type: 'date' });
      const date = new Date('2026-11-09T10:00:00.000Z');
      expect(ExportEngine.getFormattedValue(col, date)).toBe('2026-11-09T10:00:00.000Z');
    });

    it('should format arrays by joining elements with comma and space', () => {
      const col = createCol({ id: 'tags' });
      expect(ExportEngine.getFormattedValue(col, ['admin', 'editor', 'user'])).toBe(
        'admin, editor, user'
      );
    });

    it('should use objectDisplayKey when configured on column', () => {
      const col = createCol({ id: 'author', objectDisplayKey: 'name' });
      const rawVal = { id: 42, name: 'İbrahim Şaar', role: 'Developer' };
      expect(ExportEngine.getFormattedValue(col, rawVal)).toBe('İbrahim Şaar');
    });

    it('should fallback to JSON.stringify for objects without objectDisplayKey', () => {
      const col = createCol({ id: 'metadata' });
      const rawVal = { theme: 'dark', zoom: 100 };
      expect(ExportEngine.getFormattedValue(col, rawVal)).toBe(JSON.stringify(rawVal));
    });

    it('should format primitives as string', () => {
      const col = createCol({ id: 'val' });
      expect(ExportEngine.getFormattedValue(col, 123.45)).toBe('123.45');
      expect(ExportEngine.getFormattedValue(col, true)).toBe('true');
      expect(ExportEngine.getFormattedValue(col, 'plain text')).toBe('plain text');
    });

    it('should use ColumnTypeRegistry plugin formatClipboard when available', () => {
      const customPlugin: IColumnTypePlugin = {
        type: 'custom_badge',
        paint: () => {},
        formatClipboard: (val) => `[BADGE: ${val}]`,
      };
      ColumnTypeRegistry.register(customPlugin);

      const col = createCol({ id: 'badge', type: 'custom_badge' });
      expect(ExportEngine.getFormattedValue(col, 'VIP')).toBe('[BADGE: VIP]');
    });

    it('should fallback to default formatting if formatClipboard throws', () => {
      const faultyPlugin: IColumnTypePlugin = {
        type: 'faulty_type',
        paint: () => {},
        formatClipboard: () => {
          throw new Error('Clipboard format error');
        },
      };
      ColumnTypeRegistry.register(faultyPlugin);

      const col = createCol({ id: 'err', type: 'faulty_type' });
      expect(ExportEngine.getFormattedValue(col, 'safe_fallback')).toBe('safe_fallback');
    });
  });

  describe('generateCsvContent', () => {
    const columns: ColumnDef[] = [
      createCol({ id: '__selection__', width: 30 }),
      createCol({ id: 'id', title: 'ID' }),
      createCol({ id: 'name', title: 'Product Name' }),
      createCol({ id: 'price', title: 'Price (USD)' }),
      createCol({ id: 'hidden_col', title: 'Hidden', visible: false }),
    ];

    const data = [
      { id: 1, name: 'MacBook Pro, 16"', price: 2499 },
      { id: 2, name: 'Magic Mouse', price: 99 },
    ];

    it('should generate complete CSV with headers and escaped rows', () => {
      const store = new LocalDataStore({ data, keyField: 'id' });
      const csv = ExportEngine.generateCsvContent(columns, store);

      const lines = csv.split('\r\n');
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe('ID,Product Name,Price (USD)');
      expect(lines[1]).toBe('1,"MacBook Pro, 16""",2499');
      expect(lines[2]).toBe('2,Magic Mouse,99');
    });

    it('should omit headers when includeHeaders is false', () => {
      const store = new LocalDataStore({ data, keyField: 'id' });
      const csv = ExportEngine.generateCsvContent(columns, store, { includeHeaders: false });

      const lines = csv.split('\r\n');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe('1,"MacBook Pro, 16""",2499');
      expect(lines[1]).toBe('2,Magic Mouse,99');
    });

    it('should support custom delimiter (semicolon)', () => {
      const store = new LocalDataStore({ data, keyField: 'id' });
      const csv = ExportEngine.generateCsvContent(columns, store, { delimiter: ';' });

      const lines = csv.split('\r\n');
      expect(lines[0]).toBe('ID;Product Name;Price (USD)');
      // Comma in name doesn't require quotes with semicolon delimiter, but internal quote does
      expect(lines[1]).toBe('1;"MacBook Pro, 16""";2499');
      expect(lines[2]).toBe('2;Magic Mouse;99');
    });

    it('should skip virtual group rows when grouped', () => {
      const customStore: any = {
        getRowCount: () => 2,
        getViewRow: (index: number) => {
          if (index === 0) return { type: 'group', groupKey: 'Tech', count: 1 };
          return { type: 'data', data: { id: 1, name: 'Laptop', price: 1000 } };
        },
      };

      const csv = ExportEngine.generateCsvContent(
        [createCol({ id: 'id', title: 'ID' }), createCol({ id: 'name', title: 'Name' })],
        customStore
      );
      const lines = csv.split('\r\n');
      expect(lines).toHaveLength(2); // 1 header + 1 data row (group skipped)
      expect(lines[1]).toBe('1,Laptop');
    });
  });

  describe('generateExcelXml', () => {
    const columns: ColumnDef[] = [
      createCol({ id: 'name', title: 'Product Name', width: 160 }),
      createCol({ id: 'price', title: 'Price', type: 'currency', width: 100 }),
      createCol({ id: 'discount', title: 'Discount', type: 'percent', width: 80 }),
      createCol({ id: 'stock', title: 'Stock', type: 'number', width: 80 }),
      createCol({ id: 'in_stock', title: 'In Stock', type: 'boolean', width: 70 }),
      createCol({ id: 'release_date', title: 'Release Date', type: 'date', width: 110 }),
    ];

    const data = [
      {
        id: 1,
        name: 'iPhone 16 Pro & Max',
        price: 1199.5,
        discount: 0.1,
        stock: 50,
        in_stock: true,
        release_date: '2026-09-20T00:00:00.000Z',
      },
      {
        id: 2,
        name: 'Empty Row',
        price: null,
        discount: undefined,
        stock: 0,
        in_stock: false,
        release_date: null,
      },
    ];

    it('should produce valid SpreadsheetML XML with styles and sheet metadata', () => {
      const store = new LocalDataStore({ data, keyField: 'id' });
      const xml = ExportEngine.generateExcelXml(columns, store, {
        sheetName: 'Products Catalog',
        author: 'SheetGL Suite',
      });

      expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
      expect(xml).toContain('<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"');
      expect(xml).toContain('<Author>SheetGL Suite</Author>');
      expect(xml).toContain('<Worksheet ss:Name="Products Catalog">');
      expect(xml).toContain('<Column ss:Width="120"/>'); // 160 * 0.75 = 120
      expect(xml).toContain('Product Name');
    });

    it('should map typed columns to appropriate SpreadsheetML styles and types', () => {
      const store = new LocalDataStore({ data, keyField: 'id' });
      const xml = ExportEngine.generateExcelXml(columns, store);

      // Currency style
      expect(xml).toContain(
        '<Cell ss:StyleID="CurrencyStyle"><Data ss:Type="Number">1199.5</Data></Cell>'
      );
      // Percent style
      expect(xml).toContain(
        '<Cell ss:StyleID="PercentStyle"><Data ss:Type="Number">0.1</Data></Cell>'
      );
      // Boolean style: true -> 1, false -> 0
      expect(xml).toContain(
        '<Cell ss:StyleID="BooleanStyle"><Data ss:Type="Boolean">1</Data></Cell>'
      );
      expect(xml).toContain(
        '<Cell ss:StyleID="BooleanStyle"><Data ss:Type="Boolean">0</Data></Cell>'
      );
      // Date style: DateTime ISO string
      expect(xml).toContain(
        '<Cell ss:StyleID="DateStyle"><Data ss:Type="DateTime">2026-09-20T00:00:00.000Z</Data></Cell>'
      );
      // XML Escaped text
      expect(xml).toContain('iPhone 16 Pro &amp; Max');
      // Null / Empty values
      expect(xml).toContain('<Cell ss:StyleID="Default"><Data ss:Type="String"></Data></Cell>');
    });

    it('should omit header row when includeHeaders is false', () => {
      const store = new LocalDataStore({ data, keyField: 'id' });
      const xml = ExportEngine.generateExcelXml(columns, store, { includeHeaders: false });
      expect(xml).not.toContain('ss:StyleID="HeaderStyle"');
    });
  });

  describe('exportAsCsv and exportAsExcel (Browser Download Trigger)', () => {
    let originalCreateObjectURL: typeof URL.createObjectURL;
    let originalRevokeObjectURL: typeof URL.revokeObjectURL;
    let appendedElements: HTMLElement[] = [];
    let clickedLinks: HTMLAnchorElement[] = [];

    beforeEach(() => {
      appendedElements = [];
      clickedLinks = [];

      originalCreateObjectURL = URL.createObjectURL;
      originalRevokeObjectURL = URL.revokeObjectURL;

      URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-uuid');
      URL.revokeObjectURL = vi.fn();

      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
        appendedElements.push(node as HTMLElement);
        return node;
      });

      vi.spyOn(document.body, 'removeChild').mockImplementation((node) => {
        const idx = appendedElements.indexOf(node as HTMLElement);
        if (idx !== -1) appendedElements.splice(idx, 1);
        return node;
      });

      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        clickedLinks.push(this);
      });
    });

    afterEach(() => {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      vi.restoreAllMocks();
    });

    it('exportAsCsv creates blob with text/csv type and triggers download', () => {
      const columns: ColumnDef[] = [createCol({ id: 'name', title: 'Name' })];
      const store = new LocalDataStore({ data: [{ id: 1, name: 'Item 1' }], keyField: 'id' });

      ExportEngine.exportAsCsv(columns, store, 'custom_report.csv');

      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      const createdBlob = (URL.createObjectURL as any).mock.calls[0][0] as Blob;
      expect(createdBlob.type).toBe('text/csv;charset=utf-8;');

      expect(clickedLinks).toHaveLength(1);
      expect(clickedLinks[0].getAttribute('download')).toBe('custom_report.csv');
      expect(clickedLinks[0].href).toBe('blob:http://localhost/mock-uuid');
    });

    it('exportAsExcel creates blob with application/vnd.ms-excel type and triggers download', () => {
      const columns: ColumnDef[] = [createCol({ id: 'name', title: 'Name' })];
      const store = new LocalDataStore({ data: [{ id: 1, name: 'Item 1' }], keyField: 'id' });

      ExportEngine.exportAsExcel(columns, store, 'custom_excel.xls');

      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      const createdBlob = (URL.createObjectURL as any).mock.calls[0][0] as Blob;
      expect(createdBlob.type).toBe('application/vnd.ms-excel;charset=utf-8;');

      expect(clickedLinks).toHaveLength(1);
      expect(clickedLinks[0].getAttribute('download')).toBe('custom_excel.xls');
    });

    it('uses fallback default filename when not provided', () => {
      const columns: ColumnDef[] = [createCol({ id: 'name', title: 'Name' })];
      const store = new LocalDataStore({ data: [], keyField: 'id' });

      ExportEngine.exportAsCsv(columns, store);
      expect(clickedLinks[0].getAttribute('download')).toMatch(/^sheetgl_export_\d{4}-\d{2}-\d{2}\.csv$/);
    });
  });
});
