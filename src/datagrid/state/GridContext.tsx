import React, {
  createContext,
  useReducer,
  useMemo,
  ReactNode,
  useEffect,
  useRef,
} from 'react';
import {
  GridUIState,
  GridAction,
  gridReducer,
  createInitialGridState,
  HeaderFilterPopoverState,
  DeleteConfirmModalState,
  ToastMessageState,
} from './gridReducer';
import { IDataStore } from '../types/store';
import { SortDescriptor, ColumnFilterState } from '../types/filter';
import { GroupDescriptor } from '../types/group';
import {
  ActiveOverlayState,
  GridToolbarConfig,
  GridSummaryConfig,
  RowSelectionMode,
  GridPermissions,
} from '../types/grid';
import { ThemeEngine, ThemeInput } from '../theme/ThemeEngine';
import { IGridThemeTokens } from '../theme/IGridTheme';
import { IGridLocale } from '../i18n/IGridLocale';
import { LocaleEngine, LocaleInput } from '../i18n/LocaleEngine';
import { ContextMenuState } from '../overlays/ContextMenuOverlay';
import { SparklineModalState } from '../overlays/SparklineModalOverlay';
import { PdfPreviewModalState } from '../overlays/PdfPreviewModalOverlay';

export interface GridActions {
  // Query & Organization
  setSortRules: (rules: SortDescriptor[]) => void;
  setGroups: (groups: GroupDescriptor[]) => void;
  toggleGroup: (field: string) => void;
  setColumnFilters: (filters: Record<string, ColumnFilterState>) => void;
  setColumnFilter: (columnId: string, filter: ColumnFilterState | null) => void;
  clearAllFilters: () => void;
  setSearchKeyword: (keyword: string) => void;

  // Overlays & Cell Editor
  openCellEditor: (overlay: ActiveOverlayState) => void;
  closeCellEditor: () => void;
  setEditorValidating: (isValidating: boolean, error?: string | null) => void;

  // Modals & Popovers
  openHeaderFilter: (state: HeaderFilterPopoverState) => void;
  closeHeaderFilter: () => void;
  openContextMenu: (menu: ContextMenuState) => void;
  closeContextMenu: () => void;
  openSparklineModal: (modal: SparklineModalState) => void;
  closeSparklineModal: () => void;
  openPdfModal: (modal: PdfPreviewModalState) => void;
  closePdfModal: () => void;
  setShowBatchModal: (show: boolean) => void;
  openDeleteConfirmModal: (modal: DeleteConfirmModalState) => void;
  closeDeleteConfirmModal: () => void;

  // Feedback & Interactions
  showToast: (text: string, type?: 'info' | 'warning' | 'success', durationMs?: number) => void;
  hideToast: () => void;

  // Theme & Locale
  setThemeName: (name: ThemeInput) => void;
  setResolvedTheme: (tokens: IGridThemeTokens) => void;
  setLocale: (locale: IGridLocale) => void;

  // Permissions & Configurations
  setPermissions: (permissions: GridPermissions) => void;
  updateToolbarConfig: (patch: Partial<GridToolbarConfig>) => void;
  updateSummaryConfig: (patch: Partial<GridSummaryConfig>) => void;

  // Row Selection
  setRowSelectionMode: (mode: RowSelectionMode) => void;
  setSelectedRowKeys: (keys: Set<any> | any[]) => void;
  toggleRowKey: (key: any) => void;
  selectAllRows: (keys: any[]) => void;
  clearSelectedRows: () => void;

  // Master-Detail
  toggleMasterRow: (rowKey: any) => void;
  setMasterRowExpanded: (rowKey: any, expanded: boolean) => void;
  collapseAllMasterRows: () => void;
}

export interface GridContextValue {
  state: GridUIState;
  dispatch: React.Dispatch<GridAction>;
  actions: GridActions;
  store?: IDataStore;
}

// Split contexts for maximum rendering efficiency:
// Components reading only state will subscribe to GridStateContext.
// Components performing only actions/dispatch will subscribe to GridDispatchContext or GridActionsContext without re-rendering on state changes.
export const GridStateContext = createContext<GridUIState | null>(null);
export const GridDispatchContext = createContext<React.Dispatch<GridAction> | null>(null);
export const GridActionsContext = createContext<GridActions | null>(null);
export const GridContext = createContext<GridContextValue | null>(null);

export interface GridProviderProps {
  children: ReactNode;
  initialState?: Partial<GridUIState>;
  store?: IDataStore;
  theme?: ThemeInput;
  locale?: LocaleInput;
  permissions?: GridPermissions;
  selectedRowKeys?: any[] | Set<any>;
  onSortRulesChange?: (sortRules: SortDescriptor[]) => void;
  onColumnFiltersChange?: (filters: Record<string, ColumnFilterState>) => void;
  onThemeChange?: (themeName: ThemeInput) => void;
  onLocaleChange?: (locale: IGridLocale) => void;
  onPermissionsChange?: (permissions: GridPermissions) => void;
  onSelectionChange?: (selectedKeys: any[]) => void;
}

export const GridProvider: React.FC<GridProviderProps> = ({
  children,
  initialState,
  store,
  theme,
  locale,
  permissions,
  selectedRowKeys,
  onSortRulesChange,
  onColumnFiltersChange,
  onThemeChange,
  onLocaleChange,
  onPermissionsChange,
  onSelectionChange,
}) => {
  const [state, dispatch] = useReducer(
    gridReducer,
    initialState,
    createInitialGridState
  );

  // Stabilize external callbacks with refs to eliminate infinite update loops
  const onSortRulesChangeRef = useRef(onSortRulesChange);
  onSortRulesChangeRef.current = onSortRulesChange;

  const onColumnFiltersChangeRef = useRef(onColumnFiltersChange);
  onColumnFiltersChangeRef.current = onColumnFiltersChange;

  const onThemeChangeRef = useRef(onThemeChange);
  onThemeChangeRef.current = onThemeChange;

  const onLocaleChangeRef = useRef(onLocaleChange);
  onLocaleChangeRef.current = onLocaleChange;

  const onPermissionsChangeRef = useRef(onPermissionsChange);
  onPermissionsChangeRef.current = onPermissionsChange;

  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  // First render guard to avoid firing callbacks on mount
  const isFirstRender = useRef(true);
  useEffect(() => {
    isFirstRender.current = false;
  }, []);

  // Sync state changes to external parent callbacks (guarded against first mount)
  useEffect(() => {
    if (isFirstRender.current) return;
    onSortRulesChangeRef.current?.(state.sortRules);
  }, [state.sortRules]);

  useEffect(() => {
    if (isFirstRender.current) return;
    onColumnFiltersChangeRef.current?.(state.columnFilters);
  }, [state.columnFilters]);

  useEffect(() => {
    if (isFirstRender.current) return;
    onThemeChangeRef.current?.(state.currentThemeName);
  }, [state.currentThemeName]);

  useEffect(() => {
    if (isFirstRender.current) return;
    onLocaleChangeRef.current?.(state.currentLocale);
  }, [state.currentLocale]);

  useEffect(() => {
    if (isFirstRender.current) return;
    onPermissionsChangeRef.current?.(state.permissions);
  }, [state.permissions]);

  useEffect(() => {
    if (isFirstRender.current) return;
    onSelectionChangeRef.current?.(Array.from(state.selectedRowKeys));
  }, [state.selectedRowKeys]);

  // Synchronize incoming external prop changes to reducer actions
  const prevTheme = useRef(theme);
  useEffect(() => {
    if (theme !== undefined && theme !== prevTheme.current) {
      prevTheme.current = theme;
      dispatch({ type: 'SET_THEME_NAME', payload: theme });
    }
  }, [theme]);

  const prevLocale = useRef(locale);
  useEffect(() => {
    if (locale !== undefined && locale !== prevLocale.current) {
      prevLocale.current = locale;
      dispatch({ type: 'SET_LOCALE', payload: LocaleEngine.resolve(locale) });
    }
  }, [locale]);

  const prevPermissions = useRef(permissions);
  useEffect(() => {
    if (permissions !== undefined && permissions !== prevPermissions.current) {
      prevPermissions.current = permissions;
      dispatch({ type: 'SET_PERMISSIONS', payload: permissions });
    }
  }, [permissions]);

  const prevSelectedRowKeys = useRef(selectedRowKeys);
  useEffect(() => {
    if (selectedRowKeys !== undefined && selectedRowKeys !== prevSelectedRowKeys.current) {
      prevSelectedRowKeys.current = selectedRowKeys;
      dispatch({ type: 'SET_SELECTED_ROW_KEYS', payload: selectedRowKeys });
    }
  }, [selectedRowKeys]);

  // Restore ThemeEngine.watchSystem listener when theme is set to 'system'
  useEffect(() => {
    if (state.currentThemeName === 'system') {
      const unsub = ThemeEngine.watchSystem(() => {
        dispatch({ type: 'SET_RESOLVED_THEME', payload: ThemeEngine.resolve('system') });
      });
      return unsub;
    }
  }, [state.currentThemeName]);

  // Auto-dismiss Toast notifications with proper timeout cleanup to prevent memory leaks
  useEffect(() => {
    if (!state.toastMessage) return;
    const duration = state.toastMessage.durationMs ?? 2600;
    const timer = setTimeout(() => {
      dispatch({ type: 'HIDE_TOAST' });
    }, duration);
    return () => clearTimeout(timer);
  }, [state.toastMessage]);

  // Memoized bound actions
  const actions = useMemo<GridActions>(() => {
    return {
      setSortRules: (rules) => dispatch({ type: 'SET_SORT_RULES', payload: rules }),
      setGroups: (groups) => dispatch({ type: 'SET_GROUPS', payload: groups }),
      toggleGroup: (field) => dispatch({ type: 'TOGGLE_GROUP', payload: field }),
      setColumnFilters: (filters) => dispatch({ type: 'SET_COLUMN_FILTERS', payload: filters }),
      setColumnFilter: (columnId, filter) =>
        dispatch({ type: 'SET_COLUMN_FILTER', payload: { columnId, filter } }),
      clearAllFilters: () => dispatch({ type: 'CLEAR_ALL_FILTERS' }),
      setSearchKeyword: (keyword) => dispatch({ type: 'SET_SEARCH_KEYWORD', payload: keyword }),

      openCellEditor: (overlay) => dispatch({ type: 'OPEN_CELL_EDITOR', payload: overlay }),
      closeCellEditor: () => dispatch({ type: 'CLOSE_CELL_EDITOR' }),
      setEditorValidating: (isValidating, error) =>
        dispatch({ type: 'SET_EDITOR_VALIDATING', payload: { isValidating, error } }),

      openHeaderFilter: (headerState) =>
        dispatch({ type: 'OPEN_HEADER_FILTER', payload: headerState }),
      closeHeaderFilter: () => dispatch({ type: 'CLOSE_HEADER_FILTER' }),
      openContextMenu: (menu) => dispatch({ type: 'OPEN_CONTEXT_MENU', payload: menu }),
      closeContextMenu: () => dispatch({ type: 'CLOSE_CONTEXT_MENU' }),
      openSparklineModal: (modal) => dispatch({ type: 'OPEN_SPARKLINE_MODAL', payload: modal }),
      closeSparklineModal: () => dispatch({ type: 'CLOSE_SPARKLINE_MODAL' }),
      openPdfModal: (modal) => dispatch({ type: 'OPEN_PDF_MODAL', payload: modal }),
      closePdfModal: () => dispatch({ type: 'CLOSE_PDF_MODAL' }),
      setShowBatchModal: (show) => dispatch({ type: 'SET_SHOW_BATCH_MODAL', payload: show }),
      openDeleteConfirmModal: (modal) =>
        dispatch({ type: 'OPEN_DELETE_CONFIRM_MODAL', payload: modal }),
      closeDeleteConfirmModal: () => dispatch({ type: 'CLOSE_DELETE_CONFIRM_MODAL' }),

      showToast: (text, type = 'info', durationMs = 2600) => {
        dispatch({ type: 'SHOW_TOAST', payload: { text, type, durationMs } });
      },
      hideToast: () => {
        dispatch({ type: 'HIDE_TOAST' });
      },

      setThemeName: (name) => dispatch({ type: 'SET_THEME_NAME', payload: name }),
      setResolvedTheme: (tokens) => dispatch({ type: 'SET_RESOLVED_THEME', payload: tokens }),
      setLocale: (locale) => dispatch({ type: 'SET_LOCALE', payload: locale }),

      setPermissions: (perms) => dispatch({ type: 'SET_PERMISSIONS', payload: perms }),
      updateToolbarConfig: (patch) => dispatch({ type: 'UPDATE_TOOLBAR_CONFIG', payload: patch }),
      updateSummaryConfig: (patch) => dispatch({ type: 'UPDATE_SUMMARY_CONFIG', payload: patch }),

      setRowSelectionMode: (mode) => dispatch({ type: 'SET_ROW_SELECTION_MODE', payload: mode }),
      setSelectedRowKeys: (keys) => dispatch({ type: 'SET_SELECTED_ROW_KEYS', payload: keys }),
      toggleRowKey: (key) => dispatch({ type: 'TOGGLE_ROW_KEY', payload: key }),
      selectAllRows: (keys) => dispatch({ type: 'SELECT_ALL_ROWS', payload: keys }),
      clearSelectedRows: () => dispatch({ type: 'CLEAR_SELECTED_ROWS' }),

      // Master-Detail
      toggleMasterRow: (rowKey) => dispatch({ type: 'TOGGLE_MASTER_ROW', payload: rowKey }),
      setMasterRowExpanded: (rowKey, expanded) =>
        dispatch({ type: 'SET_MASTER_ROW_EXPANDED', payload: { rowKey, expanded } }),
      collapseAllMasterRows: () => dispatch({ type: 'COLLAPSE_ALL_MASTER_ROWS' }),
    };
  }, [dispatch]);

  const combinedContextValue = useMemo<GridContextValue>(() => {
    return {
      state,
      dispatch,
      actions,
      store,
    };
  }, [state, dispatch, actions, store]);

  return (
    <GridDispatchContext.Provider value={dispatch}>
      <GridActionsContext.Provider value={actions}>
        <GridStateContext.Provider value={state}>
          <GridContext.Provider value={combinedContextValue}>
            {children}
          </GridContext.Provider>
        </GridStateContext.Provider>
      </GridActionsContext.Provider>
    </GridDispatchContext.Provider>
  );
};
