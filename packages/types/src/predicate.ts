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
 * @fileoverview The guard algebra — combinators that take guards and return guards.
 *
 * @module @resq-systems/types/predicate
 *
 * A type predicate (`value is T`) is a **promise the compiler never checks**.
 * Every hand-written one is a place where a typo silently turns into a lie that
 * propagates through the rest of the program as fact. The fix is to stop writing
 * them: build the complicated guard out of a handful of tiny, individually
 * obvious ones, and let this file do the type arithmetic. The rule that decides
 * what lives here: **if it takes a guard as input, it is in this file.** Leaf
 * guards — value in, proof out, like `isString` — live in
 * `@resq-systems/types/guards`.
 *
 * The two fences below are illustrative rather than executable: they reference
 * bindings that are deliberately left undeclared so the shape of the idea stays
 * legible. They are plain `ts` fences for that reason, and the doctest extractor
 * skips them.
 *
 * **Example** (Composing instead of asserting)
 *
 * ```ts
 * const isUser = structOf({
 *   id: isString,
 *   age: optionalOf(isNumber),
 *   tags: arrayOf(isString),
 * });
 *
 * if (isUser(payload)) {
 *   payload.tags.map((t) => t.toUpperCase()); // ✓ readonly string[]
 * }
 * ```
 *
 * Branded types interoperate where the domains line up: `BrandRefiner<T, B>["is"]`
 * from `@resq-systems/types/brand` is a `Refinement<T, T & Brand<B>>`, so
 * {@link and} and {@link compose} accept it directly — both feed it a value
 * already known to be a `T`.
 *
 * The **shape** constructors ({@link structOf}, {@link tupleOf}, {@link arrayOf},
 * {@link recordOf}) cannot: they read fields out of an `unknown` and would hand a
 * brand guard a value it never agreed to receive, turning validation of untrusted
 * input into an uncaught `TypeError`. They require a `TypeGuard<unknown>` —
 * a guard whose domain really is `unknown` — so the adapter is explicit:
 *
 * ```ts
 * const isUser = structOf({ id: compose(isString, UserId.is) });
 * ```
 *
 * ## The dual eligibility rule
 *
 * Six combinators — {@link and}, {@link or}, {@link nand}, {@link eqv},
 * {@link implies}, {@link compose} — accept both a data-first call
 * (`and(self, that)`) and a data-last one (`and(that)`, returning
 * `(self) => …`), so they can be dropped into a `pipe`. **Nothing else in this
 * package may be dualized**, and the rule is mechanical rather than a matter of
 * taste. All three conditions must hold:
 *
 * 1. Fixed arity of exactly two — no rest parameters, no optional parameters, no
 *    defaults. Dispatch is on argument count, so an optional trailing parameter
 *    makes a legitimate one-argument data-first call indistinguishable from a
 *    data-last one.
 * 2. Both parameters are a {@link Predicate} or {@link Refinement} from this
 *    module's vocabulary, and so is the result. **Never** "a value under test" in
 *    the first position: `Array.prototype.map`/`filter` invoke their callback with
 *    `(value, index, array)`, so a dualized guard passed to one takes the
 *    data-first branch with the *index* as its second argument — and typechecks.
 * 3. The result is a `boolean` or a `value is B`, never a function. That is what
 *    makes a forgotten second argument fail: the data-last form returns a
 *    function, which no `Predicate`- or `Refinement`-typed slot accepts.
 *
 * {@link mapInput} is arity-2 and still excluded — it fails rule 2, because its
 * second parameter is an arbitrary projection that every `Predicate` structurally
 * satisfies. The variadic folds ({@link allOf}, {@link anyOf}, {@link noneOf},
 * {@link exactlyOne}, {@link tupleOf}) have no fixed arity and so fail rule 1.
 */

import type { UnionToIntersection } from "./collection.js";
import type { Simplify } from "./object.js";

//#region Vocabulary

/**
 * A boolean test over a value. The root abstraction of this module: everything
 * else either produces one, consumes one, or upgrades one into a
 * {@link Refinement}.
 *
 * **When to use**
 *
 * Use it as the parameter type wherever a function takes "a rule about a value" —
 * a filter, a validation step, a policy hook — and as the return type of any
 * combinator whose result cannot honestly narrow.
 *
 * **Details**
 *
 * `Predicate<unknown>` is assignable to `Predicate<string>` — which is what lets
 * {@link alwaysTrue}, and any predicate written against `unknown`, be reused at a
 * narrower input type without a cast. That follows from a call signature being
 * measured contravariantly in its parameter and holds with or without the
 * explicit `in`.
 *
 * The annotation is kept for two reasons:
 *
 * 1. It is a **checked assertion** that the variance can never silently flip as
 *    the interface evolves — adding an `A` in output position becomes an error
 *    here rather than a surprise at a distant call site.
 * 2. It lets the checker skip structural variance measurement, which matters for
 *    a type instantiated as heavily as this one.
 *
 * Biome's `useShorthandFunctionType` offers to rewrite this into a type alias.
 * The rewrite is *declined*, not suppressed — it reports as an info and does not
 * gate `biome check` — and the reason is house style, not a compiler constraint:
 * the interface-plus-`declare namespace` pairing is the shape every namespaced
 * export in this module uses. Do not record a stronger reason than that. As of
 * TypeScript 6.0 a type alias also accepts and enforces the `in`/`out`
 * annotations, also coexists with a same-named `declare namespace`, and Biome's
 * own autofix preserves the annotations — all three verified against this repo's
 * pinned compiler, so none of them is an argument for either form.
 *
 * **Gotchas**
 *
 * A `Predicate` promises nothing about the *type* of what it accepted. Two
 * predicates that both answered `true` cannot be intersected into a proof — that
 * is what {@link Refinement} is for.
 *
 * **Example** (Reusing an `unknown` predicate at a narrower input type)
 *
 * ```ts doctest
 * import { alwaysTrue, type Predicate } from "@resq-systems/types/predicate";
 *
 * const isShort: Predicate<string> = (value) => value.length < 10;
 * const anything: Predicate<string> = alwaysTrue;
 *
 * isShort("hello"); // => true
 * anything("hello"); // => true
 * ```
 *
 * @typeParam A - The input type the predicate accepts.
 *
 * @see {@link Refinement}
 * @see {@link TypeGuard}
 * @category models
 * @since 0.2.0
 */
export type Predicate<in A> = (value: A) => boolean;

/**
 * Type-level helpers about {@link Predicate}, merged onto the interface so they
 * read as `Predicate.Any` and `Predicate.In<P>` rather than as loose top-level
 * aliases carrying a `Predicate` prefix in their names.
 *
 * The declaration is `declare` so it emits no JavaScript and can hold nothing but
 * types.
 *
 * @since 0.2.0
 */
export declare namespace Predicate {
	/**
	 * The constraint slot for "some predicate, input type unimportant" — the bound
	 * to use on variadic tuples and predicate-keyed records.
	 *
	 * **When to use**
	 *
	 * Use it as an `extends` bound, never as the declared type of a value.
	 *
	 * **Details**
	 *
	 * `Predicate<unknown>` does **not** work in this position: contravariance means
	 * it only accepts predicates that handle *every* input, so a `Predicate<string>`
	 * would be rejected. `any` is the only bound that admits all of them, and it
	 * never escapes into a result type.
	 *
	 * **Example** (Holding predicates over unrelated domains)
	 *
	 * ```ts doctest
	 * import { type Predicate } from "@resq-systems/types/predicate";
	 *
	 * const isShort: Predicate<string> = (value) => value.length < 10;
	 * const isEven: Predicate<number> = (value) => value % 2 === 0;
	 *
	 * const witness: readonly Predicate.Any[] = [isShort, isEven];
	 * ```
	 *
	 * @see {@link Refinement.Any}
	 * @category utility types
	 * @since 0.2.0
	 */
	// biome-ignore lint/suspicious/noExplicitAny: a constraint admitting every predicate cannot be written with `unknown` — contravariance rejects narrower inputs
	export type Any = Predicate<any>;

	/**
	 * Extract what a non-narrowing {@link Predicate} accepts.
	 *
	 * **When to use**
	 *
	 * Use it to key a registry on the domain a rule applies to, or to assert at
	 * compile time that a predicate is applicable before wiring it into a dispatch
	 * table.
	 *
	 * **Details**
	 *
	 * Two extractors exist because the two shapes are genuinely different types:
	 * {@link Refinement.In} resolves to `never` for a plain predicate, since there
	 * is no `is` clause for its pattern to match. This one is distributive, so a
	 * union of predicates yields the union of their inputs.
	 *
	 * **Example** (Reading a predicate's domain back out)
	 *
	 * ```ts doctest
	 * import { type Predicate } from "@resq-systems/types/predicate";
	 *
	 * type A = Predicate.In<Predicate<string>>;
	 *
	 * const witness: A = "value";
	 * ```
	 *
	 * @typeParam P - The predicate to inspect.
	 *
	 * @see {@link Refinement.In}
	 * @category utility types
	 * @since 0.2.0
	 */
	export type In<P extends Any> = P extends Predicate<infer A> ? A : never;
}

/**
 * A predicate that also narrows: it proves the value is a `B`, not merely that
 * some test passed.
 *
 * **When to use**
 *
 * Use it as the type of anything whose `true` answer should survive into the
 * branch that follows — every leaf guard in `@resq-systems/types/guards` and every
 * narrowing combinator here is one.
 *
 * **Details**
 *
 * The `B extends A` constraint is what makes {@link and}, {@link or}, and
 * {@link compose} sound — without it, intersecting two "proofs" could produce a
 * type no value can inhabit. Every combinator here and every leaf guard is
 * structurally a `Refinement`, so nothing has to import this interface to
 * interoperate with it.
 *
 * `out B` is what makes `Refinement<A, "cat">` usable where a
 * `Refinement<A, "cat" | "dog">` is wanted: proving the narrower claim implies the
 * broader one.
 *
 * `in A` and `out B` carry the same two justifications spelled out on
 * {@link Predicate} — a checked assertion against a silent variance flip, and a
 * measurement the checker gets to skip. The `interface` form is house style for
 * the namespace pairing below, not a compiler requirement; see {@link Predicate}.
 *
 * **Example** (Two guards over different domains)
 *
 * ```ts doctest
 * import { type Refinement } from "@resq-systems/types/predicate";
 *
 * const isNonEmpty: Refinement<string, string> = (value): value is string =>
 *   value.length > 0;
 *
 * type Animal = "cat" | "dog";
 * const isCat: Refinement<Animal, "cat"> = (value): value is "cat" => value === "cat";
 *
 * isNonEmpty(""); // => false
 * isCat("cat"); // => true
 * ```
 *
 * @typeParam A - The input type the guard accepts.
 * @typeParam B - The narrower type it proves, constrained to a subtype of `A`.
 *
 * @see {@link Predicate}
 * @see {@link TypeGuard}
 * @category models
 * @since 0.2.0
 */
export type Refinement<in A, out B extends A> = (value: A) => value is B;

/**
 * Type-level helpers about {@link Refinement}, merged onto the interface. These
 * are the extractors the rest of the module is built out of: {@link structOf},
 * {@link tupleOf}, {@link allOf}, {@link anyOf}, and {@link noneOf} all compute
 * their result type by mapping one of them over their inputs.
 *
 * The declaration is `declare` so it emits no JavaScript and can hold nothing but
 * types.
 *
 * @since 0.2.0
 */
export declare namespace Refinement {
	/**
	 * The constraint slot for "some guard, types unimportant".
	 *
	 * **When to use**
	 *
	 * Use it as the bound on {@link Refinement.OutUnion} and
	 * {@link Refinement.OutIntersection}, and on any tuple of guards whose domains
	 * are heterogeneous.
	 *
	 * **Details**
	 *
	 * Same contravariance argument as {@link Predicate.Any}: `Refinement<any, any>`
	 * accepts every guard, including branded and generic ones, and the `any` never
	 * reaches a result type because {@link Refinement.Out} re-extracts the real
	 * proof.
	 *
	 * **Gotchas**
	 *
	 * Deliberately **not** the bound on the shape constructors. {@link structOf}
	 * and {@link tupleOf} invoke their guards with values read out of an `unknown`,
	 * so a bound that admits a `Refinement<string, …>` lets a call promise an input
	 * the guard never agreed to take, and the "validator" throws on exactly the
	 * malformed payload it exists to reject. Those take {@link TypeGuard}.
	 *
	 * **Example** (Holding guards over unrelated domains)
	 *
	 * ```ts doctest
	 * import { type Refinement } from "@resq-systems/types/predicate";
	 * import { isNumber, isString } from "@resq-systems/types/guards";
	 *
	 * const witness: readonly Refinement.Any[] = [isString, isNumber];
	 * ```
	 *
	 * @see {@link Predicate.Any}
	 * @category utility types
	 * @since 0.2.0
	 */
	// biome-ignore lint/suspicious/noExplicitAny: a constraint admitting every refinement cannot be written with `unknown` — contravariance rejects narrower inputs
	export type Any = Refinement<any, any>;

	/**
	 * Extract what a guard *accepts* — the dual of {@link Refinement.Out}.
	 *
	 * **When to use**
	 *
	 * Use it to build guard-keyed registries and to assert at compile time that a
	 * guard is applicable to a given domain before wiring it into a dispatch table.
	 *
	 * **Details**
	 *
	 * Deliberately **distributive** — the conditional tests a bare `G`, not `[G]`.
	 * See {@link Refinement.Out} for why suppressing distribution here would be a
	 * silent bug.
	 *
	 * **Example** (Reading a guard's domain back out)
	 *
	 * ```ts doctest
	 * import { type Refinement } from "@resq-systems/types/predicate";
	 * import { isString } from "@resq-systems/types/guards";
	 *
	 * type Animal = "cat" | "dog";
	 * const isCat: Refinement<Animal, "cat"> = (value): value is "cat" => value === "cat";
	 *
	 * type A = Refinement.In<typeof isCat>;
	 * type U = Refinement.In<typeof isString>;
	 *
	 * const domain: A = "dog";
	 * const anything: U = 1;
	 * ```
	 *
	 * @typeParam G - The guard to inspect.
	 *
	 * @see {@link Refinement.Out}
	 * @see {@link Predicate.In}
	 * @category utility types
	 * @since 0.2.0
	 */
	// biome-ignore lint/suspicious/noExplicitAny: the proof position is irrelevant here and must match guards of every output type
	export type In<G extends Any> = G extends (value: infer A) => value is any ? A : never;

	/**
	 * Extract what a guard *proves* — `Refinement.Out<typeof isString>` is
	 * `string`.
	 *
	 * **When to use**
	 *
	 * Use it whenever a result type has to be computed from a guard rather than
	 * restated by hand. It is the extractor that makes the shape constructors
	 * possible.
	 *
	 * **Details**
	 *
	 * Deliberately **distributive**: the conditional tests a bare `G`, not `[G]`.
	 * Effect tuple-wraps its equivalent helper to suppress distribution over
	 * unions, and copying that here would be a silent bug —
	 * {@link Refinement.OutUnion} and {@link Refinement.OutIntersection} are
	 * defined as `Out<Gs[number]>`, so they *depend* on distributing over the union
	 * of element types. Wrapping `G` in a tuple would quietly collapse the inferred
	 * output of {@link allOf}, {@link anyOf}, and {@link noneOf} with nothing at the
	 * declaration site noticing.
	 *
	 * **Example** (Computing a result type from a guard)
	 *
	 * ```ts doctest
	 * import { type Refinement } from "@resq-systems/types/predicate";
	 * import { isString } from "@resq-systems/types/guards";
	 *
	 * type S = Refinement.Out<typeof isString>;
	 * type U = Refinement.Out<Refinement<unknown, 1 | 2>>;
	 *
	 * const proven: S = "value";
	 * const narrowed: U = 2;
	 * ```
	 *
	 * @typeParam G - The guard to inspect.
	 *
	 * @see {@link Refinement.In}
	 * @see {@link Refinement.OutUnion}
	 * @see {@link Refinement.OutIntersection}
	 * @category utility types
	 * @since 0.2.0
	 */
	// biome-ignore lint/suspicious/noExplicitAny: the input position must match guards of every domain, and it is discarded by the `infer`
	export type Out<G extends Any> = G extends (value: any) => value is infer B ? B : never;

	/**
	 * The union of everything a tuple of guards can prove — the output type
	 * {@link anyOf} and {@link noneOf} are built on.
	 *
	 * **When to use**
	 *
	 * Use it when a combinator accepts *any* of several guards and the caller
	 * should get the exact union back rather than a widened supertype.
	 *
	 * **Details**
	 *
	 * `Gs[number]` is the union of the tuple's element types, and
	 * {@link Refinement.Out} distributes over it. The empty tuple is safe:
	 * `Gs[number]` is `never`, and a distributive conditional over `never` is
	 * `never`.
	 *
	 * **Example** (The union two guards prove)
	 *
	 * ```ts doctest
	 * import { type Refinement } from "@resq-systems/types/predicate";
	 * import { isNumber, isString } from "@resq-systems/types/guards";
	 *
	 * type T = Refinement.OutUnion<[typeof isString, typeof isNumber]>;
	 *
	 * const witness: T = "value";
	 * const alsoWitness: T = 1;
	 * ```
	 *
	 * @typeParam Gs - A tuple of guards.
	 *
	 * @see {@link Refinement.Out}
	 * @see {@link Refinement.OutIntersection}
	 * @category utility types
	 * @since 0.2.0
	 */
	export type OutUnion<Gs extends readonly Any[]> = Out<Gs[number]>;

	/**
	 * The intersection of everything a tuple of guards proves — the output type
	 * {@link allOf} is built on.
	 *
	 * **When to use**
	 *
	 * Use it when a combinator requires *every* guard to pass and the caller should
	 * get all of the proofs at once.
	 *
	 * **Details**
	 *
	 * The empty-tuple case is safe rather than catastrophic: `Out<never>` is
	 * `never`, and `UnionToIntersection<never>` resolves to `unknown` (an `infer`
	 * with no candidates), so intersecting it is a no-op instead of collapsing the
	 * whole thing to `never`.
	 *
	 * **Example** (The intersection two guards prove)
	 *
	 * ```ts doctest
	 * import { type Refinement, type TypeGuard } from "@resq-systems/types/predicate";
	 *
	 * type T = Refinement.OutIntersection<
	 *   [TypeGuard<{ id: string }>, TypeGuard<{ n: number }>]
	 * >;
	 *
	 * const witness: T = { id: "a", n: 1 };
	 * ```
	 *
	 * @typeParam Gs - A tuple of guards.
	 *
	 * @see {@link Refinement.Out}
	 * @see {@link Refinement.OutUnion}
	 * @category utility types
	 * @since 0.2.0
	 */
	export type OutIntersection<Gs extends readonly Any[]> = UnionToIntersection<Out<Gs[number]>>;
}

/**
 * A guard that starts at `unknown` — the shape roughly every real guard has,
 * because real guards run at the boundary where the data came from `JSON.parse`, a
 * `catch` binding, `process.env`, or a message from another process.
 *
 * **When to use**
 *
 * Use it as the declared type of any guard that validates untrusted input, and as
 * the bound on anything that will *call* a guard with a value read out of an
 * `unknown`. Every factory in this module returns one.
 *
 * **Details**
 *
 * Kept as a flat `type` alias rather than an interface: it hosts no namespace, so
 * the merging constraint that forces {@link Predicate} and {@link Refinement} to
 * be interfaces does not apply here.
 *
 * **Example** (A hand-written boundary guard)
 *
 * ```ts doctest
 * import { type TypeGuard } from "@resq-systems/types/predicate";
 *
 * const isPort: TypeGuard<number> = (value): value is number =>
 *   typeof value === "number" && value > 0 && value < 65_536;
 *
 * isPort(8080); // => true
 * isPort("8080"); // => false
 * ```
 *
 * @typeParam B - The type the guard proves.
 *
 * @see {@link Refinement}
 * @category models
 * @since 0.2.0
 */
export type TypeGuard<B> = Refinement<unknown, B>;

//#endregion

//#region Internal

/**
 * The structural supertype of every {@link Predicate} and {@link Refinement}:
 * parameter contravariance means a function taking `never` accepts all of them,
 * and every type-predicate return is assignable to `boolean`.
 *
 * @internal
 */
type ErasedGuard = (value: never) => boolean;

/**
 * Invoke a guard whose input type has been erased. The cast lives here so that no
 * combinator body needs one.
 *
 * @internal
 */
function runGuard(guard: ErasedGuard, value: unknown): boolean {
	return (guard as (value: unknown) => boolean)(value);
}

/**
 * Stamp a boolean-valued function as a guard of whatever type the call site
 * expects. Every combinator funnels through here, which makes exactly one
 * unchecked step per combinator — each justified by the boolean expression
 * sitting immediately next to it.
 *
 * @internal
 */
function asGuard<G>(test: (value: unknown) => boolean): G {
	return test as unknown as G;
}

/**
 * Give a strictly-binary combinator a data-last form: called with one argument it
 * returns `(self) => body(self, that)`; called with two or more it runs
 * `body(a, b)` directly.
 *
 * Deliberately arity-2-only. There is no `arity` parameter, no `switch`, no
 * "is this call data-first?" predicate hook, and no `RangeError` branch, because
 * the eligibility rule in this module's overview admits nothing that would need
 * one. Keeping the helper incapable of expressing the unsafe cases is the point:
 * it cannot be reached for by mistake, and it never wraps a method, so the
 * `this`-dropping that a general dispatcher has to worry about cannot arise.
 *
 * The returned wrapper's *type* is an assertion: `Dual` has no inference site in
 * the parameter list, so it resolves to whatever the exported const is annotated
 * with, and nothing checks that the curried signatures are the correct flip of the
 * uncurried ones. That is deliberately not the only line of defence. Each caller
 * keeps its data-first behavior in a separate module-private `function` whose
 * implementation signature the compiler *does* check against its overloads, and
 * the flip itself is pinned by a type-level dual-law assertion and a runtime one.
 *
 * @typeParam Dual - The full set of call signatures, supplied by the caller's annotation.
 * @param name - The combinator's exported name, used in the zero-argument error.
 * @param body - The data-first implementation.
 * @returns A function accepting either call shape.
 * @throws {TypeError} If called with no arguments at all.
 *
 * @internal
 */
function dualBinary<Dual>(name: string, body: (self: never, that: never) => unknown): Dual {
	const call = body as unknown as (self: unknown, that: unknown) => unknown;
	const dispatch = (...args: readonly unknown[]): unknown => {
		if (args.length === 0) {
			throw new TypeError(`${name}: expected 1 argument (data-last) or 2 (data-first), got 0`);
		}
		if (args.length === 1) {
			const that = args[0];
			return (self: unknown): unknown => call(self, that);
		}
		return call(args[0], args[1]);
	};
	return dispatch as unknown as Dual;
}

//#endregion

//#region Boolean combinators

/**
 * Data-first {@link and}. Overloaded so the refinement case intersects the two
 * proofs and the predicate case degrades gracefully; the implementation signature
 * is checked against both.
 *
 * @internal
 */
function andImpl<A, B extends A, C extends A>(
	self: Refinement<A, B>,
	that: Refinement<A, C>,
): Refinement<A, B & C>;
function andImpl<A, B extends A>(self: Refinement<A, B>, that: Predicate<B>): Refinement<A, B>;
function andImpl<A>(self: Predicate<A>, that: Predicate<A>): Predicate<A>;
function andImpl<A>(self: Predicate<A>, that: Predicate<A>): Predicate<A> {
	return (value: A): boolean => self(value) && that(value);
}

/**
 * Conjunction: passes only when both guards pass, and the proofs intersect.
 *
 * **When to use**
 *
 * Use it to require two conditions of the *same* input while keeping both proofs.
 * When the second guard only accepts what the first one proves, reach for
 * {@link compose} instead.
 *
 * **Details**
 *
 * Evaluation short-circuits: `that` never runs when `self` returned `false`.
 * Composing two guards intersects what they prove; composing two plain predicates
 * degrades to a plain predicate rather than failing to compile.
 *
 * The domain comes from `self`. `that` may be a guard over a *wider* domain —
 * every guard in `./guards` is written over `unknown` — and its proof is still
 * intersected in rather than dropped, so `and(isCat, isString)` proves `"cat"`
 * rather than collapsing to a bare `Predicate`.
 *
 * `that` may also be a *plain rule* over exactly what `self` proved — an inline
 * `(text) => text.length > 0`, or an ordering predicate such as
 * `isLessThan(orderNumber)(10)`. Such a rule proves nothing new, so the result
 * proves `B` unchanged; what matters is that `B` survives at all. Adding a length
 * check to `isString` still yields a `Refinement<unknown, string>` that narrows an
 * `unknown` in an `if` and drops into `Array.prototype.filter`, rather than a
 * `Predicate<string>` that has forgotten the proof *and* stopped accepting the
 * input the guard was written for.
 *
 * Available data-last (`and(that)`) as well as data-first (`and(self, that)`), so
 * it can be dropped into a `pipe`. Both call forms produce the *same* type,
 * including when the two operands' domains differ — that equivalence is pinned in
 * `predicate.test-d.ts` and is the whole contract of the data-last overloads.
 *
 * **Gotchas**
 *
 * The two call shapes are told apart by argument *count*, not by type: one
 * argument is data-last, two or more is data-first. Arguments past the second are
 * ignored — which is exactly what keeps `predicates.reduce(and)` working, since
 * `Array.prototype.reduce` hands its reducer four arguments. Calling with zero
 * arguments throws a `TypeError` rather than returning an unusable curried
 * function.
 *
 * An inline arrow passed as `that` needs its parameter annotated —
 * `and(isString, (text: string) => text.length > 0)`, not `(text) => …`. The
 * overloads that accept a *guard* as `that` are tried first, and they contextually
 * type an unannotated parameter as `unknown`; the call still resolves to the right
 * overload and the right type, but the abandoned attempt leaks a `'text' is of
 * type 'unknown'` diagnostic from inside the arrow body. Annotating the parameter,
 * or hoisting the rule to a `Predicate<B>` binding, removes it.
 *
 * **Example** (Requiring two conditions of one value)
 *
 * ```ts doctest
 * import { and } from "@resq-systems/types/predicate";
 * import { isNumber } from "@resq-systems/types/guards";
 *
 * const isPositive = (value: unknown): value is number =>
 *   typeof value === "number" && value > 0;
 *
 * const isPositiveNumber = and(isNumber, isPositive);
 *
 * isPositiveNumber(1); // => true
 * isPositiveNumber(-1); // => false
 * isPositiveNumber("1"); // => false
 * ```
 *
 * **Example** (The data-last form)
 *
 * ```ts doctest
 * import { and } from "@resq-systems/types/predicate";
 * import { isNumber } from "@resq-systems/types/guards";
 *
 * const isPositive = (value: unknown): value is number =>
 *   typeof value === "number" && value > 0;
 *
 * const requirePositive = and(isPositive);
 * const isPositiveNumber = requirePositive(isNumber);
 *
 * isPositiveNumber(2); // => true
 * ```
 *
 * **Example** (Adding a plain rule without losing the proof)
 *
 * ```ts doctest
 * import { and } from "@resq-systems/types/predicate";
 * import { isString } from "@resq-systems/types/guards";
 *
 * const isNonEmptyString = and(isString, (text: string) => text.length > 0);
 *
 * isNonEmptyString("ada"); // => true
 * isNonEmptyString(""); // => false
 * isNonEmptyString(42); // => false
 *
 * // The `string` proof survived the plain rule, so `filter` still narrows.
 * const mixed: readonly unknown[] = ["ada", "", 42];
 * mixed.filter(isNonEmptyString); // => ["ada"]
 * ```
 *
 * @typeParam A - The shared input type.
 * @typeParam B - What `self` proves.
 * @typeParam C - What `that` proves, when `that` is itself a guard.
 * @typeParam P - The domain of `that` in the data-last form, when `that` is a plain rule.
 * @param self - The guard evaluated first.
 * @param that - The guard, or plain rule over `B`, evaluated only when `self` passed.
 * @returns A guard proving `B & C`; a guard still proving `B` when `that` is a plain rule over
 *   `B`; or a plain predicate for the non-narrowing overloads.
 *
 * @see {@link or}
 * @see {@link nand}
 * @see {@link allOf}
 * @see {@link compose}
 * @category combinators
 * @since 0.2.0
 */
export const and: {
	<A, C extends A>(
		that: Refinement<A, C>,
	): {
		<S extends A, B extends S>(self: Refinement<S, B>): Refinement<S, B & C>;
		<S extends A>(self: Predicate<S>): Predicate<S>;
	};
	<A, B extends A, C extends A>(
		self: Refinement<A, B>,
		that: Refinement<A, C>,
	): Refinement<A, B & C>;
	// `that` is a guard over `unknown` — every guard in `./guards` is — so it
	// accepts any `A` and its proof is still recoverable. Without this, the pair
	// falls through to the predicate overload and the proof is silently dropped.
	<A, B extends A, C>(self: Refinement<A, B>, that: Refinement<unknown, C>): Refinement<A, B & C>;
	// `that` is a plain rule over exactly what `self` just proved — an inline
	// `(text) => text.length > 0`, or an ordering predicate such as
	// `isLessThan(orderNumber)(10)`. It proves nothing new, so the result proves
	// `B` unchanged; the point is that the proof survives at all. Without this pair
	// the call falls through to the `Predicate` overloads below, `B` is silently
	// dropped, and the result stops accepting the original `A` input.
	<A, B extends A>(self: Refinement<A, B>, that: Predicate<B>): Refinement<A, B>;
	<P>(
		that: Predicate<P>,
	): {
		<S, B extends S & P>(self: Refinement<S, B>): Refinement<S, B>;
		<S extends P>(self: Predicate<S>): Predicate<S>;
	};
	<A>(that: Predicate<A>): <S extends A>(self: Predicate<S>) => Predicate<S>;
	<A>(self: Predicate<A>, that: Predicate<A>): Predicate<A>;
} = dualBinary("and", andImpl);

/**
 * Data-first {@link or}. Overloaded so the refinement case unions the two proofs;
 * the implementation signature is checked against both.
 *
 * @internal
 */
function orImpl<A, B extends A, C extends A>(
	self: Refinement<A, B>,
	that: Refinement<A, C>,
): Refinement<A, B | C>;
function orImpl<A>(self: Predicate<A>, that: Predicate<A>): Predicate<A>;
function orImpl<A>(self: Predicate<A>, that: Predicate<A>): Predicate<A> {
	return (value: A): boolean => self(value) || that(value);
}

/**
 * Disjunction: passes when either guard passes, and the proofs union.
 *
 * **When to use**
 *
 * Use it whenever "one of these shapes" needs to be a *value* rather than an
 * expression. An inline `isString(v) || isNumber(v)` narrows only at that
 * expression; `or(isString, isNumber)` is something you can name, store, pass to
 * {@link arrayOf}, and reuse — and it still narrows to `string | number` at every
 * call site.
 *
 * **Details**
 *
 * Evaluation short-circuits: `that` never runs when `self` returned `true`. The
 * narrowing overload is the entire point; two plain predicates degrade to a plain
 * predicate.
 *
 * Available data-last (`or(that)`) as well as data-first (`or(self, that)`).
 *
 * **Gotchas**
 *
 * The two call shapes are told apart by argument *count*, not by type: one
 * argument is data-last, two or more is data-first, and arguments past the second
 * are ignored (so `predicates.reduce(or)` keeps working). Calling with zero
 * arguments throws a `TypeError`.
 *
 * **Example** (Naming a union guard)
 *
 * ```ts doctest
 * import { or } from "@resq-systems/types/predicate";
 * import { isNumber, isString } from "@resq-systems/types/guards";
 *
 * const isScalar = or(isString, isNumber);
 *
 * isScalar("a"); // => true
 * isScalar(1); // => true
 * isScalar(true); // => false
 * ```
 *
 * @typeParam A - The shared input type.
 * @typeParam B - What `self` proves.
 * @typeParam C - What `that` proves.
 * @param self - The guard evaluated first.
 * @param that - The guard evaluated only when `self` failed.
 * @returns A guard proving `B | C`, or a plain predicate for the non-narrowing overloads.
 *
 * @see {@link and}
 * @see {@link anyOf}
 * @see {@link noneOf}
 * @category combinators
 * @since 0.2.0
 */
export const or: {
	<A, C extends A>(
		that: Refinement<A, C>,
	): {
		<S extends A, B extends S>(self: Refinement<S, B>): Refinement<S, B | (C & S)>;
		<S extends A>(self: Predicate<S>): Predicate<S>;
	};
	<A, B extends A, C extends A>(
		self: Refinement<A, B>,
		that: Refinement<A, C>,
	): Refinement<A, B | C>;
	// See the matching note on `and`: a guard over `unknown` accepts any `A`, so
	// the disjunction still proves something rather than degrading to a predicate.
	<A, B extends A, C>(
		self: Refinement<A, B>,
		that: Refinement<unknown, C>,
	): Refinement<A, B | (C & A)>;
	<A>(that: Predicate<A>): <S extends A>(self: Predicate<S>) => Predicate<S>;
	<A>(self: Predicate<A>, that: Predicate<A>): Predicate<A>;
} = dualBinary("or", orImpl);

/**
 * Negation.
 *
 * **When to use**
 *
 * Use it to express "anything but this" as a reusable value, and to subtract a
 * member from a union domain.
 *
 * **Details**
 *
 * At runtime this is exact. At the type level it is **partial by nature, and this
 * doc block is the contract**: TypeScript has no negated types, so the result is
 * `Exclude<A, B>`, which actually subtracts only when `A` is a union. Negating a
 * guard over `unknown` or over `string` gives back the input type unchanged. That
 * is the honest outcome rather than a lie — the runtime behavior is exact and no
 * type information you had is lost.
 *
 * Arity 1, so it is already pipe-able as `pipe(isString, not)` and is deliberately
 * **not** dualized.
 *
 * **Example** (Subtracting from a union domain)
 *
 * ```ts doctest
 * import { not, type Refinement } from "@resq-systems/types/predicate";
 * import { isString } from "@resq-systems/types/guards";
 *
 * type Animal = "cat" | "dog" | "fish";
 * const isCat: Refinement<Animal, "cat"> = (value): value is "cat" => value === "cat";
 *
 * const notCat = not(isCat);
 * const notString = not(isString);
 *
 * notCat("dog"); // => true
 * notString(1); // => true
 * ```
 *
 * @typeParam A - The input type.
 * @typeParam B - What the guard proves, and therefore what gets excluded.
 * @param guard - The guard to invert, in the narrowing overload.
 * @param predicate - The predicate to invert, in the non-narrowing overload.
 * @returns A guard proving `Exclude<A, B>`, or a plain predicate for the second overload.
 *
 * @see {@link noneOf}
 * @see {@link nand}
 * @category combinators
 * @since 0.2.0
 */
export function not<A, B extends A>(guard: Refinement<A, B>): Refinement<A, Exclude<A, B>>;
export function not<A>(predicate: Predicate<A>): Predicate<A>;
export function not<A>(predicate: Predicate<A>): Predicate<A> {
	return (value: A): boolean => !predicate(value);
}

/**
 * Data-first {@link nand}.
 *
 * @internal
 */
function nandImpl<A>(self: Predicate<A>, that: Predicate<A>): Predicate<A> {
	return (value: A): boolean => !(self(value) && that(value));
}

/**
 * Negated conjunction: passes unless **both** predicates pass.
 *
 * **When to use**
 *
 * Use it for mutual-exclusion rules — "these two options may not be set together"
 * — where the interesting case is the forbidden overlap rather than either
 * condition on its own.
 *
 * **Details**
 *
 * Equivalent to `not(and(self, that))`, and short-circuits the same way: `that`
 * never runs when `self` returned `false`. Cannot narrow, and returns a
 * {@link Predicate} for that reason — "not both" says nothing about what the value
 * *is*.
 *
 * Available data-last (`nand(that)`) as well as data-first.
 *
 * **Gotchas**
 *
 * The two call shapes are told apart by argument *count*, not by type: one
 * argument is data-last, two or more is data-first, and arguments past the second
 * are ignored (so `predicates.reduce(nand)` keeps working). Calling with zero
 * arguments throws a `TypeError`.
 *
 * **Example** (Two mutually exclusive options)
 *
 * ```ts doctest
 * import { nand, type Predicate } from "@resq-systems/types/predicate";
 *
 * type Creds = { readonly token?: string; readonly keyFile?: string };
 *
 * const hasToken: Predicate<Creds> = (c) => c.token !== undefined;
 * const hasKeyFile: Predicate<Creds> = (c) => c.keyFile !== undefined;
 *
 * const notBoth = nand(hasToken, hasKeyFile);
 *
 * notBoth({ token: "t" }); // => true
 * notBoth({ token: "t", keyFile: "k" }); // => false
 * ```
 *
 * @typeParam A - The shared input type.
 * @param self - The predicate evaluated first.
 * @param that - The predicate evaluated only when `self` passed.
 * @returns A predicate that fails only when both pass.
 *
 * @see {@link and}
 * @see {@link not}
 * @see {@link noneOf}
 * @category combinators
 * @since 0.2.0
 */
export const nand: {
	<A>(that: Predicate<A>): <S extends A>(self: Predicate<S>) => Predicate<S>;
	<A>(self: Predicate<A>, that: Predicate<A>): Predicate<A>;
} = dualBinary("nand", nandImpl);

/**
 * Data-first {@link eqv}.
 *
 * @internal
 */
function eqvImpl<A>(self: Predicate<A>, that: Predicate<A>): Predicate<A> {
	return (value: A): boolean => self(value) === that(value);
}

/**
 * Logical equivalence: passes when both predicates agree, whether both pass or
 * both fail.
 *
 * **When to use**
 *
 * Use it for "these must move together" invariants — a start date is present if
 * and only if an end date is, a feature flag is on if and only if its config block
 * exists.
 *
 * **Details**
 *
 * The complement of an exclusive-or over two predicates: `eqv(p, q)` is
 * `not(exactlyOne(p, q))` at arity two. Does **not** short-circuit — both
 * predicates always run, because agreement cannot be decided from one answer.
 * Cannot narrow, so it returns a {@link Predicate}.
 *
 * Available data-last (`eqv(that)`) as well as data-first.
 *
 * **Gotchas**
 *
 * The two call shapes are told apart by argument *count*, not by type: one
 * argument is data-last, two or more is data-first, and arguments past the second
 * are ignored (so `predicates.reduce(eqv)` keeps working). Calling with zero
 * arguments throws a `TypeError`.
 *
 * **Example** (Two fields that must be set together)
 *
 * ```ts doctest
 * import { eqv, type Predicate } from "@resq-systems/types/predicate";
 *
 * type Window = { readonly start?: string; readonly end?: string };
 *
 * const hasStart: Predicate<Window> = (w) => w.start !== undefined;
 * const hasEnd: Predicate<Window> = (w) => w.end !== undefined;
 *
 * const bothOrNeither = eqv(hasStart, hasEnd);
 *
 * bothOrNeither({}); // => true
 * bothOrNeither({ start: "a", end: "b" }); // => true
 * bothOrNeither({ start: "a" }); // => false
 * ```
 *
 * @typeParam A - The shared input type.
 * @param self - The first predicate.
 * @param that - The second predicate.
 * @returns A predicate that passes when the two answers are identical.
 *
 * @see {@link exactlyOne}
 * @see {@link implies}
 * @category combinators
 * @since 0.2.0
 */
export const eqv: {
	<A>(that: Predicate<A>): <S extends A>(self: Predicate<S>) => Predicate<S>;
	<A>(self: Predicate<A>, that: Predicate<A>): Predicate<A>;
} = dualBinary("eqv", eqvImpl);

/**
 * Data-first {@link implies}.
 *
 * @internal
 */
function impliesImpl<A>(antecedent: Predicate<A>, consequent: Predicate<A>): Predicate<A> {
	return (value: A): boolean => !antecedent(value) || consequent(value);
}

/**
 * Material implication: passes unless the antecedent holds and the consequent does
 * not.
 *
 * **When to use**
 *
 * Use it to encode conditional configuration rules — "if `kind` is `tcp` then
 * `port` is required" — as a first-class value that can be named, stored, and
 * folded into {@link allOf}, instead of a nested `if` buried inside a validate
 * function.
 *
 * **Details**
 *
 * Lazy in the consequent: it only runs when the antecedent passed. Cannot narrow —
 * a rule that is vacuously true proves nothing about the value — so the result is
 * a {@link Predicate}.
 *
 * Available data-last (`implies(consequent)`) as well as data-first
 * (`implies(antecedent, consequent)`). Note the argument order of the curried
 * form: the *consequent* is supplied first, because the data-last shape always
 * closes over the second parameter.
 *
 * **Gotchas**
 *
 * The two call shapes are told apart by argument *count*, not by type: one
 * argument is data-last, two or more is data-first, and arguments past the second
 * are ignored. Calling with zero arguments throws a `TypeError`.
 *
 * **Example** (A conditional configuration rule)
 *
 * ```ts doctest
 * import { implies, type Predicate } from "@resq-systems/types/predicate";
 *
 * type Conn = { readonly kind: string; readonly port?: number };
 *
 * const isTcp: Predicate<Conn> = (c) => c.kind === "tcp";
 * const hasPort: Predicate<Conn> = (c) => c.port !== undefined;
 *
 * const portRequiredForTcp = implies(isTcp, hasPort);
 *
 * portRequiredForTcp({ kind: "tcp", port: 1 }); // => true
 * portRequiredForTcp({ kind: "tcp" }); // => false
 * portRequiredForTcp({ kind: "unix" }); // => true
 * ```
 *
 * @typeParam A - The input type.
 * @param antecedent - The condition that triggers the requirement.
 * @param consequent - The requirement that must then hold.
 * @returns A predicate that fails only on `antecedent && !consequent`.
 *
 * @see {@link eqv}
 * @see {@link allOf}
 * @category combinators
 * @since 0.2.0
 */
export const implies: {
	<A>(consequent: Predicate<A>): <S extends A>(antecedent: Predicate<S>) => Predicate<S>;
	<A>(antecedent: Predicate<A>, consequent: Predicate<A>): Predicate<A>;
} = dualBinary("implies", impliesImpl);

/**
 * Variadic {@link and} — passes only when every guard passes, intersecting all of
 * their proofs.
 *
 * **When to use**
 *
 * Use it when three or more conditions apply to the same value and every proof
 * matters. For exactly two, {@link and} reads better and composes in a `pipe`.
 *
 * **Details**
 *
 * The first guard is a separate parameter on purpose. A pure `(...guards: Gs)`
 * signature has no inference site for `A` — it appears only inside the *constraint*
 * of `Gs` — so `A` silently resolves to `unknown` and the combinator rejects every
 * guard over a narrower domain. Splitting `first` out gives `A` a real inference
 * site, and requiring at least one guard kills the degenerate "intersection of
 * nothing" case for free.
 *
 * Variadic, so it is structurally ineligible for a data-last form: with no fixed
 * arity there is nothing to dispatch on, and `allOf(p, q, r)` would silently drop
 * `r`.
 *
 * **Example** (Requiring two shapes at once)
 *
 * ```ts doctest
 * import { allOf, structOf } from "@resq-systems/types/predicate";
 * import { isNumber, isString } from "@resq-systems/types/guards";
 *
 * const isConfig = allOf(structOf({ host: isString }), structOf({ port: isNumber }));
 *
 * isConfig({ host: "localhost", port: 80 }); // => true
 * isConfig({ host: "localhost" }); // => false
 * ```
 *
 * @typeParam A - The shared input type, inferred from `first`.
 * @typeParam B - What `first` proves.
 * @typeParam Rest - The tuple of remaining guards.
 * @param first - The first guard; fixes the input domain.
 * @param rest - Any number of further guards over that same domain.
 * @returns A guard proving everything all of them prove.
 *
 * @see {@link and}
 * @see {@link everyOf}
 * @see {@link anyOf}
 * @category combining
 * @since 0.2.0
 */
export const allOf: <A, B extends A, const Rest extends readonly Refinement<A, A>[]>(
	first: Refinement<A, B>,
	...rest: Rest
) => Refinement<A, A & B & Refinement.OutIntersection<Rest>> = (first, ...rest) =>
	asGuard((value) => runGuard(first, value) && rest.every((guard) => runGuard(guard, value)));

/**
 * Variadic {@link or} — passes when at least one guard passes, unioning their
 * proofs.
 *
 * **When to use**
 *
 * Use it for "one of these shapes" across three or more alternatives — JSON
 * scalars, a set of message variants, a list of accepted encodings.
 *
 * **Details**
 *
 * Same first-parameter reshape, and the same reason, as {@link allOf}. The result
 * is the exact union and not a widening: `anyOf(isString, isNumber, isBoolean)`
 * narrows `unknown` to `string | number | boolean` and nothing coarser.
 *
 * Variadic, so it is structurally ineligible for a data-last form.
 *
 * **Example** (A JSON scalar guard)
 *
 * ```ts doctest
 * import { anyOf } from "@resq-systems/types/predicate";
 * import { isBoolean, isNull, isNumber, isString } from "@resq-systems/types/guards";
 *
 * const isJsonScalar = anyOf(isString, isNumber, isBoolean, isNull);
 *
 * isJsonScalar("a"); // => true
 * isJsonScalar(null); // => true
 * isJsonScalar({}); // => false
 * ```
 *
 * @typeParam A - The shared input type, inferred from `first`.
 * @typeParam B - What `first` proves.
 * @typeParam Rest - The tuple of remaining guards.
 * @param first - The first guard; fixes the input domain.
 * @param rest - Any number of further guards over that same domain.
 * @returns A guard proving the union of what any of them prove.
 *
 * @see {@link or}
 * @see {@link someOf}
 * @see {@link allOf}
 * @category combining
 * @since 0.2.0
 */
export const anyOf: <A, B extends A, const Rest extends readonly Refinement<A, A>[]>(
	first: Refinement<A, B>,
	...rest: Rest
) => Refinement<A, A & (B | Refinement.OutUnion<Rest>)> = (first, ...rest) =>
	asGuard((value) => runGuard(first, value) || rest.some((guard) => runGuard(guard, value)));

/**
 * Variadic {@link not} — passes only when *no* guard passes.
 *
 * **When to use**
 *
 * Use it for the reject-a-set-of-shapes case, which otherwise turns into a stack
 * of `!isX(v) && !isY(v)` that narrows nothing.
 *
 * **Details**
 *
 * Carries the same union-only caveat as {@link not}: the subtraction is visible in
 * the type only when the input is a union. Variadic, so it is structurally
 * ineligible for a data-last form.
 *
 * **Gotchas**
 *
 * `noneOf` **is** the n-ary generalization of NOR, which is why no separate `nor`
 * export exists: `noneOf(p, q)` is exactly `not(or(p, q))`. Unlike
 * {@link exactlyOne} versus parity-XOR, the generalization is the obvious one and
 * holds at every arity, so a second name for the arity-2 case would have bought
 * nothing.
 *
 * **Example** (Rejecting a set of members of a union)
 *
 * ```ts doctest
 * import { noneOf, type Refinement } from "@resq-systems/types/predicate";
 *
 * type Animal = "cat" | "dog" | "fish";
 * const isCat: Refinement<Animal, "cat"> = (value): value is "cat" => value === "cat";
 * const isDog: Refinement<Animal, "dog"> = (value): value is "dog" => value === "dog";
 *
 * const isFish = noneOf(isCat, isDog);
 *
 * isFish("fish"); // => true
 * isFish("cat"); // => false
 * ```
 *
 * @typeParam A - The shared input type, inferred from `first`.
 * @typeParam B - What `first` proves.
 * @typeParam Rest - The tuple of remaining guards.
 * @param first - The first guard to reject.
 * @param rest - Any number of further guards to reject.
 * @returns A guard proving `A` minus everything they prove.
 *
 * @see {@link not}
 * @see {@link nand}
 * @see {@link anyOf}
 * @category combining
 * @since 0.2.0
 */
export const noneOf: <A, B extends A, const Rest extends readonly Refinement<A, A>[]>(
	first: Refinement<A, B>,
	...rest: Rest
) => Refinement<A, Exclude<A, B | Refinement.OutUnion<Rest>>> = (first, ...rest) =>
	asGuard((value) => !runGuard(first, value) && !rest.some((guard) => runGuard(guard, value)));

/**
 * Passes when **exactly one** of any number of predicates passes.
 *
 * **When to use**
 *
 * Use it for "exactly one of these options may be set" configuration rules, where
 * both zero and two are errors.
 *
 * **Details**
 *
 * Returns a {@link Predicate} and never a {@link Refinement}, because "exactly one
 * of n" is not expressible as a TypeScript type — pretending otherwise would be
 * exactly the kind of unchecked promise this module exists to eliminate. Named
 * `exactlyOne` rather than `oneOf` so the membership sense of "one of" stays free
 * for `isOneOf` in `@resq-systems/types/guards`. Every predicate always runs; there
 * is nothing to short-circuit when the answer is a count.
 *
 * Variadic, so it is structurally ineligible for a data-last form.
 *
 * **Gotchas**
 *
 * At arity two this is exclusive-or: `exactlyOne(p, q)` is `not(eqv(p, q))`, which
 * is why no separate `xor` export exists. **Past arity two the two diverge.**
 * Parity-XOR of three predicates is `true` when one *or all three* pass;
 * `exactlyOne` is `true` only for a count of exactly one. The counting reading is
 * the useful one for configuration rules, and it is the one implemented here. Zero
 * predicates never pass.
 *
 * **Example** (Exactly one credential source)
 *
 * ```ts doctest
 * import { exactlyOne } from "@resq-systems/types/predicate";
 *
 * type Creds = {
 *   readonly token?: string;
 *   readonly keyFile?: string;
 *   readonly env?: string;
 * };
 *
 * const hasOneCredential = exactlyOne<Creds>(
 *   (c) => c.token !== undefined,
 *   (c) => c.keyFile !== undefined,
 *   (c) => c.env !== undefined,
 * );
 *
 * hasOneCredential({ token: "t" }); // => true
 * hasOneCredential({ token: "t", env: "E" }); // => false
 * hasOneCredential({}); // => false
 * ```
 *
 * @typeParam A - The input type.
 * @param predicates - The predicates to count. Zero predicates never pass.
 * @returns A predicate that passes when the pass-count is exactly one.
 *
 * @see {@link eqv}
 * @see {@link anyOf}
 * @category combining
 * @since 0.2.0
 */
export const exactlyOne: <A>(...predicates: readonly Predicate<A>[]) => Predicate<A> =
	(...predicates) =>
	(value) =>
		predicates.reduce((count, predicate) => count + (predicate(value) ? 1 : 0), 0) === 1;

/**
 * Fold an iterable of predicates into one that passes when **every** member
 * passes.
 *
 * **When to use**
 *
 * Use it when the predicates are built at runtime — read out of a config file,
 * accumulated in a loop, produced by a `map` — so there is no statically known
 * argument list for {@link allOf} to infer from.
 *
 * **Details**
 *
 * Returns a {@link Predicate} rather than a {@link Refinement}: the member count is
 * not known to the type system, so there is nothing to intersect and no honest
 * proof to hand back. That is the whole reason this is a separate export instead of
 * an overload on {@link allOf} — folding them into one name would make the *kind*
 * of the return value depend on the runtime shape of an argument.
 *
 * The collection is materialized once, when the predicate is built, so a generator
 * or other single-pass iterable behaves the same on the second call as on the
 * first. Evaluation short-circuits on the first `false`. An empty collection
 * passes, by vacuous truth.
 *
 * Arity 1, so it is already pipe-able and is deliberately not dualized.
 *
 * **Example** (Folding a runtime-built rule set)
 *
 * ```ts doctest
 * import { everyOf, type Predicate } from "@resq-systems/types/predicate";
 *
 * const minLengths = [1, 3, 5];
 * const rules: readonly Predicate<string>[] = minLengths.map(
 *   (n) => (value: string) => value.length >= n,
 * );
 *
 * const isLongEnough = everyOf(rules);
 *
 * isLongEnough("abcdef"); // => true
 * isLongEnough("abcd"); // => false
 * ```
 *
 * @typeParam A - The input type.
 * @param predicates - The predicates to require. Materialized eagerly.
 * @returns A predicate that passes when every member passes.
 *
 * @see {@link allOf}
 * @see {@link someOf}
 * @category combining
 * @since 0.2.0
 */
export function everyOf<A>(predicates: Iterable<Predicate<A>>): Predicate<A> {
	const members = Array.from(predicates);
	return (value: A): boolean => members.every((predicate) => predicate(value));
}

/**
 * Fold an iterable of predicates into one that passes when **at least one** member
 * passes.
 *
 * **When to use**
 *
 * Use it when the alternatives are built at runtime, for the same reason
 * {@link everyOf} exists — {@link anyOf} needs a statically known argument list to
 * infer its union from.
 *
 * **Details**
 *
 * Returns a {@link Predicate} rather than a {@link Refinement}, for the same reason
 * as {@link everyOf}: with the member count unknown to the type system there is no
 * union to compute.
 *
 * The collection is materialized once, when the predicate is built. Evaluation
 * short-circuits on the first `true`. An empty collection never passes.
 *
 * Arity 1, so it is already pipe-able and is deliberately not dualized.
 *
 * **Example** (Any of a runtime-built allow list)
 *
 * ```ts doctest
 * import { someOf, type Predicate } from "@resq-systems/types/predicate";
 *
 * const allowed = ["admin", "owner"];
 * const rules: readonly Predicate<string>[] = allowed.map(
 *   (role) => (value: string) => value === role,
 * );
 *
 * const isAllowed = someOf(rules);
 *
 * isAllowed("owner"); // => true
 * isAllowed("guest"); // => false
 * ```
 *
 * @typeParam A - The input type.
 * @param predicates - The alternatives to try. Materialized eagerly.
 * @returns A predicate that passes when at least one member passes.
 *
 * @see {@link anyOf}
 * @see {@link everyOf}
 * @category combining
 * @since 0.2.0
 */
export function someOf<A>(predicates: Iterable<Predicate<A>>): Predicate<A> {
	const members = Array.from(predicates);
	return (value: A): boolean => members.some((predicate) => predicate(value));
}

//#endregion

//#region Guard plumbing

/**
 * Data-first {@link compose}. A single signature rather than an overload set, so
 * the compiler checks the body against the declared relationship between `A`, `B`,
 * and `C`.
 *
 * @internal
 */
function composeImpl<A, B extends A, C extends B>(
	ab: Refinement<A, B>,
	bc: Refinement<B, C>,
): Refinement<A, C> {
	return asGuard((value) => runGuard(ab, value) && runGuard(bc, value));
}

/**
 * Sequential narrowing: apply `ab`, then apply `bc` to what `ab` proved.
 *
 * **When to use**
 *
 * Use it whenever the second guard's domain is the first guard's *output* rather
 * than the original input — a brand refiner over `string`, a template-literal
 * check, a guard that only accepts objects. `and(isObject, hasKey)` does not
 * typecheck when `hasKey` only accepts objects; `compose(isObject, hasKey)` does.
 *
 * **Details**
 *
 * Short-circuits: `bc` never runs on a value `ab` rejected — which is the point,
 * since `bc` may not be safe to call on arbitrary input. This is also the
 * documented adapter for feeding a narrow-domain guard to the shape constructors:
 * `structOf({ id: compose(isString, UserId.is) })`.
 *
 * Available data-last (`compose(bc)`) as well as data-first (`compose(ab, bc)`).
 *
 * **Gotchas**
 *
 * The two call shapes are told apart by argument *count*, not by type: one
 * argument is data-last, two or more is data-first, and arguments past the second
 * are ignored. Calling with zero arguments throws a `TypeError`. In the data-last
 * form the original domain `A` has no inference site of its own, so it resolves to
 * `unknown` unless a contextual type supplies it — which is the common case, since
 * almost every outer guard is a {@link TypeGuard}.
 *
 * **Example** (Proving a string, then refining it)
 *
 * ```ts doctest
 * import { compose } from "@resq-systems/types/predicate";
 * import { isString } from "@resq-systems/types/guards";
 *
 * const isDigits = (value: string): value is `${number}` => /^\d+$/.test(value);
 * const isNumericString = compose(isString, isDigits);
 *
 * isNumericString("123"); // => true
 * isNumericString("abc"); // => false
 * isNumericString(123); // => false
 * ```
 *
 * @typeParam A - The original input type.
 * @typeParam B - What `ab` proves, and what `bc` accepts.
 * @typeParam C - What `bc` proves.
 * @param ab - The outer guard, run first.
 * @param bc - The inner guard, run only on values `ab` accepted.
 * @returns A guard from `A` straight to `C`.
 *
 * @see {@link and}
 * @see {@link refineOn}
 * @category combinators
 * @since 0.2.0
 */
export const compose: {
	<A, B extends A, C extends B>(bc: Refinement<B, C>): (ab: Refinement<A, B>) => Refinement<A, C>;
	<A, B extends A, C extends B>(ab: Refinement<A, B>, bc: Refinement<B, C>): Refinement<A, C>;
} = dualBinary("compose", composeImpl);

/**
 * Contravariant map: run an existing predicate against a projection of the input.
 *
 * **When to use**
 *
 * Use it to reuse a rule written for one type on any type that can produce it —
 * validate a user by validating `user.email` — without rewriting the rule. When the
 * projection is a property access and you *do* want narrowing, use
 * {@link refineOn}.
 *
 * **Details**
 *
 * Deliberately returns a {@link Predicate}: narrowing cannot survive an arbitrary
 * projection, since knowing something about `f(value)` says nothing about the type
 * of `value`.
 *
 * **Gotchas**
 *
 * This is the one arity-2 combinator in the module with **no data-last form**, and
 * the asymmetry is deliberate rather than an oversight. Its second parameter is an
 * arbitrary function `(value: B) => A`, and *every* `Predicate<X>` structurally
 * satisfies that shape with `A = boolean`. So `mapInput(p)` would typecheck as a
 * data-last call with a nonsense `A`, and overload resolution would silently pick a
 * branch the author did not intend — the one failure mode argument-count dispatch
 * cannot be made to catch. It fails rule 2 of the dual eligibility rule in this
 * module's overview and stays data-first only.
 *
 * **Example** (Validating a field through a projection)
 *
 * ```ts doctest
 * import { mapInput, type Predicate } from "@resq-systems/types/predicate";
 *
 * type User = { readonly email: string };
 *
 * const isValidEmail: Predicate<string> = (value) => value.includes("@");
 * const hasValidEmail = mapInput(isValidEmail, (user: User) => user.email);
 *
 * hasValidEmail({ email: "a@b.com" }); // => true
 * hasValidEmail({ email: "nope" }); // => false
 * ```
 *
 * @typeParam A - The input type of the existing predicate.
 * @typeParam B - The input type of the resulting predicate.
 * @param self - The predicate to reuse.
 * @param f - Projection from the new input type to the old one.
 * @returns A predicate over `B`.
 *
 * @see {@link refineOn}
 * @see {@link compose}
 * @category combinators
 * @since 0.2.0
 */
export const mapInput: <A, B>(self: Predicate<A>, f: (value: B) => A) => Predicate<B> =
	(self, f) => (value) =>
		self(f(value));

/**
 * The narrowing-preserving counterpart to {@link mapInput}: lift a guard onto a
 * property, proving something about the object that contains it.
 *
 * **When to use**
 *
 * Use it when a value's type depends on one of its fields and the narrowing has to
 * reach the *container* — discriminant checks, "this record's `kind` is a string",
 * per-field validation that keeps the object's other fields intact.
 *
 * **Details**
 *
 * Curried in three stages, and that is not stylistic. A single-call `(key, guard)`
 * form has no inference site for the object type — it appears in no parameter — so
 * the key degenerates to `keyof object` and the whole thing stops typechecking at
 * real call sites. Deferring the object to the final call lets it infer from the
 * value being tested.
 *
 * Already curried on configuration, so it sits outside the dual question entirely.
 *
 * **Example** (Proving a discriminant field)
 *
 * ```ts doctest
 * import { refineOn } from "@resq-systems/types/predicate";
 * import { isString } from "@resq-systems/types/guards";
 *
 * const kindIsString = refineOn("kind")(isString);
 * const record: { kind: unknown } = { kind: "tcp" };
 *
 * if (kindIsString(record)) {
 *   const shouted = record.kind.toUpperCase();
 *   shouted; // => "TCP"
 * }
 * ```
 *
 * @typeParam K - The property key.
 * @typeParam B - What the property guard proves.
 * @typeParam A - The record type being tested, inferred at the final call.
 * @param key - The property to inspect.
 * @returns A function taking the property guard, which returns the object guard.
 *
 * @see {@link mapInput}
 * @see {@link structOf}
 * @category constructors
 * @since 0.2.0
 */
export const refineOn: <K extends PropertyKey>(
	key: K,
) => <B>(
	guard: TypeGuard<B>,
) => <A extends Record<K, unknown>>(value: A) => value is A & Record<K, B> = (key) => (guard) =>
	asGuard((value) => guard((value as Record<PropertyKey, unknown>)[key]));

/**
 * Defer construction of a guard until it is first called.
 *
 * **When to use**
 *
 * Use it for recursive shapes. A self-referential {@link structOf} — a tree node
 * whose children are tree nodes, a `JsonValue` whose members are `JsonValue`s — is
 * otherwise impossible to write, because the guard would have to reference itself
 * before its own initializer has run.
 *
 * **Details**
 *
 * The thunk is called on **every** test and its result is not memoized, so a thunk
 * that builds a fresh guard each time pays that cost per value. Hoist the
 * construction outside the thunk when that matters.
 *
 * Arity 1, so it is already pipe-able and is deliberately not dualized.
 *
 * **Example** (A recursive tree guard)
 *
 * ```ts doctest
 * import { arrayOf, lazy, structOf, type TypeGuard } from "@resq-systems/types/predicate";
 * import { isNumber } from "@resq-systems/types/guards";
 *
 * type Tree = { value: number; children: readonly Tree[] };
 *
 * const isTree: TypeGuard<Tree> = structOf({
 *   value: isNumber,
 *   children: arrayOf(lazy(() => isTree)),
 * });
 *
 * isTree({ value: 1, children: [{ value: 2, children: [] }] }); // => true
 * ```
 *
 * @typeParam A - The input type.
 * @typeParam B - What the deferred guard proves.
 * @param get - Thunk returning the real guard. Called on every test.
 * @returns A guard with the same type as the one the thunk returns.
 *
 * @see {@link structOf}
 * @see {@link arrayOf}
 * @category combinators
 * @since 0.2.0
 */
export const lazy: <A, B extends A>(get: () => Refinement<A, B>) => Refinement<A, B> = (get) =>
	asGuard((value) => runGuard(get(), value));

/**
 * The predicate that always passes.
 *
 * **When to use**
 *
 * Use it as the identity element for {@link allOf} folds and as the neutral value
 * for an optional configuration slot: `options.filter ?? alwaysTrue`.
 *
 * **Details**
 *
 * A single non-generic constant is enough because {@link Predicate} is
 * contravariant: this value is assignable to `Predicate<string>` and every other
 * instantiation.
 *
 * **Example** (Defaulting an optional filter)
 *
 * ```ts doctest
 * import { alwaysTrue, type Predicate } from "@resq-systems/types/predicate";
 *
 * const options: { readonly filter?: Predicate<string> } = {};
 * const filter: Predicate<string> = options.filter ?? alwaysTrue;
 *
 * filter("anything"); // => true
 * ```
 *
 * @see {@link alwaysFalse}
 * @see {@link allOf}
 * @category constants
 * @since 0.2.0
 */
export const alwaysTrue: Predicate<unknown> = () => true;

/**
 * The predicate that never passes.
 *
 * **When to use**
 *
 * Use it as the identity element for {@link anyOf} folds and as an explicit
 * deny-all default.
 *
 * **Details**
 *
 * The dual of {@link alwaysTrue}, and assignable at any input type for the same
 * contravariance reason.
 *
 * **Example** (An explicit deny-all)
 *
 * ```ts doctest
 * import { alwaysFalse, type Predicate } from "@resq-systems/types/predicate";
 *
 * const denyAll: Predicate<string> = alwaysFalse;
 *
 * denyAll("anything"); // => false
 * ```
 *
 * @see {@link alwaysTrue}
 * @see {@link anyOf}
 * @category constants
 * @since 0.2.0
 */
export const alwaysFalse: Predicate<unknown> = () => false;

//#endregion

//#region Shape constructors

/**
 * Lift a guard over elements into a guard over arrays of them.
 *
 * **When to use**
 *
 * Use it for the most common composite by a wide margin: a list whose elements all
 * have to satisfy the same check.
 *
 * **Details**
 *
 * The result is `readonly B[]` on purpose: an `unknown` that turned out to be an
 * array was never yours to mutate, and a readonly result sidesteps the
 * long-standing `Array.isArray` trap where narrowing a `readonly T[]` destroys its
 * readonly-ness. An empty array passes — vacuous truth.
 *
 * **Gotchas**
 *
 * Every index is read explicitly rather than through `Array.prototype.every`, which
 * **skips holes**: `every` lets `new Array(2)` and `["a", , "c"]` satisfy any
 * element guard at all, and a `for…of` over the "proven" result then hands the
 * caller `undefined` typed as `B`. {@link tupleOf} already read positionally; this
 * brings the two into line.
 *
 * **Example** (An array of strings, and a sparse array that must not pass)
 *
 * ```ts doctest
 * import { arrayOf } from "@resq-systems/types/predicate";
 * import { isString } from "@resq-systems/types/guards";
 *
 * const isStrings = arrayOf(isString);
 *
 * isStrings(["a", "b"]); // => true
 * isStrings(["a", 1]); // => false
 * isStrings(new Array(2)); // => false
 * ```
 *
 * @typeParam B - The element type.
 * @param guard - The per-element guard.
 * @returns A guard proving `readonly B[]`.
 *
 * @see {@link tupleOf}
 * @see {@link recordOf}
 * @category constructors
 * @since 0.2.0
 */
export const arrayOf: <B>(guard: TypeGuard<B>) => TypeGuard<readonly B[]> = (guard) =>
	asGuard((value) => {
		if (!Array.isArray(value)) {
			return false;
		}
		const items = value as readonly unknown[];
		for (let index = 0; index < items.length; index += 1) {
			if (!guard(items[index])) {
				return false;
			}
		}
		return true;
	});

/**
 * Lift a guard over values into a guard over string-keyed records of them.
 *
 * **When to use**
 *
 * Use it for open-ended maps — HTTP headers, a bag of feature flags, any
 * `Record<string, T>` whose keys are not known ahead of time. Pairs with
 * {@link arrayOf} for JSON-shaped data.
 *
 * **Details**
 *
 * Arrays and functions are rejected — a `Record<string, B>` claim should not be
 * satisfied by a `B[]`, even though one technically has string keys. Objects with a
 * `null` prototype pass, because `JSON.parse` output and `Object.create(null)` maps
 * are exactly the data this exists for. Under `noUncheckedIndexedAccess`, consumers
 * correctly see `B | undefined` at index sites on the result.
 *
 * Enumeration runs over `Object.getOwnPropertyNames`, **not** `Object.values`, so a
 * non-enumerable own property is checked like any other. That distinction is the
 * difference between a guard and a lie: `Record<string, B>` promises `B` at every
 * string key, and `Object.defineProperty(o, "x", { value: evil })` installs a key
 * that `Object.values` cannot see but `o.x` still returns.
 *
 * **Gotchas**
 *
 * Two limits worth stating. **Inherited** properties are out of scope — a guard
 * cannot repair a polluted `Object.prototype`, and `Record` does not model the
 * prototype chain either; compose with `isPlainObject` from
 * `@resq-systems/types/guards` when the prototype matters. And a **getter** is read
 * exactly once, here, so a property that answers differently on the next read
 * escapes the proof, as it does for every runtime validator. Symbol-keyed
 * properties are deliberately ignored: the `string` index signature makes no claim
 * about them.
 *
 * **Example** (A header map, and a hidden key that must not slip through)
 *
 * ```ts doctest
 * import { recordOf } from "@resq-systems/types/predicate";
 * import { isString } from "@resq-systems/types/guards";
 *
 * const isHeaders = recordOf(isString);
 *
 * isHeaders({ "content-type": "application/json" }); // => true
 *
 * const smuggled = {};
 * Object.defineProperty(smuggled, "x", { value: 1, enumerable: false });
 *
 * isHeaders(smuggled); // => false
 * ```
 *
 * @typeParam B - The value type.
 * @param guard - The per-value guard.
 * @returns A guard proving `Record<string, B>`.
 *
 * @see {@link arrayOf}
 * @see {@link structOf}
 * @category constructors
 * @since 0.2.0
 */
export const recordOf: <B>(guard: TypeGuard<B>) => TypeGuard<Record<string, B>> = (guard) =>
	asGuard((value) => {
		if (typeof value !== "object" || value === null || Array.isArray(value)) {
			return false;
		}
		const record = value as Record<string, unknown>;
		for (const key of Object.getOwnPropertyNames(record)) {
			if (!guard(record[key])) {
				return false;
			}
		}
		return true;
	});

/**
 * Build an object guard from a map of per-field guards.
 *
 * **When to use**
 *
 * Use it for composite validation with zero dependencies — it is the answer to "do
 * I need a schema library for this?" for shapes that are merely shapes.
 *
 * **Details**
 *
 * The result type is flattened through `Simplify`, so hover output reads
 * `{ id: string; age: number }` instead of a mapped-type expression. The field
 * guards must be {@link TypeGuard}s — guards whose domain is genuinely `unknown` —
 * because that is what they are handed. A `Refinement<string, …>` such as a brand
 * guard is rejected at compile time; wrap it with {@link compose}:
 * `compose(isString, UserId.is)`.
 *
 * **Gotchas**
 *
 * Three behaviors worth knowing. Extra properties are ignored — this is a
 * structural check, not an exact one. Under `exactOptionalPropertyTypes`, a field
 * built with {@link optionalOf} produces a **required key whose value may be
 * `undefined`**, not an optional key; a missing property still passes at runtime,
 * because reading it yields `undefined`. And fields are read with an ordinary
 * property access, so a value **inherited** from the prototype chain satisfies a
 * field — deliberate, so a class instance whose field is a prototype getter passes,
 * but it does mean a polluted `Object.prototype` can satisfy a required field on a
 * `JSON.parse` payload that does not carry it.
 *
 * **Example** (Validating a user payload)
 *
 * ```ts doctest
 * import { arrayOf, optionalOf, structOf } from "@resq-systems/types/predicate";
 * import { isNumber, isString } from "@resq-systems/types/guards";
 *
 * const isUser = structOf({
 *   id: isString,
 *   tags: arrayOf(isString),
 *   meta: optionalOf(isNumber),
 * });
 *
 * isUser({ id: "a", tags: ["x"] }); // => true
 * isUser({ id: "a", tags: ["x"], meta: "no" }); // => false
 * ```
 *
 * @typeParam R - The record of field guards.
 * @param fields - Map from property name to the guard for that property.
 * @returns A guard proving an object with those fields.
 *
 * @see {@link tupleOf}
 * @see {@link recordOf}
 * @see {@link optionalOf}
 * @category constructors
 * @since 0.2.0
 */
export const structOf: <R extends Record<string, TypeGuard<unknown>>>(
	fields: R,
) => TypeGuard<Simplify<{ [K in keyof R]: Refinement.Out<R[K]> }>> = (fields) => {
	// Hoisted out of the returned closure: `fields` is fixed when the guard is
	// built, so re-enumerating it per validated value would allocate one throwaway
	// key array per element of every array this guard is lifted over.
	const keys = Object.keys(fields);
	return asGuard((value) => {
		if (typeof value !== "object" || value === null || Array.isArray(value)) {
			return false;
		}
		const record = value as Record<string, unknown>;
		return keys.every((key) => {
			const guard = fields[key];
			return guard !== undefined && runGuard(guard, record[key]);
		});
	});
};

/**
 * Build a fixed-arity tuple guard from positional guards.
 *
 * **When to use**
 *
 * Use it when the position of an element carries meaning — a `[name, count]` pair,
 * a `[lat, lon]` coordinate, a fixed-shape wire frame.
 *
 * **Details**
 *
 * The homomorphic mapped type over `T` preserves arity, so the proven type's
 * `length` is the literal element count and destructuring stays safe even under
 * `noUncheckedIndexedAccess` — which is precisely what a plain `unknown[]` check
 * cannot give you. Length is checked exactly, so an over-long input is rejected.
 *
 * As with {@link structOf}, the positional guards must be {@link TypeGuard}s: they
 * are handed values read out of an `unknown`, so a guard with a narrower domain
 * would be called with input it never agreed to accept.
 *
 * Variadic, so it is structurally ineligible for a data-last form.
 *
 * **Example** (A name/count pair)
 *
 * ```ts doctest
 * import { tupleOf } from "@resq-systems/types/predicate";
 * import { isNumber, isString } from "@resq-systems/types/guards";
 *
 * const isPair = tupleOf(isString, isNumber);
 *
 * isPair(["a", 1]); // => true
 * isPair(["a"]); // => false
 * isPair(["a", 1, true]); // => false
 * ```
 *
 * @typeParam T - The tuple of positional guards.
 * @param guards - One guard per position, in order.
 * @returns A guard proving a tuple of exactly that arity and those element types.
 *
 * @see {@link structOf}
 * @see {@link arrayOf}
 * @category constructors
 * @since 0.2.0
 */
export const tupleOf: <const T extends readonly TypeGuard<unknown>[]>(
	...guards: T
) => TypeGuard<{ [I in keyof T]: Refinement.Out<T[I]> }> = (...guards) =>
	asGuard(
		(value) =>
			Array.isArray(value) &&
			value.length === guards.length &&
			guards.every((guard, index) => runGuard(guard, value[index])),
	);

/**
 * Widen a guard to also accept `undefined`.
 *
 * **When to use**
 *
 * Use it as the building block for optional fields inside {@link structOf}, so
 * nobody has to hand-write `anyOf(isUndefined, guard)` at every call site.
 *
 * **Details**
 *
 * Accepts `undefined` and nothing else beyond what the inner guard accepts — in
 * particular `null` is still rejected. See {@link nullishOf} when both belong.
 *
 * **Example** (An optional numeric field)
 *
 * ```ts doctest
 * import { optionalOf } from "@resq-systems/types/predicate";
 * import { isNumber } from "@resq-systems/types/guards";
 *
 * const isMaybePort = optionalOf(isNumber);
 *
 * isMaybePort(undefined); // => true
 * isMaybePort(null); // => false
 * ```
 *
 * @typeParam B - What the inner guard proves.
 * @param guard - The guard for the present case.
 * @returns A guard proving `B | undefined`.
 *
 * @see {@link nullableOf}
 * @see {@link nullishOf}
 * @category constructors
 * @since 0.2.0
 */
export const optionalOf: <B>(guard: TypeGuard<B>) => TypeGuard<B | undefined> = (guard) =>
	asGuard((value) => value === undefined || guard(value));

/**
 * Widen a guard to also accept `null`.
 *
 * **When to use**
 *
 * Use it wherever the wire format says "explicitly null" rather than "absent".
 *
 * **Details**
 *
 * Distinct from {@link optionalOf} because the wire formats that matter — JSON, SQL
 * result sets, protobuf, REST — separate "absent" from "explicitly null", and
 * collapsing them at the guard layer throws that distinction away before the caller
 * can act on it.
 *
 * **Example** (A nullable name field)
 *
 * ```ts doctest
 * import { nullableOf } from "@resq-systems/types/predicate";
 * import { isString } from "@resq-systems/types/guards";
 *
 * const isNullableName = nullableOf(isString);
 *
 * isNullableName(null); // => true
 * isNullableName(undefined); // => false
 * ```
 *
 * @typeParam B - What the inner guard proves.
 * @param guard - The guard for the non-null case.
 * @returns A guard proving `B | null`.
 *
 * @see {@link optionalOf}
 * @see {@link nullishOf}
 * @category constructors
 * @since 0.2.0
 */
export const nullableOf: <B>(guard: TypeGuard<B>) => TypeGuard<B | null> = (guard) =>
	asGuard((value) => value === null || guard(value));

/**
 * Widen a guard to accept both `null` and `undefined`.
 *
 * **When to use**
 *
 * Use it for mixed-nullability payloads, where a field may be absent *or* explicitly
 * null and the caller treats the two the same.
 *
 * **Details**
 *
 * The third variant earns its slot: mixed-nullability payloads are common enough
 * that forcing `anyOf(isNullish, guard)` at every site is worse than one more
 * four-line export. Named `nullishOf` rather than `nullishOr` to stay in the `*Of`
 * family.
 *
 * **Example** (Accepting both absent and null)
 *
 * ```ts doctest
 * import { nullishOf } from "@resq-systems/types/predicate";
 * import { isString } from "@resq-systems/types/guards";
 *
 * const isMaybeName = nullishOf(isString);
 *
 * isMaybeName(null); // => true
 * isMaybeName(undefined); // => true
 * isMaybeName(0); // => false
 * ```
 *
 * @typeParam B - What the inner guard proves.
 * @param guard - The guard for the present, non-null case.
 * @returns A guard proving `B | null | undefined`.
 *
 * @see {@link optionalOf}
 * @see {@link nullableOf}
 * @category constructors
 * @since 0.2.0
 */
export const nullishOf: <B>(guard: TypeGuard<B>) => TypeGuard<B | null | undefined> = (guard) =>
	asGuard((value) => value === null || value === undefined || guard(value));

//#endregion
