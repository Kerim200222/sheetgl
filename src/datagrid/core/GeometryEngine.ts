import { ColumnDef, ColumnGroupDef } from '../types/grid';
import { IDataStore } from '../types/store';
import { IGridThemeTokens } from '../theme/IGridTheme';
import { ColumnManager, AutoSizeOptions } from './ColumnManager';
import { SelectionModel } from './SelectionModel';

export interface HitTestResult {
  row: number;
  col: number;
  localX: number;
  localY: number;
  isFrozen: boolean;
  cellRect: { x: number; y: number; width: number; height: number };
}

export interface HeaderHitTestResult {
  colIndex: number;
  column: ColumnDef;
  headerX: number;
  headerWidth: number;
  isFilterIconHit: boolean;
  isGroupHeaderHit?: boolean;
  groupDef?: ColumnGroupDef;
  groupColIndices?: number[];
}

export class GeometryEngine {
  public rowHeight: number = 34;
  public baseHeaderHeight: number = 38;
  public groupHeaderHeight: number = 30;
  public headerHeight: number = 38;
  public hasColumnGroups: boolean = false;
  public columnGroups: ColumnGroupDef[] = [];
  private colToGroupMap: Map<string, ColumnGroupDef> = new Map();
  public rowNumberWidth: number = 54;
  public viewportWidth: number = typeof window !== 'undefined' ? window.innerWidth : 1200;

  public columns: ColumnDef[] = [];
  public frozenColumns: ColumnDef[] = [];
  public scrollableColumns: ColumnDef[] = [];
  public totalFrozenWidth: number = 0;
  public totalScrollableWidth: number = 0;
  public scrollableColOffsets: Float32Array = new Float32Array(0);

  constructor(
    columns: ColumnDef[] = [],
    rowHeight: number = 34,
    headerHeight: number = 38,
    columnGroups: ColumnGroupDef[] = [],
    groupHeaderHeight: number = 30
  ) {
    this.rowHeight = rowHeight;
    this.baseHeaderHeight = headerHeight;
    this.groupHeaderHeight = groupHeaderHeight;
    this.headerHeight = headerHeight;
    this.columnGroups = columnGroups;
    this.setColumns(columns);
  }

  public setColumnGroups(columnGroups: ColumnGroupDef[] = [], groupHeaderHeight?: number): void {
    this.columnGroups = columnGroups;
    if (groupHeaderHeight !== undefined && groupHeaderHeight > 0) {
      this.groupHeaderHeight = groupHeaderHeight;
    }
    this.recalculateGeometry();
  }

  public setBaseHeaderHeight(height: number): void {
    if (height > 0 && this.baseHeaderHeight !== height) {
      this.baseHeaderHeight = height;
      this.recalculateGeometry();
    }
  }

  public getColumnGroup(col: ColumnDef): ColumnGroupDef | undefined {
    return this.colToGroupMap.get(col.id);
  }

  private rebuildColumnGroupMap(): void {
    this.colToGroupMap.clear();
    const groupsById = new Map<string, ColumnGroupDef>();
    const groupsByTitle = new Map<string, ColumnGroupDef>();

    for (const g of this.columnGroups) {
      if (!g) continue;
      groupsById.set(g.id, g);
      groupsByTitle.set(g.title, g);
      if (Array.isArray(g.columnIds)) {
        for (const colId of g.columnIds) {
          this.colToGroupMap.set(colId, g);
        }
      }
    }

    for (const col of this.columns) {
      if (col.id === '__selection__') continue;
      if (col.headerGroup) {
        if (typeof col.headerGroup === 'string') {
          const existing =
            groupsById.get(col.headerGroup) || groupsByTitle.get(col.headerGroup);
          if (existing) {
            this.colToGroupMap.set(col.id, existing);
          } else {
            const inlineGroup: ColumnGroupDef = {
              id: col.headerGroup,
              title: col.headerGroup,
            };
            groupsById.set(inlineGroup.id, inlineGroup);
            groupsByTitle.set(inlineGroup.title, inlineGroup);
            this.colToGroupMap.set(col.id, inlineGroup);
          }
        } else if (typeof col.headerGroup === 'object') {
          groupsById.set(col.headerGroup.id, col.headerGroup);
          this.colToGroupMap.set(col.id, col.headerGroup);
        }
      } else if (col.groupId) {
        const existing = groupsById.get(col.groupId) || groupsByTitle.get(col.groupId);
        if (existing) {
          this.colToGroupMap.set(col.id, existing);
        } else {
          const inlineGroup: ColumnGroupDef = {
            id: col.groupId,
            title: col.groupId,
          };
          groupsById.set(inlineGroup.id, inlineGroup);
          this.colToGroupMap.set(col.id, inlineGroup);
        }
      }
    }

    this.hasColumnGroups = this.colToGroupMap.size > 0;
    this.headerHeight = this.hasColumnGroups
      ? this.baseHeaderHeight + this.groupHeaderHeight
      : this.baseHeaderHeight;
  }

  public setViewportWidth(width: number): boolean {
    if (width > 0 && Math.abs(this.viewportWidth - width) >= 2) {
      this.viewportWidth = width;
      this.recalculateGeometry();
      return true;
    }
    return false;
  }

  public setColumns(columns: ColumnDef[]): void {
    const visibleCols = columns.filter((c) => c.visible !== false);
    this.columns = [
      ...visibleCols.filter((c) => Boolean(c.pinned)),
      ...visibleCols.filter((c) => !c.pinned),
    ];
    this.recalculateGeometry();
  }

  public recalculateGeometry(): void {
    const isMobileViewport = this.viewportWidth > 0 && this.viewportWidth < 680;
    this.rowNumberWidth = isMobileViewport ? 38 : 54;

    if (isMobileViewport) {
      // On narrow mobile screens, prevent pinned columns from consuming the entire viewport width
      const maxFrozenBudget = Math.max(88, Math.floor(this.viewportWidth * 0.34));
      const nextFrozen: ColumnDef[] = [];
      const nextScrollable: ColumnDef[] = [];
      let currentFrozenW = this.rowNumberWidth;

      for (const col of this.columns) {
        if (
          col.pinned &&
          (col.id === '__selection__' || currentFrozenW + col.width <= maxFrozenBudget)
        ) {
          nextFrozen.push(col);
          currentFrozenW += col.width;
        } else {
          nextScrollable.push(col);
        }
      }
      this.frozenColumns = nextFrozen;
      this.scrollableColumns = nextScrollable;
      this.columns = [...nextFrozen, ...nextScrollable];
    } else {
      this.frozenColumns = this.columns.filter((c) => Boolean(c.pinned));
      this.scrollableColumns = this.columns.filter((c) => !c.pinned);
    }

    this.totalFrozenWidth =
      this.rowNumberWidth + this.frozenColumns.reduce((sum, c) => sum + c.width, 0);

    this.scrollableColOffsets = new Float32Array(this.scrollableColumns.length + 1);
    let acc = 0;
    for (let i = 0; i < this.scrollableColumns.length; i++) {
      this.scrollableColOffsets[i] = acc;
      acc += this.scrollableColumns[i].width;
    }
    this.scrollableColOffsets[this.scrollableColumns.length] = acc;
    this.totalScrollableWidth = acc;
    this.rebuildColumnGroupMap();
  }

  public findScrollableColIndexAtX(scrollX: number): number {
    let low = 0;
    let high = this.scrollableColumns.length - 1;
    while (low <= high) {
      const mid = (low + high) >>> 1;
      const start = this.scrollableColOffsets[mid];
      const end = this.scrollableColOffsets[mid + 1];
      if (scrollX >= start && scrollX < end) {
        return mid;
      } else if (scrollX < start) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    return Math.min(Math.max(0, low), Math.max(0, this.scrollableColumns.length - 1));
  }

  public getColumnScreenRect(
    colIndex: number,
    scrollLeft: number
  ): { x: number; width: number; isFrozen: boolean } {
    const frozenCount = this.frozenColumns.length;
    if (colIndex < frozenCount) {
      let x = this.rowNumberWidth;
      for (let i = 0; i < colIndex; i++) {
        x += this.frozenColumns[i].width;
      }
      return {
        x,
        width: this.frozenColumns[colIndex]?.width || 0,
        isFrozen: true,
      };
    } else {
      const scrollIdx = colIndex - frozenCount;
      if (scrollIdx < 0 || scrollIdx >= this.scrollableColumns.length) {
        return { x: 0, width: 0, isFrozen: false };
      }
      const x = this.totalFrozenWidth + this.scrollableColOffsets[scrollIdx] - scrollLeft;
      return {
        x,
        width: this.scrollableColumns[scrollIdx].width,
        isFrozen: false,
      };
    }
  }

  public hitTestHeader(canvasX: number, canvasY: number, scrollLeft: number): HeaderHitTestResult | null {
    if (canvasY < 0 || canvasY > this.headerHeight || canvasX <= this.rowNumberWidth) {
      return null;
    }

    let clickedCol = -1;
    let headerX = 0;
    let headerW = 0;

    // 1. Frozen Columns
    let curX = this.rowNumberWidth;
    for (let i = 0; i < this.frozenColumns.length; i++) {
      const w = this.frozenColumns[i].width;
      if (canvasX >= curX && canvasX < curX + w) {
        clickedCol = i;
        headerX = curX;
        headerW = w;
        break;
      }
      curX += w;
    }

    // 2. Scrollable Columns
    if (clickedCol === -1 && canvasX >= this.totalFrozenWidth) {
      const sx = canvasX - this.totalFrozenWidth + scrollLeft;
      if (sx >= 0 && sx < this.totalScrollableWidth && this.scrollableColumns.length > 0) {
        const sIdx = this.findScrollableColIndexAtX(sx);
        clickedCol = this.frozenColumns.length + sIdx;
        headerX = this.totalFrozenWidth + this.scrollableColOffsets[sIdx] - scrollLeft;
        headerW = this.scrollableColumns[sIdx]?.width || 100;
      }
    }

    if (clickedCol === -1 || !this.columns[clickedCol]) {
      return null;
    }

    const colDef = this.columns[clickedCol];
    const groupDef = this.getColumnGroup(colDef);
    const isGroupHeaderHit = Boolean(this.hasColumnGroups && groupDef && canvasY < this.groupHeaderHeight);

    let groupColIndices: number[] | undefined;
    if (groupDef) {
      const isFrozenPartition = clickedCol < this.frozenColumns.length;
      const minBound = isFrozenPartition ? 0 : this.frozenColumns.length;
      const maxBound = isFrozenPartition ? this.frozenColumns.length - 1 : this.columns.length - 1;
      let startIdx = clickedCol;
      let endIdx = clickedCol;
      while (
        startIdx > minBound &&
        this.getColumnGroup(this.columns[startIdx - 1])?.id === groupDef.id
      ) {
        startIdx--;
      }
      while (
        endIdx < maxBound &&
        this.getColumnGroup(this.columns[endIdx + 1])?.id === groupDef.id
      ) {
        endIdx++;
      }
      groupColIndices = [];
      for (let idx = startIdx; idx <= endIdx; idx++) {
        groupColIndices.push(idx);
      }
    }

    const isFilterable =
      !isGroupHeaderHit &&
      colDef.filterable !== false &&
      colDef.type !== 'sparkline' &&
      colDef.type !== 'action';
    const isFilterIconHit =
      isFilterable && canvasX >= headerX + headerW - 28 && canvasX <= headerX + headerW - 2;

    return {
      colIndex: clickedCol,
      column: colDef,
      headerX,
      headerWidth: headerW,
      isFilterIconHit,
      isGroupHeaderHit,
      groupDef,
      groupColIndices,
    };
  }

  public hitTestRowNumber(
    canvasX: number,
    canvasY: number,
    scrollTop: number,
    rowCount: number
  ): number | null {
    if (canvasX < 0 || canvasX > this.rowNumberWidth || canvasY <= this.headerHeight) {
      return null;
    }
    const virtualY = canvasY - this.headerHeight + scrollTop;
    const row = Math.floor(virtualY / this.rowHeight);
    if (row < 0 || row >= rowCount) return null;
    return row;
  }

  public hitTestFillHandle(
    canvasX: number,
    canvasY: number,
    scrollLeft: number,
    scrollTop: number,
    selection: SelectionModel
  ): 'corner' | 'right-duplicate' | null {
    if (canvasY <= this.headerHeight || canvasX <= this.rowNumberWidth) return null;

    const norm = selection.getNormalizedRange();
    const rTopY = this.headerHeight + norm.minRow * this.rowHeight - scrollTop;
    const rHeight = (norm.maxRow - norm.minRow + 1) * this.rowHeight;
    const leftColRect = this.getColumnScreenRect(norm.minCol, scrollLeft);
    const rightColRect = this.getColumnScreenRect(norm.maxCol, scrollLeft);

    if (!leftColRect || !rightColRect) return null;

    const rLeftX = leftColRect.x;
    const rWidth = rightColRect.x + rightColRect.width - leftColRect.x;

    // 1. Bottom-right corner fill handle (12x12 hit box)
    const fhX = rLeftX + rWidth;
    const fhY = rTopY + rHeight;
    if (Math.abs(canvasX - fhX) <= 7 && Math.abs(canvasY - fhY) <= 7) {
      return 'corner';
    }

    // 2. Right-side quick duplicate button handle (centered vertically on right edge of selection)
    const dupX = rLeftX + rWidth;
    const dupY = rTopY + rHeight / 2;
    if (Math.abs(canvasX - dupX) <= 9 && Math.abs(canvasY - dupY) <= 9) {
      return 'right-duplicate';
    }

    return null;
  }

  public hitTest(
    canvasX: number,
    canvasY: number,
    scrollLeft: number,
    scrollTop: number,
    rowCount: number
  ): HitTestResult | null {
    if (canvasY <= this.headerHeight || canvasX <= this.rowNumberWidth) {
      return null;
    }

    const virtualY = canvasY - this.headerHeight + scrollTop;
    const row = Math.floor(virtualY / this.rowHeight);
    if (row < 0 || row >= rowCount) return null;

    const cellScreenY = this.headerHeight + row * this.rowHeight - scrollTop;
    const localY = canvasY - cellScreenY;

    // 1. Frozen Columns
    if (canvasX < this.totalFrozenWidth) {
      let curX = this.rowNumberWidth;
      for (let i = 0; i < this.frozenColumns.length; i++) {
        const w = this.frozenColumns[i].width;
        if (canvasX >= curX && canvasX < curX + w) {
          return {
            row,
            col: i,
            localX: canvasX - curX,
            localY,
            isFrozen: true,
            cellRect: { x: curX, y: cellScreenY, width: w, height: this.rowHeight },
          };
        }
        curX += w;
      }
      return null;
    }

    // 2. Scrollable Columns
    const scrollX = canvasX - this.totalFrozenWidth + scrollLeft;
    if (scrollX < 0 || scrollX >= this.totalScrollableWidth || this.scrollableColumns.length === 0) {
      return null;
    }

    const scrollIdx = this.findScrollableColIndexAtX(scrollX);
    const colIndex = this.frozenColumns.length + scrollIdx;
    const cellScreenX = this.totalFrozenWidth + this.scrollableColOffsets[scrollIdx] - scrollLeft;
    const width = this.scrollableColumns[scrollIdx].width;

    return {
      row,
      col: colIndex,
      localX: canvasX - cellScreenX,
      localY,
      isFrozen: false,
      cellRect: { x: cellScreenX, y: cellScreenY, width, height: this.rowHeight },
    };
  }


  public hitTestColumnDropTarget(
    canvasX: number,
    scrollLeft: number,
    draggingColId: string
  ): { targetColId: string; colIndex: number; position: 'before' | 'after'; indicatorX: number } | null {
    if (this.columns.length === 0) return null;

    // 1. Frozen Columns
    let curFrozenX = this.rowNumberWidth;
    for (let i = 0; i < this.frozenColumns.length; i++) {
      const col = this.frozenColumns[i];
      if (col.id === '__selection__') {
        curFrozenX += col.width;
        continue;
      }
      const w = col.width;
      if (canvasX >= curFrozenX && canvasX <= curFrozenX + w) {
        const midX = curFrozenX + w / 2;
        const position = canvasX >= midX ? 'after' : 'before';
        const indicatorX = position === 'after' ? curFrozenX + w : curFrozenX;
        return {
          targetColId: col.id,
          colIndex: i,
          position,
          indicatorX,
        };
      }
      curFrozenX += w;
    }

    // 2. Scrollable Columns
    for (let j = 0; j < this.scrollableColumns.length; j++) {
      const col = this.scrollableColumns[j];
      if (col.id === '__selection__') continue;
      const colIdx = this.frozenColumns.length + j;
      const x = this.totalFrozenWidth + this.scrollableColOffsets[j] - scrollLeft;
      const w = col.width;

      if (canvasX >= x && canvasX <= x + w) {
        const midX = x + w / 2;
        const position = canvasX >= midX ? 'after' : 'before';
        const indicatorX = position === 'after' ? x + w : x;
        return {
          targetColId: col.id,
          colIndex: colIdx,
          position,
          indicatorX,
        };
      }
    }

    // 3. Past the rightmost scrollable column
    if (this.scrollableColumns.length > 0) {
      const lastIdx = this.scrollableColumns.length - 1;
      const lastCol = this.scrollableColumns[lastIdx];
      const lastX = this.totalFrozenWidth + this.scrollableColOffsets[lastIdx] - scrollLeft;
      if (canvasX > lastX + lastCol.width) {
        return {
          targetColId: lastCol.id,
          colIndex: this.frozenColumns.length + lastIdx,
          position: 'after',
          indicatorX: lastX + lastCol.width,
        };
      }
    }

    return null;
  }

  public hitTestColumnResize(
    canvasX: number,
    canvasY: number,
    scrollLeft: number
  ): { colIndex: number; isFrozen: boolean } | null {
    if (canvasY > this.headerHeight || canvasY < 0) return null;
    const inGroupBand = this.hasColumnGroups && canvasY < this.groupHeaderHeight;

    let curX = this.rowNumberWidth;
    for (let i = 0; i < this.frozenColumns.length; i++) {
      curX += this.frozenColumns[i].width;
      if (Math.abs(canvasX - curX) <= 4) {
        if (inGroupBand) {
          const curGroup = this.getColumnGroup(this.frozenColumns[i]);
          const nextGroup =
            i + 1 < this.frozenColumns.length
              ? this.getColumnGroup(this.frozenColumns[i + 1])
              : undefined;
          if (curGroup && nextGroup && curGroup.id === nextGroup.id) {
            continue;
          }
        }
        return { colIndex: i, isFrozen: true };
      }
    }

    if (canvasX >= this.totalFrozenWidth) {
      for (let i = 0; i < this.scrollableColumns.length; i++) {
        const borderX =
          this.totalFrozenWidth + this.scrollableColOffsets[i + 1] - scrollLeft;
        if (Math.abs(canvasX - borderX) <= 4) {
          if (inGroupBand) {
            const curGroup = this.getColumnGroup(this.scrollableColumns[i]);
            const nextGroup =
              i + 1 < this.scrollableColumns.length
                ? this.getColumnGroup(this.scrollableColumns[i + 1])
                : undefined;
            if (curGroup && nextGroup && curGroup.id === nextGroup.id) {
              continue;
            }
          }
          return { colIndex: this.frozenColumns.length + i, isFrozen: false };
        }
      }
    }

    return null;
  }

  /**
   * Calculates the mathematical best-fit width for a column based on header and cell contents.
   */
  public calculateBestFitWidth(
    columnId: string,
    store: IDataStore,
    theme: IGridThemeTokens,
    ctx?: CanvasRenderingContext2D | null,
    options?: AutoSizeOptions
  ): number {
    const col = this.columns.find((c) => c.id === columnId);
    if (!col) return 100;
    return ColumnManager.calculateBestFitWidth(col, store, theme, ctx, options);
  }
}
