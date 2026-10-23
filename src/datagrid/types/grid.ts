import { SummaryType } from './group';
import { BatchChanges, IDataStore } from './store';

export type ColumnId = string;

export type ColumnType =
  | 'text'
  | 'number'
  | 'currency'
  | 'percent'
  | 'boolean'
  | 'select'
  | 'dropdown'
  | 'multiselect'
  | 'lookup'
  | 'object'
  | 'progress'
  | 'date'
  | 'datetime'
  | 'time'
  | 'email'
  | 'url'
  | 'pdf'
  | 'file'
  | 'phone'
  | 'color'
  | 'rating'
  | 'sparkline'
  | 'action'
  | (string & {});

export type ColumnPermission = 'write' | 'readonly' | 'read';

export type RowSelectionMode = 'none' | 'single' | 'multiple';

export interface SelectOption {
  value: string;
  label: string;
  subtitle?: string;
  icon?: string;
  color?: string;
  bgColor?: string;
  bg?: string;
  fg?: string;
  darkBg?: string;
  darkFg?: string;
}

export type ValidationRuleResult =
  | boolean
  | string
  | void
  | { valid: boolean; message?: string };

/**
 * DevExtreme-compatible Deferred object for asynchronous validation rules.
 * Can be resolved with `true` (valid) or `false` (invalid, uses rule.message),
 * or rejected with `reject("Custom error message")` / `reject()`.
 */
export interface IDeferred<T = ValidationRuleResult> {
  resolve: (result?: T) => void;
  reject: (errorMessage?: string | { valid?: boolean; message?: string }) => void;
  promise: () => Promise<ValidationRuleResult>;
}

export interface ValidationCallbackParams {
  value: any;
  data: Record<string, any>;
  column: ColumnDef;
  rule?: ValidationRule;
  /**
   * Built-in DevExtreme-style Deferred instance ready to use inside async validationCallback:
   * `deferred.resolve(true)` / `deferred.resolve(false)` / `deferred.reject("Error")`
   * and `return deferred.promise()` (or `return deferred`).
   */
  deferred: IDeferred<ValidationRuleResult>;
}

export type ValidationRule =
  | {
      type: 'required';
      trim?: boolean;
      message?: string;
    }
  | {
      type: 'range';
      min?: number;
      max?: number;
      message?: string;
    }
  | {
      type: 'stringLength';
      min?: number;
      max?: number;
      trim?: boolean;
      message?: string;
    }
  | {
      type: 'pattern';
      pattern: RegExp | string;
      message?: string;
    }
  | {
      type: 'email';
      ignoreEmptyValue?: boolean;
      message?: string;
    }
  | {
      type: 'url';
      ignoreEmptyValue?: boolean;
      message?: string;
    }
  | {
      type: 'compare';
      comparisonTarget: (row: Record<string, any>) => any;
      comparisonType?: '==' | '!=' | '<' | '<=' | '>' | '>=';
      message?: string;
    }
  | {
      type: 'custom';
      validationCallback: (params: ValidationCallbackParams) => ValidationRuleResult;
      message?: string;
    }
  | {
      type: 'async';
      validationCallback: (
        params: ValidationCallbackParams
      ) =>
        | Promise<ValidationRuleResult>
        | IDeferred<ValidationRuleResult>
        | ValidationRuleResult;
      message?: string;
    };

export interface CascadingUpdateContext {
  rowKey: any;
  columnId: string;
  store: IDataStore;
}

/**
 * Built-in semantic color presets that automatically adapt to both Dark and Light themes.
 */
export type ColumnColorPreset =
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'purple'
  | 'emerald'
  | 'green'
  | 'teal'
  | 'cyan'
  | 'amber'
  | 'orange'
  | 'rose'
  | 'red'
  | 'slate';

/**
 * A color value that can be a semantic preset ('emerald', 'blue', etc.),
 * a CSS color string, or an explicit { light, dark } theme pair.
 */
export type ThemeAwareColor =
  | ColumnColorPreset
  | string
  | {
      light: string;
      dark: string;
    };

/**
 * Theme-aware styling configuration for a Column or Column Group.
 * Supports semantic presets ('emerald', 'blue', 'amber', etc.), single CSS colors (auto-adapted),
 * or explicit { light, dark } color pairs for full control over Dark & Light themes.
 */
export interface ColumnColorConfig {
  /**
   * Semantic preset ('blue', 'emerald', 'violet', 'amber', 'rose', 'cyan', 'slate', etc.)
   * that automatically styles group header, column header, and/or column cells
   * for both Dark and Light themes.
   */
  preset?: ColumnColorPreset;
  /**
   * Column header background color (or { light, dark } pair).
   */
  headerBg?: ThemeAwareColor;
  /**
   * Column header text color (or { light, dark } pair).
   */
  headerText?: ThemeAwareColor;
  /**
   * Top/bottom accent line color on the header (or { light, dark } pair).
   */
  headerAccent?: ThemeAwareColor;
  /**
   * Column data cells background tint (or { light, dark } pair).
   */
  columnBg?: ThemeAwareColor;
  /**
   * Column data cells text color (or { light, dark } pair).
   */
  columnText?: ThemeAwareColor;
  /**
   * Group header band background color (when used on a ColumnGroupDef).
   */
  groupHeaderBg?: ThemeAwareColor;
  /**
   * Group header band text color (when used on a ColumnGroupDef).
   */
  groupHeaderText?: ThemeAwareColor;
  /**
   * Group header border / top bar accent color.
   */
  borderColor?: ThemeAwareColor;
}

/**
 * Banded Column Group definition (`Sütun Grubu`).
 * Groups multiple columns under a shared top header band with optional theme-aware colors.
 */
export interface ColumnGroupDef {
  /** Unique group identifier */
  id: string;
  /** Display title rendered in the top group header band */
  title: string;
  /** Optional subtitle or badge shown next to the group title */
  subtitle?: string;
  /** List of child column IDs belonging to this group (optional if columns specify `headerGroup` / `groupId`) */
  columnIds?: string[];
  /** Quick theme-aware color preset ('emerald', 'blue', 'amber', etc.) or { light, dark } color for the entire group */
  color?: ThemeAwareColor;
  /** Explicit header background color (or { light, dark } pair) for columns in this group */
  headerColor?: ThemeAwareColor;
  /** Explicit header text color (or { light, dark } pair) for columns in this group */
  headerTextColor?: ThemeAwareColor;
  /** Explicit data cell column background color (or { light, dark } pair) for columns in this group */
  columnColor?: ThemeAwareColor;
  /** Explicit data cell column text color (or { light, dark } pair) for columns in this group */
  columnTextColor?: ThemeAwareColor;
  /** Detailed theme-aware style overrides for group header, child headers, and child cells */
  style?: ColumnColorConfig;
  /**
   * Whether child columns automatically inherit header & cell tint colors from this group (default: true).
   */
  inheritColumnColors?: boolean;
  /** Text alignment of the group header title (default: 'center') */
  align?: 'left' | 'center' | 'right';
}

export interface ColumnDef {
  id: ColumnId;
  title: string;
  type: ColumnType;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  pinned?: 'left' | 'right' | boolean;
  readonly?: boolean;
  permission?: ColumnPermission;
  visible?: boolean;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  groupable?: boolean;
  currencySymbol?: string;
  decimalDigits?: number;
  showVarianceSign?: boolean;
  objectDisplayKey?: string;
  options?: SelectOption[];
  sparklineColor?: string;
  buttonText?: string;
  onActionClick?: (row: any, rowIndex: number) => void;
  /** Custom handler when clicking PDF view button in a 'pdf' or 'file' column */
  onPdfClick?: (url: string, row: any, rowIndex: number) => void;
  /** Custom handler when clicking Open in New Tab button in a 'pdf' or 'file' column */
  onPdfOpenNewTabClick?: (url: string, row: any, rowIndex: number) => void;
  /** Optional URL prefix prepended to relative file/document paths */
  urlPrefix?: string;
  headerTooltip?: string;
  defaultValue?: any;
  summaryType?: SummaryType;

  /**
   * Banded Column Group assignment: can be a group ID / group title string,
   * or an inline ColumnGroupDef object.
   */
  headerGroup?: string | ColumnGroupDef;
  /**
   * Alias for `headerGroup` (references a `ColumnGroupDef.id` in `columnGroups`).
   */
  groupId?: string;
  /**
   * Quick theme-aware color preset ('blue', 'emerald', 'amber', 'rose', 'violet', etc.)
   * or { light, dark } color that styles both the column header and cells.
   */
  color?: ThemeAwareColor;
  /**
   * Theme-aware header background color (`string | ColumnColorPreset | { light: string; dark: string }`).
   */
  headerColor?: ThemeAwareColor;
  /**
   * Theme-aware header text color (`string | { light: string; dark: string }`).
   */
  headerTextColor?: ThemeAwareColor;
  /**
   * Theme-aware column data cell background color (`string | ColumnColorPreset | { light: string; dark: string }`).
   */
  columnColor?: ThemeAwareColor;
  /**
   * Theme-aware column data cell text color (`string | { light: string; dark: string }`).
   */
  columnTextColor?: ThemeAwareColor;
  /**
   * Detailed theme-aware color & surface overrides for header and column cells.
   */
  style?: ColumnColorConfig;

  /**
   * Conditional permission callback per row/cell (cell-level allowEditing rule)
   */
  canEdit?: (row: any, column: ColumnDef) => boolean;

  /**
   * Declarative DevExtreme/AG-Grid style static & async validation rules
   */
  validationRules?: ValidationRule[];

  /**
   * Cell validation callback (supports both synchronous/static and async Promise validation)
   */
  validator?: (
    value: any,
    row: any,
    column: ColumnDef
  ) => ValidationRuleResult | Promise<ValidationRuleResult>;

  /**
   * Enterprise setCellValue cascading hook (sync or async backend fetch).
   * Can mutate `newData` or return a Promise resolving to a partial row patch fetched from backend.
   */
  setCellValue?: (
    newData: Record<string, any>,
    value: any,
    currentRowData: Record<string, any>,
    context: CascadingUpdateContext
  ) => void | Record<string, any> | Promise<void | Record<string, any>>;
}

export interface GridPermissions {
  mode?: 'write' | 'read' | 'readonly';
  allowAdding?: boolean;
  allowUpdating?: boolean;
  allowDeleting?: boolean;
  allowDuplicating?: boolean;
  allowClipboardPaste?: boolean;
  allowExport?: boolean;
  allowFiltering?: boolean;
  allowSorting?: boolean;
  allowGrouping?: boolean;
  allowBatchSave?: boolean;
}

export interface EditingStartEvent {
  row: Record<string, any>;
  rowKey: any;
  rowIndex: number;
  column: ColumnDef;
  value: any;
  cancel?: boolean;
}

export interface CellValueChangingEvent {
  row: Record<string, any>;
  rowKey: any;
  rowIndex: number;
  column: ColumnDef;
  oldValue: any;
  newValue: any;
  cancel?: boolean;
  errorMessage?: string;
}

export interface CellValueChangedEvent {
  row: Record<string, any>;
  rowKey: any;
  rowIndex: number;
  column: ColumnDef;
  oldValue: any;
  newValue: any;
  updateRow: (patch: Record<string, any>) => void;
}

export interface RowInsertingEvent {
  data: Record<string, any>;
  targetRowIndex?: number;
  cancel?: boolean;
}

export interface RowInsertedEvent {
  data: Record<string, any>;
  key: any;
}

export interface RowUpdatingEvent {
  key: any;
  oldData: Record<string, any>;
  newData: Record<string, any>;
  cancel?: boolean;
}

export interface RowUpdatedEvent {
  key: any;
  data: Record<string, any>;
}

export interface RowRemovingEvent {
  key: any;
  data: Record<string, any>;
  cancel?: boolean;
}

export interface RowRemovedEvent {
  key: any;
  data: Record<string, any>;
}

export interface SavingEvent {
  changes: BatchChanges;
  cancel?: boolean;
}

export interface SavedEvent {
  changes: BatchChanges;
}

export interface GridEventLogEntry {
  id: string;
  timestamp: string;
  eventName: string;
  summary: string;
  payload?: any;
  status?: 'info' | 'success' | 'warning' | 'async';
}

export interface CellCoords {
  row: number;
  col: number;
}

export interface CellRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface ActiveOverlayState {
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
  column: ColumnDef;
  initialValue: any;
  initialChar?: string;
}

/**
 * Toolbar button display mode:
 * - 'icon': Only Google Material Symbols icon
 * - 'icon-text': Google Material Symbols icon + text label
 * - 'text': Only text label
 */
export type ToolbarButtonDisplayMode = 'icon' | 'icon-text' | 'text';

export interface GridToolbarCustomItem {
  id: string;
  label: string;
  /** Google Material Symbols icon name (from https://fonts.google.com/icons), e.g. 'refresh', 'print', 'upload_file' */
  icon?: string;
  tooltip?: string;
  position?: 'left' | 'right';
  /** Overrides the toolbar-level buttonDisplayMode for this item */
  displayMode?: ToolbarButtonDisplayMode;
  disabled?: boolean;
  active?: boolean;
  variant?: 'default' | 'primary' | 'danger' | 'success';
  onClick: () => void;
}

export interface GridToolbarConfig {
  /** Whether the toolbar is visible (default: true) */
  visible?: boolean;
  /**
   * Controls how action buttons are rendered across the toolbar:
   * - 'icon': Only Google Material Symbols icon
   * - 'icon-text': Google Material Symbols icon + text label (default)
   * - 'text': Only text label
   */
  buttonDisplayMode?: ToolbarButtonDisplayMode;
  /** Allow switching buttonDisplayMode ('icon' | 'icon-text' | 'text') interactively in the toolbar UI (default: true) */
  allowDisplayModeSwitch?: boolean;
  /** Show SheetGL brand badge on the left (default: true) */
  showBrand?: boolean;
  /** Show Add Row button (default: true) */
  showAddRow?: boolean;
  /** Show Duplicate Row button (default: true) */
  showDuplicateRow?: boolean;
  /** Show Delete Row button (default: true) */
  showDeleteRow?: boolean;
  /** Show Undo / Redo buttons (default: true) */
  showUndoRedo?: boolean;
  /** Show global search input (default: true) */
  showSearch?: boolean;
  /** Show Group By selector (default: true) */
  showGroupBy?: boolean;
  /** Show Clear Active Filters button when filters exist (default: true) */
  showClearFilters?: boolean;
  /** Show Batch Save / Discard controls when there are unsaved changes (default: true) */
  showBatchActions?: boolean;
  /** Show Row Selection Mode switcher ('none' | 'single' | 'multiple') in toolbar */
  showSelectionModeSwitch?: boolean;
  /** Show Permission Mode switcher (default: true) */
  showPermissionsSwitch?: boolean;
  /** Show Column Settings & Summary configuration popover button (default: true) */
  showColumnSettings?: boolean;
  /** Show Locale (EN / TR) switcher (default: true) */
  showLocaleSwitch?: boolean;
  /** Show Theme preset switcher (default: true) */
  showThemeSwitch?: boolean;
  /** Show Export CSV button (default: true) */
  showExportCsv?: boolean;
  /** Custom toolbar action items with Google Material Symbols icon support */
  customItems?: GridToolbarCustomItem[];
}

export type SelectionStatMetric = 'cells' | 'count' | 'numeric' | 'sum' | 'avg' | 'min' | 'max';

export interface GridSummaryItemConfig {
  columnId: string;
  summaryType: SummaryType;
  label?: string;
  prefix?: string;
  suffix?: string;
  decimalDigits?: number;
}

export interface GridSummaryConfig {
  /** Whether the bottom Summary Row / Footer is visible (default: true) */
  visible?: boolean;
  /** Show total row count badge on the left (default: true) */
  showTotalCount?: boolean;
  /** Show live Excel range selection statistics in the center (default: true) */
  showSelectionStats?: boolean;
  /** Which selection metrics to display when multiple cells are selected */
  selectionMetrics?: SelectionStatMetric[];
  /** Show column aggregation summary pills on the right (default: true) */
  showColumnSummaries?: boolean;
  /** Allow user to interactively add/remove/change column summary aggregations in the UI (default: true) */
  allowConfiguration?: boolean;
  /** Map of columnId -> SummaryType ('sum' | 'avg' | 'min' | 'max' | 'count' | 'none') */
  columnSummaryTypes?: Record<string, SummaryType>;
  /** Declarative list of summary items (DevExtreme-style totalItems) */
  items?: GridSummaryItemConfig[];
}

