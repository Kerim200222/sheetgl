import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RemoteDataStore } from '../../src/datagrid/data/RemoteDataStore';
import { DataGridQuery, LoadResult, BatchChanges } from '../../src/datagrid/types/store';

describe('RemoteDataStore (Server-Side Row Model)', () => {
  const mockDataset = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    role: i % 2 === 0 ? 'Admin' : 'Member',
    score: (i + 1) * 10,
  }));

  let customLoadMock: (query: DataGridQuery) => Promise<LoadResult>;

  beforeEach(() => {
    customLoadMock = vi.fn().mockImplementation(async (query: DataGridQuery): Promise<LoadResult> => {
      let filtered = [...mockDataset];
      if (query.search) {
        filtered = filtered.filter((item) =>
          item.name.toLowerCase().includes(query.search!.toLowerCase())
        );
      }
      if (query.filter && Array.isArray(query.filter)) {
        const [field, , val] = query.filter as [string, string, any];
        filtered = filtered.filter((item: any) => item[field] === val);
      }

      const skip = query.skip || 0;
      const take = query.take || 10;
      const data = filtered.slice(skip, skip + take);

      return {
        data,
        totalCount: filtered.length,
      };
    });
  });

  describe('Initialization and Basic Metadata', () => {
    it('should configure keyField and identify as remote store', () => {
      const store = new RemoteDataStore({
        keyField: 'customId',
        load: customLoadMock,
        blockSize: 10,
      });

      expect(store.isRemote()).toBe(true);
      expect(store.getKeyField()).toBe('customId');
    });

    it('should trigger initial fetch and populate row counts', async () => {
      const onLoaded = vi.fn();
      const store = new RemoteDataStore({
        load: customLoadMock,
        blockSize: 10,
      });
      store.on('loaded', onLoaded);

      // Wait for initial fetch block 0
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(onLoaded).toHaveBeenCalled();
      expect(store.getRowCount()).toBe(50);
      expect(store.getTotalCount()).toBe(50);
      expect(store.getTotalDatasetRowCount()).toBe(50);
    });
  });

  describe('Row Access and Block Caching', () => {
    it('should return loaded row data through getViewRow', async () => {
      const store = new RemoteDataStore({
        load: customLoadMock,
        blockSize: 10,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const row0 = store.getViewRow(0);
      expect(row0).toBeDefined();
      expect(row0?.type).toBe('data');
      if (row0?.type === 'data') {
        expect(row0.data.name).toBe('User 1');
      }

      const row9 = store.getViewRow(9);
      if (row9?.type === 'data') {
        expect(row9.data.name).toBe('User 10');
      }
    });

    it('should return undefined for uncached blocks before they are loaded', async () => {
      const store = new RemoteDataStore({
        load: customLoadMock,
        blockSize: 10,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Row 25 is in block 2, which has not been loaded yet
      const row25 = store.getViewRow(25);
      expect(row25).toBeUndefined();
    });
  });

  describe('Remote Filtering and Searching', () => {
    it('should reload data and update totalCount when filter is applied', async () => {
      const store = new RemoteDataStore({
        load: customLoadMock,
        blockSize: 10,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(store.getRowCount()).toBe(50);

      await store.setFilter(['role', '=', 'Admin']);

      expect(customLoadMock).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: ['role', '=', 'Admin'],
        })
      );
      expect(store.getRowCount()).toBe(25);
      const row0 = store.getViewRow(0);
      if (row0?.type === 'data') {
        expect(row0.data.role).toBe('Admin');
      }
    });

    it('should reload data when search keyword is supplied', async () => {
      const store = new RemoteDataStore({
        load: customLoadMock,
        blockSize: 10,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      await store.setSearch('User 5');

      expect(customLoadMock).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'User 5',
        })
      );
      // 'User 5' and 'User 50'
      expect(store.getRowCount()).toBe(2);
    });
  });

  describe('Remote Sorting', () => {
    it('should send sort descriptors to loader when sorting is changed', async () => {
      const store = new RemoteDataStore({
        load: customLoadMock,
        blockSize: 10,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      await store.setSorting([{ selector: 'score', desc: true }]);

      expect(customLoadMock).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: [{ selector: 'score', desc: true }],
        })
      );
    });
  });

  describe('Mutation Handlers (setCell & commitBatch)', () => {
    it('should invoke custom update callback on setCell', async () => {
      const updateMock = vi.fn().mockResolvedValue(undefined);
      const store = new RemoteDataStore({
        load: customLoadMock,
        update: updateMock,
        blockSize: 10,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      await store.setCell(1, 'role', 'SuperAdmin');

      expect(updateMock).toHaveBeenCalledWith(1, { role: 'SuperAdmin' });
    });

    it('should invoke custom commit callback on commitBatch', async () => {
      const commitMock = vi.fn().mockResolvedValue(undefined);
      const store = new RemoteDataStore({
        load: customLoadMock,
        commit: commitMock,
        blockSize: 10,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const batchChanges: BatchChanges = {
        inserted: [{ name: 'New User' }],
        updated: [{ key: 1, values: { name: 'Renamed' } }],
        deleted: [2],
      };

      await store.commitBatch(batchChanges);

      expect(commitMock).toHaveBeenCalledWith(batchChanges);
    });
  });

  describe('Error Handling and Event Lifecycle', () => {
    it('should emit error event when custom loader rejects', async () => {
      const errorMock = vi.fn();
      const failingLoad = vi.fn().mockRejectedValue(new Error('Network Timeout'));

      const store = new RemoteDataStore({
        load: failingLoad,
      });
      store.on('error', errorMock);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(errorMock).toHaveBeenCalledWith(expect.any(Error));
      expect(errorMock.mock.calls[0][0].message).toBe('Network Timeout');
    });

    it('should allow unsubscribing from event listener using off()', async () => {
      const onLoaded = vi.fn();
      const store = new RemoteDataStore({
        load: customLoadMock,
      });

      store.on('loaded', onLoaded);
      store.off('loaded', onLoaded);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(onLoaded).not.toHaveBeenCalled();
    });
  });
});
