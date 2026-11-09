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
  pinnedZone?: 'left' | 'center' | 'right';
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
  pinnedZone?: 'left' | 'center' | 'right';
}

export class GeometryEngine {
  public rowHeight: number = 34;
  public defaultRowHeight: number = 34;
  public baseHeaderHeight: number = 38;
  public groupHeaderHeight: number = 30;
  public headerHeight: number = 38;
  public hasColumnGroups: boolean = false;
  public columnGroups: ColumnGroupDef[] = [];
  private colToGroupMap: Map<string, ColumnGroupDef> = new Map();
  public rowNumberWidth: number = 54;
  public viewportWidth: number = typeof window !== 'undefined' ? window.innerWidth : 1200;

  public columns: ColumnDef[] = [];

  // Dual Pinning 3-way split:
  public leftPinnedColumns: ColumnDef[] = [];
  public centerColumns: ColumnDef[] = [];
  public rightPinnedColumns: ColumnDef[] = [];

  public totalLeftPinnedWidth: number = 0;
  public totalRightPinnedWidth: number = 0;
  public totalCenterWidth: number = 0;

  public centerColOffsets: Float32Array = new Float32Array(0);
  public rightColOffsets: Float32Array = new Float32Array(0);

  // Backward compatibility aliases
  public get frozenColumns(): ColumnDef[] {
    return this.leftPinnedColumns;
  }
  public set frozenColumns(cols: ColumnDef[]) {
    this.leftPinnedColumns = cols;
  }

  public get scrollableColumns(): ColumnDef[] {
    return this.centerColumns;
  }
  public set scrollableColumns(cols: ColumnDef[]) {
    this.centerColumns = cols;
  }

  public get totalFrozenWidth(): number {
    return this.totalLeftPinnedWidth;
  }
  public set totalFrozenWidth(w: number) {
    this.totalLeftPinnedWidth = w;
  }

  public get totalScrollableWidth(): number {
    return this.totalCenterWidth;
  }
  public set totalScrollableWidth(w: number) {
    this.totalCenterWidth = w;
  }

  public get scrollableColOffsets(): Float32Array {
    return this.centerColOffsets;
  }
  public set scrollableColOffsets(offsets: Float32Array) {
    this.centerColOffsets = offsets;
  }

  // Dynamic Variable Row Heights & Cumulative Offsets
  public rowCount: number = 0;
  public rowOffsets: Float64Array = new Float64Array(0);
  private customRowHeights: Map<number, number> = new Map();
  private offsetsValid: boolean = false;

  constructor(
    columns: ColumnDef[] = [],
    rowHeight: number = 34,
    headerHeight: number = 38,
    columnGroups: ColumnGroupDef[] = [],
    groupHeaderHeight: number = 30
  ) {
    this.rowHeight = rowHeight || 34;
    this.defaultRowHeight = this.rowHeight;
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
    // Sort into 3 zones: left pinned, center unpinned, right pinned
    this.columns = [
      ...visibleCols.filter((c) => c.pinned === true || c.pinned === 'left'),
      ...visibleCols.filter((c) => !c.pinned),
      ...visibleCols.filter((c) => c.pinned === 'right'),
    ];
    this.recalculateGeometry();
  }

  public recalculateGeometry(): void {
    const isMobileViewport = this.viewportWidth > 0 && this.viewportWidth < 680;
    this.rowNumberWidth = isMobileViewport ? 38 : 54;

    const isLeft = (c: ColumnDef) => c.pinned === true || c.pinned === 'left';
    const isRight = (c: ColumnDef) => c.pinned === 'right';

    if (isMobileViewport) {
      // On narrow mobile screens, prevent pinned columns from consuming the entire viewport width
      const maxFrozenBudget = Math.max(88, Math.floor(this.viewportWidth * 0.34));
      const nextLeft: ColumnDef[] = [];
      const nextCenter: ColumnDef[] = [];
      const nextRight: ColumnDef[] = [];
      let currentLeftW = this.rowNumberWidth;

      for (const col of this.columns) {
        if (isLeft(col)) {
          if (col.id === '__selection__' || currentLeftW + col.width <= maxFrozenBudget) {
            nextLeft.push(col);
            currentLeftW += col.width;
          } else {
            nextCenter.push(col);
          }
        } else if (isRight(col)) {
          // On mobile, right-pinned columns scroll with center to prevent covering the viewport
          nextCenter.push(col);
        } else {
          nextCenter.push(col);
        }
      }
      this.leftPinnedColumns = nextLeft;
      this.centerColumns = nextCenter;
      this.rightPinnedColumns = nextRight;
    } else {
      this.leftPinnedColumns = this.columns.filter(isLeft);
      this.centerColumns = this.columns.filter((c) => !isLeft(c) && !isRight(c));
      this.rightPinnedColumns = this.columns.filter(isRight);
    }

    // Maintain ordered column list: Left -> Center -> Right
    this.columns = [
      ...this.leftPinnedColumns,
      ...this.centerColumns,
      ...this.rightPinnedColumns,
    ];

    // 1. Total Left Pinned Width (includes row number column if present)
    this.totalLeftPinnedWidth =
      this.rowNumberWidth + this.leftPinnedColumns.reduce((sum, c) => sum + c.width, 0);

    // 2. Total Right Pinned Width
    this.totalRightPinnedWidth = this.rightPinnedColumns.reduce((sum, c) => sum + c.width, 0);

    // 3. Center Column Offsets
    this.centerColOffsets = new Float32Array(this.centerColumns.length + 1);
    let accCenter = 0;
    for (let i = 0; i < this.centerColumns.length; i++) {
      this.centerColOffsets[i] = accCenter;
      accCenter += this.centerColumns[i].width;
    }
    this.centerColOffsets[this.centerColumns.length] = accCenter;
    this.totalCenterWidth = accCenter;

    // 4. Right Column Offsets (local accumulated widths within right pinned zone)
    this.rightColOffsets = new Float32Array(this.rightPinnedColumns.length + 1);
    let accRight = 0;
    for (let i = 0; i < this.rightPinnedColumns.length; i++) {
      this.rightColOffsets[i] = accRight;
      accRight += this.rightPinnedColumns[i].width;
    }
    this.rightColOffsets[this.rightPinnedColumns.length] = accRight;

    this.rebuildColumnGroupMap();
  }

  /**
   * Screen X position where the Right Pinned Zone begins.
   * Sticks to the right edge of the viewport (viewportWidth - totalRightPinnedWidth).
   */
  public getRightPinnedStartX(): number {
    return Math.max(this.totalLeftPinnedWidth, this.viewportWidth - this.totalRightPinnedWidth);
  }

  /**
   * Total virtual horizontal content width across all 3 zones.
   */
  public getTotalWidth(): number {
    return this.totalLeftPinnedWidth + this.totalCenterWidth + this.totalRightPinnedWidth;
  }

  public findCenterColIndexAtX(scrollX: number): number {
    let low = 0;
    let high = this.centerColumns.length - 1;
    while (low <= high) {
      const mid = (low + high) >>> 1;
      const start = this.centerColOffsets[mid];
      const end = this.centerColOffsets[mid + 1];
      if (scrollX >= start && scrollX < end) {
        return mid;
      } else if (scrollX < start) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    return Math.min(Math.max(0, low), Math.max(0, this.centerColumns.length - 1));
  }

  public findScrollableColIndexAtX(scrollX: number): number {
    return this.findCenterColIndexAtX(scrollX);
  }

  /**
   * Computes the screen X coordinate, width, and pinning status of a column across the 3 zones:
   * 1. Left Zone: Static offset starting at rowNumberWidth.
   * 2. Center Zone: Dynamic offset starting at totalLeftPinnedWidth, shifted by scrollLeft.
   * 3. Right Zone: Static offset anchored to (viewportWidth - totalRightPinnedWidth).
   */
  public getColumnScreenRect(
    colIndex: number,
    scrollLeft: number
  ): { x: number; width: number; isFrozen: boolean; pinnedZone?: 'left' | 'center' | 'right' } {
    const leftCount = this.leftPinnedColumns.length;
    const centerCount = this.centerColumns.length;
    const rightCount = this.rightPinnedColumns.length;

    // 1. Left Pinned Zone
    if (colIndex < leftCount) {
      let x = this.rowNumberWidth;
      for (let i = 0; i < colIndex; i++) {
        x += this.leftPinnedColumns[i].width;
      }
      return {
        x,
        width: this.leftPinnedColumns[colIndex]?.width || 0,
        isFrozen: true,
        pinnedZone: 'left',
      };
    }

    // 2. Center Scrollable Zone
    if (colIndex < leftCount + centerCount) {
      const centerIdx = colIndex - leftCount;
      const x = this.totalLeftPinnedWidth + this.centerColOffsets[centerIdx] - scrollLeft;
      return {
        x,
        width: this.centerColumns[centerIdx]?.width || 0,
        isFrozen: false,
        pinnedZone: 'center',
      };
    }

    // 3. Right Pinned Zone
    if (colIndex < leftCount + centerCount + rightCount) {
      const rightIdx = colIndex - leftCount - centerCount;
      const rightStartX = this.getRightPinnedStartX();
      const x = rightStartX + this.rightColOffsets[rightIdx];
      return {
        x,
        width: this.rightPinnedColumns[rightIdx]?.width || 0,
        isFrozen: true,
        pinnedZone: 'right',
      };
    }

    return { x: 0, width: 0, isFrozen: false };
  }

  /**
   * Hit test a canvas X coordinate to find the corresponding column in any of the 3 zones.
   */
  public getColumnAtX(
    canvasX: number,
    scrollLeft: number
  ): { colIndex: number; column: ColumnDef; isFrozen: boolean; pinnedZone: 'left' | 'center' | 'right' } | null {
    if (canvasX < this.rowNumberWidth) return null;

    // 1. Check Left Pinned Zone
    if (canvasX < this.totalLeftPinnedWidth) {
      let curX = this.rowNumberWidth;
      for (let i = 0; i < this.leftPinnedColumns.length; i++) {
        const w = this.leftPinnedColumns[i].width;
        if (canvasX >= curX && canvasX < curX + w) {
          return {
            colIndex: i,
            column: this.leftPinnedColumns[i],
            isFrozen: true,
            pinnedZone: 'left',
          };
        }
        curX += w;
      }
      return null;
    }

    // 2. Check Right Pinned Zone (layered on top of center content)
    const rightStartX = this.getRightPinnedStartX();
    if (this.rightPinnedColumns.length > 0 && canvasX >= rightStartX && canvasX <= this.viewportWidth) {
      let curRX = rightStartX;
      const baseIdx = this.leftPinnedColumns.length + this.centerColumns.length;
      for (let i = 0; i < this.rightPinnedColumns.length; i++) {
        const w = this.rightPinnedColumns[i].width;
        if (canvasX >= curRX && canvasX < curRX + w) {
          return {
            colIndex: baseIdx + i,
            column: this.rightPinnedColumns[i],
            isFrozen: true,
            pinnedZone: 'right',
          };
        }
        curRX += w;
      }
      return null;
    }

    // 3. Check Center Zone
    if (canvasX < rightStartX) {
      const scrollX = canvasX - this.totalLeftPinnedWidth + scrollLeft;
      if (scrollX >= 0 && scrollX < this.totalCenterWidth && this.centerColumns.length > 0) {
        const cIdx = this.findCenterColIndexAtX(scrollX);
        const colIndex = this.leftPinnedColumns.length + cIdx;
        return {
          colIndex,
          column: this.centerColumns[cIdx],
          isFrozen: false,
          pinnedZone: 'center',
        };
      }
    }

    return null;
  }

  public hitTestHeader(canvasX: number, canvasY: number, scrollLeft: number): HeaderHitTestResult | null {
    if (canvasY < 0 || canvasY > this.headerHeight || canvasX <= this.rowNumberWidth) {
      return null;
    }

    let clickedCol = -1;
    let headerX = 0;
    let headerW = 0;
    let pinnedZone: 'left' | 'center' | 'right' = 'center';

    // 1. Left Pinned Zone
    if (canvasX < this.totalLeftPinnedWidth) {
      let curX = this.rowNumberWidth;
      for (let i = 0; i < this.leftPinnedColumns.length; i++) {
        const w = this.leftPinnedColumns[i].width;
        if (canvasX >= curX && canvasX < curX + w) {
          clickedCol = i;
          headerX = curX;
          headerW = w;
          pinnedZone = 'left';
          break;
        }
        curX += w;
      }
    }

    // 2. Right Pinned Zone (layered on top)
    const rightStartX = this.getRightPinnedStartX();
    if (clickedCol === -1 && this.rightPinnedColumns.length > 0 && canvasX >= rightStartX && canvasX <= this.viewportWidth) {
      let curRX = rightStartX;
      const baseIdx = this.leftPinnedColumns.length + this.centerColumns.length;
      for (let i = 0; i < this.rightPinnedColumns.length; i++) {
        const w = this.rightPinnedColumns[i].width;
        if (canvasX >= curRX && canvasX < curRX + w) {
          clickedCol = baseIdx + i;
          headerX = curRX;
          headerW = w;
          pinnedZone = 'right';
          break;
        }
        curRX += w;
      }
    }

    // 3. Center Scrollable Zone
    if (clickedCol === -1 && canvasX >= this.totalLeftPinnedWidth && canvasX < rightStartX) {
      const sx = canvasX - this.totalLeftPinnedWidth + scrollLeft;
      if (sx >= 0 && sx < this.totalCenterWidth && this.centerColumns.length > 0) {
        const cIdx = this.findCenterColIndexAtX(sx);
        clickedCol = this.leftPinnedColumns.length + cIdx;
        headerX = this.totalLeftPinnedWidth + this.centerColOffsets[cIdx] - scrollLeft;
        headerW = this.centerColumns[cIdx]?.width || 100;
        pinnedZone = 'center';
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
      let minBound = 0;
      let maxBound = this.columns.length - 1;
      if (pinnedZone === 'left') {
        minBound = 0;
        maxBound = this.leftPinnedColumns.length - 1;
      } else if (pinnedZone === 'center') {
        minBound = this.leftPinnedColumns.length;
        maxBound = this.leftPinnedColumns.length + this.centerColumns.length - 1;
      } else if (pinnedZone === 'right') {
        minBound = this.leftPinnedColumns.length + this.centerColumns.length;
        maxBound = this.columns.length - 1;
      }
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
      pinnedZone,
    };
  }

  // ============================================================================
  // VARIABLE ROW HEIGHTS & OFFSETS ENGINE
  // ============================================================================

  /**
   * Updates the height of a specific row and recalculates cumulative offsets.
   */
  public setRowHeight(rowIndex: number, height: number): void {
    if (rowIndex < 0 || height <= 0) return;
    if (height === this.rowHeight) {
      this.customRowHeights.delete(rowIndex);
    } else {
      this.customRowHeights.set(rowIndex, height);
    }
    this.offsetsValid = false;
    this.recalculateRowOffsets();
  }

  /**
   * Returns the specific row's height. If not explicitly set, returns the default rowHeight.
   */
  public getRowHeight(rowIndex: number): number {
    return this.customRowHeights.get(rowIndex) ?? this.rowHeight;
  }

  /**
   * Clears all custom row heights and resets the offsets array.
   */
  public clearCustomRowHeights(): void {
    this.customRowHeights.clear();
    this.offsetsValid = false;
    this.recalculateRowOffsets();
  }

  /**
   * Returns a snapshot copy of all active custom row heights.
   */
  public getCustomRowHeights(): Map<number, number> {
    return new Map(this.customRowHeights);
  }

  /**
   * Recalculates the cumulative Y offsets prefix-sum array for all rows.
   */
  public recalculateRowOffsets(rowCount?: number): void {
    if (rowCount !== undefined && rowCount >= 0) {
      this.rowCount = rowCount;
    }
    const count = this.rowCount;
    if (this.rowOffsets.length !== count + 1) {
      this.rowOffsets = new Float64Array(count + 1);
    }
    let acc = 0;
    const hasCustom = this.customRowHeights.size > 0;
    const defaultH = this.rowHeight;

    if (!hasCustom) {
      for (let i = 0; i < count; i++) {
        this.rowOffsets[i] = acc;
        acc += defaultH;
      }
    } else {
      for (let i = 0; i < count; i++) {
        this.rowOffsets[i] = acc;
        acc += this.customRowHeights.get(i) ?? defaultH;
      }
    }
    this.rowOffsets[count] = acc;
    this.offsetsValid = true;
  }

  /**
   * Returns the cumulative Y offset (distance from top of rows area) for a row index.
   */
  public getRowOffset(rowIndex: number): number {
    if (rowIndex <= 0) return 0;
    if (!this.offsetsValid || rowIndex >= this.rowOffsets.length) {
      this.recalculateRowOffsets(Math.max(this.rowCount, rowIndex + 1));
    }
    if (rowIndex < this.rowOffsets.length) {
      return this.rowOffsets[rowIndex];
    }
    return rowIndex * this.rowHeight;
  }

  /**
   * Returns the total sum of all row heights (the last value in the offsets array).
   */
  public getTotalHeight(rowCount?: number): number {
    if (rowCount !== undefined && (rowCount !== this.rowCount || !this.offsetsValid)) {
      this.recalculateRowOffsets(rowCount);
    } else if (!this.offsetsValid) {
      this.recalculateRowOffsets();
    }
    if (this.rowOffsets.length === 0) {
      return (rowCount ?? this.rowCount) * this.rowHeight;
    }
    return this.rowOffsets[this.rowCount];
  }

  /**
   * Calculates the screen-space Y coordinate and height for a row based on cumulative offset minus scrollTop.
   */
  public getRowScreenRect(
    rowIndex: number,
    scrollTop: number = 0
  ): { y: number; height: number } {
    const y = this.headerHeight + this.getRowOffset(rowIndex) - scrollTop;
    const height = this.getRowHeight(rowIndex);
    return { y, height };
  }

  /**
   * Binary searches (O(log N)) over cumulative row offsets to find the row index at a given virtual Y coordinate.
   */
  public findRowIndexAtY(virtualY: number, rowCount?: number): number {
    if (rowCount !== undefined && (rowCount !== this.rowCount || !this.offsetsValid)) {
      this.recalculateRowOffsets(rowCount);
    } else if (!this.offsetsValid) {
      this.recalculateRowOffsets();
    }

    const count = this.rowCount;
    if (count <= 0 || virtualY <= 0) return 0;

    // Fast-path: uniform heights without custom entries
    if (this.customRowHeights.size === 0 && this.rowHeight > 0) {
      const idx = Math.floor(virtualY / this.rowHeight);
      return Math.min(Math.max(0, idx), count - 1);
    }

    let low = 0;
    let high = count - 1;
    while (low <= high) {
      const mid = (low + high) >>> 1;
      const start = this.rowOffsets[mid];
      const end = this.rowOffsets[mid + 1];
      if (virtualY >= start && virtualY < end) {
        return mid;
      } else if (virtualY < start) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    return Math.min(Math.max(0, low), count - 1);
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
    const totalRowsHeight = this.getTotalHeight(rowCount);
    if (rowCount <= 0 || virtualY < 0 || virtualY >= totalRowsHeight) {
      return null;
    }
    const row = this.findRowIndexAtY(virtualY, rowCount);
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
    const rTopRect = this.getRowScreenRect(norm.minRow, scrollTop);
    const rBottomRect = this.getRowScreenRect(norm.maxRow, scrollTop);
    const rTopY = rTopRect.y;
    const rHeight = rBottomRect.y + rBottomRect.height - rTopRect.y;
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
    const totalRowsHeight = this.getTotalHeight(rowCount);
    if (rowCount <= 0 || virtualY < 0 || virtualY >= totalRowsHeight) {
      return null;
    }
    const row = this.findRowIndexAtY(virtualY, rowCount);
    if (row < 0 || row >= rowCount) return null;

    const rowRect = this.getRowScreenRect(row, scrollTop);
    const cellScreenY = rowRect.y;
    const rowH = rowRect.height;
    const localY = canvasY - cellScreenY;

    // 1. Left Pinned Zone
    if (canvasX < this.totalLeftPinnedWidth) {
      let curX = this.rowNumberWidth;
      for (let i = 0; i < this.leftPinnedColumns.length; i++) {
        const w = this.leftPinnedColumns[i].width;
        if (canvasX >= curX && canvasX < curX + w) {
          return {
            row,
            col: i,
            localX: canvasX - curX,
            localY,
            isFrozen: true,
            pinnedZone: 'left',
            cellRect: { x: curX, y: cellScreenY, width: w, height: rowH },
          };
        }
        curX += w;
      }
      return null;
    }

    // 2. Right Pinned Zone (layered on top)
    const rightStartX = this.getRightPinnedStartX();
    if (this.rightPinnedColumns.length > 0 && canvasX >= rightStartX && canvasX <= this.viewportWidth) {
      let curRX = rightStartX;
      const baseIdx = this.leftPinnedColumns.length + this.centerColumns.length;
      for (let i = 0; i < this.rightPinnedColumns.length; i++) {
        const w = this.rightPinnedColumns[i].width;
        if (canvasX >= curRX && canvasX < curRX + w) {
          return {
            row,
            col: baseIdx + i,
            localX: canvasX - curRX,
            localY,
            isFrozen: true,
            pinnedZone: 'right',
            cellRect: { x: curRX, y: cellScreenY, width: w, height: rowH },
          };
        }
        curRX += w;
      }
      return null;
    }

    // 3. Center Scrollable Zone
    if (canvasX < rightStartX) {
      const scrollX = canvasX - this.totalLeftPinnedWidth + scrollLeft;
      if (scrollX >= 0 && scrollX < this.totalCenterWidth && this.centerColumns.length > 0) {
        const centerIdx = this.findCenterColIndexAtX(scrollX);
        const colIndex = this.leftPinnedColumns.length + centerIdx;
        const cellScreenX = this.totalLeftPinnedWidth + this.centerColOffsets[centerIdx] - scrollLeft;
        const width = this.centerColumns[centerIdx].width;

        return {
          row,
          col: colIndex,
          localX: canvasX - cellScreenX,
          localY,
          isFrozen: false,
          pinnedZone: 'center',
          cellRect: { x: cellScreenX, y: cellScreenY, width, height: rowH },
        };
      }
    }

    return null;
  }


  public hitTestColumnDropTarget(
    canvasX: number,
    scrollLeft: number,
    draggingColId?: string
  ): { targetColId: string; colIndex: number; position: 'before' | 'after'; indicatorX: number } | null {
    if (this.columns.length === 0) return null;

    // 1. Left Pinned Columns
    if (canvasX < this.totalLeftPinnedWidth) {
      let curLeftX = this.rowNumberWidth;
      for (let i = 0; i < this.leftPinnedColumns.length; i++) {
        const col = this.leftPinnedColumns[i];
        if (col.id === '__selection__') {
          curLeftX += col.width;
          continue;
        }
        const w = col.width;
        if (canvasX >= curLeftX && canvasX <= curLeftX + w) {
          if (draggingColId && col.id === draggingColId) return null;
          const midX = curLeftX + w / 2;
          const position = canvasX >= midX ? 'after' : 'before';
          const indicatorX = position === 'after' ? curLeftX + w : curLeftX;
          return {
            targetColId: col.id,
            colIndex: i,
            position,
            indicatorX,
          };
        }
        curLeftX += w;
      }
      return null;
    }

    // 2. Right Pinned Columns (layered on top of center content)
    const rightStartX = this.getRightPinnedStartX();
    if (this.rightPinnedColumns.length > 0 && canvasX >= rightStartX) {
      let curRightX = rightStartX;
      const baseIdx = this.leftPinnedColumns.length + this.centerColumns.length;
      for (let k = 0; k < this.rightPinnedColumns.length; k++) {
        const col = this.rightPinnedColumns[k];
        if (col.id === '__selection__') {
          curRightX += col.width;
          continue;
        }
        const w = col.width;
        if (canvasX >= curRightX && canvasX <= curRightX + w) {
          if (draggingColId && col.id === draggingColId) return null;
          const midX = curRightX + w / 2;
          const position = canvasX >= midX ? 'after' : 'before';
          const indicatorX = position === 'after' ? curRightX + w : curRightX;
          return {
            targetColId: col.id,
            colIndex: baseIdx + k,
            position,
            indicatorX,
          };
        }
        curRightX += w;
      }

      const lastRightIdx = this.rightPinnedColumns.length - 1;
      const lastRightCol = this.rightPinnedColumns[lastRightIdx];
      if (lastRightCol && canvasX > curRightX && lastRightCol.id !== draggingColId) {
        return {
          targetColId: lastRightCol.id,
          colIndex: baseIdx + lastRightIdx,
          position: 'after',
          indicatorX: curRightX,
        };
      }
      return null;
    }

    // 3. Center Scrollable Columns
    for (let j = 0; j < this.centerColumns.length; j++) {
      const col = this.centerColumns[j];
      if (col.id === '__selection__') continue;
      const colIdx = this.leftPinnedColumns.length + j;
      const x = this.totalLeftPinnedWidth + this.centerColOffsets[j] - scrollLeft;
      const w = col.width;

      if (canvasX >= x && canvasX <= x + w) {
        if (draggingColId && col.id === draggingColId) return null;
        const midX = x + w / 2;
        const position = canvasX >= midX ? 'after' : 'before';
        const rawIndicatorX = position === 'after' ? x + w : x;
        const indicatorX = Math.min(rightStartX, Math.max(this.totalLeftPinnedWidth, rawIndicatorX));
        return {
          targetColId: col.id,
          colIndex: colIdx,
          position,
          indicatorX,
        };
      }
    }

    // 4. Past the rightmost center column (within center viewport)
    if (this.centerColumns.length > 0) {
      const lastIdx = this.centerColumns.length - 1;
      const lastCol = this.centerColumns[lastIdx];
      const lastX = this.totalLeftPinnedWidth + this.centerColOffsets[lastIdx] - scrollLeft;
      if (canvasX > lastX + lastCol.width && lastCol.id !== draggingColId) {
        return {
          targetColId: lastCol.id,
          colIndex: this.leftPinnedColumns.length + lastIdx,
          position: 'after',
          indicatorX: Math.min(rightStartX, lastX + lastCol.width),
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

    // 1. Left Pinned Columns
    let curX = this.rowNumberWidth;
    for (let i = 0; i < this.leftPinnedColumns.length; i++) {
      curX += this.leftPinnedColumns[i].width;
      if (Math.abs(canvasX - curX) <= 4) {
        if (inGroupBand) {
          const curGroup = this.getColumnGroup(this.leftPinnedColumns[i]);
          const nextGroup =
            i + 1 < this.leftPinnedColumns.length
              ? this.getColumnGroup(this.leftPinnedColumns[i + 1])
              : undefined;
          if (curGroup && nextGroup && curGroup.id === nextGroup.id) {
            continue;
          }
        }
        return { colIndex: i, isFrozen: true };
      }
    }

    // 2. Right Pinned Columns
    const rightStartX = this.getRightPinnedStartX();
    if (this.rightPinnedColumns.length > 0 && canvasX >= rightStartX - 4) {
      let curRX = rightStartX;
      const baseIdx = this.leftPinnedColumns.length + this.centerColumns.length;
      for (let i = 0; i < this.rightPinnedColumns.length; i++) {
        curRX += this.rightPinnedColumns[i].width;
        if (Math.abs(canvasX - curRX) <= 4) {
          if (inGroupBand) {
            const curGroup = this.getColumnGroup(this.rightPinnedColumns[i]);
            const nextGroup =
              i + 1 < this.rightPinnedColumns.length
                ? this.getColumnGroup(this.rightPinnedColumns[i + 1])
                : undefined;
            if (curGroup && nextGroup && curGroup.id === nextGroup.id) {
              continue;
            }
          }
          return { colIndex: baseIdx + i, isFrozen: true };
        }
      }
    }

    // 3. Center Scrollable Columns
    if (canvasX >= this.totalLeftPinnedWidth && canvasX <= rightStartX + 4) {
      for (let i = 0; i < this.centerColumns.length; i++) {
        const borderX =
          this.totalLeftPinnedWidth + this.centerColOffsets[i + 1] - scrollLeft;
        if (borderX > rightStartX + 4) continue;
        if (Math.abs(canvasX - borderX) <= 4) {
          if (inGroupBand) {
            const curGroup = this.getColumnGroup(this.centerColumns[i]);
            const nextGroup =
              i + 1 < this.centerColumns.length
                ? this.getColumnGroup(this.centerColumns[i + 1])
                : undefined;
            if (curGroup && nextGroup && curGroup.id === nextGroup.id) {
              continue;
            }
          }
          return { colIndex: this.leftPinnedColumns.length + i, isFrozen: false };
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
