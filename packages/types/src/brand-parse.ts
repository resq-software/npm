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
 * @fileoverview Accumulating brand validation — every constraint runs, every
 * failure is reported, nothing short-circuits.
 *
 * @module @resq-systems/types/brand-parse
 *
 * `@resq-systems/types/brand` answers *"is this value a valid `B`?"* with one
 * predicate and a yes/no. That is the right shape for most brands and it is
 * where `BrandRefiner` stops. It is the wrong shape the moment a brand is really
 * several independent rules wearing one regex: the caller learns that the value
 * was rejected but not *which* rule rejected it, and rules that a single pattern
 * cannot express get quietly dropped.
 *
 * This module is the second shape. A brand is described as a list of labelled
 * constraints, all of them run on every value, and the failure carries the
 * labels of every constraint that did not hold.
 *
 * **Why this is a separate entry point, not more of `./brand`.** `brand.ts` is a
 * zero-import leaf. `numeric.ts` and four workspace packages import it directly,
 * and giving it an edge to `narrow.ts` — needed here, because `NarrowError` is a
 * class and therefore a runtime import — would drag `narrow.ts` and
 * `predicate.ts` behind every `import "@resq-systems/types/brand"`. That trades
 * a published package's tree-shaking guarantee for one feature. Keeping the
 * accumulating half in its own module leaves `./brand` a leaf and lets
 * `./brand-parse` import both freely.
 *
 * **Labels, never values.** `BrandError` reports constraint *labels*. The
 * offending value is carried on the inherited `NarrowError.value` field and is
 * never interpolated into `message`, because brand checks run at trust
 * boundaries on data that is frequently the exact thing you must not log.
 *
 * @example Range-checking an IPv4 address, which one regex cannot do alone
 * ```ts
 * const IPv4 = brandParser<string, "IPv4">(
 *   [
 *     ["dotted quad", (s) => /^\d{1,3}(\.\d{1,3}){3}$/.test(s)],
 *     ["octet range", (s) => s.split(".").every((o) => Number(o) <= 255)],
 *   ],
 *   "IPv4",
 * );
 *
 * IPv4.failures(untrustedInput); // ["octet range"] — the shape was fine, the range was not
 * ```
 */

import type { Brand, BrandRefiner } from "./brand.js";
import { type NarrowResult, NarrowError } from "./narrow.js";

//#region Structured failure

/**
 * The failure a {@link BrandParser} produces: a `NarrowError` that also names
 * the brand and lists the label of every constraint the value failed.
 *
 * **When to use**
 *
 * Use in the `catch` around a {@link BrandParser}'s `from`, or on the error arm
 * of its `parse`, when you need to tell the caller *which* rules were violated
 * rather than only that validation failed — a form that highlights three fields,
 * an API that returns a machine-readable list of violated rules, a log line that
 * records the failure shape without recording the payload.
 *
 * **Details**
 *
 * Extends `NarrowError` rather than `Error` so that `isNarrowError` recognizes
 * it, **including across realms**: `NarrowError`'s constructor stamps a
 * `Symbol.for("@resq-systems/types#NarrowError")` brand on every instance,
 * subclasses included, and `isNarrowError` checks that registry symbol before it
 * falls back to `name`. `UnhandledTagError` in `@resq-systems/types/union` sets
 * exactly this precedent. One `catch` clause therefore still handles everything
 * this package throws.
 *
 * `failures` holds constraint **labels**, never the offending value, and neither
 * does `message`. The value is on the inherited `value` field, where a redacting
 * logger or a debugger can reach it deliberately. Do not regress this: these
 * errors are raised at trust boundaries, on PII, in code paths that log.
 *
 * **Gotchas**
 *
 * `name` is `"BrandError"`, not `"NarrowError"` — a `catch` block comparing
 * `error.name === "NarrowError"` will miss it. Use `isNarrowError`, which is
 * brand-based and sees every descendant.
 *
 * **Example** (Reading the violated rules off a rejected value)
 *
 * ```ts doctest
 * import { BrandError, brandParser } from "@resq-systems/types/brand-parse";
 * import { isNarrowError } from "@resq-systems/types/narrow";
 *
 * const Even = brandParser<number, "Even">([["even", (n) => n % 2 === 0]], "Even");
 *
 * let caught: BrandError | undefined;
 * try {
 *   Even.from(3);
 * } catch (error) {
 *   if (error instanceof BrandError) caught = error;
 * }
 *
 * const stillANarrowError = isNarrowError(caught); // => true
 * const brand = caught?.brand; // => "Even"
 * const failures = caught?.failures; // => ["even"]
 * const value = caught?.value; // => 3
 * const leaksTheValue = caught?.message.includes("3"); // => false
 * ```
 *
 * @see {@link BrandParser}
 * @see {@link brandParser}
 * @category errors
 * @since 0.2.0
 */
export class BrandError extends NarrowError {
	/** The brand the value was being validated against. */
	readonly brand: PropertyKey;
	/**
	 * Labels of every constraint the value failed, in the order the constraints
	 * were declared. Never the value itself.
	 */
	readonly failures: readonly string[];

	/**
	 * @param message - The human-readable failure description. Must not
	 *   interpolate the offending value.
	 * @param options - The brand, the failed constraint labels, and the
	 *   `NarrowError` context.
	 */
	constructor(
		message: string,
		options: {
			readonly brand: PropertyKey;
			readonly failures: readonly string[];
			readonly value?: unknown;
			readonly expected?: string | undefined;
			readonly path?: readonly PropertyKey[] | undefined;
		},
	) {
		super(message, {
			value: options.value,
			expected: options.expected,
			path: options.path,
		});
		this.name = "BrandError";
		this.brand = options.brand;
		// Copied and frozen: the caller's array must not be able to mutate a
		// thrown error after the fact, and the error must not alias it.
		this.failures = Object.freeze([...options.failures]);
		// Restores the prototype chain when this file is downlevelled to ES5 by a
		// consumer's build, where `extends Error` otherwise breaks `instanceof`.
		Object.setPrototypeOf(this, BrandError.prototype);
	}
}

//#endregion

//#region Models

/**
 * A `BrandRefiner` that can also report *why* a value was rejected.
 *
 * **When to use**
 *
 * Use as the annotation for anything built by {@link brandParser}, and as the
 * parameter type when a function wants "a brand smart-constructor that can
 * explain itself". Where only `is` / `from` / `coerce` are needed, keep
 * accepting the narrower `BrandRefiner` — every `BrandParser` is one.
 *
 * **Details**
 *
 * A **sibling** interface, deliberately not a widening of `BrandRefiner`.
 * `@resq-systems/types@0.1.0` is published, and an external consumer who hand-
 * builds `const r: BrandRefiner<string, "X"> = { is, from, coerce, unsafe }`
 * would stop compiling if `parse` were added to the base. Classified honestly:
 * technically breaking, practically additive — and the sibling route costs
 * nothing, so there is no reason to take the risk.
 *
 * The inherited members keep their meaning exactly: `is` is a type guard, `from`
 * throws, `coerce` returns `null`, `unsafe` casts. Only `from`'s thrown type
 * differs from `brandRefiner`'s — see **Gotchas** on {@link brandParser}.
 *
 * **Example** (Accepting the narrow contract, supplying the wide one)
 *
 * ```ts doctest
 * import type { Brand, BrandRefiner } from "@resq-systems/types/brand";
 * import { type BrandParser, brandParser } from "@resq-systems/types/brand-parse";
 *
 * type Slug = Brand<string, "Slug">;
 *
 * const Slug: BrandParser<string, "Slug"> = brandParser<string, "Slug">(
 *   [
 *     ["lowercase", (s) => s === s.toLowerCase()],
 *     ["no spaces", (s) => !s.includes(" ")],
 *   ],
 *   "Slug",
 * );
 *
 * // A `BrandParser` is a `BrandRefiner`, so narrow consumers need no change.
 * const refiner: BrandRefiner<string, "Slug"> = Slug;
 * const accepted = refiner.is("hello-world"); // => true
 *
 * // ...but the parser also says which rules were broken.
 * const broken = Slug.failures("Hello World"); // => ["lowercase", "no spaces"]
 * ```
 *
 * @typeParam T - The carrier type (e.g. `string`, `number`).
 * @typeParam B - The brand name (e.g. `"IPv4"`).
 *
 * @see {@link brandParser}
 * @see {@link BrandError}
 * @category models
 * @since 0.2.0
 */
export interface BrandParser<T, B extends PropertyKey> extends BrandRefiner<T, B> {
	/**
	 * Validate without throwing, returning the branded value or a
	 * {@link BrandError} listing every constraint that failed.
	 */
	readonly parse: (value: T) => NarrowResult<Brand<T, B>, BrandError>;
	/**
	 * The labels of every constraint this value fails, in declaration order. An
	 * empty array means the value is valid.
	 */
	readonly failures: (value: T) => readonly string[];
}

//#endregion

//#region Constructors

/**
 * Build a {@link BrandParser} from a list of labelled constraints. Every
 * constraint runs on every value; the result names all of them that failed.
 *
 * **When to use**
 *
 * Use when a brand is genuinely several independent rules — a shape rule *and* a
 * range rule, a length rule *and* a character-class rule, a format rule *and* a
 * checksum — and the caller needs to know which one was violated. Use
 * `brandRefiner` from `@resq-systems/types/brand` instead when one predicate
 * really is the whole story; a single-constraint `brandParser` is only a heavier
 * spelling of it.
 *
 * **Details**
 *
 * Constraints are evaluated in declaration order and **never short-circuit** —
 * that is the entire point of the module, and it applies uniformly to `is`,
 * `coerce`, `from`, `parse`, and `failures`, so a predicate cannot be observed
 * running in one member and not another. Keep predicates pure and cheap;
 * anything expensive belongs behind a cheaper guard.
 *
 * There is no per-constraint "abort" flag. Effect's `Brand` carries one because
 * the same machinery decodes large nested structures where continuing is
 * wasteful; for a brand over a scalar it is dead weight, so it is dropped rather
 * than modelled.
 *
 * `constraints` is copied on entry, so mutating the caller's array afterwards
 * cannot change how an already-built parser behaves. An **empty** list is legal
 * and vacuously valid — `brandParser([])` accepts everything, which makes it the
 * identity element when constraint lists are composed by concatenation.
 *
 * **Gotchas**
 *
 * `from` throws a {@link BrandError}, **not** the `TypeError` that
 * `brandRefiner(...).from` throws. That is deliberate — the labels are the
 * reason this module exists and a bare `TypeError` cannot carry them — but code
 * migrating from `brandRefiner` and catching `TypeError` specifically must be
 * updated. `BrandError` is a `NarrowError`, so `isNarrowError` recognizes it.
 *
 * A predicate that throws propagates out of whichever member invoked it; this
 * function does not wrap predicate failures. Check the carrier's type with a
 * guard before the value reaches a parser written for that carrier.
 *
 * When the carrier itself admits `null`, `coerce` is ambiguous: it answers
 * `null` both for a rejected value and for an accepted `null`. That is
 * inherited from `BrandRefiner` and is not fixable here without changing a
 * published signature — use `is` or `parse` on a nullable carrier.
 *
 * **Example** (An IPv4 brand that range-checks, and says which half failed)
 *
 * ```ts doctest
 * import type { Brand } from "@resq-systems/types/brand";
 * import { brandParser } from "@resq-systems/types/brand-parse";
 *
 * type IPv4 = Brand<string, "IPv4">;
 *
 * const IPv4 = brandParser<string, "IPv4">(
 *   [
 *     ["dotted quad", (s) => /^\d{1,3}(\.\d{1,3}){3}$/.test(s)],
 *     ["octet range", (s) => s.split(".").every((o) => /^\d{1,3}$/.test(o) && Number(o) <= 255)],
 *   ],
 *   "IPv4",
 * );
 *
 * const valid = IPv4.failures("192.168.0.1").length; // => 0
 * const outOfRange = IPv4.failures("999.0.0.1"); // => ["octet range"]
 * const notAnAddress = IPv4.failures("nope"); // => ["dotted quad", "octet range"]
 * ```
 *
 * **Example** (Branching on `parse` instead of catching)
 *
 * ```ts doctest
 * import { brandParser } from "@resq-systems/types/brand-parse";
 *
 * const Password = brandParser<string, "Password">(
 *   [
 *     ["at least 12 characters", (s) => s.length >= 12],
 *     ["contains a digit", (s) => /\d/.test(s)],
 *   ],
 *   "Password",
 * );
 *
 * const good = Password.parse("correcthorse42");
 * const accepted = good.ok ? good.value : "rejected"; // => "correcthorse42"
 *
 * const bad = Password.parse("short");
 * const why = bad.ok ? [] : bad.error.failures; // => ["at least 12 characters", "contains a digit"]
 * ```
 *
 * @typeParam T - The carrier type the constraints are written over.
 * @typeParam B - The brand name applied when every constraint holds.
 * @param constraints - `[label, predicate]` pairs. The label is what a failure
 *   reports, so write it as the rule the value broke ("octet range"), not as a
 *   restatement of the value.
 * @param brand - The brand's runtime name, used for `BrandError.brand` and in
 *   the failure message. Defaults to `"brand"`, matching `brandRefiner`'s
 *   generic wording. Symbol brands are supported.
 * @returns A `{ is, from, coerce, unsafe, parse, failures }` bundle for
 *   `Brand<T, B>`.
 *
 * @see {@link BrandParser}
 * @see {@link BrandError}
 * @category constructors
 * @since 0.2.0
 */
export function brandParser<T, B extends PropertyKey>(
	constraints: readonly (readonly [label: string, predicate: (value: T) => boolean])[],
	brand: PropertyKey = "brand",
): BrandParser<T, B> {
	// Copied so a later mutation of the caller's array cannot retroactively
	// change what an already-built parser accepts.
	const checks: readonly (readonly [string, (value: T) => boolean])[] = Object.freeze(
		constraints.map(([label, predicate]) => [label, predicate] as const),
	);
	// `String(...)` rather than template interpolation: interpolating a symbol
	// directly throws a TypeError, and `brand` is a `PropertyKey`.
	const brandText = String(brand);

	const failures = (value: T): readonly string[] => {
		const failed: string[] = [];
		for (const [label, predicate] of checks) {
			if (!predicate(value)) {
				failed.push(label);
			}
		}
		return Object.freeze(failed);
	};

	const is = (value: T): value is Brand<T, B> => failures(value).length === 0;

	const toError = (value: T, failed: readonly string[]): BrandError =>
		new BrandError(`Value failed the ${brandText} brand: ${failed.join(", ")}`, {
			brand,
			failures: failed,
			value,
			expected: brandText,
		});

	return Object.freeze({
		is,
		from: (value: T): Brand<T, B> => {
			const failed = failures(value);
			if (failed.length > 0) {
				throw toError(value, failed);
			}
			return value as Brand<T, B>;
		},
		coerce: (value: T): Brand<T, B> | null => (is(value) ? value : null),
		unsafe: (value: T): Brand<T, B> => value as Brand<T, B>,
		parse: (value: T): NarrowResult<Brand<T, B>, BrandError> => {
			const failed = failures(value);
			return failed.length === 0
				? { ok: true, value: value as Brand<T, B> }
				: { ok: false, error: toError(value, failed) };
		},
		failures,
	});
}

//#endregion
