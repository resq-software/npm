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
 * @fileoverview Order-key (`IndexKey`) helpers for list reordering: generate,
 * validate, and compare fractional index keys built on the vendored
 * fractional-indexing primitives. Uses non-jittered keys under `NODE_ENV=test`
 * for deterministic output and jittered keys otherwise.
 *
 * @module @resq-systems/dsa/reordering
 */

import {
	generateNJitteredKeysBetween,
	generateNKeysBetween,
	validateOrderKey,
} from "./fractional-indexing.js";

const nodeProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } })
	.process;
const generateKeysFn =
	nodeProcess?.env?.NODE_ENV === "test" ? generateNKeysBetween : generateNJitteredKeysBetween;

/**
 * An order key: an integer part followed by an optional fraction part, whose
 * lexicographic (byte-wise) order *is* the intended list order — so two items
 * can be reordered by minting a key between their neighbours, never by
 * renumbering the rest.
 *
 * The `__brand` tag is nominal: a plain `string` is not assignable to
 * `IndexKey`. Mint a valid value through {@link ZERO_INDEX_KEY}, any of the
 * `getIndex*`/`getIndices*` generators (which return already-branded keys), or
 * by asserting an externally-sourced string with {@link validateIndexKey}. The
 * brand asserts canonical form (no reserved smallest-integer key, no trailing
 * zero); it is a convention, not a runtime-enforced guarantee, since the
 * generators cast their output rather than re-validate it.
 */
export type IndexKey = string & { __brand: "indexKey" };

/**
 * The canonical key for the very first list position — `"a0"`. Use it as the
 * `start` seed when building an ordering from scratch.
 */
export const ZERO_INDEX_KEY = "a0" as IndexKey;

/**
 * Assert that an externally-sourced string is a canonical {@link IndexKey},
 * narrowing it in place on success.
 *
 * @param index - The candidate key (e.g. read from storage or a request).
 * @throws {Error} With message `invalid index: <index>` when `index` is the
 *   reserved smallest-integer key or otherwise not a canonical order key.
 */
export function validateIndexKey(index: string): asserts index is IndexKey {
	try {
		validateOrderKey(index);
	} catch {
		throw new Error(`invalid index: ${index}`);
	}
}

/**
 * Generate `n` keys that sort strictly between two bounds, evenly spaced.
 *
 * Outside `NODE_ENV=test` the keys are jittered with `Math.random`, so the
 * exact strings returned are **non-deterministic** (see the module overview);
 * only their relative order (`below < result[i] < above`) is guaranteed.
 *
 * @param below - Lower bound, or `null`/`undefined` for "no lower bound".
 * @param above - Upper bound, or `null`/`undefined` for "no upper bound".
 * @param n - How many keys to mint. `0` returns an empty array without
 *   validating the bounds.
 * @returns `n` keys in ascending order.
 * @throws {Error} When `below` is not strictly less than `above`, or when
 *   either bound is a non-canonical order key.
 */
export function getIndicesBetween(
	below: IndexKey | null | undefined,
	above: IndexKey | null | undefined,
	n: number,
): IndexKey[] {
	return generateKeysFn(below ?? null, above ?? null, n) as IndexKey[];
}

/**
 * Generate `n` keys that all sort after `below`, evenly spaced.
 *
 * Jittered (non-deterministic strings) outside `NODE_ENV=test`; see
 * {@link getIndicesBetween}.
 *
 * @param below - Lower bound, or `null`/`undefined` to append from the start.
 * @param n - How many keys to mint. `0` returns an empty array.
 * @returns `n` keys in ascending order, each greater than `below`.
 * @throws {Error} When `below` is a non-canonical order key.
 */
export function getIndicesAbove(below: IndexKey | null | undefined, n: number): IndexKey[] {
	return generateKeysFn(below ?? null, null, n) as IndexKey[];
}

/**
 * Generate `n` keys that all sort before `above`, evenly spaced.
 *
 * Jittered (non-deterministic strings) outside `NODE_ENV=test`; see
 * {@link getIndicesBetween}.
 *
 * @param above - Upper bound, or `null`/`undefined` to prepend from the end.
 * @param n - How many keys to mint. `0` returns an empty array.
 * @returns `n` keys in ascending order, each less than `above`.
 * @throws {Error} When `above` is a non-canonical order key.
 */
export function getIndicesBelow(above: IndexKey | null | undefined, n: number): IndexKey[] {
	return generateKeysFn(null, above ?? null, n) as IndexKey[];
}

/**
 * Mint a single key that sorts strictly between two bounds.
 *
 * Jittered (non-deterministic string) outside `NODE_ENV=test`; see
 * {@link getIndicesBetween}.
 *
 * @param below - Lower bound, or `null`/`undefined` for "no lower bound".
 * @param above - Upper bound, or `null`/`undefined` for "no upper bound".
 * @returns A key `k` with `below < k < above`.
 * @throws {Error} When `below` is not strictly less than `above`, or when
 *   either bound is a non-canonical order key.
 */
export function getIndexBetween(
	below: IndexKey | null | undefined,
	above: IndexKey | null | undefined,
): IndexKey {
	return generateKeysFn(below ?? null, above ?? null, 1)[0] as IndexKey;
}

/**
 * Mint a single key that sorts after `below` (i.e. a new last item).
 *
 * Jittered (non-deterministic string) outside `NODE_ENV=test`; see
 * {@link getIndicesBetween}.
 *
 * @param below - The current last key, or `null` for an empty list.
 * @returns A key greater than `below`.
 * @throws {Error} When `below` is a non-canonical order key.
 */
export function getIndexAbove(below: IndexKey | null | undefined = null): IndexKey {
	return generateKeysFn(below, null, 1)[0] as IndexKey;
}

/**
 * Mint a single key that sorts before `above` (i.e. a new first item).
 *
 * Jittered (non-deterministic string) outside `NODE_ENV=test`; see
 * {@link getIndicesBetween}.
 *
 * @param above - The current first key, or `null` for an empty list.
 * @returns A key less than `above`.
 * @throws {Error} When `above` is a non-canonical order key.
 */
export function getIndexBelow(above: IndexKey | null | undefined = null): IndexKey {
	return generateKeysFn(null, above, 1)[0] as IndexKey;
}

/**
 * Build an initial run of `n + 1` ascending keys, with `start` as the first.
 *
 * The keys after `start` are jittered (non-deterministic strings) outside
 * `NODE_ENV=test`; see {@link getIndicesBetween}. `start` itself is returned
 * verbatim.
 *
 * @param n - How many keys to append after `start`.
 * @param start - The first key; defaults to `"a1"`.
 * @returns `n + 1` keys in ascending order, beginning with `start`.
 * @throws {Error} When `start` is a non-canonical order key.
 */
export function getIndices(n: number, start = "a1" as IndexKey): IndexKey[] {
	return [start, ...generateKeysFn(start, null, n)] as IndexKey[];
}

/**
 * Comparator ordering objects by their `index` key ascending (lexicographic).
 *
 * @returns `-1` if `a` sorts before `b`, `1` if after, `0` if the keys are
 *   equal. Suitable as an `Array.prototype.sort` callback.
 * @example
 * ```ts
 * const rows = [{ index: "a2" as IndexKey }, { index: "a1" as IndexKey }];
 * rows.sort(sortByIndex);
 * rows[0].index; // → "a1"
 * ```
 */
export function sortByIndex<T extends { index: IndexKey }>(a: T, b: T): number {
	if (a.index < b.index) {
		return -1;
	}
	if (a.index > b.index) {
		return 1;
	}
	return 0;
}

/**
 * Comparator ordering objects whose `index` may be missing. Items with an
 * index sort ascending among themselves; an item without an index (`null` or
 * `undefined`) always sorts *after* one that has an index. Two index-less
 * items compare equal.
 *
 * @returns A negative number, `0`, or a positive number per the usual
 *   comparator contract.
 */
export function sortByMaybeIndex<T extends { index?: IndexKey | null }>(a: T, b: T): number {
	if (a.index && b.index) {
		return a.index < b.index ? -1 : 1;
	}
	if (a.index && b.index == null) {
		return -1;
	}
	if (a.index == null && b.index == null) {
		return 0;
	}
	return 1;
}
