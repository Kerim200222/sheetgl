import { useRef, useState, useEffect, useCallback } from 'react';
import { ColumnDef } from '../types/grid';
import { GeometryEngine } from '../core/GeometryEngine';

export interface UseGridGeometryOptions {
  userColumns: ColumnDef[];
  rowHeight?: number;
  headerHeight?: number;
  rowCount?: number;
  onRequestRender?: () => void;
  onActiveOverlayClear?: () => void;
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
  setColumns: React.Dispatch<React.SetStateAction<ColumnDef[]>>;
  updateColumnDef: (colId: string, patch: Partial<ColumnDef>) => void;
  setColumnWidth: (colId: string, width: number) => void;
  getColumnWidth: (colId: string) => number | undefined;

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
  rowCount = 0,
  onRequestRender,
  onActiveOverlayClear,
}: UseGridGeometryOptions): UseGridGeometryReturn {
  // 1. Column state synced with props
  const [columns, setColumns] = useState<ColumnDef[]>(userColumns);
  useEffect(() => {
    setColumns(userColumns);
  }, [userColumns]);

  // 2. Geometry Engine reference
  const geometryRef = useRef<GeometryEngine>(
    new GeometryEngine(userColumns, rowHeight, headerHeight)
  );

  useEffect(() => {
    geometryRef.current.rowHeight = rowHeight;
    geometryRef.current.headerHeight = headerHeight;
    geometryRef.current.setColumns(columns);
  }, [columns, rowHeight, headerHeight]);

  // 3. DOM Element Refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gridSurfaceRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // 4. Scroll Tracking & Indicators
  const scrollPosRef = useRef<{ left: number; top: number }>({ left: 0, top: 0 });
  const [scrollIndicator, setScrollIndicator] = useState<{ visible: boolean; row: number }>({
    visible: false,
    row: 1,
  });
  const scrollHideTimerRef = useRef<number | null>(null);

  // 5. Column Resizing State
  const [resizingCol, setResizingCol] = useState<ColumnResizeState | null>(null);

  // Column Resizing mouse drag effect
  useEffect(() => {
    if (!resizingCol) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizingCol.startX;
      const newWidth = Math.max(48, resizingCol.initialWidth + deltaX);
      setColumns((prev) =>
        prev.map((c) => (c.id === resizingCol.colId ? { ...c, width: newWidth } : c))
      );
    };

    const handleMouseUp = () => {
      setResizingCol(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingCol]);

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

  // 7. Scroll Handlers
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    scrollPosRef.current = {
      left: target.scrollLeft,
      top: target.scrollTop,
    };
    const topRow = Math.max(
      1,
      Math.floor(target.scrollTop / geometryRef.current.rowHeight) + 1
    );
    setScrollIndicator({ visible: true, row: topRow });
    if (scrollHideTimerRef.current) {
      window.clearTimeout(scrollHideTimerRef.current);
    }
    scrollHideTimerRef.current = window.setTimeout(() => {
      setScrollIndicator((prev) => ({ ...prev, visible: false }));
    }, 900);

    onActiveOverlayClear?.();
    onRequestRender?.();
  }, [onActiveOverlayClear, onRequestRender]);

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
    if (!colRect.isFrozen) {
      if (colRect.x < geom.totalFrozenWidth) {
        sc.scrollLeft -= geom.totalFrozenWidth - colRect.x;
      } else if (colRect.x + colRect.width > sc.clientWidth) {
        sc.scrollLeft += colRect.x + colRect.width - sc.clientWidth;
      }
    }
  }, []);

  const scrollTo = useCallback((options: { top?: number; left?: number; behavior?: ScrollBehavior }) => {
    const sc = scrollContainerRef.current;
    if (!sc) return;
    sc.scrollTo({
      top: options.top ?? sc.scrollTop,
      left: options.left ?? sc.scrollLeft,
      behavior: options.behavior,
    });
  }, []);

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

    if (x > rect.width - edgeThreshold) {
      sc.scrollLeft += 24;
    } else if (
      x < geometryRef.current.totalFrozenWidth + edgeThreshold &&
      x > geometryRef.current.totalFrozenWidth
    ) {
      sc.scrollLeft = Math.max(0, sc.scrollLeft - 24);
    }
  }, []);

  // 9. Dimension Queries
  const getTotalWidth = useCallback((): number => {
    return geometryRef.current.totalFrozenWidth + geometryRef.current.totalScrollableWidth + 18;
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
    setColumns,
    updateColumnDef,
    setColumnWidth,
    getColumnWidth,
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
