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
 * A string made up of an integer part followed by a fraction part.
 */
export type IndexKey = string & { __brand: "indexKey" };

/**
 * The index key for the first index - 'a0'.
 */
export const ZERO_INDEX_KEY = "a0" as IndexKey;

/**
 * Validates that a string is a valid IndexKey.
 */
export function validateIndexKey(index: string): asserts index is IndexKey {
	try {
		validateOrderKey(index);
	} catch {
		throw new Error(`invalid index: ${index}`);
	}
}

/**
 * Get a number of indices between two indices.
 */
export function getIndicesBetween(
	below: IndexKey | null | undefined,
	above: IndexKey | null | undefined,
	n: number,
): IndexKey[] {
	return generateKeysFn(below ?? null, above ?? null, n) as IndexKey[];
}

/**
 * Get a number of indices above an index.
 */
export function getIndicesAbove(below: IndexKey | null | undefined, n: number): IndexKey[] {
	return generateKeysFn(below ?? null, null, n) as IndexKey[];
}

/**
 * Get a number of indices below an index.
 */
export function getIndicesBelow(above: IndexKey | null | undefined, n: number): IndexKey[] {
	return generateKeysFn(null, above ?? null, n) as IndexKey[];
}

/**
 * Get the index between two indices.
 */
export function getIndexBetween(
	below: IndexKey | null | undefined,
	above: IndexKey | null | undefined,
): IndexKey {
	return generateKeysFn(below ?? null, above ?? null, 1)[0] as IndexKey;
}

/**
 * Get the index above a given index.
 */
export function getIndexAbove(below: IndexKey | null | undefined = null): IndexKey {
	return generateKeysFn(below, null, 1)[0] as IndexKey;
}

/**
 * Get the index below a given index.
 */
export function getIndexBelow(above: IndexKey | null | undefined = null): IndexKey {
	return generateKeysFn(null, above, 1)[0] as IndexKey;
}

/**
 * Get n number of indices, starting at an index.
 */
export function getIndices(n: number, start = "a1" as IndexKey): IndexKey[] {
	return [start, ...generateKeysFn(start, null, n)] as IndexKey[];
}

/**
 * Sort by index.
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
 * Sort by index, or null.
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
