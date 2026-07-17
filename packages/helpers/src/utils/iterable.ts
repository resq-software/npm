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
 * @fileoverview Iterable helpers — read the first value out of a `Set` or `Map`
 * without materializing an intermediate array.
 *
 * @module @resq-systems/helpers/utils/iterable
 */

/**
 * Get the first item from an iterable Set or Map.
 *
 * "First" is defined by iteration order, which for both `Set` and `Map` is
 * insertion order — so this returns the earliest-inserted value. For a `Map` the
 * value (not the key) is returned. Reads a single element without materializing
 * an array.
 *
 * @template T - The element type for a `Set`, or the value type for a `Map` (its
 *   key type is intentionally unconstrained).
 * @param set - The iterable Set or Map to get the first item from
 * @returns The first value from the Set or Map, or `undefined` if it is empty
 * @example
 * ```ts
 * const A = getFirstFromIterable(new Set([1, 2, 3])) // 1
 * const B = getFirstFromIterable(
 * 	new Map([
 * 		['a', 1],
 * 		['b', 2],
 * 	])
 * ) // 1
 * ```
 * @public
 */
export function getFirstFromIterable<T = unknown>(set: Set<T> | Map<any, T>): T | undefined {
	return set.values().next().value;
}
