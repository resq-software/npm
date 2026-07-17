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
 * @fileoverview Types for the `@memoize` decorator and its function form: the
 * cache-key resolver, the cache contract, the configuration object, and the
 * legacy decorator signature.
 *
 * @module @resq-systems/decorators/memoize/memoize.types
 */

import type { Method } from "../types.js";

/**
 * Resolves a cache key from a method's arguments.
 *
 * The returned string is the cache identity: it must be deterministic and
 * collision-free for the inputs that should share (or not share) a cached value.
 * Two argument sets that map to the same string are treated as the same call, so
 * an over-broad resolver silently returns stale results.
 *
 * @param args - The method arguments.
 * @returns The cache key; equal keys are treated as the same cached call.
 * @example
 * ```ts
 * const keyResolver: KeyResolver = (userId, includeDetails) =>
 *   `${userId}-${includeDetails}`;
 * ```
 */
export type KeyResolver = (...args: unknown[]) => string;

/**
 * Cache contract used by the `@memoize` decorator. Any store with these four
 * synchronous operations (a plain `Map`, an LRU, etc.) can back the cache.
 *
 * `has` is the authority on presence, not `get`: a stored value may legitimately
 * be `null`/`undefined`, so `memoize` calls `has` first and only then `get`. An
 * implementation must therefore keep the two consistent for the same key. All
 * four operations share one keyspace and run synchronously (use
 * {@link AsyncCache} for a promise-based store).
 *
 * @template D - The type of values stored in the cache.
 * @example
 * ```ts
 * const cache: Cache<User> = {
 *   set: (key, value) => storage.set(key, value),
 *   get: (key) => storage.get(key),
 *   delete: (key) => storage.delete(key),
 *   has: (key) => storage.has(key),
 * };
 * ```
 */
export interface Cache<D> {
	/** Store a value in the cache, overwriting any existing entry for `key`. */
	set: (key: string, value: D) => void;
	/**
	 * Retrieve a value for `key`. A `null`/`undefined` result is ambiguous — it may
	 * be an absent key or a stored nullish value — so callers must gate on `has`.
	 */
	get: (key: string) => D | null | undefined;
	/** Remove the entry for `key`; a no-op when the key is absent. */
	delete: (key: string) => void;
	/** Whether an entry exists for `key`; the authoritative presence check. */
	has: (key: string) => boolean;
}

/**
 * Configuration for the `@memoize` decorator and {@link memoizeFn}.
 *
 * @template T - The class type a `keyof T` key resolver resolves against.
 * @template D - The return type of the decorated method.
 * @example
 * ```ts
 * const config: MemoizeConfig<MyService, User> = {
 *   cache: new LRUCache<string, User>(100),
 *   keyResolver: (id) => `user-${id}`,
 *   expirationTimeMs: 300000, // Five minutes.
 * };
 * ```
 */
export interface MemoizeConfig<T, D> {
	/** Custom cache; when omitted, a fresh `Map` is used. */
	cache?: Cache<D>;
	/**
	 * How cache keys are derived. A {@link KeyResolver} is called with the
	 * arguments; a `keyof T` names an instance method resolved and bound to `this`
	 * at call time. When omitted, the key is `JSON.stringify` of the arguments.
	 */
	keyResolver?: KeyResolver | keyof T;
	/**
	 * Per-entry time-to-live in milliseconds, measured from insertion (not refreshed
	 * on read). When omitted, entries never expire.
	 */
	expirationTimeMs?: number;
}

/**
 * Type for the `@memoize` decorator function.
 *
 * @template T - The class type that owns the decorated method.
 * @template D - The return type of the decorated method.
 * @param target - The class prototype.
 * @param propertyName - The name of the method being decorated.
 * @param descriptor - The property descriptor.
 * @returns The modified descriptor.
 * @deprecated Use {@link Decorator} from `../types.js` instead — removed in
 * v1.0.0. This shape erases the decorated method's signature to `Method<D>`,
 * which is not assignable to a concrete method's descriptor under strict
 * `strictFunctionTypes` (TS1241 / TS1270 at the decoration site). `memoize` now
 * returns {@link Decorator}, which preserves the signature end-to-end. Migration:
 * replace `Memoizable<T, D>` annotations with `Decorator<T>` (drop the `D`
 * parameter); no runtime change.
 */
export type Memoizable<T, D> = (
	target: T,
	propertyName: keyof T,
	descriptor: TypedPropertyDescriptor<Method<D>>,
) => TypedPropertyDescriptor<Method<D>>;
