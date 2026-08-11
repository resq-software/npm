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
 * @fileoverview Type-level tests for `brand-parse.ts`. Every `Expect<...>` line
 * is a compile-time assertion, and so is every helper body below — one that
 * fails to narrow simply does not compile. Run via `vitest --typecheck` (wired
 * into this package's `test` script) and by `tsc --noEmit`.
 */

import { test } from "vitest";
import { type BrandError, type BrandParser, brandParser } from "./brand-parse.js";
import type { Brand, BrandRefiner } from "./brand.js";
import type { NarrowError, NarrowResult } from "./narrow.js";
import type { Equal, Expect, ExpectFalse, IsAny } from "./testing.js";

type Email = Brand<string, "Email">;
type EmailParser = BrandParser<string, "Email">;
type EmailRefiner = BrandRefiner<string, "Email">;

type ParseResult = ReturnType<EmailParser["parse"]>;
type ParseFailure = Extract<ParseResult, { readonly ok: false }>["error"];
type ParseSuccess = Extract<ParseResult, { readonly ok: true }>["value"];

// --- the factory returns exactly the sibling interface, never a widening ------
type _factory = [
	// Pins the "sibling, not a widening" decision: if `brandParser` were ever
	// retyped to return a `BrandRefiner`, or `brandRefiner` widened to return a
	// `BrandParser`, exactly one of these lines stops holding.
	Expect<Equal<ReturnType<typeof brandParser<string, "Email">>, EmailParser>>,
	Expect<Equal<IsAny<ReturnType<typeof brandParser<string, "Email">>>, false>>,
	// Every `BrandParser` is a `BrandRefiner`...
	Expect<Equal<EmailParser extends EmailRefiner ? true : false, true>>,
	// ...and the converse is false, which is the whole reason the published
	// `BrandRefiner` did not have to change.
	Expect<Equal<EmailRefiner extends EmailParser ? true : false, false>>,
	// The optional runtime brand name does not leak into the type parameters.
	Expect<Equal<ReturnType<typeof brandParser<number, "Port">>, BrandParser<number, "Port">>>,
];

// --- member signatures --------------------------------------------------------
type _members = [
	Expect<Equal<EmailParser["parse"], (value: string) => NarrowResult<Email, BrandError>>>,
	Expect<Equal<EmailParser["failures"], (value: string) => readonly string[]>>,
	// Inherited members keep the frozen `BrandRefiner` shapes verbatim.
	Expect<Equal<EmailParser["is"], EmailRefiner["is"]>>,
	Expect<Equal<EmailParser["from"], EmailRefiner["from"]>>,
	Expect<Equal<EmailParser["coerce"], EmailRefiner["coerce"]>>,
	Expect<Equal<EmailParser["unsafe"], EmailRefiner["unsafe"]>>,
	Expect<Equal<ReturnType<EmailParser["from"]>, Email>>,
	Expect<Equal<ReturnType<EmailParser["coerce"]>, Email | null>>,
];

// --- the result envelope carries the *precise* failure type -------------------
type _result = [
	// This is the first consumer of `NarrowResult`'s second type parameter. If it
	// ever regresses to a single parameter, `ParseFailure` widens to `NarrowError`
	// and both of the next two lines flip.
	Expect<Equal<ParseFailure, BrandError>>,
	ExpectFalse<Equal<ParseFailure, NarrowError>>,
	Expect<Equal<ParseSuccess, Email>>,
	Expect<Equal<IsAny<ParseFailure>, false>>,
	// ...but a `BrandError` is still a `NarrowError`, so one `catch` still works.
	Expect<Equal<BrandError extends NarrowError ? true : false, true>>,
	Expect<Equal<BrandError extends Error ? true : false, true>>,
];

// --- BrandError's own fields --------------------------------------------------
type _error = [
	Expect<Equal<BrandError["brand"], PropertyKey>>,
	Expect<Equal<BrandError["failures"], readonly string[]>>,
	// Inherited, unchanged — the value stays `unknown` so nothing is tempted to
	// print it without a deliberate cast.
	Expect<Equal<BrandError["value"], unknown>>,
	Expect<Equal<BrandError["expected"], string | undefined>>,
	Expect<Equal<BrandError["path"], readonly PropertyKey[] | undefined>>,
	Expect<Equal<BrandError["message"], string>>,
];

// --- narrowing actually happens at call sites ---------------------------------

const Email: EmailParser = brandParser<string, "Email">(
	[
		["has an at sign", (s) => s.includes("@")],
		["has a dot after it", (s) => /@[^@\s]+\.[^@\s]+$/.test(s)],
	],
	"Email",
);

/** `is` is a real type guard: the `true` arm is branded without a cast. */
function narrowsThroughIs(value: string): Email | undefined {
	return Email.is(value) ? value : undefined;
}

/** `parse` discriminates on `ok`; each arm exposes only its own field. */
function narrowsThroughParse(value: string): Email | readonly string[] {
	const result = Email.parse(value);
	return result.ok ? result.value : result.error.failures;
}

/** A `BrandParser` flows into anything typed for the frozen refiner. */
function acceptsRefiner(refiner: EmailRefiner): boolean {
	return refiner.is("a@b.com");
}
const _refinerCall: boolean = acceptsRefiner(Email);

type _narrowing = [
	Expect<Equal<ReturnType<typeof narrowsThroughIs>, Email | undefined>>,
	Expect<Equal<ReturnType<typeof narrowsThroughParse>, Email | readonly string[]>>,
	// A branded value is still its carrier...
	Expect<Equal<Email extends string ? true : false, true>>,
	// ...and a bare carrier is still not the brand, which is the point.
	Expect<Equal<string extends Email ? true : false, false>>,
];

// --- the constraint list infers its tuple shape from the annotation -----------

const inferred = brandParser<number, "Port">([
	["in range", (n) => n >= 0 && n <= 65535],
	["integral", (n) => Number.isInteger(n)],
]);

type _inference = [
	Expect<Equal<typeof inferred, BrandParser<number, "Port">>>,
	// The predicate parameter is contextually typed from the carrier — no `any`
	// slips in through the tuple.
	Expect<Equal<Parameters<(typeof inferred)["failures"]>, [value: number]>>,
	Expect<Equal<IsAny<Parameters<(typeof inferred)["failures"]>[0]>, false>>,
];

// --- symbol brands are representable, matching `Tag<B extends PropertyKey>` ---

declare const SymbolBrand: unique symbol;
type SymbolParser = BrandParser<string, typeof SymbolBrand>;

type _symbolBrand = [
	Expect<Equal<ReturnType<typeof brandParser<string, typeof SymbolBrand>>, SymbolParser>>,
	Expect<Equal<ReturnType<SymbolParser["from"]>, Brand<string, typeof SymbolBrand>>>,
];

test("type-level assertions compile", () => {
	// The assertions above are enforced by the typechecker; if any Expect<...>
	// resolved to a non-`true` type, this file would fail to compile and
	// `vitest --typecheck` would report it. Referencing the tuples here keeps
	// them "used" without exporting from a test file.
	type _all = [
		_factory,
		_members,
		_result,
		_error,
		_narrowing,
		_inference,
		_symbolBrand,
		typeof _refinerCall,
	];
	const _cases: _all | undefined = undefined;
	void _cases;
});
