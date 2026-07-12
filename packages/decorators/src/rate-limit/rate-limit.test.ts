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
import { rateLimitFn } from "./rate-limit.fn.js";

describe("rateLimit", () => {
	describe("rateLimitFn", () => {
		test("allows calls within the limit", () => {
			let callCount = 0;
			const fn = rateLimitFn(
				() => {
					callCount++;
					return "ok";
				},
				{ allowedCalls: 3, timeSpanMs: 1000 },
			);

			expect(fn()).toBe("ok");
			expect(fn()).toBe("ok");
			expect(fn()).toBe("ok");
			expect(callCount).toBe(3);
		});

		test("returns undefined when limit exceeded", () => {
			let callCount = 0;
			const fn = rateLimitFn(
				() => {
					callCount++;
					return "ok";
				},
				{ allowedCalls: 2, timeSpanMs: 1000 },
			);

			expect(fn()).toBe("ok");
			expect(fn()).toBe("ok");
			expect(fn()).toBeUndefined();
			expect(callCount).toBe(2);
		});

		test("calls exceedHandler when limit exceeded", () => {
			let exceeded = false;
			const fn = rateLimitFn(() => "ok", {
				allowedCalls: 1,
				timeSpanMs: 1000,
				exceedHandler: () => {
					exceeded = true;
				},
			});

			fn();
			fn();
			expect(exceeded).toBe(true);
		});

		test("resets counter after timeSpan", async () => {
			let callCount = 0;
			const fn = rateLimitFn(
				() => {
					callCount++;
					return "ok";
				},
				{ allowedCalls: 1, timeSpanMs: 30 },
			);

			expect(fn()).toBe("ok");
			expect(fn()).toBeUndefined();

			await new Promise((r) => setTimeout(r, 60));
			expect(fn()).toBe("ok");
			expect(callCount).toBe(2);
		});

		test("resolves the bucket key from a method name on the instance", () => {
			let callCount = 0;
			const obj = {
				bucket(id: string): string {
					return id;
				},
				limited: rateLimitFn(
					(_id: string) => {
						callCount++;
						return "ok";
					},
					{ allowedCalls: 1, timeSpanMs: 1000, keyResolver: "bucket" },
				),
			};

			expect(obj.limited("a")).toBe("ok"); // bucket "a"
			expect(obj.limited("b")).toBe("ok"); // bucket "b" — independent
			expect(obj.limited("a")).toBeUndefined(); // bucket "a" exceeded
			expect(callCount).toBe(2);
		});

		test("supports an async (distributed) counter and returns a promise", async () => {
			const counts = new Map<string, number>();
			const asyncCounter = {
				inc: async (key: string): Promise<void> => {
					counts.set(key, (counts.get(key) ?? 0) + 1);
				},
				dec: async (key: string): Promise<void> => {
					counts.set(key, Math.max((counts.get(key) ?? 0) - 1, 0));
				},
				getCount: async (key: string): Promise<number> => counts.get(key) ?? 0,
			};

			let callCount = 0;
			const fn = rateLimitFn(
				() => {
					callCount++;
					return "ok";
				},
				{ allowedCalls: 2, timeSpanMs: 1000, rateLimitAsyncCounter: asyncCounter },
			);

			expect(await fn()).toBe("ok");
			expect(await fn()).toBe("ok");
			expect(await fn()).toBeUndefined();
			expect(callCount).toBe(2);
		});
	});
});
