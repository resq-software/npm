/**
 * Copyright 2026 ResQ
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

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type IRateLimitStore,
	MemoryRateLimitStore,
	RATE_LIMIT_PRESETS,
} from "../src/rate-limit.js";

// ------------------------------------------------------------------
// MemoryRateLimitStore
// ------------------------------------------------------------------

describe("MemoryRateLimitStore", () => {
	let store: MemoryRateLimitStore;

	beforeEach(() => {
		store = new MemoryRateLimitStore();
	});

	it("allows the first request within the window", async () => {
		const result = await store.check("user:1", 60_000, 5);
		expect(result.limited).toBe(false);
		expect(result.remaining).toBe(4);
		expect(result.total).toBe(5);
	});

	it("decrements remaining count on each request", async () => {
		await store.check("user:1", 60_000, 5);
		const result = await store.check("user:1", 60_000, 5);
		expect(result.remaining).toBe(3);
		expect(result.limited).toBe(false);
	});

	it("marks as limited when requests exceed maxRequests", async () => {
		const key = "user:flood";
		const max = 3;
		await store.check(key, 60_000, max);
		await store.check(key, 60_000, max);
		await store.check(key, 60_000, max);

		const result = await store.check(key, 60_000, max);
		expect(result.limited).toBe(true);
		expect(result.remaining).toBe(0);
	});

	it("returns remaining 0 when exactly at limit", async () => {
		const key = "user:exact";
		const max = 2;
		await store.check(key, 60_000, max);
		await store.check(key, 60_000, max);

		// 2 requests with max 2 — count equals max, not over yet
		// Third request pushes count to 3 which is > max
		const result = await store.check(key, 60_000, max);
		expect(result.limited).toBe(true);
		expect(result.remaining).toBe(0);
	});

	it("resets the counter for a key", async () => {
		const key = "user:reset";
		await store.check(key, 60_000, 2);
		await store.check(key, 60_000, 2);

		await store.reset(key);

		const result = await store.check(key, 60_000, 2);
		expect(result.limited).toBe(false);
		expect(result.remaining).toBe(1);
	});

	it("tracks different keys independently", async () => {
		await store.check("user:a", 60_000, 1);
		await store.check("user:a", 60_000, 1);

		const resultA = await store.check("user:a", 60_000, 1);
		const resultB = await store.check("user:b", 60_000, 1);

		expect(resultA.limited).toBe(true);
		expect(resultB.limited).toBe(false);
	});

	it("resets window after expiration", async () => {
		vi.useFakeTimers();
		try {
			const key = "user:expire";
			const windowMs = 1000;

			await store.check(key, windowMs, 1);
			await store.check(key, windowMs, 1); // over limit

			// Advance past window
			vi.advanceTimersByTime(1001);

			const result = await store.check(key, windowMs, 1);
			expect(result.limited).toBe(false);
			expect(result.remaining).toBe(0);
		} finally {
			vi.useRealTimers();
		}
	});

	it("returns a valid resetTime in the future", async () => {
		const before = Date.now();
		const result = await store.check("user:time", 60_000, 10);
		expect(result.resetTime).toBeGreaterThan(before);
	});

	it("implements IRateLimitStore interface", () => {
		const iface: IRateLimitStore = store;
		expect(typeof iface.check).toBe("function");
		expect(typeof iface.reset).toBe("function");
	});

	it("returns correct total value", async () => {
		const result = await store.check("user:total", 60_000, 42);
		expect(result.total).toBe(42);
	});

	it("evicts oldest keys when maxSize is exceeded to prevent unbounded memory growth", async () => {
		const boundedStore = new MemoryRateLimitStore({ maxSize: 2 });
		await boundedStore.check("user:1", 60_000, 5);
		await boundedStore.check("user:2", 60_000, 5);

		// Trigger eviction of user:1 by adding user:3
		await boundedStore.check("user:3", 60_000, 5);

		// user:1 should have been evicted and start fresh
		const result1 = await boundedStore.check("user:1", 60_000, 5);
		expect(result1.remaining).toBe(4); // would be 3 if it wasn't evicted
	});

	it("smooths limits across windows via sliding window estimation", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(1000);
		try {
			const key = "user:sliding";
			const windowMs = 1000;
			const maxRequests = 10;

			// Populate 10 requests at t=1000
			for (let i = 0; i < maxRequests; i++) {
				await store.check(key, windowMs, maxRequests);
			}

			// Under sliding window, at t=1500ms (halfway into next window), the estimated count of the first window is
			// 10 * (1 - 0.5) = 5. So we should be able to make 5 more requests.
			vi.advanceTimersByTime(1500);

			const result = await store.check(key, windowMs, maxRequests);
			expect(result.limited).toBe(false);
			expect(result.remaining).toBe(4); // 10 - (5 + 1) = 4
		} finally {
			vi.useRealTimers();
		}
	});
});

// ------------------------------------------------------------------
// RATE_LIMIT_PRESETS
// ------------------------------------------------------------------

describe("RATE_LIMIT_PRESETS", () => {
	it("has an auth preset with windowMs and maxRequests", () => {
		expect(RATE_LIMIT_PRESETS.auth).toBeDefined();
		expect(RATE_LIMIT_PRESETS.auth.windowMs).toBe(15 * 60 * 1000);
		expect(RATE_LIMIT_PRESETS.auth.maxRequests).toBe(5);
	});

	it("has an api preset with windowMs and maxRequests", () => {
		expect(RATE_LIMIT_PRESETS.api).toBeDefined();
		expect(RATE_LIMIT_PRESETS.api.windowMs).toBe(60 * 1000);
		expect(RATE_LIMIT_PRESETS.api.maxRequests).toBe(100);
	});

	it("has a read preset with windowMs and maxRequests", () => {
		expect(RATE_LIMIT_PRESETS.read).toBeDefined();
		expect(RATE_LIMIT_PRESETS.read.windowMs).toBe(60 * 1000);
		expect(RATE_LIMIT_PRESETS.read.maxRequests).toBe(200);
	});

	it("has an upload preset with windowMs and maxRequests", () => {
		expect(RATE_LIMIT_PRESETS.upload).toBeDefined();
		expect(RATE_LIMIT_PRESETS.upload.windowMs).toBe(60 * 60 * 1000);
		expect(RATE_LIMIT_PRESETS.upload.maxRequests).toBe(20);
	});

	it("auth preset is more restrictive than api preset", () => {
		expect(RATE_LIMIT_PRESETS.auth.maxRequests).toBeLessThan(RATE_LIMIT_PRESETS.api.maxRequests);
	});
});
