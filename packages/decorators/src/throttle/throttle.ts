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

import type { Decorator, Method } from '../types.js';
import { throttleFn } from './throttle.fn.js';

/**
 * Decorator that throttles method calls to once per specified time period.
 *
 * @template T - The type of the class containing the decorated method
 * @param {number} delayMs - The throttle interval in milliseconds
 * @returns {Decorator<T>} The decorator function
 *
 * @throws {Error} When applied to a non-method property
 *
 * @example
 * ```typescript
 * class ResizeHandler {
 *   private width = window.innerWidth;
 *   private height = window.innerHeight;
 *
 *   @throttle(200)
 *   handleResize(): void {
 *     this.width = window.innerWidth;
 *     this.height = window.innerHeight;
 *     this.render();
 *   }
 * }
 *
 * const handler = new ResizeHandler();
 * window.addEventListener('resize', () => handler.handleResize());
 * // handleResize executes at most once every 200ms during resize
 * ```
 */
export function throttle<T = any>(delayMs: number): Decorator<T> {
  return (
    target: T,
    propertyName: keyof T,
    descriptor: TypedPropertyDescriptor<Method<any>>,
  ): TypedPropertyDescriptor<Method<any>> => {
    if (descriptor.value) {
      descriptor.value = throttleFn(descriptor.value, delayMs);

      return descriptor;
    }

    throw new Error('@throttle is applicable only on a methods.');
  };
}
