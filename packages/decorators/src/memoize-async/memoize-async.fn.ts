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

import { isFunction, isNumber, TaskExec } from "../_utils.js";
import type { AsyncMethod } from "../types.js";
import type { KeyResolver } from "../memoize/memoize.types.js";
import type { AsyncMemoizeConfig } from "./memoize-async.types.js";

/**
 * Wraps an async method to cache its results and deduplicate concurrent calls.
 *
 * @overload
 * @template D - The resolved type of the async method
 * @template A - The argument types of the original method
 * @param {AsyncMethod<D, A>} originalMethod - The async method to memoize
 * @returns {AsyncMethod<D, A>} The memoized method
 *
 * @overload
 * @template D - The resolved type of the async method
 * @template A - The argument types of the original method
 * @param {AsyncMethod<D, A>} originalMethod - The async method to memoize
 * @param {AsyncMemoizeConfig<Record<PropertyKey, unknown>, D>} config - Configuration for memoization
 * @returns {AsyncMethod<D, A>} The memoized method
 *
 * @overload
 * @template D - The resolved type of the async method
 * @template A - The argument types of the original method
 * @param {AsyncMethod<D, A>} originalMethod - The async method to memoize
 * @param {number} expirationTimeMs - Cache expiration time in milliseconds
 * @returns {AsyncMethod<D, A>} The memoized method
 *
 * @example
 * ```typescript
 * class ApiClient {
 *   async fetchData(endpoint: string): Promise<Data> {
 *     const response = await fetch(endpoint);
 *     return response.json();
 *   }
 * }
 *
 * const client = new ApiClient();
 *
 * // Basic memoization
 * const memoized = memoizeAsyncFn(client.fetchData.bind(client));
 *
 * // Concurrent calls share the same promise
 * const promise1 = memoized('/api/data');
 * const promise2 = memoized('/api/data'); // Same promise as above
 * const [data1, data2] = await Promise.all([promise1, promise2]);
 *
 * // With TTL
 * const withTTL = memoizeAsyncFn(
 *   client.fetchData.bind(client),
 *   60000 // Cache for 60 seconds
 * );
 *
 * // With custom config
 * const withConfig = memoizeAsyncFn(
 *   client.fetchData.bind(client),
 *   {
 *     cache: new Map(),
 *     keyResolver: (endpoint) => endpoint,
 *     expirationTimeMs: 300000
 *   }
 * );
 * ```
 */
export function memoizeAsyncFn<D = unknown, A extends unknown[] = unknown[]>(
	originalMethod: AsyncMethod<D, A>,
): AsyncMethod<D, A>;
export function memoizeAsyncFn<T = unknown, D = unknown, A extends unknown[] = unknown[]>(
	originalMethod: AsyncMethod<D, A>,
	config: AsyncMemoizeConfig<T, D>,
): AsyncMethod<D, A>;
export function memoizeAsyncFn<D = unknown, A extends unknown[] = unknown[]>(
	originalMethod: AsyncMethod<D, A>,
	expirationTimeMs: number,
): AsyncMethod<D, A>;

export function memoizeAsyncFn<T = unknown, D = unknown, A extends unknown[] = unknown[]>(
	originalMethod: AsyncMethod<D, A>,
	input?: AsyncMemoizeConfig<T, D> | number,
): AsyncMethod<D, A> {
	const defaultConfig: AsyncMemoizeConfig<T, D> = {
		cache: new Map<string, D>(),
	};
	const runner = new TaskExec();
	const promCache = new Map<string, Promise<D>>();
	let resolvedConfig = {
		...defaultConfig,
	} as AsyncMemoizeConfig<T, D>;

	if (isNumber(input)) {
		resolvedConfig.expirationTimeMs = input;
	} else {
		resolvedConfig = {
			...resolvedConfig,
			...input,
		};
	}

	return async function (this: unknown, ...args: A): Promise<D> {
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

		if (promCache.has(key)) {
			return promCache.get(key) as Promise<D>;
		}

		const prom = (async (): Promise<D> => {
			// Single authoritative read. Awaiting `has()` and then `get()` separately
			// races with expiry/eviction: a TTL `delete` (scheduled below) or a
			// concurrent delete can run *between* the two awaits, turning a confirmed
			// hit into `get()` → `null`, which the old code returned as `null as D` —
			// a wrong value instead of a recompute. `AsyncCache.get` returns `null`
			// for an absent key by contract, so one read is both race-free and
			// sufficient to distinguish hit from miss.
			const cached = await resolvedConfig.cache?.get(key);
			if (cached != null) {
				return cached as D;
			}

			const data = await originalMethod.apply(this, args);
			await resolvedConfig.cache?.set(key, data);

			if (resolvedConfig.expirationTimeMs !== undefined) {
				runner.exec(() => {
					resolvedConfig.cache?.delete(key);
				}, resolvedConfig.expirationTimeMs);
			}

			return data;
		})().finally(() => {
			promCache.delete(key);
		});

		promCache.set(key, prom);

		return prom;
	};
}
