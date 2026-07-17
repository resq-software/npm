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
 * @fileoverview Lazy, memoizing micro-cache keyed by objects and backed by a
 * `WeakMap`, so entries are garbage-collected once their keys are unreachable.
 *
 * @module @resq-systems/dsa/weak-cache
 */

/**
 * A lazy, memoizing micro-cache keyed by objects and backed by a `WeakMap`.
 *
 * Because storage is a `WeakMap`, an entry is eligible for garbage collection
 * as soon as its key object has no other references — there is no size bound,
 * no eviction policy, and no way to enumerate entries. This makes it ideal for
 * attaching derived data to objects you don't own, without leaking memory when
 * those objects go away. Keys must be objects (`WeakMap`'s constraint); values
 * are stored by reference, never copied or frozen.
 *
 * @template K - The object key type. Constrained to `object` because `WeakMap`
 *   keys must be garbage-collectable references, not primitives.
 * @template V - The cached value type.
 *
 * @example
 * ```ts
 * const areas = new WeakCache<{ w: number; h: number }, number>();
 * const rect = { w: 4, h: 5 };
 * areas.get(rect, (r) => r.w * r.h); // → 20 (computed)
 * areas.get(rect, () => -1);         // → 20 (cached; callback not called)
 * ```
 */
export class WeakCache<K extends object, V> {
	/**
	 * The backing `WeakMap`. Exposed for direct inspection; prefer {@link get}
	 * for the memoizing read path.
	 */
	readonly items = new WeakMap<K, V>();

	/**
	 * Return the cached value for `item`, computing and storing it on first miss.
	 *
	 * On a miss, `cb` is invoked exactly once and its result is cached; later
	 * calls with the same key return the stored value without calling `cb`
	 * again. Mutates the backing map as a side effect of caching a computed
	 * value.
	 *
	 * @template P - The concrete key subtype, preserved so `cb` receives `item`
	 *   at its exact type rather than the widened `K`.
	 * @param item - The object key to read (and cache under on a miss).
	 * @param cb - Loader invoked only on a miss to compute the value for `item`.
	 * @returns The cached value, or the value freshly computed by `cb`.
	 */
	get<P extends K>(item: P, cb: (item: P) => V): V {
		if (!this.items.has(item)) {
			this.items.set(item, cb(item));
		}

		return this.items.get(item)!;
	}
}
