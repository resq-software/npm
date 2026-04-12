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

/**
 * @fileoverview Before decorator - executes a function before the decorated method.
 * Useful for validation, authentication, or preprocessing before method execution.
 *
 * @module @resq/typescript/decorators/before
 *
 * @example
 * ```typescript
 * class MyService {
 *   @before({
 *     func: 'validateInput',
 *     wait: true // Wait for before function to complete
 *   })
 *   saveData(data: any) {
 *     database.save(data);
 *   }
 *
 *   validateInput() {
 *     if (!this.isValid) {
 *       throw new Error('Invalid state');
 *     }
 *   }
 * }
 * ```
 *
 * @copyright Copyright (c) 2026 ResQ
 * @license MIT
 */

import type { Decorator, Method } from '../types.js';
import { beforeFn } from './before.fn.js';
import type { BeforeConfig } from './before.types.js';

/**
 * Decorator that executes a function before the decorated method.
 * The before function is called before the method body executes.
 *
 * @template T - The type of the class containing the decorated method
 * @param {BeforeConfig<T>} config - Configuration for the before hook
 * @returns {Decorator<T>} The decorator function
 *
 * @throws {Error} When applied to a non-method property
 *
 * @example
 * ```typescript
 * class DataProcessor {
 *   @before({
 *     func: function() {
 *       console.log('About to process...');
 *     },
 *     wait: false
 *   })
 *   processItems(items: string[]): number {
 *     return items.length;
 *   }
 * }
 * ```
 */
export function before<T = any>(config: BeforeConfig<T>): Decorator<T> {
  return (
    target: T,
    propertyName: keyof T,
    descriptor: TypedPropertyDescriptor<Method<any>>,
  ): TypedPropertyDescriptor<Method<any>> => {
    if (descriptor.value) {
      descriptor.value = beforeFn(descriptor.value, config);

      return descriptor;
    }
    throw new Error('@before is applicable only on a methods.');
  };
}
