import { GeometryEngine } from '../core/GeometryEngine';
import { SelectionModel } from '../core/SelectionModel';
import { IDataStore } from '../types/store';
import { IGridThemeTokens } from '../theme/IGridTheme';
import { ColumnTypeRegistry } from '../columns/ColumnTypeRegistry';
import { GroupRowPainter } from './GroupRowPainter';
import { SkeletonPainter } from './SkeletonPainter';
import { SortDescriptor } from '../types/filter';
import { IGridLocale } from '../i18n/IGridLocale';
import { ColumnDef, ColumnGroupDef, GridPermissions, RowSelectionMode } from '../types/grid';
import {
  ColumnColorEngine,
  ResolvedColumnStyle,
  ResolvedGroupHeaderStyle,
} from '../theme/ColumnColorEngine';

export interface RenderParams {
  canvas: HTMLCanvasElement;
  geometry: GeometryEngine;
  store: IDataStore;
  selection: SelectionModel;
  theme: IGridThemeTokens;
  locale: IGridLocale;
  scrollLeft: number;
  scrollTop: number;
  sortRules: SortDescriptor[];
  searchKeyword?: string;
  hoveredCell?: { row: number; col: number } | null;
  hoveredFilterColIndex?: number | null;
  activeFilterColumnIds?: Set<string>;
  fillDragRange?: { minRow: number; maxRow: number; minCol: number; maxCol: number } | null;
  loadingRowKeys?: Set<any>;
  permissions?: GridPermissions;
  selectionMode?: RowSelectionMode;
  selectedRowKeys?: Set<any>;
  zebraStriping?: boolean | string | { light: string; dark: string };
  hasMasterDetail?: boolean;
  expandedMasterRows?: Set<any>;
}

export class CanvasRenderer {
  public static isColumnReadonly(col: ColumnDef, permissions?: GridPermissions): boolean {
    if (permissions?.mode === 'read' || permissions?.mode === 'readonly') return true;
    if (permissions?.allowUpdating === false) return true;
    if (col.readonly || col.permission === 'readonly' || col.permission === 'read') return true;
    return false;
  }

  public static render(params: RenderParams): void {
    const {
      canvas,
      geometry,
      store,
      selection,
      theme,
      locale,
      scrollLeft,
      scrollTop,
      sortRules,
      searchKeyword,
      hoveredCell,
      hoveredFilterColIndex,
      activeFilterColumnIds,
      fillDragRange,
      loadingRowKeys,
      permissions,
      selectionMode = 'none',
      selectedRowKeys,
      zebraStriping = true,
      hasMasterDetail,
      expandedMasterRows,
    } = params;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.round(rect.width) || canvas.clientWidth || 0;
    const height = Math.round(rect.height) || canvas.clientHeight || 0;

    if (width <= 0 || height <= 0) return;

    const targetPixelWidth = Math.round(width * dpr);
    const targetPixelHeight = Math.round(height * dpr);

    if (canvas.width !== targetPixelWidth || canvas.height !== targetPixelHeight) {
      canvas.width = targetPixelWidth;
      canvas.height = targetPixelHeight;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.save();
    ctx.scale(dpr, dpr);

    try {
      // 1. Background Fill
      ctx.fillStyle = theme.canvas.bg;
      ctx.fillRect(0, 0, width, height);

      const rowCount = store.getRowCount();
      const rowH = geometry.rowHeight;
      const headerH = geometry.headerHeight;
      const rowNumW = geometry.rowNumberWidth;

      // 2. Viewport Row Bounds (variable row heights)
      const startRow = geometry.findRowIndexAtY(scrollTop, rowCount);
      const endRow = geometry.findRowIndexAtY(scrollTop + height - headerH, rowCount);

      if (rowCount > 0 && endRow >= startRow) {
        store.ensureRange(startRow, endRow);
      } else if (rowCount === 0 && store.isRemote()) {
        store.ensureRange(0, Math.max(0, Math.ceil((height - headerH) / rowH)));
      }

      // 3. Viewport Scrollable Column Bounds
      let startScrollColIdx = 0;
      let endScrollColIdx = geometry.scrollableColumns.length - 1;

      if (geometry.scrollableColumns.length > 0) {
        startScrollColIdx = geometry.findScrollableColIndexAtX(scrollLeft);
        endScrollColIdx = geometry.findScrollableColIndexAtX(
          scrollLeft + Math.max(0, width - geometry.totalFrozenWidth)
        );
      }

      const normSel = selection.getNormalizedRange();
      const resolvedZebraBg =
        zebraStriping === false
          ? undefined
          : typeof zebraStriping === 'string'
            ? zebraStriping
            : typeof zebraStriping === 'object' && zebraStriping !== null
              ? theme.isDark
                ? zebraStriping.dark
                : zebraStriping.light
              : theme.canvas.zebraRowBg || (theme.isDark ? '#232428' : '#F4F7FB');
      const resolvedRowHoverBg =
        theme.canvas.rowHoverBg ||
        (theme.isDark ? 'rgba(10, 132, 255, 0.06)' : 'rgba(0, 122, 255, 0.035)');

      // ========================================================================
      // DATA ROWS & CELLS
      // ========================================================================
      for (let r = startRow; r <= endRow; r++) {
        const rowRect = geometry.getRowScreenRect(r, scrollTop);
        const rowY = rowRect.y;
        const totalRowH = rowRect.height;
        const vRow = store.getViewRow(r);

        if (!vRow) {
          SkeletonPainter.paintSkeletonCell(ctx, rowNumW, rowY, width - rowNumW, rowH, theme);
          continue;
        }

        if (vRow.type === 'group') {
          GroupRowPainter.paintGroupRow(
            ctx,
            vRow,
            rowY,
            width,
            rowH,
            theme,
            locale,
            geometry.columns,
            hoveredCell?.row === r
          );
          continue;
        }

        const rowData = vRow.data;
        const keyField = (store as any).getKeyField?.() || (store as any).keyField || 'id';
        const rowKey = rowData[keyField] ?? rowData.id ?? rowData.legacy_id ?? r;
        const isRowInserted = store.isRowInserted?.(rowKey) ?? false;
        const isRowLoading = loadingRowKeys?.has(rowKey) ?? false;
        const isRowInActiveSel = r >= normSel.minRow && r <= normSel.maxRow;
        const isZebraRow = Boolean(resolvedZebraBg && r % 2 === 1);
        const isRowHovered = hoveredCell?.row === r;

        // 1. SCROLLABLE COLUMNS
        ctx.save();
        ctx.beginPath();
        ctx.rect(
          geometry.totalFrozenWidth,
          headerH,
          Math.max(0, width - geometry.totalFrozenWidth),
          Math.max(0, height - headerH)
        );
        ctx.clip();

        if (isZebraRow && resolvedZebraBg) {
          ctx.fillStyle = resolvedZebraBg;
          ctx.fillRect(
            geometry.totalFrozenWidth,
            rowY,
            Math.max(0, width - geometry.totalFrozenWidth),
            rowH
          );
        }
        if (isRowHovered) {
          ctx.fillStyle = resolvedRowHoverBg;
          ctx.fillRect(
            geometry.totalFrozenWidth,
            rowY,
            Math.max(0, width - geometry.totalFrozenWidth),
            rowH
          );
        }

        for (let sc = startScrollColIdx; sc <= endScrollColIdx; sc++) {
          const colIdx = geometry.frozenColumns.length + sc;
          const col = geometry.columns[colIdx];
          if (!col) continue;

          const cellX = geometry.totalFrozenWidth + geometry.scrollableColOffsets[sc] - scrollLeft;
          const colStyle = ColumnColorEngine.resolveColumnStyle(
            col,
            geometry.getColumnGroup(col),
            theme.isDark
          );
          this.renderCell(
            ctx,
            rowData,
            rowKey,
            r,
            col,
            colIdx,
            cellX,
            rowY,
            col.width,
            rowH,
            theme,
            locale,
            selection,
            store,
            hoveredCell,
            searchKeyword,
            isRowInserted,
            isRowLoading,
            permissions,
            selectionMode,
            selectedRowKeys,
            colStyle
          );
        }
        ctx.restore();

        // 2. FROZEN COLUMNS
        let curFrozenX = rowNumW;
        for (let fc = 0; fc < geometry.frozenColumns.length; fc++) {
          const col = geometry.frozenColumns[fc];
          ctx.fillStyle = isZebraRow && resolvedZebraBg ? resolvedZebraBg : theme.canvas.bg;
          ctx.fillRect(curFrozenX, rowY, col.width, rowH);
          if (isRowHovered) {
            ctx.fillStyle = resolvedRowHoverBg;
            ctx.fillRect(curFrozenX, rowY, col.width, rowH);
          }

          const colStyle = ColumnColorEngine.resolveColumnStyle(
            col,
            geometry.getColumnGroup(col),
            theme.isDark
          );
          this.renderCell(
            ctx,
            rowData,
            rowKey,
            r,
            col,
            fc,
            curFrozenX,
            rowY,
            col.width,
            rowH,
            theme,
            locale,
            selection,
            store,
            hoveredCell,
            searchKeyword,
            isRowInserted,
            isRowLoading,
            permissions,
            selectionMode,
            selectedRowKeys,
            colStyle
          );

          curFrozenX += col.width;
        }

        // 3. ROW NUMBER GUTTER (Leftmost)
        ctx.fillStyle = isRowInActiveSel
          ? theme.isDark
            ? 'rgba(10, 132, 255, 0.22)'
            : 'rgba(0, 122, 255, 0.12)'
          : isZebraRow
          ? theme.isDark
            ? '#202124'
            : '#EEF2F7'
          : theme.canvas.rowNumberBg;
        ctx.fillRect(0, rowY, rowNumW, totalRowH);

        // Inserted row left indicator bar
        if (isRowInserted) {
          ctx.fillStyle = '#30D158';
          ctx.fillRect(0, rowY, 4, rowH);
        } else if (isRowLoading) {
          ctx.fillStyle = '#FF9F0A';
          ctx.fillRect(0, rowY, 4, rowH);
        }

        const isExpanded = expandedMasterRows?.has(rowKey) ?? false;

        if (hasMasterDetail) {
          // Draw [+] or [-] toggle indicator
          const btnX = 12;
          const btnY = rowY + rowH / 2;
          ctx.fillStyle = theme.dom.accentColor || (theme.isDark ? '#0A84FF' : '#007AFF');
          ctx.font = `700 13px ${theme.fontFamily}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(isExpanded ? '−' : '+', btnX, btnY);

          // Draw row number text shifted right
          ctx.fillStyle = isRowInActiveSel ? theme.dom.accentColor : theme.canvas.rowNumberText;
          ctx.font = `${isRowInActiveSel ? '700' : '500'} ${theme.fontSize - 1}px ${theme.fontFamily}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(isRowLoading ? '⟳' : String(r + 1), (rowNumW + 14) / 2, rowY + rowH / 2);
        } else {
          ctx.fillStyle = isRowInActiveSel ? theme.dom.accentColor : theme.canvas.rowNumberText;
          ctx.font = `${isRowInActiveSel ? '700' : '500'} ${theme.fontSize - 1}px ${theme.fontFamily}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(isRowLoading ? '⟳' : String(r + 1), rowNumW / 2, rowY + rowH / 2);
        }

        // Row number border
        ctx.strokeStyle = theme.canvas.rowNumberBorder;
        ctx.beginPath();
        ctx.moveTo(rowNumW - 0.5, rowY);
        ctx.lineTo(rowNumW - 0.5, rowY + totalRowH);
        ctx.moveTo(0, rowY + totalRowH - 0.5);
        ctx.lineTo(rowNumW, rowY + totalRowH - 0.5);
        ctx.stroke();
      }

      // Frozen column divider shadow
      if (geometry.frozenColumns.length > 0) {
        ctx.save();
        ctx.fillStyle = theme.canvas.frozenDividerShadow;
        ctx.fillRect(geometry.totalFrozenWidth, headerH, 3, height - headerH);
        ctx.restore();
      }

      // ========================================================================
      // FILL HANDLE DRAG PREVIEW RECTANGLE (Excel AutoFill Dashed Box)
      // ========================================================================
      if (fillDragRange && rowCount > 0) {
        const fTopY = headerH + fillDragRange.minRow * rowH - scrollTop;
        const fHeight = (fillDragRange.maxRow - fillDragRange.minRow + 1) * rowH;
        const fLeftRect = geometry.getColumnScreenRect(fillDragRange.minCol, scrollLeft);
        const fRightRect = geometry.getColumnScreenRect(fillDragRange.maxCol, scrollLeft);

        if (fLeftRect && fRightRect) {
          const fLeftX = fLeftRect.x;
          const fWidth = fRightRect.x + fRightRect.width - fLeftRect.x;

          ctx.save();
          ctx.beginPath();
          ctx.rect(rowNumW, headerH, width - rowNumW, height - headerH);
          ctx.clip();

          ctx.fillStyle = theme.isDark ? 'rgba(48, 209, 88, 0.14)' : 'rgba(52, 199, 89, 0.12)';
          ctx.fillRect(fLeftX, fTopY, fWidth, fHeight);

          ctx.strokeStyle = theme.isDark ? '#30D158' : '#28CD41';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 3]);
          ctx.strokeRect(fLeftX, fTopY, fWidth, fHeight);
          ctx.restore();
        }
      }

      // ========================================================================
      // SELECTION HIGHLIGHT, CORNER FILL HANDLE & RIGHT DUPLICATE HANDLE
      // ========================================================================
      const activeViewRowForSel = store.getViewRow(normSel.minRow);
      const isSingleGroupRowSelected =
        normSel.minRow === normSel.maxRow && activeViewRowForSel?.type === 'group';

      if (
        !isSingleGroupRowSelected &&
        rowCount > 0 &&
        normSel.minRow <= endRow &&
        normSel.maxRow >= startRow
      ) {
        const rTopY = headerH + normSel.minRow * rowH - scrollTop;
        const rHeight = (normSel.maxRow - normSel.minRow + 1) * rowH;

        const leftColRect = geometry.getColumnScreenRect(normSel.minCol, scrollLeft);
        const rightColRect = geometry.getColumnScreenRect(normSel.maxCol, scrollLeft);

        if (leftColRect && rightColRect) {
          const rLeftX = leftColRect.x;
          const rWidth = rightColRect.x + rightColRect.width - leftColRect.x;

          ctx.save();
          ctx.beginPath();
          ctx.rect(rowNumW, headerH, width - rowNumW, height - headerH);
          ctx.clip();

          // Selection translucent fill
          ctx.fillStyle = theme.canvas.selectionFill;
          ctx.fillRect(rLeftX, rTopY, rWidth, rHeight);

          // Selection border
          ctx.strokeStyle = theme.canvas.selectionBorder;
          ctx.lineWidth = 2;
          ctx.strokeRect(rLeftX, rTopY, rWidth, rHeight);

          const activeColDef = geometry.columns[normSel.maxCol];
          const activeColType = (activeColDef?.type || '').toLowerCase();
          const isSpecialNonDuplicatable =
            !activeColDef ||
            activeColType === 'sparkline' ||
            activeColType === 'action' ||
            activeColType === 'pdf' ||
            this.isColumnReadonly(activeColDef, permissions);

          const canDuplicate =
            !isSpecialNonDuplicatable &&
            permissions?.mode !== 'read' &&
            permissions?.mode !== 'readonly' &&
            permissions?.allowUpdating !== false &&
            permissions?.allowDuplicating !== false;

          if (canDuplicate) {
            // 1. Bottom-Right Corner Fill Handle (Excel Square)
            const fhSize = 8;
            const fhX = rLeftX + rWidth - fhSize / 2;
            const fhY = rTopY + rHeight - fhSize / 2;
            ctx.fillStyle = theme.canvas.fillHandleColor;
            ctx.fillRect(fhX, fhY, fhSize, fhSize);
            ctx.strokeStyle = theme.canvas.bg;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(fhX, fhY, fhSize, fhSize);

            // 2. Right-Side Quick Cell Duplicate Handle ("+" pill on right edge)
            const dupSize = 14;
            const dupX = rLeftX + rWidth - dupSize / 2;
            const dupY = rTopY + rHeight / 2 - dupSize / 2;

            ctx.fillStyle = theme.dom.accentColor;
            ctx.beginPath();
            ctx.roundRect(dupX, dupY, dupSize, dupSize, 4);
            ctx.fill();

            ctx.strokeStyle = theme.canvas.bg;
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Draw tiny '+' inside the right duplicate handle
            const cx = dupX + dupSize / 2;
            const cy = dupY + dupSize / 2;
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx - 3, cy);
            ctx.lineTo(cx + 3, cy);
            ctx.moveTo(cx, cy - 3);
            ctx.lineTo(cx, cy + 3);
            ctx.stroke();
          }

          ctx.restore();
        }
      }

      // ========================================================================
      // EMPTY STATE (WHEN ROW COUNT === 0)
      // ========================================================================
      if (rowCount === 0) {
        const isTR = locale.code.startsWith('tr');
        // Draw subtle faint grid lines in background
        ctx.strokeStyle = theme.canvas.gridLine;
        ctx.lineWidth = 1;
        const maxEmptyRows = Math.floor((height - headerH) / rowH);
        for (let er = 1; er <= maxEmptyRows; er++) {
          const ey = headerH + er * rowH - 0.5;
          ctx.beginPath();
          ctx.moveTo(0, ey);
          ctx.lineTo(width, ey);
          ctx.stroke();
        }

        // Draw Empty State Card in center of viewport
        const cardW = Math.min(440, width - 40);
        const cardH = 110;
        const cardX = Math.max(20, (width - cardW) / 2);
        const cardY = Math.max(headerH + 20, headerH + (height - headerH - cardH) / 2);

        ctx.save();
        ctx.fillStyle = theme.isDark ? 'rgba(17, 24, 39, 0.92)' : 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = theme.canvas.headerBorder;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = theme.dom.accentColor;
        ctx.font = `700 14px ${theme.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          isTR ? 'Tabloda Görüntülenecek Veri Bulunmuyor (0 Satır)' : 'No Records to Display (0 Rows)',
          cardX + cardW / 2,
          cardY + 38
        );

        ctx.fillStyle = theme.canvas.rowNumberText;
        ctx.font = `500 12px ${theme.fontFamily}`;
        ctx.fillText(
          isTR
            ? "Yeni kayıt oluşturmak için üstteki '+ Satır Ekle' butonunu veya Sihirbazı kullanın."
            : "Click '+ Add Row' in the toolbar or use the Studio Wizard to populate records.",
          cardX + cardW / 2,
          cardY + 68
        );
        ctx.restore();
      }

      // ========================================================================
      // COLUMN HEADERS (FIXED AT TOP)
      // ========================================================================
      this.renderHeaders(
        ctx,
        geometry,
        store,
        theme,
        scrollLeft,
        width,
        headerH,
        rowNumW,
        sortRules,
        normSel,
        hoveredFilterColIndex,
        activeFilterColumnIds,
        permissions,
        selectionMode,
        selectedRowKeys
      );
    } finally {
      ctx.restore();
    }
  }

  private static renderCell(
    ctx: CanvasRenderingContext2D,
    rowData: Record<string, any>,
    rowKey: any,
    rowIndex: number,
    col: ColumnDef,
    colIdx: number,
    cellX: number,
    rowY: number,
    colW: number,
    rowH: number,
    theme: IGridThemeTokens,
    locale: IGridLocale,
    selection: SelectionModel,
    store: IDataStore,
    hoveredCell?: { row: number; col: number } | null,
    searchKeyword?: string,
    isRowInserted?: boolean,
    isRowLoading?: boolean,
    permissions?: GridPermissions,
    selectionMode: RowSelectionMode = 'none',
    selectedRowKeys?: Set<any>,
    colStyle?: ResolvedColumnStyle
  ): void {
    const cellVal = typeof rowData[col.id] === 'function' ? undefined : rowData[col.id];
    const isHovered = hoveredCell?.row === rowIndex && hoveredCell?.col === colIdx;
    const isRowSelectedByCheck = selectedRowKeys?.has(rowKey) ?? false;
    const isReadonly =
      this.isColumnReadonly(col, permissions) ||
      (col.canEdit ? !col.canEdit(rowData, col) : false);
    const isDirty = store.isCellDirty?.(rowKey, col.id) ?? false;
    const isColDirty = store.isColumnDirty?.(col.id) ?? false;

    // Theme-aware column cell background (from column or parent group)
    if (col.id !== '__selection__' && colStyle?.columnBg) {
      ctx.fillStyle = colStyle.columnBg;
      ctx.fillRect(cellX, rowY, colW, rowH);
    }

    // Row selection tint when selected via Single / Multiple Choice
    if (isRowSelectedByCheck) {
      ctx.fillStyle = theme.isDark ? 'rgba(56, 189, 248, 0.14)' : 'rgba(2, 132, 199, 0.10)';
      ctx.fillRect(cellX, rowY, colW, rowH);
    }

    // Synthetic Row Selection Column ('__selection__')
    if (col.id === '__selection__') {
      const cx = cellX + colW / 2;
      const cy = rowY + rowH / 2;
      ctx.save();
      if (selectionMode === 'single') {
        const radius = 7.5;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = isRowSelectedByCheck
          ? theme.isDark
            ? 'rgba(56, 189, 248, 0.2)'
            : 'rgba(2, 132, 199, 0.15)'
          : theme.dom.inputBg;
        ctx.fill();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = isRowSelectedByCheck ? theme.dom.accentColor : theme.canvas.headerBorder;
        ctx.stroke();

        if (isRowSelectedByCheck) {
          ctx.beginPath();
          ctx.arc(cx, cy, 4, 0, Math.PI * 2);
          ctx.fillStyle = theme.dom.accentColor;
          ctx.fill();
        }
      } else {
        const boxSize = 15;
        const bx = cx - boxSize / 2;
        const by = cy - boxSize / 2;
        ctx.beginPath();
        ctx.roundRect(bx, by, boxSize, boxSize, 4);
        if (isRowSelectedByCheck) {
          ctx.fillStyle = theme.dom.accentColor;
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(bx + 3.5, cy);
          ctx.lineTo(bx + 6.5, cy + 3);
          ctx.lineTo(bx + 11.5, cy - 3);
          ctx.stroke();
        } else {
          ctx.fillStyle = theme.dom.inputBg;
          ctx.fill();
          ctx.strokeStyle = isHovered ? theme.dom.accentColor : theme.canvas.headerBorder;
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      }
      ctx.restore();

      // Cell Grid Lines
      ctx.strokeStyle = theme.canvas.gridLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cellX + colW - 0.5, rowY);
      ctx.lineTo(cellX + colW - 0.5, rowY + rowH);
      ctx.moveTo(cellX, rowY + rowH - 0.5);
      ctx.lineTo(cellX + colW, rowY + rowH - 0.5);
      ctx.stroke();
      return;
    }

    // DevExtreme-style background for dirty cells (dx-cell-modified), dirty columns, inserted rows, loading, or readonly
    if (isRowLoading) {
      ctx.fillStyle = theme.isDark ? 'rgba(255, 159, 10, 0.14)' : 'rgba(255, 149, 0, 0.10)';
      ctx.fillRect(cellX, rowY, colW, rowH);
    } else if (isDirty) {
      // DevExtreme dx-cell-modified distinct green highlight
      ctx.fillStyle = theme.isDark ? 'rgba(34, 197, 94, 0.22)' : 'rgba(22, 163, 74, 0.15)';
      ctx.fillRect(cellX, rowY, colW, rowH);
    } else if (isRowInserted) {
      // DevExtreme dx-row-inserted highlight
      ctx.fillStyle = theme.isDark ? 'rgba(48, 209, 88, 0.10)' : 'rgba(52, 199, 89, 0.08)';
      ctx.fillRect(cellX, rowY, colW, rowH);
    } else if (isColDirty) {
      // Subtle column-wide tint when this column has uncommitted modifications
      ctx.fillStyle = theme.isDark ? 'rgba(34, 197, 94, 0.05)' : 'rgba(22, 163, 74, 0.04)';
      ctx.fillRect(cellX, rowY, colW, rowH);
    }

    // Search keyword highlight
    if (
      searchKeyword &&
      cellVal != null &&
      String(cellVal).toLowerCase().includes(searchKeyword.toLowerCase())
    ) {
      ctx.fillStyle = theme.canvas.searchHighlight;
      ctx.fillRect(cellX, rowY, colW, rowH);
    }

    // Column type plugin paint (with optional theme-aware columnText override)
    const effectiveTheme = colStyle?.columnText
      ? {
        ...theme,
        canvas: {
          ...theme.canvas,
          cellText: colStyle.columnText,
        },
      }
      : theme;
    const plugin = ColumnTypeRegistry.get(col.type);
    plugin.paint({
      ctx,
      value: cellVal,
      row: rowData,
      rowIndex,
      column: col,
      theme: effectiveTheme,
      locale,
      x: cellX,
      y: rowY,
      width: colW,
      height: rowH,
      isSelected: selection.isCellSelected(rowIndex, colIdx),
      isHovered,
      isReadonly,
      isDirty,
    });

    // DevExtreme dx-cell-modified Crisp Green Cell Border + Top-Right Triangle Indicator
    if (isDirty) {
      ctx.save();
      const dirtyStroke = theme.isDark ? '#22C55E' : '#16A34A';
      ctx.strokeStyle = dirtyStroke;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cellX + 0.75, rowY + 0.75, colW - 1.5, rowH - 1.5);

      ctx.fillStyle = dirtyStroke;
      ctx.beginPath();
      ctx.moveTo(cellX + colW - 8, rowY);
      ctx.lineTo(cellX + colW, rowY);
      ctx.lineTo(cellX + colW, rowY + 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Cell Grid Lines
    ctx.strokeStyle = theme.canvas.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cellX + colW - 0.5, rowY);
    ctx.lineTo(cellX + colW - 0.5, rowY + rowH);
    ctx.moveTo(cellX, rowY + rowH - 0.5);
    ctx.lineTo(cellX + colW, rowY + rowH - 0.5);
    ctx.stroke();
  }

  /**
   * Draws a pixel-crisp Google Material Symbols style lock icon (11x12 px) on HTML5 Canvas.
   */
  public static drawGoogleLockIcon(
    ctx: CanvasRenderingContext2D,
    x: number,
    centerY: number,
    color: string
  ): void {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    const iconTop = centerY - 5.5;
    const bodyW = 9.5;
    const bodyH = 6.5;
    const bodyX = x + 0.5;
    const bodyY = iconTop + 4.5;
    const centerX = x + 5.25;
    // 1. Shackle (Google Material rounded arch)
    ctx.lineWidth = 1.35;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(centerX, iconTop + 2.8, 2.7, Math.PI, 0, false);
    ctx.lineTo(centerX + 2.7, bodyY + 0.5);
    ctx.moveTo(centerX - 2.7, iconTop + 2.8);
    ctx.lineTo(centerX - 2.7, bodyY + 0.5);
    ctx.stroke();
    // 2. Padlock Body
    ctx.beginPath();
    ctx.roundRect(bodyX, bodyY, bodyW, bodyH, 1.8);
    ctx.fill();
    // 3. Keyhole cutout (Google Material style)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(centerX, bodyY + 2.3, 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(centerX - 0.5, bodyY + 2.3, 1.0, 1.7);
    ctx.restore();
  }

  private static renderHeaders(
    ctx: CanvasRenderingContext2D,
    geometry: GeometryEngine,
    store: IDataStore,
    theme: IGridThemeTokens,
    scrollLeft: number,
    width: number,
    headerH: number,
    rowNumW: number,
    sortRules: SortDescriptor[],
    normSel: { minRow: number; maxRow: number; minCol: number; maxCol: number },
    hoveredFilterColIndex?: number | null,
    activeFilterColumnIds?: Set<string>,
    permissions?: GridPermissions,
    selectionMode: RowSelectionMode = 'none',
    selectedRowKeys?: Set<any>
  ): void {
    const rowCount = store.getRowCount();
    const hasGroups = geometry.hasColumnGroups;
    const groupH = hasGroups ? geometry.groupHeaderHeight : 0;
    const colHeaderH = hasGroups ? geometry.baseHeaderHeight : headerH;

    // 1. SCROLLABLE HEADERS
    ctx.save();
    ctx.beginPath();
    ctx.rect(geometry.totalFrozenWidth, 0, Math.max(0, width - geometry.totalFrozenWidth), headerH);
    ctx.clip();

    ctx.fillStyle = theme.canvas.headerBg;
    ctx.fillRect(geometry.totalFrozenWidth, 0, Math.max(0, width - geometry.totalFrozenWidth), headerH);

    // 1a. Scrollable Column Group Bands (Top Band)
    if (hasGroups) {
      this.renderColumnGroupBands(
        ctx,
        geometry.scrollableColumns,
        geometry.frozenColumns.length,
        (idx) => geometry.totalFrozenWidth + geometry.scrollableColOffsets[idx] - scrollLeft,
        groupH,
        theme,
        normSel,
        geometry,
        geometry.totalFrozenWidth,
        width
      );
    }

    // 1b. Scrollable Individual Column Headers
    for (let i = 0; i < geometry.scrollableColumns.length; i++) {
      const col = geometry.scrollableColumns[i];
      const colIdx = geometry.frozenColumns.length + i;
      const x = geometry.totalFrozenWidth + geometry.scrollableColOffsets[i] - scrollLeft;
      const groupDef = hasGroups ? geometry.getColumnGroup(col) : undefined;
      const colStyle = ColumnColorEngine.resolveColumnStyle(col, groupDef, theme.isDark);
      const colY = groupDef ? groupH : 0;
      const colH = groupDef ? colHeaderH : headerH;

      this.renderSingleHeader(
        ctx,
        col,
        colIdx,
        x,
        colY,
        col.width,
        colH,
        theme,
        sortRules,
        colIdx >= normSel.minCol && colIdx <= normSel.maxCol,
        hoveredFilterColIndex === colIdx,
        activeFilterColumnIds?.has(col.id) ?? false,
        store.isColumnDirty?.(col.id) ?? false,
        permissions,
        selectionMode,
        selectedRowKeys?.size || 0,
        rowCount,
        colStyle,
        Boolean(groupDef)
      );
    }
    ctx.restore();

    // 2. FROZEN HEADERS
    const frozenXOffsets: number[] = [];
    let accFrozenX = rowNumW;
    for (let i = 0; i < geometry.frozenColumns.length; i++) {
      frozenXOffsets.push(accFrozenX);
      accFrozenX += geometry.frozenColumns[i].width;
    }

    let curX = rowNumW;
    for (let i = 0; i < geometry.frozenColumns.length; i++) {
      const col = geometry.frozenColumns[i];
      ctx.fillStyle = theme.canvas.headerBg;
      ctx.fillRect(curX, 0, col.width, headerH);
      curX += col.width;
    }

    // 2a. Frozen Column Group Bands (Top Band)
    if (hasGroups && geometry.frozenColumns.length > 0) {
      this.renderColumnGroupBands(
        ctx,
        geometry.frozenColumns,
        0,
        (idx) => frozenXOffsets[idx],
        groupH,
        theme,
        normSel,
        geometry,
        rowNumW,
        geometry.totalFrozenWidth
      );
    }

    // 2b. Frozen Individual Column Headers
    curX = rowNumW;
    for (let i = 0; i < geometry.frozenColumns.length; i++) {
      const col = geometry.frozenColumns[i];
      const groupDef = hasGroups ? geometry.getColumnGroup(col) : undefined;
      const colStyle = ColumnColorEngine.resolveColumnStyle(col, groupDef, theme.isDark);
      const colY = groupDef ? groupH : 0;
      const colH = groupDef ? colHeaderH : headerH;

      this.renderSingleHeader(
        ctx,
        col,
        i,
        curX,
        colY,
        col.width,
        colH,
        theme,
        sortRules,
        i >= normSel.minCol && i <= normSel.maxCol,
        hoveredFilterColIndex === i,
        activeFilterColumnIds?.has(col.id) ?? false,
        store.isColumnDirty?.(col.id) ?? false,
        permissions,
        selectionMode,
        selectedRowKeys?.size || 0,
        rowCount,
        colStyle,
        Boolean(groupDef)
      );
      curX += col.width;
    }

    // 3. TOP-LEFT CORNER BOX (Select All)
    ctx.fillStyle = theme.canvas.rowNumberBg;
    ctx.fillRect(0, 0, rowNumW, headerH);
    ctx.strokeStyle = theme.canvas.headerBorder;
    ctx.strokeRect(0, 0, rowNumW, headerH);

    // Draw subtle corner triangle in top-left select-all box
    ctx.fillStyle = theme.isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.moveTo(rowNumW - 8, headerH - 16);
    ctx.lineTo(rowNumW - 8, headerH - 6);
    ctx.lineTo(rowNumW - 18, headerH - 6);
    ctx.closePath();
    ctx.fill();

    // Frozen header divider shadow
    if (geometry.frozenColumns.length > 0) {
      ctx.save();
      ctx.fillStyle = theme.canvas.frozenDividerShadow;
      ctx.fillRect(geometry.totalFrozenWidth, 0, 3, headerH);
      ctx.restore();
    }
  }

  private static renderColumnGroupBands(
    ctx: CanvasRenderingContext2D,
    columns: ColumnDef[],
    colOffsetStartIdx: number,
    getColX: (localIdx: number) => number,
    groupH: number,
    theme: IGridThemeTokens,
    normSel: { minRow: number; maxRow: number; minCol: number; maxCol: number },
    geometry: GeometryEngine,
    minVisibleX: number = 0,
    maxVisibleX: number = 99999
  ): void {
    let i = 0;
    while (i < columns.length) {
      const col = columns[i];
      const groupDef = geometry.getColumnGroup(col);
      if (!groupDef) {
        i++;
        continue;
      }

      let j = i;
      let spanWidth = col.width;
      while (j + 1 < columns.length) {
        const nextGroup = geometry.getColumnGroup(columns[j + 1]);
        if (nextGroup && nextGroup.id === groupDef.id) {
          j++;
          spanWidth += columns[j].width;
        } else {
          break;
        }
      }

      const spanX = getColX(i);
      const startGlobalCol = colOffsetStartIdx + i;
      const endGlobalCol = colOffsetStartIdx + j;
      const isGroupActive =
        normSel.maxCol >= startGlobalCol && normSel.minCol <= endGlobalCol;

      const groupStyle = ColumnColorEngine.resolveGroupStyle(groupDef, theme.isDark);
      this.renderSingleGroupHeaderBand(
        ctx,
        groupDef,
        groupStyle,
        spanX,
        0,
        spanWidth,
        groupH,
        theme,
        isGroupActive,
        minVisibleX,
        maxVisibleX
      );

      i = j + 1;
    }
  }

  private static renderSingleGroupHeaderBand(
    ctx: CanvasRenderingContext2D,
    groupDef: ColumnGroupDef,
    groupStyle: ResolvedGroupHeaderStyle,
    x: number,
    y: number,
    w: number,
    h: number,
    theme: IGridThemeTokens,
    isGroupActive: boolean,
    minVisibleX: number = 0,
    maxVisibleX: number = 99999
  ): void {
    ctx.save();

    // 1. Group Band Background
    ctx.fillStyle =
      groupStyle.headerBg ||
      (theme.isDark ? 'rgba(255, 255, 255, 0.045)' : 'rgba(15, 23, 42, 0.04)');
    ctx.fillRect(x, y, w, h);

    if (isGroupActive && !groupStyle.headerBg) {
      ctx.fillStyle = theme.isDark ? 'rgba(10, 132, 255, 0.12)' : 'rgba(0, 122, 255, 0.07)';
      ctx.fillRect(x, y, w, h);
    }

    // 2. Top Accent Border (1px crisp hairline)
    const accentColor = groupStyle.headerAccent || (isGroupActive ? theme.dom.accentColor : undefined);
    if (accentColor) {
      ctx.save();
      ctx.globalAlpha = 0.65;
      ctx.fillStyle = accentColor;
      ctx.fillRect(x, y, w, 1);
      ctx.restore();
    }

    // 3. Borders (Right & Bottom Divider)
    ctx.strokeStyle = groupStyle.borderColor || theme.canvas.headerBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + w - 0.5, y);
    ctx.lineTo(x + w - 0.5, y + h);
    ctx.moveTo(x, y + h - 0.5);
    ctx.lineTo(x + w, y + h - 0.5);
    ctx.stroke();

    // 4. Sticky Viewport-Clamped Group Title & Color Dot
    const visStart = Math.max(x, minVisibleX);
    const visEnd = Math.min(x + w, maxVisibleX);
    const visW = Math.max(0, visEnd - visStart);

    if (visW >= 24) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(visStart + 6, y, Math.max(0, visW - 12), h);
      ctx.clip();

      const textColor = groupStyle.headerText || theme.canvas.headerText;
      ctx.fillStyle = textColor;
      ctx.font = `700 ${Math.max(10, theme.headerFontSize - 1)}px ${theme.fontFamily}`;
      ctx.textBaseline = 'middle';

      const align = groupDef.align || 'center';
      const cy = y + h / 2 + 0.5;

      if (align === 'left') {
        let textX = visStart + 10;
        if (accentColor && visW >= 90) {
          ctx.beginPath();
          ctx.arc(textX + 3, cy, 3.2, 0, Math.PI * 2);
          ctx.fillStyle = accentColor;
          ctx.fill();
          textX += 11;
        }
        ctx.fillStyle = textColor;
        ctx.textAlign = 'left';
        ctx.fillText(groupDef.title, textX, cy);
      } else if (align === 'right') {
        ctx.textAlign = 'right';
        ctx.fillText(groupDef.title, visEnd - 10, cy);
      } else {
        ctx.textAlign = 'center';
        const titleMetrics = ctx.measureText(groupDef.title);
        const totalTitleW = titleMetrics.width;
        const centerX = visStart + visW / 2;
        if (accentColor && visW >= totalTitleW + 30) {
          const dotX = centerX - totalTitleW / 2 - 7;
          ctx.beginPath();
          ctx.arc(dotX, cy, 3.2, 0, Math.PI * 2);
          ctx.fillStyle = accentColor;
          ctx.fill();
          ctx.fillStyle = textColor;
          ctx.fillText(groupDef.title, centerX + 4, cy);
        } else if (visW < totalTitleW + 16) {
          ctx.textAlign = 'left';
          ctx.fillText(groupDef.title, visStart + 8, cy);
        } else {
          ctx.fillText(groupDef.title, centerX, cy);
        }
      }

      ctx.restore();
    }

    ctx.restore();
  }

  private static renderSingleHeader(
    ctx: CanvasRenderingContext2D,
    col: ColumnDef,
    colIdx: number,
    x: number,
    y: number,
    w: number,
    h: number,
    theme: IGridThemeTokens,
    sortRules: SortDescriptor[],
    isColSelected: boolean,
    isFilterHovered: boolean,
    isFilterActive: boolean,
    isColumnDirty: boolean,
    permissions?: GridPermissions,
    selectionMode: RowSelectionMode = 'none',
    selectedCount: number = 0,
    totalRowCount: number = 0,
    colStyle?: ResolvedColumnStyle,
    hasParentGroup: boolean = false
  ): void {
    ctx.save();

    // Custom theme-aware column header background
    if (col.id !== '__selection__' && colStyle?.headerBg) {
      ctx.fillStyle = colStyle.headerBg;
      ctx.fillRect(x, y, w, h);
    }

    if (isColumnDirty) {
      ctx.fillStyle = theme.isDark ? 'rgba(34, 197, 94, 0.16)' : 'rgba(22, 163, 74, 0.12)';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = theme.isDark ? '#22C55E' : '#16A34A';
      ctx.fillRect(x, y, w, 1.5);
    } else if (isColSelected) {
      ctx.fillStyle = theme.isDark ? 'rgba(10, 132, 255, 0.12)' : 'rgba(0, 122, 255, 0.07)';
      ctx.fillRect(x, y, w, h);
    }

    // Top accent border on ungrouped colored column headers (1px crisp hairline)
    if (!isColumnDirty && !hasParentGroup && colStyle?.headerAccent && col.id !== '__selection__') {
      ctx.save();
      ctx.globalAlpha = 0.65;
      ctx.fillStyle = colStyle.headerAccent;
      ctx.fillRect(x, y, w, 1);
      ctx.restore();
    }

    // Borders
    ctx.strokeStyle = colStyle?.borderColor || theme.canvas.headerBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + w - 0.5, y);
    ctx.lineTo(x + w - 0.5, y + h);
    ctx.moveTo(x, y + h - 0.5);
    ctx.lineTo(x + w, y + h - 0.5);
    ctx.stroke();

    // Synthetic Row Selection Header ('__selection__')
    if (col.id === '__selection__') {
      const cx = x + w / 2;
      const cy = y + h / 2;
      if (selectionMode === 'single') {
        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        ctx.strokeStyle = theme.canvas.headerText;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = theme.canvas.headerText;
        ctx.fill();
      } else {
        const boxSize = 15;
        const bx = cx - boxSize / 2;
        const by = cy - boxSize / 2;
        const isAllSelected = totalRowCount > 0 && selectedCount >= totalRowCount;
        const isSomeSelected = selectedCount > 0 && selectedCount < totalRowCount;
        ctx.beginPath();
        ctx.roundRect(bx, by, boxSize, boxSize, 4);
        if (isAllSelected || isSomeSelected) {
          ctx.fillStyle = theme.dom.accentColor;
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.beginPath();
          if (isAllSelected) {
            ctx.moveTo(bx + 3.5, cy);
            ctx.lineTo(bx + 6.5, cy + 3);
            ctx.lineTo(bx + 11.5, cy - 3);
          } else {
            ctx.moveTo(bx + 3.5, cy);
            ctx.lineTo(bx + 11.5, cy);
          }
          ctx.stroke();
        } else {
          ctx.fillStyle = theme.dom.inputBg;
          ctx.fill();
          ctx.strokeStyle = theme.canvas.headerBorder;
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      }
      ctx.restore();
      return;
    }

    // Active column bottom highlight bar
    if (isColSelected) {
      ctx.fillStyle = colStyle?.headerAccent || theme.dom.accentColor;
      ctx.fillRect(x, y + h - 2, w, 2);
    }

    const isReadonly = this.isColumnReadonly(col, permissions);
    const isFilterable =
      col.filterable !== false && col.type !== 'sparkline' && col.type !== 'action';
    const sortIndex = sortRules.findIndex((s) => s.selector === col.id);

    const rightReserved = (isFilterable ? 28 : 8) + (sortIndex !== -1 ? 18 : 0);

    // Header Title + Optional Readonly Lock Icon
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 8, y, Math.max(0, w - rightReserved - 8), h);
    ctx.clip();

    ctx.fillStyle = colStyle?.headerText || theme.canvas.headerText;
    ctx.font = `600 ${theme.headerFontSize}px ${theme.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    let titleX = x + 8;
    if (isReadonly && col.type !== 'action' && col.type !== 'sparkline') {
      const lockColor = colStyle?.headerAccent || (theme.isDark ? '#fbbf24' : '#d97706');
      CanvasRenderer.drawGoogleLockIcon(ctx, titleX, y + h / 2, lockColor);
      titleX += 14;
    }
    const safeTitle = typeof col.title === 'string' && col.title.trim() !== '' ? col.title : (col.id === 'constructor' ? 'Constructor' : String(col.id || ''));
    ctx.fillText(safeTitle, titleX, y + h / 2);
    ctx.restore();

    // Sort Arrow
    if (sortIndex !== -1) {
      const sort = sortRules[sortIndex];
      ctx.save();
      ctx.fillStyle = colStyle?.headerAccent || theme.dom.accentColor;
      ctx.font = `700 10px ${theme.fontFamily}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const arrow = sort.desc ? '▼' : '▲';
      const badge = sortRules.length > 1 ? `${arrow}${sortIndex + 1}` : arrow;
      ctx.fillText(badge, x + w - (isFilterable ? 28 : 8), y + h / 2);
      ctx.restore();
    }

    // Filter Funnel Button (Easy-to-click 22x22 button box)
    if (isFilterable && w >= 48) {
      const btnSize = 20;
      const btnX = x + w - btnSize - 5;
      const btnY = y + (h - btnSize) / 2;

      ctx.save();
      if (isFilterActive) {
        ctx.fillStyle = colStyle?.headerAccent || theme.dom.accentColor;
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnSize, btnSize, 5);
        ctx.fill();
      } else if (isFilterHovered) {
        ctx.fillStyle = theme.isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)';
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnSize, btnSize, 5);
        ctx.fill();
      }

      const fx = btnX + btnSize / 2;
      const fy = btnY + btnSize / 2;
      ctx.fillStyle = isFilterActive
        ? '#FFFFFF'
        : isFilterHovered
          ? colStyle?.headerText || theme.canvas.headerText
          : colStyle?.headerText
            ? colStyle.headerText
            : theme.isDark
              ? '#98989D'
              : '#8E8E93';
      if (!isFilterActive && !isFilterHovered && colStyle?.headerText) {
        ctx.globalAlpha = 0.72;
      }

      ctx.beginPath();
      ctx.moveTo(fx - 5, fy - 4);
      ctx.lineTo(fx + 5, fy - 4);
      ctx.lineTo(fx + 1.5, fy + 0.5);
      ctx.lineTo(fx + 1.5, fy + 4.5);
      ctx.lineTo(fx - 1.5, fy + 3.5);
      ctx.lineTo(fx - 1.5, fy + 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }
}
