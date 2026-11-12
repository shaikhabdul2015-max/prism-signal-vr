// src/ai/performance/AIRequestCache.ts
import type { CacheEntry } from './types';

export class AIRequestCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private readonly defaultTtlMs: number;
  private readonly maxEntries: number;
  private hits = 0;
  private misses = 0;

  constructor(defaultTtlMs = 60000, maxEntries = 100) {
    this.defaultTtlMs = defaultTtlMs;
    this.maxEntries = maxEntries;
  }

  public get(key: string, currentTime = Date.now()): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (currentTime - entry.timestamp > entry.ttlMs) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    entry.hitCount++;
    this.hits++;
    // Reinsert to update LRU position
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  public set(key: string, data: T, ttlMs = this.defaultTtlMs, currentTime = Date.now()): void {
    if (this.cache.size >= this.maxEntries) {
      // Evict least recently used (first key in insertion order)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      key,
      data,
      timestamp: currentTime,
      ttlMs,
      hitCount: 0,
    });
  }

  public getStats() {
    const total = this.hits + this.misses;
    return {
      totalQueries: total,
      hits: this.hits,
      misses: this.misses,
      hitRatio: total > 0 ? Number((this.hits / total).toFixed(3)) : 0.0,
      size: this.cache.size,
    };
  }

  public clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}
