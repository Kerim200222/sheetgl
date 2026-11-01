import { describe, it, expect, beforeEach } from 'vitest';
import { GeometryEngine } from '../../src/datagrid/core/GeometryEngine';
import { SelectionModel } from '../../src/datagrid/core/SelectionModel';
import { ColumnDef } from '../../src/datagrid/types/grid';

describe('GeometryEngine', () => {
  let sampleColumns: ColumnDef[];
  let engine: GeometryEngine;

  beforeEach(() => {
    sampleColumns = [
      { id: 'col_id', field: 'id', title: 'ID', width: 60, pinned: true },
      { id: 'col_name', field: 'name', title: 'Name', width: 120 },
      { id: 'col_email', field: 'email', title: 'Email', width: 180 },
      { id: 'col_age', field: 'age', title: 'Age', width: 80 },
      { id: 'col_hidden', field: 'secret', title: 'Secret', width: 100, visible: false },
    ];
    engine = new GeometryEngine(sampleColumns, 34, 38);
  });

  describe('Initialization and Layout Geometry', () => {
    it('should filter out invisible columns and separate frozen vs scrollable', () => {
      expect(engine.columns.length).toBe(4);
      expect(engine.frozenColumns.length).toBe(1);
      expect(engine.scrollableColumns.length).toBe(3);
      expect(engine.frozenColumns[0].id).toBe('col_id');
      expect(engine.scrollableColumns.map((c) => c.id)).toEqual(['col_name', 'col_email', 'col_age']);
    });

    it('should correctly calculate totalFrozenWidth and totalScrollableWidth', () => {
      // rowNumberWidth is 54, frozen column width is 60 -> 114
      expect(engine.totalFrozenWidth).toBe(54 + 60);
      // scrollable: 120 + 180 + 80 = 380
      expect(engine.totalScrollableWidth).toBe(380);
    });

    it('should precompute prefix sums in Float32Array scrollableColOffsets', () => {
      // offsets: [0, 120, 300, 380]
      expect(engine.scrollableColOffsets.length).toBe(4);
      expect(engine.scrollableColOffsets[0]).toBe(0);
      expect(engine.scrollableColOffsets[1]).toBe(120);
      expect(engine.scrollableColOffsets[2]).toBe(300);
      expect(engine.scrollableColOffsets[3]).toBe(380);
    });
  });

  describe('findScrollableColIndexAtX (Binary Search)', () => {
    it('should locate column index via O(log N) binary search correctly', () => {
      // col 0: [0, 120)
      expect(engine.findScrollableColIndexAtX(0)).toBe(0);
      expect(engine.findScrollableColIndexAtX(50)).toBe(0);
      expect(engine.findScrollableColIndexAtX(119)).toBe(0);

      // col 1: [120, 300)
      expect(engine.findScrollableColIndexAtX(120)).toBe(1);
      expect(engine.findScrollableColIndexAtX(250)).toBe(1);
      expect(engine.findScrollableColIndexAtX(299)).toBe(1);

      // col 2: [300, 380)
      expect(engine.findScrollableColIndexAtX(300)).toBe(2);
      expect(engine.findScrollableColIndexAtX(379)).toBe(2);
    });

    it('should clamp bounds for coordinates outside scrollable width', () => {
      expect(engine.findScrollableColIndexAtX(-10)).toBe(0);
      expect(engine.findScrollableColIndexAtX(500)).toBe(2);
    });
  });

  describe('getColumnScreenRect', () => {
    it('should return fixed screen coordinates for frozen columns', () => {
      const rect = engine.getColumnScreenRect(0, 100);
      expect(rect.isFrozen).toBe(true);
      expect(rect.x).toBe(54); // starts at rowNumberWidth
      expect(rect.width).toBe(60);
    });

    it('should factor in scrollLeft for scrollable columns', () => {
      // Col 1 is the first scrollable column (index 0 in scrollable)
      // totalFrozenWidth = 114
      // scrollableColOffsets[0] = 0
      // With scrollLeft = 40: x = 114 + 0 - 40 = 74
      const rect = engine.getColumnScreenRect(1, 40);
      expect(rect.isFrozen).toBe(false);
      expect(rect.x).toBe(74);
      expect(rect.width).toBe(120);
    });

    it('should return zero rect for invalid column index', () => {
      const rect = engine.getColumnScreenRect(99, 0);
      expect(rect).toEqual({ x: 0, width: 0, isFrozen: false });
    });
  });

  describe('hitTestHeader', () => {
    it('should return null when clicking row number header or out of vertical bounds', () => {
      expect(engine.hitTestHeader(20, 20, 0)).toBeNull(); // X <= rowNumberWidth
      expect(engine.hitTestHeader(80, 50, 0)).toBeNull(); // Y > headerHeight
      expect(engine.hitTestHeader(80, -5, 0)).toBeNull(); // Y < 0
    });

    it('should identify clicks on frozen column header', () => {
      // Frozen col is from x=54 to x=114
      const hit = engine.hitTestHeader(80, 20, 0);
      expect(hit).not.toBeNull();
      expect(hit?.colIndex).toBe(0);
      expect(hit?.column.id).toBe('col_id');
      expect(hit?.headerX).toBe(54);
      expect(hit?.headerWidth).toBe(60);
      expect(hit?.isFilterIconHit).toBe(false);
    });

    it('should detect filter icon hit when clicking near the right edge of a filterable header', () => {
      // Frozen col width = 60, headerX = 54 -> right edge = 114
      // Filter icon hit region: headerX + headerW - 28 = 54 + 60 - 28 = 86 to 112
      const hit = engine.hitTestHeader(95, 20, 0);
      expect(hit).not.toBeNull();
      expect(hit?.isFilterIconHit).toBe(true);
    });

    it('should detect clicks on scrollable header with scrollLeft', () => {
      // Col 1 (name): width 120. Screen range at scrollLeft=0: 114 to 234
      const hit = engine.hitTestHeader(150, 15, 0);
      expect(hit).not.toBeNull();
      expect(hit?.colIndex).toBe(1);
      expect(hit?.column.id).toBe('col_name');
    });
  });

  describe('hitTestRowNumber', () => {
    it('should calculate row index correctly including scrollTop', () => {
      // rowHeight = 34, headerHeight = 38
      // canvasX = 20 (within 0..54)
      // canvasY = 38 + 34 * 2 + 10 = 116 -> Row 2 with scrollTop=0
      expect(engine.hitTestRowNumber(20, 116, 0, 10)).toBe(2);

      // With scrollTop = 34: virtualY = (116 - 38 + 34) = 112 -> Row 3
      expect(engine.hitTestRowNumber(20, 116, 34, 10)).toBe(3);
    });

    it('should return null if canvasX > rowNumberWidth or row exceeds rowCount', () => {
      expect(engine.hitTestRowNumber(60, 116, 0, 10)).toBeNull();
      expect(engine.hitTestRowNumber(20, 1000, 0, 5)).toBeNull();
    });
  });

  describe('hitTest', () => {
    it('should return null when clicking in header or row number zones', () => {
      expect(engine.hitTest(20, 50, 0, 0, 10)).toBeNull(); // row number
      expect(engine.hitTest(80, 20, 0, 0, 10)).toBeNull(); // header
    });

    it('should hit cell in frozen column correctly', () => {
      // Frozen col 0: x in [54, 114). Row 1: y in [38 + 34, 38 + 68) = [72, 106)
      const hit = engine.hitTest(70, 80, 0, 0, 10);
      expect(hit).not.toBeNull();
      expect(hit?.row).toBe(1);
      expect(hit?.col).toBe(0);
      expect(hit?.isFrozen).toBe(true);
      expect(hit?.cellRect).toEqual({ x: 54, y: 72, width: 60, height: 34 });
    });

    it('should hit cell in scrollable column correctly', () => {
      // Scrollable col 0 (colIndex 1): screen x = 114 to 234. Row 0: y in [38, 72)
      const hit = engine.hitTest(150, 50, 0, 0, 10);
      expect(hit).not.toBeNull();
      expect(hit?.row).toBe(0);
      expect(hit?.col).toBe(1);
      expect(hit?.isFrozen).toBe(false);
      expect(hit?.cellRect).toEqual({ x: 114, y: 38, width: 120, height: 34 });
    });
  });

  describe('hitTestFillHandle', () => {
    it('should detect bottom-right corner fill handle of active selection', () => {
      const selection = new SelectionModel();
      selection.setActiveCell(1, 1); // Row 1, Col 1 (name)
      // Col 1: x = 114, width = 120 -> right edge = 234
      // Row 1: y = 38 + 34 = 72, height = 34 -> bottom edge = 106
      const result = engine.hitTestFillHandle(234, 106, 0, 0, selection);
      expect(result).toBe('corner');
    });

    it('should detect right-edge duplicate handle', () => {
      const selection = new SelectionModel();
      selection.setActiveCell(1, 1);
      // Center Y of row 1 = 72 + 17 = 89
      const result = engine.hitTestFillHandle(234, 89, 0, 0, selection);
      expect(result).toBe('right-duplicate');
    });
  });

  describe('hitTestColumnResize', () => {
    it('should detect frozen column border resize within tolerance', () => {
      // Frozen col border at 54 + 60 = 114
      const result = engine.hitTestColumnResize(115, 20, 0);
      expect(result).toEqual({ colIndex: 0, isFrozen: true });
    });

    it('should detect scrollable column border resize', () => {
      // First scrollable col right border: 114 + 120 = 234
      const result = engine.hitTestColumnResize(235, 20, 0);
      expect(result).toEqual({ colIndex: 1, isFrozen: false });
    });
  });
});
