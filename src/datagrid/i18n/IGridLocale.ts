export interface IGridLocale {
  code: string;
  language: string;

  // Toolbar & Theme
  searchPlaceholder: string;
  addGroup: string;
  exportCsv: string;
  exportExcel?: string;
  rows: string;
  columns: string;
  systemTheme: string;

  // Formula Bar & Status
  formulaBarPlaceholder: string;
  totalRecords: string;

  // Header Filter Popover
  searchValuesPlaceholder: string;
  selectAll: string;
  clear: string;
  apply: string;
  cancel?: string;
  loading: string;
  noMatches: string;

  // Common Values
  emptyText: string;
  trueText: string;
  falseText: string;
  ratingOutOf: (val: number) => string;
  groupRecordCount: (count: number) => string;
}
