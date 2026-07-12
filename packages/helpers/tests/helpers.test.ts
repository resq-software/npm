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

import { expect, test, describe, beforeEach, afterEach, vi } from "vitest";
import {
	bindResult,
	catchError,
	failure,
	getURL,
	isFunction,
	isNumber,
	isPromise,
	isString,
	map,
	railway,
	recover,
	Stringify,
	success,
	tap,
} from "../src/helpers.js";

describe("getURL", () => {
	let warnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	describe("Browser Environment", () => {
		test("returns origin when path is empty", () => {
			const origin = "https://example.com";
			const originalLocation = globalThis.location;

			// Mock location
			Object.defineProperty(globalThis, "location", {
				value: { origin },
				writable: true,
				configurable: true,
			});

			expect(getURL()).toBe(origin);

			// Cleanup
			if (originalLocation) {
				globalThis.location = originalLocation;
			} else {
				// @ts-expect-error
				delete globalThis.location;
			}
		});

		test("appends path correctly", () => {
			const origin = "https://example.com";
			const originalLocation = globalThis.location;
			Object.defineProperty(globalThis, "location", {
				value: { origin },
				writable: true,
				configurable: true,
			});

			expect(getURL("path")).toBe(`${origin}/path`);
			expect(getURL("/path")).toBe(`${origin}/path`); // Handles leading slash

			// Cleanup
			if (originalLocation) {
				globalThis.location = originalLocation;
			} else {
				// @ts-expect-error
				delete globalThis.location;
			}
		});

		test("handles base URL with trailing slash", () => {
			const origin = "https://example.com/";
			const originalLocation = globalThis.location;
			Object.defineProperty(globalThis, "location", {
				value: { origin },
				writable: true,
				configurable: true,
			});

			expect(getURL("path")).toBe("https://example.com/path");

			// Cleanup
			if (originalLocation) {
				globalThis.location = originalLocation;
			} else {
				// @ts-expect-error
				delete globalThis.location;
			}
		});
	});

	describe("Server Environment (No Global Location)", () => {
		test("uses VITE_BASE_URL if defined", () => {
			// Ensure location is undefined
			const originalLocation = globalThis.location;
			// @ts-expect-error
			delete globalThis.location;

			process.env.VITE_BASE_URL = "https://vite.example.com";

			// Note: Current implementation might fail this expectation if path logic is broken
			// But we expect this behavior after fix.
			expect(getURL("api")).toBe("https://vite.example.com/api");

			delete process.env.VITE_BASE_URL;
			// Restore location
			if (originalLocation) globalThis.location = originalLocation;
		});

		test("uses NEXT_PUBLIC_BASE_URL if defined", () => {
			const originalLocation = globalThis.location;
			// @ts-expect-error
			delete globalThis.location;

			process.env.NEXT_PUBLIC_BASE_URL = "https://next.example.com";

			expect(getURL("api")).toBe("https://next.example.com/api");

			delete process.env.NEXT_PUBLIC_BASE_URL;
			if (originalLocation) globalThis.location = originalLocation;
		});

		test("uses BASE_URL if defined", () => {
			const originalLocation = globalThis.location;
			// @ts-expect-error
			delete globalThis.location;

			process.env.BASE_URL = "https://base.example.com";

			expect(getURL("api")).toBe("https://base.example.com/api");

			delete process.env.BASE_URL;
			if (originalLocation) globalThis.location = originalLocation;
		});

		test("returns empty string and warns if no env var found", () => {
			const originalLocation = globalThis.location;
			// @ts-expect-error
			delete globalThis.location;

			// Ensure no env vars
			const oldVite = process.env.VITE_BASE_URL;
			const oldNext = process.env.NEXT_PUBLIC_BASE_URL;
			const oldBase = process.env.BASE_URL;
			delete process.env.VITE_BASE_URL;
			delete process.env.NEXT_PUBLIC_BASE_URL;
			delete process.env.BASE_URL;

			expect(getURL()).toBe("");
			expect(warnSpy).toHaveBeenCalled();

			// Restore
			if (oldVite) process.env.VITE_BASE_URL = oldVite;
			if (oldNext) process.env.NEXT_PUBLIC_BASE_URL = oldNext;
			if (oldBase) process.env.BASE_URL = oldBase;
			if (originalLocation) globalThis.location = originalLocation;
		});
	});
});

describe("Stringify", () => {
	test("formats object as JSON with 2-space indent", () => {
		expect(Stringify({ a: 1, b: 2 })).toBe('{\n  "a": 1,\n  "b": 2\n}');
	});

	test("handles nested objects", () => {
		expect(Stringify({ a: { b: 1 } })).toBe('{\n  "a": {\n    "b": 1\n  }\n}');
	});

	test("handles arrays", () => {
		expect(Stringify({ items: [1, 2, 3] })).toBe('{\n  "items": [\n    1,\n    2,\n    3\n  ]\n}');
	});

	test("throws on circular references", () => {
		const obj: Record<string, unknown> = {};
		obj.self = obj;
		expect(() => Stringify(obj)).toThrow();
	});
});

describe("Result type — success / failure", () => {
	test("success() wraps value with success: true", () => {
		const r = success(42);
		expect(r.success).toBe(true);
		expect(r.value).toBe(42);
	});

	test("failure() wraps error with success: false", () => {
		const err = new Error("boom");
		const r = failure(err);
		expect(r.success).toBe(false);
		expect(r.error).toBe(err);
	});

	test("results are frozen (immutable)", () => {
		const r = success(1);
		expect(Object.isFrozen(r)).toBe(true);
		const f = failure("err");
		expect(Object.isFrozen(f)).toBe(true);
	});

	test("failure accepts non-Error values", () => {
		expect(failure("string error").error).toBe("string error");
		expect(failure(42).error).toBe(42);
		expect(failure({ code: "X" }).error).toEqual({ code: "X" });
	});
});

describe("catchError", () => {
	test("returns success when function resolves", async () => {
		const fn = async (n: number) => n * 2;
		const r = await catchError(fn, 21);
		expect(r.success).toBe(true);
		if (r.success) expect(r.value).toBe(42);
	});

	test("returns failure when function rejects with Error", async () => {
		const fn = async (): Promise<number> => {
			throw new Error("nope");
		};
		const r = await catchError(fn);
		expect(r.success).toBe(false);
		if (!r.success) {
			expect(r.error).toBeInstanceOf(Error);
			expect(r.error.message).toBe("nope");
		}
	});

	test("coerces non-Error throws into Error", async () => {
		const fn = async (): Promise<number> => {
			// eslint-disable-next-line @typescript-eslint/no-throw-literal
			throw "string thrown";
		};
		const r = await catchError(fn);
		expect(r.success).toBe(false);
		if (!r.success) {
			expect(r.error).toBeInstanceOf(Error);
			expect(r.error.message).toBe("string thrown");
		}
	});

	test("forwards arguments to wrapped function", async () => {
		const fn = async (s: string) => s.toUpperCase();
		const r = await catchError(fn, "hi");
		expect(r.success).toBe(true);
		if (r.success) expect(r.value).toBe("HI");
	});

	test("infers and forwards a full variadic argument list (2+ args)", async () => {
		// The wrapped function's parameter types must be preserved position-by-position;
		// a broken variadic inference would collapse (string, number, boolean) into one slot.
		const fn = async (label: string, count: number, upper: boolean): Promise<string> => {
			const body = `${label}:${count}`;
			return upper ? body.toUpperCase() : body;
		};
		const r = await catchError(fn, "item", 3, true);
		expect(r.success).toBe(true);
		if (r.success) {
			const value: string = r.value;
			expect(value).toBe("ITEM:3");
		}
	});

	test("infers rest parameters of the wrapped function", async () => {
		const sum = async (...nums: number[]): Promise<number> => nums.reduce((a, b) => a + b, 0);
		const r = await catchError(sum, 1, 2, 3, 4);
		expect(r.success).toBe(true);
		if (r.success) expect(r.value).toBe(10);
	});
});

describe("map", () => {
	test("transforms success value", () => {
		const double = map<number, number, string>((n) => n * 2);
		const r = double(success(21));
		expect(r.success).toBe(true);
		if (r.success) expect(r.value).toBe(42);
	});

	test("passes failure through unchanged", () => {
		const double = map<number, number, string>((n) => n * 2);
		const r = double(failure("nope"));
		expect(r.success).toBe(false);
		if (!r.success) expect(r.error).toBe("nope");
	});
});

describe("bindResult", () => {
	test("chains success through Result-returning function", () => {
		const validate = (n: number) => (n > 0 ? success(n) : failure("non-positive"));
		const chain = bindResult(validate);
		const ok = chain(success(5));
		expect(ok.success).toBe(true);
		if (ok.success) expect(ok.value).toBe(5);
		const bad = chain(success(-1));
		expect(bad.success).toBe(false);
		if (!bad.success) expect(bad.error).toBe("non-positive");
	});

	test("passes failure through without invoking fn", () => {
		const fn = vi.fn(() => success(1));
		const chain = bindResult(fn);
		const r = chain(failure("upstream"));
		expect(fn).not.toHaveBeenCalled();
		expect(r.success).toBe(false);
	});
});

describe("railway", () => {
	test("composes successful steps left-to-right", () => {
		const r = railway(
			"5",
			(s: string) => success(Number.parseInt(s, 10)),
			(n: number) => success(n * 2),
		);
		expect(r.success).toBe(true);
		if (r.success) expect(r.value).toBe(10);
	});

	test("short-circuits on first failure", () => {
		const step3 = vi.fn((n: number) => success(n + 1));
		const r = railway(
			"5",
			(s: string) => success(Number.parseInt(s, 10)),
			(_n: number) => failure("validation"),
			step3,
		);
		expect(step3).not.toHaveBeenCalled();
		expect(r.success).toBe(false);
		if (!r.success) expect(r.error).toBe("validation");
	});

	test("supports up to five steps", () => {
		const r = railway(
			0,
			(n: number) => success(n + 1),
			(n: number) => success(n + 1),
			(n: number) => success(n + 1),
			(n: number) => success(n + 1),
			(n: number) => success(n + 1),
		);
		expect(r.success).toBe(true);
		if (r.success) expect(r.value).toBe(5);
	});
});

describe("recover", () => {
	test("transforms failure to success", () => {
		const fallback = recover<number, string, never>(() => success(0));
		const r = fallback(failure("err"));
		expect(r.success).toBe(true);
		if (r.success) expect(r.value).toBe(0);
	});

	test("passes success through unchanged", () => {
		const handler = vi.fn(() => success(0));
		const fallback = recover<number, string, never>(handler);
		const r = fallback(success(99));
		expect(handler).not.toHaveBeenCalled();
		expect(r.success).toBe(true);
		if (r.success) expect(r.value).toBe(99);
	});

	test("can return a different failure", () => {
		const remap = recover<number, string, number>((s) => failure(s.length));
		const r = remap(failure("hello"));
		expect(r.success).toBe(false);
		if (!r.success) expect(r.error).toBe(5);
	});
});

describe("tap", () => {
	test("calls side effect on success and returns same Result", () => {
		const spy = vi.fn();
		const t = tap<number, string>(spy);
		const input = success(7);
		const out = t(input);
		expect(spy).toHaveBeenCalledWith(7);
		expect(out).toBe(input); // identity preserved
	});

	test("does not call side effect on failure", () => {
		const spy = vi.fn();
		const t = tap<number, string>(spy);
		const input = failure("err");
		const out = t(input);
		expect(spy).not.toHaveBeenCalled();
		expect(out).toBe(input);
	});
});

describe("type guards", () => {
	describe("isNumber", () => {
		test("true for number primitives including NaN and Infinity", () => {
			expect(isNumber(0)).toBe(true);
			expect(isNumber(-1)).toBe(true);
			expect(isNumber(0.5)).toBe(true);
			expect(isNumber(Number.NaN)).toBe(true);
			expect(isNumber(Number.POSITIVE_INFINITY)).toBe(true);
		});

		test("false for non-numbers", () => {
			expect(isNumber("0")).toBe(false);
			expect(isNumber(null)).toBe(false);
			expect(isNumber(undefined)).toBe(false);
			expect(isNumber({})).toBe(false);
			expect(isNumber([])).toBe(false);
			expect(isNumber(true)).toBe(false);
		});
	});

	describe("isString", () => {
		test("true for string primitives including empty string", () => {
			expect(isString("")).toBe(true);
			expect(isString("hello")).toBe(true);
		});

		test("false for non-strings", () => {
			expect(isString(0)).toBe(false);
			expect(isString(null)).toBe(false);
			expect(isString(undefined)).toBe(false);
			// String wrapper objects do not match
			// eslint-disable-next-line no-new-wrappers
			expect(isString(new String("x"))).toBe(false);
		});
	});

	describe("isFunction", () => {
		test("true for function declarations, arrows, and classes", () => {
			expect(isFunction(() => 0)).toBe(true);
			expect(isFunction(function named() {})).toBe(true);
			expect(isFunction(class C {})).toBe(true);
			expect(isFunction(Math.max)).toBe(true);
		});

		test("false for non-functions", () => {
			expect(isFunction(0)).toBe(false);
			expect(isFunction("fn")).toBe(false);
			expect(isFunction(null)).toBe(false);
			expect(isFunction({})).toBe(false);
		});
	});

	describe("isPromise", () => {
		test("true for native Promise", () => {
			expect(isPromise(Promise.resolve())).toBe(true);
			expect(isPromise(new Promise(() => {}))).toBe(true);
		});

		test("true for thenable duck-types", () => {
			// biome-ignore lint/suspicious/noThenProperty: testing thenable duck-typing detection
			const thenable: unknown = { then: () => undefined };
			expect(isPromise(thenable)).toBe(true);
		});

		test("false for non-promises", () => {
			expect(isPromise(null)).toBe(false);
			expect(isPromise(undefined)).toBe(false);
			expect(isPromise({})).toBe(false);
			// biome-ignore lint/suspicious/noThenProperty: testing rejection of non-callable .then
			const fakeThenable: unknown = { then: "not a function" };
			expect(isPromise(fakeThenable)).toBe(false);
			expect(isPromise(() => undefined)).toBe(false);
		});
	});
});
