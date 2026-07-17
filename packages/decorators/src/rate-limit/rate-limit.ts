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
 * @fileoverview `@rateLimit` decorator — caps a method to a fixed number of calls
 * per rolling time window, dropping (and optionally handling) calls that exceed
 * the allowance.
 *
 * @module @resq-systems/decorators/rate-limit/rate-limit
 */

import type { Decorator } from "../types.js";
import { rateLimitFn } from "./rate-limit.fn.js";
import type { RateLimitConfigs } from "./rate-limit.types.js";

/**
 * Rate limit a method to at most `allowedCalls` invocations per `timeSpanMs`
 * window; calls beyond the allowance are dropped and routed to `exceedHandler`.
 *
 * The counter is built once, at decoration time, so the limit spans every instance
 * of the class (unless a `keyResolver` partitions it). A dropped call returns
 * `undefined` in place of the method's value — see {@link rateLimitFn} for the
 * sync-vs-async return shape and the best-effort caveat under concurrency. Mutates
 * the supplied property descriptor in place.
 *
 * @template T - The class type that owns the decorated method.
 * @param config - Rate-limit configuration: window size, allowance, and optional
 * key resolver, counter, and exceed handler.
 * @returns The method decorator, generic over the decorated method so its
 * signature is preserved end-to-end.
 * @throws {Error} If applied to anything other than a method.
 * @example
 * ```ts
 * class Api {
 *   @rateLimit({
 *     timeSpanMs: 1000, // One second.
 *     allowedCalls: 5, // At most five calls.
 *     exceedHandler: () => console.warn("Rate limit exceeded!"),
 *   })
 *   fetchData() {
 *     // Only five calls are allowed per second.
 *   }
 *
 *   // With a custom key resolver for per-user limiting.
 *   @rateLimit({
 *     timeSpanMs: 60000, // One minute.
 *     allowedCalls: 100, // At most 100 calls per user per minute.
 *     keyResolver: (userId) => userId, // Limit per user.
 *   })
 *   getUserData(userId: string) {
 *     return database.getUser(userId);
 *   }
 * }
 *
 * // With a custom counter implementation.
 * class DistributedApi {
 *   @rateLimit({
 *     timeSpanMs: 1000,
 *     allowedCalls: 10,
 *     rateLimitCounter: new RedisRateLimitCounter(), // Distributed counter.
 *   })
 *   async heavyOperation(): Promise<void> {
 *     // Rate limited across all instances.
 *   }
 * }
 * ```
 * @see {@link rateLimitFn} for the function form.
 */
export function rateLimit<T = unknown>(config: RateLimitConfigs<T>): Decorator<T> {
	// Generic over the decorated method `F` so the descriptor's signature is
	// preserved (the built-in `MethodDecorator` shape). `rateLimitFn` operates
	// structurally, so the wrapped result is cast back to `F`.
	return <F extends (...args: never[]) => unknown>(
		_target: T,
		_propertyName: PropertyKey,
		descriptor: TypedPropertyDescriptor<F>,
	): TypedPropertyDescriptor<F> => {
		if (descriptor.value) {
			descriptor.value = rateLimitFn(descriptor.value, config) as F;
			return descriptor;
		}

		throw new Error("@rateLimit is applicable only on methods.");
	};
}
