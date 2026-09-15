/**
 * High-Performance In-Memory Tagged Server Cache
 * Provides sub-millisecond data retrieval and instant tag-based invalidation
 * for Server Actions and API routes across the Fulk Academy platform.
 */

interface CacheEntry<T = unknown> {
  data: T;
  expiresAt: number;
  tags: Set<string>;
}

class ServerCacheManager {
  private cache = new Map<string, CacheEntry>();
  private tagIndex = new Map<string, Set<string>>(); // tag -> Set of cache keys

  /**
   * Retrieve an item from the cache if it exists and has not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Store an item in the cache with a specified TTL and associated invalidation tags
   */
  set<T>(key: string, data: T, ttlSeconds: number = 60, tags: string[] = []): void {
    const expiresAt = Date.now() + Math.max(1, ttlSeconds) * 1000;
    const tagSet = new Set(tags);

    // If key already exists, clean up old tag index entries
    if (this.cache.has(key)) {
      this.removeFromTagIndex(key);
    }

    this.cache.set(key, {
      data,
      expiresAt,
      tags: tagSet,
    });

    // Register key under each tag for instant group invalidation
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }

    // Limit maximum cache size to prevent memory leaks (Max 5000 active entries)
    if (this.cache.size > 5000) {
      this.evictOldest(500);
    }
  }

  /**
   * Delete a specific cache key
   */
  delete(key: string): void {
    this.removeFromTagIndex(key);
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries associated with one or more tags
   */
  invalidateTags(...tags: string[]): number {
    let invalidatedCount = 0;
    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        for (const key of Array.from(keys)) {
          this.cache.delete(key);
          invalidatedCount++;
        }
        this.tagIndex.delete(tag);
      }
    }
    return invalidatedCount;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.tagIndex.clear();
  }

  private removeFromTagIndex(key: string): void {
    const entry = this.cache.get(key);
    if (!entry) return;

    for (const tag of entry.tags) {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        keys.delete(key);
        if (keys.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }
  }

  private evictOldest(count: number): void {
    const now = Date.now();
    let removed = 0;

    // First pass: remove expired items
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.delete(key);
        removed++;
        if (removed >= count) return;
      }
    }

    // Second pass: remove oldest items by insertion order
    for (const key of this.cache.keys()) {
      this.delete(key);
      removed++;
      if (removed >= count) break;
    }
  }
}

// Preserve singleton instance across Next.js dev hot-reloads
const globalForCache = globalThis as unknown as { serverCacheManager?: ServerCacheManager };

export const serverCache = globalForCache.serverCacheManager ?? new ServerCacheManager();

if (process.env.NODE_ENV !== "production") {
  globalForCache.serverCacheManager = serverCache;
}

/**
 * Helper to wrap any async data fetcher with caching and tag indexing
 */
export async function withCache<T>(
  key: string,
  tags: string[],
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = serverCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  const freshData = await fetcher();
  if (freshData !== undefined && freshData !== null) {
    serverCache.set(key, freshData, ttlSeconds, tags);
  }
  return freshData;
}

/**
 * Invalidate cache for specified tags (e.g. `classes:teacherId`, `students:teacherId`)
 */
export function invalidateCacheTags(...tags: string[]): number {
  return serverCache.invalidateTags(...tags);
}
