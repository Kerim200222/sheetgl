import { ColumnDef } from '../types/grid';
import { IDataStore } from '../types/store';
import { ColumnTypeRegistry } from '../columns/ColumnTypeRegistry';

export interface CsvExportOptions {
  filename?: string;
  delimiter?: string;
  bom?: boolean;
  includeHeaders?: boolean;
}

export interface ExcelExportOptions {
  filename?: string;
  sheetName?: string;
  includeHeaders?: boolean;
  author?: string;
}

export class ExportEngine {
  /**
   * Helper to trigger a browser file download using a temporary anchor element.
   */
  public static triggerDownload(blob: Blob, filename: string): void {
    if (typeof window === 'undefined') return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 200);
  }

  /**
   * Filter and order exportable columns (skips synthetic selection columns and hidden columns).
   */
  public static getExportableColumns(columns: ColumnDef[]): ColumnDef[] {
    return columns.filter((c) => c.id !== '__selection__' && c.visible !== false);
  }

  /**
   * Get formatted string value for a cell using column plugins or fallbacks.
   */
  public static getFormattedValue(col: ColumnDef, rawVal: any): string {
    if (rawVal === null || rawVal === undefined) return '';

    const plugin = ColumnTypeRegistry.get(col.type);
    if (plugin && plugin.formatClipboard) {
      try {
        return plugin.formatClipboard(rawVal, col);
      } catch {
        // Fallback to standard formatting
      }
    }

    if (typeof rawVal === 'object') {
      if (rawVal instanceof Date) {
        return rawVal.toISOString();
      }
      if (Array.isArray(rawVal)) {
        return rawVal.join(', ');
      }
      if (col.objectDisplayKey && rawVal[col.objectDisplayKey] !== undefined) {
        return String(rawVal[col.objectDisplayKey]);
      }
      return JSON.stringify(rawVal);
    }

    return String(rawVal);
  }

  /**
   * Escape CSV field following RFC 4180 rules.
   */
  public static escapeCsvField(val: string, delimiter: string = ','): string {
    const str = String(val ?? '');
    if (
      str.includes(delimiter) ||
      str.includes('"') ||
      str.includes('\n') ||
      str.includes('\r')
    ) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Escape XML entities for SpreadsheetML.
   */
  public static escapeXml(val: string): string {
    return String(val ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Generate raw CSV string from columns and data store.
   */
  public static generateCsvContent(
    columns: ColumnDef[],
    store: IDataStore,
    options: CsvExportOptions = {}
  ): string {
    const { delimiter = ',', includeHeaders = true } = options;
    const exportCols = this.getExportableColumns(columns);
    const lines: string[] = [];

    // Header row
    if (includeHeaders) {
      const headerLine = exportCols
        .map((c) => this.escapeCsvField(c.title || c.id, delimiter))
        .join(delimiter);
      lines.push(headerLine);
    }

    // Data rows
    const rowCount = store.getRowCount();
    for (let r = 0; r < rowCount; r++) {
      const vRow = store.getViewRow(r);
      if (!vRow || vRow.type === 'group') continue;

      const rowValues = exportCols.map((c) => {
        const raw = vRow.data[c.id];
        const formatted = this.getFormattedValue(c, raw);
        return this.escapeCsvField(formatted, delimiter);
      });
      lines.push(rowValues.join(delimiter));
    }

    return lines.join('\r\n');
  }

  /**
   * Export grid data as CSV and trigger browser download.
   */
  public static exportAsCsv(
    columns: ColumnDef[],
    store: IDataStore,
    filename?: string,
    options: CsvExportOptions = {}
  ): void {
    const { bom = true } = options;
    const csvContent = this.generateCsvContent(columns, store, options);
    const output = (bom ? '\uFEFF' : '') + csvContent;
    const blob = new Blob([output], { type: 'text/csv;charset=utf-8;' });
    const defaultFilename = `sheetgl_export_${new Date().toISOString().slice(0, 10)}.csv`;
    const targetFilename =
      typeof filename === 'string' && filename.trim()
        ? filename.trim()
        : typeof options.filename === 'string' && options.filename.trim()
        ? options.filename.trim()
        : defaultFilename;

    this.triggerDownload(blob, targetFilename);
  }

  /**
   * Generate Microsoft Office SpreadsheetML (2003 XML) string from columns and data store.
   */
  public static generateExcelXml(
    columns: ColumnDef[],
    store: IDataStore,
    options: ExcelExportOptions = {}
  ): string {
    const { sheetName = 'Sheet1', includeHeaders = true, author = 'SheetGL' } = options;
    const exportCols = this.getExportableColumns(columns);
    const rowCount = store.getRowCount();

    // Map column definitions to XML <Column ss:Width="..."/>
    const colXml = exportCols
      .map((c) => {
        const ptWidth = Math.max(40, Math.round((c.width || 100) * 0.75));
        return `   <Column ss:Width="${ptWidth}"/>`;
      })
      .join('\n');

    // Header Row XML
    let headerRowXml = '';
    if (includeHeaders) {
      const cells = exportCols
        .map((c) => {
          const title = this.escapeXml(c.title || c.id);
          return `    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${title}</Data></Cell>`;
        })
        .join('\n');
      headerRowXml = `   <Row ss:Height="24">\n${cells}\n   </Row>\n`;
    }

    // Data Rows XML
    const rowsXml: string[] = [];
    for (let r = 0; r < rowCount; r++) {
      const vRow = store.getViewRow(r);
      if (!vRow || vRow.type === 'group') continue;

      const cells = exportCols.map((c) => {
        const raw = vRow.data[c.id];
        if (raw === null || raw === undefined || raw === '') {
          return '    <Cell ss:StyleID="Default"><Data ss:Type="String"></Data></Cell>';
        }

        const type = (c.type || '').toLowerCase();
        if (
          (type === 'number' || type === 'currency' || type === 'percent' || type === 'progress') &&
          typeof raw === 'number'
        ) {
          const styleId =
            type === 'currency'
              ? 'CurrencyStyle'
              : type === 'percent'
              ? 'PercentStyle'
              : 'NumberStyle';
          return `    <Cell ss:StyleID="${styleId}"><Data ss:Type="Number">${raw}</Data></Cell>`;
        }

        if (type === 'boolean' || typeof raw === 'boolean') {
          return `    <Cell ss:StyleID="BooleanStyle"><Data ss:Type="Boolean">${raw ? 1 : 0}</Data></Cell>`;
        }

        if ((type === 'date' || type === 'datetime') && raw) {
          try {
            const dateObj = raw instanceof Date ? raw : new Date(raw);
            if (!isNaN(dateObj.getTime())) {
              const iso = dateObj.toISOString();
              return `    <Cell ss:StyleID="DateStyle"><Data ss:Type="DateTime">${iso}</Data></Cell>`;
            }
          } catch {
            // fallback to formatted string
          }
        }

        // String representation
        const formatted = this.getFormattedValue(c, raw);
        return `    <Cell ss:StyleID="Default"><Data ss:Type="String">${this.escapeXml(formatted)}</Data></Cell>`;
      });

      rowsXml.push(`   <Row ss:Height="20">\n${cells.join('\n')}\n   </Row>`);
    }

    return `<?xml version="1.0" encoding="utf-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>${this.escapeXml(author)}</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1F2937"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#111827"/>
   <Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="NumberStyle">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
  <Style ss:ID="CurrencyStyle">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
  <Style ss:ID="PercentStyle">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="0.0%"/>
  </Style>
  <Style ss:ID="DateStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <NumberFormat ss:Format="yyyy-mm-dd"/>
  </Style>
  <Style ss:ID="BooleanStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${this.escapeXml(sheetName)}">
  <Table>
${colXml}
${headerRowXml}${rowsXml.join('\n')}
  </Table>
 </Worksheet>
</Workbook>`;
  }

  /**
   * Export grid data as native Excel SpreadsheetML file and trigger browser download.
   */
  public static exportAsExcel(
    columns: ColumnDef[],
    store: IDataStore,
    filename?: string,
    options: ExcelExportOptions = {}
  ): void {
    const xmlContent = this.generateExcelXml(columns, store, options);
    const blob = new Blob([xmlContent], {
      type: 'application/vnd.ms-excel;charset=utf-8;',
    });
    const defaultFilename = `sheetgl_export_${new Date().toISOString().slice(0, 10)}.xls`;
    const targetFilename =
      typeof filename === 'string' && filename.trim()
        ? filename.trim()
        : typeof options.filename === 'string' && options.filename.trim()
        ? options.filename.trim()
        : defaultFilename;

    this.triggerDownload(blob, targetFilename);
  }
}

