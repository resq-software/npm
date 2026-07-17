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
 * @fileoverview Tuple and union type utilities.
 *
 * @module @resq-systems/types/collection
 *
 * The building blocks behind "derive a literal union from a `readonly` config
 * tuple", "does this union have more than one member", and variadic-tuple
 * manipulation. These are the type-challenges classics, curated to the handful
 * that recur in real library code.
 */

//#region Tuples

/** The first element of a tuple, or `never` for the empty tuple. */
export type Head<T extends readonly unknown[]> = T extends readonly [infer H, ...unknown[]]
	? H
	: never;

/** Everything after the first element of a tuple (the empty tuple if `T` is empty). */
export type Tail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer R] ? R : [];

/** The last element of a tuple, or `never` for the empty tuple. */
export type Last<T extends readonly unknown[]> = T extends readonly [...unknown[], infer L]
	? L
	: never;

/** The compile-time length of a tuple as a numeric literal. */
export type Length<T extends readonly unknown[]> = T["length"];

/** Prepend `E` to the front of tuple `T`. */
export type Unshift<T extends readonly unknown[], E> = [E, ...T];

/** Append `E` to the end of tuple `T`. */
export type Push<T extends readonly unknown[], E> = [...T, E];

/** Concatenate two tuples. */
export type Concat<A extends readonly unknown[], B extends readonly unknown[]> = [...A, ...B];

/** Reverse a tuple's element order. */
export type Reverse<T extends readonly unknown[]> = T extends readonly [infer H, ...infer R]
	? [...Reverse<R>, H]
	: [];

/**
 * Collapse a tuple into the union of its element types —
 * `TupleToUnion<["a", "b"]>` is `"a" | "b"`. The idiomatic way to turn a
 * `readonly [...] as const` allow-list into a validating literal union.
 */
export type TupleToUnion<T extends readonly unknown[]> = T[number];

/** `true` when a tuple has no elements. */
export type IsEmpty<T extends readonly unknown[]> = T extends readonly [] ? true : false;

/** Whether `T` includes the element `E` (structural equality). */
export type Includes<T extends readonly unknown[], E> = T extends readonly [infer H, ...infer R]
	? [E] extends [H]
		? [H] extends [E]
			? true
			: Includes<R, E>
		: Includes<R, E>
	: false;

//#endregion

//#region Unions

/**
 * Convert a union into the intersection of its members —
 * `UnionToIntersection<{ a: 1 } | { b: 2 }>` is `{ a: 1 } & { b: 2 }`. Built on
 * the contravariant-parameter inference trick; the foundational primitive for
 * most union manipulation.
 */
export type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
	k: infer I,
) => void
	? I
	: never;

/**
 * `true` when `T` is a union of two or more distinct members. `boolean` counts —
 * it is `true | false` internally, so `IsUnion<boolean>` is `true`. `never` is
 * not a union (`IsUnion<never>` is `false`). The `U` parameter is an internal
 * accumulator that preserves the original union while `T` distributes; do not
 * pass it.
 */
export type IsUnion<T, U = T> = [T] extends [never]
	? false
	: T extends unknown
		? [U] extends [T]
			? false
			: true
		: never;

/** The "last" member of a union, per the compiler's internal ordering. */
export type LastInUnion<U> =
	UnionToIntersection<U extends unknown ? (x: U) => void : never> extends (x: infer L) => void
		? L
		: never;

/**
 * Convert a union into a tuple of its members. Order follows the compiler's
 * internal union ordering, so treat the *set* of elements as meaningful and the
 * order as incidental. Useful for iterating a union at the type level.
 *
 * `UnionToTuple<"a" | "b">` is `["a", "b"]` (or `["b", "a"]`, version-dependent).
 */
export type UnionToTuple<U> =
	LastInUnion<U> extends infer L
		? [U] extends [never]
			? []
			: [...UnionToTuple<Exclude<U, L>>, L]
		: never;

//#endregion

//#region Shape helpers

/**
 * An array guaranteed to hold at least one element. Assigning `[]` to a
 * `NonEmptyArray<T>` is a compile error — handy for "you must supply at least
 * one target / recipient / allowed origin" APIs.
 */
export type NonEmptyArray<T> = [T, ...T[]];

/** A readonly array guaranteed to hold at least one element. */
export type ReadonlyNonEmptyArray<T> = readonly [T, ...T[]];

/**
 * Flatten a tuple of tuples by one level —
 * `Flatten<[[1, 2], [3]]>` is `[1, 2, 3]`.
 */
export type Flatten<T extends readonly unknown[]> = T extends readonly [
	infer First extends readonly unknown[],
	...infer Rest extends readonly unknown[][],
]
	? [...First, ...Flatten<Rest>]
	: [];

/**
 * Pair up two tuples element-wise into a tuple of pairs, stopping at the
 * shorter length — `Zip<[1, 2], ["a", "b"]>` is `[[1, "a"], [2, "b"]]`.
 */
export type Zip<T extends readonly unknown[], U extends readonly unknown[]> = T extends readonly [
	infer A,
	...infer RestT,
]
	? U extends readonly [infer B, ...infer RestU]
		? [[A, B], ...Zip<RestT, RestU>]
		: []
	: [];

//#endregion

//#region Numeric literal ranges

/**
 * The union of non-negative integer literals strictly below `N` —
 * `Enumerate<3>` is `0 | 1 | 2`. The engine behind {@link NumberRange}. Bounded
 * by the TypeScript recursion limit, so keep `N` below ~1000. `Enumerate<0>` is
 * `never` (no literals below zero). The `Acc` parameter is an internal
 * tuple-length accumulator; do not pass it.
 */
export type Enumerate<N extends number, Acc extends number[] = []> = Acc["length"] extends N
	? Acc[number]
	: Enumerate<N, [...Acc, Acc["length"]]>;

/**
 * The union of integer literals in the **inclusive** range `[Low, High]` —
 * `NumberRange<2, 5>` is `2 | 3 | 4 | 5`. Turns a bounded numeric domain (an RGB
 * channel `0..255`, an HTTP status `100..599`, a percentage `0..100`) into an
 * exact literal type the compiler checks at call sites.
 *
 * The bounds are materialized as tuples, so keep `High` below ~1000 (the
 * TypeScript instantiation-depth limit); past that, reach for a branded numeric
 * instead.
 */
export type NumberRange<Low extends number, High extends number> =
	| Exclude<Enumerate<High>, Enumerate<Low>>
	| High;

//#endregion
