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
 * @fileoverview `@memoizeAsync` decorator — caches a promise-returning method's
 * results by their arguments and deduplicates concurrent calls, so identical
 * in-flight calls share one promise instead of re-running the method.
 *
 * @module @resq-systems/decorators/memoize-async/memoize-async
 */

import type { AsyncDecorator, AsyncMethod } from "../types.js";
import { memoizeAsyncFn } from "./memoize-async.fn.js";
import type { AsyncMemoizeConfig } from "./memoize-async.types.js";

/**
 * Cache a promise-returning method's results by their arguments and deduplicate
 * concurrent calls: identical calls share one promise until the first resolves.
 *
 * Call with no argument to cache forever, a number for a TTL in milliseconds, or
 * an {@link AsyncMemoizeConfig} for a custom cache, key resolver, and/or expiry.
 *
 * The cache and in-flight promise map are built once, at decoration time, so both
 * the cached values and the concurrent-call deduplication are shared across every
 * instance of the class. Failure surfaces as a rejected promise — a rejection is
 * shared by all callers deduped onto the same in-flight promise, and the entry is
 * then cleared so a later call retries rather than replaying the error. Only
 * resolved values are cached; rejections are not. Cancellation is not supported
 * (no `AbortSignal`). Mutates the supplied property descriptor in place.
 *
 * @template T - The class type that owns the decorated method.
 * @template D - The resolved type of the async method.
 * @param input - A TTL in milliseconds, an {@link AsyncMemoizeConfig}, or omitted
 * to cache indefinitely.
 * @returns The async method decorator.
 * @throws {Error} If applied to a member without a `value` descriptor (an
 * accessor or plain property rather than a method).
 * @example
 * ```ts
 * class DataService {
 *   // Basic usage — caches indefinitely.
 *   @memoizeAsync()
 *   async fetchConfig(): Promise<Config> {
 *     return fetch("/api/config").then((r) => r.json());
 *   }
 *
 *   // With a TTL of 60 seconds.
 *   @memoizeAsync(60000)
 *   async getExchangeRates(): Promise<Rates> {
 *     return fetch("/api/rates").then((r) => r.json());
 *   }
 *
 *   // With a custom cache and key resolver.
 *   @memoizeAsync({
 *     cache: new RedisCache<string, Product>(),
 *     keyResolver: (productId, includeDetails) =>
 *       `product-${productId}-${includeDetails}`,
 *     expirationTimeMs: 300000,
 *   })
 *   async getProduct(productId: string, includeDetails: boolean): Promise<Product> {
 *     return this.fetchProduct(productId, includeDetails);
 *   }
 * }
 *
 * const service = new DataService();
 *
 * // Concurrent calls with the same args share one promise.
 * const [product1, product2] = await Promise.all([
 *   service.getProduct("123", true),
 *   service.getProduct("123", true),
 * ]);
 * ```
 * @see {@link memoize} for synchronous methods.
 */
export function memoizeAsync<T = unknown>(): AsyncDecorator<T>;
export function memoizeAsync<T = unknown, D = unknown>(
	config: AsyncMemoizeConfig<T, D>,
): AsyncDecorator<T>;
export function memoizeAsync<T = unknown>(expirationTimeMs: number): AsyncDecorator<T>;
export function memoizeAsync<T = unknown, D = unknown>(
	input?: AsyncMemoizeConfig<T, D> | number,
): AsyncDecorator<T> {
	// Generic over the decorated async method `F` so the descriptor's signature
	// is preserved end-to-end. `memoizeAsyncFn` operates structurally, so we
	// bridge `F` to `AsyncMethod<D>` for the call and cast the result back.
	return <F extends (...args: never[]) => Promise<unknown>>(
		_target: T,
		_propertyName: PropertyKey,
		descriptor: TypedPropertyDescriptor<F>,
	): TypedPropertyDescriptor<F> => {
		if (descriptor.value) {
			const original = descriptor.value as AsyncMethod<D>;
			if (input === undefined) {
				descriptor.value = memoizeAsyncFn(original) as F;
			} else if (typeof input === "number") {
				descriptor.value = memoizeAsyncFn(original, input) as F;
			} else {
				descriptor.value = memoizeAsyncFn(original, input) as F;
			}

			return descriptor;
		}

		throw new Error("@memoizeAsync is applicable only on a methods.");
	};
}
