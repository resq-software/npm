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
 * @fileoverview Typed object helpers — own-property access, key/value/entry maps
 * that preserve literal types, shallow and float-tolerant deep equality, grouping,
 * and omit.
 *
 * @module @resq-systems/helpers/utils/object
 */

import { hasOwnProperty } from "@resq-systems/types/guards";
import isEqualWith from "lodash.isequalwith";

/**
 * `hasOwnProperty` now lives in `@resq-systems/types/guards` and is re-exported
 * here unchanged — same name, same non-narrowing
 * `(obj: object, key: string) => boolean` signature, same `Object.hasOwn`
 * delegation, so objects with a null prototype or a shadowed `hasOwnProperty`
 * method still answer correctly.
 *
 * It is imported rather than re-exported blind because this module calls it
 * internally from {@link getOwnProperty} and the deep-equality path.
 *
 * @internal
 */
export { hasOwnProperty };

/**
 * Safely gets an object's own property value (not inherited). Returns undefined if the property
 * doesn't exist as an own property. Provides type-safe access with proper TypeScript inference.
 *
 * @param obj - The object to get the property from
 * @param key - The property key to retrieve
 * @returns The property value if it exists as an own property, undefined otherwise
 * @example
 * ```ts
 * const user = { name: 'Alice', age: 30 }
 * const name = getOwnProperty(user, 'name') // 'Alice'
 * const missing = getOwnProperty(user, 'unknown') // undefined
 * const inherited = getOwnProperty(user, 'toString') // undefined (inherited)
 * ```
 * @internal
 */
export function getOwnProperty<K extends string, V>(
	obj: Partial<Record<K, V>>,
	key: K,
): V | undefined;
/** @internal */
export function getOwnProperty<O extends object>(obj: O, key: string): O[keyof O] | undefined;
/** @internal */
export function getOwnProperty(obj: object, key: string): unknown;
/** @internal */
export function getOwnProperty(obj: object, key: string): unknown {
	if (!hasOwnProperty(obj, key)) {
		return undefined;
	}
	// @ts-expect-error we know the property exists
	return obj[key];
}

/**
 * An alias for `Object.keys` that treats the object as a map and so preserves the type of the keys.
 * Unlike standard Object.keys which returns string[], this maintains the specific string literal types.
 *
 * @param object - The object to get keys from
 * @returns Array of keys with preserved string literal types
 * @example
 * ```ts
 * const config = { theme: 'dark', lang: 'en' } as const
 * const keys = objectMapKeys(config)
 * // keys is Array<'theme' | 'lang'> instead of string[]
 * ```
 * @internal
 */
export function objectMapKeys<Key extends string>(
	object: {
		readonly [K in Key]: unknown;
	},
): Array<Key> {
	return Object.keys(object) as Key[];
}

/**
 * An alias for `Object.values` that treats the object as a map and so preserves the type of the
 * values. Unlike standard Object.values which returns unknown[], this maintains the specific value types.
 *
 * @param object - The object to get values from
 * @returns Array of values with preserved types
 * @example
 * ```ts
 * const scores = { alice: 85, bob: 92, charlie: 78 }
 * const values = objectMapValues(scores)
 * // values is Array<number> instead of unknown[]
 * ```
 * @internal
 */
export function objectMapValues<Key extends string, Value>(
	object: {
		[K in Key]: Value;
	},
): Array<Value> {
	return Object.values(object) as Value[];
}

/**
 * An alias for `Object.entries` that treats the object as a map and so preserves the type of the
 * keys and values. Unlike standard Object.entries which returns `Array<[string, unknown]>`, this maintains specific types.
 *
 * @param object - The object to get entries from
 * @returns Array of key-value pairs with preserved types
 * @example
 * ```ts
 * const user = { name: 'Alice', age: 30 }
 * const entries = objectMapEntries(user)
 * // entries is Array<['name' | 'age', string | number]>
 * ```
 * @internal
 */
export function objectMapEntries<Obj extends object>(
	object: Obj,
): Array<[keyof Obj, Obj[keyof Obj]]> {
	return Object.entries(object) as [keyof Obj, Obj[keyof Obj]][];
}

/**
 * Returns the entries of an object as an iterable iterator.
 * Useful when working with large collections, to avoid allocating an array.
 * Only yields own properties (not inherited ones).
 *
 * @param object - The object to iterate over
 * @returns Iterator yielding key-value pairs with preserved types
 * @example
 * ```ts
 * const largeMap = { a: 1, b: 2, c: 3 } // Imagine thousands of entries
 * for (const [key, value] of objectMapEntriesIterable(largeMap)) {
 *   // Process entries one at a time without creating a large array
 *   console.log(key, value)
 * }
 * ```
 * @internal
 */
export function* objectMapEntriesIterable<Key extends string, Value>(
	object: {
		[K in Key]: Value;
	},
): IterableIterator<[Key, Value]> {
	for (const key in object) {
		if (!Object.hasOwn(object, key)) continue;
		yield [key, object[key]];
	}
}

/**
 * An alias for `Object.fromEntries` that treats the object as a map and so preserves the type of the
 * keys and values. Creates an object from key-value pairs with proper TypeScript typing.
 *
 * @param entries - Array of key-value pairs to convert to an object
 * @returns Object with preserved key and value types
 * @example
 * ```ts
 * const pairs: Array<['name' | 'age', string | number]> = [['name', 'Alice'], ['age', 30]]
 * const obj = objectMapFromEntries(pairs)
 * // obj is { name: string | number, age: string | number }
 * ```
 * @internal
 */
export function objectMapFromEntries<Key extends string, Value>(
	entries: ReadonlyArray<readonly [Key, Value]>,
): { [K in Key]: Value } {
	return Object.fromEntries(entries) as { [K in Key]: Value };
}

/**
 * Filters an object using a predicate function, returning a new object with only the entries
 * that pass the predicate. Optimized to return the original object if no changes are needed.
 *
 * When nothing is filtered out, the **same** object reference is returned (not a
 * copy) — callers relying on referential equality for memoization can depend on
 * this. Only own enumerable string keys are considered.
 *
 * @param object - The object to filter
 * @param predicate - Function that tests each key-value pair
 * @returns A new object with only the entries that pass the predicate, or the original object if unchanged
 * @example
 * ```ts
 * const scores = { alice: 85, bob: 92, charlie: 78 }
 * const passing = filterEntries(scores, (name, score) => score >= 80)
 * // { alice: 85, bob: 92 }
 * ```
 * @internal
 */
export function filterEntries<Key extends string, Value>(
	object: { [K in Key]: Value },
	predicate: (key: Key, value: Value) => boolean,
): { [K in Key]: Value } {
	const result: { [K in Key]?: Value } = {};
	let didChange = false;
	for (const key in object) {
		if (!Object.hasOwn(object, key)) continue;
		const value = object[key];
		if (predicate(key, value)) {
			result[key] = value;
		} else {
			didChange = true;
		}
	}
	return didChange ? (result as { [K in Key]: Value }) : object;
}

/**
 * Maps the values of an object to new values using a mapper function, preserving keys.
 * The mapper function receives both the key and value for each entry.
 *
 * @param object - The object whose values to transform
 * @param mapper - Function that transforms each value (receives key and value)
 * @returns A new object with the same keys but transformed values
 * @example
 * ```ts
 * const prices = { apple: 1.50, banana: 0.75, orange: 2.00 }
 * const withTax = mapObjectMapValues(prices, (fruit, price) => price * 1.08)
 * // { apple: 1.62, banana: 0.81, orange: 2.16 }
 * ```
 * @internal
 */
export function mapObjectMapValues<Key extends string, ValueBefore, ValueAfter>(
	object: { readonly [K in Key]: ValueBefore },
	mapper: (key: Key, value: ValueBefore) => ValueAfter,
): { [K in Key]: ValueAfter } {
	const result = {} as { [K in Key]: ValueAfter };
	for (const key in object) {
		if (!Object.hasOwn(object, key)) continue;
		result[key] = mapper(key, object[key]);
	}
	return result;
}

/**
 * Performs a shallow equality check between two objects. Compares all enumerable own properties
 * using Object.is for value comparison. Returns true if both objects have the same keys and values.
 *
 * @param obj1 - First object to compare
 * @param obj2 - Second object to compare
 * @returns True if objects are shallow equal, false otherwise
 * @example
 * ```ts
 * const a = { x: 1, y: 2 }
 * const b = { x: 1, y: 2 }
 * const c = { x: 1, y: 3 }
 * areObjectsShallowEqual(a, b) // true
 * areObjectsShallowEqual(a, c) // false
 * areObjectsShallowEqual(a, a) // true (same reference)
 * ```
 *
 * @see {@link https://www.npmjs.com/package/@resq-systems/types | `@resq-systems/types/equivalence`}
 *   — this is an `Equivalence<T>` instance, not a function that takes one. Its
 *   per-key relation is `Object.is`, which is `eqSameValue()` in that module's
 *   vocabulary and the reason it ships `eqSameValue` alongside `eqStrict`:
 *   `NaN` values compare equal and `0` / `-0` compare unequal. The key set it
 *   compares is the own **enumerable** keys, exactly what `Object.keys` returns,
 *   so a non-enumerable own property is invisible to both operands and the
 *   relation stays symmetric. `structOf` is the typed counterpart when the key
 *   set is known ahead of time; `recordOf` when it is not. Kept here as a plain
 *   `export function` so the emitted declaration form does not change.
 * @internal
 */
export function areObjectsShallowEqual<T extends object>(obj1: T, obj2: T): boolean {
	if (obj1 === obj2) return true;
	const keys1 = Object.keys(obj1);
	// Membership must use the same notion of "key" as the count — own
	// *enumerable*. Testing with `hasOwnProperty` while counting with
	// `Object.keys` made the relation asymmetric, because a non-enumerable own
	// key satisfies the former without ever being counted by the latter.
	const keys2 = new Set(Object.keys(obj2));
	if (keys1.length !== keys2.size) return false;
	for (const key of keys1) {
		if (!keys2.has(key)) return false;
		if (
			!Object.is(
				(obj1 as Record<PropertyKey, unknown>)[key],
				(obj2 as Record<PropertyKey, unknown>)[key],
			)
		)
			return false;
	}
	return true;
}

/**
 * Groups an array of values into a record by a key extracted from each value.
 * The key selector function is called for each element to determine the grouping key.
 *
 * @param array - The array to group
 * @param keySelector - Function that extracts the grouping key from each value
 * @returns A record where keys are the extracted keys and values are arrays of grouped items
 * @example
 * ```ts
 * const people = [
 *   { name: 'Alice', age: 25 },
 *   { name: 'Bob', age: 30 },
 *   { name: 'Charlie', age: 25 }
 * ]
 * const byAge = groupBy(people, person => `age-${person.age}`)
 * // { 'age-25': [Alice, Charlie], 'age-30': [Bob] }
 * ```
 * @internal
 */
export function groupBy<K extends string, V>(
	array: ReadonlyArray<V>,
	keySelector: (value: V) => K,
): Record<K, V[]> {
	const result = {} as Record<K, V[]>;
	for (const value of array) {
		const key = keySelector(value);
		if (!result[key]) result[key] = [];
		result[key].push(value);
	}
	return result;
}

/**
 * Creates a new object with specified keys omitted from the original object.
 * Uses shallow copying and then deletes the unwanted keys.
 *
 * @param obj - The source object
 * @param keys - Array of key names to omit from the result
 * @returns A new object without the specified keys
 * @example
 * ```ts
 * const user = { id: '123', name: 'Alice', password: 'secret', email: 'alice@example.com' }
 * const publicUser = omit(user, ['password'])
 * // { id: '123', name: 'Alice', email: 'alice@example.com' }
 * ```
 * @internal
 */
export function omit(
	obj: Record<string, unknown>,
	keys: ReadonlyArray<string>,
): Record<string, unknown> {
	const result = { ...obj };
	for (const key of keys) {
		delete result[key];
	}
	return result;
}

/**
 * Compares two objects and returns an array of keys where the values differ.
 * Uses Object.is for comparison, which handles NaN and -0/+0 correctly.
 * Only checks keys present in the first object.
 *
 * @param obj1 - The first object (keys to check come from this object)
 * @param obj2 - The second object to compare against
 * @returns Array of keys where values differ between the objects
 * @example
 * ```ts
 * const before = { name: 'Alice', age: 25, city: 'NYC' }
 * const after = { name: 'Alice', age: 26, city: 'NYC' }
 * const changed = getChangedKeys(before, after)
 * // ['age']
 * ```
 * @internal
 */
export function getChangedKeys<T extends object>(obj1: T, obj2: T): (keyof T)[] {
	const result: (keyof T)[] = [];
	for (const key in obj1) {
		if (!Object.is(obj1[key], obj2[key])) {
			result.push(key);
		}
	}
	return result;
}

/**
 * Deep equality comparison that allows for floating-point precision errors.
 * Numbers are considered equal if they differ by less than the threshold.
 * Uses lodash.isequalwith internally for the deep comparison logic.
 *
 * Only the numeric leaves are tolerance-compared (`Math.abs(a - b) < threshold`,
 * a strict `<`); every other value falls back to lodash's deep structural
 * equality. Because the comparison is `NaN`-unaware, two `NaN` leaves are treated
 * as unequal.
 *
 * @param obj1 - First object to compare
 * @param obj2 - Second object to compare
 * @param threshold - Maximum absolute difference two numbers may have and still
 *   count as equal (default: `0.000001`). Must be non-negative; a `0` threshold
 *   makes numbers effectively exact (any difference fails).
 * @returns True if objects are deeply equal with floating-point tolerance
 * @example
 * ```ts
 * const a = { x: 0.1 + 0.2 } // 0.30000000000000004
 * const b = { x: 0.3 }
 * isEqualAllowingForFloatingPointErrors(a, b) // true
 *
 * const c = { coords: [1.0000001, 2.0000001] }
 * const d = { coords: [1.0000002, 2.0000002] }
 * isEqualAllowingForFloatingPointErrors(c, d) // true
 * ```
 *
 * @see {@link https://www.npmjs.com/package/@resq-systems/types | `@resq-systems/types/equivalence`}
 *   — with `threshold` applied this is an `Equivalence<object>`, but it stays in
 *   this package permanently: it is built on `lodash.isequalwith`, a **runtime**
 *   dependency, and `@resq-systems/types` is zero-runtime-dep. Note also that
 *   approximate numeric equality is not transitive, so this relation does not
 *   satisfy the `Equivalence` laws for values near the threshold and must not be
 *   fed to `combine` / `arrayOf` / `structOf` as if it did.
 * @internal
 */
export function isEqualAllowingForFloatingPointErrors(
	obj1: object,
	obj2: object,
	threshold = 0.000001,
): boolean {
	return isEqualWith(obj1, obj2, (value1, value2) => {
		if (typeof value1 === "number" && typeof value2 === "number") {
			return Math.abs(value1 - value2) < threshold;
		}
		return undefined;
	});
}
