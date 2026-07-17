/*
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
 * @fileoverview `@bind` decorator — auto-bind a class method to its instance so
 * `this` stays correct even when the method is detached and passed as a
 * callback. Binds lazily on first access.
 *
 * @module @resq-systems/decorators/bind/bind
 *
 * @example
 * ```typescript
 * class EventHandler {
 *   private count = 0;
 *
 *   @bind
 *   handleClick(event: MouseEvent): void {
 *     this.count++; // `this` correctly refers to the EventHandler instance.
 *     console.log(`Clicked ${this.count} times`);
 *   }
 * }
 *
 * const handler = new EventHandler();
 * // Works correctly even when passed as a bare callback.
 * button.addEventListener("click", handler.handleClick);
 * ```
 */

/**
 * Decorator that automatically binds a method to its class instance.
 * This ensures `this` always refers to the class instance, even when
 * the method is passed as a callback or stored separately.
 *
 * Uses lazy binding on first access for better performance.
 *
 * @template F - The decorated method's function type, preserved end-to-end.
 * @param _target - The class prototype (unused).
 * @param propertyKey - The name of the method.
 * @param descriptor - The property descriptor.
 * @returns The modified descriptor.
 * @throws {Error} When applied to a non-method property.
 * @example
 * ```typescript
 * class MyClass {
 *   private value = 42;
 *
 *   @bind
 *   getValue(): number {
 *     return this.value;
 *   }
 *
 *   @bind
 *   async fetchData(): Promise<Data> {
 *     return await this.api.getData();
 *   }
 * }
 *
 * const instance = new MyClass();
 *
 * // Works correctly when passed as callback
 * const getValue = instance.getValue;
 * console.log(getValue()); // 42
 *
 * // Works with async methods too
 * const fetchData = instance.fetchData;
 * const data = await fetchData();
 * ```
 */
export function bind<F extends (...args: never[]) => unknown>(
	_target: unknown,
	propertyKey: string | symbol,
	descriptor: TypedPropertyDescriptor<F>,
): TypedPropertyDescriptor<F> {
	const originalMethod = descriptor.value;

	if (!originalMethod) {
		throw new Error("@bind is applicable only on methods.");
	}

	// Use a getter to lazily bind the method on first access.
	return {
		configurable: true,
		enumerable: false,
		get(this: object): F {
			const boundMethod = originalMethod.bind(this) as F;

			// Define the bound method directly on the instance for subsequent accesses.
			Object.defineProperty(this, propertyKey, {
				value: boundMethod,
				configurable: true,
				writable: true,
			});

			return boundMethod;
		},
	};
}
