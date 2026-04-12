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
/*
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
 * @fileoverview Type definitions for the Memoize decorator.
 * Provides types for caching method results.
 *
 * @module @resq/typescript/decorators/memoize/types
 *
 * @copyright Copyright (c) 2026 ResQ
 * @license MIT
 */

/**
 * Function type for resolving cache keys from method arguments.
 *
 * @param {...any[]} args - The method arguments
 * @returns {string} The cache key string
 *
 * @example
 * ```typescript
 * const keyResolver: KeyResolver = (userId, includeDetails) => {
 *   return `${userId}-${includeDetails}`;
 * };
 * ```
 */
export type KeyResolver = (...args: unknown[]) => string;

/**
 * Interface for cache implementations used by the memoize decorator.
 *
 * @interface Cache
 * @template D - The type of values stored in the cache
 * @property {(key: string, value: D) => void} set - Store a value in the cache
 * @property {(key: string) => D | null | undefined} get - Retrieve a value from the cache
 * @property {(key: string) => void} delete - Remove a value from the cache
 * @property {(key: string) => boolean} has - Check if a key exists in the cache
 *
 * @example
 * ```typescript
 * const cache: Cache<User> = {
 *   set: (key, value) => storage.set(key, value),
 *   get: (key) => storage.get(key),
 *   delete: (key) => storage.delete(key),
 *   has: (key) => storage.has(key)
 * };
 * ```
 */
export interface Cache<D> {
  /** Store a value in the cache */
  set: (key: string, value: D) => void;
  /** Retrieve a value from the cache */
  get: (key: string) => D | null | undefined;
  /** Remove a value from the cache */
  delete: (key: string) => void;
  /** Check if a key exists in the cache */
  has: (key: string) => boolean;
}

/**
 * Configuration options for the @memoize decorator.
 *
 * @interface MemoizeConfig
 * @template T - The type of the class containing the decorated method
 * @template D - The return type of the decorated method
 * @property {Cache<D>} [cache] - Custom cache implementation (defaults to Map)
 * @property {KeyResolver | keyof T} [keyResolver] - Function or method name for generating cache keys
 * @property {number} [expirationTimeMs] - Time in milliseconds after which cached values expire
 *
 * @example
 * ```typescript
 * const config: MemoizeConfig<MyService, User> = {
 *   cache: new LRUCache<string, User>(100),
 *   keyResolver: (id) => `user-${id}`,
 *   expirationTimeMs: 300000 // 5 minutes
 * };
 * ```
 */
export interface MemoizeConfig<T, D> {
  /** Custom cache implementation (defaults to Map) */
  cache?: Cache<D>;
  /** Function or method name for generating cache keys */
  keyResolver?: KeyResolver | keyof T;
  /** Time in milliseconds after which cached values expire */
  expirationTimeMs?: number;
}

/**
 * Type for the @memoize decorator function.
 *
 * @template T - The type of the class containing the decorated method
 * @template D - The return type of the decorated method
 *
 * @param {T} target - The class prototype
 * @param {keyof T} propertyName - The name of the method being decorated
 * @param {TypedPropertyDescriptor<Method<D>>} descriptor - The property descriptor
 * @returns {TypedPropertyDescriptor<Method<D>>} The modified descriptor
 */
export type Memoizable<T, D> = (
  target: T,
  propertyName: keyof T,
  descriptor: TypedPropertyDescriptor<Method<D>>,
) => TypedPropertyDescriptor<Method<D>>;
