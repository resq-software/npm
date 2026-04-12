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
import { rateLimitFn } from './rate-limit.fn.js';
import type { RateLimitConfigs } from './rate-limit.types.js';

/**
 * Decorator that rate limits method calls.
 * Only allows a specified number of calls within a time window.
 *
 * @template T - The type of the class containing the decorated method
 * @param {RateLimitConfigs<T>} config - Rate limit configuration
 * @returns {(
 *   target: T,
 *   propertyName: keyof T,
 *   descriptor: TypedPropertyDescriptor<Method<unknown>>
 * ) => TypedPropertyDescriptor<Method<unknown>>} The decorator function
 *
 * @throws {Error} When applied to a non-method property
 *
 * @example
 * ```typescript
 * class Api {
 *   @rateLimit({
 *     timeSpanMs: 1000,  // 1 second
 *     allowedCalls: 5,   // Max 5 calls
 *     exceedHandler: () => console.warn('Rate limit exceeded!')
 *   })
 *   fetchData() {
 *     // Only 5 calls allowed per second
 *   }
 *
 *   // With custom key resolver for per-user limiting
 *   @rateLimit({
 *     timeSpanMs: 60000,  // 1 minute
 *     allowedCalls: 100,  // Max 100 calls per user per minute
 *     keyResolver: (userId) => userId  // Limit per user
 *   })
 *   getUserData(userId: string) {
 *     return database.getUser(userId);
 *   }
 * }
 *
 * // With custom counter implementation
 * class DistributedApi {
 *   @rateLimit({
 *     timeSpanMs: 1000,
 *     allowedCalls: 10,
 *     rateLimitCounter: new RedisRateLimitCounter()  // Distributed counter
 *   })
 *   async heavyOperation(): Promise<void> {
 *     // Rate limited across all instances
 *   }
 * }
 * ```
 */
export function rateLimit<T = unknown>(
  config: RateLimitConfigs<T>,
): (
  target: T,
  propertyName: keyof T,
  descriptor: TypedPropertyDescriptor<Method<unknown>>,
) => TypedPropertyDescriptor<Method<unknown>> {
  return (
    _target: T,
    _propertyName: keyof T,
    descriptor: TypedPropertyDescriptor<Method<unknown>>,
  ): TypedPropertyDescriptor<Method<unknown>> => {
    if (descriptor.value) {
      descriptor.value = rateLimitFn(descriptor.value, config);
      return descriptor;
    }

    throw new Error('@rateLimit is applicable only on methods.');
  };
}
