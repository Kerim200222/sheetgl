export class BlockCache<T = any> {
  private cache = new Map<number, T[]>();
  private readonly maxBlocks: number;
  public readonly blockSize: number;

  constructor(blockSize: number = 100, maxBlocks: number = 30) {
    this.blockSize = blockSize;
    this.maxBlocks = maxBlocks;
  }

  public getBlockIndex(rowIndex: number): number {
    return Math.floor(rowIndex / this.blockSize);
  }

  public getRow(rowIndex: number): T | undefined {
    const blockIndex = this.getBlockIndex(rowIndex);
    const block = this.cache.get(blockIndex);
    if (!block) return undefined;

    // LRU tazeleme
    this.cache.delete(blockIndex);
    this.cache.set(blockIndex, block);

    const offset = rowIndex % this.blockSize;
    return block[offset];
  }

  public setBlock(blockIndex: number, rows: T[]): void {
    if (this.cache.has(blockIndex)) {
      this.cache.delete(blockIndex);
    } else if (this.cache.size >= this.maxBlocks) {
      // En eski bloğu sil (LRU eviction)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(blockIndex, rows);
  }

  public hasBlock(blockIndex: number): boolean {
    return this.cache.has(blockIndex);
  }

  public get size(): number {
    return this.cache.size;
  }

  public forEach(callback: (rows: T[], blockIndex: number) => void): void {
    this.cache.forEach((rows, blockIndex) => callback(rows, blockIndex));
  }

  public clear(): void {
    this.cache.clear();
  }
}
