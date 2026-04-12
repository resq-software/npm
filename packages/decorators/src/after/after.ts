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
 * @fileoverview After decorator - executes a function after the decorated method completes.
 * Useful for logging, cleanup, or triggering side effects after method execution.
 *
 * @module @resq/typescript/decorators/after
 *
 * @example
 * ```typescript
 * class MyService {
 *   @after({
 *     func: 'logCompletion',
 *     wait: true // Wait for after function to complete
 *   })
 *   async saveData(data: any) {
 *     await database.save(data);
 *   }
 *
 *   logCompletion({ response, args }) {
 *     console.log('Save completed:', response);
 *   }
 * }
 * ```
 *
 * @copyright Copyright (c) 2026 ResQ
 * @license MIT
 */

import type { Decorator, Method } from '../types.js';
import { afterFn } from './after.fn.js';
import type { AfterConfig } from './after.types.js';

/**
 * Decorator that executes a function after the decorated method completes.
 * The after function receives the method's arguments and return value.
 *
 * @template T - The type of the class containing the decorated method
 * @template D - The return type of the decorated method
 * @param {AfterConfig<T, D>} config - Configuration for the after hook
 * @returns {Decorator<T>} The decorator function
 *
 * @throws {Error} When applied to a non-method property
 *
 * @example
 * ```typescript
 * class DataProcessor {
 *   @after({
 *     func: function({ args, response }) {
 *       console.log(`Processed ${args[0]} items, result: ${response}`);
 *     },
 *     wait: false // Don't wait for after function
 *   })
 *   processItems(items: string[]): number {
 *     return items.length;
 *   }
 * }
 * ```
 */
export function after<T = any, D = any>(config: AfterConfig<T, D>): Decorator<T> {
  return (
    target: T,
    propertyName: keyof T,
    descriptor: TypedPropertyDescriptor<Method<any>>,
  ): TypedPropertyDescriptor<Method<D>> => {
    if (descriptor.value) {
      descriptor.value = afterFn(descriptor.value, config);

      return descriptor;
    }
    throw new Error('@after is applicable only on a methods.');
  };
}
