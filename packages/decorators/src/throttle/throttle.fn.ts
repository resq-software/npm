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
 * @fileoverview Function form of the `@throttle` decorator — wraps a method so it
 * runs at most once per interval, dropping excess calls.
 *
 * @module @resq-systems/decorators/throttle/throttle.fn
 */

import type { Method } from "../types.js";

/**
 * Wrap a method so it executes at most once per `delayMs` (function form of
 * {@link throttle}). Calls made during the cooldown are dropped.
 *
 * @template D - The return type of the original method.
 * @template A - The argument tuple of the original method.
 * @param originalMethod - The method to throttle.
 * @param delayMs - The minimum interval between executions, in milliseconds.
 * @returns The throttled method.
 * @example
 * ```ts
 * class ScrollTracker {
 *   scrollY = 0;
 *
 *   updatePosition(y: number): void {
 *     this.scrollY = y;
 *     console.log('Position updated:', y);
 *   }
 * }
 *
 * const tracker = new ScrollTracker();
 *
 * // Throttle to once per 100ms
 * const throttledUpdate = throttleFn(
 *   tracker.updatePosition.bind(tracker),
 *   100
 * );
 *
 * // Rapid scroll events
 * window.addEventListener('scroll', (e) => {
 *   throttledUpdate(window.scrollY);
 *   // Only logs once every 100ms even during rapid scrolling
 * });
 * ```
 */
export function throttleFn<D = unknown, A extends unknown[] = unknown[]>(
	originalMethod: Method<D, A>,
	delayMs: number,
): Method<void, A> {
	let throttling = false;
	return function (this: unknown, ...args: A): void {
		if (!throttling) {
			throttling = true;
			originalMethod.apply(this, args);

			setTimeout(() => {
				throttling = false;
			}, delayMs);
		}
	};
}
