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
 * @fileoverview Type-level tests for the package barrel (`index.ts`). Every
 * `Expect<...>` line is a compile-time assertion — this file failing to
 * type-check IS the test failure. Run via `vitest --typecheck` (wired into this
 * package's `test` script).
 *
 * The barrel has its own contract, distinct from any single module's: a symbol
 * is only public if `index.ts` re-exports it, and a re-export can lose meaning
 * on the way through. Two things are pinned here.
 *
 * 1. **The namespace merge survives `export type`.** `Predicate` and
 *    `Refinement` are each an `interface` merged with a same-named
 *    `export declare namespace`. A `declare namespace` holding only types has no
 *    *value* meaning, so `export type { Predicate }` should carry both the type
 *    and the namespace meanings through one specifier — but "should" is not
 *    "does", and the failure mode is silent at the definition site and only
 *    visible to a consumer. If these assertions stop compiling, the fix is to
 *    re-export the two namespace hosts without the `type` modifier; it is
 *    **not** `export * as`, which `CODE_STYLE.md` §11 bans.
 * 2. **The seven flat aliases are genuinely gone.** `AnyPredicate`,
 *    `AnyRefinement`, `GuardInput`, `GuardedIntersection`, `GuardedType`,
 *    `GuardedUnion`, and `PredicateInput` were replaced by `Predicate.*` /
 *    `Refinement.*` members in 0.2.0. A stale re-export left behind in the
 *    barrel would keep compiling and keep shipping; the `@ts-expect-error`
 *    imports below turn that into a build failure.
 */

import { test } from "vitest";
// --- deleted flat aliases: importing any of these must be an error -----------
// Each `@ts-expect-error` is itself checked — if an alias were re-added to the
// barrel, the unused-directive error would fail this file.
// @ts-expect-error - removed in 0.2.0; use `Predicate.Any`.
import type { AnyPredicate } from "./index.js";
// @ts-expect-error - removed in 0.2.0; use `Refinement.Any`.
import type { AnyRefinement } from "./index.js";
// @ts-expect-error - removed in 0.2.0; use `Refinement.In`.
import type { GuardInput } from "./index.js";
// @ts-expect-error - removed in 0.2.0; use `Refinement.OutIntersection`.
import type { GuardedIntersection } from "./index.js";
// @ts-expect-error - removed in 0.2.0; use `Refinement.Out`.
import type { GuardedType } from "./index.js";
// @ts-expect-error - removed in 0.2.0; use `Refinement.OutUnion`.
import type { GuardedUnion } from "./index.js";
// @ts-expect-error - removed in 0.2.0; use `Predicate.In`.
import type { PredicateInput } from "./index.js";
import { and, eqv, everyOf, isString, nand, someOf } from "./index.js";
import type { BoolEqv, isNumber, Predicate, Refinement, TypeGuard } from "./index.js";
import type { Equal, Expect } from "./testing.js";

type _deletedAliases = [
	AnyPredicate,
	AnyRefinement,
	GuardInput,
	GuardedIntersection,
	GuardedType,
	GuardedUnion,
	PredicateInput,
];

// --- the interface + namespace merge survives the barrel ----------------------
type _merging = [
	// The type meaning: `Predicate` and `Refinement` are still callable shapes.
	Expect<Equal<ReturnType<Predicate<string>>, boolean>>,
	Expect<Equal<Parameters<Refinement<string, "a">>, [string]>>,
	// The namespace meaning, reached through the *same* imported identifier.
	Expect<Equal<Predicate.In<Predicate<string>>, string>>,
	Expect<Equal<Refinement.In<TypeGuard<string>>, unknown>>,
	Expect<Equal<Refinement.Out<TypeGuard<string>>, string>>,
	Expect<Equal<Refinement.Out<Refinement<string | number, string>>, string>>,
	// The constraint slots resolve, which proves the members are real declarations
	// and not an `any` standing in for a missing name.
	Expect<Equal<Refinement.OutUnion<[TypeGuard<string>, TypeGuard<number>]>, string | number>>,
	Expect<
		Equal<
			Refinement.OutIntersection<[TypeGuard<{ a: 1 }>, TypeGuard<{ b: 2 }>]>,
			{ a: 1 } & { b: 2 }
		>
	>,
];

// --- `Refinement.Out` / `Refinement.In` still distribute ----------------------
// `OutUnion` and `OutIntersection` are defined as `Out<Gs[number]>`, so they only
// work because `Out` distributes over the union it is handed. Suppressing that by
// tuple-wrapping the conditional — the shape Effect uses — would silently reduce
// both of them to the first member. This is the assertion that catches it.
type _distributivity = [
	Expect<Equal<Refinement.Out<TypeGuard<string> | TypeGuard<number>>, string | number>>,
	Expect<Equal<Refinement.In<Refinement<string, "a"> | Refinement<number, 1>>, string | number>>,
];

// --- new 0.2.0 exports are reachable through the barrel -----------------------
type _newExports = [
	// `everyOf` / `someOf` fold an iterable rather than a variadic argument list.
	Expect<Equal<ReturnType<typeof everyOf<string>>, Predicate<string>>>,
	Expect<Equal<ReturnType<typeof someOf<string>>, Predicate<string>>>,
	// `BoolEqv` completes the type-level boolean algebra.
	Expect<Equal<BoolEqv<true, true>, true>>,
	Expect<Equal<BoolEqv<true, false>, false>>,
	Expect<Equal<BoolEqv<false, true>, false>>,
	Expect<Equal<BoolEqv<false, false>, true>>,
];

// --- guards re-exported from the barrel still narrow --------------------------
type _guards = [
	Expect<Equal<Refinement.Out<typeof isString>, string>>,
	Expect<Equal<Refinement.Out<typeof isNumber>, number>>,
];

test("barrel type-level assertions compile", () => {
	// The assertions above are enforced by the typechecker; if any Expect<...>
	// resolved to a non-`true` type, this file would fail to compile and
	// `vitest --typecheck` would report it. Referencing the tuples here keeps them
	// "used" without exporting from a test file.
	type _all = [_deletedAliases, _merging, _distributivity, _newExports, _guards];
	const _assertions: _all | undefined = undefined;
	void _assertions;

	// Runtime touches, so the barrel's *value* re-exports are proven to exist and
	// not merely to type-check. `nand` and `eqv` are exercised in both call forms,
	// which is the half of the dual contract a plain re-export can silently drop.
	const isNonEmpty = (value: string): boolean => value.length > 0;

	void and(isString, (value: unknown): value is string => isString(value) && isNonEmpty(value));
	void nand<string>(isNonEmpty, isNonEmpty);
	void nand<string>(isNonEmpty)(isNonEmpty);
	void eqv<string>(isNonEmpty, isNonEmpty);
	void eqv<string>(isNonEmpty)(isNonEmpty);
	void everyOf<string>([]);
	void someOf<string>([]);
});
