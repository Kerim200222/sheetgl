import { ColumnDef, GridPermissions, ActiveOverlayState, GridToolbarConfig, GridSummaryConfig, RowSelectionMode } from '../types/grid';
import { SortDescriptor, ColumnFilterState } from '../types/filter';
import { GroupDescriptor } from '../types/group';
import { IGridThemeTokens } from '../theme/IGridTheme';
import { ThemeEngine, ThemeInput } from '../theme/ThemeEngine';
import { IGridLocale } from '../i18n/IGridLocale';
import { LocaleEngine } from '../i18n/LocaleEngine';
import { ContextMenuState } from '../overlays/ContextMenuOverlay';
import { SparklineModalState } from '../overlays/SparklineModalOverlay';
import { PdfPreviewModalState } from '../overlays/PdfPreviewModalOverlay';

export interface HeaderFilterPopoverState {
  column: ColumnDef;
  rect: { x: number; y: number; width: number; height: number };
}

export interface DeleteConfirmModalState {
  rowKeys: any[];
  sampleRows: Record<string, any>[];
  singleRowIndex?: number;
}

export interface ToastMessageState {
  text: string;
  type: 'info' | 'warning' | 'success';
  durationMs?: number;
}

export interface FillDragState {
  mode: 'corner' | 'right-duplicate';
  sourceRange: { minRow: number; maxRow: number; minCol: number; maxCol: number };
  targetRange: { minRow: number; maxRow: number; minCol: number; maxCol: number };
}

/**
 * Grid UI State interface representing all interactive view states
 * decoupled from the Canvas rendering core and SheetGL monolith.
 */
export interface GridUIState {
  // Query & Organization
  sortRules: SortDescriptor[];
  groups: GroupDescriptor[];
  columnFilters: Record<string, ColumnFilterState>;
  searchKeyword: string;

  // Overlays & Cell Editor
  activeOverlay: ActiveOverlayState | null;
  editorValidationError: string | null;
  isEditorValidating: boolean;

  // Modals & Popovers
  headerFilterState: HeaderFilterPopoverState | null;
  contextMenu: ContextMenuState | null;
  sparklineModal: SparklineModalState | null;
  pdfModal: PdfPreviewModalState | null;
  showBatchModal: boolean;
  deleteConfirmModal: DeleteConfirmModalState | null;

  // Feedback & Interactive States
  toastMessage: ToastMessageState | null;

  // Configuration & Theme Tokens
  currentThemeName: ThemeInput;
  resolvedTheme: IGridThemeTokens;
  currentLocale: IGridLocale;
  permissions: GridPermissions;
  toolbarConfig: GridToolbarConfig;
  summaryConfig: GridSummaryConfig;

  // Row Selection
  rowSelectionMode: RowSelectionMode;
  selectedRowKeys: Set<any>;

  // Master-Detail
  expandedMasterRows: Set<any>;
}

export type GridAction =
  // Sorting & Grouping
  | { type: 'SET_SORT_RULES'; payload: SortDescriptor[] }
  | { type: 'SET_GROUPS'; payload: GroupDescriptor[] }
  | { type: 'TOGGLE_GROUP'; payload: string }
  // Filtering
  | { type: 'SET_COLUMN_FILTERS'; payload: Record<string, ColumnFilterState> }
  | { type: 'SET_COLUMN_FILTER'; payload: { columnId: string; filter: ColumnFilterState | null } }
  | { type: 'CLEAR_ALL_FILTERS' }
  | { type: 'SET_SEARCH_KEYWORD'; payload: string }
  // Cell Editor Overlay
  | { type: 'OPEN_CELL_EDITOR'; payload: ActiveOverlayState }
  | { type: 'CLOSE_CELL_EDITOR' }
  | { type: 'SET_EDITOR_VALIDATING'; payload: { isValidating: boolean; error?: string | null } }
  // Header Filter Popover
  | { type: 'OPEN_HEADER_FILTER'; payload: HeaderFilterPopoverState }
  | { type: 'CLOSE_HEADER_FILTER' }
  // Context Menu
  | { type: 'OPEN_CONTEXT_MENU'; payload: ContextMenuState }
  | { type: 'CLOSE_CONTEXT_MENU' }
  // Sparkline & Media Modals
  | { type: 'OPEN_SPARKLINE_MODAL'; payload: SparklineModalState }
  | { type: 'CLOSE_SPARKLINE_MODAL' }
  | { type: 'OPEN_PDF_MODAL'; payload: PdfPreviewModalState }
  | { type: 'CLOSE_PDF_MODAL' }
  // Batch & Delete Modals
  | { type: 'SET_SHOW_BATCH_MODAL'; payload: boolean }
  | { type: 'OPEN_DELETE_CONFIRM_MODAL'; payload: DeleteConfirmModalState }
  | { type: 'CLOSE_DELETE_CONFIRM_MODAL' }
  // Feedback & Interactions
  | { type: 'SHOW_TOAST'; payload: ToastMessageState }
  | { type: 'HIDE_TOAST' }
  // Theme & Locale
  | { type: 'SET_THEME_NAME'; payload: ThemeInput }
  | { type: 'SET_RESOLVED_THEME'; payload: IGridThemeTokens }
  | { type: 'SET_LOCALE'; payload: IGridLocale }
  // Permissions & Configs
  | { type: 'SET_PERMISSIONS'; payload: GridPermissions }
  | { type: 'UPDATE_TOOLBAR_CONFIG'; payload: Partial<GridToolbarConfig> }
  | { type: 'UPDATE_SUMMARY_CONFIG'; payload: Partial<GridSummaryConfig> }
  // Row Selection
  | { type: 'SET_ROW_SELECTION_MODE'; payload: RowSelectionMode }
  | { type: 'SET_SELECTED_ROW_KEYS'; payload: Set<any> | any[] }
  | { type: 'TOGGLE_ROW_KEY'; payload: any }
  | { type: 'SELECT_ALL_ROWS'; payload: any[] }
  | { type: 'CLEAR_SELECTED_ROWS' }
  // Master-Detail
  | { type: 'TOGGLE_MASTER_ROW'; payload: any }
  | { type: 'SET_MASTER_ROW_EXPANDED'; payload: { rowKey: any; expanded: boolean } }
  | { type: 'COLLAPSE_ALL_MASTER_ROWS' };

export const defaultPermissions: GridPermissions = {
  mode: 'write',
  allowAdding: true,
  allowUpdating: true,
  allowDeleting: true,
  allowDuplicating: true,
  allowClipboardPaste: true,
  allowExport: true,
  allowFiltering: true,
  allowSorting: true,
  allowGrouping: true,
  allowBatchSave: true,
};

export function createInitialGridState(initial?: Partial<GridUIState>): GridUIState {
  const themeInput = initial?.currentThemeName || 'system';
  const resolved = initial?.resolvedTheme || ThemeEngine.resolve(themeInput);
  const locale = initial?.currentLocale || LocaleEngine.resolve('auto');

  return {
    sortRules: initial?.sortRules || [],
    groups: initial?.groups || [],
    columnFilters: initial?.columnFilters || {},
    searchKeyword: initial?.searchKeyword || '',

    activeOverlay: initial?.activeOverlay || null,
    editorValidationError: null,
    isEditorValidating: false,

    headerFilterState: null,
    contextMenu: null,
    sparklineModal: null,
    pdfModal: null,
    showBatchModal: false,
    deleteConfirmModal: null,

    toastMessage: null,

    currentThemeName: themeInput,
    resolvedTheme: resolved,
    currentLocale: locale,
    permissions: initial?.permissions || defaultPermissions,
    toolbarConfig: initial?.toolbarConfig || { visible: true, buttonDisplayMode: 'icon-text' },
    summaryConfig: initial?.summaryConfig || {
      visible: true,
      showTotalCount: true,
      showSelectionStats: true,
      showColumnSummaries: true,
      allowConfiguration: true,
    },

    rowSelectionMode: initial?.rowSelectionMode || 'none',
    selectedRowKeys: initial?.selectedRowKeys ? new Set(initial.selectedRowKeys) : new Set(),

    // Master-Detail
    expandedMasterRows: initial?.expandedMasterRows ? new Set(initial.expandedMasterRows) : new Set(),
  };
}

export function gridReducer(state: GridUIState, action: GridAction): GridUIState {
  switch (action.type) {
    case 'SET_SORT_RULES':
      return { ...state, sortRules: action.payload };

    case 'SET_GROUPS':
      return { ...state, groups: action.payload };

    case 'TOGGLE_GROUP': {
      const field = action.payload;
      const existing = state.groups.find((g) => g.selector === field);
      if (existing) {
        return {
          ...state,
          groups: state.groups.filter((g) => g.selector !== field),
        };
      }
      return {
        ...state,
        groups: [...state.groups, { selector: field, isExpanded: true }],
      };
    }

    case 'SET_COLUMN_FILTERS':
      return { ...state, columnFilters: action.payload };

    case 'SET_COLUMN_FILTER': {
      const { columnId, filter } = action.payload;
      if (!filter) {
        const next = { ...state.columnFilters };
        delete next[columnId];
        return { ...state, columnFilters: next };
      }
      return {
        ...state,
        columnFilters: { ...state.columnFilters, [columnId]: filter },
      };
    }

    case 'CLEAR_ALL_FILTERS':
      return { ...state, columnFilters: {}, searchKeyword: '' };

    case 'SET_SEARCH_KEYWORD':
      return { ...state, searchKeyword: action.payload };

    case 'OPEN_CELL_EDITOR':
      return {
        ...state,
        activeOverlay: action.payload,
        editorValidationError: null,
        isEditorValidating: false,
        // Close context menu and other modals if editor opens
        contextMenu: null,
        headerFilterState: null,
      };

    case 'CLOSE_CELL_EDITOR':
      return {
        ...state,
        activeOverlay: null,
        editorValidationError: null,
        isEditorValidating: false,
      };

    case 'SET_EDITOR_VALIDATING':
      return {
        ...state,
        isEditorValidating: action.payload.isValidating,
        editorValidationError: action.payload.error !== undefined ? action.payload.error : state.editorValidationError,
      };

    case 'OPEN_HEADER_FILTER':
      return {
        ...state,
        headerFilterState: action.payload,
        contextMenu: null,
        activeOverlay: null,
      };

    case 'CLOSE_HEADER_FILTER':
      return { ...state, headerFilterState: null };

    case 'OPEN_CONTEXT_MENU':
      return {
        ...state,
        contextMenu: action.payload,
        headerFilterState: null,
      };

    case 'CLOSE_CONTEXT_MENU':
      return { ...state, contextMenu: null };

    case 'OPEN_SPARKLINE_MODAL':
      return { ...state, sparklineModal: action.payload, contextMenu: null };

    case 'CLOSE_SPARKLINE_MODAL':
      return { ...state, sparklineModal: null };

    case 'OPEN_PDF_MODAL':
      return { ...state, pdfModal: action.payload, contextMenu: null };

    case 'CLOSE_PDF_MODAL':
      return { ...state, pdfModal: null };

    case 'SET_SHOW_BATCH_MODAL':
      return { ...state, showBatchModal: action.payload };

    case 'OPEN_DELETE_CONFIRM_MODAL':
      return { ...state, deleteConfirmModal: action.payload, contextMenu: null };

    case 'CLOSE_DELETE_CONFIRM_MODAL':
      return { ...state, deleteConfirmModal: null };

    case 'SHOW_TOAST':
      return { ...state, toastMessage: action.payload };

    case 'HIDE_TOAST':
      return { ...state, toastMessage: null };

    case 'SET_THEME_NAME': {
      const resolved = ThemeEngine.resolve(action.payload);
      return { ...state, currentThemeName: action.payload, resolvedTheme: resolved };
    }

    case 'SET_RESOLVED_THEME':
      return { ...state, resolvedTheme: action.payload };

    case 'SET_LOCALE':
      return { ...state, currentLocale: action.payload };

    case 'SET_PERMISSIONS':
      return { ...state, permissions: action.payload };

    case 'UPDATE_TOOLBAR_CONFIG':
      return { ...state, toolbarConfig: { ...state.toolbarConfig, ...action.payload } };

    case 'UPDATE_SUMMARY_CONFIG':
      return { ...state, summaryConfig: { ...state.summaryConfig, ...action.payload } };

    case 'SET_ROW_SELECTION_MODE':
      return {
        ...state,
        rowSelectionMode: action.payload,
        selectedRowKeys: action.payload === 'none' ? new Set() : state.selectedRowKeys,
      };

    case 'SET_SELECTED_ROW_KEYS': {
      const newKeys = action.payload instanceof Set ? action.payload : new Set(action.payload);
      return { ...state, selectedRowKeys: newKeys };
    }

    case 'TOGGLE_ROW_KEY': {
      const next = new Set(state.selectedRowKeys);
      if (state.rowSelectionMode === 'single') {
        if (next.has(action.payload)) {
          next.clear();
        } else {
          next.clear();
          next.add(action.payload);
        }
      } else {
        if (next.has(action.payload)) {
          next.delete(action.payload);
        } else {
          next.add(action.payload);
        }
      }
      return { ...state, selectedRowKeys: next };
    }

    case 'SELECT_ALL_ROWS':
      return { ...state, selectedRowKeys: new Set(action.payload) };

    case 'CLEAR_SELECTED_ROWS':
      return state.selectedRowKeys.size === 0 ? state : { ...state, selectedRowKeys: new Set() };

    case 'TOGGLE_MASTER_ROW': {
      const rowKey = action.payload;
      const next = new Set(state.expandedMasterRows);
      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }
      return { ...state, expandedMasterRows: next };
    }

    case 'SET_MASTER_ROW_EXPANDED': {
      const { rowKey, expanded } = action.payload;
      const next = new Set(state.expandedMasterRows);
      if (expanded) {
        next.add(rowKey);
      } else {
        next.delete(rowKey);
      }
      return { ...state, expandedMasterRows: next };
    }

    case 'COLLAPSE_ALL_MASTER_ROWS':
      return state.expandedMasterRows.size === 0
        ? state
        : { ...state, expandedMasterRows: new Set() };

    default:
      return state;
  }
}
