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
 * @fileoverview Type-level tests for the guard algebra. Every `Expect<...>` line
 * is a compile-time assertion — this file failing to type-check IS the test
 * failure. A type predicate is unchecked by the compiler, so the exact type each
 * combinator produces is the only thing standing between a composed guard and a
 * silent lie.
 *
 * The dual-law block is load-bearing for a second reason: the data-last overloads
 * of the six dualized combinators are a hand-written assertion that `dualBinary`
 * cannot check, so `Equal<dataFirst, dataLast>` is what turns them into a tested
 * contract.
 */

import { test } from "vitest";
import {
	allOf,
	type alwaysFalse,
	type alwaysTrue,
	and,
	anyOf,
	arrayOf,
	compose,
	eqv,
	everyOf,
	exactlyOne,
	implies,
	lazy,
	mapInput,
	nand,
	noneOf,
	not,
	nullableOf,
	nullishOf,
	optionalOf,
	or,
	type Predicate,
	recordOf,
	type Refinement,
	refineOn,
	someOf,
	structOf,
	tupleOf,
	type TypeGuard,
} from "./predicate.js";
import type { Equal, Expect } from "./testing.js";

// --- fixtures -----------------------------------------------------------------
type Animal = "cat" | "dog" | "fish";

const isString = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number => typeof value === "number";
const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";
const isPositive = (value: unknown): value is number => typeof value === "number" && value > 0;
const isNumericString = (value: string): value is `${number}` => /^\d+$/.test(value);
const isCat = (animal: Animal): animal is "cat" => animal === "cat";
const isDog = (animal: Animal): animal is "dog" => animal === "dog";

const isShort: Predicate<string> = (value) => value.length < 4;
const isLower: Predicate<string> = (value) => value === value.toLowerCase();

// --- vocabulary and variance --------------------------------------------------
type _vocabulary = [
	Expect<Equal<TypeGuard<string>, Refinement<unknown, string>>>,
	// `in A` makes Predicate contravariant, which is what lets alwaysTrue be
	// reused at any narrower input type.
	Expect<Equal<Predicate<unknown> extends Predicate<string> ? true : false, true>>,
	Expect<Equal<Predicate<string> extends Predicate<unknown> ? true : false, false>>,
	Expect<Equal<typeof alwaysTrue extends Predicate<string> ? true : false, true>>,
	Expect<Equal<typeof alwaysFalse extends Predicate<Animal> ? true : false, true>>,
	// `out B` makes the proof covariant.
	Expect<Equal<Refinement<unknown, "a"> extends Refinement<unknown, string> ? true : false, true>>,
	Expect<Equal<Refinement<unknown, string> extends Refinement<unknown, "a"> ? true : false, false>>,
	// Every guard fits the constraint slots, whatever its domain.
	Expect<Equal<typeof isString extends Refinement.Any ? true : false, true>>,
	Expect<Equal<typeof isCat extends Refinement.Any ? true : false, true>>,
	Expect<Equal<typeof isString extends Predicate.Any ? true : false, true>>,
	Expect<Equal<typeof isShort extends Predicate.Any ? true : false, true>>,
	// ...which `Predicate<unknown>` as a bound would not accept.
	Expect<Equal<typeof isShort extends Predicate<unknown> ? true : false, false>>,
	// A plain predicate is not a Refinement, which is what the `extends Any`
	// constraints on the Refinement namespace members lean on.
	Expect<Equal<Predicate<string> extends Refinement.Any ? true : false, false>>,
];

// --- namespace merging --------------------------------------------------------
// The interface and the `declare namespace` share one identifier: `Predicate` is
// still a callable generic type, and it is also a namespace qualifier.
type _merging = [
	Expect<Equal<Predicate<string>, Predicate<string>>>,
	Expect<Equal<Predicate.In<Predicate<string>>, string>>,
	Expect<Equal<Refinement.Out<Refinement<unknown, string>>, string>>,
];

// --- inference extractors -----------------------------------------------------
type _inference = [
	Expect<Equal<Refinement.Out<typeof isString>, string>>,
	Expect<Equal<Refinement.Out<typeof isCat>, "cat">>,
	Expect<Equal<Refinement.Out<Refinement<unknown, 1 | 2>>, 1 | 2>>,
	Expect<Equal<Refinement.In<typeof isCat>, Animal>>,
	Expect<Equal<Refinement.In<typeof isString>, unknown>>,
	Expect<Equal<Refinement.In<typeof isNumericString>, string>>,
	Expect<Equal<Predicate.In<Predicate<string>>, string>>,
	Expect<Equal<Predicate.In<typeof isCat>, Animal>>,
	Expect<Equal<Refinement.OutUnion<[typeof isString, typeof isNumber]>, string | number>>,
	Expect<Equal<Refinement.OutUnion<[]>, never>>,
	Expect<
		Equal<
			Refinement.OutIntersection<[TypeGuard<{ id: string }>, TypeGuard<{ n: number }>]>,
			{ id: string } & { n: number }
		>
	>,
	// The empty fold is `unknown`, not `never` — intersecting it is a no-op.
	Expect<Equal<Refinement.OutIntersection<[]>, unknown>>,
];

// `Refinement.Out` and `Refinement.In` stay distributive on purpose: OutUnion and
// OutIntersection are defined as `Out<Gs[number]>` and would silently collapse if
// the conditional were tuple-wrapped the way Effect's equivalent is.
type _distributivity = [
	Expect<Equal<Refinement.Out<typeof isString | typeof isNumber>, string | number>>,
	Expect<Equal<Refinement.In<typeof isCat | typeof isNumericString>, Animal | string>>,
];

// The `extends Any` constraints turn "pass a non-guard, get `never`" — the old
// flat aliases' silent behavior — into a compile error at the use site.
// @ts-expect-error a plain predicate has no `is` clause, so it is not a Refinement
type _rejectedOut = Refinement.Out<(value: unknown) => boolean>;
// @ts-expect-error same reason, on the input extractor
type _rejectedIn = Refinement.In<Predicate<string>>;
// @ts-expect-error a non-function is not a Predicate
type _rejectedPredicateIn = Predicate.In<string>;

// --- binary combinators -------------------------------------------------------
const andGuard = and(isNumber, isPositive);
const andPredicate = and(isShort, isLower);
const orGuard = or(isString, isNumber);
const orAnimal = or(isCat, isDog);
const notCat = not(isCat);
const notString = not(isString);
const notPredicate = not(isShort);
const nandPredicate = nand(isShort, isLower);
const eqvPredicate = eqv(isShort, isLower);

type _binary = [
	Expect<Equal<Refinement.Out<typeof andGuard>, number>>,
	// Two plain predicates resolve to the predicate overload and degrade gracefully.
	Expect<Equal<typeof andPredicate, Predicate<string>>>,
	Expect<Equal<Refinement.Out<typeof orGuard>, string | number>>,
	Expect<Equal<Refinement.Out<typeof orAnimal>, "cat" | "dog">>,
	// `not` subtracts when — and only when — the domain is a union.
	Expect<Equal<Refinement.Out<typeof notCat>, "dog" | "fish">>,
	Expect<Equal<Refinement.Out<typeof notString>, unknown>>,
	Expect<Equal<typeof notPredicate, Predicate<string>>>,
	// nand and eqv never narrow.
	Expect<Equal<typeof nandPredicate, Predicate<string>>>,
	Expect<Equal<typeof eqvPredicate, Predicate<string>>>,
];

// --- the dual law -------------------------------------------------------------
// `dualBinary` cannot check that the data-last overloads are the correct flip of
// the data-first ones — the annotation on each exported const is an assertion.
// These lines are what make it a tested contract instead.
const andDataFirst = and(isNumber, isPositive);
const andDataLast = and(isPositive)(isNumber);
const andPredDataFirst = and(isShort, isLower);
const andPredDataLast = and(isLower)(isShort);

const orDataFirst = or(isCat, isDog);
const orDataLast = or(isDog)(isCat);
const orPredDataFirst = or(isShort, isLower);
const orPredDataLast = or(isLower)(isShort);

const nandDataFirst = nand(isShort, isLower);
const nandDataLast = nand(isLower)(isShort);

const eqvDataFirst = eqv(isShort, isLower);
const eqvDataLast = eqv(isLower)(isShort);

const impliesDataFirst = implies<Animal>(isCat, isDog);
const impliesDataLast = implies<Animal>(isDog)(isCat);

const composeDataFirst = compose(isString, isNumericString);
const composeDataLast = compose(isNumericString)(isString);

// Mixed domains are the case the same-domain pairs above cannot see. Every guard
// in `./guards` is a `TypeGuard` (domain `unknown`), so any pipeline that pairs a
// domain-specific rule with one of them lands here. If the curried signatures ever
// go back to pinning the shared domain on `that` alone, these are what fail.
const mixedRefDataFirst = and(isCat, isString);
const mixedRefDataLast = and(isString)(isCat);
const mixedPredDataFirst = nand(isShort, isString);
const mixedPredDataLast = nand(isString)(isShort);
// `self` a plain predicate, `that` a refinement: data-first degrades to a
// `Predicate`, and the curried form has to degrade the same way.
const mixedDegradeDataFirst = and(isShort, isString);
const mixedDegradeDataLast = and(isString)(isShort);

// `self` a refinement, `that` a plain rule over exactly what it proved. This is
// the shape an ordering predicate has — `isLessThan(orderNumber)(10)` is a
// `Predicate<number>`, never a `Refinement`, because `x < 10` proves nothing about
// `x`'s type — and it is also the shape of any inline `(text) => text.length > 0`.
// Before the Refinement + Predicate overload pair existed this fell through to the
// predicate overloads, which silently dropped the proof AND collapsed the domain
// from `unknown` to the proof, so the result could no longer be applied to the very
// input the guard was written for. These lines are what keep that from returning.
const isUnderTen: Predicate<number> = (value) => value < 10;
const ruleOnProofDataFirst = and(isString, isShort);
const ruleOnProofDataLast = and(isShort)(isString);
const bridgeDataFirst = and(isNumber, isUnderTen);
const bridgeDataLast = and(isUnderTen)(isNumber);

type _refinementPlusRule = [
	Expect<Equal<typeof ruleOnProofDataFirst, Refinement<unknown, string>>>,
	Expect<Equal<typeof bridgeDataFirst, Refinement<unknown, number>>>,
	// A plain rule proves nothing new, so the result proves exactly `B` — and it
	// keeps `self`'s domain, which is the half that made the old behavior unusable.
	Expect<Equal<Refinement.Out<typeof bridgeDataFirst>, number>>,
	Expect<Equal<Refinement.In<typeof bridgeDataFirst>, unknown>>,
	// Which is what lets the result stand in for any `./guards` guard.
	Expect<Equal<typeof bridgeDataFirst extends TypeGuard<number> ? true : false, true>>,
];

type _dualLaw = [
	Expect<Equal<typeof andDataFirst, typeof andDataLast>>,
	Expect<Equal<typeof andPredDataFirst, typeof andPredDataLast>>,
	Expect<Equal<typeof orDataFirst, typeof orDataLast>>,
	Expect<Equal<typeof orPredDataFirst, typeof orPredDataLast>>,
	Expect<Equal<typeof nandDataFirst, typeof nandDataLast>>,
	Expect<Equal<typeof eqvDataFirst, typeof eqvDataLast>>,
	Expect<Equal<typeof impliesDataFirst, typeof impliesDataLast>>,
	Expect<Equal<typeof composeDataFirst, typeof composeDataLast>>,
	// The dual law across mismatched domains.
	Expect<Equal<typeof mixedRefDataFirst, typeof mixedRefDataLast>>,
	Expect<Equal<typeof mixedPredDataFirst, typeof mixedPredDataLast>>,
	Expect<Equal<typeof mixedDegradeDataFirst, typeof mixedDegradeDataLast>>,
	// The dual law for the refinement + plain-rule pair, in both spellings.
	Expect<Equal<typeof ruleOnProofDataFirst, typeof ruleOnProofDataLast>>,
	Expect<Equal<typeof bridgeDataFirst, typeof bridgeDataLast>>,
	// …and that each side kept the domain from `self`, not from `that`.
	Expect<Equal<Refinement.Out<typeof mixedRefDataLast>, "cat">>,
	Expect<Equal<typeof mixedPredDataLast, Predicate<string>>>,
	Expect<Equal<typeof mixedDegradeDataLast, Predicate<string>>>,
	// The refinement pairs really do keep narrowing through the curried form.
	Expect<Equal<Refinement.Out<typeof andDataLast>, number>>,
	Expect<Equal<Refinement.Out<typeof orDataLast>, "cat" | "dog">>,
	Expect<Equal<Refinement.Out<typeof composeDataLast>, `${number}`>>,
];

// A forgotten second argument yields a function-valued result, which no
// `Predicate`-typed slot accepts. That is the guard-rail the third eligibility
// rule buys, and it fires at the first annotated boundary.
// @ts-expect-error `and(isLower)` is `(self: Predicate<string>) => Predicate<string>`
const _forgottenArgument: Predicate<string> = and(isLower);
// @ts-expect-error same for the refinement branch
const _forgottenGuardArgument: TypeGuard<number> = and(isPositive);

// --- variadic combinators -----------------------------------------------------
const allGuard = allOf(isNumber, isPositive);
const allSingle = allOf(isString);
const allStruct = allOf(structOf({ id: isString }), structOf({ n: isNumber }));
const anyGuard = anyOf(isString, isNumber, isBoolean);
const anyAnimal = anyOf(isCat, isDog);
const noneAnimal = noneOf(isCat, isDog);
const noneCat = noneOf(isCat);
const xor = exactlyOne<Animal>(isCat, isDog);
const rule = implies<Animal>(isCat, isDog);
const everyRule = everyOf<string>([isShort, isLower]);
const someRule = someOf<string>([isShort, isLower]);

type _variadic = [
	Expect<Equal<Refinement.Out<typeof allGuard>, number>>,
	// A one-guard allOf must not collapse to `never` via the empty intersection.
	Expect<Equal<Refinement.Out<typeof allSingle>, string>>,
	Expect<Equal<Refinement.Out<typeof allStruct>, { id: string } & { n: number }>>,
	Expect<Equal<Refinement.Out<typeof anyGuard>, string | number | boolean>>,
	// The domain is preserved: anyOf over a union stays inside that union.
	Expect<Equal<Refinement.Out<typeof anyAnimal>, "cat" | "dog">>,
	Expect<Equal<Refinement.Out<typeof noneAnimal>, "fish">>,
	Expect<Equal<Refinement.Out<typeof noneCat>, "dog" | "fish">>,
	// XOR-n and implication are not expressible as types, so they stay predicates.
	Expect<Equal<typeof xor, Predicate<Animal>>>,
	Expect<Equal<typeof rule, Predicate<Animal>>>,
	// The Iterable folds cannot know their member count, so they never narrow.
	Expect<Equal<typeof everyRule, Predicate<string>>>,
	Expect<Equal<typeof someRule, Predicate<string>>>,
];

// --- guard plumbing -----------------------------------------------------------
const composed = compose(isString, isNumericString);
const lazyGuard = lazy(() => isString);
const mapped = mapInput(isShort, (user: { email: string }) => user.email);

type _plumbing = [
	Expect<Equal<Refinement.Out<typeof composed>, `${number}`>>,
	Expect<Equal<typeof lazyGuard, Refinement<unknown, string>>>,
	// A projection cannot carry narrowing, so mapInput returns a plain predicate.
	Expect<Equal<typeof mapped, Predicate<{ email: string }>>>,
	Expect<Equal<typeof alwaysTrue, Predicate<unknown>>>,
	Expect<Equal<typeof alwaysFalse, Predicate<unknown>>>,
];

// --- shape constructors -------------------------------------------------------
const isStrings = arrayOf(isString);
const isHeaders = recordOf(isString);
const isPair = tupleOf(isString, isNumber);
const isUser = structOf({
	id: isString,
	tags: arrayOf(isString),
	meta: optionalOf(isNumber),
});
const maybeNumber = optionalOf(isNumber);
const nullableString = nullableOf(isString);
const nullishString = nullishOf(isString);

type _shapes = [
	// Readonly on purpose: an `unknown` that turned out to be an array was never
	// yours to mutate.
	Expect<Equal<Refinement.Out<typeof isStrings>, readonly string[]>>,
	Expect<Equal<Refinement.Out<typeof isHeaders>, Record<string, string>>>,
	// Arity survives, so destructuring is safe under noUncheckedIndexedAccess.
	Expect<Equal<Refinement.Out<typeof isPair>, readonly [string, number]>>,
	Expect<Equal<Refinement.Out<typeof isPair>["length"], 2>>,
	Expect<
		Equal<
			Refinement.Out<typeof isUser>,
			{ id: string; tags: readonly string[]; meta: number | undefined }
		>
	>,
	Expect<Equal<Refinement.Out<typeof maybeNumber>, number | undefined>>,
	Expect<Equal<Refinement.Out<typeof nullableString>, string | null>>,
	Expect<Equal<Refinement.Out<typeof nullishString>, string | null | undefined>>,
];

// --- narrowing at the call site -----------------------------------------------
// The assertions above describe the guards; these describe what happens to a
// value inside the guarded branch, which is what consumers actually feel.
function narrowing(value: unknown, record: { kind: unknown; other: number }): void {
	if (anyGuard(value)) {
		type _union = Expect<Equal<typeof value, string | number | boolean>>;
		// @ts-expect-error — the union must not silently collapse to `string`
		const onlyString: string = value;
		void onlyString;
		void (undefined as _union | undefined);
	}

	if (isPair(value)) {
		const [name, count] = value;
		type _first = Expect<Equal<typeof name, string>>;
		type _second = Expect<Equal<typeof count, number>>;
		void (undefined as [_first, _second] | undefined);
	}

	const kindIsString = refineOn("kind")(isString);
	if (kindIsString(record)) {
		type _kind = Expect<Equal<(typeof record)["kind"], string>>;
		type _other = Expect<Equal<(typeof record)["other"], number>>;
		void (undefined as [_kind, _other] | undefined);
	}
}

// --- shape constructors reject narrow-domain guards ---------------------------
// `structOf`/`tupleOf` invoke their guards with values read out of an `unknown`.
// A `Refinement<string, …>` — a brand guard, for instance — would be handed input
// it never agreed to accept, so validating an untrusted payload would throw a
// TypeError instead of returning `false`. The bound must be `TypeGuard<unknown>`.
declare const brandGuard: Refinement<string, string & { readonly __brand: "UserId" }>;

// @ts-expect-error a guard whose domain is `string` cannot inspect an `unknown`
const _rejectedStruct = structOf({ id: brandGuard });
// @ts-expect-error same reason, positional form
const _rejectedTuple = tupleOf(brandGuard);

// The documented adapter: prove `string` first, then refine.
const adaptedStruct = structOf({ id: compose(isString, brandGuard) });
const _adapted = (v: unknown) => (adaptedStruct(v) ? v.id : null);

type _shapeDomains = [
	Expect<Equal<ReturnType<typeof _adapted>, (string & { readonly __brand: "UserId" }) | null>>,
];

test("type-level assertions compile", () => {
	// The assertions above are enforced by the typechecker; if any Expect<...>
	// resolved to a non-`true` type, this file would fail to compile and
	// `vitest --typecheck` would report it. Referencing the tuples here keeps them
	// "used" without exporting from a test file.
	type _all = [
		_vocabulary,
		_merging,
		_inference,
		_distributivity,
		_binary,
		_dualLaw,
		_variadic,
		_plumbing,
		_shapes,
		_shapeDomains,
		_rejectedOut,
		_rejectedIn,
		_rejectedPredicateIn,
	];
	const _assertions: _all | undefined = undefined;
	void _assertions;
	void narrowing;
	void _rejectedStruct;
	void _rejectedTuple;
	void _forgottenArgument;
	void _forgottenGuardArgument;
});
