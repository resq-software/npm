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
 * @fileoverview Function form of `@debounce` — `debounceFn(method, delayMs)`
 * returns a debounced wrapper that fires `method` only after `delayMs` of
 * quiet, resetting the timer on each call.
 *
 * @module @resq-systems/decorators/debounce/debounce.fn
 */

import type { Method } from "../types.js";

/**
 * Wraps a method to debounce its execution.
 * The method will only execute after the specified delay has passed
 * since the last time it was called.
 *
 * Effectful and trailing-edge only: each call clears the shared pending
 * `setTimeout` and arms a new one, so a single wrapper collapses *all* its
 * calls (regardless of arguments) into the last one. The wrapper returns
 * `undefined` immediately — the original method's return value is **discarded**,
 * so this cannot wrap a method whose result the caller needs. The deferred
 * invocation uses the `this` and arguments of the most recent call; if the
 * method throws, it throws inside the timer callback (unobservable to the
 * caller). No `AbortSignal` / cancellation.
 *
 * @template D - The return type of the original method.
 * @template A - The argument types of the original method.
 * @param originalMethod - The method to debounce.
 * @param delayMs - The debounce delay in milliseconds.
 * @returns The debounced wrapper; it always returns `undefined` (`void`), never
 *   the wrapped method's value.
 * @example
 * ```typescript
 * class SearchService {
 *   search(query: string): void {
 *     console.log(`Searching for: ${query}`);
 *   }
 * }
 *
 * const service = new SearchService();
 * const debouncedSearch = debounceFn(
 *   service.search.bind(service),
 *   300
 * );
 *
 * // Rapid calls
 * debouncedSearch('a');
 * debouncedSearch('ab');
 * debouncedSearch('abc');
 *
 * // Only "Searching for: abc" is logged after 300ms
 * ```
 */
export function debounceFn<D = unknown, A extends unknown[] = unknown[]>(
	originalMethod: Method<D, A>,
	delayMs: number,
): Method<void, A> {
	let handler: ReturnType<typeof setTimeout> | undefined;

	return function (this: unknown, ...args: A): void {
		clearTimeout(handler);

		handler = setTimeout(() => {
			originalMethod.apply(this, args);
		}, delayMs);
	};
}
