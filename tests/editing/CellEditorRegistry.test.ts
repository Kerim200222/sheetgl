import { describe, it, expect, beforeEach } from 'vitest';
import { CellEditorRegistry } from '../../src/datagrid/editing/CellEditorRegistry';
import { DefaultCellEditor } from '../../src/datagrid/editing/DefaultCellEditor';
import React from 'react';

// Mock custom editor component
const MockCustomEditor: React.FC<any> = () => null;
const MockAnotherEditor: React.FC<any> = () => null;

describe('CellEditorRegistry', () => {
  beforeEach(() => {
    CellEditorRegistry.clear();
  });

  describe('Registration and Retrieval', () => {
    it('should register and retrieve a custom editor component', () => {
      CellEditorRegistry.register('color-picker', MockCustomEditor);

      expect(CellEditorRegistry.has('color-picker')).toBe(true);
      expect(CellEditorRegistry.get('color-picker')).toBe(MockCustomEditor);
    });

    it('should handle case-insensitive type lookups', () => {
      CellEditorRegistry.register('DateTime', MockCustomEditor);

      expect(CellEditorRegistry.has('datetime')).toBe(true);
      expect(CellEditorRegistry.has('DATETIME')).toBe(true);
      expect(CellEditorRegistry.has('DateTime')).toBe(true);
      expect(CellEditorRegistry.get('datetime')).toBe(MockCustomEditor);
      expect(CellEditorRegistry.get('DATETIME')).toBe(MockCustomEditor);
    });

    it('should ignore invalid registration with empty type or missing component', () => {
      CellEditorRegistry.register('', MockCustomEditor);
      CellEditorRegistry.register('invalid', null as any);

      expect(CellEditorRegistry.has('')).toBe(false);
      expect(CellEditorRegistry.has('invalid')).toBe(false);
      expect(CellEditorRegistry.get('invalid')).toBe(DefaultCellEditor);
    });
  });

  describe('Fallback to Default Editor', () => {
    it('should fallback to DefaultCellEditor when type is not registered', () => {
      expect(CellEditorRegistry.has('non-existent-type')).toBe(false);
      expect(CellEditorRegistry.get('non-existent-type')).toBe(DefaultCellEditor);
    });

    it('should fallback to DefaultCellEditor when type is undefined or empty', () => {
      expect(CellEditorRegistry.get(undefined)).toBe(DefaultCellEditor);
      expect(CellEditorRegistry.get('')).toBe(DefaultCellEditor);
    });

    it('should support customizing the default fallback editor', () => {
      CellEditorRegistry.setDefaultEditor(MockCustomEditor);

      expect(CellEditorRegistry.getDefaultEditor()).toBe(MockCustomEditor);
      expect(CellEditorRegistry.get('unregistered')).toBe(MockCustomEditor);
    });

    it('should reset to DefaultCellEditor if null or undefined passed to setDefaultEditor', () => {
      CellEditorRegistry.setDefaultEditor(MockCustomEditor);
      expect(CellEditorRegistry.getDefaultEditor()).toBe(MockCustomEditor);

      CellEditorRegistry.setDefaultEditor(null as any);
      expect(CellEditorRegistry.getDefaultEditor()).toBe(DefaultCellEditor);
    });
  });

  describe('Unregistration', () => {
    it('should unregister an existing editor and return true', () => {
      CellEditorRegistry.register('custom-select', MockCustomEditor);
      expect(CellEditorRegistry.has('custom-select')).toBe(true);

      const result = CellEditorRegistry.unregister('custom-select');

      expect(result).toBe(true);
      expect(CellEditorRegistry.has('custom-select')).toBe(false);
      expect(CellEditorRegistry.get('custom-select')).toBe(DefaultCellEditor);
    });

    it('should unregister case-insensitively', () => {
      CellEditorRegistry.register('MyEditor', MockCustomEditor);

      const result = CellEditorRegistry.unregister('myeditor');

      expect(result).toBe(true);
      expect(CellEditorRegistry.has('MyEditor')).toBe(false);
      expect(CellEditorRegistry.has('myeditor')).toBe(false);
    });

    it('should return false when trying to unregister non-existent or empty type', () => {
      expect(CellEditorRegistry.unregister('ghost-type')).toBe(false);
      expect(CellEditorRegistry.unregister('')).toBe(false);
    });
  });

  describe('Registry State Inspection and Reset', () => {
    it('should return all registered editor type keys', () => {
      CellEditorRegistry.register('alpha', MockCustomEditor);
      CellEditorRegistry.register('beta', MockAnotherEditor);

      const types = CellEditorRegistry.getRegisteredTypes();
      expect(types).toContain('alpha');
      expect(types).toContain('beta');
    });

    it('should clear all registered editors and reset default editor on clear()', () => {
      CellEditorRegistry.register('temp', MockCustomEditor);
      CellEditorRegistry.setDefaultEditor(MockAnotherEditor);

      CellEditorRegistry.clear();

      expect(CellEditorRegistry.getRegisteredTypes().length).toBe(0);
      expect(CellEditorRegistry.has('temp')).toBe(false);
      expect(CellEditorRegistry.getDefaultEditor()).toBe(DefaultCellEditor);
      expect(CellEditorRegistry.get('temp')).toBe(DefaultCellEditor);
    });
  });
});
