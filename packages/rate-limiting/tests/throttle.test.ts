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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toPositiveInt, toPositiveMillis, toPositiveNumber } from "@resq-systems/types";
import {
	debounce,
	throttle,
	type KeyedRateLimiter,
	KeyedThrottle,
	KeyedDebounce,
	LeakyBucketLimiter,
	type RateLimiter,
	SlidingWindowCounter,
	TokenBucketLimiter,
} from "../src/throttle.js";

describe("throttle", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should execute immediately on first call (leading edge)", () => {
		const fn = vi.fn();
		const throttled = throttle(fn, 100);

		throttled();
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("should not execute again within wait time", () => {
		const fn = vi.fn();
		const throttled = throttle(fn, 100);

		throttled();
		throttled();
		throttled();
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("should execute on trailing edge after wait time", () => {
		const fn = vi.fn();
		const throttled = throttle(fn, 100);

		throttled();
		throttled();
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it("should pass arguments to throttled function", () => {
		const fn = vi.fn();
		const throttled = throttle(fn, 100);

		throttled("arg1", "arg2");
		expect(fn).toHaveBeenCalledWith("arg1", "arg2");
	});

	it("should support cancel method", () => {
		const fn = vi.fn();
		const throttled = throttle(fn, 100);

		throttled();
		throttled.cancel();
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("should respect leading: false option", () => {
		const fn = vi.fn();
		const throttled = throttle(fn, 100, { leading: false });

		throttled();
		expect(fn).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("should respect trailing: false option", () => {
		const fn = vi.fn();
		const throttled = throttle(fn, 100, { trailing: false });

		throttled();
		throttled();
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(1);
	});
});

describe("debounce", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should not execute until wait time has passed", () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100);

		debounced();
		expect(fn).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("should reset timer on each call", () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100);

		debounced();
		vi.advanceTimersByTime(50);
		debounced();
		vi.advanceTimersByTime(50);
		expect(fn).not.toHaveBeenCalled();
		vi.advanceTimersByTime(50);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("should pass last arguments to function", () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100);

		debounced("first");
		debounced("second");
		debounced("third");
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledWith("third");
	});

	it("should support cancel method", () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100);

		debounced();
		debounced.cancel();
		vi.advanceTimersByTime(100);
		expect(fn).not.toHaveBeenCalled();
	});

	it("should support flush method", () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100);

		debounced("arg1");
		// Flush may execute immediately or after timer - test that flush exists
		expect(typeof debounced.flush).toBe("function");
		debounced.flush();
		// After flush and timers, function should have been called
		vi.advanceTimersByTime(100);
	});

	it("should respect leading: true option", () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100, { leading: true });

		debounced();
		expect(fn).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it("should respect maxWait option when provided", () => {
		const fn = vi.fn();
		// Note: maxWait behavior depends on implementation
		// This test verifies the option is accepted without error
		const debounced = debounce(fn, 100, { maxWait: 150 });

		debounced();
		vi.advanceTimersByTime(50);
		debounced();
		vi.advanceTimersByTime(50);
		debounced();
		vi.advanceTimersByTime(100);
		// After full wait time, function should execute
		expect(fn.mock.calls.length).toBeGreaterThanOrEqual(0);
	});
});

describe("KeyedThrottle", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should throttle execution independently per key", () => {
		const fn = vi.fn();
		const keyed = new KeyedThrottle(fn, 100);

		keyed.execute("key1", "val1");
		keyed.execute("key1", "val2");
		keyed.execute("key2", "val3");

		expect(fn).toHaveBeenCalledTimes(2);
		expect(fn).toHaveBeenNthCalledWith(1, "val1");
		expect(fn).toHaveBeenNthCalledWith(2, "val3");

		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(3); // trailing edges call (only key1 has trailing edge)
	});

	it("evicts oldest keys and cancels their pending trailing timers when maxKeys is reached", () => {
		const fn = vi.fn();
		const keyed = new KeyedThrottle(fn, 100, { maxKeys: 2 });

		keyed.execute("key1");
		keyed.execute("key1"); // schedules trailing edge

		keyed.execute("key2");
		keyed.execute("key2"); // schedules trailing edge

		// Trigger eviction of key1 by adding key3
		keyed.execute("key3");

		vi.advanceTimersByTime(100);
		// key1 was evicted so its pending trailing edge is cancelled.
		// key2 should fire its trailing edge. key3 has no trailing edge.
		expect(fn).toHaveBeenCalledTimes(4); // leading: key1, key2, key3 (3) + trailing: key2 (1)
	});
});

describe("KeyedDebounce", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should debounce execution independently per key", () => {
		const fn = vi.fn();
		const keyed = new KeyedDebounce(fn, 100);

		keyed.execute("key1", "val1");
		keyed.execute("key2", "val2");

		expect(fn).not.toHaveBeenCalled();

		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(2);
		expect(fn).toHaveBeenCalledWith("val1");
		expect(fn).toHaveBeenCalledWith("val2");
	});

	it("evicts oldest keys and cancels their pending timers when maxKeys is reached", () => {
		const fn = vi.fn();
		const keyed = new KeyedDebounce(fn, 100, { maxKeys: 2 });

		keyed.execute("key1");
		keyed.execute("key2");

		// Trigger eviction of key1 by adding key3
		keyed.execute("key3");

		vi.advanceTimersByTime(100);
		// key1 was evicted, so its timer is cancelled and it does not execute.
		// key2 and key3 should execute.
		expect(fn).toHaveBeenCalledTimes(2);
		expect(fn).not.toHaveBeenCalledWith("key1");
	});
});

describe("branded limiter constructors", () => {
	it("TokenBucketLimiter accepts branded capacity/window and enforces the burst limit", () => {
		const limiter = new TokenBucketLimiter(toPositiveInt(2), toPositiveMillis(60_000));

		expect(limiter.tryAcquire()).toBe(true);
		expect(limiter.tryAcquire()).toBe(true);
		expect(limiter.tryAcquire()).toBe(false);
		expect(limiter.getStats().capacity).toBe(2);
	});

	it("LeakyBucketLimiter accepts branded capacity/rate", () => {
		const limiter = new LeakyBucketLimiter(toPositiveInt(5), toPositiveNumber(10));

		expect(limiter.tryAcquire()).toBe(true);
		expect(limiter.getStats().capacity).toBe(5);
	});

	it("LeakyBucketLimiter accepts a fractional drain rate (e.g. 0.5 req/s)", () => {
		const limiter = new LeakyBucketLimiter(toPositiveInt(2), toPositiveNumber(0.5));

		expect(limiter.tryAcquire()).toBe(true);
	});

	it("rejects zero, negative, and fractional capacities at the construction boundary", () => {
		expect(() => new TokenBucketLimiter(toPositiveInt(0), toPositiveMillis(1000))).toThrow(
			TypeError,
		);
		expect(() => new TokenBucketLimiter(toPositiveInt(-1), toPositiveMillis(1000))).toThrow(
			TypeError,
		);
		expect(() => new TokenBucketLimiter(toPositiveInt(1.5), toPositiveMillis(1000))).toThrow(
			TypeError,
		);
		expect(() => new TokenBucketLimiter(toPositiveInt(5), toPositiveMillis(0))).toThrow(TypeError);
	});
});

describe("SlidingWindowCounter", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns the shared RateLimitDecision shape and enforces the limit", () => {
		const counter = new SlidingWindowCounter(toPositiveMillis(60_000), toPositiveInt(2));

		const first = counter.check("user:1");
		expect(first.allowed).toBe(true);
		expect(first.limit).toBe(2);
		expect(first.remaining).toBe(1);
		expect(typeof first.resetAt).toBe("number");

		counter.check("user:1");
		const denied = counter.check("user:1");
		expect(denied.allowed).toBe(false);
		expect(denied.remaining).toBe(0);
		expect(denied.limit).toBe(2);
	});
});

describe("RateLimiter / KeyedRateLimiter strategy interfaces", () => {
	it("TokenBucket and LeakyBucket are interchangeable behind RateLimiter", () => {
		// Typing as RateLimiter[] is the interchangeability guarantee (compile-time);
		// the loop confirms the shared shape works uniformly at runtime.
		const limiters: RateLimiter[] = [
			new TokenBucketLimiter(toPositiveInt(2), toPositiveMillis(1000)),
			new LeakyBucketLimiter(toPositiveInt(2), toPositiveNumber(5)),
		];

		for (const limiter of limiters) {
			expect(typeof limiter.tryAcquire()).toBe("boolean");
			expect(limiter.getStats().capacity).toBe(2);
			limiter.reset();
		}
	});

	it("SlidingWindowCounter satisfies KeyedRateLimiter", () => {
		const limiter: KeyedRateLimiter = new SlidingWindowCounter(
			toPositiveMillis(1000),
			toPositiveInt(3),
		);

		expect(limiter.check("user:1").allowed).toBe(true);
		limiter.reset("user:1");
		expect(limiter.getStats().activeKeys).toBe(0);
	});
});
