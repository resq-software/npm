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
 * @fileoverview MemoizeAsync decorator - caches async method results based on arguments.
 * Similar to @memoize but designed for async methods with support for promise deduplication.
 *
 * @module @resq/typescript/decorators/memoize-async
 *
 * @example
 * ```typescript
 * class ApiService {
 *   @memoizeAsync()
 *   async fetchUser(userId: string): Promise<User> {
 *     const response = await fetch(`/api/users/${userId}`);
 *     return response.json();
 *   }
 * }
 *
 * const api = new ApiService();
 * const user1 = await api.fetchUser('123'); // Fetches from API
 * const user2 = await api.fetchUser('123'); // Returns cached promise
 * ```
 *
 * @copyright Copyright (c) 2026 ResQ
 * @license MIT
 */

import type { AsyncMethod } from '../types.js';
import { memoizeAsyncFn } from './memoize-async.fn.js';
import type { AsyncMemoizable, AsyncMemoizeConfig } from './memoize-async.types.js';

/**
 * Decorator that caches async method results based on their arguments.
 * Prevents duplicate concurrent requests by returning the same promise
 * for identical calls until the first one resolves.
 *
 * @overload
 * @template T - The type of the class containing the decorated method
 * @template D - The resolved type of the async method
 * @returns {AsyncMemoizable<T, D>} The decorator function
 *
 * @overload
 * @template T - The type of the class containing the decorated method
 * @template D - The resolved type of the async method
 * @param {AsyncMemoizeConfig<T, D>} config - Configuration for memoization
 * @returns {AsyncMemoizable<T, D>} The decorator function
 *
 * @overload
 * @template T - The type of the class containing the decorated method
 * @template D - The resolved type of the async method
 * @param {number} expirationTimeMs - Cache expiration time in milliseconds
 * @returns {AsyncMemoizable<T, D>} The decorator function
 *
 * @throws {Error} When applied to a non-method property
 *
 * @example
 * ```typescript
 * class DataService {
 *   // Basic usage - caches indefinitely
 *   @memoizeAsync()
 *   async fetchConfig(): Promise<Config> {
 *     return fetch('/api/config').then(r => r.json());
 *   }
 *
 *   // With TTL
 *   @memoizeAsync(60000) // Cache for 60 seconds
 *   async getExchangeRates(): Promise<Rates> {
 *     return fetch('/api/rates').then(r => r.json());
 *   }
 *
 *   // With custom cache and key resolver
 *   @memoizeAsync({
 *     cache: new RedisCache<string, Product>(),
 *     keyResolver: (productId, includeDetails) => `product-${productId}-${includeDetails}`,
 *     expirationTimeMs: 300000
 *   })
 *   async getProduct(productId: string, includeDetails: boolean): Promise<Product> {
 *     return this.fetchProduct(productId, includeDetails);
 *   }
 * }
 *
 * const service = new DataService();
 *
 * // Concurrent calls with same args share the same promise
 * const [product1, product2] = await Promise.all([
 *   service.getProduct('123', true),
 *   service.getProduct('123', true) // Same promise as above
 * ]);
 * ```
 */
export function memoizeAsync<T = any, D = any>(): AsyncMemoizable<T, D>;
export function memoizeAsync<T = any, D = any>(
  config: AsyncMemoizeConfig<T, D>,
): AsyncMemoizable<T, D>;
export function memoizeAsync<T = any, D = any>(expirationTimeMs: number): AsyncMemoizable<T, D>;
export function memoizeAsync<T = any, D = any>(
  input?: AsyncMemoizeConfig<T, D> | number,
): AsyncMemoizable<T, D> {
  return (
    target: T,
    propertyName: keyof T,
    descriptor: TypedPropertyDescriptor<AsyncMethod<D>>,
  ): TypedPropertyDescriptor<AsyncMethod<D>> => {
    if (descriptor.value) {
      descriptor.value = input === undefined ? memoizeAsyncFn(descriptor.value) : memoizeAsyncFn(descriptor.value, input as any);

      return descriptor;
    }

    throw new Error('@memoizeAsync is applicable only on a methods.');
  };
}
