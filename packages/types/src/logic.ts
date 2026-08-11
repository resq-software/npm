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
 * @fileoverview Boolean algebra and shape interrogation at the type level.
 *
 * @module @resq-systems/types/logic
 *
 * Conditional types are the `if` statement of the type system, and like every
 * `if` statement they are easy to get subtly wrong. The most common mistake is
 * forgetting that a conditional whose checked type is a naked type parameter
 * **distributes** over unions — so `T extends true ? A : B` handed a plain
 * `boolean` (which is really `true | false`) evaluates both arms and hands back
 * `A | B`. Your carefully written `IsFoo<T>` comes back as `boolean`, every
 * downstream `extends true` check goes soft, and nothing errors.
 *
 * Every operator here tuple-wraps its conditional (`[C] extends [true]`) so that
 * cannot happen. {@link And}, {@link Or}, and friends additionally re-normalize
 * their operands through {@link If} rather than passing a parameter straight
 * through, which means a `boolean` input yields a **definite** `true` or `false`
 * answer instead of leaking back out. The one deliberate exception is
 * {@link ExtendsDistributive}, which distributes on purpose and says so in its
 * name — shipping both spellings under distinct names is the fix, not the bug.
 *
 * The boolean fragment is complete as a two-operand algebra: {@link Not},
 * {@link And}, {@link Or}, {@link BoolXor}, {@link Nand}, {@link Nor},
 * {@link BoolEqv}, and {@link Implies}, plus the variadic folds {@link AllTrue}
 * and {@link AnyTrue}.
 *
 * Zero runtime code: this module compiles to an empty JavaScript file. It is
 * reachable both through the package barrel and through its own
 * `@resq-systems/types/logic` subpath; every example in this file imports from
 * the subpath, which is what a consumer copying one should do.
 *
 * **Example** (Guarding a generic on a computed condition)
 *
 * ```ts doctest
 * import type { And, Extends, Not } from "@resq-systems/types/logic";
 *
 * type IsReadonlyTuple<T> = And<Extends<T, readonly unknown[]>, Not<Extends<T, unknown[]>>>;
 *
 * const frozen: IsReadonlyTuple<readonly [1, 2]> = true;
 * const mutable: IsReadonlyTuple<[1, 2]> = false;
 * ```
 *
 * This module intentionally does **not** re-export `IsAny`, `IsNever`, or
 * `IsUnknown` (they live in `@resq-systems/types/testing`) nor `IsUnion` (it
 * lives in `collection.ts`); the package barrel already surfaces all four, and a
 * second export path for the same symbol would be a duplicate-export error.
 * `Equal` is surfaced here under this module's `Is*` naming scheme as
 * {@link IsEqual}.
 */

import type { Equal, IsAny, IsNever } from "./testing.js";

//#region Internal

/**
 * The empty object type, isolated behind an alias so the one lint suppression it
 * needs lives at exactly one site. Used as the "requires no key" probe by
 * {@link IsStringLiteral} and {@link IsOptionalKey}.
 *
 * @internal
 */
// biome-ignore lint/complexity/noBannedTypes: `{}` is load-bearing — it is the probe that asks "does this shape require any key at all?", which is precisely how a literal string type is told apart from a widened one.
type EmptyShape = {};

/**
 * `true` when `T` is assignable to `Wide` but `Wide` is not assignable back —
 * i.e. `T` is a *strictly* narrower inhabitant of the `Wide` domain. `never` is
 * excluded, since it is narrower than everything and a literal of nothing.
 *
 * @internal
 */
type NarrowerThan<T, Wide> = If<IsNever<T>, false, And<Extends<T, Wide>, Not<Extends<Wide, T>>>>;

/**
 * `true` for a variadic tuple — one with a known element at the head or at the
 * tail, such as `[1, ...number[]]` or `[...number[], 1]`. A plain `number[]`
 * matches neither, which is exactly how the two are told apart when their
 * `length` is equally `number`.
 *
 * @internal
 */
type IsVariadicShape<T extends readonly unknown[]> = Or<
	Extends<T, readonly [unknown, ...unknown[]]>,
	Extends<T, readonly [...unknown[], unknown]>
>;

//#endregion

//#region Conditional primitive

/**
 * Resolves to `Then` when the condition `C` is exactly `true`, and to `Else`
 * otherwise.
 *
 * **When to use**
 *
 * Use as the type-level ternary, and use it in preference to an inline
 * `C extends true ? Then : Else` anywhere `C` is a type parameter — the inline
 * form is the one that goes wrong. Every other operator in this module is built
 * from it.
 *
 * **Details**
 *
 * The tuple wrapping around `C` is the entire reason this exists rather than the
 * inline conditional. A bare check distributes over `boolean` — which is the
 * union `true | false` — and hands back `Then | Else`, so an unresolved
 * condition quietly widens the result instead of failing. `If` collapses that to
 * the `Else` branch.
 *
 * `Then` and `Else` are arbitrary types, not just booleans; the boolean
 * operators below happen to instantiate them with `true` and `false`.
 *
 * **Gotchas**
 *
 * `If<boolean, A, B>` is `B`, never `A | B`. The rule is that an *unproven*
 * condition is not a true one. That is the safe reading — but if a `boolean`
 * reaches `If` because an upstream operator leaked instead of normalizing, the
 * symptom is a silently wrong `Else`, not an error. Normalize at the source.
 *
 * **Example** (Choosing a branch on a proven condition)
 *
 * ```ts doctest
 * import type { If } from "@resq-systems/types/logic";
 *
 * const chosen: If<true, string, number> = "value";
 * const otherwise: If<false, string, number> = 42;
 * // An un-narrowed `boolean` is not a proven `true`, so `Else` wins.
 * const unproven: If<boolean, string, number> = 42;
 * ```
 *
 * @typeParam C - The condition. Only the literal `true` takes the `Then` branch.
 * @typeParam Then - Result when `C` is `true`.
 * @typeParam Else - Result when `C` is `false` or the un-narrowed `boolean`.
 * @see {@link Not}
 * @see {@link And}
 * @category utility types
 * @since 0.2.0
 */
export type If<C extends boolean, Then, Else> = [C] extends [true] ? Then : Else;

//#endregion

//#region Boolean algebra

/**
 * Logical negation — `true` when the operand is not exactly `true`.
 *
 * **When to use**
 *
 * Use to invert a computed condition inside a generic bound, and as the building
 * block for the negated operators {@link Nand}, {@link Nor}, and
 * {@link BoolEqv}.
 *
 * **Details**
 *
 * Inherits {@link If}'s non-distributive behavior, so `Not<boolean>` is a
 * definite `true` rather than `boolean` — an unproven condition negates to
 * "true, it is not proven".
 *
 * **Example** (Inverting a condition)
 *
 * ```ts doctest
 * import type { Not } from "@resq-systems/types/logic";
 *
 * const negated: Not<true> = false;
 * const restored: Not<false> = true;
 * ```
 *
 * @typeParam B - The operand.
 * @see {@link If}
 * @see {@link Nand}
 * @see {@link Nor}
 * @category utility types
 * @since 0.2.0
 */
export type Not<B extends boolean> = If<B, false, true>;

/**
 * Logical conjunction — `true` only when both operands are exactly `true`.
 *
 * **When to use**
 *
 * Use to require two conditions at once in a generic constraint, or to fold two
 * `Is*` probes into a single definite answer.
 *
 * **Details**
 *
 * The inner `If<B, true, false>` rather than a bare `B` is what keeps a
 * `boolean` second argument from leaking through into the result. Without it,
 * `And<true, boolean>` would resolve to `boolean` and every downstream
 * `extends true` test would go soft.
 *
 * **Example** (Requiring both conditions)
 *
 * ```ts doctest
 * import type { And } from "@resq-systems/types/logic";
 *
 * const both: And<true, true> = true;
 * const missingOne: And<true, false> = false;
 * // An un-narrowed operand is normalized rather than leaked.
 * const unproven: And<true, boolean> = false;
 * ```
 *
 * @typeParam A - Left operand.
 * @typeParam B - Right operand.
 * @see {@link Or}
 * @see {@link Nand}
 * @see {@link AllTrue}
 * @category utility types
 * @since 0.2.0
 */
export type And<A extends boolean, B extends boolean> = If<A, If<B, true, false>, false>;

/**
 * Logical disjunction — `true` when either operand is exactly `true`.
 *
 * **When to use**
 *
 * Use to accept either of two conditions, most often to widen a probe ("a string
 * literal *or* a numeric literal").
 *
 * **Details**
 *
 * Normalizes its operands the same way {@link And} does, so an un-narrowed
 * `boolean` operand yields a definite answer instead of leaking back out.
 *
 * **Example** (Accepting either condition)
 *
 * ```ts doctest
 * import type { Or } from "@resq-systems/types/logic";
 *
 * const either: Or<false, true> = true;
 * const neither: Or<false, false> = false;
 * ```
 *
 * @typeParam A - Left operand.
 * @typeParam B - Right operand.
 * @see {@link And}
 * @see {@link Nor}
 * @see {@link AnyTrue}
 * @category utility types
 * @since 0.2.0
 */
export type Or<A extends boolean, B extends boolean> = If<A, true, If<B, true, false>>;

/**
 * Exclusive or — `true` when the operands differ.
 *
 * **When to use**
 *
 * Use to express "exactly one of these two, not both" in a generic bound — the
 * classic case being a pair of mutually exclusive configuration flags.
 *
 * **Details**
 *
 * Named `BoolXor` and deliberately **not** `Xor`, because `object.ts` already
 * exports `XOR` for the object-level exclusive or. Two exports differing only in
 * case is legal TypeScript and a genuine review and autocomplete hazard in a
 * package with a flat barrel. {@link BoolEqv} carries the same prefix for
 * symmetry, and is its negation.
 *
 * **Example** (Requiring exactly one of two flags)
 *
 * ```ts doctest
 * import type { BoolXor } from "@resq-systems/types/logic";
 *
 * const differ: BoolXor<true, false> = true;
 * const agree: BoolXor<true, true> = false;
 * ```
 *
 * @typeParam A - Left operand.
 * @typeParam B - Right operand.
 * @see {@link BoolEqv}
 * @see `XOR` in `@resq-systems/types` for the object-level counterpart.
 * @category utility types
 * @since 0.2.0
 */
export type BoolXor<A extends boolean, B extends boolean> = If<A, Not<B>, If<B, true, false>>;

/**
 * Negated conjunction — `true` unless **both** operands are `true`.
 *
 * **When to use**
 *
 * Use when a generic constraint needs to express "not both of these" without
 * nesting a {@link Not} around an {@link And} at every use site.
 *
 * **Details**
 *
 * `Nand<A, B>` is exactly `Not<And<A, B>>`, and De Morgan's law holds over the
 * normalized operators: it equals `Or<Not<A>, Not<B>>`.
 *
 * **Example** (Forbidding the both-true case)
 *
 * ```ts doctest
 * import type { Nand } from "@resq-systems/types/logic";
 *
 * const bothTrue: Nand<true, true> = false;
 * const notBoth: Nand<true, false> = true;
 * ```
 *
 * @typeParam A - Left operand.
 * @typeParam B - Right operand.
 * @see {@link And}
 * @see {@link Nor}
 * @category utility types
 * @since 0.2.0
 */
export type Nand<A extends boolean, B extends boolean> = Not<And<A, B>>;

/**
 * Negated disjunction — `true` only when **neither** operand is `true`.
 *
 * **When to use**
 *
 * Use to assert that two conditions both fail — "this is neither an array nor a
 * function" — without spelling out a nested negation.
 *
 * **Details**
 *
 * `Nor<A, B>` is exactly `Not<Or<A, B>>`, and by De Morgan equals
 * `And<Not<A>, Not<B>>`.
 *
 * **Example** (Asserting that both conditions fail)
 *
 * ```ts doctest
 * import type { Nor } from "@resq-systems/types/logic";
 *
 * const neither: Nor<false, false> = true;
 * const oneHolds: Nor<true, false> = false;
 * ```
 *
 * @typeParam A - Left operand.
 * @typeParam B - Right operand.
 * @see {@link Or}
 * @see {@link Nand}
 * @category utility types
 * @since 0.2.0
 */
export type Nor<A extends boolean, B extends boolean> = Not<Or<A, B>>;

/**
 * Logical equivalence — `true` when the operands agree, whether both are `true`
 * or both are `false`.
 *
 * **When to use**
 *
 * Use to require that two independently computed conditions move together — "the
 * field is nullable if and only if the column is nullable" — which is the shape a
 * consistency check between two probes takes.
 *
 * **Details**
 *
 * The negation of {@link BoolXor}, and the last two-operand operator needed for
 * the algebra here to be complete. It is equally `And<Implies<A, B>, Implies<B,
 * A>>` — "each implies the other" — which is the reading to reach for when the
 * operands are a precondition and a postcondition rather than two symmetric
 * flags.
 *
 * Named `BoolEqv` rather than `Eqv` for symmetry with {@link BoolXor}, which
 * carries the prefix because `object.ts` already exports `XOR` into the same
 * flat barrel. Matching the pair beats saving four characters on one of them.
 *
 * **Example** (Requiring two conditions to agree)
 *
 * ```ts doctest
 * import type { BoolEqv } from "@resq-systems/types/logic";
 *
 * const bothTrue: BoolEqv<true, true> = true;
 * const bothFalse: BoolEqv<false, false> = true;
 * const disagree: BoolEqv<true, false> = false;
 * ```
 *
 * @typeParam A - Left operand.
 * @typeParam B - Right operand.
 * @see {@link BoolXor}
 * @see {@link Implies}
 * @see {@link eqv} in `@resq-systems/types/predicate` for the value-level counterpart.
 * @category utility types
 * @since 0.2.0
 */
export type BoolEqv<A extends boolean, B extends boolean> = Not<BoolXor<A, B>>;

/**
 * Material implication — `A` implies `B`.
 *
 * **When to use**
 *
 * Use to encode a conditional requirement in a generic bound — "*if* the
 * parameter is a tuple, *then* it must also be readonly" — without splitting the
 * signature into two overloads.
 *
 * **Details**
 *
 * `false` in exactly one case, where the antecedent holds and the consequent does
 * not; a false antecedent is vacuously true. Implication is not symmetric —
 * {@link BoolEqv} is the two-way form.
 *
 * **Example** (Encoding a conditional requirement)
 *
 * ```ts doctest
 * import type { Implies } from "@resq-systems/types/logic";
 *
 * const holds: Implies<true, true> = true;
 * // The only falsifying case.
 * const broken: Implies<true, false> = false;
 * // A false antecedent is vacuously true.
 * const vacuous: Implies<false, false> = true;
 * ```
 *
 * @typeParam A - Antecedent.
 * @typeParam B - Consequent.
 * @see {@link BoolEqv}
 * @see {@link Or}
 * @category utility types
 * @since 0.2.0
 */
export type Implies<A extends boolean, B extends boolean> = If<A, If<B, true, false>, true>;

/**
 * Variadic conjunction — `true` when every member of the tuple is `true`.
 *
 * **When to use**
 *
 * Use to fold a list of computed conditions into one answer; the type-level
 * counterpart to a runtime `allOf` predicate combinator.
 *
 * **Details**
 *
 * An empty tuple is `true`, matching both the mathematical convention for an
 * empty conjunction and `Array.prototype.every`. An unbounded `boolean[]` cannot
 * prove all-true and is `false`.
 *
 * Named `AllTrue` rather than `Every`, which reads like an array-method helper
 * and would invite a collision with `collection.ts`.
 *
 * **Example** (Folding several probes into one condition)
 *
 * ```ts doctest
 * import type { AllTrue } from "@resq-systems/types/logic";
 *
 * const allHold: AllTrue<[true, true, true]> = true;
 * const oneFails: AllTrue<[true, false, true]> = false;
 * // Vacuously true, as an empty conjunction should be.
 * const empty: AllTrue<[]> = true;
 * ```
 *
 * @typeParam T - A tuple of boolean literals.
 * @see {@link And}
 * @see {@link AnyTrue}
 * @category utility types
 * @since 0.2.0
 */
export type AllTrue<T extends readonly boolean[]> = [T[number]] extends [true] ? true : false;

/**
 * Variadic disjunction — `true` when at least one member of the tuple is `true`.
 *
 * **When to use**
 *
 * Use to ask whether *any* of a list of computed conditions holds; the type-level
 * counterpart to a runtime `anyOf` predicate combinator.
 *
 * **Details**
 *
 * An empty tuple is `false`, the dual of {@link AllTrue}'s vacuous `true`.
 *
 * Note the reversed operand order in the implementation: `true extends T[number]`
 * rather than the naive `T[number] extends true`. Asking whether the literal
 * `true` is a member of the element union is a membership test; writing it the
 * other way round answers a different — and here, wrong — question.
 *
 * **Example** (Asking whether any probe holds)
 *
 * ```ts doctest
 * import type { AnyTrue } from "@resq-systems/types/logic";
 *
 * const someHold: AnyTrue<[false, true]> = true;
 * const noneHold: AnyTrue<[false, false]> = false;
 * const empty: AnyTrue<[]> = false;
 * ```
 *
 * @typeParam T - A tuple of boolean literals.
 * @see {@link Or}
 * @see {@link AllTrue}
 * @category utility types
 * @since 0.2.0
 */
export type AnyTrue<T extends readonly boolean[]> = true extends T[number] ? true : false;

//#endregion

//#region Relational tests

/**
 * Non-distributive assignability — is `A` assignable to `B`, asked of the type as
 * a whole?
 *
 * **When to use**
 *
 * Use for roughly nine assignability questions out of ten. A union is tested as a
 * whole rather than member by member, so the result is always a definite `true`
 * or `false` and never a mushy `boolean`.
 *
 * **Details**
 *
 * `Extends<never, B>` is `true` for every `B`, because `never` is assignable to
 * everything — the tuple wrapping preserves that rather than collapsing to
 * `never` the way the distributive form does.
 *
 * **Example** (Testing a union as a whole)
 *
 * ```ts doctest
 * import type { Extends } from "@resq-systems/types/logic";
 *
 * const wholeUnionIsString: Extends<"a" | "b", string> = true;
 * const widenedIsNotLiteral: Extends<string, "a"> = false;
 * // The union as a whole is not a string, and the answer is definite.
 * const mixedUnion: Extends<"a" | 1, string> = false;
 * ```
 *
 * @typeParam A - The candidate type.
 * @typeParam B - The target type.
 * @see {@link ExtendsDistributive} when you want the per-member answer.
 * @see {@link IsSubtypeOf}
 * @category utility types
 * @since 0.2.0
 */
export type Extends<A, B> = [A] extends [B] ? true : false;

/**
 * Distributive assignability — does *every member* of `A` extend `B`, answered
 * per member?
 *
 * **When to use**
 *
 * Use only when the per-member answer is genuinely what you want, and reach for
 * {@link Extends} otherwise.
 *
 * **Details**
 *
 * Handed a union, this evaluates once per constituent and unions the results, so
 * a partially matching union honestly resolves to `boolean`. That is the correct
 * and informative answer — "some do, some do not" — but it is emphatically not
 * what {@link Extends} reports, and writing one when you meant the other is the
 * single most common type-level bug. Shipping both under distinct names is the
 * fix.
 *
 * **Gotchas**
 *
 * Distribution over `never` yields `never`, not `true`: there are no members to
 * evaluate, so there is no answer. Both a `boolean` and a `never` result flowing
 * into {@link If} silently take the `Else` branch.
 *
 * **Example** (Contrasting the two readings)
 *
 * ```ts doctest
 * import type { Extends, ExtendsDistributive } from "@resq-systems/types/logic";
 *
 * const everyMemberIsString: ExtendsDistributive<"a" | "b", string> = true;
 * // A mixed union honestly reports "some do, some do not" — i.e. `boolean`.
 * const mixed: ExtendsDistributive<"a" | 1, string> = false;
 * // The non-distributive form gives a definite answer for the same input.
 * const asAWhole: Extends<"a" | 1, string> = false;
 * ```
 *
 * @typeParam A - The candidate type; distributed over when it is a union.
 * @typeParam B - The target type.
 * @see {@link Extends}
 * @category utility types
 * @since 0.2.0
 */
export type ExtendsDistributive<A, B> = A extends B ? true : false;

/**
 * Strict type identity — `true` only when `A` and `B` are the *same* type, not
 * merely mutually assignable.
 *
 * **When to use**
 *
 * Use when the question is identity rather than compatibility: distinguishing
 * `any` from `unknown`, `{ a: 1 }` from `{ readonly a: 1 }`, or an optional
 * property from one typed `| undefined`. Use {@link IsMutuallyAssignable} when
 * the question is really "can these be swapped at a call boundary?".
 *
 * **Details**
 *
 * A pure alias of the test kit's `Equal`, imported rather than reimplemented:
 * two competing identity checks in one package is a bug factory. It exists under
 * this name so the logic module's `Is*` prefix stays consistent across its
 * neighbors while `Equal` keeps reading as a test-kit name.
 *
 * **Gotchas**
 *
 * Known limitations, inherited from the conditional-identity trick it is built
 * on: intersections are compared structurally rather than after reduction (so
 * `IsEqual<{ a: 1 } & { b: 2 }, { a: 1; b: 2 }>` is `false`), and any comparison
 * with `any` on exactly one side is `false` by design.
 *
 * **Example** (Detecting a modifier difference)
 *
 * ```ts doctest
 * import type { IsEqual } from "@resq-systems/types/logic";
 *
 * const same: IsEqual<{ a: 1 }, { a: 1 }> = true;
 * // `readonly` is invisible to assignability but not to identity.
 * const modifierDiffers: IsEqual<{ a: 1 }, { readonly a: 1 }> = false;
 * ```
 *
 * @typeParam A - Left type.
 * @typeParam B - Right type.
 * @see {@link IsMutuallyAssignable}
 * @see `Equal` in `@resq-systems/types/testing`.
 * @category utility types
 * @since 0.2.0
 */
export type IsEqual<A, B> = Equal<A, B>;

/**
 * Proper subtype — `A` is assignable to `B` *and* is not the same type.
 *
 * **When to use**
 *
 * Use when asserting that a refinement actually refined something. Plain
 * assignability is reflexive and would happily pass for a no-op.
 *
 * **Details**
 *
 * Composed as `And<Extends<A, B>, Not<IsEqual<A, B>>>`, so it inherits
 * {@link IsEqual}'s identity semantics — two mutually assignable types differing
 * only in a `readonly` modifier count as *proper* subtypes of each other.
 *
 * **Example** (Proving a refinement narrowed)
 *
 * ```ts doctest
 * import type { IsSubtypeOf } from "@resq-systems/types/logic";
 *
 * const narrowed: IsSubtypeOf<"a", string> = true;
 * // Equal is not *proper*.
 * const noop: IsSubtypeOf<string, string> = false;
 * ```
 *
 * @typeParam A - The candidate subtype.
 * @typeParam B - The candidate supertype.
 * @see {@link IsSupertypeOf}
 * @see {@link Extends}
 * @category utility types
 * @since 0.2.0
 */
export type IsSubtypeOf<A, B> = And<Extends<A, B>, Not<IsEqual<A, B>>>;

/**
 * Proper supertype — the mirror of {@link IsSubtypeOf}.
 *
 * **When to use**
 *
 * Use to lock a variance assertion in a `*.test-d.ts` file, where the point is
 * that a type widened rather than stayed put.
 *
 * **Example** (Locking a widening assertion)
 *
 * ```ts doctest
 * import type { IsSupertypeOf } from "@resq-systems/types/logic";
 *
 * const widened: IsSupertypeOf<string, "a"> = true;
 * const unchanged: IsSupertypeOf<string, string> = false;
 * ```
 *
 * @typeParam A - The candidate supertype.
 * @typeParam B - The candidate subtype.
 * @see {@link IsSubtypeOf}
 * @category utility types
 * @since 0.2.0
 */
export type IsSupertypeOf<A, B> = And<Extends<B, A>, Not<IsEqual<A, B>>>;

/**
 * Mutual assignability — each type is assignable to the other.
 *
 * **When to use**
 *
 * Use when asserting **API compatibility** ("can these two be swapped at a call
 * boundary?") rather than identity ("are these the same type?").
 *
 * **Details**
 *
 * Strictly weaker than {@link IsEqual}: it ignores the `readonly` and optionality
 * differences that `Equal` detects. That is frequently the check you actually
 * want, and just as frequently not — pick deliberately.
 *
 * **Example** (Compatibility versus identity)
 *
 * ```ts doctest
 * import type { IsEqual, IsMutuallyAssignable } from "@resq-systems/types/logic";
 *
 * const swappable: IsMutuallyAssignable<{ a: 1 }, { readonly a: 1 }> = true;
 * // Contrast: identity sees the modifier.
 * const identical: IsEqual<{ a: 1 }, { readonly a: 1 }> = false;
 * ```
 *
 * @typeParam A - Left type.
 * @typeParam B - Right type.
 * @see {@link IsEqual}
 * @category utility types
 * @since 0.2.0
 */
export type IsMutuallyAssignable<A, B> = And<Extends<A, B>, Extends<B, A>>;

//#endregion

//#region Shape interrogation

/**
 * `true` when `S` is a string *literal* type (or a union of them) rather than the
 * widened `string`.
 *
 * **When to use**
 *
 * Use to branch a mapped or template-literal type on whether the caller passed a
 * concrete key, and to reject the widened `string` before it silently produces an
 * index signature.
 *
 * **Details**
 *
 * Implemented with the index-signature probe — "does a shape keyed by `S` require
 * any key at all?" — instead of the naive bidirectional-`extends` check. `any`
 * and `never` are `false`.
 *
 * **Gotchas**
 *
 * The naive version reports `true` for `Uppercase<string>` and for template
 * patterns like `` `on${string}` ``, because neither is assignable back from
 * `string` even though both describe infinitely many values. Those are **not**
 * literals and are reported as such here — a deliberate divergence from several
 * ecosystem implementations carrying the same name.
 *
 * **Example** (Telling a literal from a pattern)
 *
 * ```ts doctest
 * import type { IsStringLiteral } from "@resq-systems/types/logic";
 *
 * const literal: IsStringLiteral<"a"> = true;
 * const unionOfLiterals: IsStringLiteral<"a" | "b"> = true;
 * const widened: IsStringLiteral<string> = false;
 * // A pattern, not a literal — the case the naive check gets wrong.
 * const pattern: IsStringLiteral<`on${string}`> = false;
 * ```
 *
 * @typeParam S - The type to interrogate.
 * @see {@link IsLiteral}
 * @see {@link IsNumericLiteral}
 * @category utility types
 * @since 0.2.0
 */
export type IsStringLiteral<S> = If<
	Or<IsAny<S>, IsNever<S>>,
	false,
	[S] extends [infer Narrowed extends string]
		? EmptyShape extends Record<Narrowed, never>
			? false
			: true
		: false
>;

/**
 * `true` when `N` is a numeric literal type — covering both `number` and `bigint`
 * literals.
 *
 * **When to use**
 *
 * Use when constraining an array index, a tuple length, or a fixed-precision
 * scale, where a widened `number` must be rejected.
 *
 * **Details**
 *
 * Covers `bigint` as well as `number`, matching the domain the ecosystem
 * expects — which is why it is not named `IsNumberLiteral`. Exported on its own
 * and not merely folded into {@link IsLiteral} because callers regularly need
 * exactly this question answered.
 *
 * **Example** (Rejecting a widened number)
 *
 * ```ts doctest
 * import type { IsNumericLiteral } from "@resq-systems/types/logic";
 *
 * const literal: IsNumericLiteral<1> = true;
 * const bigLiteral: IsNumericLiteral<1n> = true;
 * const widened: IsNumericLiteral<number> = false;
 * ```
 *
 * @typeParam N - The type to interrogate.
 * @see {@link IsLiteral}
 * @see {@link IsStringLiteral}
 * @category utility types
 * @since 0.2.0
 */
export type IsNumericLiteral<N> = If<
	IsAny<N>,
	false,
	Or<NarrowerThan<N, number>, NarrowerThan<N, bigint>>
>;

/**
 * `true` when `B` is exactly `true` or exactly `false`, and `false` for the
 * widened `boolean`.
 *
 * **When to use**
 *
 * Use to verify that a boolean-valued type parameter was actually resolved before
 * it is fed to {@link If}, which would otherwise silently take the `Else` branch.
 *
 * **Details**
 *
 * Needed as its own export because `boolean` is internally the union
 * `true | false`, which trips every naive literal check — a bidirectional
 * `extends` against `boolean` passes for `true` *and* for `boolean` unless the
 * comparison is tuple-wrapped, as it is here.
 *
 * **Example** (Catching an unresolved condition)
 *
 * ```ts doctest
 * import type { IsBooleanLiteral } from "@resq-systems/types/logic";
 *
 * const resolvedTrue: IsBooleanLiteral<true> = true;
 * const resolvedFalse: IsBooleanLiteral<false> = true;
 * // The case every naive check fails.
 * const unresolved: IsBooleanLiteral<boolean> = false;
 * ```
 *
 * @typeParam B - The type to interrogate.
 * @see {@link IsLiteral}
 * @see {@link If}
 * @category utility types
 * @since 0.2.0
 */
export type IsBooleanLiteral<B> = If<IsAny<B>, false, NarrowerThan<B, boolean>>;

/**
 * `true` when `T` is any primitive literal — string, numeric, or boolean.
 *
 * **When to use**
 *
 * Use for the composed question people actually ask: "did the caller pass a
 * literal, or did inference widen it to a bare primitive?" Reach for the three
 * specific probes when only one domain is in play.
 *
 * **Details**
 *
 * A disjunction of {@link IsStringLiteral}, {@link IsNumericLiteral}, and
 * {@link IsBooleanLiteral}, so it inherits each one's treatment of `any`,
 * `never`, and template patterns. Object and array types are `false`: "literal"
 * here means a primitive literal, not an object literal.
 *
 * **Example** (Detecting a widened inference)
 *
 * ```ts doctest
 * import type { IsLiteral } from "@resq-systems/types/logic";
 *
 * const stringLiteral: IsLiteral<"a"> = true;
 * const numberLiteral: IsLiteral<42> = true;
 * const booleanLiteral: IsLiteral<true> = true;
 * const widened: IsLiteral<string> = false;
 * ```
 *
 * @typeParam T - The type to interrogate.
 * @see {@link IsStringLiteral}
 * @see {@link IsNumericLiteral}
 * @see {@link IsBooleanLiteral}
 * @category utility types
 * @since 0.2.0
 */
export type IsLiteral<T> = Or<IsStringLiteral<T>, Or<IsNumericLiteral<T>, IsBooleanLiteral<T>>>;

/**
 * `true` when `T` is a tuple rather than an unbounded array.
 *
 * **When to use**
 *
 * Use before a recursive tuple traversal, which needs a statically known length
 * to terminate, and to reject a plain `T[]` at a boundary that requires
 * positional meaning.
 *
 * **Details**
 *
 * Variadic tuples such as `[1, ...number[]]` sit between the two: they have a
 * known element but a `number` length. Rather than silently pick a side, this
 * takes an explicit policy switch and defaults to the stricter, less surprising
 * answer — fixed length only. Loosening the policy must never turn a plain array
 * into a tuple, and does not.
 *
 * **Example** (Choosing a variadic policy)
 *
 * ```ts doctest
 * import type { IsTuple } from "@resq-systems/types/logic";
 *
 * const fixed: IsTuple<[1, 2]> = true;
 * const unbounded: IsTuple<number[]> = false;
 * // Variadic: excluded by default, included on request.
 * const variadicStrict: IsTuple<[1, ...number[]]> = false;
 * const variadicLoose: IsTuple<[1, ...number[]], false> = true;
 * ```
 *
 * @typeParam T - The type to interrogate.
 * @typeParam FixedOnly - When `true` (the default) a variadic tuple is **not** a
 * tuple. Pass `false` to count it as one.
 * @see {@link IsPlainObject}
 * @category utility types
 * @since 0.2.0
 */
export type IsTuple<T, FixedOnly extends boolean = true> = If<
	IsNever<T>,
	false,
	[T] extends [infer Narrowed extends readonly unknown[]]
		? number extends Narrowed["length"]
			? If<FixedOnly, false, IsVariadicShape<Narrowed>>
			: true
		: false
>;

/**
 * `true` for an ordinary object type — excluding arrays and functions, which are
 * both `object` as far as assignability is concerned.
 *
 * **When to use**
 *
 * Use as the guard clause every recursive mapped type needs. Without it a
 * `DeepPartial`-style traversal happily descends into an array's `length` and
 * `push`, mangling it. This is the type-level counterpart of a runtime
 * `isPlainObject` guard.
 *
 * **Gotchas**
 *
 * "Plain" here means *structurally* an object — arrays and callables are
 * excluded, but class instances such as `Date` or `Map` are not, because nothing
 * in a structural type system distinguishes them from an object literal with the
 * same members. Only the runtime guard can make that call.
 *
 * **Example** (Guarding a recursive traversal)
 *
 * ```ts doctest
 * import type { IsPlainObject } from "@resq-systems/types/logic";
 *
 * const record: IsPlainObject<{ a: 1 }> = true;
 * const array: IsPlainObject<number[]> = false;
 * const callable: IsPlainObject<() => void> = false;
 * // See the caveat: a structural check cannot exclude class instances.
 * const instance: IsPlainObject<Date> = true;
 * ```
 *
 * @typeParam T - The type to interrogate.
 * @see {@link IsTuple}
 * @see {@link IsEmptyObject}
 * @category utility types
 * @since 0.2.0
 */
export type IsPlainObject<T> = And<
	Extends<T, object>,
	Not<Or<Extends<T, readonly unknown[]>, Extends<T, (...args: never[]) => unknown>>>
>;

/**
 * `true` when `T` includes `null`.
 *
 * **When to use**
 *
 * Use when the question is specifically about `null` — an absent database column,
 * a cleared reference — and {@link IsUndefinable} when it is about `undefined`.
 *
 * **Details**
 *
 * **Only** `null` — a type that includes `undefined` but not `null` is not
 * nullable by this definition. That asymmetry is deliberate and is why
 * {@link IsUndefinable} exists beside it: the two describe different failure
 * modes, and conflating them is how a `??` lands in the wrong place. `any` is
 * `true`, since `any` includes everything.
 *
 * **Example** (Distinguishing null from undefined)
 *
 * ```ts doctest
 * import type { IsNullable } from "@resq-systems/types/logic";
 *
 * const nullable: IsNullable<string | null> = true;
 * // Not nullable by this definition — see IsUndefinable.
 * const undefinable: IsNullable<string | undefined> = false;
 * ```
 *
 * @typeParam T - The type to interrogate.
 * @see {@link IsUndefinable}
 * @category utility types
 * @since 0.2.0
 */
export type IsNullable<T> = If<IsAny<T>, true, [Extract<T, null>] extends [never] ? false : true>;

/**
 * `true` when `T` includes `undefined`.
 *
 * **When to use**
 *
 * Use when asking whether a *value* may be `undefined`. Use {@link IsOptionalKey}
 * when asking whether a *property* may be omitted — a different question that the
 * ecosystem name for this operator actively confuses.
 *
 * **Details**
 *
 * Renamed from the ecosystem's `IsOptional`, which is misleading: it means "this
 * type includes `undefined`", not "this property is optional". Those are
 * different facts, especially under `exactOptionalPropertyTypes`, and
 * {@link IsOptionalKey} answers the other one. Fixing a bad upstream name is
 * worth the divergence. `any` is `true`.
 *
 * **Example** (Asking about the value, not the key)
 *
 * ```ts doctest
 * import type { IsUndefinable } from "@resq-systems/types/logic";
 *
 * const undefinable: IsUndefinable<string | undefined> = true;
 * const nullable: IsUndefinable<string | null> = false;
 * ```
 *
 * @typeParam T - The type to interrogate.
 * @see {@link IsNullable}
 * @see {@link IsOptionalKey}
 * @category utility types
 * @since 0.2.0
 */
export type IsUndefinable<T> = If<
	IsAny<T>,
	true,
	[Extract<T, undefined>] extends [never] ? false : true
>;

/**
 * `true` when the property `K` of `T` is declared with a `?` modifier.
 *
 * **When to use**
 *
 * Use for the *actual* optional-property test — whether the key may be omitted
 * entirely — as opposed to {@link IsUndefinable}, which asks whether the value
 * may be `undefined`.
 *
 * **Details**
 *
 * Under this package's `exactOptionalPropertyTypes` the distinction is sharp and
 * load-bearing: `{ a?: string }` may omit the key entirely, while
 * `{ a: string | undefined }` requires the key to be present and explicitly set
 * to `undefined`. Only the first is optional.
 *
 * **Example** (Optional key versus undefined value)
 *
 * ```ts doctest
 * import type { IsOptionalKey } from "@resq-systems/types/logic";
 *
 * interface Config {
 * 	readonly retries?: number;
 * 	readonly timeout: number | undefined;
 * }
 *
 * const mayBeOmitted: IsOptionalKey<Config, "retries"> = true;
 * // Present-but-undefined is required, not optional.
 * const required: IsOptionalKey<Config, "timeout"> = false;
 * ```
 *
 * @typeParam T - The object type.
 * @typeParam K - A key of `T`.
 * @see {@link IsUndefinable}
 * @see {@link IsReadonlyKey}
 * @category utility types
 * @since 0.2.0
 */
export type IsOptionalKey<T, K extends keyof T> = EmptyShape extends Pick<T, K> ? true : false;

/**
 * `true` when the property `K` of `T` is declared `readonly`.
 *
 * **When to use**
 *
 * Use to assert that a mapped type preserved (or added, or stripped) the
 * `readonly` modifier, which no `extends` check can see.
 *
 * **Details**
 *
 * Assignability ignores `readonly` entirely — `{ readonly a: 1 }` and `{ a: 1 }`
 * are mutually assignable — so an `extends` check cannot see it. The homomorphic
 * mapped type in the implementation preserves the source modifier, and
 * {@link IsEqual} *does* detect the difference, which makes this the only
 * reliable way to ask.
 *
 * **Gotchas**
 *
 * Passing a union of keys asks an all-or-nothing question: the result is `true`
 * only when *every* named key is `readonly`.
 *
 * **Example** (Detecting a preserved modifier)
 *
 * ```ts doctest
 * import type { IsReadonlyKey } from "@resq-systems/types/logic";
 *
 * const frozen: IsReadonlyKey<{ readonly a: 1 }, "a"> = true;
 * const mutable: IsReadonlyKey<{ a: 1 }, "a"> = false;
 * // A union of keys is all-or-nothing.
 * const mixed: IsReadonlyKey<{ readonly a: 1; b: 2 }, "a" | "b"> = false;
 * ```
 *
 * @typeParam T - The object type.
 * @typeParam K - A key of `T`.
 * @see {@link IsOptionalKey}
 * @see {@link IsEqual}
 * @category utility types
 * @since 0.2.0
 */
export type IsReadonlyKey<T, K extends keyof T> = IsEqual<
	{ [P in K]: T[P] },
	{ readonly [P in K]: T[P] }
>;

/**
 * `true` when `T` has no keys at all.
 *
 * **When to use**
 *
 * Use to detect the degenerate result of a filtering mapped type — a `Pick` or
 * `Omit` that removed everything — before handing it to code that assumes at
 * least one key.
 *
 * **Details**
 *
 * Named `IsEmptyObject` because `collection.ts` already owns `IsEmpty` for
 * tuples; the two answer different questions over different domains and must not
 * share a name in a package with a flat barrel.
 *
 * **Gotchas**
 *
 * `Record<string, never>` is correctly **not** empty — it carries a string index
 * signature, so `keyof` is not `never` and a value of that type may legitimately
 * be indexed.
 *
 * **Example** (Detecting a filtered-to-nothing shape)
 *
 * ```ts doctest
 * import type { IsEmptyObject } from "@resq-systems/types/logic";
 *
 * const empty: IsEmptyObject<Record<never, never>> = true;
 * const populated: IsEmptyObject<{ a: 1 }> = false;
 * // An index signature means `keyof` is not `never`.
 * const indexed: IsEmptyObject<Record<string, never>> = false;
 * ```
 *
 * @typeParam T - The type to interrogate.
 * @see {@link IsPlainObject}
 * @category utility types
 * @since 0.2.0
 */
export type IsEmptyObject<T> = [keyof T] extends [never] ? true : false;

//#endregion
