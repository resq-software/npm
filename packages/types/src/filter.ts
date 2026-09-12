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
 * @fileoverview The typed case split — narrowing as a composable function value.
 *
 * @module @resq-systems/types/filter
 *
 * This module sits one layer above `@resq-systems/types/narrow`, and the
 * layering is the one the package already uses: `./guards` holds leaf guards
 * (value in, proof out), `./predicate` is the algebra *over* guards, `./narrow`
 * is the eager *application* of a guard to a value, and this file is the algebra
 * over those applications. Everything in `./narrow` is scalar, value-first, and
 * eager; a {@link Filter} is a deferred, point-free function value you build
 * once and apply many times.
 *
 * What a {@link Filter} adds over the two things it sits between:
 *
 * - A `Refinement<A, B>` **narrows only**. `B` must extend `A`, the value cannot
 *   change, and rejection carries no payload — just `false`.
 * - A parser `(a: A) => B` **transforms only**. `B` is unconstrained, but the
 *   only rejection channel is throwing.
 * - A `Filter<Input, Pass, Fail>` is the join: `Pass` need not extend `Input`,
 *   so it transforms, and `Fail` is a real type parameter, so rejection is
 *   in-band and typed.
 *
 * The module has **zero runtime imports** — everything it takes from `./narrow`,
 * `./predicate`, and `./logic` is a type — so `import "@resq-systems/types/filter"`
 * costs a consumer nothing beyond the bodies below. That is a constraint rather
 * than an accident: it is why there is no `tagged` here (it would drag
 * `./union`'s runtime imports of `./guards` and `./narrow` behind every import,
 * to save writing `fromPredicate(isTagged(tag))`) and no `string`/`number`/`date`
 * constants (`fromPredicate` plus `./guards` covers all of them without a second
 * name for one behavior).
 *
 * **Example** (Building a case split once, then pointing it at two consumers)
 *
 * ```ts doctest
 * import { compose, fromMaybe, fromPredicate, mapFail, toUndefined } from "@resq-systems/types/filter";
 * import { isString } from "@resq-systems/types/guards";
 * import { NarrowError } from "@resq-systems/types/narrow";
 *
 * const asPort = compose(
 *   fromPredicate(isString),
 *   fromMaybe((raw: string) => {
 *     const port = Number.parseInt(raw, 10);
 *     return Number.isInteger(port) && port > 0 && port < 65536 ? port : undefined;
 *   }),
 * );
 *
 * // Consumer one: a default, no reason needed.
 * const read = toUndefined(asPort);
 * const port = read("8080") ?? 443; // => 8080
 * const fallback = read("nope") ?? 443; // => 443
 *
 * // Consumer two: the same case split, re-pointed at a structured error.
 * const parsePort = mapFail(asPort, (input) => new NarrowError("Expected a port", { value: input }));
 * const result = parsePort(0);
 * const reason = result.ok ? "accepted" : result.error.message; // => "Expected a port"
 * ```
 *
 * Nothing here throws, and nothing here is dualized. Every combinator is
 * data-first only: {@link mapPass} and {@link mapFail} take an arbitrary
 * function as their second argument, which every `Filter` structurally
 * satisfies, so a data-last form would resolve to a nonsense branch — the one
 * failure mode argument-count dispatch cannot catch, and the same reason
 * `mapInput` is data-first only in `@resq-systems/types/predicate`. {@link or}
 * and {@link compose} would pass that rule, but a dual is a hand-written
 * assertion `dualBinary` cannot check, and there is no `pipe` in this package
 * and no data-last call site for a filter to justify the permanent
 * `Equal<dataFirst, dataLast>` obligation.
 */

import type { If, IsEqual } from "./logic.js";
import type { NarrowResult } from "./narrow.js";
import type { Predicate, Refinement } from "./predicate.js";

//#region Internal

/**
 * The set-theoretic complement of `B` within `A` — what is left of the input
 * domain once the refinement's proof has been subtracted from it.
 *
 * The equality guard is load-bearing. A `Refinement<A, A>` does not actually
 * narrow, and a bare `Exclude<A, A>` would collapse its rejection branch to
 * `never` — a claim that the filter can never fail. Spelled with this package's
 * own `If` and `IsEqual` from `./logic.js` rather than a bespoke equality
 * helper, because the composition is exact.
 *
 * @internal
 */
type Complement<A, B> = If<IsEqual<A, B>, A, Exclude<A, B>>;

//#endregion

//#region Vocabulary

/**
 * A typed case split: one function that partitions its input into a pass branch
 * and a fail branch, and gives **both** branches a type.
 *
 * **When to use**
 *
 * Use it when a decision has to travel — when the same accept/reject rule is
 * applied in more than one place, or has to be composed with another rule before
 * anything is applied to a value. For a one-shot check against a value you
 * already hold, `parse` and `tryNarrow` from `@resq-systems/types/narrow` are
 * shorter and allocate less.
 *
 * **Details**
 *
 * The third type parameter is the whole novelty. A `Refinement<A, B>` narrows
 * only, and its rejection is a bare `false`; a parser transforms only, and its
 * rejection is a throw. A `Filter` is the join of the two — `Pass` is not
 * constrained to extend `Input`, and `Fail` is a real type.
 *
 * The result envelope is `NarrowResult` from `@resq-systems/types/narrow`,
 * instantiated with its second, defaulted type parameter. One ok/error shape
 * serves the whole package, so a filter's output is structurally interchangeable
 * with `parse`'s. That reuse is also why the failure slot is still named
 * `error`: for a filter it carries **the rejection payload, which is not
 * necessarily an error** — {@link fromPredicate} puts the rejected input there.
 * Use {@link mapFail} when a real `NarrowError` is wanted.
 *
 * Variance is declared and compiler-checked: contravariant in `Input`,
 * covariant in `Pass` and `Fail`. A `Filter<Animal, Cat, Dog>` is therefore
 * usable wherever a `Filter<Cat, Animal, Animal>` is expected.
 *
 * **Example** (Both branches, both typed)
 *
 * ```ts doctest
 * import { type Filter, fromPredicate } from "@resq-systems/types/filter";
 * import { isString } from "@resq-systems/types/guards";
 *
 * const keepString: Filter<unknown, string, unknown> = fromPredicate(isString);
 *
 * const passed = keepString("ada"); // => { ok: true, value: "ada" }
 * const failed = keepString(42); // => { ok: false, error: 42 }
 * ```
 *
 * @typeParam Input - What the filter accepts. Contravariant.
 * @typeParam Pass - The value carried by the accept branch. Need not extend
 *   `Input`. Covariant.
 * @typeParam Fail - The payload carried by the reject branch. Covariant.
 *
 * @see {@link fromPredicate} — the primary constructor.
 * @see {@link mapFail} — the bridge from a raw payload to a structured error.
 * @category models
 * @since 0.2.0
 */
export type Filter<in Input, out Pass = Input, out Fail = Input> = (
	input: Input,
) => NarrowResult<Pass, Fail>;

//#endregion

//#region Constructors

/**
 * Wrap a hand-written result-returning function as a {@link Filter}.
 *
 * **When to use**
 *
 * Use it when the decision falls out of neither a predicate nor a
 * `T | undefined` function — when the pass value and the fail payload are
 * genuinely computed together and the case split is worth writing by hand.
 *
 * **Details**
 *
 * The runtime behavior is identity. It exists as an **inference site**: annotate
 * the callback's return as `NarrowResult<Pass, Fail>` and the resulting filter's
 * three parameters are fixed by that annotation, rather than left to a
 * structural match at the use site.
 *
 * **Example** (A case split that computes both branches)
 *
 * ```ts doctest
 * import { make } from "@resq-systems/types/filter";
 * import type { NarrowResult } from "@resq-systems/types/narrow";
 *
 * const evenLength = make(
 *   (input: string): NarrowResult<number, string> =>
 *     input.length % 2 === 0 ? { ok: true, value: input.length } : { ok: false, error: input },
 * );
 *
 * const even = evenLength("abcd"); // => { ok: true, value: 4 }
 * const odd = evenLength("abc"); // => { ok: false, error: "abc" }
 * ```
 *
 * @typeParam Input - What the filter accepts.
 * @typeParam Pass - The accept-branch value.
 * @typeParam Fail - The reject-branch payload.
 * @param f - The case split to wrap.
 * @returns `f`, typed as a {@link Filter}.
 *
 * @see {@link fromPredicate}
 * @see {@link fromMaybe}
 * @category constructors
 * @since 0.2.0
 */
export const make: <Input, Pass, Fail>(
	f: (input: Input) => NarrowResult<Pass, Fail>,
) => Filter<Input, Pass, Fail> = (f) => f;

/**
 * Build a {@link Filter} from a guard or a plain predicate, typing the rejection
 * branch as the **set-theoretic complement** of what the guard proved.
 *
 * **When to use**
 *
 * Use it as the default way into this module. Every guard in
 * `@resq-systems/types/guards` and every result of the combinator algebra in
 * `@resq-systems/types/predicate` is a valid argument, so this is the adapter
 * that makes the existing guard vocabulary composable as filters.
 *
 * **Details**
 *
 * Two overloads, and the first is the interesting one. Given a
 * `Refinement<A, B>` the result is `Filter<A, B, Complement<A, B>>`: what
 * survives the check is `B`, and what does not is everything else in `A`. A
 * guard over `string | number` that proves `string` therefore yields a filter
 * whose failure branch is typed `number` — the rejected value arrives already
 * narrowed, with no second check.
 *
 * The complement is `Exclude<A, B>` **except** when `A` and `B` are the same
 * type, where it stays `A`. Without that guard a `Refinement<A, A>` — one that
 * does not actually narrow — would report a failure branch of `never`, which is
 * a claim that the filter cannot fail.
 *
 * The second overload takes a plain `Predicate<A>` and yields `Filter<A, A, A>`:
 * a predicate proves nothing about the type, so both branches carry the input
 * unchanged.
 *
 * **Example** (A guard's rejection branch arrives pre-narrowed)
 *
 * ```ts doctest
 * import { fromPredicate } from "@resq-systems/types/filter";
 * import { isString } from "@resq-systems/types/guards";
 *
 * const asString = fromPredicate(isString);
 *
 * const kept = asString("ada"); // => { ok: true, value: "ada" }
 * const rejected = asString(7); // => { ok: false, error: 7 }
 *
 * // A plain predicate proves nothing, so both branches carry the input.
 * const isShort = fromPredicate((value: string) => value.length < 4);
 * const short = isShort("abc"); // => { ok: true, value: "abc" }
 * const long = isShort("abcd"); // => { ok: false, error: "abcd" }
 * ```
 *
 * @typeParam A - The input domain.
 * @typeParam B - What the refinement proves.
 * @param refinement - The guard that decides.
 * @returns A filter passing `B` and failing with the complement of `B` in `A`.
 *
 * @see {@link fromMaybe} — when the check also transforms.
 * @see {@link toPredicate} — the way back.
 * @category constructors
 * @since 0.2.0
 */
export function fromPredicate<A, B extends A>(
	refinement: Refinement<A, B>,
): Filter<A, B, Complement<A, B>>;
/**
 * Overload for a plain predicate: nothing is proved, so both branches carry the
 * input type unchanged.
 *
 * @typeParam A - The input domain.
 * @param predicate - The test that decides.
 * @returns A filter over `A` whose branches both carry `A`.
 *
 * @see {@link fromPredicate}
 * @category constructors
 * @since 0.2.0
 */
export function fromPredicate<A>(predicate: Predicate<A>): Filter<A, A, A>;
export function fromPredicate<A>(predicate: Predicate<A>): Filter<A, A, A> {
	return (input: A): NarrowResult<A, A> =>
		predicate(input) ? { ok: true, value: input } : { ok: false, error: input };
}

/**
 * Adapt a function that returns `B | undefined` — reject on `undefined`, pass on
 * anything else, and carry the original input as the rejection payload.
 *
 * **When to use**
 *
 * Use it for the very common shape "try to produce a `B`, hand back nothing if
 * you cannot": `Map.prototype.get`, an `Array.prototype.find`, a lenient parser,
 * a lookup table. It is the one constructor here that is genuinely **not**
 * expressible through {@link fromPredicate}, because it transforms as well as
 * decides.
 *
 * **Details**
 *
 * This is the point-free counterpart of `tryNarrow` from
 * `@resq-systems/types/narrow`, which answers the same question eagerly against
 * a value you already hold.
 *
 * **Gotchas**
 *
 * `undefined` is the rejection signal, so a filter whose *successful* value can
 * legitimately be `undefined` cannot be built this way — use {@link make} and
 * decide explicitly. `null` is a perfectly good pass value and is never treated
 * as a rejection.
 *
 * **Example** (Adapting a lenient parser)
 *
 * ```ts doctest
 * import { fromMaybe } from "@resq-systems/types/filter";
 *
 * const parsePort = fromMaybe((raw: string) => {
 *   const port = Number.parseInt(raw, 10);
 *   return Number.isInteger(port) && port > 0 && port < 65536 ? port : undefined;
 * });
 *
 * const ok = parsePort("8080"); // => { ok: true, value: 8080 }
 * const bad = parsePort("nope"); // => { ok: false, error: "nope" }
 * ```
 *
 * @typeParam A - The input domain.
 * @typeParam B - The produced value.
 * @param f - The partial function to adapt.
 * @returns A filter passing `B` and failing with the original input.
 *
 * @see {@link toUndefined} — the inverse direction.
 * @see {@link fromThrowing} — when the partial function signals failure by
 *   throwing instead.
 * @category constructors
 * @since 0.2.0
 */
export const fromMaybe: <A, B>(f: (input: A) => B | undefined) => Filter<A, B, A> =
	<A, B>(f: (input: A) => B | undefined) =>
	(input: A): NarrowResult<B, A> => {
		const passed = f(input);
		return passed === undefined ? { ok: false, error: input } : { ok: true, value: passed };
	};

/**
 * Adapt a function that signals failure by throwing — catch the throw and reject
 * with the original input.
 *
 * **When to use**
 *
 * Use it at the boundary with APIs that predate result types: `JSON.parse`,
 * `new URL(...)`, `decodeURIComponent`, `structuredClone`. It is the second
 * constructor genuinely not expressible through {@link fromPredicate}.
 *
 * **Details**
 *
 * The thrown value is **discarded**, not forwarded: the rejection payload is the
 * input that provoked it. That keeps the fail branch typed `A` rather than the
 * `unknown` a `catch` binding has, and it keeps this module's promise that
 * nothing here throws. When the thrown reason matters, wrap the call yourself
 * and use {@link make}.
 *
 * **Gotchas**
 *
 * Only synchronous throws are caught. An `async` function returns a rejected
 * promise rather than throwing, so `fromThrowing` would pass the pending promise
 * straight through as a success. There is no async filter in this module by
 * design: {@link or} and {@link compose} would need async bodies and their
 * composition laws would change.
 *
 * **Example** (Making `JSON.parse` total)
 *
 * ```ts doctest
 * import { fromThrowing } from "@resq-systems/types/filter";
 *
 * const parseJson = fromThrowing((raw: string): unknown => JSON.parse(raw));
 *
 * const ok = parseJson('{"id":1}'); // => { ok: true, value: { id: 1 } }
 * const bad = parseJson("not json"); // => { ok: false, error: "not json" }
 * ```
 *
 * @typeParam A - The input domain.
 * @typeParam B - The value the function returns when it does not throw.
 * @param f - The throwing function to adapt.
 * @returns A filter passing `B` and failing with the original input.
 *
 * @see {@link fromMaybe}
 * @see {@link make} — when the thrown reason must be kept.
 * @category constructors
 * @since 0.2.0
 */
export const fromThrowing: <A, B>(f: (input: A) => B) => Filter<A, B, A> =
	<A, B>(f: (input: A) => B) =>
	(input: A): NarrowResult<B, A> => {
		try {
			return { ok: true, value: f(input) };
		} catch {
			return { ok: false, error: input };
		}
	};

//#endregion

//#region Combinators

/**
 * Transform the accept branch, leaving the reject branch untouched.
 *
 * **When to use**
 *
 * Use it to reshape what a filter hands back once it has decided — parse to a
 * domain type, project a field, brand a validated string — without rebuilding
 * the decision itself.
 *
 * **Details**
 *
 * `f` runs only on values the filter accepted, so it may assume everything the
 * pass type promises. The rejection branch is forwarded by reference rather than
 * reallocated.
 *
 * Obeys the two functor laws, both pinned by tests: mapping the identity
 * function changes nothing, and `mapPass(mapPass(self, f), g)` agrees with
 * `mapPass(self, (x) => g(f(x)))` on every input.
 *
 * **Gotchas**
 *
 * Data-first only, and deliberately so. Its second parameter is an arbitrary
 * `(pass: Pass) => Out`, which every `Filter` structurally satisfies, so a
 * data-last form would typecheck against a nonsense branch — the one failure
 * mode argument-count dispatch cannot catch. Same reasoning that keeps
 * `mapInput` in `@resq-systems/types/predicate` data-first only.
 *
 * **Example** (Reshaping what survives)
 *
 * ```ts doctest
 * import { fromPredicate, mapPass } from "@resq-systems/types/filter";
 * import { isString } from "@resq-systems/types/guards";
 *
 * const shout = mapPass(fromPredicate(isString), (value) => value.toUpperCase());
 *
 * const loud = shout("ada"); // => { ok: true, value: "ADA" }
 * const untouched = shout(42); // => { ok: false, error: 42 }
 * ```
 *
 * @typeParam Input - What the filter accepts.
 * @typeParam Pass - The original accept-branch value.
 * @typeParam Fail - The reject-branch payload, carried through unchanged.
 * @typeParam Out - The new accept-branch value.
 * @param self - The filter to adapt.
 * @param f - Applied to the accepted value.
 * @returns A filter with the same decision and a new pass type.
 *
 * @see {@link mapFail}
 * @see {@link compose} — when the transform can itself fail.
 * @category combinators
 * @since 0.2.0
 */
export const mapPass: <Input, Pass, Fail, Out>(
	self: Filter<Input, Pass, Fail>,
	f: (pass: Pass) => Out,
) => Filter<Input, Out, Fail> =
	<Input, Pass, Fail, Out>(self: Filter<Input, Pass, Fail>, f: (pass: Pass) => Out) =>
	(input: Input): NarrowResult<Out, Fail> => {
		const result = self(input);
		return result.ok ? { ok: true, value: f(result.value) } : result;
	};

/**
 * Transform the reject branch, leaving the accept branch untouched.
 *
 * **When to use**
 *
 * Use it as the bridge from a raw rejection payload to a structured error. A
 * filter built by {@link fromPredicate} rejects with the offending value itself;
 * `mapFail` is how that becomes a `NarrowError` carrying a message, an
 * `expected` description, and a path.
 *
 * **Details**
 *
 * `f` runs only on values the filter rejected. The accept branch is forwarded by
 * reference rather than reallocated.
 *
 * This is also what makes `parse` from `@resq-systems/types/narrow` legible as a
 * special case: `parse(value, guard, message, expected)` produces exactly what
 * `mapFail(fromPredicate(guard), (input) => new NarrowError(message, { value: input, expected }))(value)`
 * produces. The two are pinned to each other by a table test rather than by a
 * shared implementation — `./narrow` must never import from here, so the edge
 * runs one way, and a shared body would not have caught drift in the default
 * message wording anyway.
 *
 * **Gotchas**
 *
 * Data-first only, for the same reason as {@link mapPass}.
 *
 * **Example** (Rejection payload to structured error)
 *
 * ```ts doctest
 * import { fromPredicate, mapFail } from "@resq-systems/types/filter";
 * import { isString } from "@resq-systems/types/guards";
 * import { NarrowError } from "@resq-systems/types/narrow";
 *
 * const asString = mapFail(
 *   fromPredicate(isString),
 *   (input) => new NarrowError("Expected string", { value: input, expected: "string" }),
 * );
 *
 * const result = asString(42);
 * const reason = result.ok ? "accepted" : result.error.message; // => "Expected string"
 * const offending = result.ok ? undefined : result.error.value; // => 42
 * ```
 *
 * @typeParam Input - What the filter accepts.
 * @typeParam Pass - The accept-branch value, carried through unchanged.
 * @typeParam Fail - The original reject-branch payload.
 * @typeParam Out - The new reject-branch payload.
 * @param self - The filter to adapt.
 * @param f - Applied to the rejection payload.
 * @returns A filter with the same decision and a new fail type.
 *
 * @see {@link mapPass}
 * @see {@link Filter} — on why the slot is named `error`.
 * @category combinators
 * @since 0.2.0
 */
export const mapFail: <Input, Pass, Fail, Out>(
	self: Filter<Input, Pass, Fail>,
	f: (fail: Fail) => Out,
) => Filter<Input, Pass, Out> =
	<Input, Pass, Fail, Out>(self: Filter<Input, Pass, Fail>, f: (fail: Fail) => Out) =>
	(input: Input): NarrowResult<Pass, Out> => {
		const result = self(input);
		return result.ok ? result : { ok: false, error: f(result.error) };
	};

/**
 * Try the left filter; if it rejects, try the right one on the same input.
 *
 * **When to use**
 *
 * Use it when a value may legitimately arrive in more than one shape and either
 * is acceptable — a config field that is a string or a number, an id that is
 * either already branded or still raw.
 *
 * **Details**
 *
 * The pass type is the union `PassL | PassR`. The fail type is `FailR`
 * **alone**: reaching a failure at all means the right filter ran and rejected
 * too, so its payload is the one that survives and the left payload is
 * discarded. Short-circuits — the right filter never runs on a value the left
 * accepted, which is pinned by a test.
 *
 * Shares a name with `or` in `@resq-systems/types/predicate` on purpose: same
 * concept, different types, different module, and neither module is
 * barrel-exported into the same namespace. Renaming either would be the defect.
 *
 * **Example** (Accepting either of two shapes)
 *
 * ```ts doctest
 * import { fromPredicate, or } from "@resq-systems/types/filter";
 * import { isNumber, isString } from "@resq-systems/types/guards";
 *
 * const stringOrNumber = or(fromPredicate(isString), fromPredicate(isNumber));
 *
 * const left = stringOrNumber("ada"); // => { ok: true, value: "ada" }
 * const right = stringOrNumber(42); // => { ok: true, value: 42 }
 * const neither = stringOrNumber(true); // => { ok: false, error: true }
 * ```
 *
 * @typeParam Input - What both filters accept.
 * @typeParam PassL - The left filter's accept-branch value.
 * @typeParam FailL - The left filter's reject payload. Discarded.
 * @typeParam PassR - The right filter's accept-branch value.
 * @typeParam FailR - The right filter's reject payload. The surviving one.
 * @param self - Tried first.
 * @param that - Tried only when `self` rejects.
 * @returns A filter accepting either.
 *
 * @see {@link compose} — sequential rather than alternative.
 * @category combinators
 * @since 0.2.0
 */
export const or: <Input, PassL, FailL, PassR, FailR>(
	self: Filter<Input, PassL, FailL>,
	that: Filter<Input, PassR, FailR>,
) => Filter<Input, PassL | PassR, FailR> =
	<Input, PassL, FailL, PassR, FailR>(
		self: Filter<Input, PassL, FailL>,
		that: Filter<Input, PassR, FailR>,
	) =>
	(input: Input): NarrowResult<PassL | PassR, FailR> => {
		const left = self(input);
		return left.ok ? left : that(input);
	};

/**
 * Sequential case split: the left filter's accepted value becomes the right
 * filter's input.
 *
 * **When to use**
 *
 * Use it to build one filter out of two stages — prove a string, then parse it;
 * prove an object, then check a field. This is what makes a {@link Filter} more
 * than a `Refinement`: the intermediate type is free, so the second stage is not
 * constrained to be a subtype of the first stage's input.
 *
 * **Details**
 *
 * Short-circuits: `that` never runs on a value `self` rejected, which matters
 * because `that` is typed to accept only what `self` proved and may be unsafe on
 * anything else. The fail type is the union `FailL | FailR`, so a caller can
 * still tell which stage rejected when the two payload types differ.
 *
 * Associative — `compose(compose(a, b), c)` and `compose(a, compose(b, c))`
 * agree on every input — and {@link fromPredicate} of an always-true predicate
 * is its identity on both sides. Both laws are pinned by tests.
 *
 * Shares a name with `compose` in `@resq-systems/types/predicate` on purpose:
 * same concept at different types.
 *
 * **Example** (Prove a string, then parse it)
 *
 * ```ts doctest
 * import { compose, fromMaybe, fromPredicate } from "@resq-systems/types/filter";
 * import { isString } from "@resq-systems/types/guards";
 *
 * const asInteger = compose(
 *   fromPredicate(isString),
 *   fromMaybe((raw: string) => {
 *     const parsed = Number.parseInt(raw, 10);
 *     return Number.isNaN(parsed) ? undefined : parsed;
 *   }),
 * );
 *
 * const ok = asInteger("42"); // => { ok: true, value: 42 }
 * const notNumeric = asInteger("ada"); // => { ok: false, error: "ada" }
 * const notString = asInteger(42); // => { ok: false, error: 42 }
 * ```
 *
 * @typeParam Input - What the composed filter accepts.
 * @typeParam Mid - The intermediate type: `self`'s pass and `that`'s input.
 * @typeParam FailL - `self`'s reject payload.
 * @typeParam Pass - `that`'s accept-branch value, and the result's.
 * @typeParam FailR - `that`'s reject payload.
 * @param self - The first stage.
 * @param that - The second stage, run only on what `self` accepted.
 * @returns A filter from `Input` straight to `Pass`.
 *
 * @see {@link or} — alternative rather than sequential.
 * @see {@link mapPass} — when the second stage cannot fail.
 * @category combinators
 * @since 0.2.0
 */
export const compose: <Input, Mid, FailL, Pass, FailR>(
	self: Filter<Input, Mid, FailL>,
	that: Filter<Mid, Pass, FailR>,
) => Filter<Input, Pass, FailL | FailR> =
	<Input, Mid, FailL, Pass, FailR>(
		self: Filter<Input, Mid, FailL>,
		that: Filter<Mid, Pass, FailR>,
	) =>
	(input: Input): NarrowResult<Pass, FailL | FailR> => {
		const left = self(input);
		return left.ok ? that(left.value) : left;
	};

//#endregion

//#region Bridges

/**
 * Forget both payloads and keep only the decision, as a `Predicate<Input>`.
 *
 * **When to use**
 *
 * Use it to hand a filter to anything that wants a boolean test —
 * `Array.prototype.filter`, `every`, `some`, or the combinator algebra in
 * `@resq-systems/types/predicate`, all of which accept a `Predicate` directly.
 *
 * **Details**
 *
 * The return is annotated `Predicate<Input>` rather than a structurally similar
 * `(input: Input) => boolean`, so the connection to the predicate algebra is
 * declared rather than accidental.
 *
 * It is **never** a `Refinement`, and that is not a limitation to work around. A
 * filter's `Pass` is not constrained to extend `Input`, so accepting a value
 * proves nothing about that value's type; handing back a type predicate here
 * would be exactly the unchecked lie `@resq-systems/types/predicate` exists to
 * eliminate. A `Filter<string | number, string, number>` yields a
 * `Predicate<string | number>`, not a guard.
 *
 * **Example** (Feeding the decision to a builtin)
 *
 * ```ts doctest
 * import { fromPredicate, toPredicate } from "@resq-systems/types/filter";
 * import { isString } from "@resq-systems/types/guards";
 *
 * const isKept = toPredicate(fromPredicate(isString));
 *
 * const values: readonly unknown[] = ["a", 1, "b"];
 * const count = values.filter(isKept).length; // => 2
 * ```
 *
 * @typeParam Input - What the filter accepts.
 * @typeParam Pass - The accept-branch value. Discarded.
 * @typeParam Fail - The reject-branch payload. Discarded.
 * @param self - The filter to reduce.
 * @returns A predicate over `Input`.
 *
 * @see {@link fromPredicate} — the way in.
 * @see {@link toUndefined} — when the accepted value is still wanted.
 * @category combinators
 * @since 0.2.0
 */
export const toPredicate: <Input, Pass, Fail>(self: Filter<Input, Pass, Fail>) => Predicate<Input> =
	<Input, Pass, Fail>(self: Filter<Input, Pass, Fail>) =>
	(input: Input): boolean =>
		self(input).ok;

/**
 * Unwrap to the accepted value, or `undefined` when the filter rejected.
 *
 * **When to use**
 *
 * Use it when the reason for rejection is irrelevant and a default is what you
 * actually want — it pairs directly with `??`, which the result envelope does
 * not.
 *
 * **Details**
 *
 * This is `tryNarrow` from `@resq-systems/types/narrow` in point-free form.
 * Both stay: `tryNarrow` is the eager, value-first shorthand and allocates
 * nothing, while `toUndefined` is what a pipeline built out of filters needs. A
 * table test pins `toUndefined(fromPredicate(g))(v)` to `tryNarrow(v, g)` across
 * a case matrix so the two can never drift.
 *
 * **Gotchas**
 *
 * The `undefined` returned on rejection is indistinguishable from an accepted
 * `undefined`. When a filter can legitimately pass `undefined`, keep the
 * envelope and branch on `.ok`.
 *
 * **Example** (Defaulting off a rejection)
 *
 * ```ts doctest
 * import { fromPredicate, toUndefined } from "@resq-systems/types/filter";
 * import { isString } from "@resq-systems/types/guards";
 * import { tryNarrow } from "@resq-systems/types/narrow";
 *
 * const asString = toUndefined(fromPredicate(isString));
 *
 * const kept = asString("ada") ?? "fallback"; // => "ada"
 * const dropped = asString(42) ?? "fallback"; // => "fallback"
 *
 * // The eager counterpart, same answer.
 * const eager = tryNarrow(42 as unknown, isString) ?? "fallback"; // => "fallback"
 * ```
 *
 * @typeParam Input - What the filter accepts.
 * @typeParam Pass - The accept-branch value.
 * @typeParam Fail - The reject-branch payload. Discarded.
 * @param self - The filter to unwrap.
 * @returns A function from `Input` to `Pass | undefined`. Never throws.
 *
 * @see {@link toPredicate}
 * @see {@link fromMaybe} — the inverse direction.
 * @category combinators
 * @since 0.2.0
 */
export const toUndefined: <Input, Pass, Fail>(
	self: Filter<Input, Pass, Fail>,
) => (input: Input) => Pass | undefined =
	<Input, Pass, Fail>(self: Filter<Input, Pass, Fail>) =>
	(input: Input): Pass | undefined => {
		const result = self(input);
		return result.ok ? result.value : undefined;
	};

//#endregion
