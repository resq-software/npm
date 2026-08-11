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
 * @fileoverview Turning a guard into control flow.
 *
 * @module @resq-systems/types/narrow
 *
 * A type guard answers *whether*. This module answers *what happens next*:
 * return the narrowed value, return a structured failure, or throw. It exists
 * because the obvious answer — an `asserts value is T` function — carries a
 * design limitation that bites **your consumers, not you**: TypeScript discards
 * assertion-signature narrowing unless every name in the call target chain has
 * an explicit type annotation (TS2775). Your CI stays green; theirs breaks.
 *
 * So the primary API here returns a value. {@link ensure}, {@link ensureDefined},
 * {@link parse}, and {@link tryNarrow} can never trip TS2775, they work in
 * expression position where a statement assertion cannot go, and they compose
 * into pipelines:
 *
 * **Example** (The recommended shape)
 *
 * ```ts doctest
 * import { isString } from "@resq-systems/types/guards";
 * import { ensure, parse } from "@resq-systems/types/narrow";
 *
 * const payload: { readonly name: unknown } = { name: "ada" };
 *
 * // Throws a NarrowError at the boundary if the guard rejects.
 * const name = ensure(payload.name, isString, "name must be a string");
 * const shouted = name.toUpperCase(); // => "ADA"
 *
 * // Same parameters, same order — only the control flow differs.
 * const result = parse(payload.name, isString, "name must be a string");
 * const rendered = result.ok ? result.value : result.error.message; // => "ada"
 * ```
 *
 * The `asserts` family ({@link assertBy}, {@link assertDefined},
 * {@link assertNonNullish}, {@link invariant}, {@link assertGuard}) is the
 * secondary, statement-position tool. Every one of them is declared as a
 * `function` — never an arrow const — so the definition side can never be the
 * thing that loses the predicate. See {@link assertGuard} for the full TS2775
 * rule and the {@link Assertion} annotation that defeats it.
 *
 * Failures carry structure: {@link NarrowError} holds the offending value, the
 * expected shape, and a path for nested failures. Default messages never
 * interpolate the value — a sanitizer's reject reason must not become the log
 * line that leaks the payload. Read `error.value` when you actually want it.
 *
 * **Nothing in this module is dualized, and that is deliberate.** Arity-based
 * data-first/data-last dispatch decides which call shape it is looking at from
 * `arguments.length` alone. {@link ensure} and {@link parse} both carry optional
 * trailing `message` and `expected` parameters, so a data-first
 * `ensure(value, guard)` and a hypothetical data-last `ensure(guard, message)`
 * record the identical argument count and become indistinguishable — the exact
 * ambiguity Effect's predicate-variant `dual` exists to work around. The
 * remaining functions here ({@link tryNarrow}, {@link narrowAll},
 * {@link unsafeNarrow}, and the whole `asserts` family) take the value under
 * test in the first position, which is the shape that turns a dualized helper
 * into a landmine when it is handed straight to `Array.prototype.map`. Both
 * disqualifications are structural, not stylistic: do not add `dual` here.
 */

import type { Refinement } from "./predicate.js";

//#region Structured failure

/**
 * Cross-realm brand stamped on every {@link NarrowError} instance, subclasses
 * included.
 *
 * `name` alone cannot carry this job: a subclass overwrites `name` with its own
 * (that is the point of `UnhandledTagError`), so a name check recognizes the base
 * class and misses every descendant that crossed a realm. `Symbol.for` reads from
 * the global symbol registry, which is shared across every realm in an agent and
 * across duplicated copies of this module in one bundle — so the same key is
 * produced on both sides of the boundary.
 *
 * @internal
 */
const NARROW_ERROR_BRAND = Symbol.for("@resq-systems/types#NarrowError");

/**
 * The error every thrower in this module raises, carrying the offending value,
 * the expected shape, and (for nested structural checks) the property path at
 * which the check failed.
 *
 * **When to use**
 *
 * Use in a `catch` block when you need to tell a failed narrow apart from every
 * other thrown error, and when you want the offending value and the expected
 * shape as structured fields rather than scraped back out of a message string.
 *
 * **Details**
 *
 * Deliberately **not** named `AssertionError`: both `node:assert` and vitest
 * export a class by that name, and a `catch` block testing
 * `err instanceof AssertionError` against the wrong import would silently match
 * — or silently fail to match — with no compile error. The name is also assigned
 * explicitly to `this.name` so it survives minification and so
 * {@link isNarrowError} can recognize instances that crossed a realm boundary.
 *
 * The `message` is yours to choose; the built-in defaults never interpolate the
 * offending value, because these errors are routinely logged at trust
 * boundaries where the value is exactly the thing you must not print. The value
 * is always available on `.value` for a debugger or a redacting logger.
 *
 * **Gotchas**
 *
 * {@link assert} and {@link assertExists} — the `@resq-systems/helpers`
 * compatibility exports — throw a plain `Error`, never this class, because a
 * subclass would change `err.name` and break existing checks in migrating code.
 *
 * **Example** (Reading the structured fields off a caught failure)
 *
 * ```ts doctest
 * import { isNonEmptyString } from "@resq-systems/types/guards";
 * import { type NarrowError, ensure, isNarrowError } from "@resq-systems/types/narrow";
 *
 * const input: unknown = "";
 * let caught: NarrowError | undefined;
 *
 * try {
 *   ensure(input, isNonEmptyString, "display name must not be blank", "NonEmptyString");
 * } catch (error) {
 *   if (isNarrowError(error)) caught = error;
 * }
 *
 * const message = caught?.message; // => "display name must not be blank"
 * const expected = caught?.expected; // => "NonEmptyString"
 * const value = caught?.value; // => ""
 * ```
 *
 * @see {@link isNarrowError}
 * @see {@link ensure}
 * @see {@link parse}
 * @category errors
 * @since 0.2.0
 */
export class NarrowError extends Error {
	/** The value that failed the check. Never interpolated into `message`. */
	readonly value: unknown;
	/** A human description of the shape that was expected, when one was given. */
	readonly expected: string | undefined;
	/** Property path to the failing member, for nested structural checks. */
	readonly path: readonly PropertyKey[] | undefined;

	/**
	 * @param message - The human-readable failure description.
	 * @param options - Structured context attached to the error.
	 */
	constructor(
		message: string,
		options?: {
			readonly value?: unknown;
			readonly expected?: string | undefined;
			readonly path?: readonly PropertyKey[] | undefined;
		},
	) {
		super(message);
		this.name = "NarrowError";
		this.value = options?.value;
		this.expected = options?.expected;
		this.path = options?.path;
		// Non-enumerable so it never lands in `JSON.stringify`, a structured log
		// line, or a snapshot — it is a recognition marker, not error context.
		Object.defineProperty(this, NARROW_ERROR_BRAND, {
			value: true,
			enumerable: false,
			writable: false,
			configurable: false,
		});
		// Restores the prototype chain when this file is downlevelled to ES5 by a
		// consumer's build, where `extends Error` otherwise breaks `instanceof`.
		Object.setPrototypeOf(this, NarrowError.prototype);
	}
}

/**
 * Recognize a {@link NarrowError} — including one thrown by a *different* copy
 * of this package or from another realm (an iframe, a `vm` context, a worker),
 * where `instanceof` returns `false` even though the class is the same code.
 *
 * **When to use**
 *
 * Use as the first line of every `catch` block that wraps a call into this
 * module, so you handle the failures you caused and rethrow the ones you did
 * not.
 *
 * **Details**
 *
 * The fallback is a duck-type on `name` plus a string `message`, which is why
 * {@link NarrowError} assigns its `name` explicitly. Implemented inline rather
 * than by importing a generic `isError` guard, so this module's only dependency
 * edge stays `predicate.ts`.
 *
 * A **subclass** overwrites `name` with its own — `UnhandledTagError` from
 * `@resq-systems/types/union` does exactly that — so the name check alone would
 * miss every descendant that crossed a realm. The registry-symbol brand stamped
 * by the constructor is checked first and covers them all, which is what makes
 * "one `catch` clause for everything this module throws" true off-realm as well
 * as on it.
 *
 * **Gotchas**
 *
 * {@link assert} and {@link assertExists} (the `@resq-systems/helpers`
 * compatibility exports) throw a plain `Error`, and `brandRefiner(...).from`
 * throws a `TypeError`; neither is a `NarrowError` and neither is recognized
 * here. Use {@link invariant} and {@link ensureDefined} for the structured
 * variants.
 *
 * **Example** (Handling ours, rethrowing theirs)
 *
 * ```ts doctest
 * import { isPlainObject } from "@resq-systems/types/guards";
 * import { ensure, isNarrowError } from "@resq-systems/types/narrow";
 *
 * function readBody(body: unknown): string {
 *   try {
 *     ensure(body, isPlainObject, "body must be an object");
 *     return "ok";
 *   } catch (error) {
 *     if (isNarrowError(error)) return error.message;
 *     throw error; // ✓ never swallow errors you did not cause
 *   }
 * }
 *
 * const good = readBody({ id: 1 }); // => "ok"
 * const bad = readBody("nope"); // => "body must be an object"
 * ```
 *
 * @param value - Any caught value.
 * @returns `true` when `value` is a `NarrowError` (or a cross-realm twin).
 *
 * @see {@link NarrowError}
 * @category guards
 * @since 0.2.0
 */
export const isNarrowError: (value: unknown) => value is NarrowError = (
	value: unknown,
): value is NarrowError => {
	if (value instanceof NarrowError) {
		return true;
	}
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const candidate = value as { readonly name?: unknown; readonly message?: unknown };
	if (typeof candidate.message !== "string") {
		return false;
	}
	return NARROW_ERROR_BRAND in value || candidate.name === "NarrowError";
};

//#endregion

//#region Types

/**
 * The type of an assertion function, and **the antidote to TS2775**.
 *
 * **When to use**
 *
 * Use as the annotation on every `const` that holds an assertion — in practice,
 * on every result of {@link assertGuard}. Without it the assertion still runs and
 * still throws, but the call site narrows nothing.
 *
 * **Details**
 *
 * TypeScript refuses to apply assertion-signature narrowing at a call site
 * unless every name in the call target chain was declared with an explicit type
 * annotation. A `const` holding an assertion therefore narrows *nothing* until
 * you annotate it — and the error surfaces in consumer code, not here. This is
 * that annotation.
 *
 * The un-annotated form is not a silent downgrade; it is error TS2775
 * (*"Assertions require every name in the call target to be declared with an
 * explicit type annotation"*) raised on the call itself:
 *
 * ```ts
 * const broken = assertGuard(isString); // ✗ no annotation
 * broken(raw); // ✗ TS2775 — and `raw` stays `unknown`
 * ```
 *
 * **Example** (Annotating the const so narrowing survives)
 *
 * ```ts doctest
 * import { isString } from "@resq-systems/types/guards";
 * import { type Assertion, assertGuard } from "@resq-systems/types/narrow";
 *
 * const assertString: Assertion<unknown, string> = assertGuard(isString);
 *
 * const raw: unknown = "hello";
 * assertString(raw);
 * const shouted = raw.toUpperCase(); // => "HELLO"
 * ```
 *
 * @typeParam A - The input (wide) type.
 * @typeParam B - The narrowed type, a subtype of `A`.
 *
 * @see {@link assertGuard}
 * @see {@link ensure} — needs no annotation, because it returns a value.
 * @category models
 * @since 0.2.0
 */
export type Assertion<A, B extends A> = (value: A) => asserts value is B;

/**
 * The discriminated result of a non-throwing narrow, returned by {@link parse}.
 *
 * **When to use**
 *
 * Use as the annotation when you pass a {@link parse} result across a function
 * boundary, or when a function of your own wants to hand back the same
 * ok-or-error shape. Supply the second type argument only when the failure
 * branch carries something other than a {@link NarrowError}.
 *
 * **Details**
 *
 * Discriminates on the literal `ok` field, so a plain `if (result.ok)` narrows
 * both branches: the success arm exposes `value`, the failure arm exposes
 * `error`, and neither exposes the other.
 *
 * `E` defaults to {@link NarrowError}, so the one-argument spelling
 * `NarrowResult<B>` means exactly what it always did and {@link parse}'s return
 * type is unchanged. The parameter exists so that **this package has one
 * ok-or-error envelope rather than two**: the `./filter` module's `Filter`
 * returns a failure branch typed as the rejected *input* rather than an error,
 * and it reuses this type instead of introducing a parallel one.
 *
 * The field names are part of that contract. The failure slot stays `error`
 * even when it carries a rejection payload rather than an `Error` — renaming it
 * to `failure` for the parameterized case would be a second envelope through the
 * back door, and would break structural interop with what {@link parse} returns.
 * Use `mapFail` from `./filter` to turn a rejection payload into a real
 * {@link NarrowError} when one is wanted.
 *
 * Defined here rather than reusing `@resq-systems/helpers`' `Result`: this
 * package is the foundation and must stay zero-dependency — the dependency edge
 * runs from `helpers` to `types`, never back. (That `Result` is itself already
 * deprecated and slated for removal, so this consolidates toward one shape
 * rather than adding another.)
 *
 * **Example** (Defaulting off the discriminant)
 *
 * ```ts doctest
 * import { isString } from "@resq-systems/types/guards";
 * import { type NarrowResult, parse } from "@resq-systems/types/narrow";
 *
 * const input: unknown = 42;
 *
 * const result: NarrowResult<string> = parse(input, isString);
 * const value = result.ok ? result.value : "fallback"; // => "fallback"
 * ```
 *
 * **Example** (A failure branch that is not an error)
 *
 * ```ts doctest
 * import type { NarrowResult } from "@resq-systems/types/narrow";
 *
 * // The failure arm carries the rejected input, which is what `./filter` produces.
 * const evenOnly = (input: number): NarrowResult<number, number> =>
 *   input % 2 === 0 ? { ok: true, value: input } : { ok: false, error: input };
 *
 * const kept = evenOnly(4);
 * const keptLabel = kept.ok ? `kept ${kept.value}` : `rejected ${kept.error}`; // => "kept 4"
 *
 * const dropped = evenOnly(7);
 * const droppedLabel = dropped.ok ? `kept ${dropped.value}` : `rejected ${dropped.error}`; // => "rejected 7"
 * ```
 *
 * @typeParam B - The narrowed success type.
 * @typeParam E - The failure payload type. Defaults to {@link NarrowError}, so
 *   `NarrowResult<B>` is unchanged from the single-parameter form.
 *
 * @see {@link parse}
 * @see {@link NarrowError}
 * @category utility types
 * @since 0.2.0
 */
export type NarrowResult<B, E = NarrowError> =
	| { readonly ok: true; readonly value: B }
	| { readonly ok: false; readonly error: E };

//#endregion

//#region Internal

/**
 * Drop the throwing helper's own frame from a V8 stack trace, so the top frame
 * of `error.stack` is the caller's line rather than this file's.
 *
 * `Error.captureStackTrace` is a V8 extension and is not declared under this
 * package's `types: []` compiler configuration, so it is reached through a
 * narrow structural cast and a `typeof` check — on JavaScriptCore or
 * SpiderMonkey the lookup simply misses and the stack is left alone. This
 * reproduces the observable behavior of `@resq-systems/helpers`'
 * `omitFromStackTrace` wrapper without depending on that package.
 *
 * @internal
 */
function trimStackFrame(error: Error, frame: object): void {
	const host = Error as unknown as {
		readonly captureStackTrace?: (targetObject: object, constructorOpt?: object) => void;
	};
	if (typeof host.captureStackTrace === "function") {
		host.captureStackTrace(error, frame);
	}
}

/**
 * The failure message to use when the caller supplied none. Shared by
 * {@link ensure} and {@link parse} so the throwing and non-throwing halves of the
 * API cannot drift apart in wording.
 *
 * @internal
 */
function defaultMessage(expected: string | undefined): string {
	return expected === undefined ? "Value did not satisfy the guard" : `Expected ${expected}`;
}

//#endregion

//#region Returning narrowers

/**
 * Narrow a value through a guard and **return it**, throwing a
 * {@link NarrowError} when the guard rejects.
 *
 * **When to use**
 *
 * Use as the default way to turn a guard into control flow. Reach for an
 * `asserts` function only when there is no value to bind — this is the primary
 * API of the module and the one to teach first.
 *
 * **Details**
 *
 * It returns rather than asserts, and that is the whole design. An
 * `asserts value is T` signature makes TypeScript discard the narrowing at the
 * call site unless *every* name in the call target chain carries an explicit
 * type annotation (TS2775) — a constraint that is satisfied inside this package
 * and routinely violated in consumer code, so the failure lands on someone whose
 * CI you do not run. A value-returning narrower cannot trip that rule at all, it
 * works in expression position where a statement assertion cannot go, and it
 * composes into pipelines and `.map` callbacks.
 *
 * {@link parse} takes **identical parameters in the same order**, so swapping one
 * for the other changes the control flow and nothing else: `ensure` throws where
 * `parse` returns `{ ok: false, error }`, and both produce an identically-shaped
 * {@link NarrowError} from the same `message`/`expected` defaulting.
 *
 * **Example** (Validating an environment variable at the boundary)
 *
 * ```ts doctest
 * import { isNumericString } from "@resq-systems/types/guards";
 * import { ensure } from "@resq-systems/types/narrow";
 *
 * const raw: unknown = "8080";
 *
 * const port = ensure(raw, isNumericString, "PORT must be numeric");
 * const parsed = Number(port); // => 8080
 * ```
 *
 * @typeParam A - The input (wide) type.
 * @typeParam B - The narrowed type.
 * @param value - The value to check.
 * @param guard - The refinement that decides.
 * @param message - Optional message for the thrown error. The default never
 *   interpolates `value`.
 * @param expected - Optional description of the expected shape, recorded on
 *   `error.expected`. Supplied without a `message`, it also becomes the message
 *   (`Expected ${expected}`) — the same defaulting {@link parse} uses, so the two
 *   halves of this API produce identically-shaped errors.
 * @returns `value`, typed as `B`.
 * @throws {NarrowError} When `guard(value)` is `false`.
 *
 * @see {@link parse} — same parameters, returns instead of throwing.
 * @see {@link tryNarrow} — same check, `undefined` instead of an error.
 * @see {@link assertBy} — the statement-position form.
 * @category refinements
 * @since 0.2.0
 */
export function ensure<A, B extends A>(
	value: A,
	guard: Refinement<A, B>,
	message?: string,
	expected?: string,
): B {
	if (guard(value)) {
		return value;
	}
	const error = new NarrowError(message ?? defaultMessage(expected), { value, expected });
	trimStackFrame(error, ensure);
	throw error;
}

/**
 * Expression-position non-nullish check: return the value, or throw a
 * {@link NarrowError}.
 *
 * **When to use**
 *
 * Use wherever you would otherwise reach for the `!` operator — after a
 * `Map.get`, an array index under `noUncheckedIndexedAccess`, or an optional
 * chain — when the absent case is a bug rather than expected traffic.
 *
 * **Details**
 *
 * The honest replacement for `!`, which asserts without checking, and for
 * {@link assertExists}, which throws a bare `Error` with no structured context.
 *
 * Uses `Exclude<A, null | undefined>` rather than `NonNullable<A>` to match
 * `isNonNullish`'s behavior — the two differ when `A` is `unknown`.
 *
 * **Example** (Replacing a non-null assertion after a cache read)
 *
 * ```ts doctest
 * import { ensureDefined } from "@resq-systems/types/narrow";
 *
 * const cache = new Map<string, { readonly name: string }>([["u1", { name: "ada" }]]);
 *
 * // The bound type is the record, not `record | undefined` — and it checked.
 * const user = ensureDefined(cache.get("u1"), "no cached user for u1");
 * const name = user.name; // => "ada"
 * ```
 *
 * @typeParam A - The input type.
 * @param value - The possibly-nullish value.
 * @param message - Optional message for the thrown error.
 * @returns `value` with `null` and `undefined` excluded.
 * @throws {NarrowError} When `value` is `null` or `undefined`.
 *
 * @see {@link assertNonNullish} — the statement-position form.
 * @see {@link assertExists} — the back-compat form, which throws a plain `Error`.
 * @category refinements
 * @since 0.2.0
 */
export function ensureDefined<A>(value: A, message?: string): Exclude<A, null | undefined> {
	if (value === null || value === undefined) {
		const error = new NarrowError(message ?? "Value is null or undefined", { value });
		trimStackFrame(error, ensureDefined);
		throw error;
	}
	return value as Exclude<A, null | undefined>;
}

/**
 * Narrow without throwing, returning a discriminated {@link NarrowResult}.
 *
 * **When to use**
 *
 * Use at a boundary where a bad value is *expected traffic* rather than a bug —
 * a webhook body, a query string, a pasted config — and you intend to answer
 * with a 400 rather than a stack trace.
 *
 * **Details**
 *
 * The zero-dependency shape of zod's `safeParse`. It takes **identical
 * parameters in the same order** as {@link ensure}, so swapping one for the
 * other changes only the control flow: the same `message`/`expected` defaulting
 * produces the same {@link NarrowError}, delivered on `result.error` instead of
 * thrown.
 *
 * That symmetry is why the third parameter is the **message**, matching
 * {@link ensure} and every other `(…, string)` thrower in this module. An earlier
 * draft made it `expected`, which meant the one call you are most likely to swap
 * — `ensure` ↔ `parse` — silently changed what the string meant, with no compile
 * error because both are `string | undefined` in the same position.
 *
 * The `./filter` module expresses the same rejection through the same
 * {@link NarrowResult} envelope, and this function is pinned to it by a stated
 * identity rather than by shared code:
 *
 *     parse(value, guard, message, expected)
 *       ≡ mapFail(
 *           fromPredicate(guard),
 *           (input) => new NarrowError(
 *             message ?? (expected === undefined
 *               ? "Value did not satisfy the guard"
 *               : `Expected ${expected}`),
 *             { value: input, expected },
 *           ),
 *         )(value)
 *
 * The identity is deliberately *not* the implementation. The import edge runs
 * one way — `filter.ts` imports the {@link NarrowResult} **type** from here and
 * nothing from `filter.ts` is imported back — because `mapFail` is a value, and
 * a mutual import between two emitted modules under `unbundle: true` is a real
 * circular ESM import rather than a bundler artifact. `filter.test.ts` pins the
 * identity over a case table instead, which additionally catches drift in the
 * default message wording that a shared body would silently permit.
 *
 * **Example** (Answering a bad webhook body instead of throwing)
 *
 * ```ts doctest
 * import { isPlainObject } from "@resq-systems/types/guards";
 * import { parse } from "@resq-systems/types/narrow";
 *
 * const body: unknown = { event: "ping" };
 * const parsed = parse(body, isPlainObject, undefined, "WebhookPayload");
 * const status = parsed.ok ? "accepted" : parsed.error.message; // => "accepted"
 *
 * const junk: unknown = "nope";
 * const rejected = parse(junk, isPlainObject, undefined, "WebhookPayload");
 * const reason = rejected.ok ? "accepted" : rejected.error.message; // => "Expected WebhookPayload"
 * ```
 *
 * @typeParam A - The input (wide) type.
 * @typeParam B - The narrowed type.
 * @param value - The value to check.
 * @param guard - The refinement that decides.
 * @param message - Optional message for the returned error. The default never
 *   interpolates `value`.
 * @param expected - Optional description of the expected shape, recorded on
 *   `error.expected`. Supplied without a `message`, it also becomes the message
 *   (`Expected ${expected}`).
 * @returns `{ ok: true, value }` or `{ ok: false, error }`. Never throws.
 *
 * @see {@link ensure} — same parameters, throws instead of returning.
 * @see {@link NarrowResult}
 * @see {@link tryNarrow} — when the reason for failure is irrelevant.
 * @category refinements
 * @since 0.2.0
 */
export function parse<A, B extends A>(
	value: A,
	guard: Refinement<A, B>,
	message?: string,
	expected?: string,
): NarrowResult<B> {
	if (guard(value)) {
		return { ok: true, value };
	}
	return {
		ok: false,
		error: new NarrowError(message ?? defaultMessage(expected), { value, expected }),
	};
}

/**
 * Narrow or get `undefined`.
 *
 * **When to use**
 *
 * Use when the *reason* for failure is irrelevant and you just want a default —
 * it pairs directly with `??`, which {@link parse}'s result object does not.
 *
 * **Details**
 *
 * Lighter than {@link parse} for that common case: no allocation of a result
 * envelope, no {@link NarrowError} constructed for a value you were always going
 * to replace.
 *
 * The `./filter` module's point-free equivalent is
 * `toUndefined(fromPredicate(guard))`, giving the identity:
 *
 *     tryNarrow(value, guard) ≡ toUndefined(fromPredicate(guard))(value)
 *
 * Both spellings exist on purpose. This one takes the value first, allocates
 * nothing, and pairs with `??`; the filter form is a deferred function value you
 * hand to a pipeline. As with {@link parse}, the identity is pinned by a case
 * table in `filter.test.ts` rather than by a shared implementation, so the edge
 * from `filter.ts` into this module stays type-only.
 *
 * **Example** (Falling back when stored input no longer matches the union)
 *
 * ```ts doctest
 * import { tryNarrow } from "@resq-systems/types/narrow";
 *
 * type Theme = "light" | "dark";
 * const isTheme = (value: unknown): value is Theme =>
 *   value === "light" || value === "dark";
 *
 * const stored: unknown = "solarized";
 * const theme = tryNarrow(stored, isTheme) ?? "dark"; // => "dark"
 * ```
 *
 * @typeParam A - The input (wide) type.
 * @typeParam B - The narrowed type.
 * @param value - The value to check.
 * @param guard - The refinement that decides.
 * @returns `value` as `B`, or `undefined`. Never throws.
 *
 * @see {@link parse} — when you need the reason.
 * @see {@link ensure} — when failure should stop the program.
 * @category refinements
 * @since 0.2.0
 */
export function tryNarrow<A, B extends A>(value: A, guard: Refinement<A, B>): B | undefined {
	return guard(value) ? value : undefined;
}

/**
 * All-or-nothing homogeneity check that narrows the caller's **own array in
 * place** — a type predicate on the parameter, not a new allocation and not a
 * sentinel return.
 *
 * **When to use**
 *
 * Use when an array must be entirely of one type before you touch it, and a
 * partially-valid array is a failure rather than something to salvage.
 *
 * **Details**
 *
 * Contrast with `values.filter(guard)`, which silently discards the elements
 * that failed and hands you a shorter array you did not ask for. Here, one bad
 * element means `false` and you still hold the original.
 *
 * An empty array satisfies any guard (vacuous truth), matching
 * `Array.prototype.every`.
 *
 * Filed under guards rather than refinements because it returns a type predicate
 * on its parameter (`values is readonly B[]`), so it belongs in an `if` — unlike
 * the value-returning narrowers around it.
 *
 * **Example** (Accepting a JSON array only if it is homogeneous)
 *
 * ```ts doctest
 * import { isString } from "@resq-systems/types/guards";
 * import { narrowAll } from "@resq-systems/types/narrow";
 *
 * const raw: readonly unknown[] = ["a", "b", "c"];
 *
 * // `raw` is `readonly string[]` inside the true branch.
 * const joined = narrowAll(raw, isString) ? raw.join(",") : "mixed"; // => "a,b,c"
 * ```
 *
 * @typeParam A - The element type of the input array.
 * @typeParam B - The narrowed element type.
 * @param values - The array to check.
 * @param guard - The refinement applied to every element.
 * @returns `true` when every element satisfies `guard`, narrowing `values` to
 *   `readonly B[]` in the calling scope.
 *
 * @see {@link ensure}
 * @see {@link tryNarrow}
 * @category guards
 * @since 0.2.0
 */
export function narrowAll<A, B extends A>(
	values: readonly A[],
	guard: Refinement<A, B>,
): values is readonly B[] {
	for (const value of values) {
		if (!guard(value)) {
			return false;
		}
	}
	return true;
}

/**
 * Retype a value with **no runtime check whatsoever**.
 *
 * **When to use**
 *
 * Use only at a boundary already validated by other means — an Effect schema
 * decode, a database column contract, a checksum — where re-validating would be
 * pure cost. Reach for {@link ensure} first.
 *
 * **Details**
 *
 * The deliberate escape hatch, and the point is that it is greppable: one named,
 * documented, searchable hole beats `as` casts scattered across a codebase where
 * no tool can tell an intentional bypass from a lazy one. Mirrors `unsafeBrand`'s
 * naming for exactly that reason.
 *
 * **Gotchas**
 *
 * Nothing here can fail, so nothing here can warn you. A wrong type argument
 * propagates as fact through every downstream inference.
 *
 * **Example** (Trusting a driver that already guarantees the row shape)
 *
 * ```ts doctest
 * import { unsafeNarrow } from "@resq-systems/types/narrow";
 *
 * interface UserRow {
 *   readonly id: string;
 * }
 *
 * const rows = unsafeNarrow<readonly UserRow[]>([{ id: "u1" }]);
 * const first = rows[0]?.id; // => "u1"
 * ```
 *
 * @typeParam B - The type to claim.
 * @param value - The unchecked value.
 * @returns `value`, typed as `B`.
 *
 * @see {@link ensure} — the checked form.
 * @category refinements
 * @since 0.2.0
 */
export function unsafeNarrow<B>(value: unknown): B {
	return value as B;
}

//#endregion

//#region Statement assertions

/**
 * Turn any guard into an assertion: throws a {@link NarrowError} when the guard
 * rejects, and narrows `value` in the calling scope when it does not.
 *
 * **When to use**
 *
 * Use when there is no value to bind — the subject is already in a `const` or a
 * parameter and you only want to widen what the compiler knows about it. Prefer
 * {@link ensure} whenever you can use a return value.
 *
 * **Details**
 *
 * Declared as a `function` (never an arrow const) so the *definition* side can
 * never lose the assertion signature; see {@link Assertion} for the TS2775 rule
 * this dodges. {@link ensure} is immune to that rule by construction, which is
 * why it, not this, is the primary API.
 *
 * **Example** (Narrowing a config object in statement position)
 *
 * ```ts doctest
 * import { isPlainObject } from "@resq-systems/types/guards";
 * import { assertBy } from "@resq-systems/types/narrow";
 *
 * const config: unknown = { port: 8080 };
 *
 * assertBy(config, isPlainObject, "config must be an object");
 * const port = config["port"]; // => 8080
 * ```
 *
 * @typeParam A - The input (wide) type.
 * @typeParam B - The narrowed type.
 * @param value - The value to check.
 * @param guard - The refinement that decides.
 * @param message - Optional message for the thrown error.
 * @throws {NarrowError} When `guard(value)` is `false`.
 *
 * @see {@link ensure} — the value-returning form, and the one to prefer.
 * @see {@link assertGuard} — when you want a reusable assertion.
 * @category assertions
 * @since 0.2.0
 */
export function assertBy<A, B extends A>(
	value: A,
	guard: Refinement<A, B>,
	message?: string,
): asserts value is B {
	if (!guard(value)) {
		const error = new NarrowError(message ?? "Value did not satisfy the guard", { value });
		trimStackFrame(error, assertBy);
		throw error;
	}
}

/**
 * Assert that a value is not `undefined`, keeping `null` — the exact mirror of
 * `isDefined`.
 *
 * **When to use**
 *
 * Use where `undefined` means "absent" but `null` is a legitimate stored value:
 * right after a `Map.get`, an array index under `noUncheckedIndexedAccess`, or an
 * optional chain.
 *
 * **Details**
 *
 * This is the highest-traffic assertion in application code, and the narrowing is
 * `Exclude<A, undefined>` — `null` survives. Use {@link assertNonNullish} when
 * both must go.
 *
 * **Example** (Popping a queue that must not be empty)
 *
 * ```ts doctest
 * import { assertDefined } from "@resq-systems/types/narrow";
 *
 * const queue: readonly string[] = ["build", "test"];
 *
 * const first = queue[0];
 * assertDefined(first, "queue was empty");
 * const stage = first.toUpperCase(); // => "BUILD"
 * ```
 *
 * @typeParam A - The input type.
 * @param value - The value to check.
 * @param message - Optional message for the thrown error.
 * @throws {NarrowError} When `value` is `undefined`.
 *
 * @see {@link assertNonNullish} — when `null` must go too.
 * @see {@link ensureDefined} — the value-returning form.
 * @category assertions
 * @since 0.2.0
 */
export function assertDefined<A>(
	value: A,
	message?: string,
): asserts value is Exclude<A, undefined> {
	if (value === undefined) {
		const error = new NarrowError(message ?? "Value is undefined", { value });
		trimStackFrame(error, assertDefined);
		throw error;
	}
}

/**
 * Assert that a value is neither `null` nor `undefined` — the `!` operator with
 * an actual runtime check and a message you wrote.
 *
 * **When to use**
 *
 * Use when both absent forms are failures: a DOM query that must have matched, a
 * required environment variable, a foreign key that must have resolved.
 *
 * **Details**
 *
 * Uses `Exclude<A, null | undefined>` rather than `NonNullable<A>` to stay
 * consistent with `isNonNullish`; the two differ when `A` is `unknown`.
 *
 * **Example** (Asserting a lookup succeeded)
 *
 * ```ts doctest
 * import { assertNonNullish } from "@resq-systems/types/narrow";
 *
 * const lookup = new Map<string, string>([["#root", "<main>"]]);
 * const element = lookup.get("#root");
 *
 * assertNonNullish(element, "#root is missing from the document");
 * const markup = element.concat("</main>"); // => "<main></main>"
 * ```
 *
 * @typeParam A - The input type.
 * @param value - The value to check.
 * @param message - Optional message for the thrown error.
 * @throws {NarrowError} When `value` is `null` or `undefined`.
 *
 * @see {@link assertDefined} — when `null` is a legitimate value.
 * @see {@link ensureDefined} — the value-returning form.
 * @category assertions
 * @since 0.2.0
 */
export function assertNonNullish<A>(
	value: A,
	message?: string,
): asserts value is Exclude<A, null | undefined> {
	if (value === null || value === undefined) {
		const error = new NarrowError(message ?? "Value is null or undefined", { value });
		trimStackFrame(error, assertNonNullish);
		throw error;
	}
}

/**
 * Assert an arbitrary condition.
 *
 * **When to use**
 *
 * Use for the checks no guard can express — a range, a relationship between two
 * bindings, a state-machine precondition — and whenever you want the *expression
 * you wrote* narrowed rather than some other binding.
 *
 * **Details**
 *
 * Because the signature is `asserts condition` with no `is`, TypeScript narrows
 * **the expression you passed** — something the guard-based assertions
 * structurally cannot do:
 *
 * ```ts
 * invariant(x !== null); // narrows x, not some other binding
 * ```
 *
 * The `tiny-invariant` pattern with zero dependencies and a structured error.
 *
 * **Gotchas**
 *
 * The check is falsy, not nullish: `invariant(0)` and `invariant("")` both throw.
 *
 * **Example** (Guarding an index and its lookup in one function)
 *
 * ```ts doctest
 * import { invariant } from "@resq-systems/types/narrow";
 *
 * function at(items: readonly string[], index: number): string {
 *   invariant(index >= 0 && index < items.length, "index out of range");
 *   const item = items[index];
 *   invariant(item !== undefined);
 *   return item; // ✓ `string`, not `string | undefined`
 * }
 *
 * const second = at(["a", "b"], 1); // => "b"
 * ```
 *
 * @param condition - The condition that must hold.
 * @param message - Optional message for the thrown error.
 * @throws {NarrowError} When `condition` is falsy.
 *
 * @see {@link assert} — the back-compat form, which throws a plain `Error`.
 * @see {@link assertBy} — when a guard already expresses the check.
 * @category assertions
 * @since 0.2.0
 */
export function invariant(condition: unknown, message?: string): asserts condition {
	if (!condition) {
		const error = new NarrowError(message ?? "Invariant violated", { value: condition });
		trimStackFrame(error, invariant);
		throw error;
	}
}

/**
 * Build a reusable assertion from a guard.
 *
 * **When to use**
 *
 * Use when the same guard is asserted in many places and you want one named
 * assertion with one message, instead of repeating {@link assertBy} with the same
 * two arguments everywhere.
 *
 * **Details**
 *
 * Filed under constructors, not assertions: it does not assert anything itself —
 * it *returns* an {@link Assertion} built from something that is not one.
 *
 * **Gotchas**
 *
 * **Read this before using it.** TypeScript applies assertion-signature
 * narrowing only when every name in the call target chain carries an explicit
 * type annotation (error TS2775, *"Assertions require every name in the call
 * target to be declared with an explicit type annotation"*). The value this
 * function returns is stored in a `const`, so **the `const` must be annotated**
 * with {@link Assertion} — otherwise the call site is itself an error and, once
 * suppressed, narrows nothing. Worse, the failure appears in consumer code, so a
 * green CI here proves nothing about it.
 *
 * **Example** (The annotation that makes it work)
 *
 * ```ts doctest
 * import { isString } from "@resq-systems/types/guards";
 * import { type Assertion, assertGuard } from "@resq-systems/types/narrow";
 *
 * const assertString: Assertion<unknown, string> = assertGuard(isString);
 *
 * const raw: unknown = "hello";
 * assertString(raw);
 * const length = raw.length; // => 5
 * ```
 *
 * **Example** (The mistake this doc exists to prevent)
 *
 * ```ts doctest
 * import { isString } from "@resq-systems/types/guards";
 * import { assertGuard } from "@resq-systems/types/narrow";
 *
 * const broken = assertGuard(isString); // ✗ un-annotated const
 * const raw: unknown = "hello";
 *
 * // @ts-expect-error TS2775 — assertions require every name in the call target
 * // to be declared with an explicit type annotation.
 * broken(raw);
 *
 * // The check ran, but `raw` was never narrowed: `raw.length` here is an error.
 * const kind = typeof raw; // => "string"
 * ```
 *
 * @typeParam A - The input (wide) type.
 * @typeParam B - The narrowed type.
 * @param guard - The refinement that decides.
 * @param message - Optional message for every failure of this assertion.
 * @returns An {@link Assertion} that throws a {@link NarrowError} on rejection.
 *
 * @see {@link Assertion}
 * @see {@link ensure} — no annotation required, because it returns a value.
 * @category constructors
 * @since 0.2.0
 */
export function assertGuard<A, B extends A>(
	guard: Refinement<A, B>,
	message?: string,
): Assertion<A, B> {
	const assertion: Assertion<A, B> = (value: A): asserts value is B => {
		if (!guard(value)) {
			const error = new NarrowError(message ?? "Value did not satisfy the guard", { value });
			trimStackFrame(error, assertion);
			throw error;
		}
	};
	return assertion;
}

//#endregion

//#region Helpers compatibility

/**
 * Assert that a value is truthy. Behavior-compatible with
 * `@resq-systems/helpers`' `assert`.
 *
 * **When to use**
 *
 * Use only while migrating a call site off `@resq-systems/helpers`. New code
 * should prefer {@link invariant}, which is the same shape with a structured
 * error.
 *
 * **Details**
 *
 * The helpers behavior is preserved exactly so the migration is a pure
 * re-export: the message is `message || "Assertion Error"` with `||` semantics,
 * so an empty-string message still falls back, and the test is falsy rather than
 * nullish.
 *
 * **Gotchas**
 *
 * It throws a **plain `Error`**, not a {@link NarrowError} — a subclass would
 * change `err.name` and break any existing `instanceof` or `name` check in the
 * code being migrated. So {@link isNarrowError} returns `false` for everything
 * this function throws, and none of the structured context (`value`, `expected`,
 * `path`) is available.
 *
 * **Example** (Migrating a truthiness check)
 *
 * ```ts doctest
 * import { assert } from "@resq-systems/types/narrow";
 *
 * const session: { readonly userId: string } | undefined = { userId: "u1" };
 *
 * assert(session, "no session");
 * const userId = session.userId; // => "u1"
 * ```
 *
 * @param value - The value that must be truthy.
 * @param message - Optional message. An empty string falls back to the default.
 * @throws {Error} When `value` is falsy.
 *
 * @see {@link invariant} — the same shape with a {@link NarrowError}.
 * @category assertions
 * @since 0.2.0
 * @deprecated Migration shim for `@resq-systems/helpers`. Unlike every other
 *   assertion in this module it throws a plain `Error`, not a
 *   {@link NarrowError}, so `isNarrowError` returns `false` for it and a
 *   structured `catch` branch silently never runs. Use {@link invariant}, which
 *   has the same signature and throws a {@link NarrowError}. Reachable only via
 *   the `@resq-systems/types/narrow` subpath, never the package barrel.
 */
export function assert(value: unknown, message?: string): asserts value {
	if (!value) {
		const error = new Error(message || "Assertion Error");
		trimStackFrame(error, assert);
		throw error;
	}
}

/**
 * Return a value, throwing when it is `null` or `undefined`. Behavior-compatible
 * with `@resq-systems/helpers`' `assertExists`.
 *
 * **When to use**
 *
 * Use only while migrating a call site off `@resq-systems/helpers`. New code
 * should prefer {@link ensureDefined}, which throws a {@link NarrowError}
 * carrying the offending value.
 *
 * **Details**
 *
 * The helpers behavior is preserved exactly: the loose `value == null` test (so
 * `0`, `""`, and `false` pass), the message `message ?? "value must be defined"`
 * with `??` semantics, and a `NonNullable<T>` return.
 *
 * Declaring it as a real generic `function` also fixes a quirk of the helpers
 * version, whose `omitFromStackTrace` wrapper collapsed the inferred generic —
 * strictly an improvement, and one no caller can observe as a break.
 *
 * **Gotchas**
 *
 * Despite the `assert` prefix it is **not** an `asserts` signature: it *returns*
 * `NonNullable<T>` and narrows nothing at the call site, which is why it is filed
 * under refinements rather than assertions. TS2775 is therefore irrelevant to it —
 * but so is calling it as a bare statement, which checks the value and then
 * discards the only thing it produced.
 *
 * It also throws a **plain `Error`**, not a {@link NarrowError}, for the same
 * back-compat reason as {@link assert}: a subclass would change `err.name`. So
 * {@link isNarrowError} does not recognize its failures either.
 *
 * **Example** (Reading a config value, and the falsy-but-present case)
 *
 * ```ts doctest
 * import { assertExists } from "@resq-systems/types/narrow";
 *
 * const config: { readonly port?: number; readonly retries?: number } = {
 *   port: 8080,
 *   retries: 0,
 * };
 *
 * const port = assertExists(config.port); // => 8080
 * const retries = assertExists(config.retries); // => 0
 * ```
 *
 * @typeParam T - The input type.
 * @param value - The possibly-nullish value.
 * @param message - Optional message for the thrown error.
 * @returns `value` as `NonNullable<T>`.
 * @throws {Error} When `value` is `null` or `undefined`.
 *
 * @see {@link ensureDefined} — the structured form.
 * @see {@link assertNonNullish} — the true `asserts` form.
 * @category refinements
 * @since 0.2.0
 * @deprecated Migration shim for `@resq-systems/helpers`. It throws a plain
 *   `Error` rather than a {@link NarrowError}, so `isNarrowError` does not
 *   recognize it. Use {@link ensureDefined}, which returns the value the same
 *   way and throws a {@link NarrowError}. Reachable only via the
 *   `@resq-systems/types/narrow` subpath, never the package barrel.
 */
export function assertExists<T>(value: T, message?: string): NonNullable<T> {
	// `value == null` is equivalent to `value === null || value === undefined`.
	if (value == null) {
		const error = new Error(message ?? "value must be defined");
		trimStackFrame(error, assertExists);
		throw error;
	}
	return value as NonNullable<T>;
}

//#endregion
