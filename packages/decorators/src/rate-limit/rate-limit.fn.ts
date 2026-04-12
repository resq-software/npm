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
import type { RateLimitConfigs, RateLimitCounter } from './rate-limit.types.js';
import { SimpleRateLimitCounter } from './simple-rate-limit-counter.js';

/**
 * Creates a rate-limited version of a method.
 *
 * @template D - The return type of the original method
 * @template A - The argument types of the original method
 * @param {Method<D, A>} originalMethod - The method to rate limit
 * @param {RateLimitConfigs} config - The rate limit configuration
 * @returns {Method<D | undefined, A>} A rate-limited method
 *
 * @example
 * ```typescript
 * class ApiService {
 *   async fetchData(id: string): Promise<Data> {
 *     return await fetch(`/api/data/${id}`).then(r => r.json());
 *   }
 * }
 *
 * const service = new ApiService();
 *
 * // Rate limit to 3 calls per 5 seconds
 * const limited = rateLimitFn(
 *   service.fetchData.bind(service),
 *   {
 *     timeSpanMs: 5000,
 *     allowedCalls: 3,
 *     exceedHandler: () => console.warn('Too many requests!')
 *   }
 * );
 *
 * await limited('1'); // Executes
 * await limited('2'); // Executes
 * await limited('3'); // Executes
 * const result = await limited('4'); // Returns undefined, logs warning
 * ```
 */
export function rateLimitFn<D = unknown, A extends unknown[] = unknown[]>(
  originalMethod: Method<D, A>,
  config: RateLimitConfigs,
): Method<D | undefined, A> {
  const counter: RateLimitCounter = config.rateLimitCounter ?? new SimpleRateLimitCounter();

  return function (this: unknown, ...args: A): D | undefined {
    const key = typeof config.keyResolver === 'function' ? config.keyResolver(...args) : 'default';

    const currentCount = counter.getCount(key);

    if (currentCount >= config.allowedCalls) {
      config.exceedHandler?.();
      return undefined;
    }

    counter.inc(key);

    // Schedule decrement after time span
    setTimeout(() => {
      counter.dec(key);
    }, config.timeSpanMs);

    return originalMethod.apply(this, args);
  };
}
