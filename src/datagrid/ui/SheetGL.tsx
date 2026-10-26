import React, { useEffect, useRef, useState, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { GridApi } from '../core/GridApi';
import { useGridSelection } from '../hooks/useGridSelection';
import { useGridGeometry } from '../hooks/useGridGeometry';
import {
  ColumnDef,
  ColumnGroupDef,
  ActiveOverlayState,
  GridPermissions,
  GridToolbarConfig,
  GridSummaryConfig,
  RowSelectionMode,
  EditingStartEvent,
  CellValueChangingEvent,
  CellValueChangedEvent,
  RowInsertingEvent,
  RowInsertedEvent,
  RowUpdatingEvent,
  RowUpdatedEvent,
  RowRemovingEvent,
  RowRemovedEvent,
  SavingEvent,
  SavedEvent,
} from '../types/grid';
import { IDataStore, BatchChanges, RemoteOperationsConfig } from '../types/store';
import { ColumnFilterState, FilterDescriptor, SortDescriptor } from '../types/filter';
import { GroupDescriptor, SummaryType } from '../types/group';
import { IGridThemeTokens } from '../theme/IGridTheme';
import { ThemeEngine, ThemeInput } from '../theme/ThemeEngine';
import { GeometryEngine } from '../core/GeometryEngine';
import { SelectionModel } from '../core/SelectionModel';
import { HistoryManager } from '../core/HistoryManager';
import { ValidationEngine } from '../core/ValidationEngine';
import { CanvasRenderer } from '../renderer/CanvasRenderer';
import { DynamicCellEditor } from '../overlays/DynamicCellEditor';
import { HeaderFilterPopover } from '../overlays/HeaderFilterPopover';
import { ContextMenuOverlay, ContextMenuState } from '../overlays/ContextMenuOverlay';
import { SparklineModalOverlay, SparklineModalState } from '../overlays/SparklineModalOverlay';
import { PdfPreviewModalOverlay, PdfPreviewModalState } from '../overlays/PdfPreviewModalOverlay';
import { BatchChangesModal } from '../overlays/BatchChangesModal';
import { DeleteConfirmProgressModal } from '../overlays/DeleteConfirmProgressModal';
import { ToolBar } from './ToolBar';
import { FormulaBar } from './FormulaBar';
import { SummaryFooter, SelectionSummaryStats } from './SummaryFooter';
import { MaterialIcon } from './MaterialIcon';
import { LocalDataStore } from '../data/LocalDataStore';
import { initDefaultColumnPlugins } from '../columns/initPlugins';
import { ColumnTypeRegistry } from '../columns/ColumnTypeRegistry';
import { CellEditorRegistry } from '../editing/CellEditorRegistry';
import { LocaleEngine, LocaleInput, IGridLocale } from '../i18n/LocaleEngine';
import { GridProvider, useGridContext, GridUIState, FillDragState } from '../state';

export interface SheetGLProps {
  dataSource: any[] | IDataStore;
  columns: ColumnDef[];
  /** Optional Banded Column Group definitions for multi-level header bands and group-wide theme-aware coloring */
  columnGroups?: ColumnGroupDef[];
  /** Height of the top Banded Column Group header row in pixels when column groups are active (default: 30) */
  groupHeaderHeight?: number;
  theme?: ThemeInput;
  onThemeChange?: (themeName: string) => void;
  locale?: LocaleInput;
  onLocaleChange?: (localeCode: 'tr' | 'en', locale: IGridLocale) => void;
  rowHeight?: number;
  headerHeight?: number;
  initialSort?: SortDescriptor[];
  initialGroups?: GroupDescriptor[];
  permissions?: GridPermissions;
  batchEditMode?: boolean;
  /**
   * Toolbar visibility & configuration (`buttonDisplayMode: 'icon' | 'icon-text' | 'text'`, item visibility, customItems)
   */
  toolbar?: boolean | GridToolbarConfig;
  onToolbarConfigChange?: (config: GridToolbarConfig) => void;
  /**
   * Summary Row (bottom footer) visibility & configuration (`showTotalCount`, `showSelectionStats`, `showColumnSummaries`, `items`, `columnSummaryTypes`)
   */
  summaryRow?: boolean | GridSummaryConfig;
  onSummaryConfigChange?: (config: GridSummaryConfig) => void;
  /** Whether to show the Excel Formula & Coordinate Bar below the toolbar (default: true) */
  showFormulaBar?: boolean;
  /** Row selection mode: 'none' | 'single' (Single Choice) | 'multiple' (Multiple Choice with checkboxes) */
  selectionMode?: RowSelectionMode;
  onSelectionModeChange?: (mode: RowSelectionMode) => void;
  selectedRowKeys?: any[];
  onSelectionChanged?: (selectedRowKeys: any[], selectedRowsData: any[]) => void;
  onPermissionsChange?: (permissions: GridPermissions) => void;
  onCellChange?: (row: any, columnId: string, value: any) => void;
  /** DevExtreme-style remote operations configuration */
  remoteOperations?: boolean | RemoteOperationsConfig;
  /** Filter change callback */
  /** Callback when user clicks PDF viewer button in a PDF/file column */
  onPdfPreviewClick?: (url: string, row: any, column: ColumnDef) => void;
  onFilterChange?: (
    filter: FilterDescriptor | null,
    columnFilters: Record<string, ColumnFilterState>
  ) => void;
  /** Callback fired when a column is interactively resized */
  onColumnResize?: (columnId: string, newWidth: number) => void;
  /** Optional unique key per module/view to automatically persist & restore filter, sort, and scroll state in localStorage */
  storageKey?: string;
  /** Callback fired when viewport scroll position changes */
  onScrollChange?: (pos: { top: number; left: number }) => void;
  /** Custom export callback (e.g. for Excel export modal or custom export pipeline) */
  onExport?: () => void;

  /** Navigation direction when Enter key commits cell edit: 'down' | 'right' | 'auto' (default: 'auto' which moves right on inserted rows and down on existing rows) */
  enterNavigation?: 'down' | 'right' | 'auto';
  /** Whether to render alternating horizontal zebra stripes on odd data rows (default: true). Can also pass a custom CSS color or { light, dark } color pair. */
  zebraStriping?: boolean | string | { light: string; dark: string };
  /** DevExtreme-compatible alias for `zebraStriping` (default: true) */
  rowAlternationEnabled?: boolean;
  // Enterprise Lifecycle Event Triggers
  onEditingStart?: (e: EditingStartEvent) => void;
  onCellValueChanging?: (e: CellValueChangingEvent) => void;
  onCellValueChanged?: (
    e: CellValueChangedEvent
  ) => void | Record<string, any> | Promise<void | Record<string, any>>;
  onRowInserting?: (e: RowInsertingEvent) => void | Promise<void>;
  onRowInserted?: (e: RowInsertedEvent) => void;
  onRowUpdating?: (e: RowUpdatingEvent) => void | Promise<void>;
  onRowUpdated?: (e: RowUpdatedEvent) => void;
  onRowRemoving?: (e: RowRemovingEvent) => void | Promise<void>;
  onRowRemoved?: (e: RowRemovedEvent) => void;
  onSaving?: (e: SavingEvent) => void | Promise<void>;
  onSaved?: (e: SavedEvent) => void;
  onAddNewRow?: () => void;
  onCloneRow?: (rowIndex: number, rowData: Record<string, any>) => void | Promise<void>;
  onViewRowDetail?: (rowIndex: number, rowData: Record<string, any>) => void;
  onRefresh?: () => void;

  style?: React.CSSProperties;
  className?: string;
}

export function compileColumnFilters(
  map: Record<string, ColumnFilterState>,
  excludeColumnId?: string
): FilterDescriptor | null {
  const states = Object.values(map);
  if (states.length === 0) return null;

  const singleFilters: FilterDescriptor[] = [];
  for (const st of states) {
    if (excludeColumnId && st.columnId === excludeColumnId) continue;
    if (st.mode === 'values') {
      if (st.semanticFilter) {
        singleFilters.push(st.semanticFilter);
      } else if (st.selectedValues) {
        singleFilters.push([st.columnId, 'in', st.selectedValues]);
      }
    } else if (st.mode === 'condition' && st.operator) {
      if (st.operator === 'between') {
        singleFilters.push([st.columnId, 'between', [st.value1, st.value2]]);
      } else {
        singleFilters.push([st.columnId, st.operator, st.value1]);
      }
    }
  }

  if (singleFilters.length === 0) return null;
  if (singleFilters.length === 1) return singleFilters[0];

  const composite: any[] = [];
  singleFilters.forEach((f, idx) => {
    if (idx > 0) composite.push('and');
    composite.push(f);
  });
  return composite;
}

interface SheetGLInnerProps extends SheetGLProps {
  store: IDataStore;
}

const SheetGLInner = forwardRef<GridApi, SheetGLInnerProps>((
  {
    dataSource,
    store,
    columns: userColumns,
    columnGroups = [],
    groupHeaderHeight = 30,
    theme: userTheme = 'apple-dark',
    onThemeChange,
    locale: userLocale,
    onLocaleChange,
    rowHeight = 34,
    headerHeight = 38,
    initialSort = [],
    initialGroups = [],
    permissions: userPermissions,
    batchEditMode = true,
    toolbar: userToolbar,
    onToolbarConfigChange,
    summaryRow: userSummaryRow,
    onSummaryConfigChange,
    showFormulaBar = true,
    enterNavigation = 'auto',
    zebraStriping,
    rowAlternationEnabled,
    selectionMode: userSelectionMode = 'none',
    onSelectionModeChange,
    selectedRowKeys: userSelectedRowKeys,
    onSelectionChanged,
    onPermissionsChange,
    onPdfPreviewClick,
    onCellChange,
    onEditingStart,
    onCellValueChanging,
    onCellValueChanged,
    onRowInserting,
    onRowInserted,
    onRowUpdating,
    onRowUpdated,
    onRowRemoving,
    onRowRemoved,
    onSaving,
    onSaved,
    onAddNewRow,
    onCloneRow,
    onViewRowDetail,
    onRefresh,
    remoteOperations,
    onFilterChange,
    onColumnResize,
    storageKey,
    onScrollChange,
    onExport,
    style,
    className,
  },
  ref
) => {
  const { state, actions } = useGridContext();
  const {
    currentThemeName,
    resolvedTheme,
    currentLocale,
    permissions,
    toolbarConfig,
    summaryConfig,
    rowSelectionMode,
    selectedRowKeys: selectedRowKeysSet,
    sortRules,
    groups,
    columnFilters,
    searchKeyword,
    activeOverlay,
    editorValidationError,
    isEditorValidating,
    headerFilterState,
    contextMenu,
    sparklineModal,
    pdfModal,
    showBatchModal,
    deleteConfirmModal,
    toastMessage,
  } = state;

  // Synchronize incoming external prop changes to context actions
  useEffect(() => {
    if (userTheme !== undefined && userTheme !== currentThemeName) {
      actions.setThemeName(userTheme);
    }
  }, [userTheme, currentThemeName, actions]);

  useEffect(() => {
    if (userLocale !== undefined) {
      const resolved = LocaleEngine.resolve(userLocale);
      if (resolved.code !== currentLocale.code) {
        actions.setLocale(resolved);
      }
    }
  }, [userLocale, currentLocale, actions]);

  useEffect(() => {
    if (userPermissions !== undefined && userPermissions !== permissions) {
      actions.setPermissions(userPermissions);
    }
  }, [userPermissions, permissions, actions]);

  useEffect(() => {
    if (userSelectedRowKeys !== undefined) {
      actions.setSelectedRowKeys(userSelectedRowKeys);
    }
  }, [userSelectedRowKeys, actions]);

  const setCurrentThemeName = actions.setThemeName;
  const setCurrentLocale = actions.setLocale;
  const setPermissions = actions.setPermissions;
  const handleUpdatePermissions = useCallback(
    (next: GridPermissions) => {
      actions.setPermissions(next);
      onPermissionsChange?.(next);
    },
    [actions, onPermissionsChange]
  );

  const handleUpdateToolbarConfig = useCallback(
    (patch: Partial<GridToolbarConfig>) => {
      actions.updateToolbarConfig(patch);
      onToolbarConfigChange?.({ ...toolbarConfig, ...patch });
    },
    [actions, toolbarConfig, onToolbarConfigChange]
  );

  const handleUpdateSummaryConfig = useCallback(
    (patch: Partial<GridSummaryConfig>) => {
      actions.updateSummaryConfig(patch);
      onSummaryConfigChange?.({ ...summaryConfig, ...patch });
    },
    [actions, summaryConfig, onSummaryConfigChange]
  );

  const setSelectedRowKeysSet = useCallback(
    (arg: Set<any> | any[] | ((prev: Set<any>) => Set<any>)) => {
      if (typeof arg === 'function') {
        actions.setSelectedRowKeys(arg(state.selectedRowKeys));
      } else {
        actions.setSelectedRowKeys(arg);
      }
    },
    [actions, state.selectedRowKeys]
  );

  const setSortRules = actions.setSortRules;
  const setGroups = useCallback(
    (arg: GroupDescriptor[] | ((prev: GroupDescriptor[]) => GroupDescriptor[])) => {
      if (typeof arg === 'function') {
        actions.setGroups(arg(state.groups));
      } else {
        actions.setGroups(arg);
      }
    },
    [actions, state.groups]
  );
  const setColumnFilters = actions.setColumnFilters;
  const setSearchKeyword = actions.setSearchKeyword;

  const setActiveOverlay = useCallback(
    (arg: ActiveOverlayState | null | ((prev: ActiveOverlayState | null) => ActiveOverlayState | null)) => {
      if (typeof arg === 'function') {
        const next = arg(state.activeOverlay);
        if (next) actions.openCellEditor(next);
        else actions.closeCellEditor();
      } else if (arg) {
        actions.openCellEditor(arg);
      } else {
        actions.closeCellEditor();
      }
    },
    [actions, state.activeOverlay]
  );

  const setEditorValidationError = useCallback(
    (err: string | null) => {
      actions.setEditorValidating(state.isEditorValidating, err);
    },
    [actions, state.isEditorValidating]
  );

  const setIsEditorValidating = useCallback(
    (validating: boolean) => {
      actions.setEditorValidating(validating, state.editorValidationError);
    },
    [actions, state.editorValidationError]
  );

  const setHeaderFilterState = useCallback(
    (arg: any) => {
      if (typeof arg === 'function') {
        const next = arg(state.headerFilterState);
        if (next) actions.openHeaderFilter(next);
        else actions.closeHeaderFilter();
      } else if (arg) {
        actions.openHeaderFilter(arg);
      } else {
        actions.closeHeaderFilter();
      }
    },
    [actions, state.headerFilterState]
  );

  const setContextMenu = useCallback(
    (arg: any) => {
      if (typeof arg === 'function') {
        const next = arg(state.contextMenu);
        if (next) actions.openContextMenu(next);
        else actions.closeContextMenu();
      } else if (arg) {
        actions.openContextMenu(arg);
      } else {
        actions.closeContextMenu();
      }
    },
    [actions, state.contextMenu]
  );

  const setSparklineModal = useCallback(
    (arg: any) => {
      if (typeof arg === 'function') {
        const next = arg(state.sparklineModal);
        if (next) actions.openSparklineModal(next);
        else actions.closeSparklineModal();
      } else if (arg) {
        actions.openSparklineModal(arg);
      } else {
        actions.closeSparklineModal();
      }
    },
    [actions, state.sparklineModal]
  );

  const setPdfModal = useCallback(
    (arg: any) => {
      if (typeof arg === 'function') {
        const next = arg(state.pdfModal);
        if (next) actions.openPdfModal(next);
        else actions.closePdfModal();
      } else if (arg) {
        actions.openPdfModal(arg);
      } else {
        actions.closePdfModal();
      }
    },
    [actions, state.pdfModal]
  );

  const setShowBatchModal = useCallback(
    (show: boolean) => {
      actions.setShowBatchModal(show);
    },
    [actions]
  );

  const setDeleteConfirmModal = useCallback(
    (arg: any) => {
      if (typeof arg === 'function') {
        const next = arg(state.deleteConfirmModal);
        if (next) actions.openDeleteConfirmModal(next);
        else actions.closeDeleteConfirmModal();
      } else if (arg) {
        actions.openDeleteConfirmModal(arg);
      } else {
        actions.closeDeleteConfirmModal();
      }
    },
    [actions, state.deleteConfirmModal]
  );

  // Local mouse states for 60fps canvas performance without global context thrashing
  const [cursorStyle, setCursorStyle] = useState<string>('cell');
  const [fillDragState, setFillDragState] = useState<FillDragState | null>(null);
  const showToast = actions.showToast;

  // 4b. Geometry & Layout Hook
  const scrollSaveTimerRef = useRef<number | null>(null);
  const {
    containerRef,
    gridSurfaceRef,
    scrollContainerRef,
    geometryRef,
    columns,
    effectiveColumns,
    setColumns,
    updateColumnDef: handleUpdateColumnDef,
    setColumnWidth: handleSetColumnWidth,
    getColumnWidth: handleGetColumnWidth,
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
  } = useGridGeometry({
    userColumns,
    rowHeight,
    headerHeight,
    columnGroups,
    groupHeaderHeight,
    rowSelectionMode,
    rowCount: store.getRowCount(),
    onRequestRender: () => requestRenderRef.current(),
    onActiveOverlayClear: () => actions.closeCellEditor(),
    onColumnResize,
    onScrollChange: (pos) => {
      onScrollChange?.(pos);
      if (storageKey) {
        if (scrollSaveTimerRef.current) {
          window.clearTimeout(scrollSaveTimerRef.current);
        }
        scrollSaveTimerRef.current = window.setTimeout(() => {
          try {
            const raw = localStorage.getItem(`sheetgl_state_v1_${storageKey}`);
            const parsed = raw ? JSON.parse(raw) : {};
            parsed.scrollTop = Math.round(pos.top);
            parsed.scrollLeft = Math.round(pos.left);
            localStorage.setItem(`sheetgl_state_v1_${storageKey}`, JSON.stringify(parsed));
          } catch {}
        }, 120);
      }
    },
  });

  const historyRef = useRef<HistoryManager>(new HistoryManager(100));

  const activeBaseFilter = useMemo(() => {
    if (!headerFilterState) return undefined;
    return compileColumnFilters(columnFilters, headerFilterState.column.id);
  }, [columnFilters, headerFilterState?.column.id]);

  // Hover & Drag States
  const hoveredCellRef = useRef<{ row: number; col: number } | null>(null);
  const hoveredFilterColRef = useRef<number | null>(null);

  // Async Backend Cascading Row Loading Keys
  const loadingRowKeysRef = useRef<Set<any>>(new Set());

  // Internal clipboard fallback for context menu Copy/Paste
  const internalClipboardRef = useRef<string>('');

  // DOM Element Refs (canvas remains local to SheetGL)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Store listener
  const [storeVersion, setStoreVersion] = useState<number>(0);
  useEffect(() => {
    const handleLoaded = () => {
      setStoreVersion((v) => v + 1);
    };
    store.on('loaded', handleLoaded);
    return () => store.off('loaded', handleLoaded);
  }, [store]);

  // Persist columnFilters and sortRules changes per storageKey
  const hydratedStorageKeyRef = useRef<string | undefined>(storageKey);
  useEffect(() => {
    if (!storageKey || hydratedStorageKeyRef.current !== storageKey) return;
    try {
      const raw = localStorage.getItem(`sheetgl_state_v1_${storageKey}`);
      const parsed = raw ? JSON.parse(raw) : {};
      parsed.columnFilters = columnFilters;
      parsed.sortRules = sortRules;
      localStorage.setItem(`sheetgl_state_v1_${storageKey}`, JSON.stringify(parsed));
    } catch {}
  }, [storageKey, columnFilters, sortRules]);

  // Restore per-module state (filters, sorting, scroll position) when storageKey or store changes
  useEffect(() => {
    if (scrollSaveTimerRef.current) {
      window.clearTimeout(scrollSaveTimerRef.current);
      scrollSaveTimerRef.current = null;
    }

    if (!storageKey) {
      hydratedStorageKeyRef.current = undefined;
      if (initialSort.length > 0) {
        store.setSorting(initialSort);
      }
      if (initialGroups.length > 0) {
        store.setGrouping(initialGroups);
      }
      return;
    }

    let savedFilters: Record<string, ColumnFilterState> = {};
    let savedSort: SortDescriptor[] = initialSort;
    let savedTop = 0;
    let savedLeft = 0;

    try {
      const raw = localStorage.getItem(`sheetgl_state_v1_${storageKey}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.columnFilters && typeof parsed.columnFilters === 'object') {
          savedFilters = parsed.columnFilters;
        }
        if (Array.isArray(parsed.sortRules)) {
          savedSort = parsed.sortRules;
        }
        if (typeof parsed.scrollTop === 'number' && parsed.scrollTop >= 0) {
          savedTop = parsed.scrollTop;
        }
        if (typeof parsed.scrollLeft === 'number' && parsed.scrollLeft >= 0) {
          savedLeft = parsed.scrollLeft;
        }
      }
    } catch {}

    setColumnFilters(savedFilters);
    setSortRules(savedSort);
    hydratedStorageKeyRef.current = storageKey;

    const compiled = compileColumnFilters(savedFilters);
    if (compiled) {
      store.setFilter(compiled);
    } else if ((store as any).hasActiveFilter?.()) {
      store.setFilter(null);
    }
    if (savedSort.length > 0) {
      store.setSorting(savedSort);
    }

    const timer = window.setTimeout(() => {
      scrollTo({ top: savedTop, left: savedLeft });
    }, 30);

    return () => {
      window.clearTimeout(timer);
      if (scrollSaveTimerRef.current) {
        window.clearTimeout(scrollSaveTimerRef.current);
        scrollSaveTimerRef.current = null;
      }
    };
  }, [storageKey, store]);

  const requestRenderRef = useRef<() => void>(() => {});

  // 5b. Selection Hook
  const {
    selectionRef,
    selectionVersion,
    setSelectionVersion,
    selectedCellUI,
    setSelectedCellUI,
    isDraggingSelection,
    setIsDraggingSelection,
    isDraggingRowNumbers,
    setIsDraggingRowNumbers,
    selectCell,
    selectRange,
    selectAll,
    selectFullRow,
    moveSelection: hookMoveSelection,
    clearSelection,
    stopDragging,
    getActiveCell,
    getSelectedRange,
  } = useGridSelection({
    onRequestRender: () => requestRenderRef.current(),
  });

  const activeFilterColumnIds = useMemo(
    () => new Set(Object.keys(columnFilters)),
    [columnFilters]
  );

  // 6. 60 FPS Render Loop
  const requestRender = useCallback(() => {
    if (!canvasRef.current) return;
    requestAnimationFrame(() => {
      if (!canvasRef.current) return;
      const surfaceW =
        gridSurfaceRef.current?.clientWidth ||
        containerRef.current?.clientWidth ||
        canvasRef.current.clientWidth ||
        0;
      if (surfaceW > 0) {
        geometryRef.current.setViewportWidth(surfaceW);
      }
      CanvasRenderer.render({
        canvas: canvasRef.current,
        geometry: geometryRef.current,
        store,
        selection: selectionRef.current,
        theme: resolvedTheme,
        locale: currentLocale,
        scrollLeft: scrollPosRef.current.left,
        scrollTop: scrollPosRef.current.top,
        sortRules,
        searchKeyword,
        hoveredCell: hoveredCellRef.current,
        hoveredFilterColIndex: hoveredFilterColRef.current,
        activeFilterColumnIds,
        fillDragRange: fillDragState?.targetRange || null,
        loadingRowKeys: loadingRowKeysRef.current,
        permissions,
        selectionMode: rowSelectionMode,
        selectedRowKeys: selectedRowKeysSet,
        zebraStriping: zebraStriping ?? rowAlternationEnabled ?? true,
      });
    });
  }, [
    store,
    resolvedTheme,
    currentLocale,
    sortRules,
    searchKeyword,
    activeFilterColumnIds,
    fillDragState,
    permissions,
    rowSelectionMode,
    selectedRowKeysSet,
    zebraStriping,
    rowAlternationEnabled,
  ]);

  requestRenderRef.current = requestRender;
  const openEditorRef = useRef<(row: number, col: number, initialChar?: string) => void>(() => {});

  // 6b. Expose Imperative GridApi
  const gridApi = useMemo<GridApi>(
    (): GridApi => ({
      requestRender,
      selectCell,
      selectRange,
      clearSelection,
      selectAll: () => selectAll(store.getRowCount(), geometryRef.current.columns.length),
      getActiveCell,
      getSelectedRange,
      ensureCellVisible,
      scrollTo,
      getScrollPosition: () => ({ ...scrollPosRef.current }),
      clearFilters: async () => {
        setColumnFilters({});
        await store.setFilter(null);
        scrollTo({ top: 0 });
        setStoreVersion((v) => v + 1);
        requestRender();
        onFilterChange?.(null, {});
      },
      resetState: async () => {
        if (storageKey) {
          try {
            localStorage.removeItem(`sheetgl_state_v1_${storageKey}`);
          } catch {}
        }
        setSortRules(initialSort);
        store.setSorting(initialSort);
        setColumnFilters({});
        await store.setFilter(null);
        scrollTo({ top: 0, left: 0 });
        setStoreVersion((v) => v + 1);
        requestRender();
        onFilterChange?.(null, {});
      },
      setColumnWidth: handleSetColumnWidth,
      getColumnWidth: handleGetColumnWidth,
      getTotalWidth,
      getTotalHeight: () => getTotalHeight(store.getRowCount()),
      startEditingCell: (col: number, row: number, initialChar?: string) => {
        openEditorRef.current(row, col, initialChar);
      },
      stopEditingCell: (cancel?: boolean) => {
        if (cancel) {
          setEditorValidationError(null);
          setIsEditorValidating(false);
          setActiveOverlay(null);
        }
      },
    }),
    [
      requestRender,
      selectCell,
      selectRange,
      clearSelection,
      selectAll,
      store,
      getActiveCell,
      getSelectedRange,
      ensureCellVisible,
      scrollTo,
      handleSetColumnWidth,
      handleGetColumnWidth,
      getTotalWidth,
      getTotalHeight,
    ]
  );

  useImperativeHandle(ref, () => gridApi, [gridApi]);

  useEffect(() => {
    requestRender();
  }, [requestRender, resolvedTheme, currentLocale, storeVersion, effectiveColumns, selectionVersion, rowSelectionMode, selectedRowKeysSet]);

  // 6c. PDF Preview Custom Event Listener
  useEffect(() => {
    const handleOpenPdfEvent = (e: Event) => {
      const custom = e as CustomEvent<{ url: string; title: string; row: any; column: ColumnDef }>;
      if (custom.detail) {
        if (onPdfPreviewClick) {
          onPdfPreviewClick(custom.detail.url, custom.detail.row, custom.detail.column);
        } else {
          setPdfModal({
            url: custom.detail.url,
            title: custom.detail.title,
            column: custom.detail.column,
            row: custom.detail.row,
          });
        }
      }
    };
    window.addEventListener('sheetgl-open-pdf', handleOpenPdfEvent);

    return () => {
      window.removeEventListener('sheetgl-open-pdf', handleOpenPdfEvent);
    };
  }, [onPdfPreviewClick]);
  // ============================================================================
  // PERMISSION & EDITABILITY CHECKER
  // ============================================================================
  const canEditCell = useCallback(
    (row: Record<string, any> | undefined, colDef: ColumnDef | undefined, rowIndex: number = 0, silent: boolean = false): boolean => {
      if (!colDef || !row) return false;
      const cType = (colDef.type || '').toLowerCase();
      if (cType === 'sparkline' || cType === 'action' || cType === 'pdf') return false;

      if (
        permissions.mode === 'read' ||
        permissions.mode === 'readonly' ||
        permissions.allowUpdating === false
      ) {
        if (!silent) {
          showToast(
            currentLocale.code.startsWith('tr')
              ? 'Tablo şu anda Salt Okunur (Read-Only) modunda.'
              : 'Grid is currently in Read-Only permission mode.',
            'warning'
          );
        }
        return false;
      }

      if (colDef.readonly || colDef.permission === 'readonly' || colDef.permission === 'read') {
        if (!silent) {
          showToast(
            currentLocale.code.startsWith('tr')
              ? `"${colDef.title}" sütunu salt okunurdur (Read-Only).`
              : `Column "${colDef.title}" is Read-Only.`,
            'warning'
          );
        }
        return false;
      }

      if (colDef.canEdit && !colDef.canEdit(row, colDef)) {
        if (!silent) {
          showToast(
            currentLocale.code.startsWith('tr')
              ? `Bu satır için "${colDef.title}" düzenlenemez.`
              : `"${colDef.title}" is locked for this record.`,
            'warning'
          );
        }
        return false;
      }

      if (onEditingStart && !silent) {
        const keyField = (store as any).getKeyField?.() || (store as any).keyField || 'id';
        const rowKey = row[keyField] ?? row.id ?? row.legacy_id ?? rowIndex;
        const evt: EditingStartEvent = {
          row,
          rowKey,
          rowIndex,
          column: colDef,
          value: row[colDef.id],
          cancel: false,
        };
        onEditingStart(evt);
        if (evt.cancel) {
          showToast(
            currentLocale.code.startsWith('tr')
              ? `Düzenleme onEditingStart kuralı tarafından engellendi.`
              : `Editing canceled by onEditingStart trigger.`,
            'warning'
          );
          return false;
        }
      }

      return true;
    },
    [permissions, onEditingStart, currentLocale, showToast]
  );

  // ============================================================================
  // UNIFIED CELL MUTATION & CASCADING TRIGGER PIPELINE
  // ============================================================================
  const commitSingleCellEdit = useCallback(
    async (
      rowIndex: number,
      colDef: ColumnDef,
      newValue: any,
      recordHistory: boolean = true
    ): Promise<boolean> => {
      const vRow = store.getViewRow(rowIndex);
      if (!vRow || vRow.type !== 'data') return false;

      const rowData = vRow.data;
      const keyField = (store as any).getKeyField?.() || (store as any).keyField || 'id';
      const rowKey = rowData[keyField] ?? rowData.id ?? rowData.legacy_id ?? rowIndex;
      const oldValue = rowData[colDef.id];

      if (oldValue === newValue) {
        setEditorValidationError(null);
        return true;
      }
      if (!canEditCell(rowData, colDef, rowIndex, false)) return false;

      // 1. Static & Async Column Validation Rules + Legacy Validator Check
      const isTR = currentLocale.code.startsWith('tr');
      const hasAsyncRule =
        colDef.validationRules?.some((r) => r.type === 'async') || Boolean(colDef.validator);
      if (hasAsyncRule) {
        loadingRowKeysRef.current.add(rowKey);
        requestRender();
      }
      try {
        const valRes = await ValidationEngine.validateCell(newValue, rowData, colDef, isTR);
        if (!valRes.valid) {
          const msg =
            valRes.message ||
            (isTR ? 'Doğrulama kuralı hatası: Giriş engellendi!' : 'Validation rule failed: Entry blocked!');
          setEditorValidationError(msg);
          showToast(`⛔ ${msg}`, 'warning');
          return false;
        }
        setEditorValidationError(null);
      } finally {
        if (hasAsyncRule) {
          loadingRowKeysRef.current.delete(rowKey);
          requestRender();
        }
      }

      // 2. Lifecycle onCellValueChanging Trigger
      let finalValue = newValue;
      if (onCellValueChanging) {
        const changingEvt: CellValueChangingEvent = {
          row: rowData,
          rowKey,
          rowIndex,
          column: colDef,
          oldValue,
          newValue,
          cancel: false,
        };
        onCellValueChanging(changingEvt);
        if (changingEvt.cancel) {
          if (changingEvt.errorMessage) {
            showToast(`⚠️ ${changingEvt.errorMessage}`, 'warning');
          }
          return false;
        }
        finalValue = changingEvt.newValue;
      }

      // 3. Lifecycle onRowUpdating Trigger
      if (onRowUpdating) {
        const rowUpdEvt: RowUpdatingEvent = {
          key: rowKey,
          oldData: { ...rowData },
          newData: { [colDef.id]: finalValue },
          cancel: false,
        };
        await onRowUpdating(rowUpdEvt);
        if (rowUpdEvt.cancel) return false;
      }

      const prevRowSnapshot = { ...rowData };

      // 4. Commit Primary Value
      await store.setCell(rowKey, colDef.id, finalValue);
      onCellChange?.(rowData, colDef.id, finalValue);

      // 5. Cascading Column setCellValue & Async Backend Lookup Trigger
      const cascadingPatch: Record<string, any> = {};
      if (colDef.setCellValue) {
        try {
          loadingRowKeysRef.current.add(rowKey);
          requestRender();

          const draftNewData: Record<string, any> = {};
          const maybePromise = colDef.setCellValue(draftNewData, finalValue, prevRowSnapshot, {
            rowKey,
            columnId: colDef.id,
            store,
          });

          const resolvedPatch =
            maybePromise instanceof Promise ? await maybePromise : maybePromise;

          Object.assign(cascadingPatch, draftNewData, resolvedPatch || {});
          if (Object.keys(cascadingPatch).length > 0) {
            await store.updateRowFields?.(rowKey, cascadingPatch);
          }
        } finally {
          loadingRowKeysRef.current.delete(rowKey);
          requestRender();
        }
      }

      // 6. Lifecycle onCellValueChanged Trigger (supports sync or async backend patch)
      if (onCellValueChanged) {
        try {
          const changedEvt: CellValueChangedEvent = {
            row: rowData,
            rowKey,
            rowIndex,
            column: colDef,
            oldValue,
            newValue: finalValue,
            updateRow: (patch) => {
              Object.assign(cascadingPatch, patch);
              store.updateRowFields?.(rowKey, patch);
            },
          };
          const res = onCellValueChanged(changedEvt);
          if (res instanceof Promise) {
            loadingRowKeysRef.current.add(rowKey);
            requestRender();
            const asyncPatch = await res;
            if (asyncPatch && typeof asyncPatch === 'object') {
              Object.assign(cascadingPatch, asyncPatch);
              await store.updateRowFields?.(rowKey, asyncPatch);
            }
            loadingRowKeysRef.current.delete(rowKey);
          } else if (res && typeof res === 'object') {
            Object.assign(cascadingPatch, res);
            await store.updateRowFields?.(rowKey, res);
          }
        } catch {
          loadingRowKeysRef.current.delete(rowKey);
        }
      }

      // 7. Record Undo/Redo Command (including any cascading fields!)
      if (recordHistory) {
        const fullNewPatch: Record<string, any> = {
          [colDef.id]: finalValue,
          ...cascadingPatch,
        };
        const fullOldPatch: Record<string, any> = {};
        for (const k of Object.keys(fullNewPatch)) {
          fullOldPatch[k] = prevRowSnapshot[k];
        }

        historyRef.current.push({
          description: `Edit ${colDef.title}`,
          undo: () => {
            store.updateRowFields?.(rowKey, fullOldPatch);
            setStoreVersion((v) => v + 1);
          },
          redo: () => {
            store.updateRowFields?.(rowKey, fullNewPatch);
            setStoreVersion((v) => v + 1);
          },
        });
      }

      onRowUpdated?.({ key: rowKey, data: rowData });
      setStoreVersion((v) => v + 1);
      requestRender();
      return true;
    },
    [
      store,
      canEditCell,
      onCellValueChanging,
      onRowUpdating,
      onCellChange,
      onCellValueChanged,
      onRowUpdated,
      currentLocale,
      showToast,
      requestRender,
    ]
  );

  // ============================================================================
  // BATCH RANGE MUTATION (FOR FILL HANDLE, DUPLICATE & PASTE)
  // ============================================================================
  const applyBatchCellUpdates = useCallback(
    async (
      updates: Array<{ rowIndex: number; rowKey: any; colDef: ColumnDef; newValue: any }>,
      description: string
    ) => {
      if (updates.length === 0) return;

      const allowedUpdates: Array<{
        rowIndex: number;
        rowKey: any;
        colDef: ColumnDef;
        oldValue: any;
        newValue: any;
        rowData: Record<string, any>;
      }> = [];

      for (const u of updates) {
        const vRow = store.getViewRow(u.rowIndex);
        if (!vRow || vRow.type !== 'data') continue;
        if (!canEditCell(vRow.data, u.colDef, u.rowIndex, true)) continue;
        allowedUpdates.push({
          ...u,
          oldValue: vRow.data[u.colDef.id],
          rowData: vRow.data,
        });
      }

      if (allowedUpdates.length === 0) {
        showToast(
          currentLocale.code.startsWith('tr')
            ? 'Seçili hücreler salt okunur (Read-Only).'
            : 'Target cells are Read-Only.',
          'warning'
        );
        return;
      }

      // If single cell, run through full cascading pipeline
      if (allowedUpdates.length === 1) {
        const single = allowedUpdates[0];
        await commitSingleCellEdit(single.rowIndex, single.colDef, single.newValue, true);
        return;
      }

      // Validate all items against column validationRules & validator in parallel
      const isTR = currentLocale.code.startsWith('tr');
      const validatedUpdates: typeof allowedUpdates = [];
      let firstErrorMsg: string | null = null;
      let rejectedCount = 0;

      const validationResults = await Promise.all(
        allowedUpdates.map(async (u) => {
          const valRes = await ValidationEngine.validateCell(u.newValue, u.rowData, u.colDef, isTR);
          return { update: u, valRes };
        })
      );

      for (const { update, valRes } of validationResults) {
        if (valRes.valid) {
          validatedUpdates.push(update);
        } else {
          rejectedCount++;
          if (!firstErrorMsg) {
            firstErrorMsg =
              valRes.message ||
              (isTR ? 'Doğrulama kuralına uymayan değer engellendi!' : 'Invalid value blocked by validation rule!');
          }
        }
      }

      if (rejectedCount > 0 && firstErrorMsg) {
        showToast(
          rejectedCount === 1
            ? `⛔ ${firstErrorMsg}`
            : isTR
            ? `⛔ ${rejectedCount} hücre doğrulama kuralına uymadığı için engellendi (${firstErrorMsg})`
            : `⛔ ${rejectedCount} cells blocked by validation rule (${firstErrorMsg})`,
          'warning'
        );
      }

      if (validatedUpdates.length === 0) {
        return;
      }

      const forwardBatch = validatedUpdates.map((u) => ({
        rowKey: u.rowKey,
        columnId: u.colDef.id,
        value: u.newValue,
      }));
      const backwardBatch = validatedUpdates.map((u) => ({
        rowKey: u.rowKey,
        columnId: u.colDef.id,
        value: u.oldValue,
      }));

      if (store.setCellsBatch) {
        await store.setCellsBatch(forwardBatch);
      } else {
        for (const f of forwardBatch) {
          await store.setCell(f.rowKey, f.columnId, f.value);
        }
      }

      // Trigger onCellChange once per updated column to prevent hundreds of sequential state updates
      const touchedCols = new Set<string>();
      for (const u of validatedUpdates) {
        if (!touchedCols.has(u.colDef.id)) {
          touchedCols.add(u.colDef.id);
          onCellChange?.(u.rowData, u.colDef.id, u.newValue);
        }
        if (u.colDef.setCellValue) {
          const draft: Record<string, any> = {};
          const res = u.colDef.setCellValue(draft, u.newValue, u.rowData, {
            rowKey: u.rowKey,
            columnId: u.colDef.id,
            store,
          });
          if (res instanceof Promise) {
            loadingRowKeysRef.current.add(u.rowKey);
            res.then((patch) => {
              const combined = { ...draft, ...(patch || {}) };
              if (Object.keys(combined).length > 0) {
                store.updateRowFields?.(u.rowKey, combined);
              }
              loadingRowKeysRef.current.delete(u.rowKey);
              requestRender();
            });
          } else {
            const combined = { ...draft, ...(res || {}) };
            if (Object.keys(combined).length > 0) {
              await store.updateRowFields?.(u.rowKey, combined);
            }
          }
        }
      }

      historyRef.current.push({
        description,
        undo: () => {
          store.setCellsBatch?.(backwardBatch);
          setStoreVersion((v) => v + 1);
        },
        redo: () => {
          store.setCellsBatch?.(forwardBatch);
          setStoreVersion((v) => v + 1);
        },
      });

      setStoreVersion((v) => v + 1);
      requestRender();
    },
    [store, canEditCell, commitSingleCellEdit, onCellChange, currentLocale, showToast, requestRender]
  );

  // ============================================================================
  // CRUD ROW ACTIONS (INSERT, DUPLICATE ROW, DELETE ROW, BATCH SAVE)
  // ============================================================================
  const handleInsertRow = useCallback(
    async (targetRowIndex?: number) => {
      if (
        permissions.mode === 'read' ||
        permissions.mode === 'readonly' ||
        permissions.allowAdding === false
      ) {
        showToast(
          currentLocale.code.startsWith('tr')
            ? 'Yeni satır ekleme yetkiniz kapalı.'
            : 'Row insertion is disabled by permissions.',
          'warning'
        );
        return;
      }

      const defaultRow: Record<string, any> = {};
      for (const col of columns) {
        if (col.id === 'id' || col.id.startsWith('__')) continue;
        if (col.defaultValue !== undefined) {
          defaultRow[col.id] = col.defaultValue;
        } else if (col.type === 'boolean') {
          defaultRow[col.id] = false;
        } else if (col.type === 'sparkline') {
          defaultRow[col.id] = [];
        } else {
          defaultRow[col.id] = '';
        }
      }

      if (onRowInserting) {
        const evt: RowInsertingEvent = {
          data: defaultRow,
          targetRowIndex,
          cancel: false,
        };
        await onRowInserting(evt);
        if (evt.cancel) return;
      }

      const created = await store.insertRow?.(defaultRow, targetRowIndex);
      if (created) {
        const newKey = created.id;
        historyRef.current.push({
          description: 'Insert Row',
          undo: () => {
            store.deleteRow?.(newKey);
            setStoreVersion((v) => v + 1);
          },
          redo: () => {
            store.restoreRow?.(created, 0);
            setStoreVersion((v) => v + 1);
          },
        });
        onRowInserted?.({ data: created, key: newKey });
        showToast(
          currentLocale.code.startsWith('tr')
            ? `✨ Yeni satır eklendi (#${newKey})`
            : `✨ New row inserted (#${newKey})`,
          'success'
        );
        setStoreVersion((v) => v + 1);
        requestRender();
      }
    },
    [permissions, columns, onRowInserting, store, onRowInserted, currentLocale, showToast, requestRender]
  );

  const handleDuplicateRow = useCallback(
    async (rowIndex?: number) => {
      const targetIdx = rowIndex ?? selectionRef.current.activeCell.row;
      const vRow = store.getViewRow(targetIdx);
      if (!vRow || vRow.type !== 'data') return;

      if (
        permissions.mode === 'read' ||
        permissions.mode === 'readonly' ||
        permissions.allowDuplicating === false ||
        permissions.allowAdding === false
      ) {
        showToast(
          currentLocale.code.startsWith('tr')
            ? 'Satır çoğaltma yetkisi kapalı.'
            : 'Row duplication is disabled by permissions.',
          'warning'
        );
        return;
      }

      if (onCloneRow) {
        await onCloneRow(targetIdx, vRow.data);
        setStoreVersion((v) => v + 1);
        requestRender();
        return;
      }

      const sourceKey = vRow.data.id ?? targetIdx;
      const duplicated = await store.duplicateRow?.(sourceKey, targetIdx);
      if (duplicated) {
        const newKey = duplicated.id;
        historyRef.current.push({
          description: 'Duplicate Row',
          undo: () => {
            store.deleteRow?.(newKey);
            setStoreVersion((v) => v + 1);
          },
          redo: () => {
            store.restoreRow?.(duplicated, targetIdx + 1);
            setStoreVersion((v) => v + 1);
          },
        });
        onRowInserted?.({ data: duplicated, key: newKey });
        showToast(
          currentLocale.code.startsWith('tr')
            ? `📑 Satır çoğaltıldı (#${sourceKey} → #${newKey})`
            : `📑 Row duplicated (#${sourceKey} → #${newKey})`,
          'success'
        );
        setStoreVersion((v) => v + 1);
        requestRender();
      }
    },
    [store, permissions, onCloneRow, onRowInserted, currentLocale, showToast, requestRender]
  );

  const handleDeleteRow = useCallback(
    async (rowIndex?: number) => {
      if (
        permissions.mode === 'read' ||
        permissions.mode === 'readonly' ||
        permissions.allowDeleting === false
      ) {
        showToast(
          currentLocale.code.startsWith('tr')
            ? 'Satır silme yetkisi kapalı.'
            : 'Row deletion is disabled by permissions.',
          'warning'
        );
        return;
      }

      // If multiple/single rows are checked via Selection Column and no explicit context-menu rowIndex was forced
      if (selectedRowKeysSet.size > 0 && rowIndex === undefined) {
        const keysToDelete = Array.from(selectedRowKeysSet);
        const sampleRows: Record<string, any>[] = [];
        const totalView = store.getRowCount();
        for (let r = 0; r < totalView && sampleRows.length < 4; r++) {
          const vr = store.getViewRow(r);
          if (vr && vr.type === 'data' && selectedRowKeysSet.has(vr.data.id ?? r)) {
            sampleRows.push(vr.data);
          }
        }
        setDeleteConfirmModal({
          rowKeys: keysToDelete,
          sampleRows,
        });
        return;
      }

      const targetIdx = rowIndex ?? selectionRef.current.activeCell.row;
      const vRow = store.getViewRow(targetIdx);
      if (!vRow || vRow.type !== 'data') return;

      const rowKey = vRow.data.id ?? targetIdx;
      const snapshot = { ...vRow.data };

      // Open confirmation modal for single row deletion as well
      setDeleteConfirmModal({
        rowKeys: [rowKey],
        sampleRows: [snapshot],
        singleRowIndex: targetIdx,
      });
    },
    [permissions, selectedRowKeysSet, store, currentLocale, showToast]
  );

  const executeConfirmedDelete = useCallback(
    async (onProgress: (processed: number, total: number) => void) => {
      if (!deleteConfirmModal) return;
      const { rowKeys, sampleRows, singleRowIndex } = deleteConfirmModal;

      if (rowKeys.length === 1 && singleRowIndex !== undefined && sampleRows[0]) {
        const rowKey = rowKeys[0];
        const snapshot = sampleRows[0];
        if (onRowRemoving) {
          const evt: RowRemovingEvent = { key: rowKey, data: snapshot, cancel: false };
          await onRowRemoving(evt);
          if (evt.cancel) {
            setDeleteConfirmModal(null);
            return;
          }
        }
        onProgress(1, 1);
        await store.deleteRow?.(rowKey);
        if (selectedRowKeysSet.has(rowKey)) {
          setSelectedRowKeysSet((prev) => {
            const next = new Set(prev);
            next.delete(rowKey);
            return next;
          });
        }
        historyRef.current.push({
          description: 'Delete Row',
          undo: () => {
            store.restoreRow?.(snapshot, singleRowIndex);
            setStoreVersion((v) => v + 1);
          },
          redo: () => {
            store.deleteRow?.(rowKey);
            setStoreVersion((v) => v + 1);
          },
        });
        onRowRemoved?.({ key: rowKey, data: snapshot });
        setDeleteConfirmModal(null);
        showToast(
          currentLocale.code.startsWith('tr')
            ? `🗑️ Satır silindi (#${rowKey})`
            : `🗑️ Row deleted (#${rowKey})`,
          'info'
        );
        setStoreVersion((v) => v + 1);
        requestRender();
        return;
      }

      // Multi-row / Bulk deletion with progress bar and O(N) chunked processing
      if (onRowRemoving && sampleRows[0]) {
        const evt: RowRemovingEvent = {
          key: rowKeys[0],
          data: sampleRows[0],
          cancel: false,
        };
        await onRowRemoving(evt);
        if (evt.cancel) {
          setDeleteConfirmModal(null);
          return;
        }
      }

      if (store.deleteRowsBatch) {
        await store.deleteRowsBatch(rowKeys, onProgress);
      } else {
        for (let i = 0; i < rowKeys.length; i++) {
          await store.deleteRow?.(rowKeys[i]);
          onProgress(i + 1, rowKeys.length);
        }
      }

      setSelectedRowKeysSet(new Set());
      onSelectionChanged?.([], []);
      onRowRemoved?.({
        key: `${rowKeys.length} rows`,
        data: { deletedCount: rowKeys.length, sampleKeys: rowKeys.slice(0, 20) },
      });
      setDeleteConfirmModal(null);
      showToast(
        currentLocale.code.startsWith('tr')
          ? `🗑️ Seçili ${rowKeys.length.toLocaleString('tr-TR')} satır silindi.`
          : `🗑️ Deleted ${rowKeys.length.toLocaleString('en-US')} selected rows.`,
        'info'
      );
      setStoreVersion((v) => v + 1);
      requestRender();
    },
    [
      deleteConfirmModal,
      store,
      selectedRowKeysSet,
      onSelectionChanged,
      onRowRemoving,
      onRowRemoved,
      currentLocale,
      showToast,
      requestRender,
    ]
  );

  const commitBatchSave = useCallback(async () => {
    const changes = store.getPendingChanges?.();
    if (!changes) return;

    if (onSaving) {
      const evt: SavingEvent = { changes, cancel: false };
      await onSaving(evt);
      if (evt.cancel) return;
    }

    const committed = await store.saveBatchChanges?.();
    if (committed) {
      onSaved?.({ changes: committed });
      const count =
        (committed.inserted?.length || 0) +
        (committed.updated?.length || 0) +
        (committed.deleted?.length || 0);
      showToast(
        currentLocale.code.startsWith('tr')
          ? `✅ Toplu kayıt başarılı (${count} işlem kaydedildi).`
          : `✅ Batch save completed (${count} changes committed).`,
        'success'
      );
      setStoreVersion((v) => v + 1);
      requestRender();
    }
  }, [store, onSaving, onSaved, currentLocale, showToast, requestRender]);

  const handleSaveBatch = useCallback(() => {
    const fastCount = store.getPendingChangesCount?.();
    if (fastCount !== undefined && fastCount > 1) {
      setShowBatchModal(true);
      return;
    }
    const changes = store.getPendingChanges?.();
    if (!changes) return;
    const totalOps =
      (changes.inserted?.length || 0) +
      (changes.updated?.length || 0) +
      (changes.deleted?.length || 0);

    // If there are multiple operations or any row deletions, open the Batch Changes Summary Modal first!
    if (totalOps > 1 || (changes.deleted?.length || 0) > 0) {
      setShowBatchModal(true);
      return;
    }
    commitBatchSave();
  }, [store, commitBatchSave]);

  const handleDiscardBatch = useCallback(() => {
    store.discardBatchChanges?.();
    historyRef.current.clear();
    showToast(
      currentLocale.code.startsWith('tr')
        ? '↩️ Kaydedilmemiş tüm değişiklikler geri alındı.'
        : '↩️ All unsaved batch changes discarded.',
      'info'
    );
    setStoreVersion((v) => v + 1);
    requestRender();
  }, [store, currentLocale, showToast, requestRender]);

  // ============================================================================
  // CELL DUPLICATION HELPERS (FILL DOWN, FILL RIGHT & DRAG AUTOFILL)
  // ============================================================================
  const handleDuplicateCellDown = useCallback(() => {
    const norm = selectionRef.current.getNormalizedRange();
    const geom = geometryRef.current;
    const keyField = (store as any).getKeyField?.() || 'id';
    const updates: Array<{ rowIndex: number; rowKey: any; colDef: ColumnDef; newValue: any }> = [];

    if (norm.maxRow > norm.minRow) {
      // Excel Ctrl+D when multiple rows selected: copy top row of selection down into all selected rows
      const topRow = store.getViewRow(norm.minRow);
      if (!topRow || topRow.type !== 'data') return;
      for (let r = norm.minRow + 1; r <= norm.maxRow; r++) {
        const targetRow = store.getViewRow(r);
        if (!targetRow || targetRow.type !== 'data') continue;
        for (let c = norm.minCol; c <= norm.maxCol; c++) {
          const colDef = geom.columns[c];
          if (!colDef) continue;
          updates.push({
            rowIndex: r,
            rowKey: targetRow.data[keyField] ?? targetRow.data.id ?? r,
            colDef,
            newValue: topRow.data[colDef.id],
          });
        }
      }
    } else {
      // Single row selected: duplicate active cell(s) into the row directly below (and move selection down)
      const nextR = norm.minRow + 1;
      if (nextR >= store.getRowCount()) return;
      const srcRow = store.getViewRow(norm.minRow);
      const dstRow = store.getViewRow(nextR);
      if (!srcRow || srcRow.type !== 'data' || !dstRow || dstRow.type !== 'data') return;

      for (let c = norm.minCol; c <= norm.maxCol; c++) {
        const colDef = geom.columns[c];
        if (!colDef) continue;
        updates.push({
          rowIndex: nextR,
          rowKey: dstRow.data[keyField] ?? dstRow.data.id ?? nextR,
          colDef,
          newValue: srcRow.data[colDef.id],
        });
      }
      selectionRef.current.setActiveCell(nextR, selectionRef.current.activeCell.col);
      setSelectedCellUI({ row: nextR, col: selectionRef.current.activeCell.col });
      setSelectionVersion((v) => v + 1);
    }

    applyBatchCellUpdates(updates, 'Duplicate Cell Down');
  }, [store, applyBatchCellUpdates]);

  const handleDuplicateCellRight = useCallback(() => {
    const norm = selectionRef.current.getNormalizedRange();
    const geom = geometryRef.current;
    const keyField = (store as any).getKeyField?.() || 'id';
    const updates: Array<{ rowIndex: number; rowKey: any; colDef: ColumnDef; newValue: any }> = [];

    if (norm.maxCol > norm.minCol) {
      // Excel Ctrl+R when multiple columns selected: copy leftmost column into selected columns on right
      for (let r = norm.minRow; r <= norm.maxRow; r++) {
        const vRow = store.getViewRow(r);
        if (!vRow || vRow.type !== 'data') continue;
        const srcColDef = geom.columns[norm.minCol];
        if (!srcColDef) continue;
        const srcVal = vRow.data[srcColDef.id];

        for (let c = norm.minCol + 1; c <= norm.maxCol; c++) {
          const dstColDef = geom.columns[c];
          if (!dstColDef) continue;
          const plugin = ColumnTypeRegistry.get(dstColDef.type);
          const coercedVal = plugin.parseClipboard
            ? plugin.parseClipboard(String(srcVal ?? ''), dstColDef)
            : srcVal;
          updates.push({
            rowIndex: r,
            rowKey: vRow.data[keyField] ?? vRow.data.id ?? r,
            colDef: dstColDef,
            newValue: coercedVal,
          });
        }
      }
    } else {
      // Single column selected: duplicate into next editable column on the right (or below if same type)
      const nextC = norm.minCol + 1;
      if (nextC < geom.columns.length) {
        const srcColDef = geom.columns[norm.minCol];
        const dstColDef = geom.columns[nextC];
        if (srcColDef && dstColDef) {
          for (let r = norm.minRow; r <= norm.maxRow; r++) {
            const vRow = store.getViewRow(r);
            if (!vRow || vRow.type !== 'data') continue;
            const srcVal = vRow.data[srcColDef.id];
            const plugin = ColumnTypeRegistry.get(dstColDef.type);
            const coercedVal = plugin.parseClipboard
              ? plugin.parseClipboard(String(srcVal ?? ''), dstColDef)
              : srcVal;
            updates.push({
              rowIndex: r,
              rowKey: vRow.data[keyField] ?? vRow.data.id ?? r,
              colDef: dstColDef,
              newValue: coercedVal,
            });
          }
          selectionRef.current.setActiveCell(selectionRef.current.activeCell.row, nextC);
          setSelectedCellUI({ row: selectionRef.current.activeCell.row, col: nextC });
          setSelectionVersion((v) => v + 1);
        }
      }
    }

    applyBatchCellUpdates(updates, 'Duplicate Cell Right');
  }, [store, applyBatchCellUpdates]);

  // ============================================================================
  // COLUMN SORTING, GROUPING, FILTERING & COLUMN UPDATES
  // ============================================================================
  const handleHeaderSort = (colIndex: number, isShift: boolean, explicitDesc?: boolean | null) => {
    if (permissions.allowSorting === false) return;
    const col = geometryRef.current.columns[colIndex];
    if (!col || col.sortable === false) return;

    let nextRules: SortDescriptor[] = [];
    const existingIndex = sortRules.findIndex((s) => s.selector === col.id);

    if (explicitDesc !== undefined) {
      if (explicitDesc === null) {
        nextRules = sortRules.filter((s) => s.selector !== col.id);
      } else {
        nextRules = [{ selector: col.id, desc: explicitDesc }];
      }
    } else if (isShift) {
      nextRules = [...sortRules];
      if (existingIndex !== -1) {
        if (!nextRules[existingIndex].desc) {
          nextRules[existingIndex] = { ...nextRules[existingIndex], desc: true };
        } else {
          nextRules.splice(existingIndex, 1);
        }
      } else {
        nextRules.push({ selector: col.id, desc: false });
      }
    } else {
      if (existingIndex !== -1) {
        if (!sortRules[existingIndex].desc) {
          nextRules = [{ selector: col.id, desc: true }];
        } else {
          nextRules = [];
        }
      } else {
        nextRules = [{ selector: col.id, desc: false }];
      }
    }

    setSortRules(nextRules);
    store.setSorting(nextRules);
  };

  const handleToggleGroupColumn = (colId: string) => {
    if (permissions.allowGrouping === false) return;
    const targetCol = columns.find((c) => c.id === colId);
    if (targetCol && (targetCol.type === 'sparkline' || targetCol.type === 'action' || targetCol.groupable === false)) {
      return;
    }
    setGroups((prevGroups) => {
      const exists = prevGroups.some((g) => g.selector === colId);
      const nextGroups = exists
        ? prevGroups.filter((g) => g.selector !== colId)
        : [...prevGroups, { selector: colId }];
      store.setGrouping(nextGroups);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
      scrollPosRef.current.top = 0;
      selectionRef.current.setActiveCell(0, 0);
      setSelectedCellUI({ row: 0, col: 0 });
      setStoreVersion((v) => v + 1);
      requestRender();

      const colTitle = columns.find((c) => c.id === colId)?.title.replace(' ⚡', '') || colId;
      showToast(
        exists
          ? currentLocale.code.startsWith('tr')
            ? `📂 "${colTitle}" gruplaması kaldırıldı.`
            : `📂 Ungrouped "${colTitle}".`
          : currentLocale.code.startsWith('tr')
          ? `📁 "${colTitle}" sütununa göre gruplandı. Satırları görmek için gruba tıklayın.`
          : `📁 Grouped by "${colTitle}". Click any group row to expand.`,
        'info'
      );
      return nextGroups;
    });
  };

  const handleApplyColumnFilter = async (colId: string, filterState: ColumnFilterState | null) => {
    const next = { ...columnFilters };
    if (!filterState) {
      delete next[colId];
    } else {
      next[colId] = filterState;
    }
    setColumnFilters(next);

    const compiled = compileColumnFilters(next);
    await store.setFilter(compiled);

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    scrollPosRef.current.top = 0;

    const maxR = Math.max(0, store.getRowCount() - 1);
    const activeCol = selectionRef.current.activeCell.col;
    selectionRef.current.setActiveCell(Math.min(selectionRef.current.activeCell.row, maxR), activeCol);

    setStoreVersion((v) => v + 1);
    requestRender();

    const matchedCount = store.getFilteredRowCount?.() ?? store.getRowCount();
    const isTR = currentLocale.code.startsWith('tr');
    if (filterState) {
      showToast(
        isTR
          ? `🔍 Filtre uygulandı: ${matchedCount.toLocaleString('tr-TR')} kayıt listeleniyor.`
          : `🔍 Filter applied: ${matchedCount.toLocaleString('en-US')} matching rows.`,
        'info'
      );
    } else {
      showToast(
        isTR ? '🧹 Sütun filtresi temizlendi.' : '🧹 Column filter cleared.',
        'info'
      );
    }
    onFilterChange?.(compiled, next);
  };

  const handleClearAllFilters = async () => {
    setColumnFilters({});
    await store.setFilter(null);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    scrollPosRef.current.top = 0;
    setStoreVersion((v) => v + 1);
    requestRender();
    onFilterChange?.(null, {});
  };

  const handleChangeSummaryType = (colId: string, summaryType: SummaryType) => {
    store.setSummaryType?.(colId, summaryType);
    setStoreVersion((v) => v + 1);
    requestRender();
  };

  // ============================================================================
  // DRAG SELECTION & FILL HANDLE DRAG EFFECT (WITH AUTO-SCROLL AT EDGES)
  // ============================================================================
  useEffect(() => {
    if (!isDraggingSelection && !isDraggingRowNumbers && !fillDragState) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const surface = gridSurfaceRef.current;
      const sc = scrollContainerRef.current;
      if (!surface || !sc) return;

      const rect = surface.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Auto-scroll when dragging near viewport edges
      checkEdgeAutoScroll(x, y, rect);

      const rowCount = store.getRowCount();
      if (rowCount === 0) return;

      const clampedY = Math.max(geometryRef.current.headerHeight + 2, Math.min(y, rect.height - 2));
      const virtualY = clampedY - geometryRef.current.headerHeight + scrollPosRef.current.top;
      const targetRow = Math.max(0, Math.min(rowCount - 1, Math.floor(virtualY / geometryRef.current.rowHeight)));

      if (isDraggingRowNumbers) {
        selectionRef.current.setRangeEnd(targetRow, geometryRef.current.columns.length - 1);
        setSelectionVersion((v) => v + 1);
        requestRender();
        return;
      }

      const hit = geometryRef.current.hitTest(
        Math.max(geometryRef.current.rowNumberWidth + 2, Math.min(x, rect.width - 2)),
        clampedY,
        scrollPosRef.current.left,
        scrollPosRef.current.top,
        rowCount
      );
      if (!hit) return;

      if (isDraggingSelection) {
        const selRange = selectionRef.current.selectionRange;
        const startCol = selRange ? selRange.startCol : selectionRef.current.activeCell.col;
        const startColDef = geometryRef.current.columns[startCol];
        const startColType = (startColDef?.type || '').toLowerCase();
        if (startColType === 'action' || startColType === 'pdf') {
          setIsDraggingSelection(false);
          return;
        }

        selectionRef.current.setRangeEnd(hit.row, hit.col);
        setSelectionVersion((v) => v + 1);
        requestRender();
      } else if (fillDragState) {
        const srcColDef = geometryRef.current.columns[fillDragState.sourceRange.minCol];
        const srcColType = (srcColDef?.type || '').toLowerCase();
        if (srcColType === 'action' || srcColType === 'pdf') {
          setFillDragState(null);
          return;
        }
        const src = fillDragState.sourceRange;
        const minRow = Math.min(src.minRow, hit.row);
        const maxRow = Math.max(src.maxRow, hit.row);
        const minCol = Math.min(src.minCol, hit.col);
        const maxCol = Math.max(src.maxCol, hit.col);

        setFillDragState((prev) =>
          prev
            ? {
                ...prev,
                targetRange: { minRow, maxRow, minCol, maxCol },
              }
            : null
        );
      }
    };

    const handleWindowMouseUp = () => {
      if (isDraggingSelection) {
        setIsDraggingSelection(false);
      }
      if (isDraggingRowNumbers) {
        setIsDraggingRowNumbers(false);
      }
      if (fillDragState) {
        const { mode, sourceRange, targetRange } = fillDragState;
        setFillDragState(null);

        const isSameRange =
          sourceRange.minRow === targetRange.minRow &&
          sourceRange.maxRow === targetRange.maxRow &&
          sourceRange.minCol === targetRange.minCol &&
          sourceRange.maxCol === targetRange.maxCol;

        if (isSameRange && mode === 'right-duplicate') {
          // Single click on right-side duplicate button -> duplicate cell down or right!
          handleDuplicateCellDown();
          return;
        }

        if (!isSameRange) {
          const geom = geometryRef.current;
          const updates: Array<{ rowIndex: number; rowKey: any; colDef: ColumnDef; newValue: any }> = [];
          const srcHeight = sourceRange.maxRow - sourceRange.minRow + 1;
          const srcWidth = sourceRange.maxCol - sourceRange.minCol + 1;

          for (let r = targetRange.minRow; r <= targetRange.maxRow; r++) {
            const dstRow = store.getViewRow(r);
            if (!dstRow || dstRow.type !== 'data') continue;

            for (let c = targetRange.minCol; c <= targetRange.maxCol; c++) {
              // Skip cells that were already inside sourceRange
              if (
                r >= sourceRange.minRow &&
                r <= sourceRange.maxRow &&
                c >= sourceRange.minCol &&
                c <= sourceRange.maxCol
              ) {
                continue;
              }

              const srcR =
                sourceRange.minRow +
                ((((r - sourceRange.minRow) % srcHeight) + srcHeight) % srcHeight);
              const srcC =
                sourceRange.minCol +
                ((((c - sourceRange.minCol) % srcWidth) + srcWidth) % srcWidth);

              const srcViewRow = store.getViewRow(srcR);
              const srcColDef = geom.columns[srcC];
              const dstColDef = geom.columns[c];
              if (!srcViewRow || srcViewRow.type !== 'data' || !srcColDef || !dstColDef) continue;

              let val = srcViewRow.data[srcColDef.id];

              // Smart Series increment for Account Code patterns (e.g. ACC-100001)
              if (typeof val === 'string' && /^([A-Za-z-]+)(\d+)$/.test(val) && srcC === c) {
                const m = val.match(/^([A-Za-z-]+)(\d+)$/);
                if (m) {
                  const offset = r - srcR;
                  val = `${m[1]}${Number(m[2]) + offset}`;
                }
              } else if (srcC !== c) {
                const plugin = ColumnTypeRegistry.get(dstColDef.type);
                if (plugin.parseClipboard) {
                  val = plugin.parseClipboard(String(val ?? ''), dstColDef);
                }
              }

              updates.push({
                rowIndex: r,
                rowKey: dstRow.data.id ?? r,
                colDef: dstColDef,
                newValue: val,
              });
            }
          }

          selectionRef.current.selectionRange = {
            startRow: targetRange.minRow,
            startCol: targetRange.minCol,
            endRow: targetRange.maxRow,
            endCol: targetRange.maxCol,
          };
          setSelectionVersion((v) => v + 1);
          applyBatchCellUpdates(updates, 'AutoFill Cells');
        }
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('blur', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('blur', handleWindowMouseUp);
    };
  }, [
    isDraggingSelection,
    isDraggingRowNumbers,
    fillDragState,
    store,
    applyBatchCellUpdates,
    handleDuplicateCellDown,
    requestRender,
  ]);

  // ============================================================================
  // NAVIGATION & AUTO-SCROLL INTO VIEW
  // ============================================================================
  const moveSelection = (dRow: number, dCol: number, isRangeSelect: boolean = false) => {
    hookMoveSelection(
      dRow,
      dCol,
      isRangeSelect,
      store.getRowCount(),
      geometryRef.current.columns.length
    );
    const active = getActiveCell();
    ensureCellVisible(active.row, active.col);
  };

  // ============================================================================
  // OPEN INLINE MICRO-DOM EDITOR
  // ============================================================================
  const openEditorForCell = useCallback(
    (row: number, col: number, initialChar?: string) => {
      const geom = geometryRef.current;
      const colDef = geom.columns[col];
      const vRow = store.getViewRow(row);
      if (!vRow || vRow.type === 'group' || !colDef) return;

      if (colDef.type === 'sparkline') {
        setSparklineModal({
          rowIndex: row,
          rowData: vRow.data,
          column: colDef,
          points: Array.isArray(vRow.data[colDef.id]) ? vRow.data[colDef.id] : [],
        });
        return;
      }

      if (!canEditCell(vRow.data, colDef, row, false)) return;

      // Check if custom editor, registry editor, legacy plugin editor, or default editor is available
      const hasCustomEditor = Boolean(colDef.editor) || CellEditorRegistry.has(colDef.type);
      const plugin = ColumnTypeRegistry.get(colDef.type);
      const hasPluginEditor = Boolean(plugin?.editorComponent);
      const isSpecialInteractive = colDef.type === 'action' || colDef.type === 'pdf';
      if (isSpecialInteractive && !hasCustomEditor && !hasPluginEditor) return;

      const screenRect = geom.getColumnScreenRect(col, scrollPosRef.current.left);
      const y = geom.headerHeight + row * geom.rowHeight - scrollPosRef.current.top;

      setEditorValidationError(null);
      setIsEditorValidating(false);
      setActiveOverlay({
        row,
        col,
        x: screenRect.x,
        y,
        width: screenRect.width,
        height: geom.rowHeight,
        column: colDef,
        initialValue: vRow.data[colDef.id],
        initialChar,
      });
    },
    [canEditCell, store]
  );

  openEditorRef.current = openEditorForCell;

  const startEditingCell = useCallback(
    (col: number, row: number, initialChar?: string) => {
      openEditorForCell(row, col, initialChar);
    },
    [openEditorForCell]
  );

  // ============================================================================
  // VIEWPORT MOUSE EVENTS (FIXED COORDINATE SYSTEM)
  // ============================================================================
  const handleSurfaceMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (resizingCol || isDraggingSelection || isDraggingRowNumbers || fillDragState) return;
    const { x, y, onScrollbar } = getViewportCoords(e);
    if (onScrollbar) {
      setCursorStyle('default');
      return;
    }

    const geom = geometryRef.current;
    const sl = scrollPosRef.current.left;
    const st = scrollPosRef.current.top;

    // 1. Check Resize Handle
    const resizeHit = geom.hitTestColumnResize(x, y, sl);
    if (resizeHit) {
      setCursorStyle('col-resize');
      if (hoveredFilterColRef.current !== null) {
        hoveredFilterColRef.current = null;
        requestRender();
      }
      return;
    }

    // 2. Check Header & Filter Button Hover
    if (y <= geom.headerHeight) {
      const headerHit = geom.hitTestHeader(x, y, sl);
      const nextFilterCol = headerHit?.isFilterIconHit ? headerHit.colIndex : null;
      if (hoveredFilterColRef.current !== nextFilterCol) {
        hoveredFilterColRef.current = nextFilterCol;
        requestRender();
      }
      setCursorStyle(headerHit ? 'pointer' : 'default');
      return;
    }

    if (hoveredFilterColRef.current !== null) {
      hoveredFilterColRef.current = null;
      requestRender();
    }

    // 2b. Check Group Row Hover (Across entire row width including left chevron)
    const hoveredRowIdx = Math.floor((y - geom.headerHeight + st) / geom.rowHeight);
    if (hoveredRowIdx >= 0 && hoveredRowIdx < store.getRowCount()) {
      const hVRow = store.getViewRow(hoveredRowIdx);
      if (hVRow && hVRow.type === 'group') {
        if (hoveredCellRef.current?.row !== hoveredRowIdx || hoveredCellRef.current?.col !== -1) {
          hoveredCellRef.current = { row: hoveredRowIdx, col: -1 };
          requestRender();
        }
        setCursorStyle('pointer');
        return;
      }
    }

    // 3. Check Fill Handle / Right Duplicate Button Hover (Skip for sparkline / action / readonly)
    const normForHover = selectionRef.current.getNormalizedRange();
    const activeColForHover = geom.columns[normForHover.maxCol];
    const hoverColType = (activeColForHover?.type || '').toLowerCase();
    const isSpecialNonDup =
      !activeColForHover ||
      hoverColType === 'sparkline' ||
      hoverColType === 'action' ||
      hoverColType === 'pdf' ||
      CanvasRenderer.isColumnReadonly(activeColForHover, permissions);

    if (!isSpecialNonDup) {
      const fhHit = geom.hitTestFillHandle(x, y, sl, st, selectionRef.current);
      if (fhHit) {
        setCursorStyle(fhHit === 'corner' ? 'crosshair' : 'copy');
        return;
      }
    }

    // 4. Check Row Number Gutter
    if (x <= geom.rowNumberWidth) {
      setCursorStyle('pointer');
      return;
    }

    // 5. Cell Hover
    const hit = geom.hitTest(x, y, sl, st, store.getRowCount());
    if (
      hit?.row !== hoveredCellRef.current?.row ||
      hit?.col !== hoveredCellRef.current?.col
    ) {
      hoveredCellRef.current = hit ? { row: hit.row, col: hit.col } : null;
      requestRender();
    }
    setCursorStyle('cell');
  };

  const handleSurfaceMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only left click here; right click handled in onContextMenu

    const { x, y, onScrollbar } = getViewportCoords(e);
    if (onScrollbar) return; // Let native scrollbar handle thumb dragging

    if (activeOverlay) setActiveOverlay(null);
    if (headerFilterState) setHeaderFilterState(null);
    if (contextMenu) setContextMenu(null);

    const geom = geometryRef.current;
    const sl = scrollPosRef.current.left;
    const st = scrollPosRef.current.top;
    const rowCount = store.getRowCount();

    // A. Column Resize Handle
    const resizeHit = geom.hitTestColumnResize(x, y, sl);
    if (resizeHit) {
      const col = geom.columns[resizeHit.colIndex];
      setResizingCol({
        colIndex: resizeHit.colIndex,
        colId: col.id,
        startX: e.clientX,
        initialWidth: col.width,
      });
      return;
    }

    // B. Top-Left Select-All Box
    if (x <= geom.rowNumberWidth && y <= geom.headerHeight) {
      if (rowCount > 0 && geom.columns.length > 0) {
        selectionRef.current.setActiveCell(0, 0);
        selectionRef.current.setRangeEnd(rowCount - 1, geom.columns.length - 1);
        setSelectedCellUI({ row: 0, col: 0 });
        setSelectionVersion((v) => v + 1);
        requestRender();
      }
      return;
    }

    // C. Header Click (Select-All Checkbox, Sort, or Filter Funnel Button)
    if (y <= geom.headerHeight && x > geom.rowNumberWidth) {
      const headerHit = geom.hitTestHeader(x, y, sl);
      if (headerHit) {
        if (headerHit.column.id === '__selection__' && rowSelectionMode === 'multiple') {
          if (rowCount > 0 && selectedRowKeysSet.size >= rowCount) {
            setSelectedRowKeysSet(new Set());
            onSelectionChanged?.([], []);
          } else {
            const nextKeys = new Set<any>();
            const nextData: any[] = [];
            for (let r = 0; r < rowCount; r++) {
              const vr = store.getViewRow(r);
              if (vr && vr.type === 'data') {
                const k = vr.data.id ?? r;
                nextKeys.add(k);
                nextData.push(vr.data);
              }
            }
            setSelectedRowKeysSet(nextKeys);
            onSelectionChanged?.(Array.from(nextKeys), nextData);
          }
          requestRender();
          return;
        }
        if (
          headerHit.isGroupHeaderHit &&
          headerHit.groupColIndices &&
          headerHit.groupColIndices.length > 0
        ) {
          if (rowCount > 0) {
            const startCol = headerHit.groupColIndices[0];
            const endCol = headerHit.groupColIndices[headerHit.groupColIndices.length - 1];
            selectionRef.current.setActiveCell(0, startCol);
            selectionRef.current.setRangeEnd(rowCount - 1, endCol);
            setSelectedCellUI({ row: 0, col: startCol });
            setSelectionVersion((v) => v + 1);
            requestRender();
          }
          return;
        }
        if (headerHit.isFilterIconHit && permissions.allowFiltering !== false) {
          setHeaderFilterState({
            column: headerHit.column,
            rect: {
              x: headerHit.headerX,
              y: 0,
              width: headerHit.headerWidth,
              height: geom.headerHeight,
            },
          });
        } else {
          handleHeaderSort(headerHit.colIndex, e.shiftKey);
        }
      }
      return;
    }

    // C2. Group Row Click (Works anywhere across the group row, including the left ▶/▼ chevron!)
    if (y > geom.headerHeight) {
      const clickedRowIdx = Math.floor((y - geom.headerHeight + st) / geom.rowHeight);
      if (clickedRowIdx >= 0 && clickedRowIdx < rowCount) {
        const clickedVRow = store.getViewRow(clickedRowIdx);
        if (clickedVRow && clickedVRow.type === 'group') {
          store.toggleGroup(clickedVRow.groupKey);
          setStoreVersion((v) => v + 1);
          requestRender();
          containerRef.current?.focus();
          return;
        }
      }
    }

    // D. Fill Handle or Right-Side Cell Duplicate Handle
    const normForDup = selectionRef.current.getNormalizedRange();
    const activeColForDup = geom.columns[normForDup.maxCol];
    const dupColType = (activeColForDup?.type || '').toLowerCase();
    const isSpecialNonDupCol =
      !activeColForDup ||
      dupColType === 'sparkline' ||
      dupColType === 'action' ||
      dupColType === 'pdf' ||
      CanvasRenderer.isColumnReadonly(activeColForDup, permissions);

    const canDup =
      !isSpecialNonDupCol &&
      permissions.mode !== 'read' &&
      permissions.mode !== 'readonly' &&
      permissions.allowUpdating !== false &&
      permissions.allowDuplicating !== false;

    if (canDup) {
      const fhHit = geom.hitTestFillHandle(x, y, sl, st, selectionRef.current);
      if (fhHit) {
        const norm = selectionRef.current.getNormalizedRange();
        setFillDragState({
          mode: fhHit,
          sourceRange: norm,
          targetRange: norm,
        });
        return;
      }
    }

    // E. Row Number Gutter Click (Select Full Row)
    const rowNumHit = geom.hitTestRowNumber(x, y, st, rowCount);
    if (rowNumHit !== null && geom.columns.length > 0) {
      if (e.shiftKey) {
        selectionRef.current.setRangeEnd(rowNumHit, geom.columns.length - 1);
      } else {
        selectionRef.current.setActiveCell(rowNumHit, 0);
        selectionRef.current.setRangeEnd(rowNumHit, geom.columns.length - 1);
        setSelectedCellUI({ row: rowNumHit, col: 0 });
      }
      setIsDraggingRowNumbers(true);
      setSelectionVersion((v) => v + 1);
      requestRender();
      containerRef.current?.focus();
      return;
    }

    // F. Data Cell Click
    const hit = geom.hitTest(x, y, sl, st, rowCount);
    if (!hit) return;

    const vRow = store.getViewRow(hit.row);
    // Group Header Expand/Collapse
    if (vRow && vRow.type === 'group') {
      store.toggleGroup(vRow.groupKey);
      return;
    }

    const colDef = geom.columns[hit.col];
    const colType = (colDef?.type || '').toLowerCase();
    const isInteractiveCol = colType === 'action' || colType === 'pdf';

    if (e.shiftKey && !isInteractiveCol) {
      selectionRef.current.setRangeEnd(hit.row, hit.col);
    } else {
      selectionRef.current.setActiveCell(hit.row, hit.col);
      setSelectedCellUI({ row: hit.row, col: hit.col });
      if (!isInteractiveCol) {
        setIsDraggingSelection(true);
      } else {
        setIsDraggingSelection(false);
      }
    }
    setSelectionVersion((v) => v + 1);

    // Row Selection Column Click ('__selection__')
    if (colDef.id === '__selection__' && vRow && vRow.type === 'data') {
      setIsDraggingSelection(false);
      const rKey = vRow.data.id ?? hit.row;
      setSelectedRowKeysSet((prev) => {
        const next = new Set(prev);
        if (rowSelectionMode === 'single') {
          if (next.has(rKey)) {
            next.clear();
          } else {
            next.clear();
            next.add(rKey);
          }
        } else {
          if (next.has(rKey)) next.delete(rKey);
          else next.add(rKey);
        }
        if (onSelectionChanged) {
          const rowsData: any[] = [];
          for (let r = 0; r < rowCount; r++) {
            const vr = store.getViewRow(r);
            if (vr && vr.type === 'data' && next.has(vr.data.id ?? r)) {
              rowsData.push(vr.data);
            }
          }
          onSelectionChanged(Array.from(next), rowsData);
        }
        return next;
      });
      requestRender();
      containerRef.current?.focus();
      return;
    }

    const plugin = ColumnTypeRegistry.get(colDef.type);

    // Clicking the expand icon (or clicking a sparkline cell) opens the Detailed Trend Chart Modal
    if (colDef.type === 'sparkline' && vRow && vRow.type === 'data') {
      if (hit.localX > colDef.width - 28) {
        setIsDraggingSelection(false);
        setSparklineModal({
          rowIndex: hit.row,
          rowData: vRow.data,
          column: colDef,
          points: Array.isArray(vRow.data[colDef.id]) ? vRow.data[colDef.id] : [],
        });
        requestRender();
        return;
      }
    }

    if (plugin.onPointerDown && vRow && vRow.type === 'data') {
      // Action & PDF columns work even in read mode; mutable plugins check canEditCell
      const isActionOrPdf = colType === 'action' || colType === 'pdf';
      if (isActionOrPdf || canEditCell(vRow.data, colDef, hit.row, false)) {
        let shouldFocusContainer = true;
        const res = plugin.onPointerDown({
          localX: hit.localX,
          localY: hit.localY,
          value: vRow.data[colDef.id],
          row: vRow.data,
          rowIndex: hit.row,
          column: colDef,
          setValue: (newVal) => {
            commitSingleCellEdit(hit.row, colDef, newVal, true);
          },
        });

        if (res && res.handled) {
          setIsDraggingSelection(false);
          setFillDragState(null);
          selectionRef.current.setActiveCell(hit.row, hit.col);
          setSelectionVersion((v) => v + 1);
        }

        if (res && res.shouldOpenEditor) {
          shouldFocusContainer = false;
          setIsDraggingSelection(false);
          openEditorForCell(hit.row, hit.col);
        }

        requestRender();
        if (shouldFocusContainer) {
          containerRef.current?.focus();
        }
        return;
      }
    }

    requestRender();
    containerRef.current?.focus();
  };

  const handleSurfaceDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const { x, y, onScrollbar } = getViewportCoords(e);
    if (onScrollbar) return;

    const geom = geometryRef.current;
    const sl = scrollPosRef.current.left;
    const st = scrollPosRef.current.top;

    // Double-clicking Fill Handle -> duplicate down!
    const fhHit = geom.hitTestFillHandle(x, y, sl, st, selectionRef.current);
    if (fhHit) {
      handleDuplicateCellDown();
      return;
    }

    const hit = geom.hitTest(x, y, sl, st, store.getRowCount());
    if (!hit) return;

    setIsDraggingSelection(false);
    startEditingCell(hit.col, hit.row);
  };

  const handleSurfaceContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const { x, y, onScrollbar } = getViewportCoords(e);
    if (onScrollbar) return;

    if (activeOverlay) setActiveOverlay(null);
    if (headerFilterState) setHeaderFilterState(null);

    const geom = geometryRef.current;
    const sl = scrollPosRef.current.left;
    const st = scrollPosRef.current.top;
    const rowCount = store.getRowCount();

    // 1. Header Right-Click
    if (y <= geom.headerHeight && x > geom.rowNumberWidth) {
      const headerHit = geom.hitTestHeader(x, y, sl);
      if (headerHit) {
        setContextMenu({
          targetType: 'header',
          x,
          y,
          row: 0,
          col: headerHit.colIndex,
          column: headerHit.column,
        });
      }
      return;
    }

    // 1b. Group Row Right-Click
    if (y > geom.headerHeight) {
      const clickedRowIdx = Math.floor((y - geom.headerHeight + st) / geom.rowHeight);
      if (clickedRowIdx >= 0 && clickedRowIdx < rowCount) {
        const gRow = store.getViewRow(clickedRowIdx);
        if (gRow && gRow.type === 'group') {
          const groupCol = geom.columns.find((c) => c.id === gRow.field) || geom.columns[0];
          setContextMenu({
            targetType: 'cell',
            x,
            y,
            row: clickedRowIdx,
            col: 0,
            column: groupCol,
            rowData: {},
          });
          return;
        }
      }
    }

    // 2. Row Number Right-Click
    const rowNumHit = geom.hitTestRowNumber(x, y, st, rowCount);
    if (rowNumHit !== null) {
      const vRow = store.getViewRow(rowNumHit);
      if (vRow && vRow.type === 'data') {
        selectionRef.current.setActiveCell(rowNumHit, 0);
        selectionRef.current.setRangeEnd(rowNumHit, geom.columns.length - 1);
        setSelectedCellUI({ row: rowNumHit, col: 0 });
        setSelectionVersion((v) => v + 1);
        requestRender();

        setContextMenu({
          targetType: 'rownumber',
          x,
          y,
          row: rowNumHit,
          col: 0,
          column: geom.columns[0],
          rowData: vRow.data,
        });
      }
      return;
    }

    // 3. Cell Right-Click
    const hit = geom.hitTest(x, y, sl, st, rowCount);
    if (!hit) return;

    const vRow = store.getViewRow(hit.row);
    if (!vRow || vRow.type !== 'data') return;

    if (!selectionRef.current.isCellSelected(hit.row, hit.col)) {
      selectionRef.current.setActiveCell(hit.row, hit.col);
      setSelectedCellUI({ row: hit.row, col: hit.col });
      setSelectionVersion((v) => v + 1);
      requestRender();
    }

    setContextMenu({
      targetType: 'cell',
      x,
      y,
      row: hit.row,
      col: hit.col,
      column: geom.columns[hit.col],
      rowData: vRow.data,
    });
  };

  // ============================================================================
  // MOBILE TOUCH GESTURES (DOUBLE-TAP TO EDIT & LONG-PRESS CONTEXT MENU)
  // ============================================================================
  const touchStateRef = useRef<{
    startX: number;
    startY: number;
    moved: boolean;
    longPressTimer: number | null;
    lastTapTime: number;
    lastTapRow: number;
    lastTapCol: number;
  }>({
    startX: 0,
    startY: 0,
    moved: false,
    longPressTimer: null,
    lastTapTime: 0,
    lastTapRow: -1,
    lastTapCol: -1,
  });

  const handleSurfaceTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const surface = gridSurfaceRef.current;
    if (!surface) return;

    const rect = surface.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    if (touchStateRef.current.longPressTimer) {
      window.clearTimeout(touchStateRef.current.longPressTimer);
    }

    touchStateRef.current.startX = touch.clientX;
    touchStateRef.current.startY = touch.clientY;
    touchStateRef.current.moved = false;

    touchStateRef.current.longPressTimer = window.setTimeout(() => {
      if (touchStateRef.current.moved) return;
      const geom = geometryRef.current;
      const sl = scrollPosRef.current.left;
      const st = scrollPosRef.current.top;
      const rowCount = store.getRowCount();
      const hit = geom.hitTest(x, y, sl, st, rowCount);
      if (hit) {
        const vRow = store.getViewRow(hit.row);
        if (vRow && vRow.type === 'data') {
          setIsDraggingSelection(false);
          selectionRef.current.setActiveCell(hit.row, hit.col);
          setSelectedCellUI({ row: hit.row, col: hit.col });
          setSelectionVersion((v) => v + 1);
          requestRender();
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(15);
          }
          setContextMenu({
            targetType: 'cell',
            x,
            y,
            row: hit.row,
            col: hit.col,
            column: geom.columns[hit.col],
            rowData: vRow.data,
          });
        }
      }
    }, 480);
  };

  const handleSurfaceTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStateRef.current.startX);
    const dy = Math.abs(touch.clientY - touchStateRef.current.startY);
    if (dx > 8 || dy > 8) {
      touchStateRef.current.moved = true;
      if (touchStateRef.current.longPressTimer) {
        window.clearTimeout(touchStateRef.current.longPressTimer);
        touchStateRef.current.longPressTimer = null;
      }
      if (isDraggingSelection) {
        setIsDraggingSelection(false);
      }
    }
  };

  const handleSurfaceTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStateRef.current.longPressTimer) {
      window.clearTimeout(touchStateRef.current.longPressTimer);
      touchStateRef.current.longPressTimer = null;
    }
    if (touchStateRef.current.moved || e.changedTouches.length !== 1) return;

    const touch = e.changedTouches[0];
    const surface = gridSurfaceRef.current;
    if (!surface) return;

    const rect = surface.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const geom = geometryRef.current;
    const sl = scrollPosRef.current.left;
    const st = scrollPosRef.current.top;
    const hit = geom.hitTest(x, y, sl, st, store.getRowCount());
    if (!hit) return;

    const now = Date.now();
    if (
      now - touchStateRef.current.lastTapTime < 340 &&
      touchStateRef.current.lastTapRow === hit.row &&
      touchStateRef.current.lastTapCol === hit.col
    ) {
      touchStateRef.current.lastTapTime = 0;
      setIsDraggingSelection(false);
      openEditorForCell(hit.row, hit.col);
    } else {
      touchStateRef.current.lastTapTime = now;
      touchStateRef.current.lastTapRow = hit.row;
      touchStateRef.current.lastTapCol = hit.col;
    }
  };

  // ============================================================================
  // CLEAR SELECTED CELLS
  // ============================================================================
  const handleClearSelectedCells = useCallback(() => {
    const norm = selectionRef.current.getNormalizedRange();
    const geom = geometryRef.current;
    const keyField = (store as any).getKeyField?.() || 'id';
    const updates: Array<{ rowIndex: number; rowKey: any; colDef: ColumnDef; newValue: any }> = [];

    for (let r = norm.minRow; r <= norm.maxRow; r++) {
      const vRow = store.getViewRow(r);
      if (!vRow || vRow.type !== 'data') continue;
      for (let c = norm.minCol; c <= norm.maxCol; c++) {
        const colDef = geom.columns[c];
        if (!colDef) continue;
        const emptyVal =
          colDef.type === 'progress' || colDef.type === 'rating'
            ? 0
            : colDef.type === 'boolean'
            ? false
            : '';
        updates.push({
          rowIndex: r,
          rowKey: vRow.data[keyField] ?? vRow.data.id ?? r,
          colDef,
          newValue: emptyVal,
        });
      }
    }

    applyBatchCellUpdates(updates, 'Clear Cells');
  }, [store, applyBatchCellUpdates]);

  // ============================================================================
  // EXCEL TSV CLIPBOARD COPY & PASTE
  // ============================================================================
  const buildSelectedTsv = useCallback((): string => {
    const norm = selectionRef.current.getNormalizedRange();
    const rowsText: string[] = [];

    for (let r = norm.minRow; r <= norm.maxRow; r++) {
      const vRow = store.getViewRow(r);
      if (!vRow || vRow.type === 'group') continue;

      const cellsText: string[] = [];
      for (let c = norm.minCol; c <= norm.maxCol; c++) {
        const colDef = geometryRef.current.columns[c];
        if (!colDef) continue;
        const val = vRow.data[colDef.id];
        const plugin = ColumnTypeRegistry.get(colDef.type);
        const formatted = plugin.formatClipboard
          ? plugin.formatClipboard(val, colDef)
          : String(val ?? '');
        cellsText.push(formatted);
      }
      rowsText.push(cellsText.join('\t'));
    }

    return rowsText.join('\n');
  }, [store]);

  const applyPastedTsv = useCallback(
    (text: string) => {
      if (!text) return;
      if (
        permissions.mode === 'read' ||
        permissions.mode === 'readonly' ||
        permissions.allowUpdating === false ||
        permissions.allowClipboardPaste === false
      ) {
        showToast(
          currentLocale.code.startsWith('tr')
            ? 'Panodan yapıştırma yetkisi kapalı.'
            : 'Clipboard paste is disabled by permissions.',
          'warning'
        );
        return;
      }

      const lines = text.replace(/\r/g, '').split('\n');
      if (lines.length > 1 && lines[lines.length - 1] === '') {
        lines.pop();
      }

      const norm = selectionRef.current.getNormalizedRange();
      const geom = geometryRef.current;
      const keyField = (store as any).getKeyField?.() || 'id';
      const updates: Array<{ rowIndex: number; rowKey: any; colDef: ColumnDef; newValue: any }> = [];

      // Excel Behavior: If a single cell is in clipboard and multiple cells are selected, fill entire selection!
      const isSingleClipboardValue = lines.length === 1 && !lines[0].includes('\t');
      const hasMultiSelection = norm.maxRow > norm.minRow || norm.maxCol > norm.minCol;

      if (isSingleClipboardValue && hasMultiSelection) {
        const rawCellText = lines[0];
        for (let r = norm.minRow; r <= norm.maxRow; r++) {
          const vRow = store.getViewRow(r);
          if (!vRow || vRow.type !== 'data') continue;
          for (let c = norm.minCol; c <= norm.maxCol; c++) {
            const colDef = geom.columns[c];
            if (!colDef) continue;
            const plugin = ColumnTypeRegistry.get(colDef.type);
            let parsedVal: any = rawCellText.trim();
            try {
              if (plugin.parseClipboard) {
                parsedVal = plugin.parseClipboard(rawCellText, colDef);
              }
            } catch (err) {
              parsedVal = rawCellText.trim();
            }
            updates.push({
              rowIndex: r,
              rowKey: vRow.data[keyField] ?? vRow.data.id ?? r,
              colDef,
              newValue: parsedVal,
            });
          }
        }
      } else {
        const startRow = norm.minRow;
        const startCol = norm.minCol;

        lines.forEach((line, rOffset) => {
          const targetRow = startRow + rOffset;
          if (targetRow >= store.getRowCount()) return;

          const vRow = store.getViewRow(targetRow);
          if (!vRow || vRow.type !== 'data') return;

          const cells = line.split('\t');
          cells.forEach((cellText, cOffset) => {
            const targetCol = startCol + cOffset;
            if (targetCol >= geom.columns.length) return;

            const colDef = geom.columns[targetCol];
            if (!colDef) return;
            const plugin = ColumnTypeRegistry.get(colDef.type);
            let parsedVal: any = cellText.trim();
            try {
              if (plugin.parseClipboard) {
                parsedVal = plugin.parseClipboard(cellText, colDef);
              }
            } catch (err) {
              parsedVal = cellText.trim();
            }

            updates.push({
              rowIndex: targetRow,
              rowKey: vRow.data[keyField] ?? vRow.data.id ?? targetRow,
              colDef,
              newValue: parsedVal,
            });
          });
        });
      }

      applyBatchCellUpdates(updates, 'Paste from Clipboard');
    },
    [permissions, store, applyBatchCellUpdates, currentLocale, showToast]
  );

  const handleCopy = (e: React.ClipboardEvent) => {
    if (activeOverlay) return;
    const { col } = selectionRef.current.activeCell;
    const colDef = geometryRef.current.columns[col];
    if (colDef?.type === 'sparkline') return;
    e.preventDefault();
    const tsv = buildSelectedTsv();
    internalClipboardRef.current = tsv;
    e.clipboardData.setData('text/plain', tsv);
    showToast(
      currentLocale.code.startsWith('tr')
        ? '📋 Seçili hücreler panoya kopyalandı (TSV).'
        : '📋 Selected range copied to clipboard (TSV).',
      'info'
    );
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (activeOverlay) return;
    const text = e.clipboardData.getData('text/plain') || internalClipboardRef.current;
    if (!text) return;
    e.preventDefault();
    applyPastedTsv(text);
  };

  // ============================================================================
  // KEYBOARD NAVIGATION & EXCEL SHORTCUTS
  // ============================================================================
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (activeOverlay) return;

    const { row, col } = selectionRef.current.activeCell;
    const colDef = geometryRef.current.columns[col];
    const vRow = store.getViewRow(row);

    // Excel & Web Shortcuts with Ctrl / Meta
    if (e.ctrlKey || e.metaKey) {
      const k = e.key.toLowerCase();
      if (k === 's') {
        e.preventDefault();
        handleSaveBatch();
        return;
      }
      if (k === 'n') {
        e.preventDefault();
        onAddNewRow?.();
        return;
      }
      if (k === 'd') {
        e.preventDefault();
        if (e.shiftKey) {
          handleDuplicateRow(row);
        } else {
          handleDuplicateCellDown();
        }
        return;
      }
      // Note: Never hijack Ctrl+R / Ctrl+F5 for cell duplication; allow browser reload
      if (k === 'r' || k === 'f5') {
        onRefresh?.();
        return;
      }
      if (k === 'z') {
        e.preventDefault();
        if (e.shiftKey) historyRef.current.redo();
        else historyRef.current.undo();
        setStoreVersion((v) => v + 1);
        requestRender();
        return;
      }
      if (k === 'y') {
        e.preventDefault();
        historyRef.current.redo();
        setStoreVersion((v) => v + 1);
        requestRender();
        return;
      }
      if (k === 'a') {
        e.preventDefault();
        if (store.getRowCount() > 0 && geometryRef.current.columns.length > 0) {
          selectionRef.current.setActiveCell(0, 0);
          selectionRef.current.setRangeEnd(
            store.getRowCount() - 1,
            geometryRef.current.columns.length - 1
          );
          setSelectionVersion((v) => v + 1);
          requestRender();
        }
        return;
      }
    }

    // F5 / Refresh Key
    if (e.key === 'F5') {
      onRefresh?.();
      return;
    }

    // Alt+R for Duplicate Cell Right (keeps Ctrl+R clean for browser reload)
    if (e.altKey && (e.key === 'r' || e.key === 'R')) {
      e.preventDefault();
      handleDuplicateCellRight();
      return;
    }

    // Shift+D for Row Duplication
    if (e.shiftKey && e.key === 'D' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      handleDuplicateRow(row);
      return;
    }

    // Toggle Group Row with Space or Enter
    if (vRow && vRow.type === 'group' && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      store.toggleGroup(vRow.groupKey);
      setStoreVersion((v) => v + 1);
      requestRender();
      return;
    }

    // Plugin-specific key handlers (Space toggle for Boolean, 1-5 for Rating, initial char for Text/Number)
    if (colDef && vRow && vRow.type === 'data' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const plugin = ColumnTypeRegistry.get(colDef.type);
      if (plugin.onKeyDown) {
        const isAction = colDef.type === 'action';
        if (isAction || canEditCell(vRow.data, colDef, row, true)) {
          const handled = plugin.onKeyDown({
            event: e,
            value: vRow.data[colDef.id],
            row: vRow.data,
            rowIndex: row,
            column: colDef,
            setValue: (newVal) => {
              commitSingleCellEdit(row, colDef, newVal, true);
            },
            openEditor: (char) => openEditorForCell(row, col, char),
          });
          if (handled) return;
        }
      }
    }

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        moveSelection(-1, 0, e.shiftKey);
        break;
      case 'ArrowDown':
        e.preventDefault();
        moveSelection(1, 0, e.shiftKey);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        moveSelection(0, -1, e.shiftKey);
        break;
      case 'ArrowRight':
        e.preventDefault();
        moveSelection(0, 1, e.shiftKey);
        break;
      case 'Tab':
        e.preventDefault();
        moveSelection(0, e.shiftKey ? -1 : 1);
        break;
      case 'Enter':
      case 'F2':
        e.preventDefault();
        startEditingCell(col, row);
        break;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        handleClearSelectedCells();
        break;
      default:
        // Intercept standard alphanumeric/printable characters typed on active cell
        if (
          !e.ctrlKey &&
          !e.metaKey &&
          !e.altKey &&
          e.key.length === 1 &&
          colDef &&
          vRow &&
          vRow.type === 'data' &&
          canEditCell(vRow.data, colDef, row, true)
        ) {
          e.preventDefault();
          startEditingCell(col, row, e.key);
        }
        break;
    }
  };

  // ============================================================================
  // CSV EXPORT
  // ============================================================================
  const exportCsv = () => {
    if (permissions.allowExport === false) return;
    const cols = geometryRef.current.columns;
    const headerRow = cols.map((c) => `"${c.title.replace(/"/g, '""')}"`).join(',');
    const rows: string[] = [headerRow];

    for (let r = 0; r < store.getRowCount(); r++) {
      const vRow = store.getViewRow(r);
      if (!vRow || vRow.type === 'group') continue;

      const cellVals = cols.map((c) => {
        const val = vRow.data[c.id];
        return `"${String(val ?? '').replace(/"/g, '""')}"`;
      });
      rows.push(cellVals.join(','));
    }

    const blob = new Blob(['\uFEFF' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sheetgl_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ============================================================================
  // LIVE SELECTION AGGREGATIONS (EXCEL STATUS BAR STATS)
  // ============================================================================
  const selectionStats = useMemo<SelectionSummaryStats | null>(() => {
    const norm = selectionRef.current.getNormalizedRange();
    const rowSpan = norm.maxRow - norm.minRow + 1;
    const colSpan = norm.maxCol - norm.minCol + 1;
    if (rowSpan * colSpan <= 1) return null;

    // Cap calculation to 2,000 cells for instant 60 FPS responsiveness
    if (rowSpan * colSpan > 2000) {
      return {
        count: rowSpan * colSpan,
        numericCount: 0,
        sum: 0,
        avg: 0,
        min: 0,
        max: 0,
      };
    }

    let count = 0;
    let numericCount = 0;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;

    for (let r = norm.minRow; r <= norm.maxRow; r++) {
      const vRow = store.getViewRow(r);
      if (!vRow || vRow.type !== 'data') continue;
      for (let c = norm.minCol; c <= norm.maxCol; c++) {
        const colDef = geometryRef.current.columns[c];
        if (!colDef) continue;
        const val = vRow.data[colDef.id];
        if (val !== null && val !== undefined && val !== '') {
          count++;
          if (typeof val === 'number' && !isNaN(val)) {
            numericCount++;
            sum += val;
            if (val < min) min = val;
            if (val > max) max = val;
          }
        }
      }
    }

    return {
      count,
      numericCount,
      sum,
      avg: numericCount > 0 ? sum / numericCount : 0,
      min: numericCount > 0 ? min : 0,
      max: numericCount > 0 ? max : 0,
    };
  }, [store, selectionVersion, storeVersion]);

  // Active Cell & Pending Batch Changes Info
  const currentColumn = geometryRef.current.columns[selectedCellUI.col];
  const activeViewRow = store.getViewRow(selectedCellUI.row);
  const currentCellValue =
    activeViewRow && activeViewRow.type === 'data' && currentColumn
      ? activeViewRow.data[currentColumn.id]
      : '';
  const isActiveCellEditable = Boolean(
    activeViewRow &&
      activeViewRow.type === 'data' &&
      currentColumn &&
      canEditCell(activeViewRow.data, currentColumn, selectedCellUI.row, true)
  );

  const pendingChanges = showBatchModal ? store.getPendingChanges?.() : undefined;
  const pendingChangesCount =
    store.getPendingChangesCount !== undefined
      ? store.getPendingChangesCount()
      : (pendingChanges?.inserted?.length || 0) +
        (pendingChanges?.updated?.length || 0) +
        (pendingChanges?.deleted?.length || 0);

  const normRange = selectionRef.current.getNormalizedRange();
  const selectionSpan = {
    rows: normRange.maxRow - normRange.minRow + 1,
    cols: normRange.maxCol - normRange.minCol + 1,
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onCopy={handleCopy}
      onPaste={handlePaste}
      className={`sheetgl-container ${className || ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        outline: 'none',
        backgroundColor: resolvedTheme.canvas.bg,
        color: resolvedTheme.canvas.cellText,
        fontFamily: resolvedTheme.fontFamily,
        boxSizing: 'border-box',
        overflow: activeOverlay || headerFilterState || contextMenu ? 'visible' : 'hidden',
        position: 'relative',
        zIndex: activeOverlay || headerFilterState || contextMenu ? 60 : undefined,
        ...style,
      }}
    >
      {/* 1. TOP TOOLBAR */}
      <ToolBar
        onSearchChange={async (k) => {
          actions.setSearchKeyword(k);
          await store.setSearch(k);
          setStoreVersion((v) => v + 1);
          requestRender();
        }}
        onExportCsv={onExport || exportCsv}
        groups={groups.map((g) => g.selector)}
        onToggleGroupColumn={handleToggleGroupColumn}
        onExpandAllGroups={() => {
          store.expandAllGroups?.();
          setStoreVersion((v) => v + 1);
          requestRender();
        }}
        onCollapseAllGroups={() => {
          store.collapseAllGroups?.();
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
          }
          scrollPosRef.current.top = 0;
          setStoreVersion((v) => v + 1);
          requestRender();
        }}
        availableColumns={columns}
        onUpdateColumn={handleUpdateColumnDef}
        summaryTypes={store.getSummaryTypes?.()}
        onChangeSummaryType={handleChangeSummaryType}
        onAddRow={() => handleInsertRow(0)}
        onDuplicateRow={() => handleDuplicateRow(selectedCellUI.row)}
        onDeleteRow={() => handleDeleteRow()}
        canUndo={historyRef.current.canUndo()}
        canRedo={historyRef.current.canRedo()}
        onUndo={() => {
          historyRef.current.undo();
          setStoreVersion((v) => v + 1);
          requestRender();
        }}
        onRedo={() => {
          historyRef.current.redo();
          setStoreVersion((v) => v + 1);
          requestRender();
        }}
        pendingChangesCount={pendingChangesCount}
        onSaveBatch={handleSaveBatch}
        onDiscardBatch={handleDiscardBatch}
        onSelectionModeChange={(m) => {
          actions.setRowSelectionMode(m);
          if (m === 'none') {
            actions.clearSelectedRows();
            onSelectionChanged?.([], []);
          } else if (m === 'single' && selectedRowKeysSet.size > 1) {
            const first = Array.from(selectedRowKeysSet)[0];
            actions.setSelectedRowKeys(new Set([first]));
          }
          onSelectionModeChange?.(m);
        }}
        onClearAllFilters={handleClearAllFilters}
      />

      {/* 2. FORMULA & COORDINATE BAR */}
      {showFormulaBar && (
        <FormulaBar
          activeCoords={selectedCellUI}
          selectionSpan={selectionSpan}
          column={currentColumn}
          currentValue={currentCellValue}
          isEditable={isActiveCellEditable}
          onCommitValue={(newVal) => {
            if (currentColumn) {
              commitSingleCellEdit(selectedCellUI.row, currentColumn, newVal, true);
            }
          }}
          onDuplicateDown={handleDuplicateCellDown}
          onDuplicateRight={handleDuplicateCellRight}
          onDuplicateRow={() => handleDuplicateRow(selectedCellUI.row)}
          onOpenSparklineModal={() => {
            if (
              currentColumn?.type === 'sparkline' &&
              activeViewRow &&
              activeViewRow.type === 'data'
            ) {
              setSparklineModal({
                rowIndex: selectedCellUI.row,
                rowData: activeViewRow.data,
                column: currentColumn,
                points: Array.isArray(activeViewRow.data[currentColumn.id])
                  ? activeViewRow.data[currentColumn.id]
                  : [],
              });
            }
          }}
        />
      )}

      {/* 3. MAIN GRID SURFACE (CANVAS + VIRTUAL SCROLLBAR + MICRO-DOM OVERLAYS) */}
      <div
        ref={gridSurfaceRef}
        onMouseDown={handleSurfaceMouseDown}
        onMouseMove={handleSurfaceMouseMove}
        onDoubleClick={handleSurfaceDoubleClick}
        onContextMenu={handleSurfaceContextMenu}
        onTouchStart={handleSurfaceTouchStart}
        onTouchMove={handleSurfaceTouchMove}
        onTouchEnd={handleSurfaceTouchEnd}
        style={{
          position: 'relative',
          flex: 1,
          overflow: activeOverlay || headerFilterState || contextMenu ? 'visible' : 'hidden',
          cursor: resizingCol ? 'col-resize' : cursorStyle,
        }}
      >
        {/* Physical 2D Canvas */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            display: 'block',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        />

        {/* Virtual Scroll Container */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'auto',
            zIndex: 20,
          }}
        >
          {/* Virtual Sizing Spacer (Adds 18px right buffer so vertical scrollbar never covers rightmost header filter icon) */}
          <div
            style={{
              width: getTotalWidth(),
              height: getTotalHeight(store.getRowCount()),
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Right-Side Scroll Indicator Pill & Quick Jump Buttons */}
        {scrollIndicator.visible && store.getRowCount() > 30 && (
          <div
            style={{
              position: 'absolute',
              right: 24,
              top: Math.max(
                geometryRef.current.headerHeight + 8,
                Math.min(
                  (gridSurfaceRef.current?.clientHeight || 400) - 44,
                  geometryRef.current.headerHeight +
                    ((scrollIndicator.row / Math.max(1, store.getRowCount())) *
                      ((gridSurfaceRef.current?.clientHeight || 400) -
                        geometryRef.current.headerHeight -
                        44))
                )
              ),
              zIndex: 90,
              padding: '4px 10px',
              borderRadius: 6,
              backgroundColor: resolvedTheme.dom.popoverBg,
              color: resolvedTheme.dom.popoverText,
              border: `1px solid ${resolvedTheme.dom.popoverBorder}`,
              boxShadow: resolvedTheme.dom.popoverShadow,
              fontSize: 11,
              fontWeight: 700,
              pointerEvents: 'none',
              fontFamily: 'monospace',
            }}
          >
            {currentLocale.rows}: {scrollIndicator.row.toLocaleString(currentLocale.code)} /{' '}
            {store.getRowCount().toLocaleString(currentLocale.code)}
          </div>
        )}

        {/* Right-Bottom Quick Scroll Navigation Controls */}
        {store.getRowCount() > 25 && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              right: 22,
              bottom: 18,
              zIndex: 85,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <button
              type="button"
              title="Scroll to Top"
              onClick={scrollToTop}
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                border: `1px solid ${resolvedTheme.dom.popoverBorder}`,
                backgroundColor: resolvedTheme.dom.popoverBg,
                color: resolvedTheme.dom.popoverText,
                boxShadow: resolvedTheme.dom.popoverShadow,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcon name="vertical_align_top" size={16} />
            </button>
            <button
              type="button"
              title="Scroll to Bottom"
              onClick={scrollToBottom}
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                border: `1px solid ${resolvedTheme.dom.popoverBorder}`,
                backgroundColor: resolvedTheme.dom.popoverBg,
                color: resolvedTheme.dom.popoverText,
                boxShadow: resolvedTheme.dom.popoverShadow,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcon name="vertical_align_bottom" size={16} />
            </button>
          </div>
        )}

        {/* Toast Feedback Notification */}
        {toastMessage && (
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 200,
              padding: '7px 14px',
              borderRadius: 8,
              backgroundColor:
                toastMessage.type === 'warning'
                  ? 'rgba(255, 159, 10, 0.95)'
                  : toastMessage.type === 'success'
                  ? 'rgba(48, 209, 88, 0.95)'
                  : resolvedTheme.dom.popoverBg,
              color:
                toastMessage.type === 'warning' || toastMessage.type === 'success'
                  ? '#FFFFFF'
                  : resolvedTheme.dom.popoverText,
              border: `1px solid ${resolvedTheme.dom.popoverBorder}`,
              boxShadow: resolvedTheme.dom.popoverShadow,
              fontSize: 12,
              fontWeight: 600,
              pointerEvents: 'none',
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{toastMessage.type === "warning" && <MaterialIcon name="lock" size={13} color="#FFFFFF" />}<span>{toastMessage.text}</span></span>
          </div>
        )}

        {/* 4. DYNAMIC MICRO-DOM CELL EDITOR */}
        {activeOverlay && (
          <DynamicCellEditor
            overlay={activeOverlay}
            rowData={(() => {
              const vr = store.getViewRow(activeOverlay.row);
              return vr && vr.type === 'data' ? vr.data : undefined;
            })()}
            theme={resolvedTheme}
            locale={currentLocale}
            api={gridApi}
            validationError={editorValidationError}
            isValidating={isEditorValidating}
            onCommit={async (newVal, moveDir) => {
              if (isEditorValidating) return;
              const targetRow = activeOverlay.row;
              const targetCol = activeOverlay.column;
              const hasAsync =
                targetCol.validationRules?.some((r) => r.type === 'async') ||
                Boolean(targetCol.validator);

              if (hasAsync) {
                setIsEditorValidating(true);
              }
              const ok = await commitSingleCellEdit(targetRow, targetCol, newVal, true);
              if (hasAsync) {
                setIsEditorValidating(false);
              }

              if (ok) {
                setEditorValidationError(null);
                setActiveOverlay(null);

                const vRow = store.getViewRow(targetRow);
                const rowData = vRow && vRow.type === 'data' ? vRow.data : undefined;
                const rowKey = rowData ? (rowData[(store as any).keyField ?? 'id'] ?? rowData.id) : undefined;
                const isInserted = (store as any).isRowInserted
                  ? (store as any).isRowInserted(rowKey)
                  : Boolean(rowData?.__isNew || String(rowKey ?? '').startsWith('new_'));

                let effectiveDir = moveDir;
                if (moveDir === 'down') {
                  if (enterNavigation === 'right' || (enterNavigation === 'auto' && isInserted)) {
                    effectiveDir = 'right';
                  }
                }

                if (effectiveDir === 'down') {
                  moveSelection(1, 0);
                  ensureCellVisible(targetRow + 1, activeOverlay.col);
                } else if (effectiveDir === 'up') {
                  moveSelection(-1, 0);
                  ensureCellVisible(Math.max(0, targetRow - 1), activeOverlay.col);
                } else if (effectiveDir === 'right') {
                  const geom = geometryRef.current;
                  let nextCol = activeOverlay.col + 1;
                  while (
                    nextCol < geom.columns.length &&
                    rowData &&
                    !canEditCell(rowData, geom.columns[nextCol], targetRow, true)
                  ) {
                    nextCol++;
                  }
                  if (nextCol < geom.columns.length) {
                    const dCol = nextCol - activeOverlay.col;
                    moveSelection(0, dCol);
                    ensureCellVisible(targetRow, nextCol);
                  } else {
                    moveSelection(0, 1);
                    ensureCellVisible(
                      targetRow,
                      Math.min(geom.columns.length - 1, activeOverlay.col + 1)
                    );
                  }
                } else if (effectiveDir === 'left') {
                  const geom = geometryRef.current;
                  let prevCol = activeOverlay.col - 1;
                  while (
                    prevCol >= 0 &&
                    rowData &&
                    !canEditCell(rowData, geom.columns[prevCol], targetRow, true)
                  ) {
                    prevCol--;
                  }
                  if (prevCol >= 0) {
                    const dCol = prevCol - activeOverlay.col;
                    moveSelection(0, dCol);
                    ensureCellVisible(targetRow, prevCol);
                  } else {
                    moveSelection(0, -1);
                    ensureCellVisible(targetRow, Math.max(0, activeOverlay.col - 1));
                  }
                } else {
                  requestRender();
                }
                containerRef.current?.focus();
              } else {
                // Keep editor open with user's attempted value so they can fix the validation error or press Escape
                setActiveOverlay((prev) =>
                  prev
                    ? {
                        ...prev,
                        initialValue: newVal,
                        initialChar: undefined,
                      }
                    : null
                );
              }
            }}
            onCancel={() => {
              setEditorValidationError(null);
              setIsEditorValidating(false);
              setActiveOverlay(null);
              containerRef.current?.focus();
            }}
          />
        )}

        {/* 5. EXCEL HEADER FILTER POPOVER */}
        {headerFilterState && (
          <HeaderFilterPopover
            column={headerFilterState.column}
            anchorRect={headerFilterState.rect}
            viewportWidth={gridSurfaceRef.current?.clientWidth || 1000}
            store={store}
            baseFilter={activeBaseFilter}
            onApply={(filterState) => {
              handleApplyColumnFilter(headerFilterState.column.id, filterState);
              setHeaderFilterState(null);
            }}
            onSort={(desc) => {
              const colIdx = geometryRef.current.columns.findIndex(
                (c) => c.id === headerFilterState.column.id
              );
              if (colIdx !== -1) {
                handleHeaderSort(colIdx, false, desc);
              }
            }}
            onToggleGroup={() => handleToggleGroupColumn(headerFilterState.column.id)}
            onClose={() => setHeaderFilterState(null)}
          />
        )}

        {/* 6. EXCEL RIGHT-CLICK CONTEXT MENU */}
        {contextMenu && (
          <ContextMenuOverlay
            menu={contextMenu}
            viewportWidth={gridSurfaceRef.current?.clientWidth || 1000}
            viewportHeight={gridSurfaceRef.current?.clientHeight || 600}
            isCellEditable={
              contextMenu.rowData && contextMenu.column
                ? canEditCell(contextMenu.rowData, contextMenu.column, contextMenu.row, true)
                : false
            }
            isGroupedByCol={
              contextMenu.column
                ? groups.some((g) => g.selector === contextMenu.column!.id)
                : false
            }
            currentSummaryType={
              contextMenu.column
                ? store.getSummaryTypes?.()[contextMenu.column.id] || 'none'
                : 'none'
            }
            onCopy={() => {
              const tsv = buildSelectedTsv();
              internalClipboardRef.current = tsv;
              navigator.clipboard?.writeText(tsv).catch(() => {});
              showToast(
                currentLocale.code.startsWith('tr')
                  ? '📋 Kopyalandı (TSV)'
                  : '📋 Copied to clipboard (TSV)',
                'info'
              );
            }}
            onPaste={() => {
              if (navigator.clipboard?.readText) {
                navigator.clipboard
                  .readText()
                  .then((txt) => applyPastedTsv(txt || internalClipboardRef.current))
                  .catch(() => applyPastedTsv(internalClipboardRef.current));
              } else {
                applyPastedTsv(internalClipboardRef.current);
              }
            }}
            onDuplicateCellDown={handleDuplicateCellDown}
            onDuplicateCellRight={handleDuplicateCellRight}
            onDuplicateRow={() => handleDuplicateRow(contextMenu.row)}
            onInsertRowAbove={() => handleInsertRow(Math.max(0, contextMenu.row))}
            onInsertRowBelow={() => handleInsertRow(contextMenu.row + 1)}
            onClearCells={handleClearSelectedCells}
            onDeleteRow={() => handleDeleteRow(contextMenu.row)}
            onFilterByCellValue={() => {
              if (contextMenu.column) {
                const vRow = store.getViewRow(contextMenu.row);
                const rowObj =
                  contextMenu.rowData || (vRow && vRow.type === 'data' ? vRow.data : null);
                if (rowObj) {
                  const rawVal = rowObj[contextMenu.column.id];
                  const filterVal =
                    rawVal === null || rawVal === undefined || String(rawVal).trim() === ''
                      ? '__SHEETGL_BLANK__'
                      : String(rawVal);
                  handleApplyColumnFilter(contextMenu.column.id, {
                    columnId: contextMenu.column.id,
                    mode: 'values',
                    selectedValues: [filterVal],
                  });
                }
              }
            }}
            onToggleGroupColumn={() => {
              if (contextMenu.column) {
                handleToggleGroupColumn(contextMenu.column.id);
              }
            }}
            onSortColumn={(desc) => {
              handleHeaderSort(contextMenu.col, false, desc);
            }}
            onTogglePinColumn={() => {
              if (contextMenu.column) {
                handleUpdateColumnDef(contextMenu.column.id, {
                  pinned: contextMenu.column.pinned ? false : 'left',
                });
              }
            }}
            onToggleColumnReadonly={() => {
              if (contextMenu.column) {
                const nextRO = !contextMenu.column.readonly;
                handleUpdateColumnDef(contextMenu.column.id, {
                  readonly: nextRO,
                  permission: nextRO ? 'readonly' : 'write',
                });
              }
            }}
            onChangeSummaryType={(sType) => {
              if (contextMenu.column) {
                handleChangeSummaryType(contextMenu.column.id, sType);
              }
            }}
            onOpenSparklineModal={() => {
              if (contextMenu.column?.type === 'sparkline' && contextMenu.rowData) {
                setSparklineModal({
                  rowIndex: contextMenu.row,
                  rowData: contextMenu.rowData,
                  column: contextMenu.column,
                  points: Array.isArray(contextMenu.rowData[contextMenu.column.id])
                    ? contextMenu.rowData[contextMenu.column.id]
                    : [],
                });
              }
            }}
            onViewRowDetail={
              onViewRowDetail
                ? () => {
                    const vRow = store.getViewRow(contextMenu.row);
                    const rData =
                      contextMenu.rowData || (vRow && vRow.type === 'data' ? vRow.data : {});
                    onViewRowDetail(contextMenu.row, rData);
                  }
                : undefined
            }
            onClose={() => setContextMenu(null)}
          />
        )}

        {/* 6b. DETAILED SPARKLINE TREND CHART MODAL DIALOG */}
        {pdfModal && (
          <PdfPreviewModalOverlay
            modal={pdfModal}
            onClose={() => setPdfModal(null)}
          />
        )}

        {sparklineModal && (
          <SparklineModalOverlay
            modal={sparklineModal}
            onClose={() => {
              setSparklineModal(null);
              containerRef.current?.focus();
            }}
          />
        )}

        {/* 6c. BATCH CHANGES INSPECTION & CONFIRMATION MODAL */}
        {showBatchModal && pendingChanges && (
          <BatchChangesModal
            changes={pendingChanges}
            columns={columns}
            onConfirmSave={commitBatchSave}
            onDiscardAll={handleDiscardBatch}
            onRevertDelete={(rk) => {
              store.revertPendingDelete?.(rk);
              setStoreVersion((v) => v + 1);
              requestRender();
            }}
            onRevertUpdate={(rk, colId) => {
              store.revertPendingUpdate?.(rk, colId);
              setStoreVersion((v) => v + 1);
              requestRender();
            }}
            onRevertInsert={(rk) => {
              store.revertPendingInsert?.(rk);
              setStoreVersion((v) => v + 1);
              requestRender();
            }}
            onClose={() => {
              setShowBatchModal(false);
              containerRef.current?.focus();
            }}
          />
        )}

        {/* 6d. ROW DELETION CONFIRMATION & PROGRESS BAR MODAL */}
        {deleteConfirmModal && (
          <DeleteConfirmProgressModal
            rowKeys={deleteConfirmModal.rowKeys}
            sampleRows={deleteConfirmModal.sampleRows}
            batchMode={Boolean(store.isBatchMode?.())}
            onConfirm={executeConfirmedDelete}
            onCancel={() => {
              setDeleteConfirmModal(null);
              containerRef.current?.focus();
            }}
          />
        )}
      </div>

      {/* 7. CONFIGURABLE SUMMARY FOOTER & LIVE RANGE SELECTION STATS */}
      <SummaryFooter
        summaries={store.getSummaries()}
        summaryTypes={store.getSummaryTypes?.()}
        onChangeSummaryType={handleChangeSummaryType}
        selectionStats={selectionStats}
        columns={effectiveColumns}
        geometry={geometryRef.current}
        scrollContainerRef={scrollContainerRef}
        totalRowCount={store.getFilteredRowCount?.() ?? store.getRowCount()}
        unfilteredRowCount={store.getTotalDatasetRowCount?.() ?? store.getRowCount()}
      />
    </div>
  );
});

SheetGLInner.displayName = 'SheetGLInner';

export const SheetGL = forwardRef<GridApi, SheetGLProps>((props, ref) => {
  // 1. Initialize Default Column Plugins synchronously on first render
  useMemo(() => {
    initDefaultColumnPlugins();
  }, []);

  // 2. DataStore Adaptation
  const store = useMemo<IDataStore>(() => {
    if (Array.isArray(props.dataSource)) {
      const initialSummaries: Record<string, SummaryType> = {};
      props.columns.forEach((c) => {
        if (c.summaryType) {
          initialSummaries[c.id] = c.summaryType;
        }
      });
      if (props.summaryRow && typeof props.summaryRow === 'object') {
        if (props.summaryRow.columnSummaryTypes) {
          Object.assign(initialSummaries, props.summaryRow.columnSummaryTypes);
        }
        if (Array.isArray(props.summaryRow.items)) {
          props.summaryRow.items.forEach((item) => {
            initialSummaries[item.columnId] = item.summaryType;
          });
        }
      }
      return new LocalDataStore({
        data: props.dataSource,
        keyField: 'id',
        batchMode: props.batchEditMode !== false,
        initialSummaries: Object.keys(initialSummaries).length > 0 ? initialSummaries : undefined,
      });
    }
    return props.dataSource;
  }, [props.dataSource]);

  useEffect(() => {
    store.setBatchMode?.(props.batchEditMode !== false);
  }, [store, props.batchEditMode]);

  const initialState = useMemo<Partial<GridUIState>>(() => {
    let savedSortRules: SortDescriptor[] | undefined = props.initialSort;
    let savedFilters: Record<string, ColumnFilterState> | undefined = undefined;
    if (props.storageKey) {
      try {
        const raw = localStorage.getItem('sheetgl_state_v1_' + props.storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.sortRules)) savedSortRules = parsed.sortRules;
          if (parsed.columnFilters && typeof parsed.columnFilters === 'object') {
            savedFilters = parsed.columnFilters;
          }
        }
      } catch {}
    }

    const themeInput = props.theme || 'apple-dark';
    const localeInput = props.locale ? LocaleEngine.resolve(props.locale) : undefined;
    return {
      sortRules: savedSortRules,
      groups: props.initialGroups,
      columnFilters: savedFilters,
      currentThemeName: themeInput,
      resolvedTheme: ThemeEngine.resolve(themeInput),
      currentLocale: localeInput,
      permissions: props.permissions,
      toolbarConfig:
        typeof props.toolbar === 'object'
          ? { visible: true, buttonDisplayMode: 'icon-text', ...props.toolbar }
          : props.toolbar === false
          ? { visible: false, buttonDisplayMode: 'icon-text' }
          : undefined,
      summaryConfig:
        typeof props.summaryRow === 'object'
          ? {
              visible: true,
              showTotalCount: true,
              showSelectionStats: true,
              showColumnSummaries: true,
              allowConfiguration: true,
              ...props.summaryRow,
            }
          : props.summaryRow === false
          ? { visible: false }
          : undefined,
      rowSelectionMode: props.selectionMode,
      selectedRowKeys: props.selectedRowKeys ? new Set(props.selectedRowKeys) : undefined,
    };
  }, []);

  return (
    <GridProvider
      store={store}
      initialState={initialState}
      theme={props.theme}
      locale={props.locale}
      permissions={props.permissions}
      selectedRowKeys={props.selectedRowKeys}
      onColumnFiltersChange={(filters) => {
        props.onFilterChange?.(compileColumnFilters(filters), filters);
      }}
      onThemeChange={
        props.onThemeChange
          ? (t) => props.onThemeChange?.(typeof t === 'string' ? t : 'custom')
          : undefined
      }
      onLocaleChange={
        props.onLocaleChange
          ? (loc) => props.onLocaleChange?.(loc.code.startsWith('tr') ? 'tr' : 'en', loc)
          : undefined
      }
      onPermissionsChange={props.onPermissionsChange}
      onSelectionChange={
        props.onSelectionChanged
          ? (keys) => {
              const rows = keys.map((k) => (store as any).getRowByKey?.(k) || {}).filter(Boolean);
              props.onSelectionChanged?.(keys, rows);
            }
          : undefined
      }
    >
      <SheetGLInner {...props} store={store} ref={ref} />
    </GridProvider>
  );
});

SheetGL.displayName = 'SheetGL';


