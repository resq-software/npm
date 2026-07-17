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

/**
 * @fileoverview Default in-memory {@link RateLimitCounter} — the counter the
 * `@rateLimit` decorator uses when no custom or distributed counter is supplied.
 *
 * @module @resq-systems/decorators/rate-limit/simple-rate-limit-counter
 */

import type { RateLimitCounter } from "./index.js";

/**
 * In-memory {@link RateLimitCounter} backed by a `Map` of per-key counts. This is
 * the default counter when a {@link RateLimitConfigs} supplies none.
 *
 * @example
 * ```ts
 * const counter = new SimpleRateLimitCounter();
 *
 * // Track API calls per user.
 * counter.inc("user-1");
 * counter.inc("user-1");
 * counter.inc("user-2");
 *
 * counter.getCount("user-1"); // → 2
 * counter.getCount("user-2"); // → 1
 * counter.getCount("user-3"); // → 0
 *
 * // After some time, decrement.
 * counter.dec("user-1");
 * counter.getCount("user-1"); // → 1
 * ```
 */
export class SimpleRateLimitCounter implements RateLimitCounter {
	/**
	 * Create a new counter, optionally seeded with an existing map of counts.
	 *
	 * The map is retained by reference and mutated in place by `inc`/`dec`, so a
	 * shared map lets several counters observe and update the same counts.
	 *
	 * @param counterMap - Backing store for per-key counts; defaults to a new `Map`.
	 */
	constructor(private readonly counterMap = new Map<string, number>()) {}

	/**
	 * Get the current count for a key.
	 *
	 * @param key - The key to read.
	 * @returns The current count, or `0` when the key is absent.
	 * @example
	 * ```ts
	 * const counter = new SimpleRateLimitCounter();
	 * counter.getCount("key"); // → 0
	 * counter.inc("key");
	 * counter.getCount("key"); // → 1
	 * ```
	 */
	getCount(key: string): number {
		return this.counterMap.get(key) ?? 0;
	}

	/**
	 * Increment the count for a key.
	 *
	 * @param key - The key to increment.
	 * @example
	 * ```ts
	 * const counter = new SimpleRateLimitCounter();
	 * counter.inc("user-123");
	 * counter.inc("user-123");
	 * counter.getCount("user-123"); // → 2
	 * ```
	 */
	inc(key: string): void {
		if (!this.counterMap.has(key)) {
			this.counterMap.set(key, 0);
		}

		this.counterMap.set(key, (this.counterMap.get(key) ?? 0) + 1);
	}

	/**
	 * Decrement the count for a key, removing the key entirely when it reaches `0`.
	 *
	 * @param key - The key to decrement.
	 * @example
	 * ```ts
	 * const counter = new SimpleRateLimitCounter();
	 * counter.inc("key");
	 * counter.inc("key");
	 * counter.dec("key");
	 * counter.getCount("key"); // → 1
	 * counter.dec("key");
	 * counter.getCount("key"); // → 0 (key removed from the map)
	 * ```
	 */
	dec(key: string): void {
		const currentCount = this.counterMap.get(key);

		if (currentCount !== undefined) {
			if (currentCount <= 1) {
				this.counterMap.delete(key);
			} else {
				this.counterMap.set(key, currentCount - 1);
			}
		}
	}
}
