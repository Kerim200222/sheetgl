import { CellCoords, CellRange } from '../types/grid';

export interface NormalizedCellRange {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}

export interface GridApi {
  /**
   * Request an asynchronous 60 FPS redraw on the next animation frame.
   */
  requestRender(): void;

  /**
   * Set the active cell and reset the selection range to this single cell.
   */
  selectCell(row: number, col: number): void;

  /**
   * Select a rectangular range of cells from (startRow, startCol) to (endRow, endCol).
   */
  selectRange(startRow: number, startCol: number, endRow: number, endCol: number): void;

  /**
   * Clear the active selection (defaults back to origin 0,0).
   */
  clearSelection(): void;

  /**
   * Select all cells across all rows and columns.
   */
  selectAll(): void;

  /**
   * Get the current active cursor cell coordinates.
   */
  getActiveCell(): CellCoords;

  /**
   * Get the current bounding box of the active selection (min/max bounds).
   */
  getSelectedRange(): NormalizedCellRange;

  // ============================================================================
  // GEOMETRY & SCROLLING API
  // ============================================================================

  /**
   * Smoothly scrolls the viewport to ensure the specified cell is visible.
   */
  ensureCellVisible(row: number, col: number): void;

  /**
   * Programmatically scrolls the grid surface to the specified top/left offsets.
   */
  scrollTo(options: { top?: number; left?: number; behavior?: ScrollBehavior }): void;

  /**
   * Get the current scroll position (top and left offsets in pixels).
   */
  getScrollPosition(): { top: number; left: number };

  /**
   * Clear all column header filters and reset filter state.
   */
  clearFilters(): Promise<void>;

  /**
   * Reset stored grid state (filters, sorting, scroll position) for the current storageKey.
   */
  resetState(): Promise<void>;

  /**
   * Programmatically change the pixel width of a column.
   */
  setColumnWidth(columnId: string, width: number): void;

  /**
   * Get the current computed pixel width of a column.
   */
  getColumnWidth(columnId: string): number | undefined;

  /**
   * Get total scrollable virtual width in pixels.
   */
  getTotalWidth(): number;

  /**
   * Get total scrollable virtual height in pixels.
   */
  getTotalHeight(): number;

  /**
   * Programmatically start editing a cell at the specified coordinates.
   */
  startEditingCell?(col: number, row: number, initialChar?: string): void;

  /**
   * Programmatically stop editing the active cell.
   */
  stopEditingCell?(cancel?: boolean): void;

  // ============================================================================
  // ADVANCED COLUMN OPERATIONS API
  // ============================================================================

  /**
   * Set column visibility (hide or show a column by ID).
   */
  setColumnVisibility?(columnId: string, visible: boolean): void;

  /**
   * Get all currently hidden column IDs.
   */
  getHiddenColumns?(): string[];

  /**
   * Set the visual ordering of columns.
   */
  setColumnOrder?(order: string[]): void;

  /**
   * Get the current visual order of column IDs.
   */
  getColumnOrder?(): string[];

  /**
   * Move/reorder a column from one position to another.
   */
  moveColumn?(sourceColId: string, targetColId: string, position?: 'before' | 'after'): void;

  /**
   * Auto-size a column to mathematically best-fit its header and cell contents.
   */
  autoSizeColumn?(columnId: string): void;

  /**
   * Auto-size all visible columns to mathematically best-fit their contents.
   */
  autoSizeAllColumns?(): void;
}
