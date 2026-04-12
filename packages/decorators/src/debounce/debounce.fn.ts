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

/**
 * Wraps a method to debounce its execution.
 * The method will only execute after the specified delay has passed
 * since the last time it was called.
 *
 * @template D - The return type of the original method
 * @template A - The argument types of the original method
 * @param {Method<D, A>} originalMethod - The method to debounce
 * @param {number} delayMs - The debounce delay in milliseconds
 * @returns {Method<void, A>} The debounced method
 *
 * @example
 * ```typescript
 * class SearchService {
 *   search(query: string): void {
 *     console.log(`Searching for: ${query}`);
 *   }
 * }
 *
 * const service = new SearchService();
 * const debouncedSearch = debounceFn(
 *   service.search.bind(service),
 *   300
 * );
 *
 * // Rapid calls
 * debouncedSearch('a');
 * debouncedSearch('ab');
 * debouncedSearch('abc');
 *
 * // Only "Searching for: abc" is logged after 300ms
 * ```
 */
export function debounceFn<D = unknown, A extends unknown[] = unknown[]>(
  originalMethod: Method<D, A>,
  delayMs: number,
): Method<void, A> {
  let handler: ReturnType<typeof setTimeout> | undefined;

  return function (this: unknown, ...args: A): void {
    clearTimeout(handler);

    handler = setTimeout(() => {
      originalMethod.apply(this, args);
    }, delayMs);
  };
}
