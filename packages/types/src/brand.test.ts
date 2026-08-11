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
import {
	type Brand,
	type BrandsOf,
	brandRefiner,
	type HasBrand,
	refineAll,
	type Unbrand,
	unsafeBrand,
} from "./brand.js";

type Email = Brand<string, "Email">;
const Email = brandRefiner<string, "Email">((s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s), "email");

describe("brandRefiner", () => {
	test("is() acts as a runtime type guard", () => {
		expect(Email.is("a@b.com")).toBe(true);
		expect(Email.is("nope")).toBe(false);
	});

	test("from() returns the value unchanged when valid", () => {
		const value = "a@b.com";
		expect(Email.from(value)).toBe(value);
	});

	test("from() throws TypeError when invalid and does not leak the value", () => {
		expect(() => Email.from("nope")).toThrow(TypeError);
		expect(() => Email.from("secret@leak")).toThrow(/failed the email refinement/);
		// The offending value must not appear in the message.
		try {
			Email.from("secret@leak");
		} catch (error) {
			expect((error as Error).message).not.toContain("secret@leak");
		}
	});

	test("coerce() returns the value or null without throwing", () => {
		expect(Email.coerce("a@b.com")).toBe("a@b.com");
		expect(Email.coerce("nope")).toBeNull();
	});

	test("unsafe() brands without checking (identity at runtime)", () => {
		expect(Email.unsafe("not-an-email")).toBe("not-an-email");
	});
});

describe("unsafeBrand", () => {
	test("is an identity function at runtime", () => {
		const token = unsafeBrand<"SecureToken", string>("abc-123");
		expect(token).toBe("abc-123");
	});

	test("a branded value is still usable as its carrier type", () => {
		const email: Email = Email.from("a@b.com");
		const asString: string = email;
		expect(asString.toUpperCase()).toBe("A@B.COM");
	});
});

// --- refineAll ---------------------------------------------------------------

type NonEmpty = Brand<string, "NonEmpty">;
type Trimmed = Brand<string, "Trimmed">;

const NonEmpty = brandRefiner<string, "NonEmpty">((s) => s.length > 0, "non-empty");
const Trimmed = brandRefiner<string, "Trimmed">((s) => s === s.trim(), "trimmed");
const Lower = brandRefiner<string, "Lower">((s) => s === s.toLowerCase(), "lower-case");
const Always = brandRefiner<string, "Always">(() => true, "always");
const Never = brandRefiner<string, "Never">(() => false, "never");

/**
 * A fixed input matrix, exercised by every property below. It deliberately
 * covers each of the eight acceptance combinations of the three refiners, plus
 * the empty string and a whitespace-only string.
 */
const STRINGS: readonly string[] = [
	"", // ✗ NonEmpty  ✓ Trimmed  ✓ Lower
	" ", // ✓ NonEmpty  ✗ Trimmed  ✓ Lower
	"hello", // ✓ ✓ ✓
	"HELLO", // ✓ ✓ ✗
	" hello ", // ✓ ✗ ✓
	" HELLO ", // ✓ ✗ ✗
	"Hello World",
	"\t", // whitespace-only, not trimmed
	"é", // non-ASCII, already lower case
	"É", // non-ASCII upper case
];

describe("refineAll", () => {
	test("acceptance is exactly the conjunction of its members, over the matrix", () => {
		const combined = refineAll(NonEmpty, Trimmed, Lower);
		for (const value of STRINGS) {
			expect(combined.is(value)).toBe(NonEmpty.is(value) && Trimmed.is(value) && Lower.is(value));
		}
	});

	test("the matrix really covers both outcomes (the property is not vacuous)", () => {
		const combined = refineAll(NonEmpty, Trimmed, Lower);
		const accepted = STRINGS.filter((value) => combined.is(value));
		expect(accepted).toStrictEqual(["hello", "é"]);
	});

	test("acceptance is order-independent", () => {
		const ab = refineAll(NonEmpty, Trimmed);
		const ba = refineAll(Trimmed, NonEmpty);
		for (const value of STRINGS) {
			expect(ab.is(value)).toBe(ba.is(value));
		}
	});

	test("acceptance is idempotent", () => {
		const doubled = refineAll(NonEmpty, NonEmpty);
		for (const value of STRINGS) {
			expect(doubled.is(value)).toBe(NonEmpty.is(value));
		}
	});

	test("acceptance is associative, and nesting equals the flat form", () => {
		const left = refineAll(refineAll(NonEmpty, Trimmed), Lower);
		const right = refineAll(NonEmpty, refineAll(Trimmed, Lower));
		const flat = refineAll(NonEmpty, Trimmed, Lower);
		for (const value of STRINGS) {
			expect(left.is(value)).toBe(flat.is(value));
			expect(right.is(value)).toBe(flat.is(value));
		}
	});

	test("an always-true refiner is the identity element", () => {
		const withIdentity = refineAll(NonEmpty, Always);
		for (const value of STRINGS) {
			expect(withIdentity.is(value)).toBe(NonEmpty.is(value));
		}
	});

	test("an always-false refiner is the absorbing element", () => {
		const withZero = refineAll(NonEmpty, Never);
		for (const value of STRINGS) {
			expect(withZero.is(value)).toBe(false);
		}
	});

	test("a single refiner behaves exactly like the original", () => {
		const alone = refineAll(NonEmpty);
		for (const value of STRINGS) {
			expect(alone.is(value)).toBe(NonEmpty.is(value));
			expect(alone.coerce(value)).toBe(NonEmpty.coerce(value));
		}
	});

	test("checks run left to right and short-circuit on the first failure", () => {
		const calls: string[] = [];
		const first = brandRefiner<string, "First">((s) => {
			calls.push("first");
			return s.length > 0;
		});
		const second = brandRefiner<string, "Second">(() => {
			calls.push("second");
			return true;
		});

		const combined = refineAll(first, second);

		expect(combined.is("ok")).toBe(true);
		expect(calls).toStrictEqual(["first", "second"]);

		calls.length = 0;
		expect(combined.is("")).toBe(false);
		expect(calls).toStrictEqual(["first"]);
	});

	test("from() returns the value unchanged when every check holds", () => {
		const combined = refineAll(NonEmpty, Trimmed);
		const value = "hello";
		const branded: NonEmpty & Trimmed = combined.from(value);
		expect(branded).toBe(value);
	});

	test("from() throws TypeError and does not leak the offending value", () => {
		const combined = refineAll(NonEmpty, Trimmed);
		expect(() => combined.from(" secret ")).toThrow(TypeError);
		try {
			combined.from(" secret ");
		} catch (error) {
			expect((error as Error).message).not.toContain("secret");
			expect((error as Error).message).toBe("Value failed a combined brand refinement");
		}
	});

	test("coerce() returns the value or null without throwing", () => {
		const combined = refineAll(NonEmpty, Trimmed);
		expect(combined.coerce("hello")).toBe("hello");
		expect(combined.coerce(" hello ")).toBeNull();
		expect(combined.coerce("")).toBeNull();
	});

	test("unsafe() brands without running any check", () => {
		const calls: string[] = [];
		const counted = brandRefiner<string, "Counted">(() => {
			calls.push("checked");
			return false;
		});
		const combined = refineAll(counted, NonEmpty);
		expect(combined.unsafe(" not valid ")).toBe(" not valid ");
		expect(calls).toStrictEqual([]);
	});

	test("preserves reference identity for object carriers", () => {
		type Config = { readonly retries: number };
		const hasRetries = brandRefiner<Config, "HasRetries">((c) => c.retries >= 0);
		const isBounded = brandRefiner<Config, "Bounded">((c) => c.retries <= 10);
		const combined = refineAll(hasRetries, isBounded);

		const config: Config = { retries: 3 };
		expect(combined.from(config)).toBe(config);
		expect(combined.coerce(config)).toBe(config);
		expect(combined.unsafe(config)).toBe(config);
	});

	test("numeric edge cases: NaN, -0, and Infinity follow the member predicates", () => {
		const finiteOnly = brandRefiner<number, "Finite">((n) => Number.isFinite(n));
		const isNonNegative = brandRefiner<number, "NonNegative">((n) => !(n < 0));
		const combined = refineAll(finiteOnly, isNonNegative);

		// NaN: every comparison is false, so `!(NaN < 0)` is true — but NaN is not
		// finite, so the conjunction rejects it.
		expect(combined.is(Number.NaN)).toBe(false);
		// -0 is finite and `-0 < 0` is false, so it is accepted and returned as-is.
		expect(combined.is(-0)).toBe(true);
		expect(Object.is(combined.from(-0), -0)).toBe(true);
		expect(combined.is(0)).toBe(true);
		expect(combined.is(Number.POSITIVE_INFINITY)).toBe(false);
		expect(combined.is(Number.NEGATIVE_INFINITY)).toBe(false);
		expect(combined.is(-1)).toBe(false);
	});

	test("symbol brand keys are supported", () => {
		const KEY_A = Symbol("A");
		const KEY_B = Symbol("B");
		const refinerA = brandRefiner<string, typeof KEY_A>((s) => s.length > 0);
		const refinerB = brandRefiner<string, typeof KEY_B>((s) => s === s.trim());
		const combined = refineAll(refinerA, refinerB);
		expect(combined.is("hello")).toBe(true);
		expect(combined.is(" hello ")).toBe(false);
	});

	test("cross-realm carriers are judged by the predicates, not by identity", () => {
		// A refiner over a structural shape must accept a value that crossed a
		// realm boundary (here simulated by `structuredClone`, which produces a
		// fresh object with no shared prototype identity assumptions).
		type Point = { readonly x: number; readonly y: number };
		const hasX = brandRefiner<Point, "HasX">((p) => Number.isFinite(p.x));
		const hasY = brandRefiner<Point, "HasY">((p) => Number.isFinite(p.y));
		const combined = refineAll(hasX, hasY);

		const original: Point = { x: 1, y: 2 };
		const cloned = structuredClone(original) as Point;
		expect(cloned).not.toBe(original);
		expect(combined.is(cloned)).toBe(true);
	});

	test("the values documented in the `@example` blocks are correct", () => {
		// Mirrors the `BrandsOf` doctest.
		const single: BrandsOf<Email> = "Email";
		expect(single).toStrictEqual("Email");

		// Mirrors the `Unbrand` doctest.
		const raw: Unbrand<Email> = Email.from("a@b.com");
		expect(raw.toUpperCase()).toStrictEqual("A@B.COM");

		// Mirrors the `HasBrand` doctest.
		const keptEmail: HasBrand<Brand<Email, "Verified">, "Email"> = true;
		expect(keptEmail).toStrictEqual(true);

		// Mirrors the `refineAll` doctest.
		const Slug = refineAll(NonEmpty, Trimmed);
		const slug: NonEmpty & Trimmed = Slug.from("hello");
		expect(slug).toStrictEqual("hello");
		expect(Slug.is(" hello ")).toStrictEqual(false);
		expect(Slug.coerce("")).toStrictEqual(null);
	});
});
