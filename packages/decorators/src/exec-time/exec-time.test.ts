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
import { execTime } from "./exec-time.js";
import { execTimeFn } from "./exec-time.fn.js";

describe("execTimeFn", () => {
	test("calls original method and custom reporter", async () => {
		let reportedData: { execTime: number; args: unknown[]; result: unknown } | undefined;
		const original = (x: number) => x * 2;

		const wrapped = execTimeFn(original, (data) => {
			reportedData = data;
		});

		await wrapped(5);

		expect(reportedData).toBeDefined();
		expect(reportedData!.result).toBe(10);
		expect(reportedData!.args).toEqual([5]);
		expect(reportedData!.execTime).toBeGreaterThanOrEqual(0);
	});

	test("handles async methods", async () => {
		let reportedTime = -1;
		const asyncFn = async (x: number) => {
			await new Promise((r) => setTimeout(r, 20));
			return x + 1;
		};

		const wrapped = execTimeFn(asyncFn, (data) => {
			reportedTime = data.execTime;
		});

		await wrapped(10);

		expect(reportedTime).toBeGreaterThanOrEqual(15);
	});

	test("uses default reporter without error", async () => {
		const fn = () => "ok";
		const wrapped = execTimeFn(fn);

		// Should not throw — default reporter logs via logger.info
		await wrapped();
	});

	test("uses string label as reporter", async () => {
		const fn = () => 42;
		const wrapped = execTimeFn(fn, "my-operation");

		// Call with an object context so `this[input]` lookup doesn't throw on undefined
		await wrapped.call({});
	});
});

describe("execTimeFn — return value + sync-ness (regression)", () => {
	test("returns the synchronous result directly, not a promise", () => {
		const wrapped = execTimeFn(
			(x: number) => x * 2,
			() => {},
		);
		const out = wrapped(21);
		// Regression: the wrapper previously returned `Promise<void>`, discarding
		// the value and forcing async. It must return the original result as-is.
		expect(out).toBe(42);
		expect(out).not.toBeInstanceOf(Promise);
	});

	test("returns a promise resolving to the original async result", async () => {
		const wrapped = execTimeFn(
			async (x: number) => x + 1,
			() => {},
		);
		const out = wrapped(9);
		expect(out).toBeInstanceOf(Promise);
		await expect(out).resolves.toBe(10);
	});

	test("reports the resolved value (not the pending promise) for async methods", async () => {
		let reported: unknown;
		const wrapped = execTimeFn(
			async () => "done",
			(data) => {
				reported = data.result;
			},
		);
		await wrapped();
		expect(reported).toBe("done");
	});
});

describe("@execTime decorator preserves the decorated method's return value", () => {
	test("synchronous decorated method still returns its value", () => {
		class Calc {
			@execTime(() => {})
			double(n: number): number {
				return n * 2;
			}
		}
		// The exact resq regression: a decorated method must not collapse to
		// `Promise<void>` — downstream callers (e.g. `.filter`) rely on the value.
		expect(new Calc().double(8)).toBe(16);
	});

	test("async decorated method still resolves to its value", async () => {
		class Loader {
			@execTime(() => {})
			async load(id: string): Promise<string> {
				return `item:${id}`;
			}
		}
		await expect(new Loader().load("42")).resolves.toBe("item:42");
	});
});
