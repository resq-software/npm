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
 * @fileoverview Leaf runtime type guards over concrete values.
 *
 * @module @resq-systems/types/guards
 *
 * Every export here answers one question about one value: *what is this?* They
 * take `unknown` — the type a `catch` binding, a `JSON.parse` result, a message
 * off a socket, and a `process.env` lookup all actually have — and hand back a
 * narrowed type the compiler will hold you to.
 *
 * Two rules govern this file, and both exist so it stays predictable:
 *
 * 1. **Nothing here takes another guard as input.** Combinators, shape
 *    constructors, and anything higher-order live in `./predicate.js`. This
 *    module is the leaves; that one is the branches. Nor is anything here ever
 *    **dualized** — the first parameter is always the value under test, so a
 *    dualized form handed to `Array.prototype.map` / `filter` (which call back
 *    with *three* arguments) would silently take the data-first branch with the
 *    array index as the key, and it would typecheck, since
 *    `number extends PropertyKey`. `./predicate.js` dualizes only combinators
 *    whose every parameter is itself a predicate, which is exactly the rule that
 *    excludes this module wholesale.
 * 2. **Built-in checks never rely on `instanceof`.** A `Map` from a worker, a
 *    `Date` that came back from `structuredClone`, an `Error` thrown inside a
 *    `vm` context, a `RegExp` from an iframe — every one of them fails
 *    `instanceof` because the realm's intrinsics are different objects. These
 *    guards read the `Object.prototype.toString` tag instead, and where a cheap
 *    internal-slot probe exists (`Map.prototype.size`, `URL.prototype.href`, …)
 *    they confirm with that too, so a `{ [Symbol.toStringTag]: "Map" }` decoy
 *    does **not** slip through.
 *
 * **Example** (Parse boundaries stop lying to you)
 *
 * ```ts doctest
 * import { isFiniteNumber, isJsonObject, isValidDate } from "@resq-systems/types/guards";
 *
 * const latitudeOf = (raw: string): number => {
 * 	const body: unknown = JSON.parse(raw);
 * 	if (!isJsonObject(body)) throw new Error("expected an object");
 * 	if (!isFiniteNumber(body.lat)) throw new Error("lat must be a real number");
 * 	if (!isValidDate(new Date(String(body.at)))) throw new Error("unparseable timestamp");
 * 	return body.lat;
 * };
 *
 * latitudeOf('{"lat":51.5,"at":"2026-01-01T00:00:00.000Z"}'); // => 51.5
 * ```
 */

import type { Brand } from "./brand.js";
import type { ReadonlyNonEmptyArray } from "./collection.js";
import type { JsonArray, JsonObject, JsonPrimitive, JsonValue } from "./json.js";
import type { TypeGuard } from "./predicate.js";

//#region Internal

/**
 * The species tag reader. `Object.prototype.toString` consults an object's
 * internal slots (falling back to `Symbol.toStringTag` when present), which is
 * exactly what makes it survive the realm boundaries where `instanceof` does
 * not.
 */
const objectToString: () => string = Object.prototype.toString;

/** Read a value's `[object Xxx]` species tag. Never throws. */
const tagOf = (value: unknown): string => objectToString.call(value);

/**
 * Pull an accessor off a prototype so it can be used as an internal-slot probe.
 * Applying `Map.prototype`'s `size` getter to a non-`Map` throws a `TypeError`
 * no matter which realm the `Map` came from, which is precisely the signal we
 * want: the slot is there or it is not, and `Symbol.toStringTag` cannot fake it.
 */
const slotProbe = (owner: object, key: string): (() => unknown) | undefined =>
	Object.getOwnPropertyDescriptor(owner, key)?.get;

/**
 * Apply a slot probe and report whether the value owns the internal slot. A
 * missing probe (an exotic runtime that does not expose the accessor) degrades
 * to `true`, so the caller falls back to the species tag alone rather than
 * rejecting every legitimate value.
 */
const hasSlot = (probe: (() => unknown) | undefined, value: unknown): boolean => {
	if (probe === undefined) {
		return true;
	}
	try {
		probe.call(value);
		return true;
	} catch {
		return false;
	}
};

// Each probe is `@__PURE__`-annotated so a bundler may drop the ones a consumer's
// imports cannot reach. Without the annotation these `Object.getOwnPropertyDescriptor`
// calls are opaque side effects, and importing `isString` alone retains all six —
// both in the bundle and as import-time work in every consuming runtime.
const MAP_SIZE = /* @__PURE__ */ slotProbe(Map.prototype, "size");
const SET_SIZE = /* @__PURE__ */ slotProbe(Set.prototype, "size");
const REGEXP_SOURCE = /* @__PURE__ */ slotProbe(RegExp.prototype, "source");
const ARRAY_BUFFER_BYTE_LENGTH = /* @__PURE__ */ slotProbe(ArrayBuffer.prototype, "byteLength");
const TYPED_ARRAY_BYTE_LENGTH = /* @__PURE__ */ slotProbe(
	/* @__PURE__ */ Object.getPrototypeOf(Uint8Array.prototype) as object,
	"byteLength",
);
const DATE_GETTIME: () => number = Date.prototype.getTime;
const URL_HREF =
	typeof URL === "function" ? /* @__PURE__ */ slotProbe(URL.prototype, "href") : undefined;

/**
 * A decimal numeric literal: optionally signed, optionally fractional,
 * optionally exponential. Deliberately rejects `""`, whitespace, `"0x10"`,
 * `"Infinity"`, `"NaN"`, and `"1,000"` — every one of which either coerces to a
 * number anyway (`Number("0x10") === 16`) or coerces to `0`, and none of which a
 * caller asking for a decimal string wants accepted.
 *
 * The fractional part is a **single optional group** — `\d+(?:\.\d*)?` — and not
 * the more obvious `\d+\.?\d*`. The latter is ambiguous: when `\.?` matches empty,
 * the boundary between `\d+` and `\d*` has O(n) candidate positions and each
 * retry rescans O(n) digits, so a rejecting input of n digits costs O(n²). Since
 * {@link isNumericString} exists to be pointed at `process.env`, query strings,
 * and request bodies, that is a polynomial ReDoS on attacker-controlled input:
 * measured at ~5.7 s for a 100 KB string before this rewrite, ~0.15 ms after,
 * with an identical accept/reject set.
 */
const DECIMAL_STRING = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

//#endregion

//#region Primitives

/**
 * Narrow `unknown` to `string`.
 *
 * **When to use**
 *
 * Use at any boundary where a value that *ought* to be text has the static type
 * `unknown` — a header lookup, a `process.env` read, a parsed request body — and
 * you want the compiler to hold you to the answer afterwards.
 *
 * **Details**
 *
 * The `typeof` check and nothing more: a boxed `new String("x")` is an object,
 * not a `string`, and is correctly rejected.
 *
 * **Example** (Guarding a header lookup)
 *
 * ```ts doctest
 * import { isString } from "@resq-systems/types/guards";
 *
 * const headers: Record<string, unknown> = { "x-request-id": "abc" };
 * const header: unknown = headers["x-request-id"];
 * const id = isString(header) ? header.toUpperCase() : "unknown";
 *
 * id; // => "ABC"
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a primitive string.
 * @see {@link isNonEmptyString}
 * @category guards
 * @since 0.2.0
 */
export const isString = (value: unknown): value is string => typeof value === "string";

/**
 * Narrow `unknown` to `number`.
 *
 * **When to use**
 *
 * Use when you genuinely mean "the `typeof` answer is `number`" — reflection, a
 * serializer's type switch, a debug formatter. For anything arithmetic, reach for
 * {@link isFiniteNumber} instead.
 *
 * **Details**
 *
 * This returns `true` for `NaN`. That is the `typeof` operator's answer and it is
 * the behavior `@resq-systems/helpers` has always shipped, so it stays — changing
 * it would silently break every existing caller. `NaN` is a `number` the way
 * `null` is an `object`: technically correct, rarely what you meant.
 *
 * **Gotchas**
 *
 * `isNumber(Number.NaN)` is `true`. If you are about to do arithmetic, compare,
 * index, or serialize, you want {@link isFiniteNumber} — it rejects `NaN` and
 * `±Infinity`. A `NaN` that survives a guard does not throw; it propagates.
 *
 * **Example** (The `NaN` answer, in full)
 *
 * ```ts doctest
 * import { isNumber } from "@resq-systems/types/guards";
 *
 * isNumber(42); // => true
 * isNumber(Number.NaN); // => true
 * isNumber("42"); // => false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a primitive number, **including `NaN`**.
 * @see {@link isFiniteNumber}
 * @category guards
 * @since 0.2.0
 */
export const isNumber = (value: unknown): value is number => typeof value === "number";

/**
 * Narrow `unknown` to a `number` that is neither `NaN` nor `±Infinity`.
 *
 * **When to use**
 *
 * Use before arithmetic, comparison, indexing, or serialization — which is to say,
 * almost everywhere someone reaches for {@link isNumber}.
 *
 * **Details**
 *
 * A `NaN` that survives a guard does not throw — it propagates, turning every
 * downstream sum, average, and comparison into `NaN` or `false` until something
 * far away renders "NaN" to a user. Reject it at the boundary.
 *
 * **Example** (Rejecting the two non-numbers that are `number`s)
 *
 * ```ts doctest
 * import { isFiniteNumber } from "@resq-systems/types/guards";
 *
 * isFiniteNumber(0); // => true
 * isFiniteNumber(Number.NaN); // => false
 * isFiniteNumber(Number.POSITIVE_INFINITY); // => false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a finite primitive number.
 * @see {@link isNumber}
 * @see {@link isInRange}
 * @category guards
 * @since 0.2.0
 */
export const isFiniteNumber = (value: unknown): value is number => Number.isFinite(value);

/**
 * Narrow `unknown` to an integral `number`.
 *
 * **When to use**
 *
 * Use before a modulo, a bit operation, or an array index — the places where
 * `2.5` produces garbage rather than an error.
 *
 * **Details**
 *
 * Unsigned and unbounded — the case `./numeric.js` leaves unclaimed, since it
 * owns `isPositiveInt` and `isNonNegativeInt`.
 *
 * **Example** (Integrality, not sign or magnitude)
 *
 * ```ts doctest
 * import { isInteger } from "@resq-systems/types/guards";
 *
 * isInteger(-7); // => true
 * isInteger(2.5); // => false
 * isInteger(2.0); // => true
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a finite whole number.
 * @see {@link isSafeInteger}
 * @category guards
 * @since 0.2.0
 */
export const isInteger = (value: unknown): value is number => Number.isInteger(value);

/**
 * Narrow `unknown` to a safe integer — a whole number that survives the
 * IEEE-754 double round-trip exactly.
 *
 * **When to use**
 *
 * Use at the JSON boundary, on anything that is an identifier: database IDs,
 * snowflakes, sequence numbers, cursor offsets.
 *
 * **Details**
 *
 * A 64-bit database ID serialized as a JSON number and parsed back has *already*
 * lost precision by the time you see it: `9007199254740993` parses as
 * `9007199254740992`, and no later validation can recover the difference.
 * Catching it here is the difference between a loud rejection and two rows
 * quietly sharing an ID.
 *
 * **Example** (Where the doubles run out)
 *
 * ```ts doctest
 * import { isSafeInteger } from "@resq-systems/types/guards";
 *
 * isSafeInteger(2 ** 53 - 1); // => true
 * isSafeInteger(2 ** 53); // => false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is an integer within ±(2^53 − 1).
 * @see {@link isInteger}
 * @see {@link isBigInt}
 * @category guards
 * @since 0.2.0
 */
export const isSafeInteger = (value: unknown): value is number => Number.isSafeInteger(value);

/**
 * Build a guard for numbers inside the **inclusive** range `[min, max]`.
 *
 * **When to use**
 *
 * Use when the bounds are fixed by the domain and the check gets reused — a
 * percentage, a latitude, an HTTP status class — so the guard can be stored once
 * and handed to `Array.prototype.filter`, `predicate.ts#anyOf`, or a struct field
 * check.
 *
 * **Details**
 *
 * Curried rather than `(value, min, max)` on purpose: storing it
 * (`const isPercent = isInRange(0, 100)`) reads better and composes.
 *
 * `NaN` fails both comparisons and is therefore rejected; `±Infinity` is
 * accepted only when the corresponding bound admits it.
 *
 * **Example** (A reusable percentage check)
 *
 * ```ts doctest
 * import { isInRange } from "@resq-systems/types/guards";
 *
 * const isPercent = isInRange(0, 100);
 *
 * isPercent(0); // => true
 * isPercent(100); // => true
 * isPercent(101); // => false
 * isPercent(Number.NaN); // => false
 * ```
 *
 * @param min - Inclusive lower bound.
 * @param max - Inclusive upper bound.
 * @returns A guard narrowing `unknown` to `number`.
 * @see {@link isFiniteNumber}
 * @see {@link isOneOf}
 * @category constructors
 * @since 0.2.0
 */
export const isInRange = (min: number, max: number): TypeGuard<number> => {
	return (value: unknown): value is number =>
		typeof value === "number" && value >= min && value <= max;
};

/**
 * Narrow `unknown` to `boolean`.
 *
 * **When to use**
 *
 * Use as a field guard inside `predicate.ts#structOf`, as a JSON leaf check, and
 * anywhere a flag arrives from outside the type system.
 *
 * **Details**
 *
 * Strictly the `typeof` answer: falsy is not boolean, and neither is `"true"`.
 *
 * **Example** (Falsy is not boolean)
 *
 * ```ts doctest
 * import { isBoolean } from "@resq-systems/types/guards";
 *
 * isBoolean(false); // => true
 * isBoolean(0); // => false
 * isBoolean("true"); // => false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is `true` or `false`.
 * @see {@link isPrimitive}
 * @category guards
 * @since 0.2.0
 */
export const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";

/**
 * Narrow `unknown` to `bigint`.
 *
 * **When to use**
 *
 * Use when a value may carry an integer wider than a double — a 64-bit ID, a
 * nanosecond timestamp, a token amount — and you are about to branch on that.
 *
 * **Details**
 *
 * `bigint` is **not** a {@link JsonPrimitive}: `JSON.stringify` does not
 * serialize it, it throws a `TypeError`. If a value reaches a serialization
 * boundary and this guard says `true`, convert it to a string first.
 *
 * **Example** (Distinguishing a bigint from a number)
 *
 * ```ts doctest
 * import { isBigInt } from "@resq-systems/types/guards";
 *
 * isBigInt(1n); // => true
 * isBigInt(1); // => false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a bigint.
 * @see {@link isSafeInteger}
 * @see {@link isJsonPrimitive}
 * @category guards
 * @since 0.2.0
 */
export const isBigInt = (value: unknown): value is bigint => typeof value === "bigint";

/**
 * Narrow `unknown` to `symbol`.
 *
 * **When to use**
 *
 * Use when enumerating keys with `Reflect.ownKeys`, or when a serializer must
 * refuse a symbol rather than silently drop it.
 *
 * **Details**
 *
 * Completes `typeof` coverage and supplies the third arm {@link isPropertyKey}
 * needs. Registered symbols (`Symbol.for`) and well-known symbols both pass.
 *
 * **Example** (Well-known symbols pass, their names do not)
 *
 * ```ts doctest
 * import { isSymbol } from "@resq-systems/types/guards";
 *
 * isSymbol(Symbol.iterator); // => true
 * isSymbol("iterator"); // => false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a symbol.
 * @see {@link isPropertyKey}
 * @category guards
 * @since 0.2.0
 */
export const isSymbol = (value: unknown): value is symbol => typeof value === "symbol";

/**
 * Narrow `unknown` to `undefined`.
 *
 * **When to use**
 *
 * Use to distinguish "absent" from "explicitly null" in an API where the two mean
 * different things, and as the building block `predicate.ts#optionalOf` is
 * documented against.
 *
 * **Example** (The two absences are not the same)
 *
 * ```ts doctest
 * import { isUndefined } from "@resq-systems/types/guards";
 *
 * isUndefined(undefined); // => true
 * isUndefined(null); // => false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is `undefined`.
 * @see {@link isNull}
 * @see {@link isNullish}
 * @category guards
 * @since 0.2.0
 */
export const isUndefined = (value: unknown): value is undefined => value === undefined;

/**
 * Narrow `unknown` to `null`.
 *
 * **When to use**
 *
 * Use when `null` is a meaningful sentinel distinct from `undefined` — a cleared
 * field, a SQL `NULL`, a JSON leaf.
 *
 * **Details**
 *
 * Implemented as `value === null`, never as a `typeof` check — `typeof null` is
 * `"object"`, the oldest trap in the language, and a `typeof`-based
 * implementation of this guard would be flatly wrong.
 *
 * **Example** (Null is not undefined)
 *
 * ```ts doctest
 * import { isNull } from "@resq-systems/types/guards";
 *
 * isNull(null); // => true
 * isNull(undefined); // => false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is exactly `null`.
 * @see {@link isUndefined}
 * @see {@link isNullish}
 * @category guards
 * @since 0.2.0
 */
export const isNull = (value: unknown): value is null => value === null;

/**
 * Narrow `unknown` to `string | number | symbol` — anything usable as an object
 * key.
 *
 * **When to use**
 *
 * Use as the precondition for indexing with a value you did not author: a key
 * read from config, a discriminant name off the wire, a dynamic lookup.
 *
 * **Details**
 *
 * The runtime companion to `union.ts#hasTag`. Note that property *access* coerces
 * numbers to strings, so `obj[1]` and `obj["1"]` hit the same slot; this guard
 * reports what the value is, not what it will become.
 *
 * **Example** (From an unknown key to a safe read)
 *
 * ```ts doctest
 * import { hasKey, isPropertyKey } from "@resq-systems/types/guards";
 *
 * const payload: unknown = { id: "abc" };
 * const key: unknown = "id";
 * const found = isPropertyKey(key) && hasKey(payload, key) ? payload[key] : undefined;
 *
 * found; // => "abc"
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a string, number, or symbol.
 * @see {@link hasKey}
 * @see {@link isKeyOf}
 * @category guards
 * @since 0.2.0
 */
export const isPropertyKey = (value: unknown): value is PropertyKey =>
	typeof value === "string" || typeof value === "number" || typeof value === "symbol";

/**
 * Narrow `unknown` to any primitive — the base case of every deep walk.
 *
 * **When to use**
 *
 * Use as the "stop here" test of a recursive traversal: the runtime companion to
 * `DeepPartial`, `DeepReadonly`, and `DeepMutable`.
 *
 * **Details**
 *
 * Exactly the complement of {@link isObjectLike}: every value satisfies precisely
 * one of the two. Functions are therefore **not** primitives.
 *
 * **Example** (Collecting the leaves of an object graph)
 *
 * ```ts doctest
 * import { isPrimitive } from "@resq-systems/types/guards";
 *
 * const leaves: unknown[] = [];
 * const walk = (node: unknown): void => {
 * 	if (isPrimitive(node)) {
 * 		leaves.push(node);
 * 		return;
 * 	}
 * 	for (const child of Object.values(node as Record<string, unknown>)) walk(child);
 * };
 *
 * walk({ a: 1, b: { c: "x" } });
 *
 * leaves; // => [1, "x"]
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is neither an object nor a function.
 * @see {@link isObjectLike}
 * @category guards
 * @since 0.2.0
 */
export const isPrimitive = (
	value: unknown,
): value is string | number | bigint | boolean | symbol | null | undefined =>
	value === null || (typeof value !== "object" && typeof value !== "function");

//#endregion

//#region Nullish

/**
 * Narrow a value of any type to its `null | undefined` part.
 *
 * **When to use**
 *
 * Use as an early return at the top of a function — `if (isNullish(x)) return …` —
 * when you want the rest of the body to keep everything it knew about `x`.
 *
 * **Details**
 *
 * Generic on purpose. A non-generic `value is null | undefined` would narrow the
 * *true* branch correctly and throw away everything you knew in the `else`
 * branch; keeping `A` means the negative branch stays
 * `Exclude<A, null | undefined>` rather than collapsing to `unknown`.
 *
 * **Example** (The else branch keeps the useful half)
 *
 * ```ts doctest
 * import { isNullish } from "@resq-systems/types/guards";
 *
 * const trimmed = (maybe: string | null): string => (isNullish(maybe) ? "" : maybe.trim());
 *
 * trimmed("  hi  "); // => "hi"
 * trimmed(null); // => ""
 * ```
 *
 * @typeParam A - The input type, preserved through the narrowing.
 * @param value - The value to test.
 * @returns `true` when `value` is `null` or `undefined`.
 * @see {@link isNonNullish}
 * @category guards
 * @since 0.2.0
 */
export const isNullish = <A>(value: A): value is A & (null | undefined) =>
	value === null || value === undefined;

/**
 * Narrow away `undefined`, **keeping `null`**.
 *
 * **When to use**
 *
 * Use when `undefined` means "not supplied" and `null` is a legitimate value you
 * must not drop — a sparse patch, a partially applied config.
 *
 * **Details**
 *
 * Migrated verbatim from `@resq-systems/helpers`, signature included. It is
 * `Exclude<T, undefined>` and not `NonNullable<T>` because the two differ: this
 * guard passes `null` through, which is the whole reason it exists alongside
 * {@link isNonNullish}.
 *
 * **Example** (Filtering out only the undefined)
 *
 * ```ts doctest
 * import { isDefined } from "@resq-systems/types/guards";
 *
 * const xs: (number | undefined | null)[] = [1, undefined, null];
 *
 * xs.filter(isDefined); // => [1, null]
 * ```
 *
 * @typeParam T - The input type.
 * @param value - The value to test.
 * @returns `true` when `value` is not `undefined`.
 * @see {@link isNonNull}
 * @see {@link isNonNullish}
 * @category guards
 * @since 0.2.0
 */
export const isDefined = <T>(value: T): value is Exclude<T, undefined> => value !== undefined;

/**
 * Narrow away `null`, **keeping `undefined`**.
 *
 * **When to use**
 *
 * Use when `null` is your "absent" sentinel and `undefined` is a legitimate value
 * — the mirror image of {@link isDefined}.
 *
 * **Details**
 *
 * Migrated verbatim from `@resq-systems/helpers`.
 *
 * **Example** (Filtering out only the nulls)
 *
 * ```ts doctest
 * import { isNonNull } from "@resq-systems/types/guards";
 *
 * const xs: (string | null | undefined)[] = ["a", null, undefined];
 *
 * xs.filter(isNonNull); // => ["a", undefined]
 * ```
 *
 * @typeParam T - The input type.
 * @param value - The value to test.
 * @returns `true` when `value` is not `null`.
 * @see {@link isDefined}
 * @see {@link isNonNullish}
 * @category guards
 * @since 0.2.0
 */
export const isNonNull = <T>(value: T): value is Exclude<T, null> => value !== null;

/**
 * Narrow away both `null` and `undefined` — the highest-traffic guard in any
 * codebase, mostly via `.filter(isNonNullish)`.
 *
 * **When to use**
 *
 * Use whenever "present" is the only distinction that matters and you do not care
 * which flavour of absence you are dropping.
 *
 * **Details**
 *
 * Migrated verbatim from `@resq-systems/helpers`. The predicate is deliberately
 * `Exclude<T, null | undefined>` and **not** `NonNullable<T>`: for `T = unknown`
 * those are different types (`NonNullable<unknown>` is `{}`, `Exclude<unknown, …>`
 * is `unknown`), so swapping them would silently break every caller who guards an
 * `unknown`.
 *
 * **Example** (Compacting a projection)
 *
 * ```ts doctest
 * import { isNonNullish } from "@resq-systems/types/guards";
 *
 * const rows: { id: string | null }[] = [{ id: "a" }, { id: null }, { id: "b" }];
 *
 * rows.map((row) => row.id).filter(isNonNullish); // => ["a", "b"]
 * ```
 *
 * @typeParam T - The input type.
 * @param value - The value to test.
 * @returns `true` when `value` is neither `null` nor `undefined`.
 * @see {@link isNullish}
 * @see {@link isDefined}
 * @see {@link isNonNull}
 * @category guards
 * @since 0.2.0
 */
export const isNonNullish = <T>(value: T): value is Exclude<T, null | undefined> =>
	value !== null && value !== undefined;

//#endregion

//#region Strings

/**
 * A `string` that has been proven non-empty.
 *
 * **When to use**
 *
 * Use as a parameter type when a function genuinely cannot do its job with `""` —
 * a display name, a cache key, a log channel — so the call site is forced to
 * produce the proof rather than promise it.
 *
 * **Details**
 *
 * Without the brand, {@link isNonEmptyString} would have the predicate
 * `value is string` — proving nothing, narrowing nothing, a lie by omission. The
 * brand makes "this string was checked" into a type a function can *require*,
 * exactly as `./numeric.js` does for `PositiveInt`. Branded strings stay
 * assignable to `string`, so no existing call site is inconvenienced.
 *
 * **Example** (A bare string is not proof)
 *
 * ```ts doctest
 * import { isNonEmptyString, type NonEmptyString } from "@resq-systems/types/guards";
 *
 * const setDisplayName = (name: NonEmptyString): string => `Hello, ${name}`;
 *
 * const input: unknown = "Ada";
 * const greeting = isNonEmptyString(input) ? setDisplayName(input) : "anonymous";
 *
 * greeting; // => "Hello, Ada"
 * ```
 *
 * @see {@link isNonEmptyString}
 * @category utility types
 * @since 0.2.0
 */
export type NonEmptyString = Brand<string, "NonEmptyString">;

/**
 * Narrow `unknown` to a {@link NonEmptyString}.
 *
 * **When to use**
 *
 * Use to mint the proof a {@link NonEmptyString} parameter demands, and at any
 * boundary where an empty string is a rejection rather than a value.
 *
 * **Details**
 *
 * Length-based, not truthiness-based: `"0"` and `"false"` are perfectly good
 * non-empty strings and pass. Whitespace also passes — `" "` has length; use
 * {@link isBlankString} when whitespace should count as empty.
 *
 * **Example** (Length, not truthiness)
 *
 * ```ts doctest
 * import { isNonEmptyString } from "@resq-systems/types/guards";
 *
 * isNonEmptyString("0"); // => true
 * isNonEmptyString(" "); // => true
 * isNonEmptyString(""); // => false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a string of length ≥ 1.
 * @see {@link NonEmptyString}
 * @see {@link isBlankString}
 * @category guards
 * @since 0.2.0
 */
export const isNonEmptyString = (value: unknown): value is NonEmptyString =>
	typeof value === "string" && value.length > 0;

/**
 * Test whether a value is a string that is empty or contains only whitespace.
 *
 * **When to use**
 *
 * Use when whitespace should count as absent: a form field, a CSV cell, a
 * pasted identifier.
 *
 * **Details**
 *
 * Unbranded on purpose. "Blank" is a *rejection reason*, not a contract anyone
 * downstream requires — no function ever asks for a blank string, it only ever
 * refuses one — so there is nothing worth carrying in the type beyond `string`.
 *
 * **Example** (Whitespace counts as blank)
 *
 * ```ts doctest
 * import { isBlankString } from "@resq-systems/types/guards";
 *
 * isBlankString(""); // => true
 * isBlankString("\n\t  "); // => true
 * isBlankString("x"); // => false
 * isBlankString(null); // => false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a string whose trimmed length is zero.
 * @see {@link isNonEmptyString}
 * @category guards
 * @since 0.2.0
 */
export const isBlankString = (value: unknown): value is string =>
	typeof value === "string" && value.trim().length === 0;

/**
 * Narrow `unknown` to the template-literal type `` `${number}` `` — a string
 * that really does spell a decimal number.
 *
 * **When to use**
 *
 * Use on strings that arrive from `process.env`, a query string, a path segment,
 * or a form body, before handing them to `Number` or to `string.ts#ParseInt`.
 *
 * **Details**
 *
 * The narrowed type is what makes `string.ts#ParseInt` sound: given a plain
 * `string` it can only answer `number`, but given `` `${number}` `` it resolves
 * the literal. The implementation is a strict decimal pattern rather than
 * `!Number.isNaN(Number(value))`, because that test accepts `""` (which coerces
 * to `0`), all-whitespace, `"0x10"`, and `"Infinity"` — none of which a caller
 * expecting a numeric string is prepared for.
 *
 * **Example** (Strictly decimal)
 *
 * ```ts doctest
 * import { isNumericString } from "@resq-systems/types/guards";
 *
 * isNumericString("42"); // => true
 * isNumericString("-1.5e3"); // => true
 * isNumericString(""); // => false
 * isNumericString("0x10"); // => false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a string matching a signed decimal literal.
 * @see {@link isFiniteNumber}
 * @category guards
 * @since 0.2.0
 */
export const isNumericString = (value: unknown): value is `${number}` =>
	typeof value === "string" && DECIMAL_STRING.test(value);

//#endregion

//#region Objects

/**
 * Narrow `unknown` to an indexable record.
 *
 * **When to use**
 *
 * Use as the first step of duck-typing anything that came off the wire, then read
 * the fields you care about with the leaf guards.
 *
 * **Details**
 *
 * Narrows to `Record<PropertyKey, unknown>`, **not** the `object` keyword.
 * `object` forbids all property access, which makes it useless as the first step
 * of duck-typing — the moment you write `typeof x === "object"` you want to read
 * a field, and `object` will not let you. Effect made the same call.
 *
 * `null` is excluded (`typeof null === "object"` notwithstanding). Arrays,
 * `Date`s, and class instances all pass: this asks "can I index it", not "is it a
 * dictionary" — for the latter see {@link isPlainObject}. Functions do **not**
 * pass; see {@link isObjectLike}.
 *
 * **Example** (Duck-typing a response body)
 *
 * ```ts doctest
 * import { isObject, isString } from "@resq-systems/types/guards";
 *
 * const body: unknown = JSON.parse('{"token":"abc"}');
 * const token = isObject(body) && isString(body.token) ? body.token : null;
 *
 * token; // => "abc"
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a non-null object.
 * @see {@link isObjectLike}
 * @see {@link isPlainObject}
 * @category guards
 * @since 0.2.0
 */
export const isObject = (value: unknown): value is Record<PropertyKey, unknown> =>
	typeof value === "object" && value !== null;

/**
 * Narrow `unknown` to the `object` keyword — anything that is not a primitive.
 *
 * **When to use**
 *
 * Use for the handful of APIs whose parameter really is typed `object`:
 * {@link hasOwn}, {@link hasOwnProperty}, `Object.hasOwn`, `Reflect.ownKeys`,
 * `WeakMap` keys.
 *
 * **Details**
 *
 * Unlike {@link isObject} this **includes functions**, because a function is an
 * object in both JavaScript and TypeScript. Exactly the complement of
 * {@link isPrimitive}.
 *
 * **Example** (Reaching an own-property check)
 *
 * ```ts doctest
 * import { hasOwn, isObjectLike } from "@resq-systems/types/guards";
 *
 * const target: unknown = { id: 7 };
 * const id = isObjectLike(target) && hasOwn(target, "id") ? target.id : undefined;
 *
 * id; // => 7
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a non-null object or a function.
 * @see {@link isObject}
 * @see {@link isPrimitive}
 * @category guards
 * @since 0.2.0
 */
export const isObjectLike = (value: unknown): value is object =>
	value !== null && (typeof value === "object" || typeof value === "function");

/**
 * Narrow `unknown` to a plain dictionary — an object literal, a `JSON.parse`
 * result, or an `Object.create(null)` bag.
 *
 * **When to use**
 *
 * Use when "is this a bag of data" is the real question — a config merge, a deep
 * clone, a JSON walk — and a `Date`, a `Map`, or a class instance must take a
 * different path.
 *
 * **Details**
 *
 * Rejects arrays, `Date`, `Map`, `Promise`, class instances, and anything
 * carrying a custom `Symbol.toStringTag`. The prototype test walks one level so
 * it stays correct across realms (an iframe's `Object.prototype` is a *different*
 * object than ours, but it is still the object whose own prototype is `null`),
 * and null-prototype dictionaries — the safe kind, immune to prototype
 * pollution — pass.
 *
 * **Example** (Dictionaries only)
 *
 * ```ts doctest
 * import { isPlainObject } from "@resq-systems/types/guards";
 *
 * isPlainObject({ a: 1 }); // => true
 * isPlainObject(Object.create(null)); // => true
 * isPlainObject([]); // => false
 * isPlainObject(new Date()); // => false
 * isPlainObject(new (class {})()); // => false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a plain object.
 * @see {@link isObject}
 * @see {@link isJsonObject}
 * @category guards
 * @since 0.2.0
 */
export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
	if (tagOf(value) !== "[object Object]") {
		return false;
	}
	const proto: unknown = Object.getPrototypeOf(value);
	return proto === null || Object.getPrototypeOf(proto) === null;
};

//#endregion

//#region Arrays and iterables

/**
 * Narrow `unknown` to `readonly unknown[]`.
 *
 * **When to use**
 *
 * Use in place of `Array.isArray` everywhere, and especially when the value being
 * tested is already typed `readonly T[]`.
 *
 * **Details**
 *
 * This wrapper exists for one concrete reason: TypeScript issue #17002. The
 * built-in `Array.isArray` is declared `arg is any[]`, so guarding a
 * `readonly T[]` with it *widens* the value to `any[]` — silently discarding both
 * the `readonly` modifier and the element type, inside the very branch you wrote
 * to make things safer. Declaring the predicate as `readonly unknown[]` fixes
 * both halves.
 *
 * **Example** (Iterating a parsed payload)
 *
 * ```ts doctest
 * import { isArray } from "@resq-systems/types/guards";
 *
 * const parsed: unknown = JSON.parse("[1,2,3]");
 * const seen: unknown[] = [];
 * if (isArray(parsed)) for (const item of parsed) seen.push(item);
 *
 * seen; // => [1, 2, 3]
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is an array.
 * @see {@link isNonEmptyArray}
 * @see {@link isArrayLike}
 * @category guards
 * @since 0.2.0
 */
export const isArray = (value: unknown): value is readonly unknown[] => Array.isArray(value);

/**
 * Narrow an array to a {@link ReadonlyNonEmptyArray}.
 *
 * **When to use**
 *
 * Use before reading `xs[0]` under `noUncheckedIndexedAccess` — every `xs[0]!` you
 * have ever written is an unchecked assertion this guard replaces with a checked
 * one.
 *
 * **Details**
 *
 * After this guard, `xs[0]` is `T` rather than `T | undefined`.
 *
 * Takes an array rather than `unknown` on purpose: this asks "is it empty", not
 * "is it an array". Compose with {@link isArray} when the input is unknown.
 *
 * **Example** (Index access without an assertion)
 *
 * ```ts doctest
 * import { isNonEmptyArray } from "@resq-systems/types/guards";
 *
 * const first = (xs: readonly string[]): string => {
 * 	if (!isNonEmptyArray(xs)) throw new Error("expected at least one");
 * 	return xs[0];
 * };
 *
 * first(["a", "b"]); // => "a"
 * ```
 *
 * @typeParam T - The element type.
 * @param value - The array to test.
 * @returns `true` when `value` has at least one element.
 * @see {@link isArray}
 * @category guards
 * @since 0.2.0
 */
export const isNonEmptyArray = <T>(value: readonly T[]): value is ReadonlyNonEmptyArray<T> =>
	value.length > 0;

/**
 * Narrow `unknown` to `ArrayLike<unknown>` — indexable, with a sane `length`.
 *
 * **When to use**
 *
 * Use when you want everything `Array.from` accepts but `Array.isArray` rejects:
 * DOM `NodeList` and `HTMLCollection`, the `arguments` object, typed arrays, and
 * strings.
 *
 * **Details**
 *
 * Functions are excluded even though they have a `length`, because theirs counts
 * declared parameters and indexing one yields nothing.
 *
 * **Example** (Indexing anything array-shaped)
 *
 * ```ts doctest
 * import { isArrayLike } from "@resq-systems/types/guards";
 *
 * const collect = (input: unknown): unknown[] => {
 * 	if (!isArrayLike(input)) return [];
 * 	const out: unknown[] = [];
 * 	for (let i = 0; i < input.length; i += 1) out.push(input[i]);
 * 	return out;
 * };
 *
 * collect("abc"); // => ["a", "b", "c"]
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a string, or an object with a valid `length`.
 * @see {@link isArray}
 * @see {@link isIterable}
 * @category guards
 * @since 0.2.0
 */
export const isArrayLike = (value: unknown): value is ArrayLike<unknown> => {
	if (typeof value === "string") {
		return true;
	}
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const length: unknown = (value as { length?: unknown }).length;
	return typeof length === "number" && Number.isSafeInteger(length) && length >= 0;
};

/**
 * Narrow `unknown` to `Iterable<unknown>` — the precondition for `for…of`,
 * spread, and array destructuring.
 *
 * **When to use**
 *
 * Use before spreading or iterating a value you did not construct, to turn a
 * `TypeError: x is not iterable` into a branch you chose.
 *
 * **Details**
 *
 * Checks for a callable `Symbol.iterator`, which is what the language itself
 * checks. Strings pass (they are iterable); plain objects do not.
 *
 * **Example** (Normalizing one-or-many)
 *
 * ```ts doctest
 * import { isIterable } from "@resq-systems/types/guards";
 *
 * const toArray = (input: unknown): unknown[] => (isIterable(input) ? [...input] : [input]);
 *
 * toArray(new Set([1, 2])); // => [1, 2]
 * toArray(7); // => [7]
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` exposes a callable `Symbol.iterator`.
 * @see {@link isAsyncIterable}
 * @see {@link isArrayLike}
 * @category guards
 * @since 0.2.0
 */
export const isIterable = (value: unknown): value is Iterable<unknown> => {
	if (value === null || value === undefined) {
		return false;
	}
	return typeof (value as { [Symbol.iterator]?: unknown })[Symbol.iterator] === "function";
};

/**
 * Narrow `unknown` to `AsyncIterable<unknown>` — the precondition for
 * `for await…of`.
 *
 * **When to use**
 *
 * Use when a value may be a stream rather than a collection, and consuming it the
 * wrong way is a runtime crash rather than a type error.
 *
 * **Details**
 *
 * The streaming counterpart of {@link isIterable}, and the one no mainstream type
 * library ships. This monorepo moves telemetry over streams, where the difference
 * between "a stream" and "a promise of an array" matters.
 *
 * **Example** (Telling a stream from a collection)
 *
 * ```ts doctest
 * import { isAsyncIterable } from "@resq-systems/types/guards";
 *
 * async function* frames(): AsyncGenerator<number> {
 * 	yield 1;
 * }
 *
 * isAsyncIterable(frames()); // => true
 * isAsyncIterable([1, 2]); // => false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` exposes a callable `Symbol.asyncIterator`.
 * @see {@link isIterable}
 * @category guards
 * @since 0.2.0
 */
export const isAsyncIterable = (value: unknown): value is AsyncIterable<unknown> => {
	if (value === null || value === undefined) {
		return false;
	}
	const method: unknown = (value as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator];
	return typeof method === "function";
};

//#endregion

//#region Keyed collections

/**
 * Narrow `unknown` to `Map<unknown, unknown>`, across realms.
 *
 * **When to use**
 *
 * Use on any `Map` that may have crossed a boundary — a worker message, an
 * iframe, a `vm` context, `structuredClone` — where `instanceof Map` is `false`
 * for a perfectly good `Map`.
 *
 * **Details**
 *
 * Each realm has its own `Map` constructor, so `instanceof` is unreliable; the
 * species tag survives all of those. The `size` accessor probe then confirms the
 * object really owns the `[[MapData]]` internal slot, so a
 * `{ [Symbol.toStringTag]: "Map" }` decoy is rejected rather than handed to code
 * that will immediately call `.get`.
 *
 * **Example** (Tag plus internal slot)
 *
 * ```ts doctest
 * import { isMap } from "@resq-systems/types/guards";
 *
 * isMap(new Map([["a", 1]])); // => true
 * isMap({ [Symbol.toStringTag]: "Map" }); // => false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a genuine `Map` from any realm.
 * @see {@link isSet}
 * @see {@link isInstanceOf}
 * @category guards
 * @since 0.2.0
 */
export const isMap = (value: unknown): value is Map<unknown, unknown> =>
	tagOf(value) === "[object Map]" && hasSlot(MAP_SIZE, value);

/**
 * Narrow `unknown` to `Set<unknown>`, across realms.
 *
 * **When to use**
 *
 * Use exactly where you would use {@link isMap}: on a `Set` that may have arrived
 * from another realm.
 *
 * **Details**
 *
 * Same rationale and same cost as {@link isMap}: species tag for realm safety,
 * `size` accessor probe for spoof resistance.
 *
 * `WeakMap` and `WeakSet` deliberately have no guards here — their keys must be
 * objects, so they never survive a structured clone or a `postMessage` in the
 * first place, and {@link isInstanceOf} covers the rare same-realm case.
 *
 * **Example** (An allow-list check that survives a realm hop)
 *
 * ```ts doctest
 * import { isSet } from "@resq-systems/types/guards";
 *
 * const allowed: unknown = new Set(["https://example.com"]);
 *
 * isSet(allowed) && allowed.has("https://example.com"); // => true
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a genuine `Set` from any realm.
 * @see {@link isMap}
 * @see {@link isInstanceOf}
 * @category guards
 * @since 0.2.0
 */
export const isSet = (value: unknown): value is Set<unknown> =>
	tagOf(value) === "[object Set]" && hasSlot(SET_SIZE, value);

//#endregion

//#region Functions and promises

/**
 * Narrow `unknown` to a callable.
 *
 * **When to use**
 *
 * Use before invoking an optional callback, a plugin hook, or anything pulled out
 * of a config object.
 *
 * **Details**
 *
 * Migrated verbatim from `@resq-systems/helpers`, including the parameter list.
 * `(...args: unknown[]) => unknown` is deliberately **not** tightened to
 * `(...args: never[]) => unknown`: with `never[]` parameters, every existing
 * `if (isFunction(x)) x(a, b)` stops compiling. It remains far better than
 * `value is Function`, which is callable with anything and returns `any`.
 *
 * **Example** (Arbitrary arguments still allowed)
 *
 * ```ts doctest
 * import { isFunction } from "@resq-systems/types/guards";
 *
 * const handler: unknown = (a: number, b: number) => a + b;
 * const result = isFunction(handler) ? handler(2, 3) : undefined;
 *
 * result; // => 5
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is callable.
 * @see {@link isConstructor}
 * @category guards
 * @since 0.2.0
 */
export const isFunction = (value: unknown): value is (...args: unknown[]) => unknown =>
	typeof value === "function";

/**
 * Narrow `unknown` to something that can appear after `new`.
 *
 * **When to use**
 *
 * Use in a DI container, a plugin registry, or a decorator, before binding a
 * token to something you intend to `new`.
 *
 * **Details**
 *
 * Implemented with the `Reflect.construct(String, [], value)` probe, which asks
 * the engine whether `value` is a valid `new.target` **without running its
 * body** — no side effects, no allocation of the real instance. Arrow functions,
 * object-literal methods, `async` functions, and generators are all correctly
 * rejected. Classes and ordinary `function` declarations are both accepted,
 * because an ordinary function genuinely *is* constructible; if you need "is it
 * specifically a `class`", sniff `Function.prototype.toString` instead — and be
 * aware that a transpiled class is an ES5 function and will not match.
 *
 * The parameters are `never[]` (unlike {@link isFunction}) because there is no
 * legacy caller to preserve, and forcing an explicit cast before construction is
 * the right friction for a DI container.
 *
 * **Example** (Arrows have no `[[Construct]]`)
 *
 * ```ts doctest
 * import { isConstructor } from "@resq-systems/types/guards";
 *
 * class Service {}
 *
 * isConstructor(Service); // => true
 * isConstructor(() => {}); // => false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` has a `[[Construct]]` slot.
 * @see {@link isFunction}
 * @see {@link isInstanceOf}
 * @category guards
 * @since 0.2.0
 */
export const isConstructor = (value: unknown): value is new (...args: never[]) => unknown => {
	if (typeof value !== "function") {
		return false;
	}
	try {
		Reflect.construct(String, [], value);
		return true;
	} catch {
		return false;
	}
};

/**
 * Narrow `unknown` to `Promise<unknown>` by duck-typing.
 *
 * **When to use**
 *
 * Use when a value may be sync or async and you must decide whether to `await`
 * it. Prefer {@link isThenable} in new code — the type is more honest.
 *
 * **Details**
 *
 * Migrated verbatim from `@resq-systems/helpers`, and **deliberately not**
 * `instanceof Promise`. A promise from another realm, a `Promise` subclass, a
 * Bluebird instance, and a callable thenable all fail `instanceof` and all behave
 * correctly under `await`. The check is "object or function, with a callable
 * `then`" — the same shape the specification's thenable-job uses.
 *
 * **Example** (Thenables count, plain objects do not)
 *
 * ```ts doctest
 * import { isPromise } from "@resq-systems/types/guards";
 *
 * isPromise(Promise.resolve(1)); // => true
 * isPromise({ then: () => {} }); // => true
 * isPromise({}); // => false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a thenable.
 * @see {@link isThenable}
 * @category guards
 * @since 0.2.0
 */
export const isPromise = (value: unknown): value is Promise<unknown> =>
	!!value &&
	(typeof value === "object" || typeof value === "function") &&
	typeof (value as { then?: unknown }).then === "function";

/**
 * Narrow `unknown` to `PromiseLike<unknown>` — the same runtime check as
 * {@link isPromise}, with the type it should have had.
 *
 * **When to use**
 *
 * Use for awaitability tests, which is what nearly every {@link isPromise} call
 * site actually is.
 *
 * **Details**
 *
 * `await` requires a `PromiseLike`, not a `Promise`. This one composes with
 * `compat.ts#Awaitable`, and it does not promise the `.catch` / `.finally` that a
 * bare thenable may not have. It delegates to {@link isPromise} so the two can
 * never drift apart.
 *
 * **Example** (Branching on awaitability)
 *
 * ```ts doctest
 * import { isThenable } from "@resq-systems/types/guards";
 *
 * const kindOf = (x: unknown): unknown => (isThenable(x) ? "awaitable" : x);
 *
 * kindOf(Promise.resolve(1)); // => "awaitable"
 * kindOf(7); // => 7
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a thenable.
 * @see {@link isPromise}
 * @category guards
 * @since 0.2.0
 */
export const isThenable = (value: unknown): value is PromiseLike<unknown> => isPromise(value);

//#endregion

//#region Built-in instances

/**
 * Narrow `unknown` to `Date`, across realms.
 *
 * **When to use**
 *
 * Use when a `Date` may have crossed a boundary — `structuredClone`, a worker, a
 * `vm` context — where `instanceof Date` returns `false` for a real `Date`.
 *
 * **Details**
 *
 * The species tag does not care which realm minted the value, but the tag alone
 * is not enough: `Symbol.toStringTag` can forge it, and defining that symbol is a
 * normal thing for a date-wrapper class to do so `console.log` prints nicely. So
 * the tag is confirmed with a `[[DateValue]]` internal-slot probe —
 * `Date.prototype.getTime.call`, which throws for anything that merely claims the
 * tag — the same probe {@link isValidDate} already used, and the same pattern as
 * {@link isMap}, {@link isSet}, and {@link isRegExp}.
 *
 * This says nothing about whether the date is *usable* — see {@link isValidDate}.
 *
 * **Example** (A `Date` is a `Date` even when it is nonsense)
 *
 * ```ts doctest
 * import { isDate } from "@resq-systems/types/guards";
 *
 * isDate(new Date()); // => true
 * isDate(Date.now()); // => false
 * isDate(new Date("nope")); // => true
 * isDate({ [Symbol.toStringTag]: "Date" }); // => false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a genuine `Date` from any realm.
 * @see {@link isValidDate}
 * @category guards
 * @since 0.2.0
 */
export const isDate = (value: unknown): value is Date => {
	if (tagOf(value) !== "[object Date]") {
		return false;
	}
	try {
		DATE_GETTIME.call(value);
		return true;
	} catch {
		return false;
	}
};

/**
 * Narrow `unknown` to a `Date` whose time value is a real number.
 *
 * **When to use**
 *
 * Use at every parse boundary that produces a `Date` — this is the guard everyone
 * forgets and the only one worth calling there.
 *
 * **Details**
 *
 * `new Date("garbage")` **is** a `Date`. It is a `Date` whose `getTime()` is
 * `NaN`, whose `toISOString()` throws `RangeError`, and which renders as
 * "Invalid Date" in the UI three screens later.
 *
 * The time value is read through `Date.prototype.getTime.call` so an own
 * `getTime` property cannot lie. A tag-spoofing decoy is already rejected by
 * {@link isDate}, which performs the same slot probe.
 *
 * **Example** (`toISOString` cannot throw after this)
 *
 * ```ts doctest
 * import { isValidDate } from "@resq-systems/types/guards";
 *
 * const stamp = (input: string): string => {
 * 	const at = new Date(input);
 * 	if (!isValidDate(at)) throw new Error(`unparseable timestamp: ${input}`);
 * 	return at.toISOString();
 * };
 *
 * stamp("2026-01-01T00:00:00.000Z"); // => "2026-01-01T00:00:00.000Z"
 * isValidDate(new Date("nope")); // => false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a `Date` with a non-`NaN` time value.
 * @see {@link isDate}
 * @category guards
 * @since 0.2.0
 */
export const isValidDate = (value: unknown): value is Date => {
	if (!isDate(value)) {
		return false;
	}
	try {
		return !Number.isNaN(Date.prototype.getTime.call(value));
	} catch {
		return false;
	}
};

/**
 * Narrow `unknown` to `RegExp`, across realms.
 *
 * **When to use**
 *
 * Use before handing a caller-supplied pattern to anything that will read
 * `.source`, `.flags`, or run a complexity analysis over it.
 *
 * **Details**
 *
 * `@resq-systems/security` accepts caller-supplied patterns and ships a
 * regex-safety suite; knowing that the thing you are about to hand a complexity
 * analyzer is genuinely a `RegExp` — and not an object with a `source` string on
 * it — is the first step of that analysis. The `source` accessor probe backs up
 * the species tag, so a cross-realm `RegExp` passes and a look-alike does not.
 *
 * **Example** (Only a real pattern has a real `source`)
 *
 * ```ts doctest
 * import { isRegExp } from "@resq-systems/types/guards";
 *
 * const pattern: unknown = /^a+$/u;
 *
 * isRegExp(pattern) ? pattern.source : ""; // => "^a+$"
 * isRegExp({ source: "^a+$" }); // => false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a genuine `RegExp` from any realm.
 * @see {@link isString}
 * @category guards
 * @since 0.2.0
 */
export const isRegExp = (value: unknown): value is RegExp =>
	tagOf(value) === "[object RegExp]" && hasSlot(REGEXP_SOURCE, value);

/**
 * Narrow `unknown` to `Error`.
 *
 * **When to use**
 *
 * Use in every `catch` block. Under `useUnknownInCatchVariables` — which strict
 * mode turns on — a `catch` binding is `unknown`, making this the
 * highest-traffic guard in every error path in the codebase.
 *
 * **Details**
 *
 * The check is `instanceof` **or** species tag: the former catches subclasses
 * whose author overrode `Symbol.toStringTag` (and a `DOMException`, which tags
 * itself `[object DOMException]`), the latter catches errors from other realms.
 *
 * Unlike every other tag-based guard here, `Error` exposes no accessor to probe
 * for an internal slot, so the tag arm is confirmed with the one thing every real
 * error has and the documented `catch` idiom actually reads: a string `message`.
 * That rejects the bare `{ [Symbol.toStringTag]: "Error" }` decoy, which would
 * otherwise narrow and then log `undefined` in place of the real cause.
 *
 * **Example** (Logging a cause without losing it)
 *
 * ```ts doctest
 * import { isError } from "@resq-systems/types/guards";
 *
 * const describeCause = (cause: unknown): string =>
 * 	isError(cause) ? cause.message : String(cause);
 *
 * describeCause(new TypeError("bad input")); // => "bad input"
 * describeCause("boom"); // => "boom"
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is an `Error`, an `Error` subclass, or a
 *   cross-realm error with a string `message`.
 * @see {@link isInstanceOf}
 * @category guards
 * @since 0.2.0
 */
export const isError = (value: unknown): value is Error =>
	value instanceof Error ||
	(tagOf(value) === "[object Error]" &&
		typeof (value as { readonly message?: unknown }).message === "string");

/**
 * Narrow `unknown` to `URL`, across realms.
 *
 * **When to use**
 *
 * Use before reading `.protocol`, `.hostname`, or `.origin` off a value that came
 * from another module, a worker, or a validation layer.
 *
 * **Details**
 *
 * `@resq-systems/security` validates URLs and receives them across module and
 * realm boundaries, where `instanceof URL` is unreliable. The `href` accessor
 * probe rejects a plain object that merely claims the tag, so `.protocol` and
 * `.hostname` are safe to read inside the branch.
 *
 * **Example** (Enforcing a scheme)
 *
 * ```ts doctest
 * import { isURL } from "@resq-systems/types/guards";
 *
 * const target: unknown = new URL("https://example.com/path");
 *
 * isURL(target) ? target.protocol : ""; // => "https:"
 * isURL({ href: "https://example.com/" }); // => false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a genuine `URL` from any realm.
 * @see {@link isString}
 * @category guards
 * @since 0.2.0
 */
export const isURL = (value: unknown): value is URL =>
	tagOf(value) === "[object URL]" && hasSlot(URL_HREF, value);

//#endregion

//#region Binary

/**
 * Narrow `unknown` to `ArrayBufferView` — any typed array **or** a `DataView`.
 *
 * **When to use**
 *
 * Use when all you need is "a view over some bytes" and the element type is
 * irrelevant — measuring `byteLength`, forwarding a chunk, copying into a buffer.
 *
 * **Details**
 *
 * `ArrayBuffer.isView` is the only correct implementation, and it is cross-realm
 * safe by construction because it consults the internal slot rather than the
 * prototype chain.
 *
 * Named for what it tests. The obvious name — `isTypedArray` — is already taken
 * in this ecosystem by `node:util.types.isTypedArray` and lodash's
 * `isTypedArray`, both of which return `false` for a `DataView`; a guard by that
 * name that returned `true` would silently route `DataView`s down the typed-array
 * path in any code that swapped one for the other, and the compiler could not
 * catch it because `ArrayBufferView` is genuinely what a `DataView` is. See
 * {@link isTypedArray} for the exact check.
 *
 * **Example** (Both halves of the family pass)
 *
 * ```ts doctest
 * import { isArrayBufferView } from "@resq-systems/types/guards";
 *
 * isArrayBufferView(new Uint8Array(1)); // => true
 * isArrayBufferView(new DataView(new ArrayBuffer(8))); // => true
 * isArrayBufferView(new ArrayBuffer(8)); // => false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a view over an `ArrayBuffer`.
 * @see {@link isTypedArray}
 * @see {@link isArrayBuffer}
 * @category guards
 * @since 0.2.0
 */
export const isArrayBufferView = (value: unknown): value is ArrayBufferView =>
	ArrayBuffer.isView(value);

/**
 * Narrow `unknown` to a typed array — one of the twelve `%TypedArray%` kinds,
 * **excluding** `DataView`.
 *
 * **When to use**
 *
 * Use when the branch is going to treat the value as an indexed, iterable,
 * `length`-bearing sequence of numbers — which a `DataView` is not.
 *
 * **Details**
 *
 * This is what `node:util.types.isTypedArray` and lodash's `isTypedArray` mean by
 * the name, and matching them is the point: these guards get swapped for one
 * another. `DataView` is the sole `ArrayBufferView` that is not a typed array —
 * it has no `length`, no element type, and is not iterable — so a single tag
 * comparison separates it out. Use {@link isArrayBufferView} when you genuinely
 * want both.
 *
 * **Example** (The one `ArrayBufferView` that is excluded)
 *
 * ```ts doctest
 * import { isTypedArray } from "@resq-systems/types/guards";
 *
 * isTypedArray(new Uint8Array(1)); // => true
 * isTypedArray(new DataView(new ArrayBuffer(8))); // => false
 * isTypedArray(new ArrayBuffer(8)); // => false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a typed array from any realm.
 * @see {@link isArrayBufferView}
 * @see {@link isUint8Array}
 * @category guards
 * @since 0.2.0
 */
export const isTypedArray = (value: unknown): value is ArrayBufferView =>
	ArrayBuffer.isView(value) && tagOf(value) !== "[object DataView]";

/**
 * Narrow `unknown` to `Uint8Array` specifically.
 *
 * **When to use**
 *
 * Use on the concrete binary type that matters here: crypto output, telemetry
 * frames, and anything crossing a socket.
 *
 * **Details**
 *
 * `instanceof` cannot distinguish the twelve typed-array kinds across realms and
 * `ArrayBuffer.isView` does not try; the species tag names the exact constructor,
 * and the shared `%TypedArray%` `byteLength` accessor confirms the internal slot.
 *
 * **Example** (Rejecting the wrong element width)
 *
 * ```ts doctest
 * import { isUint8Array } from "@resq-systems/types/guards";
 *
 * isUint8Array(new Uint8Array([1, 2])); // => true
 * isUint8Array(new Uint16Array([1, 2])); // => false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a genuine `Uint8Array` from any realm.
 * @see {@link isTypedArray}
 * @category guards
 * @since 0.2.0
 */
export const isUint8Array = (value: unknown): value is Uint8Array =>
	tagOf(value) === "[object Uint8Array]" && hasSlot(TYPED_ARRAY_BYTE_LENGTH, value);

/**
 * Narrow `unknown` to `ArrayBuffer` — the buffer itself, not a view over it.
 *
 * **When to use**
 *
 * Use at a binary-protocol boundary, where confusing the buffer with a view over
 * it is the most common bug there is.
 *
 * **Details**
 *
 * An `ArrayBuffer` has no `byteOffset`, cannot be indexed, and yields an empty
 * result from every `Array.from`. `SharedArrayBuffer` tags itself separately and
 * is therefore rejected, which is deliberate — the two have different concurrency
 * semantics and should not be silently interchangeable.
 *
 * **Example** (Normalizing a chunk to bytes)
 *
 * ```ts doctest
 * import { isArrayBuffer } from "@resq-systems/types/guards";
 *
 * const chunk: unknown = new ArrayBuffer(2);
 * const bytes = isArrayBuffer(chunk) ? new Uint8Array(chunk) : new Uint8Array(0);
 *
 * bytes.byteLength; // => 2
 * isArrayBuffer(new Uint8Array(2)); // => false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a genuine `ArrayBuffer` from any realm.
 * @see {@link isArrayBufferView}
 * @category guards
 * @since 0.2.0
 */
export const isArrayBuffer = (value: unknown): value is ArrayBuffer =>
	tagOf(value) === "[object ArrayBuffer]" && hasSlot(ARRAY_BUFFER_BYTE_LENGTH, value);

//#endregion

//#region Property access and membership

/**
 * Narrow `unknown` to an object known to carry `key`.
 *
 * **When to use**
 *
 * Use as the gateway out of `unknown` and into safe duck-typing: after this,
 * `value[key]` is `unknown` — readable, still unproven — rather than a compile
 * error.
 *
 * **Details**
 *
 * Named `hasKey` so it stays visibly distinct from {@link hasOwn}, the
 * own-property-only variant. Inherited keys count, because this is an `in` check:
 * a method on the prototype satisfies it. Use {@link hasOwn} when that matters.
 *
 * **Example** (Reading a message off an unknown cause)
 *
 * ```ts doctest
 * import { hasKey, isString } from "@resq-systems/types/guards";
 *
 * const messageOf = (cause: unknown): string =>
 * 	hasKey(cause, "message") && isString(cause.message) ? cause.message : String(cause);
 *
 * messageOf({ message: "nope" }); // => "nope"
 * messageOf(42); // => "42"
 * ```
 *
 * @typeParam P - The literal key type, preserved into the narrowed record.
 * @param value - The value to test.
 * @param key - The key to look for.
 * @returns `true` when `value` is an object (or function) exposing `key`.
 * @see {@link hasKeys}
 * @see {@link hasOwn}
 * @category guards
 * @since 0.2.0
 */
export const hasKey = <P extends PropertyKey>(
	value: unknown,
	key: P,
): value is Record<P, unknown> => isObjectLike(value) && key in value;

/**
 * Narrow `unknown` to an object known to carry **every** listed key.
 *
 * **When to use**
 *
 * Use when four fields must all be present before the branch is worth entering,
 * and chaining `&&` over {@link hasKey} reads badly.
 *
 * **Details**
 *
 * The multi-key form exists because the obvious alternative does not typecheck:
 * {@link hasKey} is not curried, so it cannot be fed to a combinator, and
 * chaining `&&` re-narrows one key at a time. The `const` type parameter is what
 * preserves the literal keys instead of widening them to `string`.
 *
 * Calling it with no keys returns `true` for any object and `false` for any
 * primitive — the object-ness check still runs.
 *
 * **Example** (All-or-nothing field presence)
 *
 * ```ts doctest
 * import { hasKeys } from "@resq-systems/types/guards";
 *
 * const frame: unknown = { lat: 51.5, lon: -0.12, at: 0 };
 * const plotted = hasKeys(frame, "lat", "lon", "at") ? [frame.lat, frame.lon, frame.at] : [];
 *
 * plotted; // => [51.5, -0.12, 0]
 * hasKeys(frame, "lat", "alt"); // => false
 * ```
 *
 * @typeParam P - The tuple of literal keys.
 * @param value - The value to test.
 * @param keys - The keys that must all be present.
 * @returns `true` when `value` is an object exposing all of `keys`.
 * @see {@link hasKey}
 * @category guards
 * @since 0.2.0
 */
export const hasKeys = <const P extends readonly PropertyKey[]>(
	value: unknown,
	...keys: P
): value is Record<P[number], unknown> => {
	if (!isObjectLike(value)) {
		return false;
	}
	const target: object = value;
	return keys.every((key) => key in target);
};

/**
 * Narrow an object to one known to carry `key` as its **own** property.
 *
 * **When to use**
 *
 * Use in new code wherever the legacy {@link hasOwnProperty} would have been
 * reached for — this one narrows, which is the entire difference.
 *
 * **Details**
 *
 * `Object.hasOwn` under the hood, which is prototype-pollution-safe (a global
 * `Object.prototype.isAdmin = true` does not make `hasOwn(user, "isAdmin")` true)
 * and immune to an object that shadows `hasOwnProperty`.
 *
 * **Example** (Inherited does not count)
 *
 * ```ts doctest
 * import { hasOwn } from "@resq-systems/types/guards";
 *
 * const config: object = { retries: 3 };
 *
 * hasOwn(config, "retries") ? config.retries : 0; // => 3
 * hasOwn({}, "toString"); // => false
 * ```
 *
 * @typeParam P - The literal key type, preserved into the narrowed record.
 * @param obj - The object to inspect.
 * @param key - The key to look for.
 * @returns `true` when `obj` owns `key` directly.
 * @see {@link hasKey}
 * @see {@link hasOwnProperty}
 * @category guards
 * @since 0.2.0
 */
export const hasOwn = <P extends PropertyKey>(obj: object, key: P): obj is Record<P, unknown> =>
	Object.hasOwn(obj, key);

/**
 * Report whether `obj` owns `key` directly.
 *
 * **When to use**
 *
 * Use only to keep an existing `@resq-systems/helpers` call site compiling.
 * Superseded by {@link hasOwn}, which is identical at runtime and narrows its
 * argument; prefer that in new code.
 *
 * **Details**
 *
 * Migrated verbatim from `@resq-systems/helpers`, which re-exports it publicly:
 * exact name, exact `(obj: object, key: string) => boolean` signature, exact
 * `Object.hasOwn` delegation, and the exact non-narrowing `boolean` return. (The
 * original's JSDoc claimed `Object.prototype.hasOwnProperty.call`; the code never
 * did that, and it is the code we are bound to preserve.)
 *
 * **Gotchas**
 *
 * This is the **only** export in this module that does not narrow — its return
 * type is plain `boolean`, not `obj is Record<…>`. Writing
 * `if (hasOwnProperty(config, "retries")) config.retries` is still a compile
 * error, and that surprise is exactly why {@link hasOwn} exists.
 *
 * **Example** (True, but proving nothing to the compiler)
 *
 * ```ts doctest
 * import { hasOwnProperty } from "@resq-systems/types/guards";
 *
 * hasOwnProperty({ a: 1 }, "a"); // => true
 * hasOwnProperty({}, "toString"); // => false
 * ```
 *
 * @param obj - The object to inspect.
 * @param key - The key to look for.
 * @returns `true` when `obj` owns `key` directly.
 * @see {@link hasOwn}
 * @category predicates
 * @since 0.2.0
 * @deprecated Migration shim for `@resq-systems/helpers`. It is the only export
 *   in this module that does not narrow, so `if (hasOwnProperty(config, "k"))
 *   config.k` is still a compile error. Use {@link hasOwn}, which is identical
 *   at runtime and narrows. Reachable only via the
 *   `@resq-systems/types/guards` subpath, never the package barrel.
 */
export function hasOwnProperty(obj: object, key: string): boolean {
	return Object.hasOwn(obj, key);
}

/**
 * Narrow an arbitrary {@link PropertyKey} to `keyof T`.
 *
 * **When to use**
 *
 * Use to turn a string you did not author — a config value, a route segment, a
 * column name — into a safe index into a closed record, without the cast that
 * goes wrong when the record's shape changes.
 *
 * **Details**
 *
 * Implemented with `Object.hasOwn` rather than `in`, because `in` would happily
 * report `"toString"` as a key of `{ a: 1 }` and hand you a function where the
 * type promised `1`. The trade-off: a class method living on the prototype is
 * `keyof T` but is **not** accepted here.
 *
 * *Soundness caveat, inherent to structural typing and unfixable at runtime.* A
 * value of type `T` may legally carry own properties `T` does not declare, and
 * this guard proves `keyof T` from the *runtime* keys. So the narrowing is only
 * sound when `T` enumerates everything `obj` actually owns — an object literal, an
 * `as const` map, a sealed record. Reached through a wider interface it is not:
 * `interface Config { retries: number }` bound to `{ retries: 3, name: "x" }`
 * narrows `"name"` to `"retries"`, and `config[key]` is then typed `number` while
 * holding a string. For open objects, prefer an explicit allow-list —
 * `isOneOf(...Object.keys(palette))`.
 *
 * **Gotchas**
 *
 * The type predicate is on the **second** parameter (`key is keyof T`), unlike
 * every other export in this module, where the first parameter is the value under
 * test. `isKeyOf(palette, name)` narrows `name`, not `palette`.
 *
 * **Example** (A config string becomes a safe index)
 *
 * ```ts doctest
 * import { isKeyOf } from "@resq-systems/types/guards";
 *
 * const palette = { primary: 1, accent: 2 } as const;
 * const name: string = "accent";
 * const chosen = isKeyOf(palette, name) ? palette[name] : 0;
 *
 * chosen; // => 2
 * isKeyOf(palette, "toString"); // => false
 * ```
 *
 * @typeParam T - The object whose keys are being tested.
 * @param obj - The object to inspect.
 * @param key - The candidate key.
 * @returns `true` when `key` is an own key of `obj`.
 * @see {@link hasOwn}
 * @see {@link isOneOf}
 * @category guards
 * @since 0.2.0
 */
export const isKeyOf = <T extends object>(obj: T, key: PropertyKey): key is keyof T =>
	Object.hasOwn(obj, key);

/**
 * Build a guard that accepts only the listed values.
 *
 * **When to use**
 *
 * Use for an allow-list that gets reused — a log level, an enum off the wire, a
 * feature flag — where the guard should narrow `unknown` all the way down to the
 * literal union.
 *
 * **Details**
 *
 * The reusable, storable form of an allow-list check — remeda calls it
 * `isIncludedIn`. The `const` type parameter keeps the literals, so the guard
 * narrows to the union rather than to `string`. Membership uses `Set` semantics
 * (SameValueZero), so `NaN` matches `NaN` and `+0` matches `-0`.
 *
 * Not to be confused with `predicate.ts#exactlyOne`, which is the boolean
 * "exactly one of these *predicates* holds" combinator. This one is about values;
 * that one is about logic.
 *
 * **Example** (Parsing a log level with a fallback)
 *
 * ```ts doctest
 * import { isOneOf } from "@resq-systems/types/guards";
 *
 * const isLevel = isOneOf("debug", "info", "warn", "error");
 * const raw: unknown = "warn";
 * const level = isLevel(raw) ? raw : "info";
 *
 * level; // => "warn"
 * isLevel("trace"); // => false
 * ```
 *
 * @typeParam T - The tuple of accepted values.
 * @param values - The accepted values.
 * @returns A guard narrowing `unknown` to the union of `values`.
 * @see {@link isKeyOf}
 * @see {@link isInRange}
 * @category constructors
 * @since 0.2.0
 */
export const isOneOf = <const T extends readonly unknown[]>(...values: T): TypeGuard<T[number]> => {
	const members: ReadonlySet<unknown> = new Set<unknown>(values);
	return (value: unknown): value is T[number] => members.has(value);
};

/**
 * Build a guard from a constructor — the curried, composable `instanceof`.
 *
 * **When to use**
 *
 * Use when the check must be stored, passed to `predicate.ts#anyOf`, or handed
 * straight to `Array.prototype.filter`, and the values have not crossed a realm
 * boundary.
 *
 * **Details**
 *
 * The constraint is `abstract new` so abstract base classes are accepted, which
 * is usually the whole point of an `instanceof` check in the first place.
 *
 * *Cross-realm caveat:* `instanceof` compares prototype chains, so this returns
 * `false` for a value that crossed a realm boundary — a worker, an iframe, a `vm`
 * context, `structuredClone`. For the built-ins that actually travel, prefer the
 * tag-based guards above ({@link isMap}, {@link isSet}, {@link isDate},
 * {@link isRegExp}, {@link isError}, {@link isURL}).
 *
 * **Example** (Filtering a mixed array down to errors)
 *
 * ```ts doctest
 * import { isInstanceOf } from "@resq-systems/types/guards";
 *
 * const results: unknown[] = [new Error("a"), "b", new TypeError("c")];
 *
 * results.filter(isInstanceOf(Error)).map((error) => error.message); // => ["a", "c"]
 * ```
 *
 * @typeParam C - The constructor type.
 * @param ctor - The constructor to test against.
 * @returns A guard narrowing `unknown` to `InstanceType<C>`.
 * @see {@link isConstructor}
 * @see {@link isError}
 * @category constructors
 * @since 0.2.0
 */
export const isInstanceOf = <C extends abstract new (...args: never[]) => unknown>(
	ctor: C,
): TypeGuard<InstanceType<C>> => {
	return (value: unknown): value is InstanceType<C> => value instanceof ctor;
};

//#endregion

//#region JSON

/**
 * Narrow `unknown` to a {@link JsonPrimitive} — `string`, `number`, `boolean`, or
 * `null`.
 *
 * **When to use**
 *
 * Use as the leaf case of a JSON walk, or to decide whether a value can be stored
 * as-is versus needing conversion.
 *
 * **Details**
 *
 * `./json.js` has always shipped the JSON *types* without the runtime half; these
 * four guards are it. Note that `NaN` and `±Infinity` pass, because they are
 * `number`s — `JSON.stringify` turns them into `null` rather than failing, which
 * the type system cannot express. Pair with {@link isFiniteNumber} when that
 * distinction matters.
 *
 * **Example** (`bigint` is the notable exclusion)
 *
 * ```ts doctest
 * import { isJsonPrimitive } from "@resq-systems/types/guards";
 *
 * isJsonPrimitive(null); // => true
 * isJsonPrimitive(1n); // => false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a JSON leaf.
 * @see {@link isJsonValue}
 * @see {@link isFiniteNumber}
 * @category guards
 * @since 0.2.0
 */
export const isJsonPrimitive = (value: unknown): value is JsonPrimitive =>
	value === null ||
	typeof value === "string" ||
	typeof value === "number" ||
	typeof value === "boolean";

/**
 * Narrow `unknown` to a {@link JsonArray} — an array whose every element is
 * itself valid JSON.
 *
 * **When to use**
 *
 * Use when an array must be provably serializable before it is cached, queued, or
 * written to a JSON column.
 *
 * **Details**
 *
 * Mutually recursive with {@link isJsonValue}, which is why that one is a hoisted
 * `function` declaration rather than a `const`.
 *
 * Indexes are read explicitly rather than through `Array.prototype.every`, which
 * skips holes. A sparse array is not JSON: `JSON.stringify(new Array(2))` is
 * `"[null,null]"`, so claiming `JsonValue` for it would claim a round-trip that
 * does not hold.
 *
 * **Example** (Holes do not round-trip)
 *
 * ```ts doctest
 * import { isJsonArray } from "@resq-systems/types/guards";
 *
 * isJsonArray([1, "a", null, { b: [] }]); // => true
 * isJsonArray([() => {}]); // => false
 * isJsonArray(new Array(2)); // => false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is an array of JSON values.
 * @see {@link isJsonValue}
 * @see {@link isArray}
 * @category guards
 * @since 0.2.0
 */
export const isJsonArray = (value: unknown): value is JsonArray => {
	if (!isArray(value)) {
		return false;
	}
	for (let index = 0; index < value.length; index += 1) {
		if (!isJsonValue(value[index])) {
			return false;
		}
	}
	return true;
};

/**
 * Narrow `unknown` to a {@link JsonObject} — a plain object whose every value is
 * valid JSON.
 *
 * **When to use**
 *
 * Use at a persistence or transport boundary, when an object must be provably
 * serializable and a hidden function member is a bug rather than a nuisance.
 *
 * **Details**
 *
 * Requires a *plain* object (see {@link isPlainObject}), because that is the only
 * thing `JSON.parse` ever produces. `undefined` members are tolerated: the
 * `JsonObject` index signature admits them to model keys that `JSON.stringify`
 * drops entirely rather than serializing.
 *
 * Members are enumerated with `Object.getOwnPropertyNames` rather than
 * `Object.values`, so a non-enumerable own property is tested too. `JSON.stringify`
 * would skip such a key, which is precisely why checking it matters: the guard's
 * promise is about what `value[k]` hands a consumer holding a `JsonObject`, not
 * about what serialization happens to drop. A hidden function member makes a false
 * `JsonObject`, and this reports it. Symbol keys are ignored — the `string` index
 * signature makes no claim about them — and inherited properties are out of scope,
 * though {@link isPlainObject} already rejects anything with a custom prototype.
 *
 * **Example** (A non-enumerable member is still inspected)
 *
 * ```ts doctest
 * import { isJsonObject } from "@resq-systems/types/guards";
 *
 * isJsonObject({ a: 1, b: undefined }); // => true
 * isJsonObject(new Date()); // => false
 *
 * const hidden = { a: 1 };
 * Object.defineProperty(hidden, "b", { value: () => {}, enumerable: false });
 *
 * isJsonObject(hidden); // => false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is a plain object of JSON values.
 * @see {@link isJsonValue}
 * @see {@link isPlainObject}
 * @category guards
 * @since 0.2.0
 */
export const isJsonObject = (value: unknown): value is JsonObject => {
	if (!isPlainObject(value)) {
		return false;
	}
	for (const key of Object.getOwnPropertyNames(value)) {
		const member = value[key];
		if (member !== undefined && !isJsonValue(member)) {
			return false;
		}
	}
	return true;
};

/**
 * Narrow `unknown` to a {@link JsonValue} — the closed set that survives a
 * `JSON.parse(JSON.stringify(x))` round-trip.
 *
 * **When to use**
 *
 * Use as the one call that proves an arbitrary payload is serializable, before
 * putting it in a cache, a queue, or a JSON column.
 *
 * **Details**
 *
 * Declared as a hoisted `function` rather than a `const` arrow precisely so that
 * {@link isJsonArray} and {@link isJsonObject}, defined above it, can reference it
 * without a temporal-dead-zone error. (`predicate.ts#lazy` is the general answer
 * to that problem; here a hoisted declaration is one keyword and zero
 * indirection.)
 *
 * **Gotchas**
 *
 * This recurses to the depth of the value. A cyclic object graph will recurse
 * until the stack overflows, and a deeply nested attacker-controlled payload is a
 * denial-of-service vector. If the input is untrusted, bound the depth before
 * calling this — or bound the payload size at the transport layer.
 *
 * **Example** (Proving a payload is cacheable)
 *
 * ```ts doctest
 * import { isJsonValue } from "@resq-systems/types/guards";
 *
 * const body: unknown = JSON.parse('{"a":[1,null]}');
 *
 * isJsonValue(body); // => true
 * isJsonValue({ fn: () => {} }); // => false
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is valid JSON all the way down.
 * @throws {RangeError} Indirectly, via stack exhaustion, on a cyclic graph.
 * @see {@link isJsonPrimitive}
 * @see {@link isJsonArray}
 * @see {@link isJsonObject}
 * @category guards
 * @since 0.2.0
 */
export function isJsonValue(value: unknown): value is JsonValue {
	return isJsonPrimitive(value) || isJsonArray(value) || isJsonObject(value);
}

//#endregion
