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
 * @fileoverview Nominal (branded / opaque) types.
 *
 * @module @resq-systems/types/brand
 *
 * TypeScript is structural: any two `string`s are interchangeable. That is a
 * problem for a security library, where "a string that has been sanitized",
 * "a validated email", and "a raw header the attacker controls" are all
 * `string` yet must never be confused. Branding attaches a compile-time-only
 * phantom tag to a base type so the compiler tracks that distinction and makes
 * illegal states unrepresentable — with **zero runtime cost** (the tag is
 * erased).
 *
 * @example Make "you must sanitize before rendering" a compile error
 * ```ts
 * import type { Brand } from "@resq-systems/types";
 *
 * type Html = Brand<string, "Html">;
 * declare function escapeHtml(raw: string): Html;
 * declare function renderToDom(safe: Html): void;
 *
 * renderToDom(userInput);            // ✗ compile error — raw string
 * renderToDom(escapeHtml(userInput)); // ✓ only escaped output flows to the sink
 * ```
 */

import type { UnionToIntersection } from "./collection.js";

//#region Nominal brand types

/**
 * The phantom key that carries a value's brand set. Declared as a
 * `unique symbol` and never assigned at runtime, so the whole tag is erased
 * during compilation.
 */
declare const BRAND: unique symbol;

/**
 * The phantom tag carrier. Brands compose: intersecting `Tag<"A">` with
 * `Tag<"B">` yields a carrier for both tags rather than collapsing to `never`,
 * so {@link Brand}<{@link Brand}<T, "A">, "B"> is a value that is *both* an `A`
 * and a `B`.
 *
 * @typeParam B - The brand name(s) held by this carrier.
 */
export interface Tag<B extends PropertyKey> {
	readonly [BRAND]: { readonly [K in B]: true };
}

/**
 * A nominal type: the base type `T` intersected with a compile-time-only brand
 * `B`. Assignable *to* `T` (a branded value is still a `T`), but a plain `T` is
 * **not** assignable *to* `Brand<T, B>` — construction must go through a
 * validated boundary ({@link brandRefiner}) or an explicit {@link unsafeBrand}.
 *
 * @typeParam T - The underlying (carrier) type, e.g. `string` or `number`.
 * @typeParam B - The brand name, a string/symbol literal, e.g. `"Ciphertext"`.
 *
 * @example
 * ```ts
 * type UserId = Brand<string, "UserId">;
 * type OrderId = Brand<string, "OrderId">;
 *
 * declare const u: UserId;
 * const s: string = u; // ✓ UserId is a string
 * const o: OrderId = u; // ✗ a UserId is not an OrderId
 * ```
 */
export type Brand<T, B extends PropertyKey> = T & Tag<B>;

/**
 * Alias of {@link Brand} for teams that prefer the "opaque type" vocabulary.
 * Identical semantics.
 */
export type Opaque<T, B extends PropertyKey> = Brand<T, B>;

//#endregion

//#region Brand introspection

/**
 * The union of brand keys carried by `T`, or `never` when `T` is unbranded.
 *
 * **When to use**
 *
 * Use it when a type must *name* the brands it is looking at rather than assume
 * them — writing a `*.test-d.ts` assertion that a smart constructor really
 * applied the brand you meant, or deriving a lookup keyed by brand name. It is
 * also the substrate for {@link Unbrand} and {@link HasBrand}.
 *
 * **Details**
 *
 * {@link Tag} intersects rather than collapses, and inference distributes across
 * the intersected carriers, so a doubly branded type yields a *union* of keys:
 * `BrandsOf<Brand<Brand<string, "A">, "B">>` is `"A" | "B"`. An unbranded type
 * has no {@link Tag} to match, so the conditional falls through to `never` —
 * which is also how `[BrandsOf<T>] extends [never]` becomes a usable
 * "is this branded at all?" probe.
 *
 * **Example** (Reading the brand set off a nominal type)
 *
 * ```ts doctest
 * import type { Brand, BrandsOf } from "@resq-systems/types/brand";
 *
 * type Email = Brand<string, "Email">;
 * type Verified = Brand<Email, "Verified">;
 *
 * const single: BrandsOf<Email> = "Email"; // => "Email"
 * const nested: BrandsOf<Verified>[] = ["Email", "Verified"]; // => ["Email", "Verified"]
 *
 * // An unbranded type has no tag to match, so `BrandsOf<string>` is `never`
 * // and the only inhabitant of `never[]` is the empty array.
 * const unbranded: BrandsOf<string>[] = [];
 * const count = unbranded.length; // => 0
 * ```
 *
 * @typeParam T - The type to inspect. It need not be branded.
 *
 * @see {@link Unbrand}
 * @see {@link HasBrand}
 * @see {@link Tag}
 * @category utility types
 * @since 0.2.0
 */
export type BrandsOf<T> = T extends Tag<infer B> ? B : never;

/**
 * Rebuild the exact intersected {@link Tag} carrier for `T`'s brand set, so it
 * can be subtracted back out again.
 *
 * @internal
 */
type TagsOf<T> = UnionToIntersection<{ [K in BrandsOf<T>]: Tag<K> }[BrandsOf<T>]>;

/**
 * Strip the *intersected* tag spelling — `Brand<Brand<T, "A">, "B">`.
 *
 * @internal
 */
type StripIntersection<T> = T extends infer U & TagsOf<T> ? U : T;

/**
 * Strip the *union-key* tag spelling — `Brand<T, "A" | "B">`.
 *
 * @internal
 */
type StripUnionForm<T> = T extends infer U & Tag<BrandsOf<T>> ? U : T;

/**
 * The carrier underneath a brand: `Unbrand<Brand<string, "Email">>` is `string`.
 * A type with no brand is returned unchanged.
 *
 * **When to use**
 *
 * Use it wherever code today writes `value as string` purely because there was
 * no way to *name* a brand's carrier — a sanitizer that must hand its result to
 * a raw-string sink, a serializer that has to widen before writing JSON, or a
 * generic helper whose return type is "the same thing, minus the proof". Naming
 * the carrier turns an unchecked cast into a derivation that stays correct when
 * the brand's carrier changes.
 *
 * **Details**
 *
 * Brands are spelled two different ways that mean the same thing —
 * `Brand<Brand<T, "A">, "B">` (nested, intersected tags) and
 * `Brand<T, "A" | "B">` (a single tag over a union of keys) — and they are
 * mutually assignable. Each spelling needs a different subtraction, so this type
 * probes with the intersected form first and falls back to the union form when
 * a residual brand survives.
 *
 * **Gotchas**
 *
 * The two-branch fallback is **load-bearing**. `StripIntersection` alone is
 * wrong on the union-key spelling and `StripUnionForm` alone is wrong on the
 * nested spelling, and both failures are silent — you get a still-branded type
 * back instead of a compile error. All six cases are pinned by
 * `Expect<Equal<...>>` in `brand.test-d.ts`; do not "simplify" this without
 * re-running them.
 *
 * **Example** (Widening back to the carrier without a cast)
 *
 * ```ts doctest
 * import { type Brand, brandRefiner, type Unbrand } from "@resq-systems/types/brand";
 *
 * type Email = Brand<string, "Email">;
 * const Email = brandRefiner<string, "Email">((s) => s.includes("@"), "email");
 *
 * // `Unbrand<Email>` is `string`, so no cast is needed at the widening boundary.
 * const raw: Unbrand<Email> = Email.from("a@b.com");
 * const shouted = raw.toUpperCase(); // => "A@B.COM"
 * ```
 *
 * @typeParam T - The branded type to unwrap. It need not be branded.
 *
 * @see {@link BrandsOf}
 * @see {@link Brand}
 * @category utility types
 * @since 0.2.0
 */
export type Unbrand<T> = [BrandsOf<StripIntersection<T>>] extends [never]
	? StripIntersection<T>
	: StripUnionForm<T>;

/**
 * `true` when `T` carries the brand `B`, `false` otherwise.
 *
 * **When to use**
 *
 * Use it as assertion vocabulary in a `*.test-d.ts` file — "this constructor
 * really returns something branded `"Email"`" — or as the condition of a
 * conditional type that must branch on a proof rather than on a shape.
 *
 * **Details**
 *
 * Because {@link Tag} intersects, a value branded `"A"` *and* `"B"` satisfies
 * `HasBrand<…, "A">` and `HasBrand<…, "B">` independently. `T` is wrapped in a
 * tuple so the check does not distribute over a union `T`: a union answers
 * `true` only when **every** member carries `B`.
 *
 * **Example** (Asserting a brand survived a composition)
 *
 * ```ts doctest
 * import type { Brand, HasBrand } from "@resq-systems/types/brand";
 *
 * type Email = Brand<string, "Email">;
 * type Verified = Brand<Email, "Verified">;
 *
 * const keptEmail: HasBrand<Verified, "Email"> = true; // => true
 * const alsoVerified: HasBrand<Verified, "Verified"> = true; // => true
 * const notAUserId: HasBrand<Email, "UserId"> = false; // => false
 * ```
 *
 * @typeParam T - The type to inspect.
 * @typeParam B - The brand key to look for.
 *
 * @see {@link BrandsOf}
 * @see {@link Unbrand}
 * @category utility types
 * @since 0.2.0
 */
export type HasBrand<T, B extends PropertyKey> = [T] extends [Tag<B>] ? true : false;

//#endregion

//#region Smart constructors

/**
 * Assert-cast an already-validated base value into a brand **without a runtime
 * check**. This is the deliberate escape hatch: use it only at a boundary where
 * validation has already happened by other means (an Effect schema decode, a
 * regex you just tested, a value returned by a trusted crypto primitive).
 *
 * Prefer {@link brandRefiner} when you have the predicate on hand — it ties the
 * cast to an actual runtime check.
 *
 * Both type parameters must be supplied — the carrier `T` is **not** defaulted,
 * because TypeScript cannot infer it while `B` is given explicitly, and a
 * default of `unknown` would silently collapse `Brand<unknown, B>` to a bare
 * tag (losing the carrier). Prefer a {@link brandRefiner}'s `.unsafe` when you
 * already have a refiner for the brand.
 *
 * @typeParam B - The brand name to apply.
 * @typeParam T - The carrier type of `value`.
 * @param value - The already-validated base value.
 * @returns `value`, retyped as `Brand<T, B>`.
 *
 * @example
 * ```ts
 * const token = unsafeBrand<"SecureToken", string>(crypto.randomUUID());
 * //    ^? Brand<string, "SecureToken">
 * ```
 */
export const unsafeBrand = <B extends PropertyKey, T>(value: T): Brand<T, B> =>
	value as Brand<T, B>;

/**
 * A smart-constructor bundle for a single brand, built from one runtime
 * predicate. Returned by {@link brandRefiner}.
 *
 * @typeParam T - The carrier type.
 * @typeParam B - The brand name.
 */
export interface BrandRefiner<T, B extends PropertyKey> {
	/**
	 * Type guard: narrows `value` to the branded type when the predicate holds.
	 * Use in `if`/`filter` so downstream code sees the brand.
	 */
	readonly is: (value: T) => value is Brand<T, B>;
	/**
	 * Assert the value is valid and return it branded, throwing a `TypeError`
	 * otherwise. Use at trust boundaries where an invalid value is a bug.
	 */
	readonly from: (value: T) => Brand<T, B>;
	/**
	 * Return the branded value if valid, or `null` — the total, throw-free
	 * counterpart of {@link from}. Compose with `?.` / `??`.
	 */
	readonly coerce: (value: T) => Brand<T, B> | null;
	/**
	 * Brand without checking. Identical to {@link unsafeBrand} but pinned to this
	 * refiner's `T` and `B`, so it reads as an intentional, named bypass.
	 */
	readonly unsafe: (value: T) => Brand<T, B>;
}

/**
 * Build a {@link BrandRefiner} — a `{ is, from, coerce, unsafe }` bundle — from
 * a single predicate. This is the ergonomic way to mint a validated nominal
 * type: define the type, define the check once, and get a guard, an asserting
 * constructor, and a total constructor for free.
 *
 * @typeParam T - The carrier type (e.g. `string`, `number`).
 * @typeParam B - The brand name (e.g. `"Email"`).
 * @param predicate - Returns `true` when `value` is a valid `B`.
 * @param label - Optional human name used in the {@link BrandRefiner.from} error
 *   message. Defaults to generic text so it never leaks the (possibly
 *   sensitive) offending value.
 * @returns A refiner bundle for `Brand<T, B>`.
 *
 * @example
 * ```ts
 * export type Email = Brand<string, "Email">;
 * const Email = brandRefiner<string, "Email">(
 *   (s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s),
 *   "email",
 * );
 * export const isEmail = Email.is;   // (s: string) => s is Email
 * export const toEmail = Email.from; // (s: string) => Email  (throws if invalid)
 *
 * if (isEmail(input)) sendMail(input); // input: Email inside the block
 * ```
 */
export const brandRefiner = <T, B extends PropertyKey>(
	predicate: (value: T) => boolean,
	label?: string,
): BrandRefiner<T, B> => {
	const is = (value: T): value is Brand<T, B> => predicate(value);
	return {
		is,
		from: (value: T): Brand<T, B> => {
			if (!predicate(value)) {
				throw new TypeError(`Value failed the ${label ?? "brand"} refinement`);
			}
			return value as Brand<T, B>;
		},
		coerce: (value: T): Brand<T, B> | null => (predicate(value) ? (value as Brand<T, B>) : null),
		unsafe: (value: T): Brand<T, B> => value as Brand<T, B>,
	};
};

//#endregion

//#region Combining refiners

/**
 * Combine two or more {@link BrandRefiner}s over the same carrier into a single
 * refiner that applies **every** brand at once.
 *
 * **When to use**
 *
 * Use it when a value must satisfy several independent constraints that are
 * each worth naming on their own — a slug is `NonEmpty` *and* `Trimmed`, an
 * upload path is `Relative` *and* `Contained` — and you want one constructor at
 * the trust boundary without collapsing the individual brands into a single
 * vague `"Valid"` tag. Each part stays reusable, and the combined value is
 * accepted anywhere any one of the parts is expected.
 *
 * **Details**
 *
 * The result is branded with the union of the input keys, and
 * `Brand<T, "A" | "B">` is mutually assignable with `Brand<Brand<T, "A">, "B">`
 * — so the combined value satisfies a `Brand<T, "A">` parameter and a
 * `Brand<T, "B">` parameter independently.
 *
 * Composition is over the **public** surface: the combined predicate is
 * `first.is(value) && rest.every((r) => r.is(value))`. Nothing about
 * {@link brandRefiner} or the objects it returns changes, so a hand-built
 * `BrandRefiner` object literal composes just as well as a generated one.
 *
 * Checks run left to right and short-circuit on the first failure. There is no
 * accumulation: `.from` reports *that* the value failed, never *which*
 * constraint failed, and — like {@link brandRefiner} — never interpolates the
 * offending value, because these run at trust boundaries on data that may be
 * sensitive. When you need labelled, accumulated failures, reach for a parser
 * rather than a refiner.
 *
 * **Gotchas**
 *
 * The carrier is pinned by the **first** refiner. Passing a later refiner over a
 * different carrier is a compile error on that argument (`BrandRefiner<number,
 * …>` is not assignable to `BrandRefiner<string, …>`), which is the intended
 * failure — there is no meaningful "common base" to fall back to.
 *
 * **Example** (One constructor, two independent proofs)
 *
 * ```ts doctest
 * import { type Brand, brandRefiner, refineAll } from "@resq-systems/types/brand";
 *
 * type NonEmpty = Brand<string, "NonEmpty">;
 * type Trimmed = Brand<string, "Trimmed">;
 *
 * const NonEmpty = brandRefiner<string, "NonEmpty">((s) => s.length > 0, "non-empty");
 * const Trimmed = brandRefiner<string, "Trimmed">((s) => s === s.trim(), "trimmed");
 *
 * const Slug = refineAll(NonEmpty, Trimmed);
 *
 * // The combined value satisfies each brand on its own.
 * const slug: NonEmpty & Trimmed = Slug.from("hello"); // => "hello"
 * const padded = Slug.is(" hello "); // => false
 * const empty = Slug.coerce(""); // => null
 * ```
 *
 * @typeParam T - The shared carrier type, pinned by `first`.
 * @typeParam B - The brand key applied by `first`.
 * @typeParam R - The tuple of brand keys applied by `rest`.
 * @param first - The first refiner; it fixes the carrier for the whole call.
 * @param rest - Any further refiners over the same carrier.
 * @returns A refiner for `Brand<T, B | R[number]>` whose checks all hold.
 *
 * @see {@link brandRefiner}
 * @see {@link BrandRefiner}
 * @see {@link BrandsOf}
 * @category combining
 * @since 0.2.0
 */
export function refineAll<T, B extends PropertyKey, const R extends readonly PropertyKey[]>(
	first: BrandRefiner<T, B>,
	...rest: { readonly [I in keyof R]: BrandRefiner<T, R[I]> }
): BrandRefiner<T, B | R[number]> {
	type Combined = Brand<T, B | R[number]>;
	const tail = rest as readonly { readonly is: (value: T) => boolean }[];
	const holds = (value: T): boolean =>
		first.is(value) && tail.every((refiner) => refiner.is(value));
	return {
		is: (value: T): value is Combined => holds(value),
		from: (value: T): Combined => {
			if (!holds(value)) {
				throw new TypeError("Value failed a combined brand refinement");
			}
			return value as Combined;
		},
		coerce: (value: T): Combined | null => (holds(value) ? (value as Combined) : null),
		unsafe: (value: T): Combined => value as Combined,
	};
}

//#endregion
