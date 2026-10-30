import { ColumnDef, ColumnId } from '../types/grid';
import { IDataStore } from '../types/store';
import { IGridThemeTokens } from '../theme/IGridTheme';
import { ColumnTypeRegistry } from '../columns/ColumnTypeRegistry';

export interface AutoSizeOptions {
  /** Maximum number of data rows to sample for text measurements (default: 100) */
  sampleRows?: number;
  /** Horizontal cell padding in pixels to add to content width (default: 24) */
  padding?: number;
  /** Global fallback minimum width if column.minWidth is not specified (default: 50) */
  minWidth?: number;
  /** Global fallback maximum width if column.maxWidth is not specified (default: 600) */
  maxWidth?: number;
}

let sharedMeasureContext: CanvasRenderingContext2D | null = null;

function getSharedMeasureContext(): CanvasRenderingContext2D | null {
  if (sharedMeasureContext) return sharedMeasureContext;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    sharedMeasureContext = canvas.getContext('2d');
  }
  return sharedMeasureContext;
}

/**
 * Enterprise Column Manager:
 * Handles column ordering, visibility filtering, and mathematical Best-Fit (Auto-Sizing).
 */
export class ColumnManager {
  /**
   * Mathematically calculates the optimal width for a column by measuring the
   * header text and sample cell contents on an HTML5 canvas context.
   */
  public static calculateBestFitWidth(
    column: ColumnDef,
    store: IDataStore,
    theme: IGridThemeTokens,
    ctx?: CanvasRenderingContext2D | null,
    options: AutoSizeOptions = {}
  ): number {
    const measureCtx = ctx || getSharedMeasureContext();
    const sampleRows = options.sampleRows ?? 100;
    const padding = options.padding ?? 24;
    const fallbackMin = options.minWidth ?? 50;
    const fallbackMax = options.maxWidth ?? 650;

    const minW = column.minWidth ?? fallbackMin;
    const maxW = column.maxWidth ?? fallbackMax;

    if (!measureCtx) {
      // Headless fallback
      return Math.max(minW, Math.min(maxW, column.width || 120));
    }

    measureCtx.save();

    // 1. Measure Header Title & Action Badges
    const headerFont = `600 ${theme.headerFontSize || 13}px ${theme.fontFamily || 'sans-serif'}`;
    measureCtx.font = headerFont;

    const headerTitle =
      typeof column.title === 'string' && column.title.trim() !== ''
        ? column.title
        : column.id === 'constructor'
        ? 'Constructor'
        : String(column.id || '');

    const headerTextWidth = measureCtx.measureText(headerTitle).width;
    const isSortable = column.sortable !== false;
    const isFilterable =
      column.filterable !== false && column.type !== 'sparkline' && column.type !== 'action';

    const headerRightReserved = (isFilterable ? 28 : 8) + (isSortable ? 18 : 0);
    const headerRequiredWidth = headerTextWidth + headerRightReserved + 16;

    // 2. Sample Data Row Cell Values
    const cellFont = `500 ${theme.fontSize || 13}px ${theme.fontFamily || 'sans-serif'}`;
    measureCtx.font = cellFont;

    const rowCount = store.getRowCount();
    const maxSample = Math.min(rowCount, sampleRows);
    let maxContentWidth = 0;

    const plugin = ColumnTypeRegistry.get(column.type);

    for (let r = 0; r < maxSample; r++) {
      const vRow = store.getViewRow(r);
      if (!vRow || vRow.type !== 'data') continue;

      const rawVal = vRow.data[column.id];
      if (rawVal === null || rawVal === undefined || rawVal === '') continue;

      let displayText = '';
      if (plugin?.formatClipboard) {
        displayText = plugin.formatClipboard(rawVal, column);
      } else if (typeof rawVal === 'object') {
        displayText = JSON.stringify(rawVal);
      } else {
        displayText = String(rawVal);
      }

      if (displayText) {
        const textWidth = measureCtx.measureText(displayText).width;
        if (textWidth > maxContentWidth) {
          maxContentWidth = textWidth;
        }
      }
    }

    measureCtx.restore();

    // 3. Mathematical Best-Fit with Padding and Clamping
    const contentRequiredWidth = maxContentWidth + padding;
    const optimalWidth = Math.max(headerRequiredWidth, contentRequiredWidth);

    return Math.round(Math.max(minW, Math.min(maxW, optimalWidth)));
  }

  /**
   * Reorders an array of columns based on an explicit order of column IDs.
   */
  public static applyColumnOrder(columns: ColumnDef[], order: ColumnId[]): ColumnDef[] {
    if (!order || order.length === 0) return [...columns];

    const orderMap = new Map<ColumnId, number>();
    order.forEach((id, idx) => orderMap.set(id, idx));

    return [...columns].sort((a, b) => {
      const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 99999;
      const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 99999;
      return idxA - idxB;
    });
  }

  /**
   * Filters out columns whose IDs are in the hidden set or have visible === false.
   */
  public static filterVisibleColumns(
    columns: ColumnDef[],
    hiddenColumns?: Set<ColumnId> | ColumnId[]
  ): ColumnDef[] {
    const hiddenSet =
      hiddenColumns instanceof Set
        ? hiddenColumns
        : new Set<ColumnId>(hiddenColumns || []);

    return columns.filter((col) => {
      if (col.id === '__selection__') return true;
      if (col.visible === false) return false;
      return !hiddenSet.has(col.id);
    });
  }
}

