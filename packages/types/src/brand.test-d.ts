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
 * @fileoverview Type-level tests for `brand.ts`. Every `Expect<...>` line is a
 * compile-time assertion; one that resolves to anything but `true` fails to
 * compile. Run via `vitest --typecheck` (wired into this package's `test`
 * script) and by `tsc --noEmit`.
 *
 * The six `Unbrand` cases below are **mandatory**. `Unbrand` has two mutually
 * necessary fallback branches, and dropping either one regresses silently — you
 * get a still-branded type back rather than a compile error.
 */

import { test } from "vitest";
import {
	type Brand,
	type BrandRefiner,
	type BrandsOf,
	brandRefiner,
	type HasBrand,
	type Opaque,
	refineAll,
	type Tag,
	type Unbrand,
} from "./brand.js";
import type { Equal, Expect, IsAny } from "./testing.js";

type Email = Brand<string, "Email">;
type UserId = Brand<string, "UserId">;
type Verified = Brand<Email, "Verified">;
type UnionKeyed = Brand<string, "Email" | "Verified">;
type Score = Brand<number, "Score">;
type SymbolKeyed = Brand<string, symbol>;

// --- BrandsOf: recover the brand key union ------------------------------------
type _brandsOf = [
	Expect<Equal<BrandsOf<Email>, "Email">>,
	// An unbranded type has no `Tag` to match, so the conditional yields `never`.
	Expect<Equal<BrandsOf<string>, never>>,
	Expect<Equal<BrandsOf<number>, never>>,
	Expect<Equal<BrandsOf<{ a: 1 }>, never>>,
	// Inference distributes across intersected tags, so nesting yields a union.
	Expect<Equal<BrandsOf<Verified>, "Email" | "Verified">>,
	// ...and the union-key spelling gives the same answer.
	Expect<Equal<BrandsOf<UnionKeyed>, "Email" | "Verified">>,
	Expect<Equal<BrandsOf<Verified>, BrandsOf<UnionKeyed>>>,
	// `Opaque` is an alias, not a second mechanism.
	Expect<Equal<BrandsOf<Opaque<string, "Email">>, "Email">>,
	// Symbol brands survive — `Tag`'s key is `PropertyKey`, not `string`.
	Expect<Equal<BrandsOf<SymbolKeyed>, symbol>>,
	Expect<Equal<IsAny<BrandsOf<Email>>, false>>,
];

// --- Unbrand: recover the carrier ---------------------------------------------
// THE SIX MANDATORY CASES. The two-branch fallback in `Unbrand` is load-bearing:
// `StripIntersection` alone is wrong on the union-key spelling and
// `StripUnionForm` alone is wrong on the nested spelling.
type _unbrandMandatory = [
	Expect<Equal<Unbrand<Brand<string, "Email">>, string>>,
	Expect<Equal<Unbrand<Brand<Brand<string, "A">, "B">>, string>>,
	Expect<Equal<Unbrand<Brand<string, "A" | "B">>, string>>,
	Expect<Equal<Unbrand<Brand<number, "Score">>, number>>,
	Expect<Equal<Unbrand<string>, string>>,
	Expect<Equal<Unbrand<{ a: 1 }>, { a: 1 }>>,
];

type _unbrandMore = [
	Expect<Equal<Unbrand<Email>, string>>,
	Expect<Equal<Unbrand<Verified>, string>>,
	Expect<Equal<Unbrand<UnionKeyed>, string>>,
	Expect<Equal<Unbrand<Score>, number>>,
	// Unbranded types pass through untouched.
	Expect<Equal<Unbrand<number>, number>>,
	Expect<Equal<Unbrand<boolean>, boolean>>,
	Expect<Equal<Unbrand<readonly string[]>, readonly string[]>>,
	// A literal carrier is preserved, not widened.
	Expect<Equal<Unbrand<Brand<"a", "Letter">>, "a">>,
	// Both spellings of the same brand set agree.
	Expect<Equal<Unbrand<Verified>, Unbrand<UnionKeyed>>>,
	Expect<Equal<IsAny<Unbrand<Email>>, false>>,
];

// --- HasBrand -----------------------------------------------------------------
type _hasBrand = [
	Expect<Equal<HasBrand<Brand<Brand<string, "A">, "B">, "A">, true>>,
	Expect<Equal<HasBrand<Brand<Brand<string, "A">, "B">, "B">, true>>,
	Expect<Equal<HasBrand<Email, "Email">, true>>,
	Expect<Equal<HasBrand<Email, "Nope">, false>>,
	Expect<Equal<HasBrand<string, "Email">, false>>,
	Expect<Equal<HasBrand<Verified, "Email">, true>>,
	Expect<Equal<HasBrand<UnionKeyed, "Verified">, true>>,
	// `T` is wrapped in a tuple, so a union answers `true` only when EVERY member
	// carries the brand.
	Expect<Equal<HasBrand<Email | UserId, "Email">, false>>,
	Expect<Equal<HasBrand<Email | Verified, "Email">, true>>,
];

// --- refineAll: inference ------------------------------------------------------
const nonEmpty = brandRefiner<string, "NonEmpty">((s) => s.length > 0, "non-empty");
const trimmed = brandRefiner<string, "Trimmed">((s) => s === s.trim(), "trimmed");
const lower = brandRefiner<string, "Lower">((s) => s === s.toLowerCase(), "lower-case");
const positive = brandRefiner<number, "Positive">((n) => n > 0, "positive");

const one = refineAll(nonEmpty);
const two = refineAll(nonEmpty, trimmed);
const three = refineAll(nonEmpty, trimmed, lower);
const onlyNumbers = refineAll(positive);

type _refineAll = [
	// The carrier is preserved. The naive mapped-tuple signature collapses it to
	// `unknown`, which is exactly what these assertions pin.
	Expect<Equal<typeof one, BrandRefiner<string, "NonEmpty">>>,
	Expect<Equal<typeof two, BrandRefiner<string, "NonEmpty" | "Trimmed">>>,
	Expect<Equal<typeof three, BrandRefiner<string, "NonEmpty" | "Trimmed" | "Lower">>>,
	Expect<Equal<typeof onlyNumbers, BrandRefiner<number, "Positive">>>,
	// Each member of the bundle is exactly typed.
	Expect<Equal<ReturnType<(typeof two)["from"]>, Brand<string, "NonEmpty" | "Trimmed">>>,
	Expect<Equal<ReturnType<(typeof two)["coerce"]>, Brand<string, "NonEmpty" | "Trimmed"> | null>>,
	Expect<Equal<ReturnType<(typeof two)["unsafe"]>, Brand<string, "NonEmpty" | "Trimmed">>>,
	Expect<Equal<Parameters<(typeof two)["from"]>, [value: string]>>,
	// The combined brand set is what `BrandsOf` reports, and the carrier survives.
	Expect<Equal<BrandsOf<ReturnType<(typeof two)["from"]>>, "NonEmpty" | "Trimmed">>,
	Expect<Equal<Unbrand<ReturnType<(typeof two)["from"]>>, string>>,
	Expect<Equal<IsAny<ReturnType<(typeof two)["from"]>>, false>>,
];

// --- refineAll: the combined value satisfies each brand independently -----------
declare function wantsNonEmpty(value: Brand<string, "NonEmpty">): void;
declare function wantsTrimmed(value: Brand<string, "Trimmed">): void;
declare function wantsBoth(value: Brand<string, "NonEmpty"> & Brand<string, "Trimmed">): void;

function _assignability(): void {
	const combined = two.from("hello");
	wantsNonEmpty(combined);
	wantsTrimmed(combined);
	wantsBoth(combined);
	// ...and it is still a plain string.
	const carrier: string = combined;
	void carrier;
	// A single-brand value is NOT accepted where a different brand is required.
	const single = nonEmpty.from("hello");
	// @ts-expect-error - `Trimmed` has not been proven for this value.
	wantsTrimmed(single);
	// A raw string is never accepted.
	// @ts-expect-error - construction must go through a refiner.
	wantsNonEmpty("hello");
}

function _carrierMismatch(): void {
	// The carrier is pinned by the first refiner; a later refiner over a different
	// carrier is a compile error on that argument.
	// @ts-expect-error - `BrandRefiner<number, "Positive">` is not a string refiner.
	const bad = refineAll(nonEmpty, positive);
	void bad;
}

// --- the frozen surface is unchanged -------------------------------------------
type _frozen = [
	Expect<Equal<Brand<string, "Email">, string & Tag<"Email">>>,
	Expect<Equal<Opaque<string, "Email">, Brand<string, "Email">>>,
	Expect<Equal<ReturnType<typeof brandRefiner<string, "Email">>, BrandRefiner<string, "Email">>>,
];

test("type-level assertions compile", () => {
	// The assertions above are enforced by the typechecker; if any Expect<...>
	// resolved to a non-`true` type, this file would fail to compile and
	// `vitest --typecheck` would report it. Referencing the tuples here keeps them
	// "used" without exporting from a test file.
	type _all = [
		_brandsOf,
		_unbrandMandatory,
		_unbrandMore,
		_hasBrand,
		_refineAll,
		_frozen,
		typeof _assignability,
		typeof _carrierMismatch,
	];
	const _cases: _all | undefined = undefined;
	void _cases;
});
