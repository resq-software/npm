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
 * @fileoverview Comparator helpers — `sortById` orders objects ascending by their
 * `id` for use with `Array.prototype.sort`.
 *
 * @module @resq-systems/helpers/utils/sort
 */

import type { Ordering } from "@resq-systems/types/order";

/**
 * Compares two objects by their id property for use with Array.sort().
 * Sorts objects in ascending order based on their id values.
 *
 * Ordering is by the `<` / `>` relational operators, so it is well-defined for
 * string or numeric ids but yields `0` (treated as equal) whenever neither
 * comparison is true — e.g. `NaN` ids or mutually incomparable types — which
 * leaves such elements in their original relative order.
 *
 * The return type is named `Ordering` (`-1 | 0 | 1`) from
 * `@resq-systems/types/order`. That is the same union the body already inferred,
 * so nothing about what this function accepts or returns has changed — it is
 * only spelled with the shared vocabulary now. Two consequences worth knowing:
 * `sortById` is **assignable to** `Order<T>` from that module, and because
 * `-1 | 0 | 1` widens to `number`, it is also assignable to
 * `@resq-systems/dsa`'s `CompareFn<T>` with no adapter and no dependency edge in
 * either direction.
 *
 * Assignable is not the same as lawful. `Order<A>` documents reflexivity,
 * antisymmetry and transitivity as laws, and this relation satisfies none of
 * them universally: `NaN` ids make the equality kernel non-transitive
 * (`cmp(1, NaN) === 0` and `cmp(NaN, 2) === 0` but `cmp(1, 2) === -1`), and the
 * declared bound permits mixed `string` / `number` ids, where relational
 * coercion makes `"2" < 10` but `"2" > "10"`. Sorting the same multiset can
 * therefore give different answers depending on input order. Do not feed
 * `sortById` to `min`, `max`, `clamp`, `isBetween` or `toEquivalence`, all of
 * which assume the laws hold. For a lawful order over ids, build one with
 * `mapInput(orderString, …)` or `mapInput(orderNumber, …)` over a homogeneous
 * id type.
 *
 * Migration note, recorded rather than acted on: ids are compared with the bare
 * `<` / `>` relational operators, which is **not** the same relation as
 * `orderString` or `orderNumber`. On a collection with mixed `string` and
 * `number` ids, JavaScript's relational coercion decides the outcome, so
 * swapping this body for either typed instance would change behavior. Do not
 * treat the two as interchangeable.
 *
 * @param a - First object to compare
 * @param b - Second object to compare
 * @returns 1 if a.id \> b.id, -1 if a.id \< b.id, 0 if a.id === b.id
 *
 * @example
 * ```ts
 * const items = [
 *   { id: 'c', name: 'Charlie' },
 *   { id: 'a', name: 'Alice' },
 *   { id: 'b', name: 'Bob' },
 * ]
 *
 * const sorted = items.sort(sortById)
 * // [{ id: 'a', name: 'Alice' }, { id: 'b', name: 'Bob' }, { id: 'c', name: 'Charlie' }]
 * ```
 *
 * @see {@link https://www.npmjs.com/package/@resq-systems/types | `@resq-systems/types/order`}
 *   for `Ordering`, the `Order<A>` contract this satisfies, and `fromCompare`
 *   for normalizing a loose `(a, b) => number` comparator into one.
 * @public
 */
export function sortById<T extends { id: string | number }>(a: T, b: T): Ordering {
	if (a.id > b.id) return 1;
	if (a.id < b.id) return -1;
	return 0;
}
