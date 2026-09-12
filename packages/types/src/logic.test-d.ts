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
 * @fileoverview Type-level tests for `logic.ts`. Every `Expect<...>` line is a
 * compile-time assertion — this file failing to type-check IS the test failure.
 * Run via `vitest --typecheck` (wired into this package's `test` script).
 *
 * `logic.ts` is 100% type-level, so there is no companion `logic.test.ts`: there
 * is no runtime behavior to exercise. The assertions below use `Equal` rather
 * than assignability wherever the point is that a result must be a *definite*
 * `true`/`false` and not a widened `boolean` — an `extends true` check would
 * pass for `boolean` and hide exactly the bug this module exists to prevent.
 */

import { test } from "vitest";
import type {
	AllTrue,
	And,
	AnyTrue,
	BoolEqv,
	BoolXor,
	Extends,
	ExtendsDistributive,
	If,
	Implies,
	IsBooleanLiteral,
	IsEmptyObject,
	IsEqual,
	IsLiteral,
	IsMutuallyAssignable,
	IsNullable,
	IsNumericLiteral,
	IsOptionalKey,
	IsPlainObject,
	IsReadonlyKey,
	IsStringLiteral,
	IsSubtypeOf,
	IsSupertypeOf,
	IsTuple,
	IsUndefinable,
	Nand,
	Nor,
	Not,
	Or,
} from "./logic.js";
import type { Equal, Expect } from "./testing.js";

// biome-ignore lint/suspicious/noExplicitAny: type-level tests must reference the `any` type to verify that every operator refuses to be fooled by it
type Any = any;

// --- If: the non-distributive primitive ---------------------------------------
type _if = [
	Expect<Equal<If<true, "yes", "no">, "yes">>,
	Expect<Equal<If<false, "yes", "no">, "no">>,
	// The whole point: a `boolean` condition must NOT return "yes" | "no".
	Expect<Equal<If<boolean, "yes", "no">, "no">>,
	// The branches are arbitrary types, not just booleans.
	Expect<Equal<If<true, { a: 1 }, never>, { a: 1 }>>,
];

// --- Not / And / Or -----------------------------------------------------------
type _notAndOr = [
	Expect<Equal<Not<true>, false>>,
	Expect<Equal<Not<false>, true>>,
	Expect<Equal<Not<boolean>, true>>,
	Expect<Equal<And<true, true>, true>>,
	Expect<Equal<And<true, false>, false>>,
	Expect<Equal<And<false, true>, false>>,
	Expect<Equal<And<false, false>, false>>,
	// An un-narrowed operand must normalize to a definite answer, not leak through.
	Expect<Equal<And<true, boolean>, false>>,
	Expect<Equal<And<boolean, true>, false>>,
	Expect<Equal<Or<true, true>, true>>,
	Expect<Equal<Or<true, false>, true>>,
	Expect<Equal<Or<false, true>, true>>,
	Expect<Equal<Or<false, false>, false>>,
	Expect<Equal<Or<false, boolean>, false>>,
	Expect<Equal<Or<boolean, false>, false>>,
];

// --- BoolXor / BoolEqv / Nand / Nor / Implies ---------------------------------
type _derived = [
	Expect<Equal<BoolXor<true, false>, true>>,
	Expect<Equal<BoolXor<false, true>, true>>,
	Expect<Equal<BoolXor<true, true>, false>>,
	Expect<Equal<BoolXor<false, false>, false>>,
	Expect<Equal<BoolXor<boolean, true>, true>>,
	// BoolEqv is the negation of BoolXor across the whole truth table.
	Expect<Equal<BoolEqv<true, true>, true>>,
	Expect<Equal<BoolEqv<false, false>, true>>,
	Expect<Equal<BoolEqv<true, false>, false>>,
	Expect<Equal<BoolEqv<false, true>, false>>,
	// An un-narrowed operand must still yield a definite answer, not `boolean`.
	Expect<Equal<BoolEqv<boolean, true>, false>>,
	Expect<Equal<BoolEqv<boolean, false>, true>>,
	Expect<Equal<Nand<true, true>, false>>,
	Expect<Equal<Nand<true, false>, true>>,
	Expect<Equal<Nand<false, false>, true>>,
	Expect<Equal<Nor<false, false>, true>>,
	Expect<Equal<Nor<true, false>, false>>,
	Expect<Equal<Nor<true, true>, false>>,
	Expect<Equal<Implies<true, true>, true>>,
	// The one falsifying case.
	Expect<Equal<Implies<true, false>, false>>,
	// A false antecedent is vacuously true, for either consequent.
	Expect<Equal<Implies<false, true>, true>>,
	Expect<Equal<Implies<false, false>, true>>,
];

// --- AllTrue / AnyTrue --------------------------------------------------------
type _folds = [
	Expect<Equal<AllTrue<[true, true, true]>, true>>,
	Expect<Equal<AllTrue<[true, false, true]>, false>>,
	Expect<Equal<AllTrue<[false, false]>, false>>,
	// Empty conjunction is vacuously true; empty disjunction is false.
	Expect<Equal<AllTrue<[]>, true>>,
	Expect<Equal<AnyTrue<[]>, false>>,
	// A readonly tuple is accepted by the constraint and folds identically.
	Expect<Equal<AllTrue<readonly [true, true]>, true>>,
	// An unbounded boolean[] cannot prove all-true, and must not widen to boolean.
	Expect<Equal<AllTrue<boolean[]>, false>>,
	Expect<Equal<AnyTrue<[false, true]>, true>>,
	Expect<Equal<AnyTrue<[false, false]>, false>>,
	Expect<Equal<AnyTrue<[true, true]>, true>>,
	Expect<Equal<AnyTrue<readonly [false, true]>, true>>,
];

// --- Extends vs ExtendsDistributive -------------------------------------------
type _assignability = [
	Expect<Equal<Extends<"a", string>, true>>,
	Expect<Equal<Extends<"a" | "b", string>, true>>,
	Expect<Equal<Extends<string, "a">, false>>,
	// A mixed union as a WHOLE is not a string — and the answer is definite.
	Expect<Equal<Extends<"a" | 1, string>, false>>,
	Expect<Equal<Extends<never, string>, true>>,
	Expect<Equal<ExtendsDistributive<"a" | "b", string>, true>>,
	// ...where the distributive form honestly reports "some do, some do not".
	Expect<Equal<ExtendsDistributive<"a" | 1, string>, boolean>>,
	// Distribution over `never` yields `never`, not `true` — the documented
	// difference from the tuple-wrapped form directly above.
	Expect<Equal<ExtendsDistributive<never, string>, never>>,
];

// --- Identity, subtyping, mutual assignability --------------------------------
type _identity = [
	Expect<Equal<IsEqual<{ a: 1 }, { a: 1 }>, true>>,
	// Equal sees modifiers that assignability cannot.
	Expect<Equal<IsEqual<{ a: 1 }, { readonly a: 1 }>, false>>,
	Expect<Equal<IsEqual<Any, unknown>, false>>,
	Expect<Equal<IsEqual<never, never>, true>>,
	Expect<Equal<IsSubtypeOf<"a", string>, true>>,
	// Proper subtype: equality does not count.
	Expect<Equal<IsSubtypeOf<string, string>, false>>,
	Expect<Equal<IsSubtypeOf<string, "a">, false>>,
	Expect<Equal<IsSupertypeOf<string, "a">, true>>,
	Expect<Equal<IsSupertypeOf<string, string>, false>>,
	Expect<Equal<IsSupertypeOf<"a", string>, false>>,
	// Weaker than IsEqual, and deliberately so: readonly is invisible to
	// assignability, so these two ARE swappable at a call boundary.
	Expect<Equal<IsMutuallyAssignable<{ a: 1 }, { readonly a: 1 }>, true>>,
	Expect<Equal<IsMutuallyAssignable<{ a: 1 }, { a: 2 }>, false>>,
	Expect<Equal<IsMutuallyAssignable<string, string>, true>>,
];

// --- Literal detection --------------------------------------------------------
type _literals = [
	Expect<Equal<IsStringLiteral<"a">, true>>,
	Expect<Equal<IsStringLiteral<"a" | "b">, true>>,
	Expect<Equal<IsStringLiteral<"">, true>>,
	Expect<Equal<IsStringLiteral<string>, false>>,
	// The two cases the naive bidirectional-extends check gets WRONG.
	Expect<Equal<IsStringLiteral<Uppercase<string>>, false>>,
	Expect<Equal<IsStringLiteral<`on${string}`>, false>>,
	// Guarded degenerate inputs.
	Expect<Equal<IsStringLiteral<never>, false>>,
	Expect<Equal<IsStringLiteral<Any>, false>>,
	Expect<Equal<IsStringLiteral<unknown>, false>>,
	Expect<Equal<IsStringLiteral<1>, false>>,
	// A union that is not wholly string is not a string literal.
	Expect<Equal<IsStringLiteral<"a" | 1>, false>>,
	Expect<Equal<IsNumericLiteral<1>, true>>,
	Expect<Equal<IsNumericLiteral<0>, true>>,
	Expect<Equal<IsNumericLiteral<1 | 2>, true>>,
	// bigint literals count — that is why this is not named IsNumberLiteral.
	Expect<Equal<IsNumericLiteral<1n>, true>>,
	Expect<Equal<IsNumericLiteral<number>, false>>,
	Expect<Equal<IsNumericLiteral<bigint>, false>>,
	Expect<Equal<IsNumericLiteral<never>, false>>,
	Expect<Equal<IsNumericLiteral<Any>, false>>,
	Expect<Equal<IsNumericLiteral<"1">, false>>,
	Expect<Equal<IsBooleanLiteral<true>, true>>,
	Expect<Equal<IsBooleanLiteral<false>, true>>,
	// `boolean` is internally `true | false` — the case every naive check fails.
	Expect<Equal<IsBooleanLiteral<boolean>, false>>,
	Expect<Equal<IsBooleanLiteral<never>, false>>,
	Expect<Equal<IsBooleanLiteral<Any>, false>>,
	Expect<Equal<IsLiteral<"a">, true>>,
	Expect<Equal<IsLiteral<42>, true>>,
	Expect<Equal<IsLiteral<42n>, true>>,
	Expect<Equal<IsLiteral<true>, true>>,
	Expect<Equal<IsLiteral<string>, false>>,
	Expect<Equal<IsLiteral<number>, false>>,
	Expect<Equal<IsLiteral<boolean>, false>>,
	Expect<Equal<IsLiteral<{ a: 1 }>, false>>,
	Expect<Equal<IsLiteral<Any>, false>>,
	Expect<Equal<IsLiteral<never>, false>>,
];

// --- Tuple vs array -----------------------------------------------------------
type _tuples = [
	Expect<Equal<IsTuple<[1, 2]>, true>>,
	Expect<Equal<IsTuple<[]>, true>>,
	Expect<Equal<IsTuple<readonly [1, 2]>, true>>,
	// Optional elements give a finite `0 | 1` length, so this is still fixed.
	Expect<Equal<IsTuple<[a?: number]>, true>>,
	Expect<Equal<IsTuple<number[]>, false>>,
	Expect<Equal<IsTuple<readonly number[]>, false>>,
	// Variadic tuples: excluded by default, included on request.
	Expect<Equal<IsTuple<[1, ...number[]]>, false>>,
	Expect<Equal<IsTuple<[1, ...number[]], true>, false>>,
	Expect<Equal<IsTuple<[1, ...number[]], false>, true>>,
	Expect<Equal<IsTuple<[...number[], 1], false>, true>>,
	// Loosening the policy must NOT turn a plain array into a tuple.
	Expect<Equal<IsTuple<number[], false>, false>>,
	// Non-arrays and degenerate inputs.
	Expect<Equal<IsTuple<string>, false>>,
	Expect<Equal<IsTuple<{ length: 2 }>, false>>,
	Expect<Equal<IsTuple<never>, false>>,
];

// --- Object shape -------------------------------------------------------------
type _shapes = [
	Expect<Equal<IsPlainObject<{ a: 1 }>, true>>,
	Expect<Equal<IsPlainObject<Record<string, number>>, true>>,
	Expect<Equal<IsPlainObject<number[]>, false>>,
	Expect<Equal<IsPlainObject<readonly number[]>, false>>,
	Expect<Equal<IsPlainObject<() => void>, false>>,
	Expect<Equal<IsPlainObject<(a: string) => number>, false>>,
	Expect<Equal<IsPlainObject<string>, false>>,
	Expect<Equal<IsPlainObject<null>, false>>,
	Expect<Equal<IsPlainObject<Any>, false>>,
	// Documented scope limit: a structural check cannot exclude class instances.
	Expect<Equal<IsPlainObject<Date>, true>>,
	Expect<Equal<IsEmptyObject<Record<never, never>>, true>>,
	Expect<Equal<IsEmptyObject<{ a: 1 }>, false>>,
	// An index signature means `keyof` is not `never`, so this is NOT empty.
	Expect<Equal<IsEmptyObject<Record<string, never>>, false>>,
	Expect<Equal<IsEmptyObject<[]>, false>>,
];

// --- Nullability and property modifiers ---------------------------------------
type _modifiers = [
	Expect<Equal<IsNullable<string | null>, true>>,
	Expect<Equal<IsNullable<null>, true>>,
	// The asymmetry that motivates IsUndefinable existing at all.
	Expect<Equal<IsNullable<string | undefined>, false>>,
	Expect<Equal<IsNullable<string>, false>>,
	Expect<Equal<IsNullable<never>, false>>,
	Expect<Equal<IsNullable<Any>, true>>,
	Expect<Equal<IsUndefinable<string | undefined>, true>>,
	Expect<Equal<IsUndefinable<undefined>, true>>,
	Expect<Equal<IsUndefinable<string | null>, false>>,
	Expect<Equal<IsUndefinable<string>, false>>,
	Expect<Equal<IsUndefinable<never>, false>>,
	Expect<Equal<IsUndefinable<Any>, true>>,
	// The distinction that matters under exactOptionalPropertyTypes: an omittable
	// key is optional, an explicitly-`undefined` one is required.
	Expect<Equal<IsOptionalKey<{ a?: string }, "a">, true>>,
	Expect<Equal<IsOptionalKey<{ a: string | undefined }, "a">, false>>,
	Expect<Equal<IsOptionalKey<{ a: string }, "a">, false>>,
	Expect<Equal<IsOptionalKey<{ a?: string; b: number }, "b">, false>>,
	// readonly is invisible to assignability, so only an identity check sees it.
	Expect<Equal<IsReadonlyKey<{ readonly a: 1 }, "a">, true>>,
	Expect<Equal<IsReadonlyKey<{ a: 1 }, "a">, false>>,
	Expect<Equal<IsReadonlyKey<{ readonly a?: 1 }, "a">, true>>,
	// Asking about several keys at once is an all-or-nothing question.
	Expect<Equal<IsReadonlyKey<{ readonly a: 1; readonly b: 2 }, "a" | "b">, true>>,
	Expect<Equal<IsReadonlyKey<{ readonly a: 1; b: 2 }, "a" | "b">, false>>,
];

// --- Composition: the operators must survive being nested ---------------------
type IsReadonlyTuple<T> = And<Extends<T, readonly unknown[]>, Not<Extends<T, unknown[]>>>;

type _composition = [
	Expect<Equal<IsReadonlyTuple<readonly [1, 2]>, true>>,
	Expect<Equal<IsReadonlyTuple<[1, 2]>, false>>,
	// A derived condition feeding If still resolves to a single branch.
	Expect<Equal<If<IsStringLiteral<"a">, "literal", "widened">, "literal">>,
	Expect<Equal<If<IsStringLiteral<string>, "literal", "widened">, "widened">>,
	// De Morgan holds over the normalized operators.
	Expect<Equal<Nand<true, false>, Or<Not<true>, Not<false>>>>,
	Expect<Equal<Nor<true, false>, And<Not<true>, Not<false>>>>,
	// BoolEqv is definitionally Not<BoolXor<...>>, and equally the two-way
	// implication — the identity the docs claim, pinned over the full table.
	Expect<Equal<BoolEqv<true, true>, Not<BoolXor<true, true>>>>,
	Expect<Equal<BoolEqv<true, false>, Not<BoolXor<true, false>>>>,
	Expect<Equal<BoolEqv<false, true>, Not<BoolXor<false, true>>>>,
	Expect<Equal<BoolEqv<false, false>, Not<BoolXor<false, false>>>>,
	Expect<Equal<BoolEqv<true, true>, And<Implies<true, true>, Implies<true, true>>>>,
	Expect<Equal<BoolEqv<true, false>, And<Implies<true, false>, Implies<false, true>>>>,
	Expect<Equal<BoolEqv<false, true>, And<Implies<false, true>, Implies<true, false>>>>,
	Expect<Equal<BoolEqv<false, false>, And<Implies<false, false>, Implies<false, false>>>>,
	// ...and the round trip back through BoolXor.
	Expect<Equal<Not<BoolEqv<true, false>>, BoolXor<true, false>>>,
	// A fold over computed conditions.
	Expect<Equal<AllTrue<[IsLiteral<"a">, IsLiteral<1>, IsLiteral<true>]>, true>>,
	Expect<Equal<AllTrue<[IsLiteral<"a">, IsLiteral<string>]>, false>>,
	Expect<Equal<AnyTrue<[IsLiteral<string>, IsLiteral<1>]>, true>>,
];

test("type-level assertions compile", () => {
	// The assertions above are enforced by the typechecker; if any Expect<...>
	// resolved to a non-`true` type, this file would fail to compile and
	// `vitest --typecheck` would report it. Referencing the tuples here keeps them
	// "used" without exporting from a test file.
	type _all = [
		_if,
		_notAndOr,
		_derived,
		_folds,
		_assignability,
		_identity,
		_literals,
		_tuples,
		_shapes,
		_modifiers,
		_composition,
	];
	const _assertions: _all | undefined = undefined;
	void _assertions;
});
