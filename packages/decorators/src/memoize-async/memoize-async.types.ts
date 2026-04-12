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

import type { Cache, KeyResolver, Memoizable } from '../memoize/memoize.types.js';

/**
 * Type for the @memoizeAsync decorator function.
 * Similar to Memoizable but for async methods.
 *
 * @template T - The type of the class containing the decorated method
 * @template D - The resolved type of the async method
 */
export type AsyncMemoizable<T, D> = Memoizable<T, Promise<D>>;

/**
 * Interface for async cache implementations used by the memoizeAsync decorator.
 *
 * @interface AsyncCache
 * @template D - The type of values stored in the cache
 * @property {(key: string, value: D) => Promise<void>} set - Store a value in the cache asynchronously
 * @property {(key: string) => Promise<D> | Promise<null>} get - Retrieve a value from the cache asynchronously
 * @property {(key: string) => Promise<void>} delete - Remove a value from the cache asynchronously
 * @property {(key: string) => Promise<boolean>} has - Check if a key exists in the cache asynchronously
 *
 * @example
 * ```typescript
 * const redisCache: AsyncCache<User> = {
 *   set: async (key, value) => await redis.set(key, JSON.stringify(value)),
 *   get: async (key) => {
 *     const data = await redis.get(key);
 *     return data ? JSON.parse(data) : null;
 *   },
 *   delete: async (key) => await redis.del(key),
 *   has: async (key) => await redis.exists(key) > 0
 * };
 * ```
 */
export interface AsyncCache<D> {
  /** Store a value in the cache asynchronously */
  set: (key: string, value: D) => Promise<void>;
  /** Retrieve a value from the cache asynchronously */
  get: (key: string) => Promise<D> | Promise<null>;
  /** Remove a value from the cache asynchronously */
  delete: (key: string) => Promise<void>;
  /** Check if a key exists in the cache asynchronously */
  has: (key: string) => Promise<boolean>;
}

/**
 * Configuration options for the @memoizeAsync decorator.
 *
 * @interface AsyncMemoizeConfig
 * @template T - The type of the class containing the decorated method
 * @template D - The resolved type of the async method
 * @property {Cache<D> | AsyncCache<D>} [cache] - Custom cache implementation (sync or async)
 * @property {KeyResolver | keyof T} [keyResolver] - Function or method name for generating cache keys
 * @property {number} [expirationTimeMs] - Time in milliseconds after which cached values expire
 *
 * @example
 * ```typescript
 * const config: AsyncMemoizeConfig<ApiService, User> = {
 *   cache: redisCache,
 *   keyResolver: (userId) => `user:${userId}`,
 *   expirationTimeMs: 300000
 * };
 * ```
 */
export interface AsyncMemoizeConfig<T, D> {
  /** Custom cache implementation (sync or async) */
  cache?: Cache<D> | AsyncCache<D>;
  /** Function or method name for generating cache keys */
  keyResolver?: KeyResolver | keyof T;
  /** Time in milliseconds after which cached values expire */
  expirationTimeMs?: number;
}
