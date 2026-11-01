import { describe, it, expect, beforeEach } from 'vitest';
import { LocalDataStore } from '../../src/datagrid/data/LocalDataStore';

describe('LocalDataStore', () => {
  let store: LocalDataStore;
  const initialData = [
    { id: 1, name: 'Product A', category: 'Tech', price: 100, stock: 5 },
    { id: 2, name: 'Product B', category: 'Home', price: 50, stock: 12 },
    { id: 3, name: 'Product C', category: 'Tech', price: 200, stock: 2 },
  ];

  beforeEach(() => {
    store = new LocalDataStore({
      data: initialData,
      keyField: 'id',
      batchMode: true,
    });
  });

  describe('Basic Data Handling', () => {
    it('should initialize and report correct row count', () => {
      expect(store.getRowCount()).toBe(3);
      expect(store.isRemote()).toBe(false);
      expect(store.getViewRow(0)?.data.name).toBe('Product A');
    });

    it('should find raw row by key', () => {
      const row = store.getRawRowByKey(2);
      expect(row?.name).toBe('Product B');
      expect(store.getRawRowByKey(999)).toBeUndefined();
    });
  });

  describe('Filtering and Searching', () => {
    it('should filter data rows according to FilterDescriptor', async () => {
      await store.setFilter(['category', '=', 'Tech']);
      expect(store.getRowCount()).toBe(2);
      expect(store.getViewRow(0)?.data.name).toBe('Product A');
      expect(store.getViewRow(1)?.data.name).toBe('Product C');

      // Clear filter
      await store.setFilter(null);
      expect(store.getRowCount()).toBe(3);
    });

    it('should filter rows by search keyword', async () => {
      await store.setSearch('Home');
      expect(store.getRowCount()).toBe(1);
      expect(store.getViewRow(0)?.data.name).toBe('Product B');

      await store.setSearch('');
      expect(store.getRowCount()).toBe(3);
    });
  });

  describe('Sorting', () => {
    it('should sort data rows ascending and descending', async () => {
      await store.setSorting([{ selector: 'price', desc: true }]);
      expect(store.getViewRow(0)?.data.price).toBe(200);
      expect(store.getViewRow(1)?.data.price).toBe(100);
      expect(store.getViewRow(2)?.data.price).toBe(50);
    });
  });

  describe('Batch Editing and Dirty Cell Tracking', () => {
    it('should track cell modifications and report hasPendingChanges() and getPendingChanges()', async () => {
      expect(store.hasPendingChanges()).toBe(false);

      await store.setCell(1, 'price', 150);
      expect(store.hasPendingChanges()).toBe(true);
      expect(store.isCellDirty(1, 'price')).toBe(true);
      expect(store.isCellDirty(1, 'name')).toBe(false);

      const changes = store.getPendingChanges();
      expect(changes.updated.length).toBe(1);
      expect(changes.updated[0].key).toBe(1);
      expect(changes.updated[0].values.price).toBe(150);
    });

    it('should revert cell to original value and clear dirty state if restored', async () => {
      await store.setCell(1, 'price', 150);
      expect(store.isCellDirty(1, 'price')).toBe(true);

      // Revert back to original value (100)
      await store.setCell(1, 'price', 100);
      expect(store.isCellDirty(1, 'price')).toBe(false);
      expect(store.hasPendingChanges()).toBe(false);
    });

    it('should discard all batch changes cleanly with discardBatchChanges()', async () => {
      await store.setCell(1, 'price', 999);
      await store.setCell(2, 'stock', 0);
      expect(store.hasPendingChanges()).toBe(true);

      store.discardBatchChanges();
      expect(store.hasPendingChanges()).toBe(false);
      expect(store.getRawRowByKey(1)?.price).toBe(100);
      expect(store.getRawRowByKey(2)?.stock).toBe(12);
    });

    it('should commit batch changes cleanly with saveBatchChanges() and clear dirty flags', async () => {
      await store.setCell(1, 'price', 999);
      expect(store.hasPendingChanges()).toBe(true);

      const saved = await store.saveBatchChanges();
      expect(saved.updated.length).toBe(1);
      expect(store.hasPendingChanges()).toBe(false);
      expect(store.getRawRowByKey(1)?.price).toBe(999);
      expect(store.isCellDirty(1, 'price')).toBe(false);
    });
  });

  describe('Row Insertion, Duplication and Deletion', () => {
    it('should insert new row and track in pending changes', async () => {
      const newRow = await store.insertRow({ name: 'Product D', category: 'Tech', price: 300 });
      expect(store.getRowCount()).toBe(4);
      expect(store.hasPendingChanges()).toBe(true);

      const changes = store.getPendingChanges();
      expect(changes.inserted.length).toBe(1);
      expect(changes.inserted[0].name).toBe('Product D');
    });

    it('should delete row and track in pending changes', async () => {
      await store.deleteRow(2);
      expect(store.getRowCount()).toBe(2);
      expect(store.hasPendingChanges()).toBe(true);

      const changes = store.getPendingChanges();
      expect(changes.deleted.length).toBe(1);
      expect(changes.deleted[0]).toBe(2);
    });

    it('should duplicate row accurately', async () => {
      const dup = await store.duplicateRow(1);
      expect(dup).not.toBeNull();
      expect(dup?.name).toBe('Product A');
      expect(dup?.id).not.toBe(1); // new unique id generated
      expect(store.getRowCount()).toBe(4);
    });
  });
});
