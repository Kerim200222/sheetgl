import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { ColumnDef, ColumnGroupDef, RowSelectionMode } from '../types/grid';
import { GeometryEngine } from '../core/GeometryEngine';

export interface UseGridGeometryOptions {
  userColumns: ColumnDef[];
  rowHeight?: number;
  headerHeight?: number;
  columnGroups?: ColumnGroupDef[];
  groupHeaderHeight?: number;
  rowSelectionMode?: RowSelectionMode;
  rowCount?: number;
  storageKey?: string;
  onRequestRender?: () => void;
  onActiveOverlayClear?: () => void;
  onColumnResize?: (colId: string, newWidth: number) => void;
  onColumnOrderChange?: (columnIds: string[], reorderedColumns: ColumnDef[]) => void;
  onScrollChange?: (pos: { top: number; left: number }) => void;
}

export interface ColumnResizeState {
  colIndex: number;
  colId: string;
  startX: number;
  initialWidth: number;
}

export interface UseGridGeometryReturn {
  // DOM element refs
  containerRef: React.RefObject<HTMLDivElement | null>;
  gridSurfaceRef: React.RefObject<HTMLDivElement | null>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;

  // Core Geometry Engine & Columns
  geometryRef: React.MutableRefObject<GeometryEngine>;
  columns: ColumnDef[];
  effectiveColumns: ColumnDef[];
  setColumns: React.Dispatch<React.SetStateAction<ColumnDef[]>>;
  updateColumnDef: (colId: string, patch: Partial<ColumnDef>) => void;
  setColumnWidth: (colId: string, width: number) => void;
  getColumnWidth: (colId: string) => number | undefined;
  reorderColumn: (sourceColId: string, targetColId: string, insertAfter: boolean) => void;
  resetColumnOrder: () => void;

  // Resizing state
  resizingCol: ColumnResizeState | null;
  setResizingCol: React.Dispatch<React.SetStateAction<ColumnResizeState | null>>;

  // Scroll Position & Indicators
  scrollPosRef: React.MutableRefObject<{ left: number; top: number }>;
  scrollIndicator: { visible: boolean; row: number };
  setScrollIndicator: React.Dispatch<React.SetStateAction<{ visible: boolean; row: number }>>;

  // Handlers & Helpers
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  ensureCellVisible: (row: number, col: number) => void;
  scrollTo: (options: { top?: number; left?: number; behavior?: ScrollBehavior }) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  getViewportCoords: (e: React.MouseEvent) => { x: number; y: number; onScrollbar: boolean };
  checkEdgeAutoScroll: (x: number, y: number, rect: DOMRect) => void;

  // Total Virtual Dimensions
  getTotalWidth: () => number;
  getTotalHeight: (rowCount: number) => number;
}

export function useGridGeometry({
  userColumns,
  rowHeight = 34,
  headerHeight = 38,
  columnGroups = [],
  groupHeaderHeight = 30,
  rowSelectionMode = 'none',
  rowCount = 0,
  storageKey,
  onRequestRender,
  onActiveOverlayClear,
  onColumnResize,
  onColumnOrderChange,
  onScrollChange,
}: UseGridGeometryOptions): UseGridGeometryReturn {
  const readSavedColumnOrder = useCallback((key?: string): string[] | null => {
    if (!key) return null;
    try {
      const raw = localStorage.getItem(`sheetgl_state_v1_${key}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.columnOrder) && parsed.columnOrder.length > 0) {
          return parsed.columnOrder;
        }
      }
    } catch {}
    return null;
  }, []);

  const [customColumnOrder, setCustomColumnOrder] = useState<string[] | null>(() =>
    readSavedColumnOrder(storageKey)
  );
  const [prevStorageKey, setPrevStorageKey] = useState<string | undefined>(storageKey);

  if (prevStorageKey !== storageKey) {
    setPrevStorageKey(storageKey);
    setCustomColumnOrder(readSavedColumnOrder(storageKey));
  }

  // 1. Column state synced with props synchronously during render
  const [columns, setColumns] = useState<ColumnDef[]>(userColumns);
  const [prevUserColumns, setPrevUserColumns] = useState<ColumnDef[]>(userColumns);

  if (prevUserColumns !== userColumns) {
    setPrevUserColumns(userColumns);
    setColumns(userColumns);
  }

  // Derived effective columns with custom drag-and-drop ordering and checkbox selection column
  const effectiveColumns = useMemo<ColumnDef[]>(() => {
    const baseCols = prevUserColumns !== userColumns ? userColumns : columns;
    let activeCols = baseCols;

    if (customColumnOrder && customColumnOrder.length > 0) {
      const orderMap = new Map<string, number>();
      customColumnOrder.forEach((id, idx) => orderMap.set(id, idx));
      const origIndexMap = new Map<string, number>();
      baseCols.forEach((c, idx) => origIndexMap.set(c.id, idx));

      activeCols = [...baseCols].sort((a, b) => {
        const idxA = orderMap.get(a.id);
        const idxB = orderMap.get(b.id);
        if (idxA !== undefined && idxB !== undefined) return idxA - idxB;
        if (idxA !== undefined) return -1;
        if (idxB !== undefined) return 1;
        return (origIndexMap.get(a.id) ?? 0) - (origIndexMap.get(b.id) ?? 0);
      });
    }

    if (rowSelectionMode === 'single' || rowSelectionMode === 'multiple') {
      const selCol: ColumnDef = {
        id: '__selection__',
        title: '',
        type: 'boolean',
        width: 42,
        pinned: 'left',
        sortable: false,
        filterable: false,
        groupable: false,
        readonly: true,
      };
      return [selCol, ...activeCols.filter((c) => c.id !== '__selection__')];
    }
    return activeCols;
  }, [columns, userColumns, prevUserColumns, customColumnOrder, rowSelectionMode]);

  // 2. Geometry Engine reference
  const geometryRef = useRef<GeometryEngine>(
    new GeometryEngine(effectiveColumns, rowHeight, headerHeight, columnGroups, groupHeaderHeight)
  );

  // Synchronously update geometry during render so canvas and summary row always have up-to-date column bounds
  geometryRef.current.rowHeight = rowHeight;
  geometryRef.current.setBaseHeaderHeight(headerHeight);
  geometryRef.current.setColumnGroups(columnGroups, groupHeaderHeight);
  geometryRef.current.setColumns(effectiveColumns);

  const readSavedScroll = useCallback((key?: string): { left: number; top: number } => {
    if (!key) return { left: 0, top: 0 };
    try {
      const raw = localStorage.getItem(`sheetgl_state_v1_${key}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          left: typeof parsed.scrollLeft === 'number' && parsed.scrollLeft >= 0 ? parsed.scrollLeft : 0,
          top: typeof parsed.scrollTop === 'number' && parsed.scrollTop >= 0 ? parsed.scrollTop : 0,
        };
      }
    } catch {}
    return { left: 0, top: 0 };
  }, []);

  const initialSavedScroll = useMemo(() => readSavedScroll(storageKey), [storageKey, readSavedScroll]);

  const pendingScrollRestoreRef = useRef<{
    key?: string;
    left: number;
    top: number;
    restoredX: boolean;
    restoredY: boolean;
  }>({
    key: storageKey,
    left: initialSavedScroll.left,
    top: initialSavedScroll.top,
    restoredX: initialSavedScroll.left <= 0,
    restoredY: initialSavedScroll.top <= 0,
  });

  // 3. DOM Element Refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gridSurfaceRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // 4. Scroll Tracking & Indicators
  const scrollPosRef = useRef<{ left: number; top: number }>({
    left: initialSavedScroll.left,
    top: initialSavedScroll.top,
  });

  if (pendingScrollRestoreRef.current.key !== storageKey) {
    const nextSaved = readSavedScroll(storageKey);
    pendingScrollRestoreRef.current = {
      key: storageKey,
      left: nextSaved.left,
      top: nextSaved.top,
      restoredX: nextSaved.left <= 0,
      restoredY: nextSaved.top <= 0,
    };
    scrollPosRef.current = {
      left: nextSaved.left,
      top: nextSaved.top,
    };
  }

  useEffect(() => {
    const sc = scrollContainerRef.current;
    const hasScrollableCols = geometryRef.current.totalScrollableWidth > 0 && effectiveColumns.length > 2;
    const hasRows = rowCount > 0;
    const pending = pendingScrollRestoreRef.current;

    if (sc) {
      const totalW = geometryRef.current.totalLeftPinnedWidth + geometryRef.current.totalCenterWidth + geometryRef.current.totalRightPinnedWidth + 18;
      const maxLeft = Math.max(0, totalW - sc.clientWidth);
      const totalH = geometryRef.current.headerHeight + rowCount * geometryRef.current.rowHeight + 18;
      const maxTop = Math.max(0, totalH - sc.clientHeight);

      let nextLeft = sc.scrollLeft;
      let nextTop = sc.scrollTop;

      if (!pending.restoredX) {
        if (hasScrollableCols) {
          nextLeft = maxLeft > 0 ? Math.min(pending.left, maxLeft) : pending.left;
          sc.scrollLeft = nextLeft;
          if (sc.clientWidth > 0 && maxLeft >= 0) {
            pending.restoredX = true;
          }
        } else {
          nextLeft = pending.left;
        }
      } else {
        if (hasScrollableCols && sc.scrollLeft > maxLeft) {
          sc.scrollLeft = maxLeft;
        }
        nextLeft = hasScrollableCols ? Math.min(sc.scrollLeft, maxLeft) : scrollPosRef.current.left;
      }

      if (!pending.restoredY) {
        if (hasRows) {
          nextTop = maxTop > 0 ? Math.min(pending.top, maxTop) : pending.top;
          sc.scrollTop = nextTop;
          if (sc.clientHeight > 0 && maxTop >= 0) {
            pending.restoredY = true;
          }
        } else {
          nextTop = pending.top;
        }
      } else {
        nextTop = hasRows ? sc.scrollTop : scrollPosRef.current.top;
      }

      scrollPosRef.current = {
        left: nextLeft,
        top: nextTop,
      };

      if (hasScrollableCols || hasRows) {
        requestAnimationFrame(() => {
          const domSc = scrollContainerRef.current;
          if (!domSc) return;
          const domTotalW = geometryRef.current.totalLeftPinnedWidth + geometryRef.current.totalCenterWidth + geometryRef.current.totalRightPinnedWidth + 18;
          const domMaxLeft = Math.max(0, domTotalW - domSc.clientWidth);
          const domTotalH = geometryRef.current.headerHeight + rowCount * geometryRef.current.rowHeight + 18;
          const domMaxTop = Math.max(0, domTotalH - domSc.clientHeight);

          if (hasScrollableCols && Math.abs(domSc.scrollLeft - scrollPosRef.current.left) > 1) {
            domSc.scrollLeft = Math.min(scrollPosRef.current.left, domMaxLeft);
            scrollPosRef.current.left = domSc.scrollLeft;
          }
          if (hasRows && Math.abs(domSc.scrollTop - scrollPosRef.current.top) > 1) {
            domSc.scrollTop = Math.min(scrollPosRef.current.top, domMaxTop);
            scrollPosRef.current.top = domSc.scrollTop;
          }
          onRequestRender?.();
        });
      }
    }
    onRequestRender?.();
  }, [effectiveColumns, rowCount, rowHeight, headerHeight, columnGroups, groupHeaderHeight, storageKey, onRequestRender]);
  const [scrollIndicator, setScrollIndicator] = useState<{ visible: boolean; row: number }>({
    visible: false,
    row: 1,
  });
  const scrollIndicatorStateRef = useRef<{ visible: boolean; row: number }>({ visible: false, row: 1 });
  const scrollIndicatorRafRef = useRef<number | null>(null);
  const scrollHideTimerRef = useRef<number | null>(null);

  // 5. Column Resizing State
  const [resizingCol, setResizingCol] = useState<ColumnResizeState | null>(null);
  const latestResizedWidthRef = useRef<{ colId: string; width: number } | null>(null);

  // Column Resizing mouse drag effect
  useEffect(() => {
    if (!resizingCol) return;

    latestResizedWidthRef.current = { colId: resizingCol.colId, width: resizingCol.initialWidth };
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizingCol.startX;
      const newWidth = Math.max(48, resizingCol.initialWidth + deltaX);
      latestResizedWidthRef.current = { colId: resizingCol.colId, width: newWidth };
      setColumns((prev) =>
        prev.map((c) => (c.id === resizingCol.colId ? { ...c, width: newWidth } : c))
      );
    };

    const handleMouseUp = () => {
      if (latestResizedWidthRef.current) {
        onColumnResize?.(latestResizedWidthRef.current.colId, latestResizedWidthRef.current.width);
      }
      setResizingCol(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingCol, onColumnResize]);

  // ResizeObserver on containers
  useEffect(() => {
    const handleResize = () => onRequestRender?.();
    window.addEventListener('resize', handleResize);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => onRequestRender?.());
      if (gridSurfaceRef.current) observer.observe(gridSurfaceRef.current);
      if (containerRef.current) observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer?.disconnect();
    };
  }, [onRequestRender]);

  // 6. Column Mutation Helpers
  const updateColumnDef = useCallback((colId: string, patch: Partial<ColumnDef>) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, ...patch } : c))
    );
  }, []);

  const setColumnWidth = useCallback((colId: string, width: number) => {
    updateColumnDef(colId, { width: Math.max(48, width) });
  }, [updateColumnDef]);

  const getColumnWidth = useCallback((colId: string): number | undefined => {
    return geometryRef.current.columns.find((c) => c.id === colId)?.width;
  }, []);

  const reorderColumn = useCallback(
    (sourceColId: string, targetColId: string, insertAfter: boolean) => {
      if (!sourceColId || !targetColId || sourceColId === targetColId) return;
      if (sourceColId === '__selection__' || targetColId === '__selection__') return;

      const currentVisCols = geometryRef.current.columns.filter((c) => c.id !== '__selection__');
      const sourceCol = currentVisCols.find((c) => c.id === sourceColId);
      const targetCol = currentVisCols.find((c) => c.id === targetColId);
      if (!sourceCol || !targetCol) return;

      const currentVisIds = currentVisCols.map((c) => c.id);
      const baseIds =
        customColumnOrder && customColumnOrder.length > 0
          ? Array.from(new Set([...customColumnOrder, ...currentVisIds]))
          : [...currentVisIds];

      const filteredIds = baseIds.filter((id) => id !== sourceColId);
      const targetIdx = filteredIds.indexOf(targetColId);
      if (targetIdx === -1) return;

      const insertIdx = insertAfter ? targetIdx + 1 : targetIdx;
      filteredIds.splice(insertIdx, 0, sourceColId);

      setCustomColumnOrder(filteredIds);

      if (storageKey) {
        try {
          const raw = localStorage.getItem(`sheetgl_state_v1_${storageKey}`);
          const parsed = raw ? JSON.parse(raw) : {};
          parsed.columnOrder = filteredIds;
          localStorage.setItem(`sheetgl_state_v1_${storageKey}`, JSON.stringify(parsed));
        } catch {}
      }

      if (
        (sourceCol.headerGroup !== targetCol.headerGroup || sourceCol.groupId !== targetCol.groupId) &&
        (targetCol.headerGroup || targetCol.groupId)
      ) {
        setColumns((prev) =>
          prev.map((c) =>
            c.id === sourceColId
              ? {
                  ...c,
                  headerGroup: targetCol.headerGroup,
                  groupId: targetCol.groupId,
                }
              : c
          )
        );
      }

      const orderMap = new Map<string, number>();
      filteredIds.forEach((id, idx) => orderMap.set(id, idx));
      const reorderedCols = [...currentVisCols].sort(
        (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
      );
      onColumnOrderChange?.(filteredIds, reorderedCols);
      onRequestRender?.();
    },
    [customColumnOrder, storageKey, onColumnOrderChange, onRequestRender]
  );

  const resetColumnOrder = useCallback(() => {
    setCustomColumnOrder(null);
    setColumns(userColumns);
    onRequestRender?.();
  }, [userColumns, onRequestRender]);

  // 7. Scroll Handlers
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const pending = pendingScrollRestoreRef.current;
    const hasScrollableCols = geometryRef.current.totalScrollableWidth > 0 && effectiveColumns.length > 2;
    const hasRows = rowCount > 0;

    const effectiveLeft = !pending.restoredX && !hasScrollableCols ? pending.left : target.scrollLeft;
    const effectiveTop = !pending.restoredY && !hasRows ? pending.top : target.scrollTop;

    if (hasScrollableCols && target.scrollLeft !== pending.left) {
      pending.restoredX = true;
    }
    if (hasRows && target.scrollTop !== pending.top) {
      pending.restoredY = true;
    }

    scrollPosRef.current = {
      left: effectiveLeft,
      top: effectiveTop,
    };
    const topRow = Math.max(
      1,
      Math.floor(effectiveTop / geometryRef.current.rowHeight) + 1
    );
    if (!scrollIndicatorStateRef.current.visible || scrollIndicatorStateRef.current.row !== topRow) {
      scrollIndicatorStateRef.current = { visible: true, row: topRow };
      if (scrollIndicatorRafRef.current === null) {
        scrollIndicatorRafRef.current = requestAnimationFrame(() => {
          scrollIndicatorRafRef.current = null;
          setScrollIndicator({ ...scrollIndicatorStateRef.current });
        });
      }
    }
    if (scrollHideTimerRef.current) {
      window.clearTimeout(scrollHideTimerRef.current);
    }
    scrollHideTimerRef.current = window.setTimeout(() => {
      scrollIndicatorStateRef.current = { visible: false, row: scrollIndicatorStateRef.current.row };
      setScrollIndicator((prev) => ({ ...prev, visible: false }));
    }, 900);

    onActiveOverlayClear?.();
    if (hasScrollableCols || hasRows) {
      onScrollChange?.(scrollPosRef.current);
    }
    onRequestRender?.();
  }, [effectiveColumns.length, rowCount, onActiveOverlayClear, onScrollChange, onRequestRender]);

  const ensureCellVisible = useCallback((row: number, col: number) => {
    const geom = geometryRef.current;
    const sc = scrollContainerRef.current;
    if (!sc) return;

    const cellTop = geom.headerHeight + row * geom.rowHeight;
    const cellBottom = cellTop + geom.rowHeight;

    if (cellTop < sc.scrollTop + geom.headerHeight) {
      sc.scrollTop = cellTop - geom.headerHeight;
    } else if (cellBottom > sc.scrollTop + sc.clientHeight) {
      sc.scrollTop = cellBottom - sc.clientHeight;
    }

    const colRect = geom.getColumnScreenRect(col, sc.scrollLeft);
    if (!colRect.isFrozen && colRect.pinnedZone !== 'left' && colRect.pinnedZone !== 'right') {
      const leftBound = geom.totalLeftPinnedWidth;
      const rightBound = geom.getRightPinnedStartX();
      if (colRect.x < leftBound) {
        sc.scrollLeft -= leftBound - colRect.x;
      } else if (colRect.x + colRect.width > rightBound) {
        sc.scrollLeft += colRect.x + colRect.width - rightBound;
      }
    }
  }, []);

  const scrollTo = useCallback((options: { top?: number; left?: number; behavior?: ScrollBehavior }) => {
    const sc = scrollContainerRef.current;
    const nextTop = options.top ?? sc?.scrollTop ?? scrollPosRef.current.top;
    const nextLeft = options.left ?? sc?.scrollLeft ?? scrollPosRef.current.left;
    const hasScrollableCols = geometryRef.current.totalScrollableWidth > 0 && effectiveColumns.length > 2;
    const hasRows = rowCount > 0;

    if (options.left !== undefined) {
      pendingScrollRestoreRef.current.left = nextLeft;
      pendingScrollRestoreRef.current.restoredX = hasScrollableCols || nextLeft <= 0;
    }
    if (options.top !== undefined) {
      pendingScrollRestoreRef.current.top = nextTop;
      pendingScrollRestoreRef.current.restoredY = hasRows || nextTop <= 0;
    }

    scrollPosRef.current = { top: nextTop, left: nextLeft };
    if (sc) {
      if (options.behavior === 'smooth') {
        sc.scrollTo({
          top: nextTop,
          left: nextLeft,
          behavior: 'smooth',
        });
      } else {
        sc.scrollTop = nextTop;
        sc.scrollLeft = nextLeft;
      }
    }
    onScrollChange?.(scrollPosRef.current);
    onRequestRender?.();
  }, [effectiveColumns.length, rowCount, onScrollChange, onRequestRender]);

  const scrollToTop = useCallback(() => {
    scrollTo({ top: 0, behavior: 'smooth' });
  }, [scrollTo]);

  const scrollToBottom = useCallback(() => {
    const sc = scrollContainerRef.current;
    if (sc) {
      scrollTo({ top: sc.scrollHeight, behavior: 'smooth' });
    }
  }, [scrollTo]);

  // 8. Viewport & Drag Edge Scrolling
  const getViewportCoords = useCallback((e: React.MouseEvent): { x: number; y: number; onScrollbar: boolean } => {
    const surface = gridSurfaceRef.current;
    const sc = scrollContainerRef.current;
    if (!surface) return { x: 0, y: 0, onScrollbar: false };

    const rect = surface.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const onScrollbar = Boolean(
      sc && (x >= sc.clientWidth || y >= sc.clientHeight)
    );
    return { x, y, onScrollbar };
  }, []);

  const checkEdgeAutoScroll = useCallback((x: number, y: number, rect: DOMRect) => {
    const sc = scrollContainerRef.current;
    if (!sc) return;

    const edgeThreshold = 36;
    if (y > rect.height - edgeThreshold) {
      sc.scrollTop += 18;
    } else if (
      y < geometryRef.current.headerHeight + edgeThreshold &&
      y > geometryRef.current.headerHeight
    ) {
      sc.scrollTop = Math.max(0, sc.scrollTop - 18);
    }

    const rightBound = geometryRef.current.getRightPinnedStartX();
    if (x > rightBound - edgeThreshold) {
      sc.scrollLeft += 24;
    } else if (
      x < geometryRef.current.totalLeftPinnedWidth + edgeThreshold &&
      x > geometryRef.current.totalLeftPinnedWidth
    ) {
      sc.scrollLeft = Math.max(0, sc.scrollLeft - 24);
    }
  }, []);

  // 9. Dimension Queries
  const getTotalWidth = useCallback((): number => {
    return (
      geometryRef.current.totalLeftPinnedWidth +
      geometryRef.current.totalCenterWidth +
      geometryRef.current.totalRightPinnedWidth +
      18
    );
  }, []);

  const getTotalHeight = useCallback((count: number): number => {
    return geometryRef.current.headerHeight + count * geometryRef.current.rowHeight;
  }, []);

  return {
    containerRef,
    gridSurfaceRef,
    scrollContainerRef,
    geometryRef,
    columns,
    effectiveColumns,
    setColumns,
    updateColumnDef,
    setColumnWidth,
    getColumnWidth,
    reorderColumn,
    resetColumnOrder,
    resizingCol,
    setResizingCol,
    scrollPosRef,
    scrollIndicator,
    setScrollIndicator,
    handleScroll,
    ensureCellVisible,
    scrollTo,
    scrollToTop,
    scrollToBottom,
    getViewportCoords,
    checkEdgeAutoScroll,
    getTotalWidth,
    getTotalHeight,
  };
}
