import { IColumnTypePlugin } from '../../IColumnTypePlugin';
import { paintPdf } from './PdfPainter';

function resolvePdfUrl(rawVal: any, prefix?: string): string {
  const str = rawVal != null ? String(rawVal).trim() : '';
  if (!str) return '';
  if (/^https?:\/\//i.test(str)) return str;
  const p = prefix != null ? prefix : '/';
  if (str.startsWith('/')) return str;
  return `${p}${str}`;
}

export const PdfColumnPlugin: IColumnTypePlugin<string> = {
  type: 'pdf',
  paint: paintPdf,

  onPointerDown({ localX, column, row, rowIndex, value }) {
    const raw = value != null ? String(value).trim() : '';
    if (!raw) return { handled: false };

    const totalW = 78;
    const startX =
      column.align === 'left'
        ? 8
        : column.align === 'right'
        ? column.width - totalW - 8
        : Math.max(6, (column.width - totalW) / 2);

    const btn2X = startX + 52;
    const btn2W = 26;
    const resolvedUrl = resolvePdfUrl(raw, column.urlPrefix);

    // If clicked on button 2 (external link icon ↗)
    if (localX >= btn2X && localX <= btn2X + btn2W) {
      if (column.onPdfOpenNewTabClick) {
        column.onPdfOpenNewTabClick(resolvedUrl, row, rowIndex ?? 0);
      } else if (typeof window !== 'undefined') {
        window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
      }
      return { handled: true, shouldOpenEditor: false };
    }

    // Clicked button 1 (PDF badge) or anywhere in cell
    if (column.onPdfClick) {
      column.onPdfClick(resolvedUrl, row, rowIndex ?? 0);
      return { handled: true, shouldOpenEditor: false };
    }

    // Default: Dispatch custom event for SheetGL host to open viewer modal
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('sheetgl-open-pdf', {
          detail: {
            url: resolvedUrl,
            title: column.title,
            row,
            rowIndex,
            column,
          },
        })
      );
    }

    return { handled: true, shouldOpenEditor: false };
  },

  comparator(a, b) {
    return String(a ?? '').localeCompare(String(b ?? ''), 'tr-TR');
  },

  formatClipboard(val) {
    return String(val ?? '');
  },

  parseClipboard(text) {
    return text.trim();
  },
};
