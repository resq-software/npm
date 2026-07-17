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
 * @fileoverview `@delegate(keyResolver?)` decorator — deduplicate concurrent
 * async method calls with the same arguments. A call made while an identical one
 * is in flight shares that promise instead of issuing a new request.
 *
 * @module @resq-systems/decorators/delegate/delegate
 *
 * @example
 * ```typescript
 * class DataService {
 *   @delegate()
 *   async fetchUser(userId: string): Promise<User> {
 *     return fetch(`/api/users/${userId}`).then((r) => r.json());
 *   }
 * }
 *
 * const service = new DataService();
 *
 * // These two calls share the same in-flight promise.
 * const promise1 = service.fetchUser("123");
 * const promise2 = service.fetchUser("123");
 * console.log(promise1 === promise2); // → true
 * ```
 */

import type { AsyncMethod } from "../types.js";
import { delegateFn } from "./delegate.fn.js";
import type { Delegatable } from "./delegate.types.js";

/**
 * Decorator that deduplicates concurrent async method calls.
 * Multiple calls with the same arguments will share the same promise
 * until the first one resolves or rejects.
 *
 * @template T - The type of the class containing the decorated method.
 * @template D - The return type of the decorated method (wrapped in a promise).
 * @param keyResolver - Optional function to generate cache keys from arguments.
 * @returns The decorator function.
 * @throws {Error} When applied to a non-method property.
 * @example
 * ```typescript
 * class ApiService {
 *   // Basic usage - uses JSON.stringify(args) as key
 *   @delegate()
 *   async fetchData(id: string): Promise<Data> {
 *     return this.http.get(`/data/${id}`);
 *   }
 *
 *   // Custom key resolver for complex arguments
 *   @delegate((userId, options) => `${userId}-${options.cacheKey}`)
 *   async getUser(userId: string, options: { cacheKey: string }): Promise<User> {
 *     return this.http.get(`/users/${userId}`);
 *   }
 * }
 *
 * // Usage - concurrent calls with same args share the promise
 * const api = new ApiService();
 *
 * // These share the same underlying promise
 * const [user1, user2] = await Promise.all([
 *   api.getUser('123', { cacheKey: 'v1' }),
 *   api.getUser('123', { cacheKey: 'v1' }) // Same key, returns cached promise
 * ]);
 *
 * // This creates a new promise (different cache key)
 * const user3 = await api.getUser('123', { cacheKey: 'v2' });
 * ```
 */
export function delegate<T = unknown, D = unknown>(
	keyResolver?: (...args: unknown[]) => string,
): Delegatable<T, D> {
	return (
		_target: T,
		_propertyName: keyof T,
		descriptor: TypedPropertyDescriptor<AsyncMethod<D>>,
	): TypedPropertyDescriptor<AsyncMethod<D>> => {
		if (descriptor.value) {
			descriptor.value = delegateFn(descriptor.value, keyResolver);

			return descriptor;
		}

		throw new Error("@delegate is applicable only on a methods.");
	};
}
