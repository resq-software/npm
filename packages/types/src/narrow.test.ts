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
	type Assertion,
	NarrowError,
	type NarrowResult,
	assert,
	assertBy,
	assertDefined,
	assertExists,
	assertGuard,
	assertNonNullish,
	ensure,
	ensureDefined,
	invariant,
	isNarrowError,
	narrowAll,
	parse,
	tryNarrow,
	unsafeNarrow,
} from "./narrow.js";

const isString = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number => typeof value === "number";

/** Every falsy value JavaScript has, for the truthiness-based throwers. */
const FALSY: readonly unknown[] = [false, 0, -0, 0n, "", null, undefined, Number.NaN];

/** An engine without `Error.captureStackTrace` leaves stacks alone; skip those checks. */
const hasCaptureStackTrace =
	typeof (Error as unknown as { captureStackTrace?: unknown }).captureStackTrace === "function";

describe("NarrowError", () => {
	test("carries the offending value, the expectation, and the path", () => {
		const error = new NarrowError("bad shape", {
			value: { id: 1 },
			expected: "User",
			path: ["user", 0, "id"],
		});

		expect(error.message).toBe("bad shape");
		expect(error.value).toEqual({ id: 1 });
		expect(error.expected).toBe("User");
		expect(error.path).toEqual(["user", 0, "id"]);
	});

	test("defaults every structured field to undefined when options are omitted", () => {
		const error = new NarrowError("bare");

		expect(error.value).toBeUndefined();
		expect(error.expected).toBeUndefined();
		expect(error.path).toBeUndefined();
	});

	test("is an Error with an explicit name that survives minification", () => {
		const error = new NarrowError("boom");

		expect(error).toBeInstanceOf(Error);
		expect(error).toBeInstanceOf(NarrowError);
		expect(error.name).toBe("NarrowError");
		// The name is an own assignment, not inherited from Error.prototype.
		expect(Object.hasOwn(error, "name")).toBe(true);
	});
});

describe("isNarrowError", () => {
	test("accepts a real NarrowError", () => {
		expect(isNarrowError(new NarrowError("boom"))).toBe(true);
	});

	test("accepts a cross-realm or duplicated-package twin that fails instanceof", () => {
		// What a NarrowError from an iframe, a vm context, or a second copy of this
		// package looks like from here: right shape, wrong prototype chain.
		const twin = Object.create(null) as { name?: unknown; message?: unknown };
		twin.name = "NarrowError";
		twin.message = "boom";

		expect(twin instanceof NarrowError).toBe(false);
		expect(isNarrowError(twin)).toBe(true);
	});

	test("accepts a subclass twin whose name is its own, not NarrowError", () => {
		// UnhandledTagError overwrites `name`, so a name-only duck-type would miss
		// every cross-realm subclass and break the one-catch-clause promise.
		const twin = new NarrowError("boom");
		Object.defineProperty(twin, "name", { value: "UnhandledTagError" });
		Object.setPrototypeOf(twin, Object.prototype);

		expect(twin instanceof NarrowError).toBe(false);
		expect(isNarrowError(twin)).toBe(true);
	});

	test("rejects other errors and non-objects", () => {
		expect(isNarrowError(new Error("boom"))).toBe(false);
		expect(isNarrowError(new TypeError("boom"))).toBe(false);
		expect(isNarrowError("NarrowError")).toBe(false);
		expect(isNarrowError(null)).toBe(false);
		expect(isNarrowError(undefined)).toBe(false);
		expect(isNarrowError(0)).toBe(false);
		expect(isNarrowError({})).toBe(false);
		expect(isNarrowError([])).toBe(false);
		// A function is not an object as far as `typeof` is concerned.
		expect(isNarrowError(isString)).toBe(false);
		// Right name, no string message — not convincing enough.
		expect(isNarrowError({ name: "NarrowError" })).toBe(false);
		expect(isNarrowError({ name: "NarrowError", message: 42 })).toBe(false);
		// Symbol.toStringTag spoofing does not help either.
		expect(isNarrowError({ [Symbol.toStringTag]: "Error", message: "boom" })).toBe(false);
	});

	test("narrows inside the guarded branch", () => {
		const caught: unknown = new NarrowError("boom", { expected: "User" });

		if (isNarrowError(caught)) {
			expect(caught.expected).toBe("User");
		} else {
			throw new Error("guard should have matched");
		}
	});
});

describe("ensure", () => {
	test("returns the value unchanged when the guard passes", () => {
		const raw: unknown = "hello";
		const value = ensure(raw, isString);

		expect(value).toBe("hello");
		expect(value.toUpperCase()).toBe("HELLO");
	});

	test("throws a NarrowError carrying the rejected value", () => {
		expect(() => ensure(42 as unknown, isString)).toThrow(NarrowError);
		try {
			ensure(42 as unknown, isString);
		} catch (error) {
			expect(isNarrowError(error)).toBe(true);
			expect((error as NarrowError).value).toBe(42);
		}
	});

	test("uses the supplied message, and never interpolates the value by default", () => {
		expect(() => ensure(42 as unknown, isString, "id must be a string")).toThrow(
			"id must be a string",
		);
		try {
			ensure("s3cr3t-token" as unknown, isNumber);
		} catch (error) {
			expect((error as Error).message).toBe("Value did not satisfy the guard");
			expect((error as Error).message).not.toContain("s3cr3t-token");
		}
	});

	test("records `expected` in the fourth position, matching parse", () => {
		try {
			ensure(42 as unknown, isString, undefined, "string");
			throw new Error("expected a throw");
		} catch (error) {
			expect(isNarrowError(error)).toBe(true);
			expect((error as NarrowError).expected).toBe("string");
			expect((error as NarrowError).message).toBe("Expected string");
		}
	});

	test("passes falsy-but-valid values straight through", () => {
		expect(ensure("" as unknown, isString)).toBe("");
		expect(ensure(0 as unknown, isNumber)).toBe(0);
		expect(Number.isNaN(ensure(Number.NaN as unknown, isNumber))).toBe(true);
	});

	test("rejects a boxed primitive, because typeof says object", () => {
		const boxed: unknown = new String("hello");
		expect(() => ensure(boxed, isString)).toThrow(NarrowError);
	});

	test("strips its own frame from the stack trace", () => {
		if (!hasCaptureStackTrace) {
			return;
		}
		try {
			ensure(42 as unknown, isString);
		} catch (error) {
			// The top frame must be this test file, not the module that threw.
			expect((error as Error).stack).not.toContain("src/narrow.ts:");
		}
	});

	test("still throws on an engine without Error.captureStackTrace", () => {
		// JavaScriptCore and SpiderMonkey have no such method; the lookup must miss
		// quietly rather than take the throw path down with it.
		const host = Error as unknown as { captureStackTrace?: unknown };
		const original = host.captureStackTrace;
		try {
			host.captureStackTrace = undefined;
			expect(() => ensure(42 as unknown, isString)).toThrow(NarrowError);
			expect(() => assert(false)).toThrow("Assertion Error");
		} finally {
			host.captureStackTrace = original;
		}
	});
});

describe("ensureDefined", () => {
	test("returns falsy-but-present values", () => {
		expect(ensureDefined(0)).toBe(0);
		expect(ensureDefined("")).toBe("");
		expect(ensureDefined(false)).toBe(false);
		expect(Number.isNaN(ensureDefined(Number.NaN))).toBe(true);
	});

	test("throws a NarrowError for null and undefined", () => {
		expect(() => ensureDefined(null)).toThrow(NarrowError);
		expect(() => ensureDefined(undefined)).toThrow(NarrowError);
		expect(() => ensureDefined(null)).toThrow("Value is null or undefined");
		expect(() => ensureDefined(undefined, "cache miss")).toThrow("cache miss");
	});

	test("narrows away undefined for a Map lookup", () => {
		const cache = new Map<string, { id: string }>([["a", { id: "a" }]]);
		const hit = ensureDefined(cache.get("a"));

		expect(hit.id).toBe("a");
		expect(() => ensureDefined(cache.get("missing"))).toThrow(NarrowError);
	});
});

describe("parse", () => {
	test("returns an ok result whose value is narrowed", () => {
		const result = parse("hello" as unknown, isString);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.toUpperCase()).toBe("HELLO");
		} else {
			throw new Error("expected an ok result");
		}
	});

	test("returns an error result instead of throwing", () => {
		const result = parse(42 as unknown, isString, undefined, "string");

		expect(result.ok).toBe(false);
		if (result.ok) {
			throw new Error("expected a failure result");
		}
		expect(result.error).toBeInstanceOf(NarrowError);
		expect(result.error.message).toBe("Expected string");
		expect(result.error.expected).toBe("string");
		expect(result.error.value).toBe(42);
	});

	test("takes a message in the same position ensure does", () => {
		// Regression: `expected` used to sit here, so swapping ensure -> parse
		// silently turned a message into a shape name and produced the ungrammatical
		// "Expected user id must be a string".
		const result = parse(42 as unknown, isString, "user id must be a string");

		if (result.ok) {
			throw new Error("expected a failure result");
		}
		expect(result.error.message).toBe("user id must be a string");
		expect(result.error.expected).toBeUndefined();
	});

	test("falls back to a generic message when no expectation is described", () => {
		const result = parse(42 as unknown, isString);

		if (result.ok) {
			throw new Error("expected a failure result");
		}
		expect(result.error.message).toBe("Value did not satisfy the guard");
		expect(result.error.expected).toBeUndefined();
	});

	test("never throws, even for null, undefined, and empty containers", () => {
		expect(() => parse(null as unknown, isString)).not.toThrow();
		expect(() => parse(undefined as unknown, isString)).not.toThrow();
		expect(() => parse({} as unknown, isString)).not.toThrow();
		expect(() => parse([] as unknown, isString)).not.toThrow();
		expect(parse(null as unknown, isString).ok).toBe(false);
	});
});

describe("NarrowResult", () => {
	// `NarrowResult` gained a defaulted second type parameter so `./filter` can reuse
	// ONE envelope instead of introducing a second. These tests pin the runtime half
	// of that claim: the field names, the discriminant, and the interoperability of a
	// hand-built envelope with one `parse` produced.

	/** The `./filter` shape: rejection carries the offending input, not an error. */
	function evenOnly(input: number): NarrowResult<number, number> {
		return input % 2 === 0 ? { ok: true, value: input } : { ok: false, error: input };
	}

	/** A consumer written against the default form, fed by both producers below. */
	function render(result: NarrowResult<string>): string {
		return result.ok ? result.value : result.error.message;
	}

	test("parse still produces the default NarrowError-shaped envelope", () => {
		const accepted: NarrowResult<string> = parse("ada" as unknown, isString);
		const rejected: NarrowResult<string> = parse(42 as unknown, isString, "not a string");

		expect(render(accepted)).toBe("ada");
		expect(render(rejected)).toBe("not a string");
	});

	test("a hand-built envelope is interchangeable with parse's output", () => {
		// Structural interop is the whole reason the failure field stays named `error`.
		const handBuilt: NarrowResult<string> = {
			ok: false,
			error: new NarrowError("hand built"),
		};

		expect(render(handBuilt)).toBe("hand built");
		expect(render({ ok: true, value: "literal" })).toBe("literal");
	});

	test("a non-error failure payload discriminates on the same `ok` field", () => {
		const label = (result: NarrowResult<number, number>): string =>
			result.ok ? `kept ${result.value}` : `rejected ${result.error}`;

		expect(evenOnly(4).ok).toBe(true);
		expect(evenOnly(7).ok).toBe(false);
		expect(label(evenOnly(4))).toBe("kept 4");
		expect(label(evenOnly(7))).toBe("rejected 7");
	});

	test("uses ok/value/error, never a second `failure` field name", () => {
		// A second field name would be a second envelope through the back door.
		expect(Object.keys(evenOnly(4))).toStrictEqual(["ok", "value"]);
		expect(Object.keys(evenOnly(7))).toStrictEqual(["ok", "error"]);
		expect(Object.keys(parse(42 as unknown, isString))).toStrictEqual(["ok", "error"]);
		expect("failure" in evenOnly(7)).toBe(false);
	});

	test("falsy payloads do not collapse either arm", () => {
		// `ok` is the discriminant, so a falsy `value` or `error` must still read
		// correctly — the reason this is a tagged union rather than a nullable value.
		// Built through a function, not a narrowed const, so both arms stay live.
		const read = (result: NarrowResult<number, string>): number | string =>
			result.ok ? result.value : result.error;

		expect(read({ ok: true, value: 0 })).toBe(0);
		expect(read({ ok: false, error: "" })).toBe("");
		expect(Number.isNaN(read({ ok: true, value: Number.NaN }))).toBe(true);
		// -0 survives the round trip; toStrictEqual distinguishes it from 0.
		expect(read({ ok: true, value: -0 })).toStrictEqual(-0);
	});

	test("undefined and null are legitimate payloads on both arms", () => {
		const read = (result: NarrowResult<undefined, null>): string =>
			result.ok ? `value:${String(result.value)}` : `error:${String(result.error)}`;

		expect(read({ ok: true, value: undefined })).toBe("value:undefined");
		expect(read({ ok: false, error: null })).toBe("error:null");
		// The success arm still *has* the key, even when the payload is undefined.
		expect("value" in { ok: true as const, value: undefined }).toBe(true);
	});
});

describe("tryNarrow", () => {
	test("returns the narrowed value or undefined", () => {
		expect(tryNarrow("hi" as unknown, isString)).toBe("hi");
		expect(tryNarrow(42 as unknown, isString)).toBeUndefined();
	});

	test("returns falsy-but-valid values rather than collapsing them", () => {
		expect(tryNarrow("" as unknown, isString)).toBe("");
		expect(tryNarrow(0 as unknown, isNumber)).toBe(0);
	});

	test("composes with ?? for defaulting", () => {
		const theme = tryNarrow(null as unknown, isString) ?? "dark";
		expect(theme).toBe("dark");
	});

	test("narrows inside the truthy branch", () => {
		const value = tryNarrow("hi" as unknown, isString);
		if (value !== undefined) {
			expect(value.length).toBe(2);
		} else {
			throw new Error("guard should have matched");
		}
	});
});

describe("narrowAll", () => {
	test("accepts a homogeneous array and narrows it in place", () => {
		const raw: readonly unknown[] = ["a", "b", "c"];

		if (narrowAll(raw, isString)) {
			expect(raw.join("-")).toBe("a-b-c");
		} else {
			throw new Error("guard should have matched");
		}
	});

	test("rejects the whole array when a single element fails", () => {
		expect(narrowAll(["a", 1, "c"] as readonly unknown[], isString)).toBe(false);
		expect(narrowAll([null] as readonly unknown[], isString)).toBe(false);
		expect(narrowAll([undefined] as readonly unknown[], isString)).toBe(false);
	});

	test("accepts the empty array (vacuous truth, like Array.prototype.every)", () => {
		expect(narrowAll([] as readonly unknown[], isString)).toBe(true);
	});

	test("short-circuits on the first failure", () => {
		let calls = 0;
		const counting = (value: unknown): value is string => {
			calls += 1;
			return typeof value === "string";
		};

		expect(narrowAll(["a", 1, "c"] as readonly unknown[], counting)).toBe(false);
		expect(calls).toBe(2);
	});

	test("does not allocate a new array or discard elements the way filter does", () => {
		const raw: readonly unknown[] = ["a", 1];

		expect(narrowAll(raw, isString)).toBe(false);
		// filter would have silently handed back a shorter array; we still hold both.
		expect(raw).toHaveLength(2);
	});
});

describe("unsafeNarrow", () => {
	test("is an identity function at runtime", () => {
		const value = { id: "a" };
		expect(unsafeNarrow<{ id: string }>(value)).toBe(value);
	});

	test("performs no check whatsoever", () => {
		expect(() => unsafeNarrow<string>(42)).not.toThrow();
		expect(unsafeNarrow<string>(null)).toBeNull();
		expect(unsafeNarrow<string>(undefined)).toBeUndefined();
	});
});

describe("assertBy", () => {
	test("narrows the value in the calling scope", () => {
		const raw: unknown = "hello";
		assertBy(raw, isString);
		expect(raw.length).toBe(5);
	});

	test("throws a NarrowError carrying the rejected value", () => {
		expect(() => assertBy(42 as unknown, isString)).toThrow(NarrowError);
		expect(() => assertBy(42 as unknown, isString)).toThrow("Value did not satisfy the guard");
		expect(() => assertBy(42 as unknown, isString, "want a string")).toThrow("want a string");
	});

	test("does not throw for falsy-but-valid values", () => {
		expect(() => assertBy("" as unknown, isString)).not.toThrow();
		expect(() => assertBy(0 as unknown, isNumber)).not.toThrow();
	});
});

describe("assertDefined", () => {
	test("keeps null — it mirrors isDefined, not isNonNullish", () => {
		expect(() => assertDefined(null)).not.toThrow();
		expect(() => assertDefined(0)).not.toThrow();
		expect(() => assertDefined("")).not.toThrow();
		expect(() => assertDefined(false)).not.toThrow();
		expect(() => assertDefined(Number.NaN)).not.toThrow();
	});

	test("throws a NarrowError for undefined", () => {
		expect(() => assertDefined(undefined)).toThrow(NarrowError);
		expect(() => assertDefined(undefined)).toThrow("Value is undefined");
		expect(() => assertDefined(undefined, "queue was empty")).toThrow("queue was empty");
	});

	test("narrows an index read under noUncheckedIndexedAccess", () => {
		const queue: readonly string[] = ["job-1"];
		const first = queue[0];
		assertDefined(first);
		expect(first.toUpperCase()).toBe("JOB-1");
	});
});

describe("assertNonNullish", () => {
	test("throws for both null and undefined", () => {
		expect(() => assertNonNullish(null)).toThrow(NarrowError);
		expect(() => assertNonNullish(undefined)).toThrow(NarrowError);
		expect(() => assertNonNullish(null)).toThrow("Value is null or undefined");
		expect(() => assertNonNullish(null, "#root is missing")).toThrow("#root is missing");
	});

	test("passes every other falsy value", () => {
		expect(() => assertNonNullish(0)).not.toThrow();
		expect(() => assertNonNullish("")).not.toThrow();
		expect(() => assertNonNullish(false)).not.toThrow();
		expect(() => assertNonNullish(Number.NaN)).not.toThrow();
	});

	test("narrows away both null and undefined", () => {
		const maybe: string | null | undefined = "ok";
		assertNonNullish(maybe);
		expect(maybe.length).toBe(2);
	});
});

describe("invariant", () => {
	test("narrows the expression that was passed, not a binding", () => {
		const value = JSON.parse('"ok"') as string | null;
		invariant(value !== null);
		expect(value.length).toBe(2);
	});

	test("throws for every falsy condition", () => {
		for (const falsy of FALSY) {
			expect(() => invariant(falsy)).toThrow(NarrowError);
		}
	});

	test("passes for truthy conditions, including empty containers", () => {
		expect(() => invariant(true)).not.toThrow();
		expect(() => invariant([])).not.toThrow();
		expect(() => invariant({})).not.toThrow();
		expect(() => invariant(Object.create(null))).not.toThrow();
		expect(() => invariant("0")).not.toThrow();
	});

	test("records the offending condition and uses the supplied message", () => {
		expect(() => invariant(0)).toThrow("Invariant violated");
		expect(() => invariant(0, "index out of range")).toThrow("index out of range");
		try {
			invariant(0);
		} catch (error) {
			expect((error as NarrowError).value).toBe(0);
		}
	});
});

describe("assertGuard", () => {
	test("builds an assertion that narrows when the const is annotated", () => {
		const assertString: Assertion<unknown, string> = assertGuard(isString);
		const raw: unknown = "hello";

		assertString(raw);
		expect(raw.length).toBe(5);
	});

	test("throws a NarrowError with the factory's message", () => {
		const assertString: Assertion<unknown, string> = assertGuard(isString, "want a string");

		expect(() => assertString(42)).toThrow(NarrowError);
		expect(() => assertString(42)).toThrow("want a string");
	});

	test("falls back to the generic message and carries the value", () => {
		const assertNumber: Assertion<unknown, number> = assertGuard(isNumber);

		expect(() => assertNumber("nope")).toThrow("Value did not satisfy the guard");
		try {
			assertNumber("nope");
		} catch (error) {
			expect((error as NarrowError).value).toBe("nope");
		}
	});

	test("returns a reusable assertion, fresh per call", () => {
		const assertString: Assertion<unknown, string> = assertGuard(isString);
		const other: Assertion<unknown, string> = assertGuard(isString);

		expect(assertString).not.toBe(other);
		expect(() => assertString("a")).not.toThrow();
		expect(() => assertString("b")).not.toThrow();
		expect(() => assertString(1)).toThrow(NarrowError);
	});
});

describe("assert", () => {
	test("throws a plain Error, not a NarrowError", () => {
		// A subclass would change err.name and break existing instanceof/name checks
		// in code migrating off @resq-systems/helpers.
		try {
			assert(false);
			throw new Error("assert should have thrown");
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
			expect(error).not.toBeInstanceOf(NarrowError);
			expect((error as Error).name).toBe("Error");
			expect(isNarrowError(error)).toBe(false);
		}
	});

	test("throws for every falsy value (falsy, not nullish)", () => {
		for (const falsy of FALSY) {
			expect(() => assert(falsy)).toThrow("Assertion Error");
		}
	});

	test("an empty-string message still falls back to the default", () => {
		// `||` semantics, preserved verbatim from the helpers implementation.
		expect(() => assert(false, "")).toThrow("Assertion Error");
		expect(() => assert(false, "no session")).toThrow("no session");
	});

	test("does not throw for truthy values and narrows the value", () => {
		const session: { userId: string } | undefined = { userId: "u1" };
		assert(session);
		expect(session.userId).toBe("u1");
	});

	test("strips its own frame from the stack trace", () => {
		if (!hasCaptureStackTrace) {
			return;
		}
		try {
			assert(false);
		} catch (error) {
			expect((error as Error).stack).not.toContain("src/narrow.ts:");
		}
	});
});

describe("assertExists", () => {
	test("returns falsy-but-present values instead of throwing", () => {
		expect(assertExists(0)).toBe(0);
		expect(assertExists("")).toBe("");
		expect(assertExists(false)).toBe(false);
		expect(Number.isNaN(assertExists(Number.NaN))).toBe(true);
	});

	test("throws a plain Error for null and undefined", () => {
		expect(() => assertExists(null)).toThrow("value must be defined");
		expect(() => assertExists(undefined)).toThrow("value must be defined");
		try {
			assertExists(null);
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
			expect(error).not.toBeInstanceOf(NarrowError);
		}
	});

	test("uses ?? semantics, so an empty-string message is honored", () => {
		// Unlike assert's `||`, an empty message here is used as-is.
		expect(() => assertExists(null, "")).toThrow(Error);
		try {
			assertExists(null, "");
		} catch (error) {
			expect((error as Error).message).toBe("");
		}
		expect(() => assertExists(null, "port is required")).toThrow("port is required");
	});

	test("returns the value it was given, by reference", () => {
		const config = { port: 8080 };
		expect(assertExists(config)).toBe(config);
	});
});
