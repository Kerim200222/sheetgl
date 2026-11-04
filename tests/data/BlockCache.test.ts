import { describe, it, expect, beforeEach } from 'vitest';
import { BlockCache } from '../../src/datagrid/data/BlockCache';

describe('BlockCache (Virtualization Data LRU Cache)', () => {
  let cache: BlockCache<{ id: number; name: string }>;

  beforeEach(() => {
    // 10 items per block, max 3 blocks cached
    cache = new BlockCache<{ id: number; name: string }>(10, 3);
  });

  describe('Block Index Calculation', () => {
    it('should correctly determine the block index based on row index and blockSize', () => {
      expect(cache.getBlockIndex(0)).toBe(0);
      expect(cache.getBlockIndex(9)).toBe(0);
      expect(cache.getBlockIndex(10)).toBe(1);
      expect(cache.getBlockIndex(29)).toBe(2);
      expect(cache.getBlockIndex(105)).toBe(10);
    });
  });

  describe('Block Storage and Row Retrieval', () => {
    it('should return undefined when requesting a row from an uncached block', () => {
      expect(cache.hasBlock(0)).toBe(false);
      expect(cache.getRow(5)).toBeUndefined();
    });

    it('should store a block and retrieve individual rows correctly', () => {
      const block0 = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        name: `Row ${i}`,
      }));

      cache.setBlock(0, block0);

      expect(cache.hasBlock(0)).toBe(true);
      expect(cache.getRow(0)).toEqual({ id: 0, name: 'Row 0' });
      expect(cache.getRow(4)).toEqual({ id: 4, name: 'Row 4' });
      expect(cache.getRow(9)).toEqual({ id: 9, name: 'Row 9' });
    });

    it('should overwrite existing block when setBlock is called with same index', () => {
      const initial = [{ id: 0, name: 'Original' }];
      const updated = [{ id: 0, name: 'Updated' }];

      cache.setBlock(0, initial);
      expect(cache.getRow(0)?.name).toBe('Original');

      cache.setBlock(0, updated);
      expect(cache.getRow(0)?.name).toBe('Updated');
    });
  });

  describe('LRU Eviction Policy', () => {
    it('should evict the least recently used block when capacity is reached', () => {
      const block0 = [{ id: 0, name: 'B0' }];
      const block1 = [{ id: 10, name: 'B1' }];
      const block2 = [{ id: 20, name: 'B2' }];
      const block3 = [{ id: 30, name: 'B3' }];

      cache.setBlock(0, block0);
      cache.setBlock(1, block1);
      cache.setBlock(2, block2);

      expect(cache.hasBlock(0)).toBe(true);
      expect(cache.hasBlock(1)).toBe(true);
      expect(cache.hasBlock(2)).toBe(true);

      // Adding block 3 exceeds maxBlocks (3), block 0 should be evicted as least recently used
      cache.setBlock(3, block3);

      expect(cache.hasBlock(0)).toBe(false);
      expect(cache.hasBlock(1)).toBe(true);
      expect(cache.hasBlock(2)).toBe(true);
      expect(cache.hasBlock(3)).toBe(true);
    });

    it('should refresh LRU order on getRow read operations', () => {
      const block0 = [{ id: 0, name: 'B0' }];
      const block1 = [{ id: 10, name: 'B1' }];
      const block2 = [{ id: 20, name: 'B2' }];
      const block3 = [{ id: 30, name: 'B3' }];

      cache.setBlock(0, block0);
      cache.setBlock(1, block1);
      cache.setBlock(2, block2);

      // Accessing block 0 refreshes its LRU position (making block 1 the oldest)
      cache.getRow(0);

      // Adding block 3 should now evict block 1 instead of block 0
      cache.setBlock(3, block3);

      expect(cache.hasBlock(0)).toBe(true);
      expect(cache.hasBlock(1)).toBe(false); // Evicted!
      expect(cache.hasBlock(2)).toBe(true);
      expect(cache.hasBlock(3)).toBe(true);
    });
  });

  describe('Cache Reset', () => {
    it('should clear all cached blocks on clear()', () => {
      cache.setBlock(0, [{ id: 0, name: 'A' }]);
      cache.setBlock(1, [{ id: 10, name: 'B' }]);

      cache.clear();

      expect(cache.hasBlock(0)).toBe(false);
      expect(cache.hasBlock(1)).toBe(false);
      expect(cache.getRow(0)).toBeUndefined();
    });
  });
});
