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

import type { Method } from '../types.js';
/*
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
 * @fileoverview Type definitions for the RateLimit decorator.
 * Provides types for rate limiting configuration and counter implementations.
 *
 * @module @resq/typescript/decorators/rate-limit/types
 *
 * @copyright Copyright (c) 2026 ResQ
 * @license MIT
 */

/**
 * Configuration options for rate limiting.
 *
 * @interface RateLimitConfigs
 * @template T - The type of the class containing the decorated method
 * @property {number} timeSpanMs - The time window in milliseconds
 * @property {number} allowedCalls - Maximum number of calls allowed in the time window
 * @property {((...args: any[]) => string) | keyof T} [keyResolver] - Function to generate rate limit keys (for per-user/entity limiting)
 * @property {RateLimitCounter} [rateLimitCounter] - Custom counter implementation
 * @property {RateLimitAsyncCounter} [rateLimitAsyncCounter] - Async counter implementation
 * @property {() => void} [exceedHandler] - Handler called when rate limit is exceeded
 *
 * @example
 * ```typescript
 * const config: RateLimitConfigs<ApiService> = {
 *   timeSpanMs: 60000,     // 1 minute
 *   allowedCalls: 100,     // 100 calls per minute
 *   keyResolver: (userId) => `user-${userId}`,
 *   exceedHandler: () => { throw new Error('Rate limit exceeded'); }
 * };
 * ```
 */
export interface RateLimitConfigs<T = any> {
  /** The time window in milliseconds */
  timeSpanMs: number;
  /** Maximum number of calls allowed in the time window */
  allowedCalls: number;
  /** Function to generate rate limit keys (for per-user/entity limiting) */
  keyResolver?: ((...args: unknown[]) => string) | keyof T;
  /** Custom counter implementation */
  rateLimitCounter?: RateLimitCounter;
  /** Async counter implementation */
  rateLimitAsyncCounter?: RateLimitAsyncCounter;
  /** Handler called when rate limit is exceeded */
  exceedHandler?: () => void;
}

/**
 * Interface for rate limit counter implementations.
 * Used to track call counts within time windows.
 *
 * @interface RateLimitCounter
 * @property {(key: string) => void} inc - Increment the count for a key
 * @property {(key: string) => void} dec - Decrement the count for a key
 * @property {(key: string) => number} getCount - Get the current count for a key
 *
 * @example
 * ```typescript
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
  /** Increment the count for a key */
  inc: (key: string) => void;
  /** Decrement the count for a key */
  dec: (key: string) => void;
  /** Get the current count for a key */
  getCount: (key: string) => number;
}

/**
 * Interface for async rate limit counter implementations.
 * Use this when the counter needs to perform async operations (e.g., Redis, database).
 *
 * @interface RateLimitAsyncCounter
 * @property {(key: string) => Promise<void>} inc - Increment the count for a key asynchronously
 * @property {(key: string) => Promise<void>} dec - Decrement the count for a key asynchronously
 * @property {(key: string) => Promise<number>} getCount - Get the current count for a key asynchronously
 *
 * @example
 * ```typescript
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
  /** Increment the count for a key asynchronously */
  inc: (key: string) => Promise<void>;
  /** Decrement the count for a key asynchronously */
  dec: (key: string) => Promise<void>;
  /** Get the current count for a key asynchronously */
  getCount: (key: string) => Promise<number>;
}

/**
 * Type for the @rateLimit decorator function.
 *
 * @template T - The type of the class containing the decorated method
 * @template D - The return type of the decorated method
 *
 * @param {T} target - The class prototype
 * @param {keyof T} propertyName - The name of the method being decorated
 * @param {TypedPropertyDescriptor<Method<D>>} descriptor - The property descriptor
 * @returns {TypedPropertyDescriptor<Method<D>>} The modified descriptor
 */
export type RateLimitable<T, D> = (
  target: T,
  propertyName: keyof T,
  descriptor: TypedPropertyDescriptor<Method<D>>,
) => TypedPropertyDescriptor<Method<D>>;
