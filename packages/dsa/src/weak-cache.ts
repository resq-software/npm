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
 * A lightweight cache implementation using WeakMap for storing key-value pairs.
 *
 * A micro cache that stores computed values associated with object keys.
 * Uses WeakMap internally, which means keys can be garbage collected when no other
 * references exist, and only object keys are supported. Provides lazy computation
 * with memoization.
 */
export class WeakCache<K extends object, V> {
	/**
	 * The internal WeakMap storage for cached key-value pairs.
	 */
	readonly items = new WeakMap<K, V>();

	/**
	 * Get the cached value for a given key, computing it if not already cached.
	 *
	 * Retrieves the cached value associated with the given key. If no cached
	 * value exists, calls the provided callback function to compute the value, stores it
	 * in the cache, and returns it. Subsequent calls with the same key will return the
	 * cached value without recomputation.
	 *
	 * @param item - The object key to retrieve the cached value for
	 * @param cb - Callback function that computes the value when not already cached
	 * @returns The cached value if it exists, otherwise the newly computed value from the callback
	 */
	get<P extends K>(item: P, cb: (item: P) => V): V {
		if (!this.items.has(item)) {
			this.items.set(item, cb(item));
		}

		return this.items.get(item)!;
	}
}
