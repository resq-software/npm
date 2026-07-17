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
 * @fileoverview `@throttle` decorator — caps a method to at most one call per
 * `delayMs`, dropping calls made during the cooldown.
 *
 * @module @resq-systems/decorators/throttle/throttle
 */

import type { Decorator } from "../types.js";
import { throttleFn } from "./throttle.fn.js";

/**
 * Throttle a method to at most one call per `delayMs`; calls made during the
 * cooldown are dropped.
 *
 * @template T - The class type that owns the decorated method.
 * @param delayMs - The minimum interval between executions, in milliseconds.
 * @returns The method decorator.
 * @throws {Error} If applied to anything other than a method.
 * @example
 * ```ts
 * class ResizeHandler {
 *   private width = window.innerWidth;
 *   private height = window.innerHeight;
 *
 *   @throttle(200)
 *   handleResize(): void {
 *     this.width = window.innerWidth;
 *     this.height = window.innerHeight;
 *     this.render();
 *   }
 * }
 *
 * const handler = new ResizeHandler();
 * window.addEventListener("resize", () => handler.handleResize());
 * // handleResize executes at most once every 200ms during a resize.
 * ```
 * @see {@link throttleFn} for the function form.
 */
export function throttle<T = unknown>(delayMs: number): Decorator<T> {
	return <F extends (...args: never[]) => unknown>(
		_target: T,
		_propertyName: PropertyKey,
		descriptor: TypedPropertyDescriptor<F>,
	): TypedPropertyDescriptor<F> => {
		if (descriptor.value) {
			descriptor.value = throttleFn(descriptor.value, delayMs) as F;

			return descriptor;
		}

		throw new Error("@throttle is applicable only on a methods.");
	};
}
