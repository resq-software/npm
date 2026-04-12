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
 * Wraps a method to throttle its execution to once per time period.
 *
 * @template D - The return type of the original method
 * @template A - The argument types of the original method
 * @param {Method<D, A>} originalMethod - The method to throttle
 * @param {number} delayMs - The throttle interval in milliseconds
 * @returns {Method<void, A>} The throttled method
 *
 * @example
 * ```typescript
 * class ScrollTracker {
 *   scrollY = 0;
 *
 *   updatePosition(y: number): void {
 *     this.scrollY = y;
 *     console.log('Position updated:', y);
 *   }
 * }
 *
 * const tracker = new ScrollTracker();
 *
 * // Throttle to once per 100ms
 * const throttledUpdate = throttleFn(
 *   tracker.updatePosition.bind(tracker),
 *   100
 * );
 *
 * // Rapid scroll events
 * window.addEventListener('scroll', (e) => {
 *   throttledUpdate(window.scrollY);
 *   // Only logs once every 100ms even during rapid scrolling
 * });
 * ```
 */
export function throttleFn<D = any, A extends any[] = any[]>(
  originalMethod: Method<D, A>,
  delayMs: number,
): Method<void, A> {
  let throttling = false;
  return function (this: any, ...args: A): void {
    if (!throttling) {
      throttling = true;
      originalMethod.apply(this, args);

      setTimeout(() => {
        throttling = false;
      }, delayMs);
    }
  };
}
