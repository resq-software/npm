/**
 * Copyright 2026 ResQ
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
 * @fileoverview Function form of `@bind` — `bindFn(method, context)` returns a
 * copy of `method` permanently bound to `context`.
 *
 * @module @resq-systems/decorators/bind/bind.fn
 */

import type { Method } from "../types.js";

/**
 * Creates a bound version of a method.
 *
 * Pure with respect to its inputs: returns a **new** function from
 * `Function.prototype.bind` and neither mutates `originalMethod` nor `context`.
 * The binding is permanent — a later `.call`/`.apply` cannot re-point `this`.
 *
 * @template D - The return type of the original method.
 * @template A - The argument types of the original method.
 * @param originalMethod - The method to bind.
 * @param context - The context (`this`) to bind to.
 * @returns The bound method.
 * @example
 * ```typescript
 * class Calculator {
 *   private multiplier = 10;
 *
 *   multiply(value: number): number {
 *     return value * this.multiplier;
 *   }
 * }
 *
 * const calc = new Calculator();
 *
 * // Create bound version
 * const boundMultiply = bindFn(calc.multiply.bind(calc), calc);
 * const result = boundMultiply(5); // 50
 *
 * // Can also be used with different context
 * const calc2 = new Calculator();
 * // calc2.multiplier = 20;
 * const boundToCalc2 = bindFn(calc.multiply, calc2);
 * ```
 */
export function bindFn<D = unknown, A extends unknown[] = unknown[]>(
	originalMethod: Method<D, A>,
	context: unknown,
): Method<D, A> {
	return originalMethod.bind(context);
}
