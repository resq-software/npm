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
 * @fileoverview `@delay(delayMs)` decorator — defer the decorated method by
 * `delayMs` milliseconds before it runs. Useful for sequencing, animation
 * timing, and back-off helpers.
 *
 * @module @resq-systems/decorators/delay/delay
 */

import type { Decorator } from "../types.js";
import { delayFn } from "./delay.fn.js";

/**
 * Decorator that delays the execution of a method by the specified time.
 *
 * @template T - The type of the class containing the decorated method.
 * @param delayMs - The delay time in milliseconds.
 * @returns The decorator function.
 * @throws {Error} When applied to a non-method property.
 * @example
 * ```typescript
 * class AnimationController {
 *   @delay(500)
 *   fadeIn(element: HTMLElement) {
 *     element.style.opacity = '1';
 *   }
 *
 *   @delay(1000)
 *   fadeOut(element: HTMLElement) {
 *     element.style.opacity = '0';
 *   }
 * }
 *
 * const controller = new AnimationController();
 * controller.fadeIn(element); // Fades in after 500ms
 * controller.fadeOut(element); // Fades out after 1000ms
 * ```
 */
export function delay<T = unknown>(delayMs: number): Decorator<T> {
	return <F extends (...args: never[]) => unknown>(
		_target: T,
		_propertyName: PropertyKey,
		descriptor: TypedPropertyDescriptor<F>,
	): TypedPropertyDescriptor<F> => {
		if (descriptor.value) {
			descriptor.value = delayFn(descriptor.value, delayMs) as F;

			return descriptor;
		}
		throw new Error("@delay is applicable only on a methods.");
	};
}
