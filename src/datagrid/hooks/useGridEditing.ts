import { useState, useCallback, useRef } from 'react';
import { ActiveOverlayState, ColumnDef } from '../types/grid';
import { CellCommitDirection } from '../editing/ICellEditor';

export interface UseGridEditingOptions {
  /**
   * Callback invoked before editing begins. Returning `false` prevents editing from starting.
   */
  onBeforeStartEditing?: (col: number, row: number, initialValue: any) => boolean | void;

  /**
   * Callback invoked when a cell value is successfully committed.
   */
  onCommit?: (
    newValue: any,
    row: number,
    col: number,
    moveDir?: CellCommitDirection,
    column?: ColumnDef
  ) => void;

  /**
   * Callback invoked when editing is cancelled.
   */
  onCancel?: (row: number, col: number) => void;

  /**
   * Trigger grid canvas redraw.
   */
  onRequestRender?: () => void;
}

export interface StartEditingOptions {
  initialChar?: string;
  rect?: { x: number; y: number; width: number; height: number };
  column?: ColumnDef;
}

export interface UseGridEditingReturn {
  /**
   * Currently active editing cell overlay descriptor, or null if no cell is being edited.
   */
  editingCell: ActiveOverlayState | null;

  /**
   * Direct setter for the active overlay state.
   */
  setEditingCell: React.Dispatch<React.SetStateAction<ActiveOverlayState | null>>;

  /**
   * Boolean flag indicating whether a cell is currently in edit mode.
   */
  isEditing: boolean;

  /**
   * Validation error message if cell validation failed.
   */
  validationError: string | null;

  /**
   * Set or clear the current validation error message.
   */
  setValidationError: React.Dispatch<React.SetStateAction<string | null>>;

  /**
   * Whether async validation is actively running for this cell.
   */
  isValidating: boolean;

  /**
   * Set the async validation indicator state.
   */
  setIsValidating: React.Dispatch<React.SetStateAction<boolean>>;

  /**
   * Starts editing a cell at the specified coordinates.
   */
  startEditingCell: (
    col: number,
    row: number,
    initialValue?: any,
    initialCharOrOptions?: string | StartEditingOptions,
    rect?: { x: number; y: number; width: number; height: number },
    column?: ColumnDef
  ) => void;

  /**
   * Stops editing the active cell, either committing or cancelling.
   */
  stopEditingCell: (cancel?: boolean, moveDir?: CellCommitDirection) => void;

  /**
   * Explicitly commits the new value and exits edit mode.
   */
  commitEditing: (newValue: any, moveDir?: CellCommitDirection) => void;

  /**
   * Explicitly cancels editing and discards any uncommitted changes.
   */
  cancelEditing: () => void;
}

/**
 * Hook to manage grid cell editing lifecycle, keyboard navigation commit, and validation states.
 */
export function useGridEditing(options: UseGridEditingOptions = {}): UseGridEditingReturn {
  const { onBeforeStartEditing, onCommit, onCancel, onRequestRender } = options;

  const [editingCell, setEditingCell] = useState<ActiveOverlayState | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  // Keep callback references stable to prevent stale closures in event listeners
  const callbacksRef = useRef({ onBeforeStartEditing, onCommit, onCancel, onRequestRender });
  callbacksRef.current = { onBeforeStartEditing, onCommit, onCancel, onRequestRender };

  const startEditingCell = useCallback(
    (
      col: number,
      row: number,
      initialValue?: any,
      initialCharOrOptions?: string | StartEditingOptions,
      rect?: { x: number; y: number; width: number; height: number },
      column?: ColumnDef
    ) => {
      let initialChar: string | undefined;
      let finalRect = rect;
      let finalColumn = column;

      if (typeof initialCharOrOptions === 'string') {
        initialChar = initialCharOrOptions;
      } else if (initialCharOrOptions && typeof initialCharOrOptions === 'object') {
        initialChar = initialCharOrOptions.initialChar;
        finalRect = initialCharOrOptions.rect ?? finalRect;
        finalColumn = initialCharOrOptions.column ?? finalColumn;
      }

      // Check if start is prevented by handler
      if (callbacksRef.current.onBeforeStartEditing) {
        const allowed = callbacksRef.current.onBeforeStartEditing(col, row, initialValue);
        if (allowed === false) {
          return;
        }
      }

      setValidationError(null);
      setIsValidating(false);

      const overlay: ActiveOverlayState = {
        row,
        col,
        x: finalRect?.x ?? 0,
        y: finalRect?.y ?? 0,
        width: finalRect?.width ?? 100,
        height: finalRect?.height ?? 28,
        column: finalColumn ?? { id: String(col), title: '', type: 'text', width: 100 },
        initialValue: initialValue ?? '',
        initialChar,
      };

      setEditingCell(overlay);
      callbacksRef.current.onRequestRender?.();
    },
    []
  );

  const stopEditingCell = useCallback(
    (cancel = false, moveDir?: CellCommitDirection) => {
      setEditingCell((prev) => {
        if (!prev) return null;

        if (cancel) {
          callbacksRef.current.onCancel?.(prev.row, prev.col);
        } else {
          callbacksRef.current.onCommit?.(
            prev.initialValue,
            prev.row,
            prev.col,
            moveDir,
            prev.column
          );
        }

        return null;
      });

      setValidationError(null);
      setIsValidating(false);
      callbacksRef.current.onRequestRender?.();
    },
    []
  );

  const commitEditing = useCallback(
    (newValue: any, moveDir?: CellCommitDirection) => {
      setEditingCell((prev) => {
        if (!prev) return null;
        callbacksRef.current.onCommit?.(newValue, prev.row, prev.col, moveDir, prev.column);
        return null;
      });

      setValidationError(null);
      setIsValidating(false);
      callbacksRef.current.onRequestRender?.();
    },
    []
  );

  const cancelEditing = useCallback(() => {
    stopEditingCell(true);
  }, [stopEditingCell]);

  return {
    editingCell,
    setEditingCell,
    isEditing: editingCell !== null,
    validationError,
    setValidationError,
    isValidating,
    setIsValidating,
    startEditingCell,
    stopEditingCell,
    commitEditing,
    cancelEditing,
  };
}
