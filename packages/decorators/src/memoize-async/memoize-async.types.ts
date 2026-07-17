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
 * @template T - The class type that owns the decorated method.
 * @template D - The resolved type of the async method.
 * @deprecated Use {@link AsyncDecorator} from `../types.js` instead — removed in
 * v1.0.0. This shape erases the decorated method's signature, which is not
 * assignable to a concrete async method's descriptor under strict
 * `strictFunctionTypes` (TS1241 / TS1270 at the decoration site). `memoizeAsync`
 * now returns {@link AsyncDecorator}, which preserves the signature. Migration:
 * replace `AsyncMemoizable<T, D>` annotations with `AsyncDecorator<T>` (drop the
 * `D` parameter); no runtime change.
 */
export type AsyncMemoizable<T, D> = Memoizable<T, Promise<D>>;

/**
 * Async cache contract used by the `@memoizeAsync` decorator. Any store exposing
 * these four promise-returning operations (e.g. a Redis-backed cache) qualifies.
 *
 * `get` must resolve `null` for an absent key: `memoizeAsync` distinguishes hit
 * from miss with a single `get` (never a separate `has` + `get`) to stay race-free
 * against TTL eviction, so a nullish resolution is read as "not cached". A value
 * that is itself `null`/`undefined` therefore cannot be cached and is recomputed
 * each call. All operations share one keyspace.
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
	/** Store a value for `key`, overwriting any existing entry. */
	set: (key: string, value: D) => Promise<void>;
	/** Retrieve the value for `key`, resolving `null` when the key is absent. */
	get: (key: string) => Promise<D | null>;
	/** Remove the entry for `key`; resolves regardless of prior presence. */
	delete: (key: string) => Promise<void>;
	/** Whether an entry exists for `key`. Not used on the `memoizeAsync` hot path. */
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
	/**
	 * Custom cache, synchronous ({@link Cache}) or asynchronous ({@link AsyncCache});
	 * when omitted, a fresh `Map` is used.
	 */
	cache?: Cache<D> | AsyncCache<D>;
	/**
	 * How cache keys are derived. A {@link KeyResolver} is called with the
	 * arguments; a `keyof T` names an instance method resolved and bound to `this`
	 * at call time. When omitted, the key is `JSON.stringify` of the arguments.
	 */
	keyResolver?: KeyResolver | keyof T;
	/**
	 * Per-entry time-to-live in milliseconds, measured from insertion. When omitted,
	 * entries never expire.
	 */
	expirationTimeMs?: number;
}
