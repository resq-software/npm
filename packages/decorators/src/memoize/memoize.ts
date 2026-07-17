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
 * @fileoverview `@memoize` decorator — caches a synchronous method's results by
 * their arguments so a repeat call with the same arguments returns the cached
 * value instead of re-executing the method.
 *
 * @module @resq-systems/decorators/memoize/memoize
 */

import type { Decorator, Method } from "../types.js";
import { memoizeFn } from "./memoize.fn.js";
import type { MemoizeConfig } from "./memoize.types.js";

/**
 * Cache a synchronous method's results by their arguments; a repeat call with
 * the same arguments returns the cached value instead of re-running the method.
 *
 * Call with no argument to cache forever, a number for a TTL in milliseconds, or
 * a {@link MemoizeConfig} for a custom cache, key resolver, and/or expiry.
 *
 * The cache is built once, when the method is decorated, so it is shared across
 * every instance of the class rather than being per-instance. The default key is
 * `JSON.stringify` of the arguments, which omits the instance identity — calls on
 * different instances with equal arguments therefore collide on one entry. Supply
 * a `keyResolver` that encodes the instance (or per-instance state) to isolate
 * caches. Mutates the supplied property descriptor in place.
 *
 * @template T - The class type that owns the decorated method.
 * @template D - The return type of the decorated method.
 * @param input - A TTL in milliseconds, a {@link MemoizeConfig}, or omitted to
 * cache indefinitely.
 * @returns The method decorator.
 * @throws {Error} If applied to a member without a `value` descriptor (an
 * accessor or plain property rather than a method).
 * @example
 * ```ts
 * class DataService {
 *   // Basic usage — caches indefinitely.
 *   @memoize()
 *   getUser(id: string): User {
 *     return this.database.findUser(id);
 *   }
 *
 *   // With a TTL of 60 seconds.
 *   @memoize(60000)
 *   getConfig(): Config {
 *     return this.loadConfig();
 *   }
 *
 *   // With a custom cache and key resolver.
 *   @memoize({
 *     cache: new LRUCache<string, User>(100),
 *     keyResolver: (userId, includeDetails) => `${userId}-${includeDetails}`,
 *     expirationTimeMs: 300000,
 *   })
 *   getUserWithDetails(userId: string, includeDetails: boolean): User {
 *     return this.fetchUser(userId, includeDetails);
 *   }
 * }
 *
 * const service = new DataService();
 * const user1 = service.getUser("123"); // Executes the method.
 * const user2 = service.getUser("123"); // Cached — no database query.
 * ```
 * @see {@link memoizeAsync} for promise-returning methods.
 */
export function memoize<T = unknown>(): Decorator<T>;
export function memoize<T = unknown, D = unknown>(config: MemoizeConfig<T, D>): Decorator<T>;
export function memoize<T = unknown>(expirationTimeMs: number): Decorator<T>;
export function memoize<T = unknown, D = unknown>(
	input?: MemoizeConfig<T, D> | number,
): Decorator<T> {
	// Generic over the decorated method `F` so the descriptor's signature is
	// preserved end-to-end (matches the built-in `MethodDecorator` shape). The
	// internal `memoizeFn` operates structurally, so we bridge `F` to
	// `Method<D>` for the call and cast the wrapped result back to `F`.
	return <F extends (...args: never[]) => unknown>(
		_target: T,
		_propertyName: PropertyKey,
		descriptor: TypedPropertyDescriptor<F>,
	): TypedPropertyDescriptor<F> => {
		if (descriptor.value) {
			const original = descriptor.value as Method<D>;
			if (input === undefined) {
				descriptor.value = memoizeFn(original) as F;
			} else if (typeof input === "number") {
				descriptor.value = memoizeFn(original, input) as F;
			} else {
				descriptor.value = memoizeFn(original, input) as F;
			}

			return descriptor;
		}
		throw new Error("@memoize is applicable only on a methods.");
	};
}
