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
 * @param args - The method arguments.
 * @returns The cache key.
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
	/** Store a value in the cache. */
	set: (key: string, value: D) => void;
	/** Retrieve a value from the cache. */
	get: (key: string) => D | null | undefined;
	/** Remove a value from the cache. */
	delete: (key: string) => void;
	/** Check whether a key exists in the cache. */
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
	/** Custom cache implementation; defaults to a `Map`. */
	cache?: Cache<D>;
	/** Function or method name that generates cache keys. */
	keyResolver?: KeyResolver | keyof T;
	/** Time in milliseconds after which cached values expire. */
	expirationTimeMs?: number;
}

/**
 * Type for the `@memoize` decorator function.
 *
 * @deprecated Use `Decorator<T>` from `../types.js` instead. This shape erases
 * the decorated method's signature to `Method<D>`, which is not assignable to a
 * concrete method's descriptor under strict `strictFunctionTypes` (TS1241 /
 * TS1270 at the decoration site). `memoize` now returns `Decorator<T>`, which
 * preserves the method signature end-to-end. Retained only for back-compat.
 *
 * @template T - The class type that owns the decorated method.
 * @template D - The return type of the decorated method.
 * @param target - The class prototype.
 * @param propertyName - The name of the method being decorated.
 * @param descriptor - The property descriptor.
 * @returns The modified descriptor.
 */
export type Memoizable<T, D> = (
	target: T,
	propertyName: keyof T,
	descriptor: TypedPropertyDescriptor<Method<D>>,
) => TypedPropertyDescriptor<Method<D>>;
