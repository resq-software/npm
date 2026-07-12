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

import { isFunction, TaskExec } from "../_utils.js";
import type { Method } from "../types.js";
import type { KeyResolver, MemoizeConfig } from "./memoize.types.js";

/**
 * Wraps a method to cache its results based on arguments.
 *
 * @overload
 * @template D - The return type of the original method
 * @template A - The argument types of the original method
 * @param {Method<D, A>} originalMethod - The method to memoize
 * @returns {Method<D, A>} The memoized method
 *
 * @overload
 * @template D - The return type of the original method
 * @template A - The argument types of the original method
 * @param {Method<D, A>} originalMethod - The method to memoize
 * @param {MemoizeConfig<Record<PropertyKey, unknown>, D>} config - Configuration for memoization
 * @returns {Method<D, A>} The memoized method
 *
 * @overload
 * @template D - The return type of the original method
 * @template A - The argument types of the original method
 * @param {Method<D, A>} originalMethod - The method to memoize
 * @param {number} expirationTimeMs - Cache expiration time in milliseconds
 * @returns {Method<D, A>} The memoized method
 *
 * @example
 * ```typescript
 * class ExpensiveOperations {
 *   calculatePrimes(max: number): number[] {
 *     const primes = [];
 *     for (let i = 2; i <= max; i++) {
 *       if (this.isPrime(i)) primes.push(i);
 *     }
 *     return primes;
 *   }
 * }
 *
 * const ops = new ExpensiveOperations();
 *
 * // Basic memoization
 * const memoized = memoizeFn(ops.calculatePrimes.bind(ops));
 * const primes1 = memoized(1000); // Computes
 * const primes2 = memoized(1000); // Returns cached result
 *
 * // With TTL
 * const withTTL = memoizeFn(
 *   ops.calculatePrimes.bind(ops),
 *   60000 // Cache for 60 seconds
 * );
 *
 * // With custom config
 * const withConfig = memoizeFn(
 *   ops.calculatePrimes.bind(ops),
 *   {
 *     cache: new Map(),
 *     keyResolver: (max) => `primes-${max}`,
 *     expirationTimeMs: 300000
 *   }
 * );
 * ```
 */
export function memoizeFn<D = unknown, A extends unknown[] = unknown[]>(
	originalMethod: Method<D, A>,
): Method<D, A>;
export function memoizeFn<T = unknown, D = unknown, A extends unknown[] = unknown[]>(
	originalMethod: Method<D, A>,
	config: MemoizeConfig<T, D>,
): Method<D, A>;
export function memoizeFn<D = unknown, A extends unknown[] = unknown[]>(
	originalMethod: Method<D, A>,
	expirationTimeMs: number,
): Method<D, A>;
export function memoizeFn<T = unknown, D = unknown, A extends unknown[] = unknown[]>(
	originalMethod: Method<D, A>,
	input?: MemoizeConfig<T, D> | number,
): Method<D, A> {
	const defaultConfig: MemoizeConfig<T, D> = {
		cache: new Map<string, D>(),
	};

	const runner = new TaskExec();
	let resolvedConfig = {
		...defaultConfig,
	} as MemoizeConfig<T, D>;

	if (typeof input === "number") {
		resolvedConfig.expirationTimeMs = input;
	} else {
		resolvedConfig = {
			...resolvedConfig,
			...input,
		};
	}

	return function (this: unknown, ...args: A): D {
		const { keyResolver: rawKeyResolver } = resolvedConfig;
		let keyResolver: KeyResolver | undefined;

		if (isFunction(rawKeyResolver)) {
			keyResolver = rawKeyResolver;
		} else if (rawKeyResolver != null) {
			// `keyResolver` is a method name; resolve it against the instance via a
			// narrow `Record` view instead of an `any`-typed `this`.
			const named = (this as Record<PropertyKey, unknown>)[rawKeyResolver];
			keyResolver = isFunction(named) ? (named.bind(this) as KeyResolver) : undefined;
		}

		const key = keyResolver ? keyResolver(...args) : JSON.stringify(args);

		const cache = resolvedConfig.cache;
		if (cache?.has(key)) {
			// has() confirms the key is present, so a stored null/undefined is a
			// genuine cached value — return it directly instead of treating it as a
			// miss and re-running the method.
			return cache.get(key) as D;
		}

		const response = originalMethod.apply(this, args);

		if (cache) {
			if (resolvedConfig.expirationTimeMs !== undefined) {
				runner.exec(() => {
					cache.delete(key);
				}, resolvedConfig.expirationTimeMs);
			}

			cache.set(key, response);
		}

		return response;
	};
}
