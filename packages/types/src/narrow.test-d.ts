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
 * @fileoverview Type-level tests for `narrow.ts`. Every `Expect<...>` line is a
 * compile-time assertion, and so is every helper body below — one that fails to
 * narrow simply does not compile. Run via `vitest --typecheck` (wired into this
 * package's `test` script).
 */

import { test } from "vitest";
import {
	type Assertion,
	type NarrowError,
	type NarrowResult,
	assert,
	assertBy,
	type assertExists,
	assertDefined,
	assertGuard,
	assertNonNullish,
	ensure,
	type ensureDefined,
	invariant,
	isNarrowError,
	narrowAll,
	parse,
	tryNarrow,
	type unsafeNarrow,
} from "./narrow.js";
import type { Equal, Expect, IsAny } from "./testing.js";

const isString = (value: unknown): value is string => typeof value === "string";

type Animal = { kind: "cat" | "dog" };
type Cat = { kind: "cat" };
const isCat = (animal: Animal): animal is Cat => animal.kind === "cat";

declare const wide: unknown;
declare const animal: Animal;

// --- returning narrowers: exact result types ----------------------------------
type _returning = [
	// ensure resolves to exactly `string` — not `unknown`, not a widened union.
	Expect<Equal<ReturnType<typeof ensure<unknown, string>>, string>>,
	Expect<Equal<IsAny<ReturnType<typeof ensure<unknown, string>>>, false>>,
	// ...and it works over a narrower domain than `unknown`.
	Expect<Equal<ReturnType<typeof ensure<Animal, Cat>>, Cat>>,
	// tryNarrow adds exactly one `undefined`, and no more.
	Expect<Equal<ReturnType<typeof tryNarrow<unknown, string>>, string | undefined>>,
	// unsafeNarrow hands back precisely what was asked for.
	Expect<Equal<ReturnType<typeof unsafeNarrow<readonly string[]>>, readonly string[]>>,
	// ensureDefined uses Exclude, which differs from NonNullable on `unknown`.
	Expect<Equal<ReturnType<typeof ensureDefined<string | null | undefined>>, string>>,
	Expect<Equal<ReturnType<typeof ensureDefined<unknown>>, Exclude<unknown, null | undefined>>>,
	// assertExists keeps helpers' NonNullable<T> return, verbatim.
	Expect<Equal<ReturnType<typeof assertExists<string | null | undefined>>, string>>,
	Expect<Equal<ReturnType<typeof assertExists<0 | undefined>>, 0>>,
];

// Inference (not explicit type arguments) must reach the same answers.
const _inferredEnsure = ensure(wide, isString);
const _inferredTry = tryNarrow(wide, isString);
const _inferredCat = ensure(animal, isCat);

type _inference = [
	Expect<Equal<typeof _inferredEnsure, string>>,
	Expect<Equal<typeof _inferredTry, string | undefined>>,
	Expect<Equal<typeof _inferredCat, Cat>>,
];

// --- parse: the discriminated result -------------------------------------------
function parsedValue(): string {
	const result = parse(wide, isString, "expected a string", "string");
	if (result.ok) {
		return result.value; // ✓ only compiles because `ok` discriminates
	}
	return result.error.message;
}

function parsedError(): NarrowError {
	const result = parse(wide, isString);
	if (result.ok) {
		throw new Error("unreachable");
	}
	return result.error;
}

type _parse = [
	Expect<Equal<ReturnType<typeof parse<unknown, string>>, NarrowResult<string>>>,
	Expect<Equal<ReturnType<typeof parsedValue>, string>>,
	Expect<Equal<ReturnType<typeof parsedError>, NarrowError>>,
	// The ok branch carries a value; the failure branch carries an error.
	Expect<Equal<Extract<NarrowResult<string>, { ok: true }>["value"], string>>,
	Expect<Equal<Extract<NarrowResult<string>, { ok: false }>["error"], NarrowError>>,
];

// --- NarrowResult: the defaulted failure parameter -------------------------------
// `NarrowResult` gained a second, defaulted type parameter so that `./filter` can
// reuse ONE envelope. The whole point is that nothing about the one-argument form
// moved, so the pre-change definition is spelled out here verbatim and pinned by
// `Equal` — structural drift in either arm then fails to compile.

type _NarrowResultBeforeTheChange<B> =
	| { readonly ok: true; readonly value: B }
	| { readonly ok: false; readonly error: NarrowError };

// A rejection payload that is not an error at all — the `./filter` shape.
declare const rejectedInput: NarrowResult<string, number>;

function narrowResultDiscriminates(): string {
	if (rejectedInput.ok) {
		return rejectedInput.value; // ✓ `value` only on the ok arm
	}
	return String(rejectedInput.error); // ✓ `error` only on the failure arm, typed `number`
}

// @ts-expect-error - a payload envelope is NOT a `NarrowResult<string>`; the
// default is a real constraint, not a formality.
const _wrongPayload: NarrowResult<string> = { ok: false, error: 42 };
void _wrongPayload;

// @ts-expect-error - arity is exactly 1-2. A third parameter appearing here would
// mean someone widened the envelope again, which is what this change exists to
// make unnecessary.
type _tooManyArguments = NarrowResult<string, number, boolean>;

type _narrowResultArity = [
	// The one-argument form is UNCHANGED.
	Expect<Equal<NarrowResult<string>, _NarrowResultBeforeTheChange<string>>>,
	Expect<Equal<NarrowResult<Cat>, _NarrowResultBeforeTheChange<Cat>>>,
	// ...which is to say the default really is `NarrowError`.
	Expect<Equal<NarrowResult<string>, NarrowResult<string, NarrowError>>>,
	// `parse`'s return type did not move either.
	Expect<Equal<ReturnType<typeof parse<unknown, string>>, _NarrowResultBeforeTheChange<string>>>,
	// The second parameter reaches only the failure arm.
	Expect<Equal<Extract<NarrowResult<string, number>, { ok: false }>["error"], number>>,
	Expect<Equal<Extract<NarrowResult<string, number>, { ok: true }>["value"], string>>,
	// Field names are part of the contract: `ok`/`value`/`error`, never `failure`.
	Expect<Equal<keyof Extract<NarrowResult<string, number>, { ok: false }>, "ok" | "error">>,
	Expect<Equal<keyof Extract<NarrowResult<string, number>, { ok: true }>, "ok" | "value">>,
	// Both arms stay readonly under the parameterized form.
	Expect<
		Equal<
			NarrowResult<string, number>,
			{ readonly ok: true; readonly value: string } | { readonly ok: false; readonly error: number }
		>
	>,
	// Discrimination survives a non-error payload.
	Expect<Equal<ReturnType<typeof narrowResultDiscriminates>, string>>,
	Expect<Equal<IsAny<Extract<NarrowResult<string, number>, { ok: false }>["error"]>, false>>,
	// The `@ts-expect-error` above is only meaningful if the alias still resolves.
	Expect<Equal<IsAny<_tooManyArguments>, false>>,
];

// --- statement assertions: the narrowing must actually happen -------------------
// Each body below returns the narrowed binding with NO return annotation, so the
// inferred return type IS the narrowed type — a lost or widened narrowing shows up
// as a failed Expect rather than as a silently passing test.

function afterAssertBy(value: unknown) {
	assertBy(value, isString);
	return value;
}

function afterAssertByOnSubtype(value: Animal) {
	assertBy(value, isCat);
	return value;
}

function afterAssertDefined(value: string | null | undefined) {
	assertDefined(value);
	return value;
}

function afterAssertNonNullish(value: string | null | undefined) {
	assertNonNullish(value);
	return value;
}

function afterInvariant(value: string | null) {
	// `asserts condition` narrows the EXPRESSION — no guard involved.
	invariant(value !== null);
	return value;
}

function afterInvariantOnIndex(items: readonly string[], index: number) {
	const item = items[index];
	invariant(item !== undefined);
	return item;
}

function afterAssert(value: string | undefined) {
	assert(value);
	return value;
}

// The TS2775 antidote: an annotated const narrows, and this body proves it.
const assertString: Assertion<unknown, string> = assertGuard(isString);
function afterAssertGuard(value: unknown) {
	assertString(value);
	return value;
}

type _assertions = [
	Expect<Equal<ReturnType<typeof afterAssertBy>, string>>,
	Expect<Equal<ReturnType<typeof afterAssertByOnSubtype>, Cat>>,
	// assertDefined keeps null, exactly like isDefined.
	Expect<Equal<ReturnType<typeof afterAssertDefined>, string | null>>,
	// assertNonNullish drops both.
	Expect<Equal<ReturnType<typeof afterAssertNonNullish>, string>>,
	Expect<Equal<ReturnType<typeof afterInvariant>, string>>,
	Expect<Equal<ReturnType<typeof afterInvariantOnIndex>, string>>,
	// `asserts value` (no `is`) removes the falsy members it can prove away.
	Expect<Equal<ReturnType<typeof afterAssert>, string>>,
	Expect<Equal<ReturnType<typeof afterAssertGuard>, string>>,
	// Nothing above degraded into `any`.
	Expect<Equal<IsAny<ReturnType<typeof afterAssertBy>>, false>>,
];

// --- Assertion and assertGuard shapes -------------------------------------------
type _assertionType = [
	Expect<Equal<Assertion<unknown, string>, (value: unknown) => asserts value is string>>,
	Expect<Equal<ReturnType<typeof assertGuard<unknown, string>>, Assertion<unknown, string>>>,
	Expect<Equal<ReturnType<typeof assertGuard<Animal, Cat>>, Assertion<Animal, Cat>>>,
];

// --- narrowAll: a type predicate on the parameter --------------------------------
function afterNarrowAll(values: readonly unknown[]) {
	if (!narrowAll(values, isString)) {
		return undefined;
	}
	return values;
}

function afterNarrowAllOnSubtype(values: readonly Animal[]) {
	if (!narrowAll(values, isCat)) {
		return undefined;
	}
	return values;
}

type _narrowAll = [
	// The caller's own array is narrowed in place — no new allocation, no sentinel.
	Expect<Equal<ReturnType<typeof afterNarrowAll>, readonly string[] | undefined>>,
	Expect<Equal<ReturnType<typeof afterNarrowAllOnSubtype>, readonly Cat[] | undefined>>,
];

// --- isNarrowError ---------------------------------------------------------------
function afterIsNarrowError(caught: unknown) {
	if (!isNarrowError(caught)) {
		return undefined;
	}
	return caught;
}

type _isNarrowError = [
	Expect<Equal<ReturnType<typeof afterIsNarrowError>, NarrowError | undefined>>,
	// The structured fields keep their exact declared types, never `any`.
	Expect<Equal<NarrowError["value"], unknown>>,
	Expect<Equal<NarrowError["expected"], string | undefined>>,
	Expect<Equal<NarrowError["path"], readonly PropertyKey[] | undefined>>,
];

test("type-level assertions compile", () => {
	// The assertions above are enforced by the typechecker; if any Expect<...>
	// resolved to a non-`true` type, this file would fail to compile and
	// `vitest --typecheck` would report it. Referencing the tuples here keeps them
	// "used" without exporting from a test file.
	type _all = [
		_returning,
		_inference,
		_parse,
		_narrowResultArity,
		_assertions,
		_assertionType,
		_narrowAll,
		_isNarrowError,
	];
	const _cases: _all | undefined = undefined;
	void _cases;
});
