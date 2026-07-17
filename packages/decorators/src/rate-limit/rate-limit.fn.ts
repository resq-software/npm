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
 * @fileoverview Function form of the `@rateLimit` decorator — wraps a method so it
 * runs at most `allowedCalls` times per window, backed by either an in-memory or
 * a distributed (async) counter.
 *
 * @module @resq-systems/decorators/rate-limit/rate-limit.fn
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
function resolveCounter<T>(config: RateLimitConfigs<T>): ResolvedCounter {
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
	keyResolver: ((...args: A) => string) | PropertyKey | undefined,
	args: A,
): string {
	if (typeof keyResolver === "function") {
		return keyResolver(...args);
	}

	if (keyResolver != null && self != null) {
		const method = (self as Record<PropertyKey, unknown>)[keyResolver];
		if (isFunction(method)) {
			return String(method.apply(self, args));
		}
	}

	return "default";
}

/**
 * Create a rate-limited version of a method (function form of {@link rateLimit}).
 *
 * With a distributed `rateLimitAsyncCounter`, limiting is best-effort under
 * concurrency: the check-then-increment is not atomic, so bursts can briefly
 * exceed `allowedCalls`. Back the counter with an atomic increment for a hard cap.
 *
 * On an admitted call it increments the counter and schedules a `setTimeout` to
 * decrement it after `timeSpanMs` (a clock/timer effect); on a dropped call it
 * invokes `config.exceedHandler` (if any) for its side effects.
 *
 * @template T - The class type a `keyof T` key resolver resolves against.
 * @template D - The return type of the original method.
 * @template A - The argument tuple of the original method.
 * @param originalMethod - The method to rate limit.
 * @param config - The rate-limit configuration.
 * @returns A rate-limited method that yields the original result when admitted and
 * the sentinel `undefined` when dropped; the result is wrapped in a promise when a
 * distributed `rateLimitAsyncCounter` is configured, otherwise it is synchronous.
 * @example
 * ```ts
 * class ApiService {
 *   async fetchData(id: string): Promise<Data> {
 *     return await fetch(`/api/data/${id}`).then((r) => r.json());
 *   }
 * }
 *
 * const service = new ApiService();
 *
 * // Rate limit to three calls per five seconds.
 * const limited = rateLimitFn(service.fetchData.bind(service), {
 *   timeSpanMs: 5000,
 *   allowedCalls: 3,
 *   exceedHandler: () => console.warn("Too many requests!"),
 * });
 *
 * await limited("1"); // Executes.
 * await limited("2"); // Executes.
 * await limited("3"); // Executes.
 * const result = await limited("4"); // → undefined; logs the warning.
 * ```
 */
export function rateLimitFn<T = unknown, D = unknown, A extends unknown[] = unknown[]>(
	originalMethod: Method<D, A>,
	config: RateLimitConfigs<T>,
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
function runSync<T, D, A extends unknown[]>(
	counter: RateLimitCounter,
	key: string,
	config: RateLimitConfigs<T>,
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
 *
 * **Best-effort under concurrency.** The count is read then incremented in two
 * awaits — {@link RateLimitAsyncCounter} exposes no atomic increment-and-read —
 * so simultaneous callers can race between `getCount` and `inc` and briefly
 * admit more than `allowedCalls`. For a hard guarantee, back the counter with an
 * atomic primitive (e.g. a Redis `INCR` that returns the new value, or a Lua
 * script) and enforce the limit on that returned value.
 */
async function runAsync<T, D, A extends unknown[]>(
	counter: RateLimitAsyncCounter,
	key: string,
	config: RateLimitConfigs<T>,
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
		// Swallow failures: a rejected distributed decrement must not surface as an
		// unhandled rejection (which crashes Node 15+/Bun). The counter's own
		// window/TTL reconciles the count if a decrement is lost.
		counter.dec(key).catch(() => {});
	}, config.timeSpanMs);

	return originalMethod.apply(self, args);
}
