import { describe, it, expect, beforeEach } from 'vitest';
import { SelectionModel } from '../../src/datagrid/core/SelectionModel';

describe('SelectionModel', () => {
  let model: SelectionModel;

  beforeEach(() => {
    model = new SelectionModel();
  });

  it('should initialize with default active cell at (0, 0)', () => {
    expect(model.activeCell).toEqual({ row: 0, col: 0 });
    expect(model.selectionRange).toBeNull();
    expect(model.isSelecting).toBe(false);
  });

  it('should set active cell and single cell selection range', () => {
    model.setActiveCell(2, 3);
    expect(model.activeCell).toEqual({ row: 2, col: 3 });
    expect(model.selectionRange).toEqual({
      startRow: 2,
      startCol: 3,
      endRow: 2,
      endCol: 3,
    });
    expect(model.hasMultiCellSelection()).toBe(false);
  });

  it('should normalize forward selection (top-left to bottom-right)', () => {
    model.setActiveCell(1, 2);
    model.setRangeEnd(5, 6);
    expect(model.getNormalizedRange()).toEqual({
      minRow: 1,
      maxRow: 5,
      minCol: 2,
      maxCol: 6,
    });
    expect(model.hasMultiCellSelection()).toBe(true);
  });

  it('should normalize inverted selection (drag bottom-right to top-left)', () => {
    model.setActiveCell(8, 7);
    model.setRangeEnd(3, 2);
    expect(model.getNormalizedRange()).toEqual({
      minRow: 3,
      maxRow: 8,
      minCol: 2,
      maxCol: 7,
    });
    expect(model.hasMultiCellSelection()).toBe(true);
  });

  it('should accurately test isCellSelected', () => {
    model.setActiveCell(2, 2);
    model.setRangeEnd(4, 5);

    expect(model.isCellSelected(2, 2)).toBe(true);
    expect(model.isCellSelected(3, 4)).toBe(true);
    expect(model.isCellSelected(4, 5)).toBe(true);

    expect(model.isCellSelected(1, 2)).toBe(false); // row above
    expect(model.isCellSelected(5, 2)).toBe(false); // row below
    expect(model.isCellSelected(3, 1)).toBe(false); // col left
    expect(model.isCellSelected(3, 6)).toBe(false); // col right
  });
});
