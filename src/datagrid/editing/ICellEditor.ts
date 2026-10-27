import React from 'react';
import { ColumnDef } from '../types/grid';
import { IGridThemeTokens } from '../theme/IGridTheme';
import { IGridLocale } from '../i18n/IGridLocale';
import { GridApi } from '../core/GridApi';

export type CellCommitDirection = 'down' | 'up' | 'right' | 'left' | 'none';

/**
 * Standard contract interface for custom React cell editors in SheetGL.
 */
export interface ICellEditorProps<TValue = any, TRow = Record<string, any>> {
  /**
   * The current cell value to be edited.
   */
  value: TValue;

  /**
   * Full data record of the row being edited, if available.
   */
  rowData?: TRow;

  /**
   * Absolute row index in the data store / virtual viewport.
   */
  rowIndex?: number;

  /**
   * Column index in the active column sequence.
   */
  columnIndex?: number;

  /**
   * The column schema definition associated with this cell.
   */
  column: ColumnDef;

  /**
   * Active grid theme tokens for seamless styling integration.
   */
  theme: IGridThemeTokens;

  /**
   * Active grid locale for localization & numeric/date formatting.
   */
  locale: IGridLocale;

  /**
   * Exact screen-space coordinates and dimensions of the cell.
   */
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  /**
   * Initial character entered by the user if editing was triggered by typing.
   */
  initialChar?: string;

  /**
   * Callback fired to commit changes and optionally move cursor in a direction.
   */
  onCommit: (newValue: TValue, moveDirection?: CellCommitDirection) => void;

  /**
   * Callback fired when editing is cancelled (e.g. Esc pressed).
   */
  onCancel: () => void;

  /**
   * Reference to the public GridApi for custom imperative grid actions.
   */
  api?: GridApi;
}

export type CellEditorComponent<TValue = any, TRow = Record<string, any>> = React.ComponentType<
  ICellEditorProps<TValue, TRow>
>;
