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

import { describe, expect, test } from "vitest";
import { type BrandParser, BrandError, brandParser } from "./brand-parse.js";
import { NarrowError, isNarrowError } from "./narrow.js";

/** The cross-realm recognition marker `NarrowError`'s constructor stamps. */
const NARROW_ERROR_BRAND = Symbol.for("@resq-systems/types#NarrowError");

//#region Law matrix

/**
 * The five members of a `BrandParser` are five views of one question, so they
 * must never disagree. This exercises all of them against every value in a
 * fixed matrix and recomputes the expected failure list independently of the
 * implementation (by filtering the same constraint list), which is what makes
 * this a law check rather than a restatement of the code.
 */
function assertParserLaws<T>(
	parser: BrandParser<T, "Law">,
	constraints: readonly (readonly [string, (value: T) => boolean])[],
	values: readonly T[],
	show: (value: T) => string,
): void {
	const labels = constraints.map(([label]) => label);

	for (const value of values) {
		const where = show(value);
		// Recomputed independently: declaration order, every failing constraint.
		const expected = constraints.filter(([, predicate]) => !predicate(value)).map(([l]) => l);
		const valid = expected.length === 0;

		// L1 — `failures` is exactly the failing labels, in declaration order.
		const actual = parser.failures(value);
		expect(actual, `failures(${where})`).toStrictEqual(expected);

		// L2 — every reported label is a declared label; nothing is invented.
		for (const label of actual) {
			expect(labels, `failures(${where}) is a subset of the labels`).toContain(label);
		}

		// L3 — `is` agrees with "no failures".
		expect(parser.is(value), `is(${where})`).toBe(valid);

		// L4 — `parse().ok` agrees with `is`.
		expect(parser.parse(value).ok, `parse(${where}).ok`).toBe(valid);

		// L5 — `coerce` is non-null exactly when valid. `null` is excluded from
		// this law on purpose: a carrier that admits `null` cannot tell "valid
		// null" apart from "rejected" through `coerce`. That is a property of the
		// frozen `BrandRefiner` contract, not of this module, and it is pinned
		// explicitly further down.
		if (value !== null) {
			expect(parser.coerce(value) !== null, `coerce(${where})`).toBe(valid);
		}

		// L6 — `from` throws exactly when invalid, and is identity when valid.
		if (valid) {
			expect(parser.from(value), `from(${where})`).toBe(value);
		} else {
			expect(() => parser.from(value), `from(${where})`).toThrow(BrandError);
		}

		// L7 — `unsafe` is always identity, valid or not.
		expect(parser.unsafe(value), `unsafe(${where})`).toBe(value);

		// L8 — determinism: the same input answers the same way every time.
		expect(parser.failures(value), `failures(${where}) is deterministic`).toStrictEqual(actual);

		// L9 — the error path agrees with `failures` and never leaks the value.
		const result = parser.parse(value);
		if (result.ok) {
			expect(result.value, `parse(${where}).value`).toBe(value);
		} else {
			expect(result.error.failures, `parse(${where}).error.failures`).toStrictEqual(expected);
			expect(result.error.value, `parse(${where}).error.value`).toBe(value);
		}
	}
}

describe("brandParser — member agreement across a fixed input matrix", () => {
	test("string carrier: shape and range constraints", () => {
		const constraints = [
			["dotted quad", (s: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(s)],
			[
				"octet range",
				(s: string) => s.split(".").every((o) => /^\d{1,3}$/.test(o) && Number(o) <= 255),
			],
		] as const;
		const parser = brandParser<string, "Law">(constraints, "Law");

		assertParserLaws(
			parser,
			constraints,
			["192.168.0.1", "0.0.0.0", "255.255.255.255", "999.0.0.1", "1.2.3", "", "nope", "1.2.3.4.5"],
			(value) => JSON.stringify(value),
		);
	});

	test("number carrier: NaN, -0, and the infinities", () => {
		const constraints = [
			["finite", (n: number) => Number.isFinite(n)],
			["positive", (n: number) => n > 0],
			["integral", (n: number) => Number.isInteger(n)],
		] as const;
		const parser = brandParser<number, "Law">(constraints, "Law");

		assertParserLaws(
			parser,
			constraints,
			[
				1,
				42,
				0,
				-0,
				-1,
				1.5,
				Number.NaN,
				Number.POSITIVE_INFINITY,
				Number.NEGATIVE_INFINITY,
				Number.MAX_SAFE_INTEGER,
			],
			(value) => (Object.is(value, -0) ? "-0" : String(value)),
		);

		// Every NaN comparison is false, so a NaN fails "positive" as well as
		// "finite" and "integral" — all three are reported, none is skipped.
		expect(parser.failures(Number.NaN)).toStrictEqual(["finite", "positive", "integral"]);
		// -0 is integral and finite but not `> 0`, and it survives `from`/`parse`
		// as -0 rather than being normalized to 0.
		expect(parser.failures(-0)).toStrictEqual(["positive"]);
		expect(Object.is(parser.unsafe(-0), -0)).toBe(true);
	});

	test("Date carrier: an Invalid Date fails every constraint touching the timestamp", () => {
		const constraints = [
			["a real date", (d: Date) => !Number.isNaN(d.getTime())],
			["before 2030", (d: Date) => d.getTime() < Date.UTC(2030, 0, 1)],
		] as const;
		const parser = brandParser<Date, "Law">(constraints, "Law");

		assertParserLaws(
			parser,
			constraints,
			[
				new Date(0),
				new Date(Date.UTC(2020, 5, 1)),
				new Date(Date.UTC(2040, 0, 1)),
				new Date(Number.NaN),
			],
			(value) => `Date(${value.getTime()})`,
		);

		// Pinned explicitly: `<` against NaN is false, so an Invalid Date breaks
		// the range rule too, and both labels come back.
		expect(parser.failures(new Date(Number.NaN))).toStrictEqual(["a real date", "before 2030"]);
	});

	test("empty constraint list is vacuously valid", () => {
		const parser = brandParser<unknown, "Law">([], "Law");
		assertParserLaws(parser, [], [0, -0, "", null, undefined, Number.NaN, {}], (value) =>
			String(value),
		);
		expect(parser.failures(Symbol.iterator)).toStrictEqual([]);
		expect(parser.is(Symbol.iterator)).toBe(true);
	});

	test("coerce cannot distinguish a valid `null` from a rejection", () => {
		const Nullable = brandParser<string | null, "Nullable">(
			[["a string or null", (v) => v === null || typeof v === "string"]],
			"Nullable",
		);

		expect(Nullable.is(null)).toBe(true);
		expect(Nullable.parse(null).ok).toBe(true);
		expect(Nullable.failures(null)).toStrictEqual([]);

		// ...yet `coerce` answers `null` for the accepted value too, which is
		// indistinguishable from its rejection signal. Inherited from the frozen
		// `BrandRefiner` contract; on a nullable carrier use `is` or `parse`.
		expect(Nullable.coerce(null)).toBeNull();
	});
});

//#endregion

//#region Accumulation

describe("brandParser — accumulation", () => {
	const constraints = [
		["at least 12 characters", (s: string) => s.length >= 12],
		["contains a digit", (s: string) => /\d/.test(s)],
		["no whitespace", (s: string) => !/\s/.test(s)],
	] as const;
	const Password = brandParser<string, "Password">(constraints, "Password");

	test("reports every failing constraint, not just the first", () => {
		expect(Password.failures("short")).toStrictEqual([
			"at least 12 characters",
			"contains a digit",
		]);
		expect(Password.failures("a b")).toStrictEqual([
			"at least 12 characters",
			"contains a digit",
			"no whitespace",
		]);
	});

	test("preserves declaration order regardless of which constraints fail", () => {
		// Only the middle constraint fails.
		expect(Password.failures("abcdefghijkl")).toStrictEqual(["contains a digit"]);
		// First and last fail, middle passes — order still follows declaration.
		expect(Password.failures("a 1")).toStrictEqual(["at least 12 characters", "no whitespace"]);
		// Nothing fails.
		expect(Password.failures("correcthorse42")).toStrictEqual([]);
	});

	test("runs every predicate on every member, never short-circuiting", () => {
		const calls: string[] = [];
		const counted = brandParser<string, "Counted">(
			[
				[
					"first",
					(s) => {
						calls.push("first");
						return s.length > 0;
					},
				],
				[
					"second",
					(s) => {
						calls.push("second");
						return s.length > 3;
					},
				],
			],
			"Counted",
		);

		// The first constraint already fails; the second must still run.
		calls.length = 0;
		counted.failures("");
		expect(calls).toStrictEqual(["first", "second"]);

		calls.length = 0;
		counted.is("");
		expect(calls, "`is` accumulates too — no member observes a different run").toStrictEqual([
			"first",
			"second",
		]);

		calls.length = 0;
		counted.coerce("");
		expect(calls).toStrictEqual(["first", "second"]);

		calls.length = 0;
		counted.parse("");
		expect(calls).toStrictEqual(["first", "second"]);

		calls.length = 0;
		expect(() => counted.from("")).toThrow(BrandError);
		expect(calls).toStrictEqual(["first", "second"]);
	});

	test("duplicate labels are reported once per failing constraint", () => {
		const parser = brandParser<number, "Dup">(
			[
				["out of range", (n) => n >= 0],
				["out of range", (n) => n <= 10],
			],
			"Dup",
		);
		expect(parser.failures(5)).toStrictEqual([]);
		expect(parser.failures(-1)).toStrictEqual(["out of range"]);
		expect(parser.failures(99)).toStrictEqual(["out of range"]);
		expect(parser.failures(Number.NaN)).toStrictEqual(["out of range", "out of range"]);
	});

	test("a single constraint behaves like brandRefiner, with a label attached", () => {
		const Even = brandParser<number, "Even">([["even", (n) => n % 2 === 0]], "Even");
		expect(Even.failures(4)).toStrictEqual([]);
		expect(Even.failures(3)).toStrictEqual(["even"]);
	});
});

//#endregion

//#region Immutability

describe("brandParser — immutability", () => {
	test("copies the constraint list, so later mutation cannot change behavior", () => {
		const constraints: [string, (value: string) => boolean][] = [
			["non-empty", (s) => s.length > 0],
		];
		const parser = brandParser<string, "Copy">(constraints, "Copy");

		constraints.push(["never satisfied", () => false]);
		constraints.length = 0;

		expect(parser.failures("x")).toStrictEqual([]);
		expect(parser.failures("")).toStrictEqual(["non-empty"]);
	});

	test("the returned failure list is frozen", () => {
		const parser = brandParser<string, "Frozen">([["non-empty", (s) => s.length > 0]], "Frozen");
		expect(Object.isFrozen(parser.failures(""))).toBe(true);
		expect(Object.isFrozen(parser.failures("x"))).toBe(true);
	});

	test("the returned bundle is frozen", () => {
		expect(Object.isFrozen(brandParser<string, "Frozen">([], "Frozen"))).toBe(true);
	});

	test("BrandError copies the labels it is given", () => {
		const labels = ["one"];
		const error = new BrandError("Value failed the Test brand: one", {
			brand: "Test",
			failures: labels,
		});
		labels.push("two");
		expect(error.failures).toStrictEqual(["one"]);
		expect(Object.isFrozen(error.failures)).toBe(true);
	});
});

//#endregion

//#region BrandError

describe("BrandError", () => {
	const Even = brandParser<number, "Even">([["even", (n) => n % 2 === 0]], "Even");

	function reject(value: number): BrandError {
		try {
			Even.from(value);
		} catch (error) {
			if (error instanceof BrandError) {
				return error;
			}
			throw error;
		}
		throw new Error(`expected ${value} to be rejected`);
	}

	test("is an Error, a NarrowError, and a BrandError", () => {
		const error = reject(3);
		expect(error).toBeInstanceOf(Error);
		expect(error).toBeInstanceOf(NarrowError);
		expect(error).toBeInstanceOf(BrandError);
		expect(Object.getPrototypeOf(error)).toBe(BrandError.prototype);
	});

	test("carries the brand, the labels, and the value", () => {
		const error = reject(3);
		expect(error.brand).toBe("Even");
		expect(error.failures).toStrictEqual(["even"]);
		expect(error.value).toBe(3);
		expect(error.expected).toBe("Even");
		expect(error.path).toBeUndefined();
	});

	test("names itself, so it is distinguishable from the base class", () => {
		expect(reject(3).name).toBe("BrandError");
		expect(new NarrowError("x").name).toBe("NarrowError");
	});

	test("never interpolates the offending value into the message", () => {
		const Secret = brandParser<string, "Secret">(
			[["looks like an email", (s) => s.includes("@")]],
			"Secret",
		);
		// A synthetic test PAN — the point is that it must NOT appear in the message.
		const sensitive = "4111111111111111";
		let message = "";
		try {
			Secret.from(sensitive);
		} catch (error) {
			message = (error as Error).message;
		}
		expect(message).toBe("Value failed the Secret brand: looks like an email");
		expect(message).not.toContain(sensitive);
	});

	test("lists every failing label in the message", () => {
		const parser = brandParser<string, "Multi">(
			[
				["a", () => false],
				["b", () => false],
			],
			"Multi",
		);
		expect(() => parser.from("x")).toThrow("Value failed the Multi brand: a, b");
	});

	test("defaults the brand name to `brand`, matching brandRefiner's wording", () => {
		const parser = brandParser<string, "Anon">([["non-empty", (s) => s.length > 0]]);
		const result = parser.parse("");
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.brand).toBe("brand");
			expect(result.error.message).toBe("Value failed the brand brand: non-empty");
		}
	});

	test("supports symbol brands without throwing on interpolation", () => {
		const brand = Symbol("Sensitive");
		const parser = brandParser<string, symbol>([["non-empty", (s) => s.length > 0]], brand);
		const result = parser.parse("");
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.brand).toBe(brand);
			expect(result.error.message).toBe("Value failed the Symbol(Sensitive) brand: non-empty");
		}
	});
});

//#endregion

//#region Cross-realm recognition

describe("BrandError — cross-realm recognition", () => {
	const Even = brandParser<number, "Even">([["even", (n) => n % 2 === 0]], "Even");

	test("isNarrowError recognizes a BrandError", () => {
		const result = Even.parse(3);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(isNarrowError(result.error)).toBe(true);
		}
	});

	test("the registry-symbol brand is inherited and non-enumerable", () => {
		const result = Even.parse(3);
		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		const descriptor = Object.getOwnPropertyDescriptor(result.error, NARROW_ERROR_BRAND);
		expect(descriptor?.value).toBe(true);
		expect(descriptor?.enumerable).toBe(false);
	});

	test("the symbol, not the name, is what carries recognition off-realm", () => {
		// A twin from another realm: `instanceof` fails and `name` is the
		// subclass's own, so only the registry symbol can identify it.
		const offRealm = { [NARROW_ERROR_BRAND]: true, name: "BrandError", message: "rejected" };
		expect(isNarrowError(offRealm)).toBe(true);

		// The same shape without the symbol is correctly not recognized, which is
		// what proves the assertion above is testing the symbol and not the name.
		const impostor = { name: "BrandError", message: "rejected" };
		expect(isNarrowError(impostor)).toBe(false);
	});
});

//#endregion

//#region BrandRefiner compatibility

describe("BrandParser — BrandRefiner compatibility", () => {
	const Slug = brandParser<string, "Slug">(
		[
			["lowercase", (s) => s === s.toLowerCase()],
			["no spaces", (s) => !s.includes(" ")],
		],
		"Slug",
	);

	test("exposes every BrandRefiner member, plus the two new ones", () => {
		for (const member of ["is", "from", "coerce", "unsafe", "parse", "failures"] as const) {
			expect(typeof Slug[member], member).toBe("function");
		}
	});

	test("is/coerce/unsafe behave exactly as brandRefiner's do", () => {
		expect(Slug.is("hello-world")).toBe(true);
		expect(Slug.is("Hello World")).toBe(false);
		expect(Slug.coerce("hello-world")).toBe("hello-world");
		expect(Slug.coerce("Hello World")).toBeNull();
		expect(Slug.unsafe("Hello World")).toBe("Hello World");
	});

	test("from throws BrandError rather than brandRefiner's TypeError", () => {
		expect(() => Slug.from("Hello World")).toThrow(BrandError);
		expect(() => Slug.from("Hello World")).not.toThrow(TypeError);
	});

	test("parse returns the identical value reference on success", () => {
		const input = "hello-world";
		const result = Slug.parse(input);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toBe(input);
		}
	});

	test("a predicate that throws propagates rather than being swallowed", () => {
		const parser = brandParser<string, "Boom">(
			[
				[
					"explodes",
					() => {
						throw new RangeError("boom");
					},
				],
			],
			"Boom",
		);
		expect(() => parser.failures("x")).toThrow(RangeError);
		expect(() => parser.parse("x")).toThrow(RangeError);
		expect(() => parser.is("x")).toThrow(RangeError);
	});
});

//#endregion
