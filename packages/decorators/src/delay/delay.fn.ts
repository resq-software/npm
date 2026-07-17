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
 * @fileoverview Function form of `@delay` — `delayFn(method, delayMs)` returns a
 * wrapper that schedules `method` via `setTimeout` after `delayMs`.
 *
 * @module @resq-systems/decorators/delay/delay.fn
 */

import type { Method } from "../types.js";

/**
 * Wraps a method to delay its execution by the specified time.
 *
 * Effectful: each call schedules an **independent** `setTimeout` — unlike
 * {@link debounceFn} there is no dedup or timer reset, so N calls produce N
 * deferred executions. The wrapper returns `undefined` immediately; the original
 * method's return value is **discarded**, so it cannot wrap a method whose
 * result the caller needs. A throw from the method surfaces inside the timer
 * callback, not to the caller. No `AbortSignal` / cancellation.
 *
 * @template D - The return type of the original method.
 * @template A - The argument types of the original method.
 * @param originalMethod - The method to delay.
 * @param delayMs - The delay time in milliseconds.
 * @returns The delayed wrapper; it always returns `undefined` (`void`), never
 *   the wrapped method's value.
 * @example
 * ```typescript
 * class MessageService {
 *   send(message: string): void {
 *     console.log(`Sending: ${message}`);
 *   }
 * }
 *
 * const service = new MessageService();
 * const delayedSend = delayFn(
 *   service.send.bind(service),
 *   2000
 * );
 *
 * delayedSend('Hello'); // "Sending: Hello" appears after 2 seconds
 * ```
 */
export function delayFn<D = unknown, A extends unknown[] = unknown[]>(
	originalMethod: Method<D, A>,
	delayMs: number,
): Method<void, A> {
	return function (this: unknown, ...args: A): void {
		setTimeout(() => {
			originalMethod.apply(this, args);
		}, delayMs);
	};
}
