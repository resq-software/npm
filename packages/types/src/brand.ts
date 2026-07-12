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
