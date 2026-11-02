import { describe, it, expect, beforeAll } from 'vitest';
import { ColumnTypeRegistry } from '../../src/datagrid/columns/ColumnTypeRegistry';
import { initDefaultColumnPlugins } from '../../src/datagrid/columns/initPlugins';
import { IColumnTypePlugin } from '../../src/datagrid/columns/IColumnTypePlugin';

describe('ColumnTypeRegistry & Plugin System', () => {
  beforeAll(() => {
    initDefaultColumnPlugins();
  });

  describe('Default Column Plugins Initialization', () => {
    it('should initialize and register all core column plugins', () => {
      const coreTypes = [
        'text',
        'number',
        'currency',
        'percent',
        'boolean',
        'select',
        'dropdown',
        'multiselect',
        'lookup',
        'object',
        'date',
        'datetime',
        'time',
        'email',
        'url',
        'phone',
        'color',
        'rating',
        'progress',
        'sparkline',
        'action',
        'pdf',
      ];

      for (const type of coreTypes) {
        expect(ColumnTypeRegistry.has(type), `Expected plugin '${type}' to be registered`).toBe(true);
        const plugin = ColumnTypeRegistry.get(type);
        expect(plugin).toBeDefined();
        expect(plugin.type.toLowerCase()).toBe(type);
      }
    });

    it('should be idempotent and safe to call multiple times', () => {
      const initialCount = ColumnTypeRegistry.getAll().length;
      initDefaultColumnPlugins();
      initDefaultColumnPlugins();
      expect(ColumnTypeRegistry.getAll().length).toBe(initialCount);
    });
  });

  describe('Lookup and Case-Insensitivity', () => {
    it('should perform case-insensitive plugin lookup', () => {
      expect(ColumnTypeRegistry.has('Currency')).toBe(true);
      expect(ColumnTypeRegistry.has('CURRENCY')).toBe(true);
      expect(ColumnTypeRegistry.has('currency')).toBe(true);

      const pluginLower = ColumnTypeRegistry.get('currency');
      const pluginUpper = ColumnTypeRegistry.get('CURRENCY');
      const pluginMixed = ColumnTypeRegistry.get('Currency');

      expect(pluginLower).toBe(pluginUpper);
      expect(pluginLower).toBe(pluginMixed);
    });

    it('should fallback to text plugin when type is unknown or not registered', () => {
      expect(ColumnTypeRegistry.has('non-existent-plugin')).toBe(false);
      const fallbackPlugin = ColumnTypeRegistry.get('non-existent-plugin');
      const textPlugin = ColumnTypeRegistry.get('text');

      expect(fallbackPlugin).toBeDefined();
      expect(fallbackPlugin).toBe(textPlugin);
      expect(fallbackPlugin.type).toBe('text');
    });

    it('should fallback to text plugin when type is empty string', () => {
      const fallbackPlugin = ColumnTypeRegistry.get('');
      const textPlugin = ColumnTypeRegistry.get('text');

      expect(fallbackPlugin).toBe(textPlugin);
    });
  });

  describe('Custom Plugin Registration', () => {
    it('should register a custom column plugin and allow retrieval', () => {
      const mockCustomPlugin: IColumnTypePlugin = {
        type: 'barcode',
        editor: () => null,
      };

      ColumnTypeRegistry.register(mockCustomPlugin);

      expect(ColumnTypeRegistry.has('barcode')).toBe(true);
      expect(ColumnTypeRegistry.has('BARCODE')).toBe(true);
      expect(ColumnTypeRegistry.get('barcode')).toBe(mockCustomPlugin);
      expect(ColumnTypeRegistry.get('BARCODE')).toBe(mockCustomPlugin);
    });

    it('should include custom plugins in getAll() without duplicates', () => {
      const allPlugins = ColumnTypeRegistry.getAll();
      const types = allPlugins.map((p) => p.type.toLowerCase());

      expect(types).toContain('barcode');
      // Ensure unique instances
      const uniqueInstances = new Set(allPlugins);
      expect(uniqueInstances.size).toBe(allPlugins.length);
    });
  });
});
