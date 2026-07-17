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

/*!
 * Adapted from Microsoft Playwright — packages/isomorphic/multimap.ts
 * https://github.com/microsoft/playwright
 *
 * Copyright (c) Microsoft Corporation.
 * Licensed under the Apache License, Version 2.0.
 */

/**
 * @fileoverview A one-to-many map: each key holds an ordered list of values.
 * Adapted from Playwright's isomorphic MultiMap (see attribution above).
 *
 * @module @resq-systems/dsa/multi-map
 */

/**
 * A map that associates each key with an **ordered list of values** rather than
 * a single value. Setting the same key repeatedly appends instead of
 * overwriting, and iteration yields `[key, values]` entries.
 *
 * Zero-dependency; backed by a native `Map<K, V[]>`, so key equality follows
 * `SameValueZero` semantics.
 *
 * @template K - The key type.
 * @template V - The value type.
 *
 * @example
 * ```ts
 * const byZone = new MultiMap<string, string>();
 * byZone.set("north", "drone-1");
 * byZone.set("north", "drone-2");
 * byZone.get("north"); // → ["drone-1", "drone-2"]
 * byZone.hasValue("north", "drone-2"); // → true
 * ```
 */
export class MultiMap<K, V> {
	private readonly map = new Map<K, V[]>();

	/** Append `value` to the list stored under `key`. */
	public set(key: K, value: V): void {
		let values = this.map.get(key);
		if (!values) {
			values = [];
			this.map.set(key, values);
		}
		values.push(value);
	}

	/** @returns The values stored under `key`, or an empty array if none. */
	public get(key: K): V[] {
		return this.map.get(key) ?? [];
	}

	/** @returns `true` if `key` has at least one value. */
	public has(key: K): boolean {
		return this.map.has(key);
	}

	/**
	 * Remove every occurrence of `value` from `key`'s list, keeping the remaining
	 * values. The key itself is dropped once its list becomes empty, so
	 * {@link has} reports `false` afterwards (no lingering empty lists).
	 */
	public delete(key: K, value: V): void {
		const values = this.map.get(key);
		if (!values) {
			return;
		}
		const remaining = values.filter((candidate) => candidate !== value);
		if (remaining.length) {
			this.map.set(key, remaining);
		} else {
			this.map.delete(key);
		}
	}

	/** Remove `key` and every value stored under it. */
	public deleteAll(key: K): void {
		this.map.delete(key);
	}

	/** @returns `true` if `value` is stored under `key`. */
	public hasValue(key: K, value: V): boolean {
		return this.map.get(key)?.includes(value) ?? false;
	}

	/** The number of distinct keys. */
	public get size(): number {
		return this.map.size;
	}

	/** Iterate `[key, values]` entries, one per distinct key. */
	public [Symbol.iterator](): IterableIterator<[K, V[]]> {
		return this.map[Symbol.iterator]();
	}

	/** @returns An iterator over the distinct keys. */
	public keys(): IterableIterator<K> {
		return this.map.keys();
	}

	/** @returns A flat list of every value across all keys, in key-insertion order. */
	public values(): V[] {
		const result: V[] = [];
		for (const values of this.map.values()) {
			result.push(...values);
		}
		return result;
	}

	/** Remove all keys and values. */
	public clear(): void {
		this.map.clear();
	}
}
