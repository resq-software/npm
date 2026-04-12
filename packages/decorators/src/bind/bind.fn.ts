/**
 * @fileoverview Bind function implementation - creates a bound version of a method.
 *
 * @module @resq/typescript/decorators/bind.fn
 *
 * @copyright Copyright (c) 2026 ResQ
 * @license MIT
 */

import type { Method } from '../types.js';

/**
 * Creates a bound version of a method.
 *
 * @template D - The return type of the original method
 * @template A - The argument types of the original method
 * @param {Method<D, A>} originalMethod - The method to bind
 * @param {unknown} context - The context (`this`) to bind to
 * @returns {Method<D, A>} The bound method
 *
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
