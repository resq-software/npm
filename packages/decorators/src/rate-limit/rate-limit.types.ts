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
 * @fileoverview Types for the `@rateLimit` decorator and its function form: the
 * configuration object, the synchronous and asynchronous counter contracts, and
 * the legacy decorator signature.
 *
 * @module @resq-systems/decorators/rate-limit/rate-limit.types
 */

import type { Method } from "../types.js";

/**
 * Configuration for the `@rateLimit` decorator and {@link rateLimitFn}.
 *
 * `timeSpanMs` and `allowedCalls` are required; supply at most one counter — when
 * both `rateLimitCounter` and `rateLimitAsyncCounter` are set, the async one wins
 * and the call becomes promise-returning. With no counter, an in-memory
 * {@link RateLimitCounter} is used. With no `keyResolver`, all calls share a single
 * `"default"` bucket.
 *
 * @template T - The class type a `keyof T` key resolver resolves against.
 * @example
 * ```ts
 * const config: RateLimitConfigs<ApiService> = {
 *   timeSpanMs: 60000, // One minute.
 *   allowedCalls: 100, // 100 calls per minute.
 *   keyResolver: (userId) => `user-${userId}`,
 *   exceedHandler: () => {
 *     throw new Error("Rate limit exceeded");
 *   },
 * };
 * ```
 */
export interface RateLimitConfigs<T = unknown> {
	/** Rolling window length in milliseconds; each admitted call is charged for this long. */
	timeSpanMs: number;
	/** Maximum admitted calls per key within the window. */
	allowedCalls: number;
	/**
	 * How the rate-limit bucket key is derived. A function is called with the
	 * arguments; a `keyof T` names an instance method invoked with the arguments.
	 * When omitted, all calls share the `"default"` bucket.
	 */
	keyResolver?: ((...args: unknown[]) => string) | keyof T;
	/** Custom synchronous counter; ignored when `rateLimitAsyncCounter` is set. */
	rateLimitCounter?: RateLimitCounter;
	/** Async counter for distributed limiting; takes precedence over `rateLimitCounter`. */
	rateLimitAsyncCounter?: RateLimitAsyncCounter;
	/** Invoked (for its side effects) when a call is dropped; a throw here propagates to the caller. */
	exceedHandler?: () => void;
}

/**
 * Synchronous counter contract used to track call counts within time windows.
 *
 * `getCount` must return `0` (never negative or `undefined`) for a key that was
 * never incremented or has been fully decremented. `rateLimitFn` increments on an
 * admitted call and schedules a matching `dec` after the window, so `inc` and
 * `dec` must be balanced for the count to reflect the live in-window total.
 *
 * @example
 * ```ts
 * class InMemoryCounter implements RateLimitCounter {
 *   private counts = new Map<string, number>();
 *
 *   inc(key: string): void {
 *     this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
 *   }
 *
 *   dec(key: string): void {
 *     const count = this.counts.get(key) ?? 0;
 *     if (count <= 1) {
 *       this.counts.delete(key);
 *     } else {
 *       this.counts.set(key, count - 1);
 *     }
 *   }
 *
 *   getCount(key: string): number {
 *     return this.counts.get(key) ?? 0;
 *   }
 * }
 * ```
 */
export interface RateLimitCounter {
	/** Increment the count for a key. */
	inc: (key: string) => void;
	/** Decrement the count for a key. */
	dec: (key: string) => void;
	/** Get the current count for a key. */
	getCount: (key: string) => number;
}

/**
 * Asynchronous counter contract for distributed rate limiting; use it when the
 * counter performs async operations (e.g. Redis or a database).
 *
 * `getCount` resolves `0` for an unseen or fully-decremented key. Because
 * `rateLimitFn` reads then increments in two separate awaits, this contract alone
 * cannot guarantee a hard cap under concurrency; back it with an atomic
 * increment-and-read for a strict limit (see {@link rateLimitFn}).
 *
 * @example
 * ```ts
 * class RedisCounter implements RateLimitAsyncCounter {
 *   async inc(key: string): Promise<void> {
 *     await redis.incr(`ratelimit:${key}`);
 *   }
 *
 *   async dec(key: string): Promise<void> {
 *     await redis.decr(`ratelimit:${key}`);
 *   }
 *
 *   async getCount(key: string): Promise<number> {
 *     const count = await redis.get(`ratelimit:${key}`);
 *     return parseInt(count ?? '0', 10);
 *   }
 * }
 * ```
 */
export interface RateLimitAsyncCounter {
	/** Increment the count for a key asynchronously. */
	inc: (key: string) => Promise<void>;
	/** Decrement the count for a key asynchronously. */
	dec: (key: string) => Promise<void>;
	/** Get the current count for a key asynchronously. */
	getCount: (key: string) => Promise<number>;
}

/**
 * Type for the `@rateLimit` decorator function.
 *
 * @template T - The class type that owns the decorated method.
 * @template D - The return type of the decorated method.
 * @param target - The class prototype.
 * @param propertyName - The name of the method being decorated.
 * @param descriptor - The property descriptor.
 * @returns The modified descriptor.
 * @deprecated Use {@link Decorator} from `../types.js` instead — removed in
 * v1.0.0. This shape erases the decorated method's signature to `Method<D>`,
 * which is not assignable to a concrete method's descriptor under strict
 * `strictFunctionTypes` (TS1241 / TS1270 at the decoration site). `rateLimit` now
 * returns {@link Decorator}, which preserves the signature end-to-end. Migration:
 * replace `RateLimitable<T, D>` annotations with `Decorator<T>` (drop the `D`
 * parameter); no runtime change.
 */
export type RateLimitable<T, D> = (
	target: T,
	propertyName: keyof T,
	descriptor: TypedPropertyDescriptor<Method<D>>,
) => TypedPropertyDescriptor<Method<D>>;
