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
 * @fileoverview Type-level tests for the equivalence algebra. Every `Expect<...>`
 * line is a compile-time assertion — this file failing to type-check IS the test
 * failure.
 *
 * Two things here are not checkable any other way. First, the shape constructors
 * (`tupleOf`, `arrayOf`, `structOf`, `recordOf`) do their real work in the type
 * system: the runtime body is a loop, and the value of the export is entirely in
 * the type it produces. Second, the element constraint is `Equivalence<never>`
 * rather than `Equivalence<any>`, and "no `any` leaked" is a claim only `IsAny`
 * can settle.
 */

import { test } from "vitest";
import {
	arrayOf,
	type combine,
	combineAll,
	type eqBigInt,
	eqBoolean,
	type eqDate,
	eqNumber,
	type eqSameValue,
	type eqStrict,
	eqString,
	type Equivalence,
	type make,
	mapInput,
	recordOf,
	structOf,
	tupleOf,
} from "./equivalence.js";
import type { Equal, Expect, IsAny } from "./testing.js";

// --- fixtures -----------------------------------------------------------------
type User = { readonly id: string; readonly name: string };

const samePair = tupleOf([eqString, eqNumber]);
const sameEmptyTuple = tupleOf([]);
const sameTriple = tupleOf([eqString, eqNumber, eqBoolean]);
const sameStrings = arrayOf(eqString);
const sameUser = structOf({ name: eqString, age: eqNumber });
const sameScores = recordOf(eqNumber);
const byId = mapInput(eqString, (user: User) => user.id);

// --- variance -----------------------------------------------------------------
// `in A` is a checked assertion, not decoration: it is what lets a relation
// written over a wider type be reused at a narrower one, and what makes
// `Equivalence<never>` a usable constraint for the shape constructors.
type _variance = [
	Expect<Equal<Equivalence<unknown> extends Equivalence<string> ? true : false, true>>,
	Expect<Equal<Equivalence<string> extends Equivalence<unknown> ? true : false, false>>,
	// `Equivalence<never>` is the top of the family — every instantiation is
	// assignable to it. That is what the shape constructors constrain against
	// instead of reaching for `any`.
	Expect<Equal<Equivalence<string> extends Equivalence<never> ? true : false, true>>,
	Expect<Equal<Equivalence<unknown> extends Equivalence<never> ? true : false, true>>,
	Expect<Equal<Equivalence<never> extends Equivalence<string> ? true : false, false>>,
	// A relation over a union accepts either member.
	Expect<Equal<Equivalence<string | number> extends Equivalence<string> ? true : false, true>>,
];

// --- the documented structural hazard -----------------------------------------
// A one-parameter function satisfies a two-parameter signature, so a `Predicate`
// slots into an `Equivalence` slot without complaint. The compiler will never
// catch it; this pins the fact so the Gotcha on `Equivalence` cannot go stale.
type _predicateHazard = [
	Expect<Equal<((value: string) => boolean) extends Equivalence<string> ? true : false, true>>,
	Expect<Equal<(() => boolean) extends Equivalence<string> ? true : false, true>>,
];

// --- declared signatures ------------------------------------------------------
type _signatures = [
	Expect<Equal<typeof make, <A>(isEquivalent: (self: A, that: A) => boolean) => Equivalence<A>>>,
	Expect<Equal<typeof eqStrict, <A>() => Equivalence<A>>>,
	Expect<Equal<typeof eqSameValue, <A>() => Equivalence<A>>>,
	Expect<Equal<typeof combine, <A>(self: Equivalence<A>, that: Equivalence<A>) => Equivalence<A>>>,
	Expect<
		Equal<typeof mapInput, <A, B>(self: Equivalence<A>, f: (value: B) => A) => Equivalence<B>>
	>,
	Expect<Equal<typeof arrayOf, <A>(item: Equivalence<A>) => Equivalence<readonly A[]>>>,
	Expect<
		Equal<typeof recordOf, <A>(value: Equivalence<A>) => Equivalence<Readonly<Record<string, A>>>>
	>,
	Expect<Equal<typeof combineAll, <A>(collection: Iterable<Equivalence<A>>) => Equivalence<A>>>,
];

// --- instances ----------------------------------------------------------------
type _instances = [
	Expect<Equal<typeof eqString, Equivalence<string>>>,
	Expect<Equal<typeof eqNumber, Equivalence<number>>>,
	Expect<Equal<typeof eqBoolean, Equivalence<boolean>>>,
	Expect<Equal<typeof eqBigInt, Equivalence<bigint>>>,
	Expect<Equal<typeof eqDate, Equivalence<Date>>>,
	// The factories carry their type argument through unchanged.
	Expect<Equal<ReturnType<typeof eqStrict<Date>>, Equivalence<Date>>>,
	Expect<Equal<ReturnType<typeof eqSameValue<symbol>>, Equivalence<symbol>>>,
];

// --- combinator inference -----------------------------------------------------
const foldedFromArray = combineAll([eqString, eqString]);
const foldedFromSet = combineAll(new Set([eqNumber]));

type _combinators = [
	Expect<Equal<typeof byId, Equivalence<User>>>,
	Expect<Equal<ReturnType<typeof combine<string>>, Equivalence<string>>>,
	// `combineAll` recovers the element type from the collection, whatever the
	// collection is.
	Expect<Equal<typeof foldedFromArray, Equivalence<string>>>,
	Expect<Equal<typeof foldedFromSet, Equivalence<number>>>,
];

// --- shape constructors -------------------------------------------------------
// These are the assertions that make the shape constructors worth exporting: the
// runtime body is a loop, and everything of value is in the inferred type.
type _shapes = [
	Expect<Equal<typeof samePair, Equivalence<readonly [string, number]>>>,
	Expect<Equal<typeof sameTriple, Equivalence<readonly [string, number, boolean]>>>,
	// Arity survives, so destructuring inside a caller stays safe under
	// noUncheckedIndexedAccess.
	Expect<Equal<Parameters<typeof samePair>[0]["length"], 2>>,
	// The empty tuple is a real, distinct instantiation rather than a degenerate
	// `readonly unknown[]`.
	Expect<Equal<typeof sameEmptyTuple, Equivalence<readonly []>>>,
	Expect<Equal<typeof sameStrings, Equivalence<readonly string[]>>>,
	Expect<Equal<typeof sameUser, Equivalence<{ readonly name: string; readonly age: number }>>>,
	Expect<Equal<typeof sameScores, Equivalence<Readonly<Record<string, number>>>>>,
];

// --- no `any` escapes ---------------------------------------------------------
// Effect's `Tuple`/`Struct` constrain their elements with `Equivalence<any>`, so
// a recovered element type can degrade to `any` silently. Ours constrain with
// `Equivalence<never>`; these assertions are what prove the difference is real.
type _noAny = [
	Expect<Equal<IsAny<Parameters<typeof samePair>[0]>, false>>,
	Expect<Equal<IsAny<Parameters<typeof samePair>[0][0]>, false>>,
	Expect<Equal<IsAny<Parameters<typeof samePair>[0][1]>, false>>,
	Expect<Equal<IsAny<Parameters<typeof sameUser>[0]>, false>>,
	Expect<Equal<IsAny<Parameters<typeof sameUser>[0]["name"]>, false>>,
	Expect<Equal<IsAny<Parameters<typeof sameStrings>[0]>, false>>,
	Expect<Equal<IsAny<Parameters<typeof sameScores>[0]>, false>>,
	Expect<Equal<Parameters<typeof samePair>[0][0], string>>,
	Expect<Equal<Parameters<typeof samePair>[0][1], number>>,
	Expect<Equal<Parameters<typeof sameUser>[0]["age"], number>>,
];

// --- rejected calls -----------------------------------------------------------
// Each of these must NOT compile. `@ts-expect-error` inverts the check, so if a
// signature ever loosens, this file stops compiling and the suite reports it.

// @ts-expect-error a string relation cannot compare numbers
eqString(1, 2);

// @ts-expect-error the tuple's second slot is a number
samePair(["a", "b"], ["a", "b"]);

// @ts-expect-error the tuple has exactly two slots
samePair(["a", 1, true], ["a", 1, true]);

// @ts-expect-error a bare value is not an Equivalence
const _rejectedArrayOf = arrayOf(42);

// @ts-expect-error the field map's values must be Equivalences
const _rejectedStructOf = structOf({ name: "not a relation" });

// @ts-expect-error `age` is compared with a number relation
sameUser({ name: "Ada", age: "36" }, { name: "Ada", age: "36" });

// @ts-expect-error an Equivalence takes two arguments, not one
eqString("a");

// The projection is what fixes the resulting domain, so the derived relation
// compares Users — never the strings it projected out of them.
// @ts-expect-error `byId` compares Users, not the projected strings
byId("u1", "u1");

test("type-level assertions compile", () => {
	// The assertions above are enforced by the typechecker; if any Expect<...>
	// resolved to a non-`true` type, this file would fail to compile and
	// `vitest --typecheck` would report it. Referencing the tuples here keeps them
	// "used" without exporting from a test file.
	type _all = [_variance, _predicateHazard, _signatures, _instances, _combinators, _shapes, _noAny];
	const _assertions: _all | undefined = undefined;
	void _assertions;
	void _rejectedArrayOf;
	void _rejectedStructOf;
});
