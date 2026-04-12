/**
 * Copyright 2026 ResQ Software
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LRUCache } from '../src/lru-cache.js';

describe('LRUCache', () => {
  // --- Construction ---

  it('creates an empty cache with the given maxSize', () => {
    const cache = new LRUCache<string, number>({ maxSize: 5 });
    expect(cache.size).toBe(0);
  });

  it('getStats() returns size and maxSize', () => {
    const cache = new LRUCache<string, number>({ maxSize: 10 });
    cache.set('a', 1);
    const stats = cache.getStats();
    expect(stats.size).toBe(1);
    expect(stats.maxSize).toBe(10);
  });

  // --- Basic get / set ---

  it('set() and get() store and retrieve a value', () => {
    const cache = new LRUCache<string, number>({ maxSize: 3 });
    cache.set('x', 42);
    expect(cache.get('x')).toBe(42);
  });

  it('get() returns undefined for a missing key', () => {
    const cache = new LRUCache<string, number>({ maxSize: 3 });
    expect(cache.get('missing')).toBeUndefined();
  });

  it('set() overwrites an existing key', () => {
    const cache = new LRUCache<string, string>({ maxSize: 3 });
    cache.set('k', 'old');
    cache.set('k', 'new');
    expect(cache.get('k')).toBe('new');
    expect(cache.size).toBe(1);
  });

  // --- has / delete ---

  it('has() returns true for existing keys', () => {
    const cache = new LRUCache<string, number>({ maxSize: 3 });
    cache.set('a', 1);
    expect(cache.has('a')).toBe(true);
  });

  it('has() returns false for missing keys', () => {
    const cache = new LRUCache<string, number>({ maxSize: 3 });
    expect(cache.has('nope')).toBe(false);
  });

  it('delete() removes an existing key and returns true', () => {
    const cache = new LRUCache<string, number>({ maxSize: 3 });
    cache.set('a', 1);
    expect(cache.delete('a')).toBe(true);
    expect(cache.has('a')).toBe(false);
    expect(cache.size).toBe(0);
  });

  it('delete() returns false for a missing key', () => {
    const cache = new LRUCache<string, number>({ maxSize: 3 });
    expect(cache.delete('ghost')).toBe(false);
  });

  // --- clear ---

  it('clear() removes all entries', () => {
    const cache = new LRUCache<string, number>({ maxSize: 5 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('a')).toBeUndefined();
  });

  // --- Capacity eviction ---

  it('evicts the least-recently-used item when maxSize is exceeded', () => {
    const cache = new LRUCache<string, number>({ maxSize: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3); // should evict 'a'
    expect(cache.has('a')).toBe(false);
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
    expect(cache.size).toBe(2);
  });

  it('accessing a key promotes it so it is not evicted next', () => {
    const cache = new LRUCache<string, number>({ maxSize: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a'); // promote 'a'
    cache.set('c', 3); // should evict 'b' (LRU)
    expect(cache.has('a')).toBe(true);
    expect(cache.has('b')).toBe(false);
    expect(cache.has('c')).toBe(true);
  });

  it('updating a key promotes it so it is not evicted next', () => {
    const cache = new LRUCache<string, number>({ maxSize: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('a', 10); // promote 'a'
    cache.set('c', 3); // should evict 'b'
    expect(cache.get('a')).toBe(10);
    expect(cache.has('b')).toBe(false);
  });

  it('evicts multiple items in LRU order', () => {
    const cache = new LRUCache<string, number>({ maxSize: 3 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.set('d', 4); // evict 'a'
    cache.set('e', 5); // evict 'b'
    expect(cache.has('a')).toBe(false);
    expect(cache.has('b')).toBe(false);
    expect(cache.has('c')).toBe(true);
    expect(cache.size).toBe(3);
  });

  // --- onEvict callback ---

  it('calls onEvict when an item is evicted', () => {
    const evicted: Array<[string, number]> = [];
    const cache = new LRUCache<string, number>({
      maxSize: 1,
      onEvict: (key, value) => {
        evicted.push([key as string, value as number]);
      },
    });
    cache.set('a', 1);
    cache.set('b', 2); // evict 'a'
    expect(evicted).toEqual([['a', 1]]);
  });

  // --- TTL expiration ---

  describe('TTL support', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('get() returns undefined for an expired item', () => {
      const cache = new LRUCache<string, number>({ maxSize: 5 });
      cache.set('temp', 99, 1000);
      vi.advanceTimersByTime(1001);
      expect(cache.get('temp')).toBeUndefined();
    });

    it('has() returns false for an expired item', () => {
      const cache = new LRUCache<string, number>({ maxSize: 5 });
      cache.set('temp', 99, 500);
      vi.advanceTimersByTime(501);
      expect(cache.has('temp')).toBe(false);
    });

    it('uses defaultTTL when no per-item TTL is given', () => {
      const cache = new LRUCache<string, number>({ maxSize: 5, defaultTTL: 200 });
      cache.set('a', 1);
      vi.advanceTimersByTime(201);
      expect(cache.get('a')).toBeUndefined();
    });

    it('per-item TTL overrides defaultTTL', () => {
      const cache = new LRUCache<string, number>({ maxSize: 5, defaultTTL: 200 });
      cache.set('a', 1, 1000);
      vi.advanceTimersByTime(500);
      expect(cache.get('a')).toBe(1);
    });

    it('item is accessible before TTL expires', () => {
      const cache = new LRUCache<string, number>({ maxSize: 5 });
      cache.set('a', 1, 1000);
      vi.advanceTimersByTime(999);
      expect(cache.get('a')).toBe(1);
    });
  });

  // --- getOrCompute / getOrComputeSync ---

  it('getOrComputeSync() returns cached value without calling compute', () => {
    const cache = new LRUCache<string, number>({ maxSize: 5 });
    cache.set('a', 1);
    const compute = vi.fn(() => 999);
    const result = cache.getOrComputeSync('a', compute);
    expect(result).toBe(1);
    expect(compute).not.toHaveBeenCalled();
  });

  it('getOrComputeSync() calls compute for missing key and caches result', () => {
    const cache = new LRUCache<string, number>({ maxSize: 5 });
    const result = cache.getOrComputeSync('a', () => 42);
    expect(result).toBe(42);
    expect(cache.get('a')).toBe(42);
  });

  it('getOrCompute() returns cached value without calling compute', async () => {
    const cache = new LRUCache<string, number>({ maxSize: 5 });
    cache.set('a', 1);
    const compute = vi.fn(async () => 999);
    const result = await cache.getOrCompute('a', compute);
    expect(result).toBe(1);
    expect(compute).not.toHaveBeenCalled();
  });

  it('getOrCompute() calls async compute for missing key and caches result', async () => {
    const cache = new LRUCache<string, number>({ maxSize: 5 });
    const result = await cache.getOrCompute('b', async () => 7);
    expect(result).toBe(7);
    expect(cache.get('b')).toBe(7);
  });

  // --- Edge cases ---

  it('works with a maxSize of 1', () => {
    const cache = new LRUCache<string, number>({ maxSize: 1 });
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.size).toBe(1);
    expect(cache.has('a')).toBe(false);
    expect(cache.get('b')).toBe(2);
  });

  it('supports non-string key types', () => {
    const cache = new LRUCache<number, string>({ maxSize: 3 });
    cache.set(1, 'one');
    cache.set(2, 'two');
    expect(cache.get(1)).toBe('one');
    expect(cache.get(2)).toBe('two');
  });
});
