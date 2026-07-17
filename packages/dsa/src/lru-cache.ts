/**
 * Copyright 2026 ResQ Systems, Inc.
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
 * @fileoverview Least-recently-used cache with O(1) get/set/has/delete, optional
 * lazy TTL expiry, an eviction callback, and read-through compute helpers.
 *
 * @module @resq-systems/dsa/lru-cache
 */

//#region Types

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
 * Configuration for {@link LRUCache}.
 */
export interface LRUCacheOptions<K = unknown, V = unknown> {
	/**
	 * Maximum number of entries the cache will hold. Once exceeded, the
	 * least-recently-used entry is evicted.
	 */
	maxSize: number;
	/**
	 * Default time-to-live in milliseconds for entries inserted without a
	 * per-call TTL. Omit for entries that never expire by time. Expired
	 * entries are evicted **lazily** on the next `get`/`has` access.
	 */
	defaultTTL?: number;
	/**
	 * Optional callback invoked whenever an entry is evicted to make room
	 * for a new one. Receives the key and value of the evicted entry.
	 *
	 * Not called on explicit `delete()` or `clear()`, and not called when
	 * an entry is removed because it expired.
	 */
	onEvict?: (key: K, value: V) => void;
}

//#endregion

//#region Public API

/**
 * Least-recently-used cache with constant-time `get`, `set`, `has`, and
 * `delete`.
 *
 * Implementation: `Map<K, Node>` for `O(1)` key lookup, paired with a
 * doubly-linked list ordered MRU → LRU. Every access moves the touched node
 * to the head so the tail is always the eviction candidate.
 *
 * Optional TTL support is **lazy**: expired entries stay in memory until
 * the next access touches them, at which point they're removed and treated
 * as a miss. There is no background sweeper.
 *
 * @template K - Key type. Compared by `Map` semantics (SameValueZero).
 * @template V - Value type. The cache stores references — it does not
 *   copy or freeze values.
 *
 * @example Basic use
 * ```ts
 * const cache = new LRUCache<string, User>({ maxSize: 100 });
 * cache.set("u:42", user);
 * cache.get("u:42"); // → User
 * ```
 *
 * @example With TTL and eviction callback
 * ```ts
 * const cache = new LRUCache<string, Tile>({
 *   maxSize: 1024,
 *   defaultTTL: 60_000,
 *   onEvict: (key, value) => value.dispose(),
 * });
 * cache.set("tile:42:17", tile);              // uses defaultTTL
 * cache.set("tile:42:18", tile, 5_000);       // per-entry override (5s)
 * ```
 *
 * @example Compute-on-miss
 * ```ts
 * const user = await cache.getOrCompute("u:42", () => fetchUser(42));
 * ```
 */
export class LRUCache<K, V> {
	private readonly cache: Map<K, CacheNode<K, V>>;
	private head: CacheNode<K, V> | null = null;
	private tail: CacheNode<K, V> | null = null;
	private readonly maxSize: number;
	private readonly defaultTTL?: number;
	private readonly onEvict?: (key: K, value: V) => void;

	/**
	 * @param options - See {@link LRUCacheOptions}. `maxSize` is required.
	 */
	constructor(options: LRUCacheOptions<K, V>) {
		this.cache = new Map();
		this.maxSize = options.maxSize;
		this.defaultTTL = options.defaultTTL;
		this.onEvict = options.onEvict;
	}

	/**
	 * Look up a value and mark its entry as most-recently-used.
	 *
	 * @param key - Lookup key.
	 * @returns The stored value, or `undefined` if the key is absent or
	 *   the entry has expired (in which case it is also evicted).
	 *
	 * Time complexity: `O(1)`.
	 */
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

	/**
	 * Insert or replace an entry. Becomes the most-recently-used entry.
	 *
	 * If inserting causes `size` to exceed `maxSize`, the least-recently-used
	 * entry is evicted and {@link LRUCacheOptions.onEvict | onEvict} fires.
	 *
	 * @param key - Entry key.
	 * @param value - Entry value.
	 * @param ttl - Optional per-call TTL in milliseconds. Overrides
	 *   {@link LRUCacheOptions.defaultTTL | defaultTTL}. Omit for "never
	 *   expire by time" (default if no `defaultTTL` is set).
	 *
	 * Time complexity: `O(1)`.
	 */
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

	/**
	 * Membership test. Does **not** affect LRU order.
	 *
	 * @returns `true` if `key` has a non-expired entry. Expired entries
	 *   are evicted as a side effect and return `false`.
	 *
	 * Time complexity: `O(1)`.
	 */
	has(key: K): boolean {
		const node = this.cache.get(key);
		if (!node) return false;

		if (node.expiresAt && Date.now() > node.expiresAt) {
			this.delete(key);
			return false;
		}

		return true;
	}

	/**
	 * Remove an entry by key.
	 *
	 * @returns `true` if a matching entry was found and removed, `false`
	 *   otherwise.
	 *
	 * Note: does **not** invoke `onEvict` — that callback is reserved for
	 * capacity-driven eviction.
	 *
	 * Time complexity: `O(1)`.
	 */
	delete(key: K): boolean {
		const node = this.cache.get(key);
		if (!node) return false;

		this.removeNode(node);
		this.cache.delete(key);
		return true;
	}

	/**
	 * Drop every entry. `onEvict` is **not** called for any entry.
	 */
	clear(): void {
		this.cache.clear();
		this.head = null;
		this.tail = null;
	}

	/** Current number of entries (including not-yet-evicted expired entries). */
	get size(): number {
		return this.cache.size;
	}

	/**
	 * Snapshot of cache statistics.
	 *
	 * @returns `{ size, maxSize, hitRate }`. **Note:** `hitRate` is reserved
	 *   for a future implementation; it currently always returns `0`.
	 */
	getStats(): { size: number; maxSize: number; hitRate: number } {
		return { size: this.cache.size, maxSize: this.maxSize, hitRate: 0 };
	}

	/**
	 * Read-through helper: return the cached value, or call `compute` to
	 * load it on miss and cache the result.
	 *
	 * Concurrent calls with the same key may invoke `compute` more than
	 * once — this method does **not** deduplicate in-flight loads. If
	 * single-flight semantics matter, wrap `compute` in your own
	 * promise-deduper or use a memoising decorator.
	 *
	 * @param key - Lookup key.
	 * @param compute - Async loader called only on miss.
	 * @param ttl - Optional TTL applied to the freshly computed value.
	 */
	async getOrCompute(key: K, compute: () => Promise<V>, ttl?: number): Promise<V> {
		const cached = this.get(key);
		if (cached !== undefined) return cached;

		const value = await compute();
		this.set(key, value, ttl);
		return value;
	}

	/**
	 * Synchronous variant of {@link getOrCompute}.
	 *
	 * @param key - Lookup key.
	 * @param compute - Synchronous loader called only on miss.
	 * @param ttl - Optional TTL applied to the freshly computed value.
	 */
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

	/**
	 * Returns an iterator for the keys in the cache, from most-recently-used to least-recently-used.
	 */
	*keys(): Generator<K> {
		let current = this.head;
		const now = Date.now();
		while (current) {
			if (!current.expiresAt || now <= current.expiresAt) {
				yield current.key;
			}
			current = current.next;
		}
	}

	/**
	 * Returns an iterator for the values in the cache, from most-recently-used to least-recently-used.
	 */
	*values(): Generator<V> {
		let current = this.head;
		const now = Date.now();
		while (current) {
			if (!current.expiresAt || now <= current.expiresAt) {
				yield current.value;
			}
			current = current.next;
		}
	}

	/**
	 * Returns an iterator for the [key, value] pairs in the cache, from most-recently-used to least-recently-used.
	 */
	*entries(): Generator<[K, V]> {
		let current = this.head;
		const now = Date.now();
		while (current) {
			if (!current.expiresAt || now <= current.expiresAt) {
				yield [current.key, current.value];
			}
			current = current.next;
		}
	}

	/**
	 * Default iterator returning entries.
	 */
	[Symbol.iterator](): Generator<[K, V]> {
		return this.entries();
	}
}
//#endregion
