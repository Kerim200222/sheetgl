export type FilterOperation =
  | 'contains'
  | 'notcontains'
  | 'startswith'
  | 'endswith'
  | '='
  | '<>'
  | '<'
  | '<='
  | '>'
  | '>='
  | 'between'
  | 'in'
  | 'notin';

export type SingleFilter = [string, FilterOperation, any];
export type CompositeFilter = (SingleFilter | 'and' | 'or' | CompositeFilter)[];
export type FilterDescriptor = SingleFilter | CompositeFilter | any[];

export interface ColumnFilterState {
  columnId: string;
  mode: 'values' | 'condition';
  selectedValues?: any[];
  operator?: FilterOperation;
  value1?: any;
  value2?: any;
  /** Pre-compiled semantic AST filter (e.g. Year > Month > Day range/ISO expressions for local & remote execution) */
  semanticFilter?: FilterDescriptor;
}

export interface SortDescriptor {
  selector: string;
  desc: boolean;
}

export interface DistinctItem {
  value: any;
  label: string;
  count?: number;
}

export interface SearchDescriptor {
  keyword: string;
  columns?: string[];
}
