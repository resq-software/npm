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
 * @fileoverview `@before` decorator — run a callback before the decorated method
 * executes. Useful for validation, authentication, or preprocessing; the hook
 * can be awaited via `wait: true` for guard patterns.
 *
 * @module @resq-systems/decorators/before/before
 *
 * @example
 * ```typescript
 * class MyService {
 *   @before({
 *     func: "validateInput",
 *     wait: true, // Wait for the before function to complete.
 *   })
 *   saveData(data: unknown) {
 *     database.save(data);
 *   }
 *
 *   validateInput() {
 *     if (!this.isValid) {
 *       throw new Error("Invalid state");
 *     }
 *   }
 * }
 * ```
 */

import type { Decorator } from "../types.js";
import { beforeFn } from "./before.fn.js";
import type { BeforeConfig } from "./before.types.js";

/**
 * Decorator that executes a function before the decorated method.
 * The before function is called before the method body executes.
 *
 * Applying the decorator rewrites the property descriptor's `value` with the
 * wrapped method, which becomes **async** (returns a `Promise`) even if the
 * original was synchronous. With `config.wait`, a throwing hook aborts the call;
 * see {@link beforeFn} for the full per-call contract.
 *
 * @template T - The type of the class containing the decorated method.
 * @param config - Configuration for the before hook.
 * @returns The decorator function.
 * @throws {Error} At decoration time, when applied to anything without a method
 *   value (an accessor or field), with message
 *   `"@before is applicable only on a methods."`.
 * @example
 * ```typescript
 * class DataProcessor {
 *   @before({
 *     func: function () {
 *       console.log("About to process...");
 *     },
 *     wait: false,
 *   })
 *   processItems(items: string[]): number {
 *     return items.length;
 *   }
 * }
 * ```
 */
export function before<T = unknown>(config: BeforeConfig<T>): Decorator<T> {
	return <F extends (...args: never[]) => unknown>(
		_target: T,
		_propertyName: PropertyKey,
		descriptor: TypedPropertyDescriptor<F>,
	): TypedPropertyDescriptor<F> => {
		if (descriptor.value) {
			descriptor.value = beforeFn(descriptor.value, config) as F;

			return descriptor;
		}
		throw new Error("@before is applicable only on a methods.");
	};
}
