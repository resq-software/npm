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
import { delayFn } from './delay.fn.js';

/**
 * Decorator that delays the execution of a method by the specified time.
 *
 * @template T - The type of the class containing the decorated method
 * @param {number} delayMs - The delay time in milliseconds
 * @returns {Decorator<T>} The decorator function
 *
 * @throws {Error} When applied to a non-method property
 *
 * @example
 * ```typescript
 * class AnimationController {
 *   @delay(500)
 *   fadeIn(element: HTMLElement) {
 *     element.style.opacity = '1';
 *   }
 *
 *   @delay(1000)
 *   fadeOut(element: HTMLElement) {
 *     element.style.opacity = '0';
 *   }
 * }
 *
 * const controller = new AnimationController();
 * controller.fadeIn(element); // Fades in after 500ms
 * controller.fadeOut(element); // Fades out after 1000ms
 * ```
 */
export function delay<T = unknown>(delayMs: number): Decorator<T> {
  return (
    _target: T,
    _propertyName: keyof T,
    descriptor: TypedPropertyDescriptor<Method<unknown>>,
  ): TypedPropertyDescriptor<Method<unknown>> => {
    if (descriptor.value) {
      descriptor.value = delayFn(descriptor.value, delayMs);

      return descriptor;
    }
    throw new Error('@delay is applicable only on a methods.');
  };
}
