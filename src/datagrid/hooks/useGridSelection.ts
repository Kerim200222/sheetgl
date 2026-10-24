import { useRef, useState, useCallback } from 'react';
import { SelectionModel } from '../core/SelectionModel';
import { CellCoords, CellRange } from '../types/grid';
import { NormalizedCellRange } from '../core/GridApi';

export interface UseGridSelectionOptions {
  onRequestRender?: () => void;
  onEnsureCellVisible?: (row: number, col: number) => void;
  onSelectionChanged?: (range: NormalizedCellRange, activeCell: CellCoords) => void;
}

export interface UseGridSelectionReturn {
  /**
   * Mutable reference to the underlying SelectionModel for direct canvas pass-through.
   */
  selectionRef: React.MutableRefObject<SelectionModel>;
  /**
   * Version counter incremented on every selection change to trigger React re-renders.
   */
  selectionVersion: number;
  setSelectionVersion: React.Dispatch<React.SetStateAction<number>>;
  selectedCellUI: CellCoords;
  setSelectedCellUI: React.Dispatch<React.SetStateAction<CellCoords>>;
  /**
   * Whether the user is actively dragging across data cells.
   */
  isDraggingSelection: boolean;
  setIsDraggingSelection: React.Dispatch<React.SetStateAction<boolean>>;
  /**
   * Whether the user is actively dragging down the row number gutter.
   */
  isDraggingRowNumbers: boolean;
  setIsDraggingRowNumbers: React.Dispatch<React.SetStateAction<boolean>>;

  // Selection actions
  selectCell: (row: number, col: number) => void;
  selectRange: (startRow: number, startCol: number, endRow: number, endCol: number) => void;
  setRangeEnd: (row: number, col: number) => void;
  selectAll: (rowCount: number, colCount: number) => void;
  selectFullRow: (rowIndex: number, colCount: number, isRangeSelect?: boolean) => void;
  moveSelection: (
    dRow: number,
    dCol: number,
    isRangeSelect?: boolean,
    rowCount?: number,
    colCount?: number
  ) => void;
  clearSelection: () => void;
  stopDragging: () => void;

  // Query getters
  getActiveCell: () => CellCoords;
  getSelectedRange: () => NormalizedCellRange;
}

export function useGridSelection({
  onRequestRender,
  onEnsureCellVisible,
  onSelectionChanged,
}: UseGridSelectionOptions = {}): UseGridSelectionReturn {
  const selectionRef = useRef<SelectionModel>(new SelectionModel());
  const [selectionVersion, setSelectionVersion] = useState<number>(0);
  const [selectedCellUI, setSelectedCellUI] = useState<CellCoords>({ row: 0, col: 0 });
  const [isDraggingSelection, setIsDraggingSelection] = useState<boolean>(false);
  const [isDraggingRowNumbers, setIsDraggingRowNumbers] = useState<boolean>(false);

  const notifyChange = useCallback(() => {
    setSelectionVersion((v) => v + 1);
    onRequestRender?.();

    if (onSelectionChanged) {
      const model = selectionRef.current;
      onSelectionChanged(model.getNormalizedRange(), model.activeCell);
    }
  }, [onRequestRender, onSelectionChanged]);

  const selectCell = useCallback(
    (row: number, col: number) => {
      selectionRef.current.setActiveCell(row, col);
      setSelectedCellUI({ row, col });
      notifyChange();
    },
    [notifyChange]
  );

  const selectRange = useCallback(
    (startRow: number, startCol: number, endRow: number, endCol: number) => {
      const model = selectionRef.current;
      model.setActiveCell(startRow, startCol);
      model.setRangeEnd(endRow, endCol);
      setSelectedCellUI({ row: startRow, col: startCol });
      notifyChange();
    },
    [notifyChange]
  );

  const setRangeEnd = useCallback(
    (row: number, col: number) => {
      selectionRef.current.setRangeEnd(row, col);
      notifyChange();
    },
    [notifyChange]
  );

  const selectAll = useCallback(
    (rowCount: number, colCount: number) => {
      if (rowCount <= 0 || colCount <= 0) return;
      selectionRef.current.setActiveCell(0, 0);
      selectionRef.current.setRangeEnd(rowCount - 1, colCount - 1);
      setSelectedCellUI({ row: 0, col: 0 });
      notifyChange();
    },
    [notifyChange]
  );

  const selectFullRow = useCallback(
    (rowIndex: number, colCount: number, isRangeSelect: boolean = false) => {
      if (colCount <= 0) return;
      if (isRangeSelect) {
        selectionRef.current.setRangeEnd(rowIndex, colCount - 1);
      } else {
        selectionRef.current.setActiveCell(rowIndex, 0);
        selectionRef.current.setRangeEnd(rowIndex, colCount - 1);
        setSelectedCellUI({ row: rowIndex, col: 0 });
      }
      setIsDraggingRowNumbers(true);
      notifyChange();
    },
    [notifyChange]
  );

  const moveSelection = useCallback(
    (
      dRow: number,
      dCol: number,
      isRangeSelect: boolean = false,
      rowCount: number = 0,
      colCount: number = 0
    ) => {
      if (rowCount === 0 || colCount === 0) return;

      const model = selectionRef.current;
      const cur = isRangeSelect && model.selectionRange
        ? {
            row: model.selectionRange.endRow,
            col: model.selectionRange.endCol,
          }
        : model.activeCell;

      const nextRow = Math.max(0, Math.min(rowCount - 1, cur.row + dRow));
      const nextCol = Math.max(0, Math.min(colCount - 1, cur.col + dCol));

      if (isRangeSelect) {
        model.setRangeEnd(nextRow, nextCol);
      } else {
        model.setActiveCell(nextRow, nextCol);
        setSelectedCellUI({ row: nextRow, col: nextCol });
      }

      setSelectionVersion((v) => v + 1);
      onEnsureCellVisible?.(nextRow, nextCol);
      onRequestRender?.();
    },
    [onEnsureCellVisible, onRequestRender]
  );

  const clearSelection = useCallback(() => {
    selectCell(0, 0);
  }, [selectCell]);

  const stopDragging = useCallback(() => {
    setIsDraggingSelection(false);
    setIsDraggingRowNumbers(false);
  }, []);

  const getActiveCell = useCallback((): CellCoords => {
    return selectionRef.current.activeCell;
  }, []);

  const getSelectedRange = useCallback((): NormalizedCellRange => {
    return selectionRef.current.getNormalizedRange();
  }, []);

  return {
    selectionRef,
    selectionVersion,
    setSelectionVersion,
    selectedCellUI,
    setSelectedCellUI,
    isDraggingSelection,
    setIsDraggingSelection,
    isDraggingRowNumbers,
    setIsDraggingRowNumbers,
    selectCell,
    selectRange,
    setRangeEnd,
    selectAll,
    selectFullRow,
    moveSelection,
    clearSelection,
    stopDragging,
    getActiveCell,
    getSelectedRange,
  };
}
