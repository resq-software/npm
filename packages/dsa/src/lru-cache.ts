/**
 * Copyright 2026 ResQ
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

/**
 * Node in the doubly-linked list
 * @internal
 */
interface CacheNode<K, V> {
  key: K;
  value: V;
  prev: CacheNode<K, V> | null;
  next: CacheNode<K, V> | null;
  expiresAt?: number;
}

/**
 * LRU Cache configuration
 */
export interface LRUCacheOptions {
  /** Maximum number of items in cache */
  maxSize: number;
  /** Default TTL in milliseconds (optional) */
  defaultTTL?: number;
  /** Callback when item is evicted */
  onEvict?: <K, V>(key: K, value: V) => void;
}

/**
 * High-performance LRU Cache with O(1) get/set operations
 *
 * @class LRUCache
 * @template K - Key type
 * @template V - Value type
 */
export class LRUCache<K, V> {
  private readonly cache: Map<K, CacheNode<K, V>>;
  private head: CacheNode<K, V> | null = null;
  private tail: CacheNode<K, V> | null = null;
  private readonly maxSize: number;
  private readonly defaultTTL?: number;
  private readonly onEvict?: <K2, V2>(key: K2, value: V2) => void;

  constructor(options: LRUCacheOptions) {
    this.cache = new Map();
    this.maxSize = options.maxSize;
    this.defaultTTL = options.defaultTTL;
    this.onEvict = options.onEvict;
  }

  get(key: K): V | undefined {
    const node = this.cache.get(key);
    if (!node) return undefined;

    if (node.expiresAt && Date.now() > node.expiresAt) {
      this.delete(key);
      return undefined;
    }

    this.moveToFront(node);
    return node.value;
  }

  set(key: K, value: V, ttl?: number): void {
    const existingNode = this.cache.get(key);

    if (existingNode) {
      existingNode.value = value;
      existingNode.expiresAt = this.calculateExpiry(ttl);
      this.moveToFront(existingNode);
      return;
    }

    const newNode: CacheNode<K, V> = {
      key,
      value,
      prev: null,
      next: this.head,
      expiresAt: this.calculateExpiry(ttl),
    };

    if (this.head) {
      this.head.prev = newNode;
    }
    this.head = newNode;

    if (!this.tail) {
      this.tail = newNode;
    }

    this.cache.set(key, newNode);

    if (this.cache.size > this.maxSize) {
      this.evictLRU();
    }
  }

  has(key: K): boolean {
    const node = this.cache.get(key);
    if (!node) return false;

    if (node.expiresAt && Date.now() > node.expiresAt) {
      this.delete(key);
      return false;
    }

    return true;
  }

  delete(key: K): boolean {
    const node = this.cache.get(key);
    if (!node) return false;

    this.removeNode(node);
    this.cache.delete(key);
    return true;
  }

  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
  }

  get size(): number {
    return this.cache.size;
  }

  getStats(): { size: number; maxSize: number; hitRate: number } {
    return { size: this.cache.size, maxSize: this.maxSize, hitRate: 0 };
  }

  async getOrCompute(key: K, compute: () => Promise<V>, ttl?: number): Promise<V> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    const value = await compute();
    this.set(key, value, ttl);
    return value;
  }

  getOrComputeSync(key: K, compute: () => V, ttl?: number): V {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    const value = compute();
    this.set(key, value, ttl);
    return value;
  }

  private calculateExpiry(ttl?: number): number | undefined {
    const effectiveTTL = ttl ?? this.defaultTTL;
    return effectiveTTL ? Date.now() + effectiveTTL : undefined;
  }

  private moveToFront(node: CacheNode<K, V>): void {
    if (node === this.head) return;

    this.removeNode(node);
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: CacheNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  private evictLRU(): void {
    if (!this.tail) return;

    const evictedNode = this.tail;

    if (this.onEvict) {
      this.onEvict(evictedNode.key, evictedNode.value);
    }

    this.removeNode(evictedNode);
    this.cache.delete(evictedNode.key);
  }
}
