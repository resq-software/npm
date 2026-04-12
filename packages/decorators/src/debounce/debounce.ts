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
import { debounceFn } from './debounce.fn.js';

/**
 * Decorator that debounces method calls, ensuring the method only executes
 * after the specified delay has passed since the last call.
 *
 * @template T - The type of the class containing the decorated method
 * @param {number} delayMs - The debounce delay in milliseconds
 * @returns {Decorator<T>} The decorator function
 *
 * @throws {Error} When applied to a non-method property
 *
 * @example
 * ```typescript
 * class AutoSave {
 *   @debounce(1000)
 *   saveDraft(content: string) {
 *     // Saves only 1 second after user stops typing
 *     localStorage.setItem('draft', content);
 *   }
 * }
 *
 * // Usage
 * const autoSave = new AutoSave();
 * autoSave.saveDraft('Hello'); // Won't save yet
 * autoSave.saveDraft('Hello World'); // Resets timer
 * // After 1 second of inactivity, saveDraft executes once
 * ```
 */
export function debounce<T = unknown>(delayMs: number): Decorator<T> {
  return (
    _target: T,
    _propertyName: keyof T,
    descriptor: TypedPropertyDescriptor<Method<unknown>>,
  ): TypedPropertyDescriptor<Method<unknown>> => {
    if (descriptor.value) {
      const methodsMap = new WeakMap<object, Method<unknown>>();
      const originalMethod = descriptor.value;

      descriptor.value = function (this: object, ...args: unknown[]) {
        if (!methodsMap.has(this)) {
          methodsMap.set(this, debounceFn(originalMethod, delayMs).bind(this));
        }

        const method = methodsMap.get(this);
        if (method) {
          method(...args);
        }
      };

      return descriptor;
    }

    throw new Error('@debounce is applicable only on a methods.');
  };
}
