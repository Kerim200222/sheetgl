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
}
