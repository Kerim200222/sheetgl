import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HistoryManager, GridCommand } from '../../src/datagrid/core/HistoryManager';

describe('HistoryManager (Undo / Redo Engine)', () => {
  let history: HistoryManager;

  beforeEach(() => {
    history = new HistoryManager(3); // Small limit for testing eviction
  });

  describe('Basic Push and State Inspection', () => {
    it('should initialize with empty undo and redo stacks', () => {
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);
      expect(history.undo()).toBe(false);
      expect(history.redo()).toBe(false);
    });

    it('should allow undo after pushing a command', () => {
      const cmd: GridCommand = {
        description: 'Edit cell A1',
        undo: vi.fn(),
        redo: vi.fn(),
      };

      history.push(cmd);

      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(false);
    });
  });

  describe('Undo and Redo Execution', () => {
    it('should execute command.undo and transition command to redo stack', () => {
      const undoFn = vi.fn();
      const redoFn = vi.fn();
      const cmd: GridCommand = { undo: undoFn, redo: redoFn };

      history.push(cmd);
      const undoResult = history.undo();

      expect(undoResult).toBe(true);
      expect(undoFn).toHaveBeenCalledTimes(1);
      expect(redoFn).not.toHaveBeenCalled();
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(true);
    });

    it('should execute command.redo and transition command back to undo stack', () => {
      const undoFn = vi.fn();
      const redoFn = vi.fn();
      const cmd: GridCommand = { undo: undoFn, redo: redoFn };

      history.push(cmd);
      history.undo();

      const redoResult = history.redo();

      expect(redoResult).toBe(true);
      expect(redoFn).toHaveBeenCalledTimes(1);
      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(false);
    });

    it('should clear redo stack when a new command is pushed', () => {
      const cmd1: GridCommand = { undo: vi.fn(), redo: vi.fn() };
      const cmd2: GridCommand = { undo: vi.fn(), redo: vi.fn() };

      history.push(cmd1);
      history.undo();
      expect(history.canRedo()).toBe(true);

      // Pushing a new command invalidates redo history
      history.push(cmd2);
      expect(history.canRedo()).toBe(false);
      expect(history.canUndo()).toBe(true);
    });
  });

  describe('Stack Size Limit and FIFO Eviction', () => {
    it('should evict the oldest command when exceeding maxHistory', () => {
      const cmd1: GridCommand = { description: '1', undo: vi.fn(), redo: vi.fn() };
      const cmd2: GridCommand = { description: '2', undo: vi.fn(), redo: vi.fn() };
      const cmd3: GridCommand = { description: '3', undo: vi.fn(), redo: vi.fn() };
      const cmd4: GridCommand = { description: '4', undo: vi.fn(), redo: vi.fn() };

      history.push(cmd1);
      history.push(cmd2);
      history.push(cmd3);
      history.push(cmd4); // Exceeds limit of 3, cmd1 should be dropped

      // Undo 3 times
      expect(history.undo()).toBe(true);
      expect(cmd4.undo).toHaveBeenCalled();

      expect(history.undo()).toBe(true);
      expect(cmd3.undo).toHaveBeenCalled();

      expect(history.undo()).toBe(true);
      expect(cmd2.undo).toHaveBeenCalled();

      // 4th undo should fail because cmd1 was evicted
      expect(history.undo()).toBe(false);
      expect(cmd1.undo).not.toHaveBeenCalled();
    });
  });

  describe('Stack Reset on clear()', () => {
    it('should reset both undo and redo stacks completely', () => {
      const cmd: GridCommand = { undo: vi.fn(), redo: vi.fn() };

      history.push(cmd);
      history.undo();
      expect(history.canRedo()).toBe(true);

      history.clear();

      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);
      expect(history.undo()).toBe(false);
      expect(history.redo()).toBe(false);
    });
  });
});
