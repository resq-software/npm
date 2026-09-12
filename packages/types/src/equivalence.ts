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
 * @fileoverview Binary equivalence relations and the combinator algebra over them.
 *
 * @module @resq-systems/types/equivalence
 *
 * An {@link Equivalence} answers one question — *are these two values the same
 * for this purpose?* — and "for this purpose" is the whole point. `===` is one
 * answer. "Same id", "same calendar day", "the same string ignoring case" are
 * others, and none of them is a property of the values themselves. Making the
 * relation a first-class value is what lets the caller choose, and lets a
 * library take the choice as a parameter instead of baking one in.
 *
 * A lawful `Equivalence<A>` is:
 *
 * - **reflexive** — `eq(a, a)` is `true`;
 * - **symmetric** — `eq(a, b) === eq(b, a)`;
 * - **transitive** — `eq(a, b) && eq(b, c)` implies `eq(a, c)`.
 *
 * Every combinator here preserves all three. {@link make} additionally forces
 * reflexivity *structurally*, for every value that is `===` itself — which is
 * every value except `NaN`. That one hole is why {@link eqNumber} exists and why
 * {@link eqStrict} carries a warning.
 *
 * ## Why this algebra is smaller than the one in `./predicate`
 *
 * `@resq-systems/types/predicate` ships `and`, `or`, `anyOf`, `noneOf`. This
 * module ships only the conjunctions ({@link combine}, {@link combineAll}), and
 * the omission is structural rather than a matter of scope: **the union of two
 * equivalence relations is not transitive.** Let `eqA` equate `{x:1,y:1}` with
 * `{x:1,y:2}`, and `eqB` equate `{x:1,y:2}` with `{x:2,y:2}`. Their union relates
 * the first to the third through the second, yet answers `false` when asked
 * directly. There is no lawful `or` to write. The intersection has no such
 * problem, so `combine` is safe and `or` is absent on purpose.
 *
 * ## No data-last forms
 *
 * Nothing here is dualized. {@link combine} would qualify under this package's
 * three-condition dual eligibility rule, and is still declined: there is no
 * `pipe` in this package and no data-last call site for an equivalence, so each
 * dual would buy a permanent hand-written `Equal<dataFirst, dataLast>` test
 * obligation for zero callers. {@link mapInput} could never qualify — its second
 * parameter is an arbitrary projection that every `Equivalence` structurally
 * satisfies, which is the same reason `predicate.mapInput` is excluded.
 *
 * ## Not in the barrel
 *
 * This module is reachable **only** through its own
 * `@resq-systems/types/equivalence` subpath, never through
 * `@resq-systems/types`. It exports `make`, `mapInput`, `tupleOf`, `arrayOf`,
 * `structOf` and `recordOf`, and the barrel already re-exports symbols of those
 * names from `./predicate`. A flat re-export would collide. This is a deliberate
 * divergence from the rest of the package.
 *
 * ## Zero imports
 *
 * This file imports nothing, at the type level or otherwise. It is a leaf in the
 * same sense as `brand.ts` and `collection.ts`, and `order.ts` depends on it
 * rather than the other way round.
 */

//#region Vocabulary

/**
 * A binary "same for this purpose" relation over `A`.
 *
 * **When to use**
 *
 * Use it as the parameter type wherever a function must compare two values and
 * the *definition* of sameness belongs to the caller — a de-duplicator, a memo
 * cache, a change detector, a set-like collection.
 *
 * **Details**
 *
 * A lawful instance is reflexive, symmetric and transitive. Nothing in the type
 * enforces that; {@link make} enforces as much of it as a constructor can, and
 * the rest is on the author. Every combinator in this module preserves all three
 * laws when its inputs are lawful.
 *
 * `in A` is the same house style as `Predicate<in A>` and
 * `Refinement<in A, out B>`: variance is declared natively rather than carried by
 * a phantom marker property. It also makes contravariance a checked assertion —
 * `Equivalence<unknown>` is assignable to `Equivalence<string>`, and adding an
 * `A` in output position would become an error here rather than a surprise at a
 * distant call site.
 *
 * Declared as an interface with a call signature rather than as a function type
 * alias, matching `Predicate`. Biome's `useShorthandFunctionType` offers to
 * rewrite it; the rewrite is **declined**, not suppressed — it reports as an info
 * and does not gate `biome check`. Note that `biome check --write` *will* apply
 * it, so if this line ever appears as a `type` alias in a diff, that is what
 * happened and it should be reverted rather than accepted. The two forms are
 * otherwise equivalent, `in`/`out` annotations included.
 *
 * Structurally identical to `@resq-systems/dsa`'s comparison callbacks and to any
 * hand-rolled `(a, b) => boolean`, so interop needs no adapter and no dependency
 * edge in either direction.
 *
 * **Gotchas**
 *
 * A `Predicate<A>` — `(value: A) => boolean` — is **structurally assignable** to
 * `Equivalence<A>`, because a function of fewer parameters is assignable to one
 * of more. Passing a predicate where an equivalence is wanted therefore compiles,
 * and the resulting relation silently ignores the second value and is almost
 * never transitive. The compiler will not catch this; a law test will.
 *
 * **Example** (Comparing by length rather than by content)
 *
 * ```ts doctest
 * import type { Equivalence } from "@resq-systems/types/equivalence";
 *
 * const sameLength: Equivalence<string> = (self, that) => self.length === that.length;
 *
 * sameLength("abc", "xyz"); // => true
 * sameLength("abc", "wxyz"); // => false
 * ```
 *
 * @typeParam A - The type the relation compares.
 *
 * @see {@link make}
 * @see {@link mapInput}
 * @category models
 * @since 0.2.0
 */
export type Equivalence<in A> = (self: A, that: A) => boolean;

//#endregion

//#region Constructors

/**
 * Build an {@link Equivalence} from a comparison function, with reference
 * equality checked first.
 *
 * **When to use**
 *
 * Use it for **every** hand-written equivalence. Writing the bare
 * `(self, that) => …` arrow and annotating it as `Equivalence<A>` type-checks
 * identically and gives up the guarantee below for nothing.
 *
 * **Details**
 *
 * The returned relation is
 * `(self, that) => self === that || isEquivalent(self, that)`. That short-circuit
 * is not a micro-optimization — it **structurally forces reflexivity**. A
 * relation built through `make` cannot answer `false` for a value compared
 * against itself, whatever the supplied function does, so the law that is
 * easiest to break by accident becomes impossible to break here. That is the
 * entire reason this exists rather than a bare cast.
 *
 * The guarantee has exactly one hole, and it is the language's: `NaN === NaN` is
 * `false`, so `make` cannot repair reflexivity at `NaN`. That is why
 * {@link eqNumber} exists and why its body reads as nonsense in isolation.
 *
 * Symmetry and transitivity are *preserved*, not forced: `self === that` is
 * itself symmetric and transitive, so `make` cannot break a lawful input — but
 * it cannot fix an unlawful one either.
 *
 * **Example** (Same user, regardless of the rest of the record)
 *
 * ```ts doctest
 * import { make } from "@resq-systems/types/equivalence";
 *
 * type User = { readonly id: string; readonly name: string };
 *
 * const sameUser = make<User>((self, that) => self.id === that.id);
 *
 * sameUser({ id: "u1", name: "Ada" }, { id: "u1", name: "Ada L." }); // => true
 * sameUser({ id: "u1", name: "Ada" }, { id: "u2", name: "Ada" }); // => false
 * ```
 *
 * **Example** (Reflexivity survives a deliberately broken comparison)
 *
 * ```ts doctest
 * import { make } from "@resq-systems/types/equivalence";
 *
 * const broken = make<string>(() => false);
 *
 * broken("a", "a"); // => true
 * broken("a", "b"); // => false
 * ```
 *
 * @typeParam A - The type the relation compares.
 * @param isEquivalent - Called only when the two values are not already `===`.
 * @returns A relation that is reflexive at every value that is `===` itself.
 *
 * @see {@link eqStrict}
 * @see {@link eqSameValue}
 * @category constructors
 * @since 0.2.0
 */
export const make: <A>(isEquivalent: (self: A, that: A) => boolean) => Equivalence<A> =
	(isEquivalent) => (self, that) =>
		self === that || isEquivalent(self, that);

/**
 * The shared `===` body. Written over `unknown` so it can serve every
 * instantiation without a cast: `(self: unknown, that: unknown) => boolean` is
 * assignable to `Equivalence<A>` for every `A`.
 *
 * @internal
 */
const strictEquals = (self: unknown, that: unknown): boolean => self === that;

/**
 * The shared `Object.is` body. See {@link strictEquals} for why it is written
 * over `unknown`.
 *
 * @internal
 */
const sameValueEquals = (self: unknown, that: unknown): boolean => Object.is(self, that);

/**
 * Reference/value equality — raw `===`, deliberately **not** routed through
 * {@link make}.
 *
 * **When to use**
 *
 * Use it for object identity, where "the same" genuinely means "the same
 * reference": cache keys held by identity, `Set`-like membership, change
 * detection over immutable snapshots. For anything numeric use {@link eqNumber};
 * for a domain-agnostic relation that is reflexive at every input use
 * {@link eqSameValue}.
 *
 * **Details**
 *
 * A factory rather than a constant, so the caller pins `A` at the call site:
 * `eqStrict<Widget>()`. The returned function is shared, not freshly allocated.
 *
 * The `eq` prefix is house style, matching `guards.ts`'s `isString`/`isNumber`.
 * It also keeps every instance in this module from shadowing a global — which is
 * what forces Effect into the `function Array_(…); export { Array_ as Array }`
 * dance in its own `Equivalence.ts`.
 *
 * **Gotchas**
 *
 * **This relation is not reflexive.** `eqStrict<number>()(NaN, NaN)` is `false`,
 * because `NaN === NaN` is `false`. It is the only export in this module that
 * breaks a law, and it breaks it on purpose, because `===` is exactly what some
 * callers want. Route numeric domains to {@link eqNumber} and everything else to
 * {@link eqSameValue}; reach for `eqStrict` only when you mean the operator.
 *
 * It is also *not* the same relation as {@link eqSameValue}: the two differ on
 * `NaN` and on `-0`. See {@link eqSameValue} for the full table.
 *
 * **Example** (Identity, and the reflexivity hole)
 *
 * ```ts doctest
 * import { eqStrict } from "@resq-systems/types/equivalence";
 *
 * const strict = eqStrict<number>();
 *
 * strict(1, 1); // => true
 * strict(0, -0); // => true
 * strict(Number.NaN, Number.NaN); // => false
 * ```
 *
 * @typeParam A - The type the relation compares.
 * @returns The `===` relation at `A`.
 *
 * @see {@link eqSameValue}
 * @see {@link eqNumber}
 * @category constructors
 * @since 0.2.0
 */
export const eqStrict: <A>() => Equivalence<A> = () => strictEquals;

/**
 * SameValue equality — `Object.is`.
 *
 * **When to use**
 *
 * Use it as the domain-agnostic default when you want a *lawful* relation and
 * have nothing more specific: it is the only export here that is reflexive at
 * every input of every type, `NaN` included.
 *
 * **Details**
 *
 * Not in Effect's set, and not a synonym for either neighbour. {@link eqStrict},
 * `eqSameValue` and {@link eqNumber} disagree on exactly two inputs:
 *
 * | pair | `eqStrict` | `eqSameValue` | `eqNumber` |
 * | --- | --- | --- | --- |
 * | `(NaN, NaN)` | `false` | `true` | `true` |
 * | `(0, -0)` | `true` | `false` | `true` |
 *
 * Everywhere else all three agree. Pick by which of those two answers you want:
 * `eqSameValue` distinguishes the two zeroes, `eqNumber` does not, and only
 * `eqStrict` fails at `NaN`.
 *
 * It earns its place on evidence rather than symmetry — `Object.is` is already
 * the comparison inside `@resq-systems/helpers`' `areArraysShallowEqual` and
 * `areObjectsShallowEqual`, so this is the equivalence with live call sites in
 * this workspace.
 *
 * Like {@link eqStrict} this is a factory so the caller pins `A`, and the
 * returned function is shared rather than freshly allocated.
 *
 * **Example** (Reflexive at `NaN`, and it splits the zeroes)
 *
 * ```ts doctest
 * import { eqSameValue } from "@resq-systems/types/equivalence";
 *
 * const sameValue = eqSameValue<number>();
 *
 * sameValue(1, 1); // => true
 * sameValue(Number.NaN, Number.NaN); // => true
 * sameValue(0, -0); // => false
 * ```
 *
 * @typeParam A - The type the relation compares.
 * @returns The `Object.is` relation at `A`.
 *
 * @see {@link eqStrict}
 * @see {@link eqNumber}
 * @category constructors
 * @since 0.2.0
 */
export const eqSameValue: <A>() => Equivalence<A> = () => sameValueEquals;

//#endregion

//#region Combinators

/**
 * Logical AND of two relations: their intersection.
 *
 * **When to use**
 *
 * Use it to say "same by *both* of these" — same id **and** same revision, same
 * shape **and** same units. Build the parts with {@link mapInput} and join them
 * here rather than writing one comparison that reaches into several fields.
 *
 * **Details**
 *
 * The **intersection of two equivalence relations is itself an equivalence
 * relation**, so all three laws are preserved: reflexivity because both parts
 * hold at `(a, a)`, symmetry and transitivity because conjunction distributes
 * over both. That is a theorem, not a convention, and it is why `combine` is the
 * only binary combinator this module can offer — see the module overview for why
 * there is no `or`.
 *
 * Short-circuits: `that` never runs when `self` answered `false`. The result is
 * routed through {@link make}, so identical references answer `true` without
 * calling either part.
 *
 * Data-first only. See the module overview for why nothing here is dualized.
 *
 * **Example** (Same person by name and by age)
 *
 * ```ts doctest
 * import { combine, eqNumber, eqString, mapInput } from "@resq-systems/types/equivalence";
 *
 * type Person = { readonly name: string; readonly age: number };
 *
 * const byName = mapInput(eqString, (person: Person) => person.name);
 * const byAge = mapInput(eqNumber, (person: Person) => person.age);
 * const samePerson = combine(byName, byAge);
 *
 * samePerson({ name: "Ada", age: 36 }, { name: "Ada", age: 36 }); // => true
 * samePerson({ name: "Ada", age: 36 }, { name: "Ada", age: 41 }); // => false
 * ```
 *
 * @typeParam A - The type both relations compare.
 * @param self - Evaluated first.
 * @param that - Evaluated only when `self` answered `true`.
 * @returns The relation that holds exactly when both hold.
 *
 * @see {@link combineAll}
 * @see {@link mapInput}
 * @category combining
 * @since 0.2.0
 */
export const combine: <A>(self: Equivalence<A>, that: Equivalence<A>) => Equivalence<A> = (
	self,
	that,
) => make((left, right) => self(left, right) && that(left, right));

/**
 * Logical AND across a collection: the n-ary {@link combine}.
 *
 * **When to use**
 *
 * Use it when the parts are a list rather than a pair — one relation per column,
 * per field, per configured key — especially when the list is computed.
 *
 * **Details**
 *
 * Preserves all three laws for the same reason {@link combine} does: an
 * intersection of equivalence relations is an equivalence relation, for any
 * number of them.
 *
 * **An empty collection yields the total relation** — everything is equivalent
 * to everything. That is lawful (it is the one-block partition) and it is the
 * identity element for `combine`, which is what makes this a monoid fold rather
 * than a special case that should have thrown.
 *
 * The collection is materialized **eagerly**, once, so a one-shot iterator works
 * and later mutation of a source array is not observed. Effect re-iterates on
 * every comparison; this does not.
 *
 * Short-circuits on the first `false`, in iteration order.
 *
 * **Example** (One relation per field)
 *
 * ```ts doctest
 * import { combineAll, eqNumber, eqString, mapInput } from "@resq-systems/types/equivalence";
 *
 * type Row = { readonly id: string; readonly rev: number };
 *
 * const sameRow = combineAll([
 * 	mapInput(eqString, (row: Row) => row.id),
 * 	mapInput(eqNumber, (row: Row) => row.rev),
 * ]);
 *
 * sameRow({ id: "a", rev: 1 }, { id: "a", rev: 1 }); // => true
 * sameRow({ id: "a", rev: 1 }, { id: "a", rev: 2 }); // => false
 * ```
 *
 * **Example** (The empty fold is the total relation)
 *
 * ```ts doctest
 * import { combineAll } from "@resq-systems/types/equivalence";
 *
 * const everythingIsTheSame = combineAll<string>([]);
 *
 * everythingIsTheSame("a", "b"); // => true
 * ```
 *
 * @typeParam A - The type every relation in the collection compares.
 * @param collection - The relations to intersect. Materialized eagerly.
 * @returns The relation that holds exactly when every member holds.
 *
 * @see {@link combine}
 * @category combining
 * @since 0.2.0
 */
export function combineAll<A>(collection: Iterable<Equivalence<A>>): Equivalence<A> {
	const members = Array.from(collection);
	return make<A>((self, that) => {
		for (const member of members) {
			if (!member(self, that)) {
				return false;
			}
		}
		return true;
	});
}

/**
 * Contravariant pullback: compare a projection of the inputs instead of the
 * inputs themselves.
 *
 * **When to use**
 *
 * Use it to build every domain-specific relation you need out of the handful of
 * primitives here — "same by id" is `mapInput(eqString, (u: User) => u.id)`,
 * "case-insensitively equal" is
 * `mapInput(eqString, (s: string) => s.toLowerCase())`. Then join the pieces with
 * {@link combine}.
 *
 * **Details**
 *
 * Deliberately the same name as `predicate.mapInput` and `order.mapInput`: it is
 * one concept at three types. Never introduce `contramap`, `on` or `by` as a
 * second name for it.
 *
 * Preserves all three laws **provided `f` is pure and deterministic**: the
 * pullback of an equivalence relation along a function is an equivalence
 * relation. The result routes through {@link make}, so identical references
 * short-circuit before `f` runs at all.
 *
 * **Gotchas**
 *
 * A nondeterministic `f` breaks reflexivity, and `make`'s reference check hides
 * only the easiest case: `eq(a, a)` still answers `true` because `a === a`, while
 * `eq(a, b)` for two structurally identical but distinct values becomes a coin
 * flip. `f` must be a function of its argument and nothing else — no clock, no
 * counter, no randomness.
 *
 * This is data-first only and can never be dualized. Its second parameter is an
 * arbitrary `(value: B) => A`, a shape that **every** `Equivalence`, `Order`,
 * `Predicate` and `Filter` structurally satisfies, so a data-last resolution
 * would silently pick a nonsense branch — the one failure mode argument-count
 * dispatch cannot catch. `predicate.mapInput` is excluded for exactly this
 * reason.
 *
 * **Example** (Case-insensitive string equivalence)
 *
 * ```ts doctest
 * import { eqString, mapInput } from "@resq-systems/types/equivalence";
 *
 * const caseInsensitive = mapInput(eqString, (value: string) => value.toLowerCase());
 *
 * caseInsensitive("Hello", "HELLO"); // => true
 * caseInsensitive("Hello", "World"); // => false
 * ```
 *
 * @typeParam A - The type the existing relation compares.
 * @typeParam B - The type the resulting relation compares.
 * @param self - The relation to reuse.
 * @param f - Pure projection from the new type to the old one.
 * @returns A relation over `B`.
 *
 * @see {@link combine}
 * @see {@link eqDate}
 * @category combinators
 * @since 0.2.0
 */
export const mapInput: <A, B>(self: Equivalence<A>, f: (value: B) => A) => Equivalence<B> = (
	self,
	f,
) => make((left, right) => self(f(left), f(right)));

//#endregion

//#region Instances

/**
 * `===` over strings.
 *
 * **When to use**
 *
 * Use it as the default for string comparison, and as the base of any
 * string-derived relation via {@link mapInput}.
 *
 * **Details**
 *
 * Lawful: strings have no `NaN`, so `===` is reflexive, symmetric and transitive
 * over the whole domain and needs no {@link make} repair.
 *
 * Compares code units, not graphemes or locale collation. `"é"` written as one
 * code point and as `"e"` plus a combining accent are **not** equivalent;
 * normalize first with `mapInput(eqString, (s: string) => s.normalize("NFC"))`.
 *
 * **Example** (Exact string equality)
 *
 * ```ts doctest
 * import { eqString } from "@resq-systems/types/equivalence";
 *
 * eqString("abc", "abc"); // => true
 * eqString("abc", "ABC"); // => false
 * ```
 *
 * @see {@link mapInput}
 * @category constants
 * @since 0.2.0
 */
export const eqString: Equivalence<string> = strictEquals;

/**
 * Numeric equality with `NaN` equal to itself.
 *
 * **When to use**
 *
 * Use it for **every** numeric domain in preference to `eqStrict<number>()`. A
 * `NaN` that is not equal to itself eventually puts a value into a collection
 * that can never be found again, and this is the cheapest place to close that.
 *
 * **Details**
 *
 * The body is `make((self, that) => Number.isNaN(self) && Number.isNaN(that))`,
 * which reads as nonsense until you account for the constructor. {@link make}
 * has already answered `true` for every pair that is `===` — which is every pair
 * of equal numbers **and** the pair `(0, -0)`. The only pairs that reach the body
 * are ones `===` rejected, and the only such pair that should still be
 * equivalent is `NaN` against `NaN`. So the body handles exactly the case `===`
 * cannot, and nothing else.
 *
 * The result is lawful over the entire domain, `NaN` included — reflexive
 * because either `self === self` or both sides are `NaN`.
 *
 * `0` and `-0` are equivalent here, because `0 === -0`. Use {@link eqSameValue}
 * when that distinction matters, and see its table for the three-way comparison.
 *
 * **Example** (`NaN` is reflexive, the zeroes are one value)
 *
 * ```ts doctest
 * import { eqNumber } from "@resq-systems/types/equivalence";
 *
 * eqNumber(1, 1); // => true
 * eqNumber(1, 2); // => false
 * eqNumber(Number.NaN, Number.NaN); // => true
 * eqNumber(0, -0); // => true
 * ```
 *
 * @see {@link eqStrict}
 * @see {@link eqSameValue}
 * @category constants
 * @since 0.2.0
 */
export const eqNumber: Equivalence<number> = make<number>(
	(self, that) => Number.isNaN(self) && Number.isNaN(that),
);

/**
 * `===` over booleans.
 *
 * **When to use**
 *
 * Use it wherever a boolean field takes part in a composed relation — it is the
 * thing to hand {@link mapInput} or {@link structOf}, so the composition reads
 * uniformly instead of mixing relations with a bare `===`.
 *
 * **Details**
 *
 * Lawful, and trivially so: the domain has two inhabitants.
 *
 * **Example** (Boolean equality)
 *
 * ```ts doctest
 * import { eqBoolean } from "@resq-systems/types/equivalence";
 *
 * eqBoolean(true, true); // => true
 * eqBoolean(true, false); // => false
 * ```
 *
 * @see {@link structOf}
 * @category constants
 * @since 0.2.0
 */
export const eqBoolean: Equivalence<boolean> = strictEquals;

/**
 * `===` over bigints.
 *
 * **When to use**
 *
 * Use it for arbitrary-precision integers — ids, ledger amounts, nanosecond
 * timestamps — where {@link eqNumber} would silently lose precision before the
 * comparison ever ran.
 *
 * **Details**
 *
 * Lawful. `bigint` has no `NaN` and no signed zero, so `===` is already a total
 * equivalence relation.
 *
 * **Gotchas**
 *
 * `1n` and `1` are different types and this relation accepts only the former.
 * Mixed-representation data must be normalized before it gets here: `==` would
 * have equated them, and `===` does not.
 *
 * **Example** (BigInt equality)
 *
 * ```ts doctest
 * import { eqBigInt } from "@resq-systems/types/equivalence";
 *
 * eqBigInt(1n, 1n); // => true
 * eqBigInt(1n, 2n); // => false
 * ```
 *
 * @see {@link eqNumber}
 * @category constants
 * @since 0.2.0
 */
export const eqBigInt: Equivalence<bigint> = strictEquals;

/**
 * Two `Date`s are equivalent when they denote the same instant.
 *
 * **When to use**
 *
 * Use it any time `Date`s are compared for sameness. `===` compares references
 * and answers `false` for two `Date`s built from the same timestamp, which is
 * almost never what the caller meant.
 *
 * **Details**
 *
 * Defined as `mapInput(eqNumber, (value) => value.getTime())`, so it inherits
 * {@link eqNumber}'s `NaN` handling — and that inheritance has a visible
 * consequence: **two Invalid Dates are equivalent.** `getTime()` on an Invalid
 * Date is `NaN`, and `eqNumber` equates `NaN` with `NaN`. That is the lawful
 * answer — reflexivity demands an Invalid Date equal itself — and it groups all
 * Invalid Dates into a single class, which is the only total option.
 *
 * Time zone is not part of the comparison: a `Date` is an instant, and the same
 * instant rendered in two zones is one value.
 *
 * **Example** (Same instant, and Invalid Dates agree)
 *
 * ```ts doctest
 * import { eqDate } from "@resq-systems/types/equivalence";
 *
 * eqDate(new Date(0), new Date(0)); // => true
 * eqDate(new Date(0), new Date(1)); // => false
 * eqDate(new Date("nope"), new Date("also nope")); // => true
 * ```
 *
 * @see {@link eqNumber}
 * @see {@link mapInput}
 * @category constants
 * @since 0.2.0
 */
export const eqDate: Equivalence<Date> = mapInput(eqNumber, (value: Date) => value.getTime());

//#endregion

//#region Shape constructors

/**
 * Widen an element relation so the positional and per-key loops below can feed
 * it values read out of an `unknown`.
 *
 * `Equivalence<never>` is the top of the contravariant family — every
 * `Equivalence<X>` is assignable to it — which is what lets the shape
 * constructors constrain their inputs without `any`. Going the other way needs
 * an assertion, and this is the single place in the module that takes one. It is
 * sound in context: a shape constructor only ever hands an element relation the
 * value it read from the matching slot, which is the value that relation's
 * declared type describes.
 *
 * @internal
 */
const widen = (self: Equivalence<never>): Equivalence<unknown> => self as Equivalence<unknown>;

/**
 * Read an `unknown` as an indexable array. Paired with a length check at every
 * call site, so no index is ever trusted on its own.
 *
 * @internal
 */
const asArray = (value: unknown): readonly unknown[] => value as readonly unknown[];

/**
 * Read an `unknown` as a string-keyed record. Every read goes through
 * `noUncheckedIndexedAccess`, so a missing key surfaces as `undefined` rather
 * than as a lie.
 *
 * @internal
 */
const asRecord = (value: unknown): Readonly<Record<string, unknown>> =>
	value as Readonly<Record<string, unknown>>;

/**
 * A relation over a tuple, built from one relation per position.
 *
 * **When to use**
 *
 * Use it for fixed-arity positional data — a coordinate pair, a `[key, value]`
 * entry, a parsed triple — where each slot has its own notion of sameness.
 *
 * **Details**
 *
 * Element order is the tuple's order, and the result infers precisely:
 * `tupleOf([eqString, eqNumber])` is an `Equivalence<readonly [string, number]>`.
 *
 * The element constraint is `Equivalence<never>`, the top of the contravariant
 * family, rather than `Equivalence<any>`. Effect uses `any` here; this package
 * forbids it, and `never` is both stricter and sufficient.
 *
 * Lengths are checked before any element is compared, so this stays total even
 * when a value is widened past its declared tuple type at a boundary. That is a
 * deliberate asymmetry with `order.tupleOf`, which does not length-check.
 *
 * Preserves all three laws: a conjunction of per-position pullbacks is an
 * intersection of equivalence relations.
 *
 * **Example** (A `[name, age]` pair)
 *
 * ```ts doctest
 * import { eqNumber, eqString, tupleOf } from "@resq-systems/types/equivalence";
 *
 * const samePair = tupleOf([eqString, eqNumber]);
 *
 * samePair(["Ada", 36], ["Ada", 36]); // => true
 * samePair(["Ada", 36], ["Ada", 41]); // => false
 * ```
 *
 * @typeParam T - The tuple of element relations, captured with `const` so the
 *   positions survive inference.
 * @param elements - One relation per position, in order.
 * @returns A relation over the tuple those relations describe.
 *
 * @see {@link arrayOf}
 * @see {@link structOf}
 * @category constructors
 * @since 0.2.0
 */
export const tupleOf: <const T extends readonly Equivalence<never>[]>(
	elements: T,
) => Equivalence<{ readonly [K in keyof T]: T[K] extends Equivalence<infer A> ? A : never }> = (
	elements,
) => {
	const members = elements.map(widen);
	return make<unknown>((self, that) => {
		const left = asArray(self);
		const right = asArray(that);
		if (left.length !== members.length || right.length !== members.length) {
			return false;
		}
		for (let index = 0; index < members.length; index += 1) {
			const member = members[index];
			if (member === undefined || !member(left[index], right[index])) {
				return false;
			}
		}
		return true;
	});
};

/**
 * A relation over arrays, built from one relation for every element.
 *
 * **When to use**
 *
 * Use it for homogeneous, order-significant sequences where element sameness is
 * itself a choice — a list of ids compared by id, a list of dates compared by
 * instant.
 *
 * **Details**
 *
 * Length equality is checked first and ANDed with the positional comparison.
 * Length equality is itself an equivalence relation, so the conjunction stays
 * lawful, and `[]` is equivalent to `[]`.
 *
 * Order matters. Two arrays holding the same elements in different orders are
 * not equivalent — that would need a multiset relation, which is a different
 * function with a different cost.
 *
 * Named `arrayOf` to sit beside `predicate.ts`'s
 * `arrayOf`/`recordOf`/`structOf`/`tupleOf` family rather than Effect's
 * PascalCase `Array`, which shadows the global and forces an export alias to work
 * around it.
 *
 * **Gotchas**
 *
 * Elements are read by index, so a **sparse array** hole reads as `undefined`.
 * `[1, , 3]` and `[1, undefined, 3]` are therefore equivalent under
 * `arrayOf(eq)` whenever `eq(undefined, undefined)` holds. This mirrors index
 * access rather than `Object.hasOwn`, which is the behavior a positional
 * comparison should have.
 *
 * **Example** (Element-wise, order-sensitive, empty-safe)
 *
 * ```ts doctest
 * import { arrayOf, eqString } from "@resq-systems/types/equivalence";
 *
 * const sameStrings = arrayOf(eqString);
 *
 * sameStrings([], []); // => true
 * sameStrings(["a", "b"], ["a", "b"]); // => true
 * sameStrings(["a", "b"], ["b", "a"]); // => false
 * sameStrings(["a"], ["a", "b"]); // => false
 * ```
 *
 * @typeParam A - The element type.
 * @param item - The relation applied at every position.
 * @returns A relation over `readonly A[]`.
 *
 * @see {@link tupleOf}
 * @see {@link recordOf}
 * @category constructors
 * @since 0.2.0
 */
export const arrayOf: <A>(item: Equivalence<A>) => Equivalence<readonly A[]> = (item) => {
	const element = widen(item);
	return make<unknown>((self, that) => {
		const left = asArray(self);
		const right = asArray(that);
		if (left.length !== right.length) {
			return false;
		}
		for (let index = 0; index < left.length; index += 1) {
			if (!element(left[index], right[index])) {
				return false;
			}
		}
		return true;
	});
};

/**
 * A relation over a record with a known shape, built from one relation per
 * listed field.
 *
 * **When to use**
 *
 * Use it when sameness is decided by a specific set of fields — the identity
 * columns of a row, the inputs of a memoized call — and the rest of the object
 * is noise.
 *
 * **Details**
 *
 * Only the listed fields are compared; **extra properties on either value are
 * ignored**. That is not a leak, it is the definition: `structOf` is a
 * {@link mapInput} onto the projection that keeps those fields, so it is exactly
 * as lawful as the field relations it was given.
 *
 * Fields are compared in `Object.keys` order over the *field map*, and the whole
 * conjunction short-circuits on the first mismatch — so put the cheapest and
 * most selective field first.
 *
 * The field constraint is `Record<string, Equivalence<never>>`; symbol-keyed
 * fields are outside the type and are not compared. Use {@link mapInput} for a
 * symbol key.
 *
 * Infers precisely: `structOf({ name: eqString, age: eqNumber })` is an
 * `Equivalence<{ readonly name: string; readonly age: number }>`.
 *
 * **Example** (Compare two fields)
 *
 * ```ts doctest
 * import { eqNumber, eqString, structOf } from "@resq-systems/types/equivalence";
 *
 * const sameUser = structOf({ name: eqString, age: eqNumber });
 *
 * sameUser({ name: "Ada", age: 36 }, { name: "Ada", age: 36 }); // => true
 * sameUser({ name: "Ada", age: 36 }, { name: "Bob", age: 36 }); // => false
 * ```
 *
 * **Example** (Unlisted fields are ignored)
 *
 * ```ts doctest
 * import { eqString, structOf } from "@resq-systems/types/equivalence";
 *
 * const sameName = structOf({ name: eqString });
 * const left = { name: "Ada", email: "ada@example.com" };
 * const right = { name: "Ada", email: "lovelace@example.com" };
 *
 * sameName(left, right); // => true
 * ```
 *
 * @typeParam R - The field map, captured with `const` so the keys survive
 *   inference.
 * @param fields - One relation per field to compare.
 * @returns A relation over the record those fields describe.
 *
 * @see {@link recordOf}
 * @see {@link mapInput}
 * @category constructors
 * @since 0.2.0
 */
export const structOf: <const R extends Readonly<Record<string, Equivalence<never>>>>(
	fields: R,
) => Equivalence<{ readonly [K in keyof R]: R[K] extends Equivalence<infer A> ? A : never }> = (
	fields,
) => {
	const entries = Object.entries(fields).map(([key, field]) => [key, widen(field)] as const);
	return make<unknown>((self, that) => {
		const left = asRecord(self);
		const right = asRecord(that);
		for (const [key, field] of entries) {
			if (!field(left[key], right[key])) {
				return false;
			}
		}
		return true;
	});
};

/**
 * A relation over open string-keyed records, built from one relation for every
 * value.
 *
 * **When to use**
 *
 * Use it for dictionaries whose keys are data rather than schema — HTTP headers,
 * a tag bag, a per-locale string table.
 *
 * **Details**
 *
 * Own enumerable string keys are counted on both sides first; a mismatch is
 * `false` before any value is compared. Then every key on the left must be an own
 * key of the right, and the two values must be equivalent. Key *order* is
 * irrelevant, which is what distinguishes this from {@link arrayOf}.
 *
 * Inherited and symbol-keyed properties are not compared, matching the
 * `Record<string, A>` the type claims and matching `@resq-systems/helpers`'
 * `areObjectsShallowEqual`.
 *
 * Preserves all three laws: it is a conjunction of key-set equality (itself an
 * equivalence relation) with a per-key pullback.
 *
 * `equivalence` gets a `recordOf`; `order.ts` deliberately does **not**, because
 * records have no canonical key precedence and so no canonical ordering. Nothing
 * is missing there — the asymmetry is the point, and it is documented on both
 * sides.
 *
 * **Example** (Same keys, same values, any order)
 *
 * ```ts doctest
 * import { eqNumber, recordOf } from "@resq-systems/types/equivalence";
 *
 * const sameScores = recordOf(eqNumber);
 *
 * sameScores({}, {}); // => true
 * sameScores({ a: 1, b: 2 }, { b: 2, a: 1 }); // => true
 * sameScores({ a: 1 }, { a: 1, b: 2 }); // => false
 * ```
 *
 * @typeParam A - The value type.
 * @param value - The relation applied to every value.
 * @returns A relation over `Readonly<Record<string, A>>`.
 *
 * @see {@link structOf}
 * @see {@link arrayOf}
 * @category constructors
 * @since 0.2.0
 */
export const recordOf: <A>(value: Equivalence<A>) => Equivalence<Readonly<Record<string, A>>> = (
	value,
) => {
	const compareValue = widen(value);
	return make<unknown>((self, that) => {
		const left = asRecord(self);
		const right = asRecord(that);
		const leftKeys = Object.keys(left);
		// Membership must use the same notion of "key" as the count above — own
		// *enumerable* — or the relation stops being symmetric: `Object.hasOwn`
		// accepts a non-enumerable own key that `Object.keys` never counted.
		const rightKeys = new Set(Object.keys(right));
		if (leftKeys.length !== rightKeys.size) {
			return false;
		}
		for (const key of leftKeys) {
			if (!rightKeys.has(key) || !compareValue(left[key], right[key])) {
				return false;
			}
		}
		return true;
	});
};

//#endregion
