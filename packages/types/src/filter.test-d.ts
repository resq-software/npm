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
 * @fileoverview Type-level tests for `filter.ts`. Every `Expect<...>` line is a
 * compile-time assertion; the private `Complement` helper has no exported name,
 * so it is pinned through the public `fromPredicate` surface instead. Run via
 * `vitest --typecheck` (wired into this package's `test` script).
 */

import { test } from "vitest";
import {
	type Filter,
	compose,
	fromMaybe,
	fromPredicate,
	fromThrowing,
	make,
	mapFail,
	mapPass,
	or,
	toPredicate,
	toUndefined,
} from "./filter.js";
import type { NarrowError, NarrowResult } from "./narrow.js";
import type { Predicate, Refinement } from "./predicate.js";
import type { Equal, Expect, IsAny } from "./testing.js";

// --- fixtures -----------------------------------------------------------------

declare const isString: Refinement<unknown, string>;
declare const isNumber: Refinement<unknown, number>;
/** A guard whose domain is *not* `unknown`, so the complement is observable. */
declare const isStr: Refinement<string | number, string>;
/** A refinement that does not actually narrow — the `Exclude<A, A> = never` trap. */
declare const isSelf: Refinement<string, string>;
declare const isShort: Predicate<string>;

type Animal = { readonly kind: "cat" | "dog" };
type Cat = { readonly kind: "cat" };
type Dog = { readonly kind: "dog" };

// --- Filter is exactly a NarrowResult-returning function -----------------------
type _carrier = [
	Expect<Equal<ReturnType<Filter<unknown, string, number>>, NarrowResult<string, number>>>,
	// The defaults are `Input` on both payload slots.
	Expect<Equal<Filter<string>, Filter<string, string, string>>>,
	Expect<Equal<Filter<string, number>, Filter<string, number, string>>>,
	// The envelope really is `./narrow`'s, so a filter's output is interchangeable
	// with `parse`'s. `NarrowError` is the default second argument there.
	Expect<Equal<ReturnType<Filter<unknown, string, NarrowError>>, NarrowResult<string>>>,
];

// --- variance: `in Input`, `out Pass`, `out Fail` ------------------------------
declare const narrowInput: Filter<Animal, Cat, Dog>;
// Contravariant in Input: a filter accepting every Animal is usable where only
// Cats are fed in. Covariant in Pass/Fail: both widen.
const _widened: Filter<Cat, Animal, Animal> = narrowInput;
// The other direction must not hold.
declare const wideInput: Filter<Cat, Animal, Animal>;
// @ts-expect-error - `Filter` is contravariant in `Input`; an `Animal` is not a `Cat`.
const _illegal: Filter<Animal, Cat, Dog> = wideInput;

// --- make: an inference site, nothing else ------------------------------------
declare const caseSplit: (input: string) => NarrowResult<number, boolean>;
const _made = make(caseSplit);
type _makeInfers = [
	Expect<Equal<typeof _made, Filter<string, number, boolean>>>,
	Expect<Equal<IsAny<typeof _made>, false>>,
];

// --- fromPredicate: the complement ---------------------------------------------
const _fromGuard = fromPredicate(isNumber);
const _fromNarrowDomain = fromPredicate(isStr);
const _fromNonNarrowing = fromPredicate(isSelf);
const _fromPlain = fromPredicate(isShort);

type _complement = [
	// A `/guards` guard is written over `unknown`, and `Exclude<unknown, B>` is
	// `unknown` — the rejected value is not narrowed, and must not claim to be.
	Expect<Equal<typeof _fromGuard, Filter<unknown, number, unknown>>>,
	// A guard over a real union hands back the *other* arm, already narrowed.
	Expect<Equal<typeof _fromNarrowDomain, Filter<string | number, string, number>>>,
	// The `IsEqual` guard: without it this fail branch would be `never`, which
	// would claim the filter cannot fail.
	Expect<Equal<typeof _fromNonNarrowing, Filter<string, string, string>>>,
	Expect<Equal<IsAny<typeof _fromNonNarrowing>, false>>,
	// A plain predicate proves nothing: both branches carry the input.
	Expect<Equal<typeof _fromPlain, Filter<string, string, string>>>,
];

// --- fromMaybe / fromThrowing: transform on pass, original input on fail -------
const _maybe = fromMaybe((raw: string): number | undefined => raw.length);
const _throwing = fromThrowing((raw: string): unknown => JSON.parse(raw));
type _partials = [
	Expect<Equal<typeof _maybe, Filter<string, number, string>>>,
	Expect<Equal<typeof _throwing, Filter<string, unknown, string>>>,
];

// --- mapPass / mapFail: exactly one slot moves --------------------------------
const _mapped = mapPass(_fromNarrowDomain, (value) => value.length);
const _remapped = mapFail(_fromNarrowDomain, (value) => `${value}`);
type _maps = [
	Expect<Equal<typeof _mapped, Filter<string | number, number, number>>>,
	Expect<Equal<typeof _remapped, Filter<string | number, string, string>>>,
	// The callback sees the branch type, not the input type.
	Expect<Equal<Parameters<Parameters<typeof mapPass<string, number, boolean, 0>>[1]>[0], number>>,
	Expect<Equal<Parameters<Parameters<typeof mapFail<string, number, boolean, 0>>[1]>[0], boolean>>,
];

// --- or: passes union, fails right ---------------------------------------------
declare const isEither: Refinement<string | number, string | number>;
const _either = or(fromPredicate(isString), fromPredicate(isNumber));
const _eitherNarrow = or(_fromNarrowDomain, fromPredicate(isEither));
type _or = [
	Expect<Equal<typeof _either, Filter<unknown, string | number, unknown>>>,
	// The left failure is discarded — only the right one survives.
	Expect<Equal<typeof _eitherNarrow, Filter<string | number, string | number, string | number>>>,
];

// --- compose: the intermediate type is free ------------------------------------
const _composed = compose(fromPredicate(isString), _maybe);
type _compose = [
	// `unknown | string` collapses to `unknown`; both stages' failures are in play.
	Expect<Equal<typeof _composed, Filter<unknown, number, unknown>>>,
	// With two distinct payload types the union is observable.
	Expect<
		Equal<
			ReturnType<typeof compose<string, number, "l", boolean, "r">>,
			Filter<string, boolean, "l" | "r">
		>
	>,
];

// --- toPredicate: a Predicate, never a Refinement ------------------------------
const _decision = toPredicate(_fromNarrowDomain);
type _toPredicate = [
	Expect<Equal<typeof _decision, Predicate<string | number>>>,
	// A `Predicate` returns `boolean`, so no proof is recoverable.
	Expect<Equal<ReturnType<typeof _decision>, boolean>>,
];
// A filter's `Pass` need not extend `Input`, so nothing here may be a guard.
// @ts-expect-error - `toPredicate` yields a `Predicate`, not a `Refinement`.
const _notAGuard: Refinement<string | number, string> = _decision;

// --- toUndefined: the point-free `tryNarrow` -----------------------------------
const _unwrapped = toUndefined(_fromNarrowDomain);
type _toUndefined = [
	Expect<Equal<typeof _unwrapped, (input: string | number) => string | undefined>>,
	Expect<Equal<ReturnType<typeof _unwrapped>, string | undefined>>,
];

test("filter type-level assertions compile", () => {
	// The assertions above are the test; this keeps vitest's typecheck runner happy.
});
