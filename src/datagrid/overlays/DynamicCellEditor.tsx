import React from 'react';
import { ColumnTypeRegistry } from '../columns/ColumnTypeRegistry';
import { CellEditorRegistry } from '../editing/CellEditorRegistry';
import { CellCommitDirection } from '../editing/ICellEditor';
import { ActiveOverlayState, ColumnDef } from '../types/grid';
import { IGridThemeTokens } from '../theme/IGridTheme';
import { IGridLocale } from '../i18n/IGridLocale';
import { GridApi } from '../core/GridApi';
import { useGridState } from '../state';

export interface DynamicCellEditorProps {
  /**
   * Active overlay state containing cell coordinates, initial value, and column definition.
   */
  overlay?: ActiveOverlayState | null;

  /**
   * Data record of the row currently being edited.
   */
  rowData?: Record<string, any>;

  /**
   * Current active theme tokens.
   */
  theme?: IGridThemeTokens;

  /**
   * Active grid locale for localized editor strings.
   */
  locale?: IGridLocale;

  /**
   * GridApi reference passed to custom editors for programmatic grid interaction.
   */
  api?: GridApi;

  /**
   * Validation error message if cell validation failed.
   */
  validationError?: string | null;

  /**
   * Whether async validation is in flight.
   */
  isValidating?: boolean;

  /**
   * Callback invoked when the editor commits its new value and navigation direction.
   */
  onCommit: (newValue: any, moveDir?: CellCommitDirection) => void | Promise<void>;

  /**
   * Callback invoked when editing is cancelled.
   */
  onCancel: () => void;
}

/**
 * Resolves the appropriate editor component following priority:
 * 1. ColumnDef.editor (custom component or registry ID)
 * 2. CellEditorRegistry.get(column.type)
 * 3. ColumnTypeRegistry.get(column.type).editorComponent (legacy column plugins)
 * 4. CellEditorRegistry.getDefaultEditor() (fallback standard input)
 */
function resolveEditorComponent(column: ColumnDef): React.ComponentType<any> | null {
  // 1. Explicit editor defined on column
  if (column.editor) {
    if (typeof column.editor === 'function' || typeof column.editor === 'object') {
      return column.editor as React.ComponentType<any>;
    }
    if (typeof column.editor === 'string' && CellEditorRegistry.has(column.editor)) {
      return CellEditorRegistry.get(column.editor);
    }
  }

  // 2. Pluggable CellEditorRegistry by column type
  if (CellEditorRegistry.has(column.type)) {
    return CellEditorRegistry.get(column.type);
  }

  // 3. Legacy ColumnTypeRegistry plugin editor
  if (ColumnTypeRegistry.has(column.type)) {
    const plugin = ColumnTypeRegistry.get(column.type);
    if (plugin?.editorComponent) {
      return plugin.editorComponent;
    }
  }

  // 4. Default fallback editor
  return CellEditorRegistry.getDefaultEditor();
}

/**
 * Generic host overlay component for SheetGL cell editing.
 * Dynamically resolves and renders custom or built-in editors from CellEditorRegistry / ColumnTypeRegistry.
 */
export const DynamicCellEditor: React.FC<DynamicCellEditorProps> = ({
  overlay: propOverlay,
  rowData: propRowData,
  theme: propTheme,
  locale: propLocale,
  api: propApi,
  validationError: propValidationError,
  isValidating: propIsValidating,
  onCommit,
  onCancel,
}) => {
  const gridState = useGridState();
  const overlay = propOverlay ?? gridState?.activeOverlay;
  const theme = propTheme ?? gridState?.resolvedTheme;
  const locale = propLocale ?? gridState?.currentLocale;
  const validationError = propValidationError ?? gridState?.editorValidationError;
  const isValidating = propIsValidating ?? gridState?.isEditorValidating;
  const rowData = propRowData;
  const api = propApi;

  if (!overlay || !theme || !locale) {
    return null;
  }

  const EditorComponent = resolveEditorComponent(overlay.column);
  const isTR = locale.code.startsWith('tr');

  if (!EditorComponent) {
    return null;
  }

  return (
    <>
      <EditorComponent
        value={overlay.initialValue}
        rowData={rowData}
        row={rowData}
        rowIndex={overlay.row}
        columnIndex={overlay.col}
        column={overlay.column}
        theme={theme}
        locale={locale}
        rect={{
          x: overlay.x,
          y: overlay.y,
          width: overlay.width,
          height: overlay.height,
        }}
        initialChar={overlay.initialChar}
        onCommit={onCommit}
        onCancel={onCancel}
        api={api}
      />
      {(validationError || isValidating) && (
        <div
          style={{
            position: 'absolute',
            left: Math.max(4, overlay.x),
            top: overlay.y + overlay.height + 3,
            zIndex: 210,
            maxWidth: 320,
            padding: '5px 10px',
            borderRadius: 6,
            backgroundColor: isValidating ? '#0284C7' : '#DC2626',
            color: '#FFFFFF',
            fontSize: 11.5,
            fontWeight: 700,
            fontFamily: theme.fontFamily,
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            pointerEvents: 'none',
          }}
        >
          <span>{isValidating ? '⏳' : '⛔'}</span>
          <span>
            {isValidating
              ? isTR
                ? 'Kural doğrulanıyor (Async)...'
                : 'Validating rule (Async)...'
              : validationError}
          </span>
        </div>
      )}
    </>
  );
};
