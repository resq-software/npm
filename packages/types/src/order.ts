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
 * @fileoverview Total orders — the `Ordering` contract, the combinators over it,
 * and the bridge from ordering into the guard algebra.
 *
 * @module @resq-systems/types/order
 *
 * An {@link Order} answers one question — "which of these two comes first?" —
 * and answers it with exactly one of three values. That narrowness is the whole
 * design. A comparator typed `(a, b) => number` accepts `(a, b) => a.age - b.age`,
 * which is correct for `Array.prototype.sort` and *wrong* the moment anything
 * asks whether the answer was "less than": `-5` is not `-1`. Typing the result as
 * {@link Ordering} makes the compiler reject the subtraction form at the
 * definition site instead of letting it fail at a distant consumer.
 *
 * ## Sign comparison, everywhere
 *
 * Every consumer in this module tests `< 0`, `> 0`, or `!== 0` — never `=== -1`
 * or `=== 1`. That costs nothing and removes an entire class of bug: a
 * comparator that leaked through a cast and returns `-5` still sorts correctly,
 * still mins correctly, and still answers {@link isLessThan} correctly. There is
 * exactly one sanctioned way in from a loose comparator, {@link fromCompare},
 * and it normalises the sign for you.
 *
 * ## Interop with `CompareFn`, for free
 *
 * `@resq-systems/dsa` declares `CompareFn<T> = (a: T, b: T) => number` for its
 * priority queue. An `Order<T>` **is** a `CompareFn<T>` — `-1 | 0 | 1` widens to
 * `number` — so it can be handed to that queue, or to `Array.prototype.sort`,
 * with no adapter, no wrapper, and **no dependency edge in either direction**.
 * Structural typing does the work. The reverse direction is not free and is not
 * meant to be: go through {@link fromCompare}.
 *
 * ## Runtime dependencies: none
 *
 * This module imports two types and no values. `Predicate` comes from
 * `@resq-systems/types/predicate` and `Equivalence` from
 * `@resq-systems/types/equivalence`, both `import type`, so `./order` stays a
 * leaf at runtime and importing it pulls in nothing else.
 *
 * ## No data-last forms
 *
 * Nothing here is dualised, and every exclusion is mechanical rather than a
 * matter of taste — see the dual eligibility rule in
 * `@resq-systems/types/predicate`. {@link mapInput} fails rule 2 the same way
 * `predicate.mapInput` does. The comparison predicates and {@link min},
 * {@link max}, {@link clamp} are curried on the order and then on the bound, so
 * the value under test never lands in a data-first first position — which is
 * what makes `values.filter(isLessThan(orderNumber)(10))` safe.
 *
 * ## Not in the barrel
 *
 * `./order` is a subpath-only entry point. It exports `make`, `mapInput`,
 * `combine`, `tupleOf`, `arrayOf`, and `structOf`, all of which already exist
 * under those names in `@resq-systems/types/predicate` at different types, so
 * flat re-exporting both from `@resq-systems/types` would collide. Import the
 * subpath.
 *
 * **Example** (Sorting by one field, then another)
 *
 * ```ts doctest
 * import { combineAll, mapInput, orderNumber, orderString } from "@resq-systems/types/order";
 *
 * type Row = { readonly name: string; readonly age: number };
 *
 * const byAge = mapInput(orderNumber, (row: Row) => row.age);
 * const byName = mapInput(orderString, (row: Row) => row.name);
 * const byAgeThenName = combineAll([byAge, byName]);
 *
 * const rows: readonly Row[] = [
 *   { name: "b", age: 30 },
 *   { name: "a", age: 30 },
 *   { name: "c", age: 20 },
 * ];
 *
 * const sorted = [...rows].sort(byAgeThenName).map((row) => row.name); // => ["c", "a", "b"]
 * ```
 */

import type { Equivalence } from "./equivalence.js";
import type { Predicate } from "./predicate.js";

//#region Vocabulary

/**
 * The three answers a comparison may give: `-1` (before), `0` (equal), `1`
 * (after).
 *
 * **When to use**
 *
 * Use it as the return type of any hand-written comparison, and as the
 * annotation on a variable holding one. Prefer it over `number` wherever the
 * value is genuinely a comparison result rather than a magnitude.
 *
 * **Details**
 *
 * Lives in this module rather than one of its own: a three-member union does not
 * earn an entry point. The narrowness is the entire point — it is what makes the
 * compiler reject `(a, b) => a.age - b.age`, which is a perfectly good `sort`
 * comparator and a broken `Order`.
 *
 * **Gotchas**
 *
 * `String.prototype.localeCompare` is specified to return a *negative, zero, or
 * positive* number, not `-1 | 0 | 1`, and the actual magnitude varies by engine
 * and locale. Never write `a.localeCompare(b) as Ordering` — the cast compiles
 * and the value can be `-2`. Route it through {@link fromCompare}, which is the
 * only sanctioned crossing from a loose comparator.
 *
 * **Example** (The narrow type rejects a subtraction comparator)
 *
 * ```ts doctest
 * import { type Order, orderNumber, type Ordering } from "@resq-systems/types/order";
 *
 * const result: Ordering = orderNumber(1, 2); // => -1
 *
 * // @ts-expect-error — `a - b` is a `number`, not an `Ordering`.
 * const bad: Order<number> = (a, b) => a - b;
 * ```
 *
 * @see {@link Order}
 * @see {@link fromCompare}
 * @category models
 * @since 0.2.0
 */
export type Ordering = -1 | 0 | 1;

/**
 * A total order over `A`: given any two values it says which comes first.
 *
 * **When to use**
 *
 * Use it as the parameter type wherever a function takes "how to sort these" —
 * a sort, a priority queue, a range check, a bounded clamp — and as the return
 * type of anything that builds one.
 *
 * **Details**
 *
 * The laws, all of which the exported instances satisfy and all of which are
 * exercised by this module's tests:
 *
 * - **Total (connex)** — every pair yields one of `-1`, `0`, `1`. There is no
 *   "incomparable"; that is why {@link orderNumber} has to take a position on
 *   `NaN` rather than propagating it.
 * - **Reflexive** — `O(a, a) === 0`. {@link make} forces this structurally.
 * - **Antisymmetric** — `O(a, b) === 0` exactly when `O(b, a) === 0`, and
 *   `O(a, b) < 0` exactly when `O(b, a) > 0`.
 * - **Transitive** — `O(a, b) <= 0` and `O(b, c) <= 0` imply `O(a, c) <= 0`.
 *
 * `in A` marks the parameter contravariant, which is a checked assertion rather
 * than an optimisation: an `A` appearing in output position becomes an error
 * here instead of a surprise at a call site.
 *
 * Biome's `useShorthandFunctionType` offers to rewrite this interface into a type
 * alias. The rewrite is *declined*, not suppressed — it reports as an info and
 * does not gate `biome check` — for the same house-style reason recorded on
 * `predicate.Predicate`: `Predicate`, `Refinement`, and `Equivalence` are all
 * declared this way, and a lone type alias here would read as an accident. Note
 * that `biome check --write` applies it as a "safe" fix, so if this line ever
 * comes back as `export type Order<in A> = ...`, that is what happened.
 *
 * **Widening to a loose comparator is free.** `-1 | 0 | 1` is a subtype of
 * `number`, so an `Order<T>` is assignable to `Array.prototype.sort`'s
 * comparator parameter and to `@resq-systems/dsa`'s
 * `CompareFn<T> = (a: T, b: T) => number` with no adapter and no import in
 * either direction. There is deliberately no `toCompare` export: an identity
 * function whose only job is to be greppable is not worth a name.
 *
 * **Gotchas**
 *
 * The reverse direction is *not* free, and that is the point. A `CompareFn<T>`
 * is not an `Order<T>`; TypeScript rejects the assignment. Do not defeat it with
 * a cast — use {@link fromCompare}, which normalises the sign.
 *
 * **Example** (An order is already a `sort` comparator)
 *
 * ```ts doctest
 * import { orderNumber } from "@resq-systems/types/order";
 *
 * const compare: (a: number, b: number) => number = orderNumber;
 * const sorted = [3, 1, 2].sort(compare); // => [1, 2, 3]
 * ```
 *
 * @typeParam A - The type being ordered.
 *
 * @see {@link Ordering}
 * @see {@link make}
 * @see {@link fromCompare}
 * @category models
 * @since 0.2.0
 */
export type Order<in A> = (self: A, that: A) => Ordering;

//#endregion

//#region Internal

/**
 * The structural supertype of every {@link Order}: parameter contravariance
 * means a comparison taking `never` accepts all of them.
 *
 * @internal
 */
type ErasedOrder = (self: never, that: never) => Ordering;

/**
 * Invoke an order whose input type has been erased. The cast lives here so no
 * shape constructor body needs one.
 *
 * @internal
 */
function runOrder(order: ErasedOrder, self: unknown, that: unknown): Ordering {
	return (order as (self: unknown, that: unknown) => Ordering)(self, that);
}

/**
 * Stamp a comparison over erased inputs as an {@link Order} of whatever type the
 * call site expects. Exactly one unchecked step per shape constructor, each
 * justified by the loop sitting immediately next to it.
 *
 * @internal
 */
function asOrder<O>(compare: (self: unknown, that: unknown) => Ordering): O {
	return compare as unknown as O;
}

//#endregion

//#region Constructors

/**
 * Build an {@link Order} from a comparison that already returns an
 * {@link Ordering}.
 *
 * **When to use**
 *
 * Use it whenever you can express the comparison in terms of `-1 | 0 | 1`
 * directly. When you have a loose `(a, b) => number` comparator instead — a
 * subtraction, a `localeCompare` — use {@link fromCompare}.
 *
 * **Details**
 *
 * Wraps the comparison in a reference-equality fast path: `self === that`
 * short-circuits to `0` before your callback runs. That makes reflexivity
 * structural — you cannot write a non-reflexive order through `make` — and it
 * means the callback never has to handle the identical-value case. It mirrors
 * `equivalence.make`, which uses the same trick to force reflexivity there.
 *
 * **Gotchas**
 *
 * `0 === -0` is `true`, so the fast path collapses them to `0` before any
 * callback sees them. That is the desired behaviour for a numeric order, and it
 * is worth knowing if you were relying on a callback to distinguish them: it
 * will not be called.
 *
 * **Example** (Ordering by length)
 *
 * ```ts doctest
 * import { make } from "@resq-systems/types/order";
 *
 * const byLength = make<string>((self, that) => (self.length < that.length ? -1 : self.length > that.length ? 1 : 0));
 *
 * byLength("aa", "b"); // => 1
 * byLength("b", "aa"); // => -1
 * byLength("ab", "cd"); // => 0
 * byLength("same", "same"); // => 0
 * ```
 *
 * @typeParam A - The type being ordered.
 * @param compare - The comparison, already normalised to an {@link Ordering}.
 * @returns A reflexive order over `A`.
 *
 * @see {@link fromCompare}
 * @category constructors
 * @since 0.2.0
 */
export const make: <A>(compare: (self: A, that: A) => Ordering) => Order<A> =
	(compare) => (self, that) =>
		self === that ? 0 : compare(self, that);

/**
 * Build an {@link Order} from a loose comparator that returns any `number`.
 *
 * **When to use**
 *
 * Use it for every comparator you did not write against {@link Ordering}:
 * `localeCompare`, `a - b`, `Buffer.compare`, anything handed to you by a
 * library. This is **the** sanctioned crossing from `(a, b) => number` into this
 * module's vocabulary.
 *
 * **Details**
 *
 * Normalises by sign: negative becomes `-1`, positive becomes `1`, and
 * everything else — including `0`, `-0`, and `NaN` — becomes `0`.
 *
 * Mapping `NaN` to `0` is deliberate, not an oversight. A `NaN` comparison
 * result is not an ordering at all: `NaN < 0` and `NaN > 0` are both false, so
 * there is no answer to recover. Collapsing to "equal" is the only *total*
 * response, and totality is a law of {@link Order}. If a `NaN` result means your
 * comparator has a bug, catch it in the comparator — this function cannot.
 *
 * **Gotchas**
 *
 * Unlike {@link make}, there is no reference-equality fast path: your comparator
 * is called for identical values too. Comparators that already return `0` for
 * `compare(a, a)` — which is every correct one — are unaffected.
 *
 * **Example** (Locale-aware string ordering, done safely)
 *
 * ```ts doctest
 * import { fromCompare } from "@resq-systems/types/order";
 *
 * const byLocale = fromCompare<string>((self, that) => self.localeCompare(that));
 *
 * byLocale("a", "b"); // => -1
 * byLocale("b", "a"); // => 1
 * byLocale("a", "a"); // => 0
 *
 * const byAge = fromCompare<number>((self, that) => self - that);
 * byAge(30, 4); // => 1
 *
 * // A `NaN` result is not an ordering; it collapses to `equal`.
 * const broken = fromCompare<number>(() => Number.NaN);
 * broken(1, 2); // => 0
 * ```
 *
 * @typeParam A - The type being ordered.
 * @param compare - A comparator returning a negative, zero, or positive number.
 * @returns An order over `A` whose result is normalised to `-1 | 0 | 1`.
 *
 * @see {@link Order}
 * @see {@link make}
 * @category constructors
 * @since 0.2.0
 */
export const fromCompare: <A>(compare: (self: A, that: A) => number) => Order<A> =
	(compare) => (self, that) => {
		const result = compare(self, that);
		return result < 0 ? -1 : result > 0 ? 1 : 0;
	};

/**
 * The order under which every value is equal to every other.
 *
 * **When to use**
 *
 * Use it as the identity element for {@link combine} folds and as the neutral
 * value for an optional configuration slot: `options.order ?? alwaysEqual()`.
 *
 * **Details**
 *
 * It is exactly what {@link combineAll} returns for an empty collection, and
 * `combine(O, alwaysEqual())` is `O` for every `O`. Named to pair with
 * `predicate.alwaysTrue` / `predicate.alwaysFalse` rather than following
 * Effect's naming.
 *
 * A function rather than a constant, unlike `alwaysTrue`: `Order` is
 * contravariant, so a single `Order<unknown>` would be assignable everywhere —
 * but the call form reads better beside the other order-producing constructors
 * and keeps the inference site explicit.
 *
 * **Example** (The empty fold)
 *
 * ```ts doctest
 * import { alwaysEqual, combineAll } from "@resq-systems/types/order";
 *
 * const nothing = alwaysEqual<string>();
 * nothing("a", "b"); // => 0
 *
 * combineAll<string>([])("a", "b"); // => 0
 * ```
 *
 * @typeParam A - The type being ordered.
 * @returns An order that answers `0` for every pair.
 *
 * @see {@link combine}
 * @see {@link combineAll}
 * @category constants
 * @since 0.2.0
 */
export const alwaysEqual: <A>() => Order<A> = () => () => 0;

//#endregion

//#region Combining

/**
 * Flip an order so it sorts the other way.
 *
 * **When to use**
 *
 * Use it for descending sorts, and to derive "furthest first" from "nearest
 * first" without writing a second comparator.
 *
 * **Details**
 *
 * Swaps the arguments rather than negating the result, so a comparator that
 * leaked a magnitude through a cast still reverses correctly.
 *
 * Effect v4 renamed v3's `Order.reverse` to `Order.flip` while keeping
 * `Ordering.reverse` under the old name, so it now ships two names for one
 * concept. This package uses `reverse`, only `reverse`, and has no
 * `Ordering`-level counterpart — a flat module cannot hold two exports with the
 * same name, and `reverse(O)` covers every case the scalar flip would.
 *
 * **Example** (Descending)
 *
 * ```ts doctest
 * import { orderNumber, reverse } from "@resq-systems/types/order";
 *
 * const descending = reverse(orderNumber);
 *
 * descending(1, 2); // => 1
 * const sorted = [1, 3, 2].sort(descending); // => [3, 2, 1]
 * ```
 *
 * @typeParam A - The type being ordered.
 * @param self - The order to flip.
 * @returns The order that answers the opposite of `self` on every pair.
 *
 * @category combining
 * @since 0.2.0
 */
export const reverse: <A>(self: Order<A>) => Order<A> = (self) => (a, b) => self(b, a);

/**
 * Order by the first, falling back to the second only on a tie.
 *
 * **When to use**
 *
 * Use it for two-level sorting — rank then name, priority then timestamp. For
 * three or more levels reach for {@link combineAll}, which short-circuits the
 * same way without nesting.
 *
 * **Details**
 *
 * Tests `!== 0`, so a non-canonical magnitude that reached the first order
 * through a cast still wins the comparison instead of falling through.
 *
 * Data-first only. It passes all three conditions of the dual eligibility rule,
 * and is still not dualised: there is no `pipe` in this package and no data-last
 * call site for an order, so every dual signature would be a permanent
 * hand-written assertion with no caller. Adding one later is purely additive.
 *
 * **Example** (Rank, then name)
 *
 * ```ts doctest
 * import { combine, mapInput, orderNumber, orderString } from "@resq-systems/types/order";
 *
 * type Row = { readonly rank: number; readonly name: string };
 *
 * const byRank = mapInput(orderNumber, (row: Row) => row.rank);
 * const byName = mapInput(orderString, (row: Row) => row.name);
 * const byRankThenName = combine(byRank, byName);
 *
 * byRankThenName({ rank: 1, name: "a" }, { rank: 1, name: "b" }); // => -1
 * byRankThenName({ rank: 2, name: "a" }, { rank: 1, name: "b" }); // => 1
 * ```
 *
 * @typeParam A - The type being ordered.
 * @param self - The primary order.
 * @param that - The tie-breaker.
 * @returns An order consulting `that` only when `self` answers `0`.
 *
 * @see {@link combineAll}
 * @see {@link alwaysEqual}
 * @category combining
 * @since 0.2.0
 */
export const combine: <A>(self: Order<A>, that: Order<A>) => Order<A> = (self, that) => (a, b) => {
	const result = self(a, b);
	return result !== 0 ? result : that(a, b);
};

/**
 * Fold a collection of orders into one: the first non-zero answer wins.
 *
 * **When to use**
 *
 * Use it for any sort with three or more precedence levels, and use it whenever
 * precedence has to be **explicit** — it is the sanctioned alternative to
 * {@link structOf}, whose precedence comes from key enumeration order and can
 * surprise you.
 *
 * **Details**
 *
 * Short-circuits: once an order answers non-zero the rest are not consulted. The
 * collection is materialised once when the combined order is built, so passing a
 * generator is safe and the resulting order is reusable.
 *
 * An empty collection yields {@link alwaysEqual}, which is the identity of
 * {@link combine} and the only lawful answer.
 *
 * **Example** (Explicit precedence, in the order you wrote it)
 *
 * ```ts doctest
 * import { combineAll, mapInput, orderNumber, orderString } from "@resq-systems/types/order";
 *
 * type Row = { readonly rank: number; readonly name: string };
 *
 * const precedence = combineAll<Row>([
 *   mapInput(orderNumber, (row: Row) => row.rank),
 *   mapInput(orderString, (row: Row) => row.name),
 * ]);
 *
 * precedence({ rank: 1, name: "b" }, { rank: 1, name: "a" }); // => 1
 * precedence({ rank: 0, name: "z" }, { rank: 1, name: "a" }); // => -1
 * ```
 *
 * @typeParam A - The type being ordered.
 * @param collection - The orders, in precedence order.
 * @returns An order consulting each in turn until one answers non-zero.
 *
 * @see {@link combine}
 * @see {@link structOf}
 * @category combining
 * @since 0.2.0
 */
export function combineAll<A>(collection: Iterable<Order<A>>): Order<A> {
	const orders = [...collection];
	if (orders.length === 0) {
		return alwaysEqual<A>();
	}
	return (self, that) => {
		for (const order of orders) {
			const result = order(self, that);
			if (result !== 0) {
				return result;
			}
		}
		return 0;
	};
}

/**
 * Contravariant pullback: order values of one type by projecting them into
 * another that already has an order.
 *
 * **When to use**
 *
 * Use it to sort records by a field without writing a comparator — "sort users
 * by `user.age`" is `mapInput(orderNumber, (u: User) => u.age)`. It is the
 * primary way orders are built in practice, and the input to most
 * {@link combineAll} folds.
 *
 * **Details**
 *
 * Same name as `predicate.mapInput` and `equivalence.mapInput`: one name, one
 * concept, three types. There is deliberately no `contramap`, `on`, or `by`
 * alias.
 *
 * The projection must be pure and deterministic. A projection that returns a
 * different value each call breaks reflexivity and, with it, every downstream
 * guarantee.
 *
 * **Gotchas**
 *
 * The one arity-2 combinator here with no data-last form, and it is excluded for
 * the same reason `predicate.mapInput` is. Its second parameter is an arbitrary
 * `(value: B) => A`, a shape that *every* `Order`, `Equivalence`, and
 * `Predicate` structurally satisfies. A data-last `mapInput(o)` would therefore
 * typecheck with a nonsense `A` and resolve to a branch nobody intended — the
 * one failure mode argument-count dispatch cannot catch. It fails rule 2 of the
 * dual eligibility rule and stays data-first only.
 *
 * **Example** (Sorting records by a field)
 *
 * ```ts doctest
 * import { mapInput, orderNumber } from "@resq-systems/types/order";
 *
 * type Row = { readonly age: number };
 *
 * const byAge = mapInput(orderNumber, (row: Row) => row.age);
 *
 * byAge({ age: 20 }, { age: 30 }); // => -1
 * byAge({ age: 30 }, { age: 30 }); // => 0
 * ```
 *
 * @typeParam A - The type the existing order covers.
 * @typeParam B - The type of the resulting order.
 * @param self - The order to reuse.
 * @param f - Projection from the new type to the ordered one.
 * @returns An order over `B`.
 *
 * @see {@link combineAll}
 * @category combining
 * @since 0.2.0
 */
export const mapInput: <A, B>(self: Order<A>, f: (value: B) => A) => Order<B> =
	(self, f) => (a, b) =>
		self(f(a), f(b));

//#endregion

//#region Instances

/**
 * Lexicographic ordering of strings by UTF-16 code unit, case-sensitive.
 *
 * **When to use**
 *
 * Use it for identifiers, keys, enum tags, and anything else where a stable
 * machine ordering is what you want.
 *
 * **Details**
 *
 * Compares with `<`, so it is the same ordering `Array.prototype.sort` uses by
 * default and the same one `Object.keys` produces for non-integer keys. It is
 * **not** locale-aware: every uppercase ASCII letter sorts before every
 * lowercase one, and accented characters sort by code unit. For human-facing
 * lists use `fromCompare((a, b) => a.localeCompare(b))`.
 *
 * Prefix-named rather than called `String`, so it never shadows the global and
 * needs no `export { String_ as String }` dance. Matches `guards.isString`.
 *
 * **Example** (Machine ordering is case-sensitive)
 *
 * ```ts doctest
 * import { orderString } from "@resq-systems/types/order";
 *
 * orderString("a", "b"); // => -1
 * orderString("B", "a"); // => -1
 * const sorted = ["b", "A", "a"].sort(orderString); // => ["A", "a", "b"]
 * ```
 *
 * @see {@link fromCompare}
 * @category constants
 * @since 0.2.0
 */
export const orderString: Order<string> = make((self, that) => (self < that ? -1 : 1));

/**
 * Numeric ordering, with a defined answer for `NaN`.
 *
 * **When to use**
 *
 * Use it for every numeric sort, and as the base of {@link orderDate} and any
 * `mapInput` onto a numeric field.
 *
 * **Details**
 *
 * Three decisions worth stating, because `<` alone gives none of them:
 *
 * - **`0` and `-0` are equal.** Reference equality already says so, and no sort
 *   should separate them.
 * - **All `NaN`s are equal to each other.** `NaN === NaN` is `false`, so without
 *   this the order would be non-reflexive and `sort` would be free to produce
 *   any permutation.
 * - **`NaN` sorts below every number**, including `-Infinity`. Totality is a law
 *   of {@link Order}, so "incomparable" is not an available answer; putting the
 *   junk value at one end is the choice that keeps every real number in its
 *   correct relative position.
 *
 * **Gotchas**
 *
 * If `NaN` in your data means "missing" and you want it last, reverse the order
 * or project it to `Infinity` before comparing. Do not reach for a raw
 * subtraction comparator: `NaN - 1` is `NaN`, which sorts unpredictably.
 *
 * **Example** (`NaN` sorts first and compares equal to itself)
 *
 * ```ts doctest
 * import { orderNumber } from "@resq-systems/types/order";
 *
 * orderNumber(1, 2); // => -1
 * orderNumber(0, -0); // => 0
 * orderNumber(Number.NaN, Number.NaN); // => 0
 * orderNumber(Number.NaN, Number.NEGATIVE_INFINITY); // => -1
 * const sorted = [3, Number.NaN, 1].sort(orderNumber); // => [NaN, 1, 3]
 * ```
 *
 * @see {@link orderDate}
 * @category constants
 * @since 0.2.0
 */
export const orderNumber: Order<number> = make((self, that) => {
	if (Number.isNaN(self)) {
		return Number.isNaN(that) ? 0 : -1;
	}
	if (Number.isNaN(that)) {
		return 1;
	}
	return self < that ? -1 : 1;
});

/**
 * Boolean ordering: `false` before `true`.
 *
 * **When to use**
 *
 * Use it to push flagged records to one end of a list — combining it with an
 * `isArchived` projection sorts the live rows first.
 *
 * **Details**
 *
 * The direction follows the numeric coercion everyone already expects (`false`
 * is `0`, `true` is `1`). Reverse it with {@link reverse} rather than defining a
 * second constant.
 *
 * **Example** (Falsey first)
 *
 * ```ts doctest
 * import { orderBoolean } from "@resq-systems/types/order";
 *
 * orderBoolean(false, true); // => -1
 * orderBoolean(true, true); // => 0
 * const sorted = [true, false, true].sort(orderBoolean); // => [false, true, true]
 * ```
 *
 * @see {@link reverse}
 * @category constants
 * @since 0.2.0
 */
export const orderBoolean: Order<boolean> = make((self, _that) => (self ? 1 : -1));

/**
 * Numeric ordering of `bigint`s.
 *
 * **When to use**
 *
 * Use it for identifiers, balances, and counters that exceed
 * `Number.MAX_SAFE_INTEGER`.
 *
 * **Details**
 *
 * `bigint` has no `NaN` and no `-0`, so this is the simplest instance in the
 * module: reference equality plus `<`.
 *
 * **Example** (Beyond safe-integer range)
 *
 * ```ts doctest
 * import { orderBigInt } from "@resq-systems/types/order";
 *
 * orderBigInt(1n, 2n); // => -1
 * orderBigInt(10n, 2n); // => 1
 * orderBigInt(9007199254740993n, 9007199254740993n); // => 0
 * ```
 *
 * @see {@link orderNumber}
 * @category constants
 * @since 0.2.0
 */
export const orderBigInt: Order<bigint> = make((self, that) => (self < that ? -1 : 1));

/**
 * Chronological ordering of `Date`s.
 *
 * **When to use**
 *
 * Use it for timelines, log sorting, and any `createdAt` comparison.
 *
 * **Details**
 *
 * Defined as `mapInput(orderNumber, (date) => date.getTime())`, so it inherits
 * that instance's `NaN` policy exactly: an **Invalid Date** has a `NaN`
 * timestamp, therefore it sorts before every valid date and two Invalid Dates
 * compare equal. That is a defined, total answer rather than an accident — and
 * it means a parse failure surfaces as "suspiciously at the top of the list"
 * rather than as a nondeterministic sort.
 *
 * Compares instants, not identity: two distinct `Date` objects for the same
 * millisecond answer `0`.
 *
 * **Example** (Invalid Dates sort first and compare equal)
 *
 * ```ts doctest
 * import { orderDate } from "@resq-systems/types/order";
 *
 * const early = new Date("2020-01-01T00:00:00.000Z");
 * const late = new Date("2024-01-01T00:00:00.000Z");
 * const invalid = new Date("nope");
 *
 * orderDate(early, late); // => -1
 * orderDate(late, early); // => 1
 * orderDate(invalid, early); // => -1
 * orderDate(invalid, new Date("also nope")); // => 0
 * ```
 *
 * @see {@link orderNumber}
 * @see {@link mapInput}
 * @category constants
 * @since 0.2.0
 */
export const orderDate: Order<Date> = mapInput(orderNumber, (date: Date) => date.getTime());

//#endregion

//#region Shape constructors

/**
 * Build an order over a tuple from one order per position.
 *
 * **When to use**
 *
 * Use it when position carries meaning — a `[lastName, firstName]` pair, a
 * `[major, minor, patch]` version, a `[lat, lon]` coordinate.
 *
 * **Details**
 *
 * Compares positionally, left to right, and returns the first non-zero answer.
 * Element types are recovered from the orders, so
 * `tupleOf([orderString, orderNumber])` infers `Order<readonly [string, number]>`
 * rather than `Order<readonly (string | number)[]>`.
 *
 * **Gotchas**
 *
 * **No length check**, unlike `equivalence.tupleOf`, which does check. The
 * asymmetry is deliberate: a tuple *type* has fixed arity, so for a
 * correctly-typed input the check can never fail and would only cost a
 * comparison per call. An equivalence is far more often handed arrays that were
 * widened somewhere upstream, where the check earns its place. The two sit side
 * by side and behave differently — which is why this note exists on both.
 *
 * **Example** (Surname, then age)
 *
 * ```ts doctest
 * import { orderNumber, orderString, tupleOf } from "@resq-systems/types/order";
 *
 * const byPair = tupleOf([orderString, orderNumber]);
 *
 * byPair(["a", 2], ["a", 1]); // => 1
 * byPair(["a", 1], ["b", 0]); // => -1
 * byPair(["a", 1], ["a", 1]); // => 0
 * ```
 *
 * @typeParam T - The tuple of positional orders.
 * @param elements - One order per position, in precedence order.
 * @returns An order over the tuple of the corresponding element types.
 *
 * @see {@link arrayOf}
 * @see {@link structOf}
 * @category constructors
 * @since 0.2.0
 */
export const tupleOf: <const T extends readonly Order<never>[]>(
	elements: T,
) => Order<{ readonly [K in keyof T]: T[K] extends Order<infer A> ? A : never }> = (elements) =>
	asOrder((self, that) => {
		const left = self as readonly unknown[];
		const right = that as readonly unknown[];
		for (let index = 0; index < elements.length; index += 1) {
			const order = elements[index];
			if (order === undefined) {
				continue;
			}
			const result = runOrder(order, left[index], right[index]);
			if (result !== 0) {
				return result;
			}
		}
		return 0;
	});

/**
 * Lift an order over elements into the lexicographic order over arrays.
 *
 * **When to use**
 *
 * Use it to sort paths, key sequences, version segments, or any list where a
 * shorter prefix should come first.
 *
 * **Details**
 *
 * The standard lexicographic ordering, exactly as a dictionary works: compare
 * elementwise up to the shorter length, and if every one of those pairs is
 * equal, the shorter array sorts first. `[]` is therefore below everything, and
 * `[1]` is below `[1, 0]`.
 *
 * **Gotchas**
 *
 * Reads with plain indexing, so a **sparse** array's holes arrive as
 * `undefined`. If the element order cannot cope with `undefined` — most cannot —
 * densify first (`Array.from(sparse)`) rather than relying on this to notice.
 *
 * **Example** (Shorter prefixes sort first)
 *
 * ```ts doctest
 * import { arrayOf, orderNumber } from "@resq-systems/types/order";
 *
 * const byNumbers = arrayOf(orderNumber);
 *
 * byNumbers([1, 2], [1, 3]); // => -1
 * byNumbers([1, 2], [1, 2, 0]); // => -1
 * byNumbers([2], [1, 9, 9]); // => 1
 * byNumbers([], []); // => 0
 * ```
 *
 * @typeParam A - The element type.
 * @param item - The order over elements.
 * @returns The lexicographic order over readonly arrays of `A`.
 *
 * @see {@link tupleOf}
 * @category constructors
 * @since 0.2.0
 */
export const arrayOf: <A>(item: Order<A>) => Order<readonly A[]> = (item) => (self, that) => {
	const shared = Math.min(self.length, that.length);
	for (let index = 0; index < shared; index += 1) {
		const result = runOrder(item, self[index], that[index]);
		if (result !== 0) {
			return result;
		}
	}
	if (self.length === that.length) {
		return 0;
	}
	return self.length < that.length ? -1 : 1;
};

/**
 * Build an order over an object from one order per field.
 *
 * **When to use**
 *
 * Use it when the fields already read in the precedence you want and the keys
 * are all non-numeric. When precedence matters at all, prefer
 * {@link combineAll} — see the gotcha.
 *
 * **Details**
 *
 * Enumeration order of the field map **is** precedence order: the first field to
 * answer non-zero wins. Only the listed fields participate; extras on the
 * compared values are ignored.
 *
 * **Gotchas**
 *
 * `Object.keys` does not return keys in the order you wrote them. **Integer-like
 * keys come first, in ascending numeric order**, before string keys in insertion
 * order — so `structOf({ name: orderString, 2: orderNumber })` silently compares
 * `2` first. This is a JavaScript property-enumeration rule, not something this
 * function chooses, and it cannot be detected at the type level.
 *
 * When precedence genuinely matters, say it out loud instead:
 * `combineAll([mapInput(orderNumber, (v) => v.rank), mapInput(orderString, (v) => v.name)])`
 * consults them in the order written, always.
 *
 * There is deliberately no `recordOf` counterpart. A record has no canonical key
 * precedence, so any ordering over one would be an arbitrary choice dressed up
 * as a default. `equivalence.recordOf` exists because equivalence needs no
 * precedence at all — the asymmetry is principled.
 *
 * **Example** (Rank, then name)
 *
 * ```ts doctest
 * import { orderNumber, orderString, structOf } from "@resq-systems/types/order";
 *
 * const byRankThenName = structOf({ rank: orderNumber, name: orderString });
 *
 * byRankThenName({ rank: 1, name: "b" }, { rank: 1, name: "a" }); // => 1
 * byRankThenName({ rank: 0, name: "z" }, { rank: 1, name: "a" }); // => -1
 * byRankThenName({ rank: 1, name: "a" }, { rank: 1, name: "a" }); // => 0
 * ```
 *
 * **Example** (An integer-like key jumps the queue)
 *
 * ```ts doctest
 * import { orderNumber, orderString, structOf } from "@resq-systems/types/order";
 *
 * // Written name-first, but `Object.keys` yields ["2", "name"].
 * const surprising = structOf({ name: orderString, 2: orderNumber });
 *
 * // `name` alone would answer -1; `2` answers 1 and is consulted first.
 * surprising({ name: "a", 2: 9 }, { name: "b", 2: 1 }); // => 1
 * ```
 *
 * @typeParam R - The record of field orders.
 * @param fields - Map from property name to the order for that property.
 * @returns An order over an object with those fields.
 *
 * @see {@link combineAll}
 * @see {@link tupleOf}
 * @category constructors
 * @since 0.2.0
 */
export const structOf: <const R extends Readonly<Record<string, Order<never>>>>(
	fields: R,
) => Order<{ readonly [K in keyof R]: R[K] extends Order<infer A> ? A : never }> = (fields) => {
	// Hoisted out of the returned closure: `fields` is fixed when the order is
	// built, so re-enumerating it per comparison would allocate one throwaway key
	// array per step of every sort this order drives.
	const keys = Object.keys(fields);
	return asOrder((self, that) => {
		const left = self as Record<string, unknown>;
		const right = that as Record<string, unknown>;
		for (const key of keys) {
			const order = fields[key];
			if (order === undefined) {
				continue;
			}
			const result = runOrder(order, left[key], right[key]);
			if (result !== 0) {
				return result;
			}
		}
		return 0;
	});
};

//#endregion

//#region Predicates

/**
 * "Is this value strictly below the bound?" — as a {@link Predicate}.
 *
 * **When to use**
 *
 * Use it to turn an order into a rule that composes with the whole guard algebra
 * in `@resq-systems/types/predicate`: `and`, `or`, `allOf`, `anyOf`, `noneOf`,
 * `implies`, and every shape constructor accept the result directly.
 *
 * **Details**
 *
 * This is the bridge between the two modules, and the return type is annotated
 * `Predicate<A>` rather than a structurally-identical `(self: A) => boolean` so
 * the connection is **declared** rather than accidental.
 *
 * Implemented as `self(value, that) < 0` — sign-based, never `=== -1`. Effect's
 * equivalent uses `=== -1`, which makes it magnitude-sensitive while its own
 * `min`, `max`, and `combine` are magnitude-tolerant: a comparator returning
 * `-5` there sorts correctly and then answers `false` here. That inconsistency
 * is the bug class this module refuses to inherit.
 *
 * **Gotchas**
 *
 * Returns a {@link Predicate}, never a `Refinement`. `x < 10` proves nothing
 * about the *type* of `x`, and handing back a refinement would be exactly the
 * unchecked lie the predicate module exists to eliminate.
 *
 * Curried only, with no data-first form. A data-first `isLessThan(O)(value, that)`
 * would put the value under test in first position, which is the shape that makes
 * `.filter(fn)` dangerous — `Array.prototype.filter` invokes its callback with
 * `(value, index, array)`, and the index would be taken as the bound. The curried
 * result is a one-argument function and is safe there. For the two-value question
 * write `O(a, b) < 0` directly; it is shorter anyway.
 *
 * **Example** (Composing with the guard algebra)
 *
 * ```ts doctest
 * import { isLessThan, orderNumber } from "@resq-systems/types/order";
 * import type { Predicate } from "@resq-systems/types/predicate";
 *
 * const under10: Predicate<number> = isLessThan(orderNumber)(10);
 *
 * under10(9); // => true
 * under10(10); // => false
 * const kept = [5, 10, 15].filter(under10); // => [5]
 * ```
 *
 * @typeParam A - The type being ordered.
 * @param self - The order defining "below".
 * @returns A function taking the bound and returning the predicate.
 *
 * @see {@link isLessThanOrEqualTo}
 * @see {@link isGreaterThan}
 * @see {@link isBetween}
 * @category predicates
 * @since 0.2.0
 */
export const isLessThan: <A>(self: Order<A>) => (that: A) => Predicate<A> =
	(self) => (that) => (value) =>
		self(value, that) < 0;

/**
 * "Is this value strictly above the bound?" — as a {@link Predicate}.
 *
 * **When to use**
 *
 * Use it wherever {@link isLessThan} applies, on the other side of the bound.
 *
 * **Details**
 *
 * `self(value, that) > 0`. Sign-based, curried only, returns a {@link Predicate}
 * and never a `Refinement` — see {@link isLessThan} for the full reasoning
 * behind all three.
 *
 * **Example** (Filtering above a threshold)
 *
 * ```ts doctest
 * import { isGreaterThan, orderNumber } from "@resq-systems/types/order";
 *
 * const over10 = isGreaterThan(orderNumber)(10);
 *
 * over10(11); // => true
 * over10(10); // => false
 * const kept = [5, 10, 15].filter(over10); // => [15]
 * ```
 *
 * @typeParam A - The type being ordered.
 * @param self - The order defining "above".
 * @returns A function taking the bound and returning the predicate.
 *
 * @see {@link isLessThan}
 * @see {@link isGreaterThanOrEqualTo}
 * @category predicates
 * @since 0.2.0
 */
export const isGreaterThan: <A>(self: Order<A>) => (that: A) => Predicate<A> =
	(self) => (that) => (value) =>
		self(value, that) > 0;

/**
 * "Is this value at or below the bound?" — as a {@link Predicate}.
 *
 * **When to use**
 *
 * Use it for inclusive upper limits: quotas, caps, "no later than".
 *
 * **Details**
 *
 * `self(value, that) <= 0`. Sign-based, curried only — see {@link isLessThan}.
 *
 * **Example** (An inclusive cap)
 *
 * ```ts doctest
 * import { isLessThanOrEqualTo, orderNumber } from "@resq-systems/types/order";
 *
 * const atMost10 = isLessThanOrEqualTo(orderNumber)(10);
 *
 * atMost10(10); // => true
 * atMost10(11); // => false
 * ```
 *
 * @typeParam A - The type being ordered.
 * @param self - The order defining "below".
 * @returns A function taking the bound and returning the predicate.
 *
 * @see {@link isLessThan}
 * @category predicates
 * @since 0.2.0
 */
export const isLessThanOrEqualTo: <A>(self: Order<A>) => (that: A) => Predicate<A> =
	(self) => (that) => (value) =>
		self(value, that) <= 0;

/**
 * "Is this value at or above the bound?" — as a {@link Predicate}.
 *
 * **When to use**
 *
 * Use it for inclusive lower limits: minimum balances, "no earlier than", age
 * gates.
 *
 * **Details**
 *
 * `self(value, that) >= 0`. Sign-based, curried only — see {@link isLessThan}.
 *
 * **Example** (An inclusive floor)
 *
 * ```ts doctest
 * import { isGreaterThanOrEqualTo, orderNumber } from "@resq-systems/types/order";
 *
 * const atLeast18 = isGreaterThanOrEqualTo(orderNumber)(18);
 *
 * atLeast18(18); // => true
 * atLeast18(17); // => false
 * ```
 *
 * @typeParam A - The type being ordered.
 * @param self - The order defining "above".
 * @returns A function taking the bound and returning the predicate.
 *
 * @see {@link isGreaterThan}
 * @see {@link isBetween}
 * @category predicates
 * @since 0.2.0
 */
export const isGreaterThanOrEqualTo: <A>(self: Order<A>) => (that: A) => Predicate<A> =
	(self) => (that) => (value) =>
		self(value, that) >= 0;

/**
 * "Does this value fall within the bounds?" — as a {@link Predicate}, inclusive
 * at both ends.
 *
 * **When to use**
 *
 * Use it for range checks over any ordered domain — dates inside a window,
 * versions inside a supported span, scores inside a band.
 *
 * **Details**
 *
 * `self(value, minimum) >= 0 && self(value, maximum) <= 0`. Sign-based, and
 * built from the comparisons directly rather than from {@link isLessThan} so it
 * cannot inherit a magnitude sensitivity if those ever change.
 *
 * Takes an options object rather than two positional bounds. `isBetween(O)(1, 10)`
 * reads identically whether it means `(minimum, maximum)` or `(maximum, minimum)`;
 * `{ minimum, maximum }` does not.
 *
 * **Gotchas**
 *
 * Not a synonym for `isInRange` in `@resq-systems/types/guards`. That one is a
 * **guard**: it narrows `unknown` to `number` and hard-codes numeric comparison.
 * This one is order-parametric over any `A` and returns a {@link Predicate},
 * proving nothing about the value's type. Reach for `isInRange` at an `unknown`
 * boundary and for this everywhere else.
 *
 * When `minimum` is above `maximum` the range is empty and every value answers
 * `false`. That falls out of the two comparisons rather than being special-cased,
 * and it deliberately does not throw.
 *
 * **Example** (An inclusive band)
 *
 * ```ts doctest
 * import { isBetween, orderNumber } from "@resq-systems/types/order";
 *
 * const inRange = isBetween(orderNumber)({ minimum: 1, maximum: 10 });
 *
 * inRange(1); // => true
 * inRange(10); // => true
 * inRange(0); // => false
 * inRange(11); // => false
 *
 * // Inverted bounds describe an empty range.
 * isBetween(orderNumber)({ minimum: 10, maximum: 1 })(5); // => false
 * ```
 *
 * @typeParam A - The type being ordered.
 * @param self - The order defining the range.
 * @returns A function taking the bounds and returning the predicate.
 *
 * @see {@link isGreaterThanOrEqualTo}
 * @see {@link clamp}
 * @category predicates
 * @since 0.2.0
 */
export const isBetween: <A>(
	self: Order<A>,
) => (options: { readonly minimum: A; readonly maximum: A }) => Predicate<A> =
	(self) => (options) => (value) =>
		self(value, options.minimum) >= 0 && self(value, options.maximum) <= 0;

//#endregion

//#region Selection

/**
 * Select the lower of two values.
 *
 * **When to use**
 *
 * Use it to cap a value from above — `min(orderNumber)(limit)` is "no more than
 * `limit`" — and to fold a collection to its smallest member.
 *
 * **Details**
 *
 * Sign-based (`<= 0`), so a leaked magnitude still selects correctly.
 *
 * **On a tie it returns the value under test**, the argument in the final
 * position — not the bound. That is the stability contract: folding a list with
 * this keeps the *first* of several equal candidates. It is observable whenever
 * two values compare equal without being identical, so it is pinned by a test
 * rather than only documented.
 *
 * Curried on the order and then on the bound, for the same reason
 * {@link isLessThan} is: it keeps the value under test out of a data-first first
 * position.
 *
 * **Example** (Capping from above)
 *
 * ```ts doctest
 * import { min, orderNumber } from "@resq-systems/types/order";
 *
 * const atMost10 = min(orderNumber)(10);
 *
 * atMost10(4); // => 4
 * atMost10(42); // => 10
 * ```
 *
 * @typeParam A - The type being ordered.
 * @param self - The order deciding which is lower.
 * @returns A function taking the other value, then the value under test.
 *
 * @see {@link max}
 * @see {@link clamp}
 * @category combinators
 * @since 0.2.0
 */
export const min: <A>(self: Order<A>) => (that: A) => (value: A) => A =
	(self) => (that) => (value) =>
		self(value, that) <= 0 ? value : that;

/**
 * Select the higher of two values.
 *
 * **When to use**
 *
 * Use it to floor a value from below — `max(orderNumber)(0)` is "never
 * negative" — and to fold a collection to its largest member.
 *
 * **Details**
 *
 * Sign-based (`>= 0`), and it carries the same tie-breaking contract as
 * {@link min}: **on a tie it returns the value under test**, the argument in the
 * final position. Pinned by a test for the same reason.
 *
 * **Example** (Flooring from below)
 *
 * ```ts doctest
 * import { max, orderNumber } from "@resq-systems/types/order";
 *
 * const atLeast0 = max(orderNumber)(0);
 *
 * atLeast0(4); // => 4
 * atLeast0(-7); // => 0
 * ```
 *
 * @typeParam A - The type being ordered.
 * @param self - The order deciding which is higher.
 * @returns A function taking the other value, then the value under test.
 *
 * @see {@link min}
 * @see {@link clamp}
 * @category combinators
 * @since 0.2.0
 */
export const max: <A>(self: Order<A>) => (that: A) => (value: A) => A =
	(self) => (that) => (value) =>
		self(value, that) >= 0 ? value : that;

/**
 * Constrain a value to an inclusive range.
 *
 * **When to use**
 *
 * Use it for gauges, progress fractions, scroll offsets — anywhere out-of-range
 * input should be pinned to the nearest bound rather than rejected.
 *
 * **Details**
 *
 * Inclusive at both ends, and a value already inside the range is returned
 * unchanged (the same reference, not a copy). Sign-based throughout.
 *
 * Composed as "raise to the minimum, then lower to the maximum", which fixes the
 * behaviour when the bounds are inverted: with `minimum` above `maximum` the
 * result is **`maximum`**. That is documented rather than thrown — a clamp is
 * used in render paths and animation frames, where throwing turns a cosmetic
 * configuration mistake into a crash.
 *
 * **Gotchas**
 *
 * Takes an options object, not positional bounds. `@resq-systems/ui` has a
 * file-private positional `clamp(value, minimum, maximum)` in its attitude
 * indicator; the two are behaviourally the same for sane bounds but the
 * signatures are not interchangeable, and a mechanical swap would silently
 * reinterpret the arguments. Convert call sites deliberately if that module ever
 * adopts this one.
 *
 * **Example** (Pinning to a unit interval)
 *
 * ```ts doctest
 * import { clamp, orderNumber } from "@resq-systems/types/order";
 *
 * const toUnit = clamp(orderNumber)({ minimum: 0, maximum: 1 });
 *
 * toUnit(-0.5); // => 0
 * toUnit(0.5); // => 0.5
 * toUnit(2); // => 1
 *
 * // Inverted bounds resolve to `maximum` rather than throwing.
 * clamp(orderNumber)({ minimum: 10, maximum: 0 })(5); // => 0
 * ```
 *
 * @typeParam A - The type being ordered.
 * @param self - The order defining the range.
 * @returns A function taking the bounds, then the value to constrain.
 *
 * @see {@link min}
 * @see {@link max}
 * @see {@link isBetween}
 * @category combinators
 * @since 0.2.0
 */
export const clamp: <A>(
	self: Order<A>,
) => (options: { readonly minimum: A; readonly maximum: A }) => (value: A) => A =
	(self) => (options) => (value) => {
		const raised = self(value, options.minimum) < 0 ? options.minimum : value;
		return self(raised, options.maximum) > 0 ? options.maximum : raised;
	};

//#endregion

//#region Conversions

/**
 * Derive the {@link Equivalence} an order induces — its kernel.
 *
 * **When to use**
 *
 * Use it when you already have an order and need "are these the same?" —
 * deduplicating a sorted list, grouping adjacent equal runs, feeding
 * `equivalence.combine` — without writing a second definition that can drift
 * from the first.
 *
 * **Details**
 *
 * `(a, b) => self(a, b) === 0`. Because {@link Order} is antisymmetric and
 * transitive, the relation this produces is automatically reflexive, symmetric,
 * and transitive — the three equivalence laws — so the result is lawful by
 * construction for any lawful order.
 *
 * It inherits every decision the order made. `toEquivalence(orderNumber)`
 * equates `0` with `-0` and `NaN` with `NaN`; `toEquivalence(orderDate)` equates
 * two distinct Invalid Dates.
 *
 * Placed here rather than as an `equivalence.fromOrder` so that
 * `@resq-systems/types/equivalence` stays a zero-import leaf. The edge is
 * type-only either way; this direction is the one that keeps the leaf.
 *
 * **Example** (The kernel of a numeric order)
 *
 * ```ts doctest
 * import { orderNumber, toEquivalence } from "@resq-systems/types/order";
 *
 * const sameNumber = toEquivalence(orderNumber);
 *
 * sameNumber(1, 1); // => true
 * sameNumber(0, -0); // => true
 * sameNumber(Number.NaN, Number.NaN); // => true
 * sameNumber(1, 2); // => false
 * ```
 *
 * @typeParam A - The type being ordered.
 * @param self - The order to take the kernel of.
 * @returns The equivalence that holds exactly when the order answers `0`.
 *
 * @see {@link Order}
 * @category constructors
 * @since 0.2.0
 */
export const toEquivalence: <A>(self: Order<A>) => Equivalence<A> = (self) => (a, b) =>
	self(a, b) === 0;

//#endregion
