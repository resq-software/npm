/**
 * Copyright 2026 ResQ Systems, Inc.
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
 * @fileoverview Types for the `@memoizeAsync` decorator and its function form:
 * the async cache contract, the configuration object, and the legacy decorator
 * signature.
 *
 * @module @resq-systems/decorators/memoize-async/memoize-async.types
 */

import type { Cache, KeyResolver, Memoizable } from "../memoize/memoize.types.js";

/**
 * Legacy signature type for the `@memoizeAsync` decorator (async counterpart of
 * `Memoizable`).
 *
 * @deprecated Use `AsyncDecorator<T>` from `../types.js` instead. This shape
 * erases the decorated method's signature, which is not assignable to a
 * concrete async method's descriptor under strict `strictFunctionTypes`
 * (TS1241 / TS1270 at the decoration site). `memoizeAsync` now returns
 * `AsyncDecorator<T>`, which preserves the signature. Retained for back-compat.
 *
 * @template T - The class type that owns the decorated method.
 * @template D - The resolved type of the async method.
 */
export type AsyncMemoizable<T, D> = Memoizable<T, Promise<D>>;

/**
 * Async cache contract used by the `@memoizeAsync` decorator. Any store exposing
 * these four promise-returning operations (e.g. a Redis-backed cache) qualifies.
 *
 * @template D - The type of values stored in the cache.
 * @example
 * ```ts
 * const redisCache: AsyncCache<User> = {
 *   set: async (key, value) => await redis.set(key, JSON.stringify(value)),
 *   get: async (key) => {
 *     const data = await redis.get(key);
 *     return data ? JSON.parse(data) : null;
 *   },
 *   delete: async (key) => await redis.del(key),
 *   has: async (key) => (await redis.exists(key)) > 0,
 * };
 * ```
 */
export interface AsyncCache<D> {
	/** Store a value in the cache asynchronously. */
	set: (key: string, value: D) => Promise<void>;
	/** Retrieve a value from the cache asynchronously. */
	get: (key: string) => Promise<D | null>;
	/** Remove a value from the cache asynchronously. */
	delete: (key: string) => Promise<void>;
	/** Check whether a key exists in the cache asynchronously. */
	has: (key: string) => Promise<boolean>;
}

/**
 * Configuration for the `@memoizeAsync` decorator and {@link memoizeAsyncFn}. The
 * cache may be synchronous or asynchronous.
 *
 * @template T - The class type a `keyof T` key resolver resolves against.
 * @template D - The resolved type of the async method.
 * @example
 * ```ts
 * const config: AsyncMemoizeConfig<ApiService, User> = {
 *   cache: redisCache,
 *   keyResolver: (userId) => `user:${userId}`,
 *   expirationTimeMs: 300000,
 * };
 * ```
 */
export interface AsyncMemoizeConfig<T, D> {
	/** Custom cache implementation, synchronous or asynchronous. */
	cache?: Cache<D> | AsyncCache<D>;
	/** Function or method name that generates cache keys. */
	keyResolver?: KeyResolver | keyof T;
	/** Time in milliseconds after which cached values expire. */
	expirationTimeMs?: number;
}
