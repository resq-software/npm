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

import type { Decorator, Method } from "../types.js";
/*
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
 * @fileoverview Memoize decorator - caches method results based on arguments.
 * Subsequent calls with the same arguments return the cached result instead of
 * re-executing the method.
 *
 * @module @resq/typescript/decorators/memoize
 *
 * @example
 * ```typescript
 * class Calculator {
 *   @memoize()
 *   fibonacci(n: number): number {
 *     if (n <= 1) return n;
 *     return this.fibonacci(n - 1) + this.fibonacci(n - 2);
 *   }
 * }
 *
 * const calc = new Calculator();
 * console.log(calc.fibonacci(40)); // Computes and caches
 * console.log(calc.fibonacci(40)); // Returns cached result instantly
 * ```
 *
 * @copyright Copyright (c) 2026 ResQ
 * @license MIT
 */

import { memoizeFn } from "./memoize.fn.js";
import type { MemoizeConfig } from "./memoize.types.js";

/**
 * Decorator that caches method results based on their arguments.
 * Subsequent calls with the same arguments return the cached result.
 *
 * @overload
 * @template T - The type of the class containing the decorated method
 * @template D - The return type of the decorated method
 * @returns {Decorator<T>} The decorator function
 *
 * @overload
 * @template T - The type of the class containing the decorated method
 * @template D - The return type of the decorated method
 * @param {MemoizeConfig<T, D>} config - Configuration for memoization
 * @returns {Decorator<T>} The decorator function
 *
 * @overload
 * @template T - The type of the class containing the decorated method
 * @template D - The return type of the decorated method
 * @param {number} expirationTimeMs - Cache expiration time in milliseconds
 * @returns {Decorator<T>} The decorator function
 *
 * @throws {Error} When applied to a non-method property
 *
 * @example
 * ```typescript
 * class DataService {
 *   // Basic usage - caches indefinitely
 *   @memoize()
 *   getUser(id: string): User {
 *     return this.database.findUser(id);
 *   }
 *
 *   // With TTL (time to live)
 *   @memoize(60000) // Cache for 60 seconds
 *   getConfig(): Config {
 *     return this.loadConfig();
 *   }
 *
 *   // With custom cache and key resolver
 *   @memoize({
 *     cache: new LRUCache<string, User>(100),
 *     keyResolver: (userId, includeDetails) => `${userId}-${includeDetails}`,
 *     expirationTimeMs: 300000 // 5 minutes
 *   })
 *   getUserWithDetails(userId: string, includeDetails: boolean): User {
 *     return this.fetchUser(userId, includeDetails);
 *   }
 * }
 *
 * const service = new DataService();
 *
 * // First call executes the method
 * const user1 = service.getUser('123');
 *
 * // Second call with same argument returns cached result
 * const user2 = service.getUser('123'); // Instant, no database query
 * ```
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
