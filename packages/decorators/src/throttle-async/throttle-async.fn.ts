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

import type { AsyncMethod } from '../types.js';
import { ThrottleAsyncExecutor } from './throttle-async-executor.js';

/**
 * Wraps an async method to limit concurrent executions.
 *
 * @template D - The resolved type of the async method
 * @template A - The argument types of the original method
 * @param {AsyncMethod<D, A>} originalMethod - The async method to throttle
 * @param {number} [parallelCalls=1] - Maximum number of concurrent calls
 * @returns {AsyncMethod<D, A>} The throttled async method
 *
 * @example
 * ```typescript
 * class ApiClient {
 *   async fetchUser(userId: string): Promise<User> {
 *     return fetch(`/api/users/${userId}`).then(r => r.json());
 *   }
 * }
 *
 * const client = new ApiClient();
 *
 * // Limit to 2 concurrent requests
 * const throttledFetch = throttleAsyncFn(
 *   client.fetchUser.bind(client),
 *   2
 * );
 *
 * // Execute multiple calls, only 2 run concurrently
 * const users = await Promise.all([
 *   throttledFetch('1'), // Starts immediately
 *   throttledFetch('2'), // Starts immediately
 *   throttledFetch('3'), // Queued, starts when 1 or 2 completes
 *   throttledFetch('4'), // Queued, starts when slot available
 * ]);
 * ```
 */
export function throttleAsyncFn<D = any, A extends any[] = any[]>(
  originalMethod: AsyncMethod<D, A>,
  parallelCalls = 1,
): AsyncMethod<D, A> {
  const executor = new ThrottleAsyncExecutor(originalMethod, parallelCalls);

  return function (this: any, ...args: A): Promise<D> {
    return executor.exec(this, args);
  };
}
