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
 * @fileoverview Type-level tests. Every `Expect<...>` line is a compile-time
 * assertion — this file failing to type-check IS the test failure. Run via
 * `vitest --typecheck` (wired into this package's `test` script).
 */

import { test } from "vitest";
import type { Brand, Opaque } from "./brand.js";
import type {
	Concat,
	Flatten,
	Head,
	Includes,
	IsUnion,
	Last,
	Length,
	NonEmptyArray,
	NumberRange,
	Reverse,
	Tail,
	TupleToUnion,
	UnionToIntersection,
	UnionToTuple,
	Zip,
} from "./collection.js";
import type { PositiveInt, UnitInterval } from "./numeric.js";
import type {
	DeepNonNullable,
	DeepPartial,
	DeepReadonly,
	Entries,
	Merge,
	Mutable,
	OmitByType,
	PickByType,
	RemoveIndexSignature,
	RequireExactlyOne,
	Simplify,
	ValueOf,
	XOR,
} from "./object.js";
import type { EndsWith, Join, LiteralUnion, ParseInt, Split, StartsWith, Trim } from "./string.js";
import type { Equal, Expect, IsAny, IsNever, IsUnknown } from "./testing.js";

// --- testing kit self-checks --------------------------------------------------
// biome-ignore lint/suspicious/noExplicitAny: type-level tests must reference the `any` type to verify IsAny/Equal behavior
type Any = any;

type _testing = [
	Expect<Equal<1, 1>>,
	Expect<Equal<IsAny<Any>, true>>,
	Expect<Equal<IsAny<unknown>, false>>,
	Expect<Equal<IsNever<never>, true>>,
	Expect<Equal<IsNever<0>, false>>,
	Expect<Equal<IsUnknown<unknown>, true>>,
	Expect<Equal<IsUnknown<Any>, false>>,
	Expect<Equal<Equal<Any, unknown>, false>>,
];

// --- brands -------------------------------------------------------------------
type Email = Brand<string, "Email">;
type UserId = Brand<string, "UserId">;
type DoubleBranded = Brand<Brand<string, "A">, "B">;

type _brands = [
	// A brand is assignable TO its carrier...
	Expect<Equal<Email extends string ? true : false, true>>,
	// ...but a bare carrier is NOT assignable to the brand.
	Expect<Equal<string extends Email ? true : false, false>>,
	// Distinct brands over the same carrier are not interchangeable.
	Expect<Equal<Email extends UserId ? true : false, false>>,
	// Opaque is a structural alias of Brand.
	Expect<Equal<Opaque<string, "Email">, Email>>,
	// Brands compose: a doubly-branded value satisfies both brands.
	Expect<Equal<DoubleBranded extends Brand<string, "A"> ? true : false, true>>,
	Expect<Equal<DoubleBranded extends Brand<string, "B"> ? true : false, true>>,
	// Branded numerics are still numbers.
	Expect<Equal<PositiveInt extends number ? true : false, true>>,
	Expect<Equal<number extends UnitInterval ? true : false, false>>,
];

// --- object utilities ---------------------------------------------------------
type _object = [
	Expect<Equal<Mutable<{ readonly a: 1 }>, { a: 1 }>>,
	Expect<Equal<Simplify<{ a: 1 } & { b: 2 }>, { a: 1; b: 2 }>>,
	Expect<Equal<ValueOf<{ a: 1; b: 2 }>, 1 | 2>>,
	Expect<Equal<Entries<{ a: 1; b: 2 }>, ["a", 1] | ["b", 2]>>,
	Expect<Equal<DeepReadonly<{ a: { b: number } }>, { readonly a: { readonly b: number } }>>,
	Expect<Equal<DeepPartial<{ a: { b: number } }>, { a?: { b?: number } }>>,
	// Functions survive DeepReadonly untouched.
	Expect<Equal<DeepReadonly<{ fn: () => void }>, { readonly fn: () => void }>>,
];

type OneOf = RequireExactlyOne<{ sync: number; async: number }, "sync" | "async">;
type _exactlyOne = [
	// Supplying exactly one key is valid.
	Expect<Equal<{ sync: number } extends OneOf ? true : false, true>>,
	// Supplying both keys is invalid.
	Expect<Equal<{ sync: number; async: number } extends OneOf ? true : false, false>>,
];

// --- collection utilities -----------------------------------------------------
type _collection = [
	Expect<Equal<Head<[1, 2, 3]>, 1>>,
	Expect<Equal<Tail<[1, 2, 3]>, [2, 3]>>,
	Expect<Equal<Last<[1, 2, 3]>, 3>>,
	Expect<Equal<Length<[1, 2, 3]>, 3>>,
	Expect<Equal<Reverse<[1, 2, 3]>, [3, 2, 1]>>,
	Expect<Equal<Concat<[1], [2, 3]>, [1, 2, 3]>>,
	Expect<Equal<TupleToUnion<["a", "b", "c"]>, "a" | "b" | "c">>,
	Expect<Equal<Includes<[1, 2, 3], 2>, true>>,
	Expect<Equal<Includes<[1, 2, 3], 9>, false>>,
	Expect<Equal<IsUnion<"a" | "b">, true>>,
	Expect<Equal<IsUnion<"a">, false>>,
	Expect<Equal<IsUnion<never>, false>>,
	Expect<Equal<UnionToIntersection<{ a: 1 } | { b: 2 }>, { a: 1 } & { b: 2 }>>,
];

// --- string utilities ---------------------------------------------------------
type _string = [
	Expect<Equal<Trim<"  hi  ">, "hi">>,
	Expect<Equal<Split<"a.b.c", ".">, ["a", "b", "c"]>>,
	Expect<Equal<Join<["a", "b", "c"], ".">, "a.b.c">>,
	Expect<Equal<StartsWith<"https://x", "https">, true>>,
	Expect<Equal<StartsWith<"http://x", "https">, false>>,
	Expect<Equal<EndsWith<"file.ts", ".ts">, true>>,
	// LiteralUnion still accepts arbitrary strings.
	Expect<Equal<"anything" extends LiteralUnion<"a" | "b"> ? true : false, true>>,
];

// --- curated additions (ported from the shared collection, zero-any) ----------
type _added = [
	// collection
	Expect<Equal<[] extends NonEmptyArray<number> ? true : false, false>>,
	Expect<Equal<[1] extends NonEmptyArray<number> ? true : false, true>>,
	Expect<Equal<Flatten<[[1, 2], [3]]>, [1, 2, 3]>>,
	Expect<Equal<Zip<[1, 2], ["a", "b"]>, [[1, "a"], [2, "b"]]>>,
	Expect<Equal<UnionToTuple<never>, []>>,
	Expect<Equal<Length<UnionToTuple<"a" | "b" | "c">>, 3>>,
	// inclusive integer ranges as literal unions
	Expect<Equal<NumberRange<2, 5>, 2 | 3 | 4 | 5>>,
	Expect<Equal<NumberRange<0, 2>, 0 | 1 | 2>>,
	Expect<Equal<NumberRange<5, 5>, 5>>,
	// order is compiler-defined, so assert the round-trip set instead
	Expect<Equal<TupleToUnion<UnionToTuple<"a" | "b">>, "a" | "b">>,
	// object
	Expect<Equal<Merge<{ a: 1; b: 2 }, { b: 3; c: 4 }>, { a: 1; b: 3; c: 4 }>>,
	Expect<Equal<PickByType<{ a: string; b: number }, string>, { a: string }>>,
	Expect<Equal<OmitByType<{ a: string; b: number }, string>, { b: number }>>,
	Expect<Equal<DeepNonNullable<{ a: { b: number | null } }>, { a: { b: number } }>>,
	Expect<Equal<RemoveIndexSignature<{ a: 1; [k: string]: unknown }>, { a: 1 }>>,
	// XOR forbids mixing the two branches...
	Expect<
		Equal<
			{ id: string; email: string } extends XOR<{ id: string }, { email: string }> ? true : false,
			false
		>
	>,
	// ...but accepts exactly one.
	Expect<Equal<{ id: string } extends XOR<{ id: string }, { email: string }> ? true : false, true>>,
	// string
	Expect<Equal<ParseInt<"42">, 42>>,
	Expect<Equal<ParseInt<"nope">, never>>,
];

test("type-level assertions compile", () => {
	// The assertions above are enforced by the typechecker; if any Expect<...>
	// resolved to a non-`true` type, this file would fail to compile and
	// `vitest --typecheck` would report it. Referencing the tuples here keeps them
	// "used" without exporting from a test file.
	type _all = [_testing, _brands, _object, _exactlyOne, _collection, _string, _added];
	const _assertions: _all | undefined = undefined;
	void _assertions;
});
