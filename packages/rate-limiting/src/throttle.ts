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

/**
 * @file Throttle and Debounce Utilities
 * @module utils/throttle
 * @author ResQ
 * @description Provides functions to limit the rate at which functions can be called.
 *              Useful for preventing excessive API calls and managing request frequency.
 *              Includes throttle, debounce, rate limiter, and queue utilities.
 * @compliance NIST 800-53 SC-5 (Denial of Service Protection)
 */

import { Schema as S } from "effect";
import { LRUCache } from "@resq-sw/dsa";

// ============================================
// Effect Schema Definitions
// ============================================

/**
 * Throttle Options Schema
 */
const ThrottleOptionsSchema = S.Struct({
	/** Whether to call the function on the leading edge */
	leading: S.optional(S.Boolean),
	/** Whether to call the function on the trailing edge */
	trailing: S.optional(S.Boolean),
});

export type ThrottleOptions = typeof ThrottleOptionsSchema.Type;

/**
 * Debounce Options Schema
 */
const DebounceOptionsSchema = S.Struct({
	/** Whether to call the function on the leading edge */
	leading: S.optional(S.Boolean),
	/** Maximum time to wait before forcing execution */
	maxWait: S.optional(S.Number),
});

export type DebounceOptions = typeof DebounceOptionsSchema.Type;

/**
 * Rate Limiter Stats Schema
 */
const RateLimiterStatsSchema = S.Struct({
	availableTokens: S.Number,
	queueSize: S.Number,
	capacity: S.Number,
});

export type RateLimiterStats = typeof RateLimiterStatsSchema.Type;

/**
 * Keyed Stats Schema
 */
const KeyedStatsSchema = S.Struct({
	activeKeys: S.Number,
	keys: S.Array(S.String),
});

export type KeyedStats = typeof KeyedStatsSchema.Type;

// ============================================
// Generic Function Type
// ============================================

/** Generic callable function type */
type AnyFunction = (...args: never[]) => unknown;

// ============================================
// Throttle Function
// ============================================

/**
 * Throttle a function to only execute once per specified interval
 *
 * @param func Function to throttle
 * @param wait Wait time in milliseconds
 * @param options Throttle options
 * @returns Throttled function
 *
 * @example
 * ```ts
 * const fetchData = throttle(() => fetch('/api/data'), 1000);
 * fetchData(); // Executes immediately
 * fetchData(); // Ignored
 * fetchData(); // Ignored
 * // After 1000ms, next call will execute
 * ```
 */
export function throttle<T extends AnyFunction>(
	func: T,
	wait: number,
	options: ThrottleOptions = {},
): ((...args: Parameters<T>) => ReturnType<T> | undefined) & { cancel: () => void } {
	let timeout: ReturnType<typeof setTimeout> | null = null;
	let previous = 0;
	let result: ReturnType<T> | undefined;

	const { leading = true, trailing = true } = options;

	const later = (context: unknown, args: Parameters<T>) => {
		previous = leading === false ? 0 : Date.now();
		timeout = null;
		result = func.apply(context, args) as ReturnType<T>;
	};

	const throttled = function (this: unknown, ...args: Parameters<T>): ReturnType<T> | undefined {
		const now = Date.now();

		if (!previous && leading === false) {
			previous = now;
		}

		const remaining = wait - (now - previous);

		if (remaining <= 0 || remaining > wait) {
			if (timeout) {
				clearTimeout(timeout);
				timeout = null;
			}
			previous = now;
			result = func.apply(this, args) as ReturnType<T>;
		} else if (!timeout && trailing) {
			timeout = setTimeout(() => later(this, args), remaining);
		}

		return result;
	} as ((...args: Parameters<T>) => ReturnType<T> | undefined) & { cancel: () => void };

	throttled.cancel = () => {
		if (timeout) {
			clearTimeout(timeout);
			timeout = null;
		}
		previous = 0;
	};

	return throttled;
}

// ============================================
// Debounce Function
// ============================================

/**
 * Debounce a function to only execute after it stops being called for specified time
 *
 * @param func Function to debounce
 * @param wait Wait time in milliseconds
 * @param options Debounce options
 * @returns Debounced function
 *
 * @example
 * ```ts
 * const search = debounce((query) => fetchSearchResults(query), 300);
 * search('a'); // Waiting...
 * search('ab'); // Waiting...
 * search('abc'); // Executes after 300ms of no calls
 * ```
 */
export function debounce<T extends AnyFunction>(
	func: T,
	wait: number,
	options: DebounceOptions = {},
): ((...args: Parameters<T>) => void) & { cancel: () => void; flush: () => void } {
	let timeout: ReturnType<typeof setTimeout> | null = null;
	let lastCallTime = 0;
	let lastInvokeTime = 0;

	const { leading = false, maxWait } = options;

	const invokeFunc = (context: unknown, args: Parameters<T>) => {
		lastInvokeTime = Date.now();
		func.apply(context, args);
	};

	const shouldInvoke = (time: number) => {
		const timeSinceLastCall = time - lastCallTime;
		const timeSinceLastInvoke = time - lastInvokeTime;

		return (
			lastCallTime === 0 ||
			timeSinceLastCall >= wait ||
			timeSinceLastCall < 0 ||
			(maxWait !== undefined && timeSinceLastInvoke >= maxWait)
		);
	};

	const timerExpired = function (this: unknown, args: Parameters<T>) {
		timeout = null;
		invokeFunc(this, args);
	};

	const debounced = function (this: unknown, ...args: Parameters<T>): void {
		const time = Date.now();
		const isInvoking = shouldInvoke(time);

		lastCallTime = time;

		if (isInvoking && timeout === null && leading) {
			invokeFunc(this, args);
			timeout = setTimeout(() => timerExpired.call(this, args), wait);
			return;
		}

		if (timeout) {
			clearTimeout(timeout);
		}

		timeout = setTimeout(() => timerExpired.call(this, args), wait);
	} as ((...args: Parameters<T>) => void) & { cancel: () => void; flush: () => void };

	debounced.cancel = () => {
		if (timeout) {
			clearTimeout(timeout);
			timeout = null;
		}
		lastCallTime = 0;
		lastInvokeTime = 0;
	};

	debounced.flush = () => {
		if (timeout) {
			clearTimeout(timeout);
			timeout = null;
		}
	};

	return debounced;
}

// ============================================
// Keyed Throttle Manager
// ============================================

/**
 * Per-key throttle manager — wraps {@link throttle} with a `Map` keyed
 * by user-supplied identifiers so different keys throttle independently.
 *
 * Use cases: per-endpoint throttles, per-user click handlers,
 * per-document save buffers. Memory grows with the number of distinct
 * keys; call {@link cancel} or {@link cancelAll} to free resources.
 *
 * @typeParam T - Function being throttled.
 *
 * @example
 * ```ts
 * const saveDoc = new KeyedThrottle(saveToServer, 1000);
 * saveDoc.execute("doc:42", payload);
 * saveDoc.execute("doc:43", payload);   // independent timer
 * ```
 */
export class KeyedThrottle<T extends AnyFunction> {
	private throttles: LRUCache<
		string,
		((...args: Parameters<T>) => ReturnType<T> | undefined) & { cancel: () => void }
	>;
	private readonly func: T;
	private readonly wait: number;
	private readonly options: ThrottleOptions;

	/**
	 * @param func - Function to throttle. The same instance is used for
	 *   every key.
	 * @param wait - Throttle window in milliseconds.
	 * @param options - Forwarded to {@link throttle} for each key's
	 *   internal throttled wrapper. Supports `maxKeys` configuration.
	 */
	constructor(func: T, wait: number, options: ThrottleOptions & { maxKeys?: number } = {}) {
		this.func = func;
		this.wait = wait;
		const { maxKeys = 10000, ...throttleOptions } = options;
		this.options = throttleOptions;
		this.throttles = new LRUCache({
			maxSize: maxKeys,
			onEvict: (_, throttled) => {
				throttled.cancel();
			},
		});
	}

	/**
	 * Invoke `func` under the throttle bucket associated with `key`,
	 * lazily creating that bucket on first call.
	 *
	 * @returns Whatever the throttled call returns this tick — either
	 *   the freshly-computed result, the cached previous result, or
	 *   `undefined` if neither has fired yet.
	 */
	public execute(key: string, ...args: Parameters<T>): ReturnType<T> | undefined {
		let throttled = this.throttles.get(key);

		if (!throttled) {
			throttled = throttle(this.func, this.wait, this.options);
			this.throttles.set(key, throttled);
		}

		return throttled(...args);
	}

	/**
	 * Cancel any pending trailing-edge call for `key` and drop the
	 * bucket from the map. The next `execute(key, …)` will start fresh.
	 */
	public cancel(key: string): void {
		const throttled = this.throttles.get(key);
		if (throttled) {
			throttled.cancel();
		}
		this.throttles.delete(key);
	}

	/** Cancel and drop every bucket. */
	public cancelAll(): void {
		for (const throttled of this.throttles.values()) {
			throttled.cancel();
		}
		this.throttles.clear();
	}

	/**
	 * Snapshot of currently-tracked keys.
	 *
	 * @returns `{ activeKeys, keys }`. The `keys` array is a one-shot
	 *   copy and not kept in sync with future mutations.
	 */
	public getStats(): KeyedStats {
		return {
			activeKeys: this.throttles.size,
			keys: Array.from(this.throttles.keys()),
		};
	}
}

// ============================================
// Keyed Debounce Manager
// ============================================

/**
 * Per-key debounce manager — wraps {@link debounce} with a `Map` keyed
 * by user-supplied identifiers so different keys debounce
 * independently.
 *
 * Typical use: per-input search-as-you-type, per-form auto-save,
 * per-resource validation. Memory grows with the number of distinct
 * keys; call {@link cancel}, {@link flush}, or {@link cancelAll} to
 * release resources.
 *
 * @typeParam T - Function being debounced.
 *
 * @example
 * ```ts
 * const search = new KeyedDebounce(runSearch, 300);
 * search.execute("filter:name", "ali");   // debounced per key
 * search.execute("filter:tag",  "team");  // independent timer
 * ```
 */
export class KeyedDebounce<T extends AnyFunction> {
	private debounces: LRUCache<
		string,
		((...args: Parameters<T>) => void) & { cancel: () => void; flush: () => void }
	>;
	private readonly func: T;
	private readonly wait: number;
	private readonly options: DebounceOptions;

	/**
	 * @param func - Function to debounce. The same instance is used for
	 *   every key.
	 * @param wait - Quiet window in milliseconds before firing.
	 * @param options - Forwarded to {@link debounce} for each key's
	 *   internal debounced wrapper. Supports `maxKeys` configuration.
	 */
	constructor(func: T, wait: number, options: DebounceOptions & { maxKeys?: number } = {}) {
		this.func = func;
		this.wait = wait;
		const { maxKeys = 10000, ...debounceOptions } = options;
		this.options = debounceOptions;
		this.debounces = new LRUCache({
			maxSize: maxKeys,
			onEvict: (_, debounced) => {
				debounced.cancel();
			},
		});
	}

	/**
	 * Push a new call for `key`, lazily creating the debounce bucket on
	 * first invocation. Resets the quiet timer for that key.
	 */
	public execute(key: string, ...args: Parameters<T>): void {
		let debounced = this.debounces.get(key);

		if (!debounced) {
			debounced = debounce(this.func, this.wait, this.options);
			this.debounces.set(key, debounced);
		}

		debounced(...args);
	}

	/**
	 * Cancel any pending fire for `key` and drop the bucket from the map.
	 * The next `execute(key, …)` will start fresh.
	 */
	public cancel(key: string): void {
		const debounced = this.debounces.get(key);
		if (debounced) {
			debounced.cancel();
		}
		this.debounces.delete(key);
	}

	/**
	 * Cancel any pending timer for `key` without firing it. The bucket
	 * stays alive — future `execute(key, …)` calls are still debounced.
	 *
	 * (The wrapped `debounce(...).flush()` from this implementation
	 * cancels rather than forces — see the `debounce` source for
	 * specifics.)
	 */
	public flush(key: string): void {
		const debounced = this.debounces.get(key);
		if (debounced) {
			debounced.flush();
		}
	}

	/** Cancel and drop every bucket. */
	public cancelAll(): void {
		for (const debounced of this.debounces.values()) {
			debounced.cancel();
		}
		this.debounces.clear();
	}

	/**
	 * Snapshot of currently-tracked keys.
	 *
	 * @returns `{ activeKeys, keys }`. The `keys` array is a one-shot
	 *   copy and not kept in sync with future mutations.
	 */
	public getStats(): KeyedStats {
		return {
			activeKeys: this.debounces.size,
			keys: Array.from(this.debounces.keys()),
		};
	}
}

// ============================================
// Token Bucket Rate Limiter
// ============================================

/**
 * Token-bucket rate limiter.
 *
 * The bucket holds at most `capacity` tokens. Tokens refill **continuously**
 * over `windowMs` (one full bucket per window — i.e. `capacity / windowMs`
 * tokens per ms). Each accepted call deducts one token; when no tokens are
 * available, callers either wait via {@link acquire} or get rejected via
 * {@link tryAcquire}.
 *
 * Token-bucket limiters allow short bursts up to `capacity` while pinning
 * the long-run average to `capacity / windowMs`. Use this when bursty
 * traffic is acceptable; pick {@link LeakyBucketLimiter} when you need
 * smoother request spacing.
 *
 * @example
 * ```ts
 * const limiter = new TokenBucketLimiter(5, 60_000); // 5 req/min
 * await limiter.acquire();
 * fetch("/api/data");
 * ```
 */
export class TokenBucketLimiter {
	private tokens: number;
	private lastRefill: number;
	private readonly capacity: number;
	private readonly refillRate: number;
	private readonly refillInterval: number;
	private queue: Array<() => void> = [];

	/**
	 * @param capacity - Maximum bucket size (also the burst limit).
	 * @param windowMs - Time window over which one full bucket of
	 *   tokens accumulates. The steady-state rate is
	 *   `capacity / windowMs` tokens per millisecond.
	 */
	constructor(capacity: number, windowMs: number) {
		this.capacity = capacity;
		this.tokens = capacity;
		this.lastRefill = Date.now();
		this.refillRate = capacity;
		this.refillInterval = windowMs;
	}

	/**
	 * Top up the bucket based on elapsed wall-clock time. Called
	 * lazily on every `acquire`/`tryAcquire`/`getStats`.
	 *
	 * @internal
	 */
	private refill(): void {
		const now = Date.now();
		const elapsed = now - this.lastRefill;
		const tokensToAdd = (elapsed / this.refillInterval) * this.refillRate;

		if (tokensToAdd > 0) {
			this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
			this.lastRefill = now;
		}
	}

	/**
	 * Take one token, awaiting future refills if the bucket is empty.
	 *
	 * Calls are released in FIFO order. Resolved promises consume one
	 * token each — the resolver `await`s and proceeds with the protected
	 * work without further bookkeeping.
	 */
	public async acquire(): Promise<void> {
		this.refill();

		if (this.tokens >= 1) {
			this.tokens -= 1;
			return Promise.resolve();
		}

		// Wait for token to become available
		return new Promise<void>((resolve) => {
			this.queue.push(resolve);
			this.scheduleNextRelease();
		});
	}

	/**
	 * Non-blocking variant of {@link acquire}.
	 *
	 * @returns `true` if a token was consumed, `false` if the bucket
	 *   was empty (the caller should drop the request, return 429, or
	 *   apply its own back-pressure).
	 */
	public tryAcquire(): boolean {
		this.refill();

		if (this.tokens >= 1) {
			this.tokens -= 1;
			return true;
		}

		return false;
	}

	/**
	 * Arm a one-shot timer that will release the next queued caller
	 * once the next token becomes available. Self-reschedules until
	 * the queue drains.
	 *
	 * @internal
	 */
	private scheduleNextRelease(): void {
		if (this.queue.length === 0) return;

		const waitTime = this.refillInterval / this.refillRate;

		setTimeout(() => {
			this.refill();
			const resolve = this.queue.shift();
			if (resolve && this.tokens >= 1) {
				this.tokens -= 1;
				resolve();
			}
			this.scheduleNextRelease();
		}, waitTime);
	}

	/**
	 * Snapshot of bucket state.
	 *
	 * @returns `{ availableTokens, queueSize, capacity }` —
	 *   `availableTokens` is rounded down so it never claims more
	 *   tokens than a caller could actually withdraw.
	 */
	public getStats(): RateLimiterStats {
		this.refill();
		return {
			availableTokens: Math.floor(this.tokens),
			queueSize: this.queue.length,
			capacity: this.capacity,
		};
	}

	/**
	 * Refill the bucket to capacity and abandon any queued waiters.
	 *
	 * Note: queued promises returned by {@link acquire} that were
	 * waiting at the time of `reset()` will **never resolve**. Use
	 * with care in long-running services; prefer plumbing an
	 * `AbortSignal` through call sites instead of resetting.
	 */
	public reset(): void {
		this.tokens = this.capacity;
		this.lastRefill = Date.now();
		this.queue = [];
	}
}

// ============================================
// Leaky Bucket Rate Limiter
// ============================================

/**
 * Leaky-bucket rate limiter.
 *
 * Requests are appended to a fixed-capacity FIFO queue and "leak" out
 * at a constant rate (`requestsPerSecond`). The result is **smoothed**
 * traffic: even if `acquire` is called in a burst, each protected
 * action fires at fixed `1000 / requestsPerSecond` millisecond
 * intervals.
 *
 * Compared to {@link TokenBucketLimiter}, leaky-bucket does not allow
 * bursts — pick this when downstream systems can't tolerate spiky
 * load.
 *
 * @example
 * ```ts
 * const limiter = new LeakyBucketLimiter(50, 5); // up to 50 queued, drains 5/sec
 * await limiter.acquire();
 * await downstreamCall();
 * ```
 */
export class LeakyBucketLimiter {
	private queue: Array<{ resolve: () => void; timestamp: number }> = [];
	private readonly capacity: number;
	private readonly leakRate: number; // requests per second
	private processing = false;

	/**
	 * @param capacity - Maximum queue depth. Calls to {@link acquire}
	 *   that exceed this throw immediately ("Rate limit exceeded:
	 *   queue full"); use {@link tryAcquire} to test first.
	 * @param requestsPerSecond - Steady-state drain rate. Internally
	 *   converted to a per-request gap of `1000 / requestsPerSecond`
	 *   milliseconds.
	 */
	constructor(capacity: number, requestsPerSecond: number) {
		this.capacity = capacity;
		this.leakRate = 1000 / requestsPerSecond; // ms between requests
	}

	/**
	 * Enqueue and await release.
	 *
	 * @throws Error `"Rate limit exceeded: queue full"` when the queue
	 *   is already at `capacity`. Catch and translate to a 429 in
	 *   HTTP middleware.
	 */
	public async acquire(): Promise<void> {
		if (this.queue.length >= this.capacity) {
			throw new Error("Rate limit exceeded: queue full");
		}

		return new Promise<void>((resolve) => {
			this.queue.push({ resolve, timestamp: Date.now() });
			this.processQueue();
		});
	}

	/**
	 * Non-blocking probe.
	 *
	 * @returns `true` only when the queue is empty **and** no drain
	 *   timer is currently armed — i.e. the caller could fire
	 *   immediately. Returns `false` even when there is room in the
	 *   queue but a previous call is still mid-leak; in that case
	 *   {@link acquire} would still succeed but with a wait.
	 */
	public tryAcquire(): boolean {
		if (this.queue.length >= this.capacity) {
			return false;
		}

		// Check if we can process immediately
		if (!this.processing && this.queue.length === 0) {
			return true;
		}

		return false;
	}

	/**
	 * Drive the leak: pop one waiter, resolve it, then arm a timer
	 * for the next at `leakRate` ms in the future. Self-reschedules
	 * until the queue drains.
	 *
	 * @internal
	 */
	private processQueue(): void {
		if (this.processing || this.queue.length === 0) return;

		this.processing = true;

		const processNext = () => {
			const item = this.queue.shift();
			if (item) {
				item.resolve();
			}

			if (this.queue.length > 0) {
				setTimeout(processNext, this.leakRate);
			} else {
				this.processing = false;
			}
		};

		processNext();
	}

	/**
	 * Snapshot of bucket state.
	 *
	 * @returns `{ availableTokens, queueSize, capacity }` where
	 *   `availableTokens = capacity − queueSize` (free queue slots).
	 */
	public getStats(): RateLimiterStats {
		return {
			availableTokens: this.capacity - this.queue.length,
			queueSize: this.queue.length,
			capacity: this.capacity,
		};
	}

	/**
	 * Drop every queued waiter and stop processing.
	 *
	 * Note: pending promises returned by {@link acquire} will **never
	 * resolve** after a `reset()`. Plumb an `AbortSignal` through call
	 * sites if cancellable waits are required.
	 */
	public reset(): void {
		this.queue = [];
		this.processing = false;
	}
}

// ============================================
// Sliding Window Counter
// ============================================

/**
 * Sliding-window counter for per-key rate limiting.
 *
 * Maintains a `current` and `previous` window count per key and
 * estimates the *weighted* request rate over the trailing
 * `windowMs` ms by interpolating between the two windows. This
 * provides smoother enforcement than a fixed-window counter (which
 * lets twice the limit through across a window boundary) without the
 * memory cost of a true sliding-window log.
 *
 * Calls a periodic `cleanup` every `windowMs` ms to drop stale
 * entries — note that this means **the limiter holds a Node timer
 * for its entire lifetime**. Long-lived processes are fine; for
 * short-lived workers, manage instances explicitly or you'll keep
 * the event loop alive.
 *
 * @example
 * ```ts
 * const counter = new SlidingWindowCounter(60_000, 100); // 100 req/min
 * const decision = counter.check(`user:${userId}`);
 * if (!decision.allowed) return new Response("Too many requests", { status: 429 });
 * ```
 */
export class SlidingWindowCounter {
	private counters = new Map<string, { current: number; previous: number; windowStart: number }>();
	private readonly windowMs: number;
	private readonly maxRequests: number;

	/**
	 * @param windowMs - Sliding-window length in milliseconds.
	 * @param maxRequests - Maximum allowed weighted count per window
	 *   per key.
	 */
	constructor(windowMs: number, maxRequests: number) {
		this.windowMs = windowMs;
		this.maxRequests = maxRequests;

		// Cleanup old entries periodically
		setInterval(() => this.cleanup(), windowMs);
	}

	/**
	 * Atomically increment the counter for `key` and decide whether
	 * to allow the request based on the trailing weighted count.
	 *
	 * @returns `{ allowed, remaining, resetAt }` where:
	 *   - `allowed` — `true` if under the limit; `false` if rejected
	 *     (counter is **not** incremented in this case).
	 *   - `remaining` — best-effort lower bound on how many more
	 *     requests fit in the current window for this key.
	 *   - `resetAt` — Unix epoch ms when the current fixed window
	 *     boundary rolls over.
	 */
	public check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
		const now = Date.now();
		const windowStart = Math.floor(now / this.windowMs) * this.windowMs;
		const previousWindowStart = windowStart - this.windowMs;

		let counter = this.counters.get(key);

		if (!counter) {
			counter = { current: 0, previous: 0, windowStart };
			this.counters.set(key, counter);
		}

		// Roll over to new window if needed
		if (counter.windowStart < previousWindowStart) {
			counter.previous = 0;
			counter.current = 0;
			counter.windowStart = windowStart;
		} else if (counter.windowStart < windowStart) {
			counter.previous = counter.current;
			counter.current = 0;
			counter.windowStart = windowStart;
		}

		// Calculate weighted count
		const windowPosition = (now - windowStart) / this.windowMs;
		const weightedCount = counter.previous * (1 - windowPosition) + counter.current;

		const allowed = weightedCount < this.maxRequests;

		if (allowed) {
			counter.current++;
		}

		return {
			allowed,
			remaining: Math.max(0, Math.floor(this.maxRequests - weightedCount - (allowed ? 1 : 0))),
			resetAt: windowStart + this.windowMs,
		};
	}

	/**
	 * Forget all state for `key`. The next `check(key)` starts fresh.
	 *
	 * Useful for admin/test reset paths and for clearing limits when
	 * a user upgrades to a higher tier.
	 */
	public reset(key: string): void {
		this.counters.delete(key);
	}

	/**
	 * Drop counters older than two full windows. Runs on a timer
	 * armed in the constructor; not part of the public API.
	 *
	 * @internal
	 */
	private cleanup(): void {
		const cutoff = Date.now() - this.windowMs * 2;
		for (const [key, counter] of this.counters.entries()) {
			if (counter.windowStart < cutoff) {
				this.counters.delete(key);
			}
		}
	}

	/**
	 * Snapshot of currently-tracked keys.
	 *
	 * @returns `{ activeKeys, keys }`. The `keys` array is a one-shot
	 *   copy and not kept in sync with future mutations.
	 */
	public getStats(): KeyedStats {
		return {
			activeKeys: this.counters.size,
			keys: Array.from(this.counters.keys()),
		};
	}
}

// ============================================
// Exports
// ============================================

export { DebounceOptionsSchema, KeyedStatsSchema, RateLimiterStatsSchema, ThrottleOptionsSchema };
