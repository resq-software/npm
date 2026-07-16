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
 * Compares two objects by their id property for use with Array.sort().
 * Sorts objects in ascending order based on their id values.
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
 * @public
 */
export function sortById<T extends { id: any }>(a: T, b: T) {
	if (a.id > b.id) return 1;
	if (a.id < b.id) return -1;
	return 0;
}
