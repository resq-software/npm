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
	/** The time window in milliseconds. */
	timeSpanMs: number;
	/** Maximum number of calls allowed in the time window. */
	allowedCalls: number;
	/** Function or method name that generates rate-limit keys (per user/entity). */
	keyResolver?: ((...args: unknown[]) => string) | keyof T;
	/** Custom synchronous counter implementation. */
	rateLimitCounter?: RateLimitCounter;
	/** Async counter implementation for distributed limiting. */
	rateLimitAsyncCounter?: RateLimitAsyncCounter;
	/** Handler called when the rate limit is exceeded. */
	exceedHandler?: () => void;
}

/**
 * Synchronous counter contract used to track call counts within time windows.
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
 * @deprecated Use `Decorator<T>` from `../types.js` instead. This shape erases
 * the decorated method's signature to `Method<D>`, which is not assignable to a
 * concrete method's descriptor under strict `strictFunctionTypes` (TS1241 /
 * TS1270 at the decoration site). `rateLimit` now returns `Decorator<T>`, which
 * preserves the method signature end-to-end. Retained only for back-compat.
 *
 * @template T - The class type that owns the decorated method.
 * @template D - The return type of the decorated method.
 * @param target - The class prototype.
 * @param propertyName - The name of the method being decorated.
 * @param descriptor - The property descriptor.
 * @returns The modified descriptor.
 */
export type RateLimitable<T, D> = (
	target: T,
	propertyName: keyof T,
	descriptor: TypedPropertyDescriptor<Method<D>>,
) => TypedPropertyDescriptor<Method<D>>;
