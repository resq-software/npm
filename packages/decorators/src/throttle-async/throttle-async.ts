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
 * @fileoverview ThrottleAsync decorator - limits the number of concurrent
 * async method calls. Additional calls are queued and executed when slots
 * become available.
 *
 * @module @resq/typescript/decorators/throttle-async
 *
 * @example
 * ```typescript
 * class ApiService {
 *   @throttleAsync(3) // Max 3 concurrent requests
 *   async fetchData(endpoint: string): Promise<Data> {
 *     return fetch(endpoint).then(r => r.json());
 *   }
 * }
 *
 * const api = new ApiService();
 *
 * // These will execute 3 at a time
 * const results = await Promise.all([
 *   api.fetchData('/api/data1'),
 *   api.fetchData('/api/data2'),
 *   api.fetchData('/api/data3'),
 *   api.fetchData('/api/data4'), // Queued until a slot frees up
 *   api.fetchData('/api/data5'), // Queued until a slot frees up
 * ]);
 * ```
 *
 * @copyright Copyright (c) 2026 ResQ
 * @license MIT
 */

import type { AsyncMethod, Decorator } from '../types.js';
import { throttleAsyncFn } from './throttle-async.fn.js';

/**
 * Decorator that limits concurrent async method calls.
 * Excess calls are queued and executed when slots become available.
 *
 * @template T - The type of the class containing the decorated method
 * @template D - The resolved type of the async method
 * @param {number} [parallelCalls=1] - Maximum number of concurrent calls allowed
 * @returns {Decorator<T>} The decorator function
 *
 * @throws {Error} When applied to a non-method property
 *
 * @example
 * ```typescript
 * class BatchProcessor {
 *   // Process up to 5 items concurrently
 *   @throttleAsync(5)
 *   async processItem(item: Item): Promise<Result> {
 *     return await this.performHeavyProcessing(item);
 *   }
 * }
 *
 * const processor = new BatchProcessor();
 * const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
 *
 * // Process 100 items, 5 at a time
 * const results = await Promise.all(
 *   items.map(item => processor.processItem(item))
 * );
 * ```
 */
export function throttleAsync<T = any, D = any>(parallelCalls?: number): Decorator<T> {
  return (
    target: T,
    propertyName: keyof T,
    descriptor: TypedPropertyDescriptor<AsyncMethod<any>>,
  ): TypedPropertyDescriptor<AsyncMethod<D>> => {
    if (descriptor.value) {
      descriptor.value = throttleAsyncFn(descriptor.value, parallelCalls);

      return descriptor;
    }

    throw new Error('@throttleAsync is applicable only on a methods.');
  };
}
