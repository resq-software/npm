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
 * @file Rate Limiting Utilities
 * @module @resq/typescript/utils/middleware/rate-limit
 */

import { Ratelimit } from "@upstash/ratelimit";
import type { Redis } from "@upstash/redis";
import { Schema as S } from "effect";
import { LRUCache } from "@resq-sw/dsa";

// ============================================
// Effect Schema Definitions
// ============================================

/**
 * Effect Schema for runtime-validating a rate-limit configuration —
 * useful at framework boundaries where the config arrives as untyped
 * JSON (env-var parsing, admin endpoints, feature-flag payloads).
 *
 * @example
 * ```ts
 * import { Schema } from "effect";
 * const config = Schema.decodeUnknownSync(RateLimitConfigSchema)(input);
 * ```
 */
export const RateLimitConfigSchema = S.Struct({
	/** Sliding-window length in milliseconds. */
	windowMs: S.Number,
	/** Max requests permitted per `windowMs` per key. */
	maxRequests: S.Number,
	/** Optional flag controlling whether `RateLimit-*` headers are emitted by middleware. */
	headers: S.optional(S.Boolean),
});

/** TypeScript type inferred from {@link RateLimitConfigSchema}. */
export type RateLimitConfig = typeof RateLimitConfigSchema.Type;

/**
 * Effect Schema for the structured result of an {@link IRateLimitStore}
 * `check()`. Useful when serialising decisions to inter-service queues
 * or persisting them for audit.
 */
export const RateLimitCheckResultSchema = S.Struct({
	/** `true` when the request exceeded the configured limit. */
	limited: S.Boolean,
	/** Requests remaining in the current window (clamped at `0`). */
	remaining: S.Number,
	/** Unix epoch ms when the window resets and counters drop. */
	resetTime: S.Number,
	/** The configured `maxRequests` (echoed for header generation). */
	total: S.Number,
});

/** TypeScript type inferred from {@link RateLimitCheckResultSchema}. */
export type RateLimitCheckResult = typeof RateLimitCheckResultSchema.Type;

// ============================================
// Rate Limit Store Interfaces
// ============================================

/**
 * Pluggable backend for rate-limit state.
 *
 * Implementations decide how counters are stored and how concurrency is
 * resolved (in-memory, Redis, distributed log, …). Stores are designed
 * to be reused across multiple `(windowMs, maxRequests)` configurations
 * keyed by the caller's `key` (typically `userId`, `ip`, or
 * `route + clientId`).
 */
export interface IRateLimitStore {
	/**
	 * Atomically increment the counter for `key` within a sliding window
	 * of `windowMs` and decide whether to allow the request.
	 *
	 * @param key - Caller-chosen identity key (e.g. `"user:42"`).
	 * @param windowMs - Window length in milliseconds.
	 * @param maxRequests - Maximum requests permitted in the window.
	 * @returns A {@link RateLimitCheckResult} describing the decision.
	 */
	check(key: string, windowMs: number, maxRequests: number): Promise<RateLimitCheckResult>;
	/**
	 * Drop any state held for `key`. Useful for admin / unit-test reset
	 * paths; not invoked by middleware itself.
	 */
	reset(key: string): Promise<void>;
}

/**
 * {@link IRateLimitStore} backed by Upstash Redis using the
 * `@upstash/ratelimit` sliding-window algorithm.
 *
 * Internally caches one `Ratelimit` instance per `(windowMs,
 * maxRequests)` pair so re-using the same store across multiple routes
 * does not allocate a new limiter every call.
 *
 * Use this for any deployment that runs more than one process — counters
 * are shared across all nodes via Redis.
 *
 * @example
 * ```ts
 * import { Redis } from "@upstash/redis";
 * import { RedisRateLimitStore } from "@resq-sw/rate-limiting";
 *
 * const store = new RedisRateLimitStore(Redis.fromEnv());
 * const decision = await store.check("user:42", 60_000, 100);
 * if (decision.limited) return new Response("Too many requests", { status: 429 });
 * ```
 */
export class RedisRateLimitStore implements IRateLimitStore {
	private readonly limiters = new Map<string, Ratelimit>();
	private readonly redis: Redis;

	/**
	 * @param redisClient - Connected Upstash Redis client. Reuse the same
	 *   client across stores; do not allocate per request.
	 */
	constructor(redisClient: Redis) {
		this.redis = redisClient;
	}

	private getLimiter(windowMs: number, maxRequests: number): Ratelimit {
		const key = `${windowMs}:${maxRequests}`;
		let limiter = this.limiters.get(key);
		if (!limiter) {
			limiter = new Ratelimit({
				redis: this.redis,
				limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs} ms`),
				prefix: "@resq/ratelimit",
			});
			this.limiters.set(key, limiter);
		}
		return limiter;
	}

	/** @inheritdoc */
	async check(key: string, windowMs: number, maxRequests: number): Promise<RateLimitCheckResult> {
		const limiter = this.getLimiter(windowMs, maxRequests);
		const result = await limiter.limit(key);

		return {
			limited: !result.success,
			remaining: result.remaining,
			resetTime: result.reset,
			total: result.limit,
		};
	}

	/**
	 * @inheritdoc
	 *
	 * **Currently a no-op.** `@upstash/ratelimit` distributes counters
	 * across multiple sliding-window keys per limiter, and there is no
	 * single delete that resets all of them. Provided for interface
	 * conformance; future versions may scan the prefix and clear all
	 * matching keys.
	 */
	async reset(_key: string): Promise<void> {
		// Note: @upstash/ratelimit reset is complex as it uses multiple keys.
		// For now, we clear the main key if possible.
	}
}

/**
 * {@link IRateLimitStore} that keeps counters in a process-local `Map`.
 *
 * Suitable for **single-process** deployments only — a multi-instance
 * deployment will under-count because each instance sees only its own
 * traffic. Use {@link RedisRateLimitStore} (or another distributed
 * backend) in production when more than one node serves traffic.
 *
 * Counters are reset *implicitly* once the window expires — the next
 * `check()` past `resetTime` starts a fresh window. There is no
 * background sweeper, so memory grows with the number of distinct keys
 * over the lifetime of the process; pair with periodic `reset()` for
 * long-lived processes that see unbounded key cardinality.
 */
export class MemoryRateLimitStore implements IRateLimitStore {
	private readonly store: LRUCache<
		string,
		{ current: number; previous: number; windowStart: number; windowMs: number }
	>;

	constructor(options?: { maxSize?: number }) {
		this.store = new LRUCache({ maxSize: options?.maxSize ?? 10000 });
	}

	/** @inheritdoc */
	async check(key: string, windowMs: number, maxRequests: number): Promise<RateLimitCheckResult> {
		const now = Date.now();
		const windowStart = Math.floor(now / windowMs) * windowMs;
		const previousWindowStart = windowStart - windowMs;

		let counter = this.store.get(key);

		if (!counter || counter.windowMs !== windowMs || counter.windowStart + windowMs * 2 <= now) {
			counter = { current: 0, previous: 0, windowStart, windowMs };
		} else if (counter.windowStart < windowStart) {
			if (counter.windowStart === previousWindowStart) {
				counter.previous = counter.current;
			} else {
				counter.previous = 0;
			}
			counter.current = 0;
			counter.windowStart = windowStart;
		}

		// Calculate weighted count
		const windowPosition = (now - windowStart) / windowMs;
		const weightedCount = counter.previous * (1 - windowPosition) + counter.current;

		const limited = weightedCount >= maxRequests;

		if (!limited) {
			counter.current++;
		}

		this.store.set(key, counter);

		// Calculate final count and remaining after optional increment
		const finalWeightedCount = counter.previous * (1 - windowPosition) + counter.current;
		const remaining = Math.max(0, maxRequests - Math.floor(finalWeightedCount));

		return {
			limited,
			remaining,
			resetTime: windowStart + windowMs,
			total: maxRequests,
		};
	}

	/** @inheritdoc */
	async reset(key: string): Promise<void> {
		this.store.delete(key);
	}
}

// ============================================
// Rate Limit Presets
// ============================================

/**
 * Pre-tuned `(windowMs, maxRequests)` pairs for common traffic shapes.
 *
 * The presets are deliberately conservative — tighten them per-route
 * once you have real traffic data:
 *
 * - `auth` — 5 requests / 15 min. Login, password reset, MFA enrol.
 *   Tight enough to thwart credential stuffing; loose enough to avoid
 *   locking out a legitimate user on a flaky network.
 * - `api`  — 100 requests / minute. General-purpose authenticated API.
 * - `read` — 200 requests / minute. Idempotent read endpoints (search,
 *   listing) where caching upstream is feasible.
 * - `upload` — 20 requests / hour. File ingestion endpoints. Per-hour
 *   window discourages bulk-uploading abuse without blocking iterative
 *   user workflows.
 *
 * @example
 * ```ts
 * const decision = await store.check(
 *   `user:${userId}`,
 *   RATE_LIMIT_PRESETS.api.windowMs,
 *   RATE_LIMIT_PRESETS.api.maxRequests,
 * );
 * ```
 */
export const RATE_LIMIT_PRESETS = {
	auth: {
		windowMs: 15 * 60 * 1000,
		maxRequests: 5,
	},
	api: {
		windowMs: 60 * 1000,
		maxRequests: 100,
	},
	read: {
		windowMs: 60 * 1000,
		maxRequests: 200,
	},
	upload: {
		windowMs: 60 * 60 * 1000,
		maxRequests: 20,
	},
} as const;
