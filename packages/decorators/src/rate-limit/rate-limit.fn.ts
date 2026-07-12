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

import { assertNever } from "../_assert.js";
import { isFunction } from "../_utils.js";
import type { Method } from "../types.js";
import type {
	RateLimitAsyncCounter,
	RateLimitConfigs,
	RateLimitCounter,
} from "./rate-limit.types.js";
import { SimpleRateLimitCounter } from "./simple-rate-limit-counter.js";

/**
 * A counter resolved from {@link RateLimitConfigs}, discriminated by whether it
 * operates synchronously (in-memory) or asynchronously (distributed, e.g. Redis).
 */
type ResolvedCounter =
	| { readonly kind: "sync"; readonly counter: RateLimitCounter }
	| { readonly kind: "async"; readonly counter: RateLimitAsyncCounter };

/**
 * Picks the counter to use. An async (distributed) counter takes precedence when
 * provided; otherwise a sync counter is used, defaulting to an in-memory one.
 */
function resolveCounter(config: RateLimitConfigs): ResolvedCounter {
	if (config.rateLimitAsyncCounter) {
		return { kind: "async", counter: config.rateLimitAsyncCounter };
	}
	return { kind: "sync", counter: config.rateLimitCounter ?? new SimpleRateLimitCounter() };
}

/**
 * Resolves the rate-limit bucket key for a call, honoring both a resolver
 * function and a method name (`keyof T`) that lives on the instance.
 */
function resolveKey<A extends unknown[]>(
	self: unknown,
	keyResolver: RateLimitConfigs["keyResolver"],
	args: A,
): string {
	if (typeof keyResolver === "function") {
		return keyResolver(...args);
	}

	if (keyResolver != null) {
		const method = (self as Record<PropertyKey, unknown>)[keyResolver];
		if (isFunction(method)) {
			return String(method.apply(self, args));
		}
	}

	return "default";
}

/**
 * Creates a rate-limited version of a method.
 *
 * @template D - The return type of the original method
 * @template A - The argument types of the original method
 * @param {Method<D, A>} originalMethod - The method to rate limit
 * @param {RateLimitConfigs} config - The rate limit configuration
 * @returns {Method<D | undefined | Promise<D | undefined>, A>} A rate-limited method. The
 * result is a promise when a distributed `rateLimitAsyncCounter` is configured, otherwise sync.
 *
 * @example
 * ```typescript
 * class ApiService {
 *   async fetchData(id: string): Promise<Data> {
 *     return await fetch(`/api/data/${id}`).then(r => r.json());
 *   }
 * }
 *
 * const service = new ApiService();
 *
 * // Rate limit to 3 calls per 5 seconds
 * const limited = rateLimitFn(
 *   service.fetchData.bind(service),
 *   {
 *     timeSpanMs: 5000,
 *     allowedCalls: 3,
 *     exceedHandler: () => console.warn('Too many requests!')
 *   }
 * );
 *
 * await limited('1'); // Executes
 * await limited('2'); // Executes
 * await limited('3'); // Executes
 * const result = await limited('4'); // Returns undefined, logs warning
 * ```
 */
export function rateLimitFn<D = unknown, A extends unknown[] = unknown[]>(
	originalMethod: Method<D, A>,
	config: RateLimitConfigs,
): Method<D | undefined | Promise<D | undefined>, A> {
	const mode = resolveCounter(config);

	return function (this: unknown, ...args: A): D | undefined | Promise<D | undefined> {
		const key = resolveKey(this, config.keyResolver, args);

		switch (mode.kind) {
			case "sync":
				return runSync(mode.counter, key, config, originalMethod, this, args);
			case "async":
				return runAsync(mode.counter, key, config, originalMethod, this, args);
			default:
				return assertNever(mode);
		}
	};
}

/**
 * Executes a call against a synchronous (in-memory) counter, returning
 * `undefined` when the limit is exceeded.
 */
function runSync<D, A extends unknown[]>(
	counter: RateLimitCounter,
	key: string,
	config: RateLimitConfigs,
	originalMethod: Method<D, A>,
	self: unknown,
	args: A,
): D | undefined {
	if (counter.getCount(key) >= config.allowedCalls) {
		config.exceedHandler?.();
		return undefined;
	}

	counter.inc(key);
	setTimeout(() => counter.dec(key), config.timeSpanMs);

	return originalMethod.apply(self, args);
}

/**
 * Executes a call against an asynchronous (distributed) counter, returning
 * `undefined` when the limit is exceeded.
 */
async function runAsync<D, A extends unknown[]>(
	counter: RateLimitAsyncCounter,
	key: string,
	config: RateLimitConfigs,
	originalMethod: Method<D, A>,
	self: unknown,
	args: A,
): Promise<D | undefined> {
	if ((await counter.getCount(key)) >= config.allowedCalls) {
		config.exceedHandler?.();
		return undefined;
	}

	await counter.inc(key);
	setTimeout(() => {
		void counter.dec(key);
	}, config.timeSpanMs);

	return originalMethod.apply(self, args);
}
