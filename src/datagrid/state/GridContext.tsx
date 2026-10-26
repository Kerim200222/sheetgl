import React, { createContext, useReducer, useMemo, ReactNode, useEffect, useCallback } from 'react';
import {
  GridUIState,
  GridAction,
  gridReducer,
  createInitialGridState,
  HeaderFilterPopoverState,
  DeleteConfirmModalState,
  ToastMessageState,
  FillDragState,
} from './gridReducer';
import { IDataStore } from '../types/store';
import { SortDescriptor, ColumnFilterState } from '../types/filter';
import { GroupDescriptor } from '../types/group';
import { ActiveOverlayState, GridToolbarConfig, GridSummaryConfig, RowSelectionMode, GridPermissions } from '../types/grid';
import { ThemeInput } from '../theme/ThemeEngine';
import { IGridThemeTokens } from '../theme/IGridTheme';
import { IGridLocale } from '../i18n/IGridLocale';
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
  setCursorStyle: (style: string) => void;
  setFillDragState: (state: FillDragState | null) => void;

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

  // Sync state changes to external parent callbacks if provided
  useEffect(() => {
    onSortRulesChange?.(state.sortRules);
  }, [state.sortRules, onSortRulesChange]);

  useEffect(() => {
    onColumnFiltersChange?.(state.columnFilters);
  }, [state.columnFilters, onColumnFiltersChange]);

  useEffect(() => {
    onThemeChange?.(state.currentThemeName);
  }, [state.currentThemeName, onThemeChange]);

  useEffect(() => {
    onLocaleChange?.(state.currentLocale);
  }, [state.currentLocale, onLocaleChange]);

  useEffect(() => {
    onPermissionsChange?.(state.permissions);
  }, [state.permissions, onPermissionsChange]);

  useEffect(() => {
    onSelectionChange?.(Array.from(state.selectedRowKeys));
  }, [state.selectedRowKeys, onSelectionChange]);

  // Memoized bound actions
  const actions = useMemo<GridActions>(() => {
    let toastTimeout: any = null;

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
        dispatch({ type: 'SHOW_TOAST', payload: { text, type } });
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
          dispatch({ type: 'HIDE_TOAST' });
        }, durationMs);
      },
      hideToast: () => {
        if (toastTimeout) clearTimeout(toastTimeout);
        dispatch({ type: 'HIDE_TOAST' });
      },
      setCursorStyle: (style) => dispatch({ type: 'SET_CURSOR_STYLE', payload: style }),
      setFillDragState: (fillState) => dispatch({ type: 'SET_FILL_DRAG_STATE', payload: fillState }),

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
