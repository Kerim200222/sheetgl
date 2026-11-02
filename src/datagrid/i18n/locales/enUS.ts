import { IGridLocale } from '../IGridLocale';

export const enUS: IGridLocale = {
  code: 'en-US',
  language: 'English (US)',

  searchPlaceholder: 'Search in table (Ctrl+F)...',
  addGroup: '+ Add to Group',
  exportCsv: 'Export CSV',
  exportExcel: 'Export Excel',
  rows: 'Rows',
  columns: 'Columns',
  systemTheme: 'System (Auto)',

  formulaBarPlaceholder: 'Empty',
  totalRecords: 'Total Records',

  searchValuesPlaceholder: 'Search values...',
  selectAll: '(Select All)',
  clear: 'Clear',
  apply: 'Apply',
  cancel: 'Cancel',
  loading: 'Loading...',
  noMatches: 'No matching records',

  emptyText: '(Blank)',
  trueText: 'TRUE',
  falseText: 'FALSE',
  ratingOutOf: (val: number) => `${val} / 5 Stars`,
  groupRecordCount: (count: number) => `${count.toLocaleString('en-US')} records`,
};
