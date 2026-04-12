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
 * Wraps a method to delay its execution by the specified time.
 *
 * @template D - The return type of the original method
 * @template A - The argument types of the original method
 * @param {Method<D, A>} originalMethod - The method to delay
 * @param {number} delayMs - The delay time in milliseconds
 * @returns {Method<void, A>} The delayed method
 *
 * @example
 * ```typescript
 * class MessageService {
 *   send(message: string): void {
 *     console.log(`Sending: ${message}`);
 *   }
 * }
 *
 * const service = new MessageService();
 * const delayedSend = delayFn(
 *   service.send.bind(service),
 *   2000
 * );
 *
 * delayedSend('Hello'); // "Sending: Hello" appears after 2 seconds
 * ```
 */
export function delayFn<D = unknown, A extends unknown[] = unknown[]>(
  originalMethod: Method<D, A>,
  delayMs: number,
): Method<void, A> {
  return function (this: unknown, ...args: A): void {
    setTimeout(() => {
      originalMethod.apply(this, args);
    }, delayMs);
  };
}
