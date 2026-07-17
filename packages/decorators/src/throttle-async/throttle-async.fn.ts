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
 * @fileoverview Function form of the `@throttleAsync` decorator — wraps an async
 * method so at most `parallelCalls` executions run at once, queuing the rest.
 *
 * @module @resq-systems/decorators/throttle-async/throttle-async.fn
 */

import type { AsyncMethod } from "../types.js";
import { ThrottleAsyncExecutor } from "./throttle-async-executor.js";

/**
 * Wrap an async method to limit concurrent executions (function form of
 * {@link throttleAsync}). Calls beyond the limit queue and run in FIFO order.
 *
 * @template D - The resolved type of the async method.
 * @template A - The argument tuple of the original method.
 * @param originalMethod - The async method to throttle.
 * @param parallelCalls - Maximum number of concurrent calls; defaults to `1`.
 * @returns The throttled async method.
 * @example
 * ```ts
 * class ApiClient {
 *   async fetchUser(userId: string): Promise<User> {
 *     return fetch(`/api/users/${userId}`).then((r) => r.json());
 *   }
 * }
 *
 * const client = new ApiClient();
 *
 * // Limit to two concurrent requests.
 * const throttledFetch = throttleAsyncFn(client.fetchUser.bind(client), 2);
 *
 * // Execute multiple calls; only two run concurrently.
 * const users = await Promise.all([
 *   throttledFetch("1"), // Starts immediately.
 *   throttledFetch("2"), // Starts immediately.
 *   throttledFetch("3"), // Queued; starts when 1 or 2 completes.
 *   throttledFetch("4"), // Queued; starts when a slot frees up.
 * ]);
 * ```
 */
export function throttleAsyncFn<D = unknown, A extends unknown[] = unknown[]>(
	originalMethod: AsyncMethod<D, A>,
	parallelCalls = 1,
): AsyncMethod<D, A> {
	const executor = new ThrottleAsyncExecutor(originalMethod, parallelCalls);

	return function (this: unknown, ...args: A): Promise<D> {
		return executor.exec(this, args);
	};
}
