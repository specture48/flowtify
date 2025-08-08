/**
 * LRU (Least Recently Used) registry implementation
 * Automatically evicts least recently used items when size limit is reached
 */

export class LRURegistry<K, V> {
  private cache = new Map<K, V>();
  private accessOrder: K[] = [];
  
  constructor(private maxSize: number = 1000) {}

  set(key: K, value: V): void {
    // Remove from access order if already exists
    const existingIndex = this.accessOrder.indexOf(key);
    if (existingIndex > -1) {
      this.accessOrder.splice(existingIndex, 1);
    }
    
    // Add to end (most recent)
    this.accessOrder.push(key);
    this.cache.set(key, value);
    
    // Evict if over limit
    if (this.cache.size > this.maxSize) {
      this.evictOldest();
    }
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recent)
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
        this.accessOrder.push(key);
      }
    }
    return value;
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  size(): number {
    return this.cache.size;
  }

  keys(): K[] {
    return Array.from(this.cache.keys());
  }

  values(): V[] {
    return Array.from(this.cache.values());
  }

  entries(): Array<[K, V]> {
    return Array.from(this.cache.entries());
  }

  private evictOldest(): void {
    if (this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder.shift()!;
      this.cache.delete(oldestKey);
    }
  }

  setMaxSize(maxSize: number): void {
    this.maxSize = maxSize;
    // Evict items if current size exceeds new limit
    while (this.cache.size > this.maxSize) {
      this.evictOldest();
    }
  }

  getStats(): {
    size: number;
    maxSize: number;
    fillRatio: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      fillRatio: this.cache.size / this.maxSize
    };
  }
}