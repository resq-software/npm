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

import { isPromise, logger } from '../_utils.js';
import type { AsyncMethod, Method } from '../types.js';
import type { ExactTimeReportData, ReportFunction } from './exec-time.types.js';

/**
 * Default reporter function that logs execution time using the logger.
 *
 * @param {ExactTimeReportData} data - The execution data
 * @returns {void}
 */
const reporter: ReportFunction = (data: ExactTimeReportData): void => {
  logger.info(`Execution time: ${data.execTime}ms`);
};

/**
 * Wraps a method to measure and report its execution time.
 * Handles both synchronous and asynchronous methods.
 *
 * @template D - The return type of the original method
 * @template A - The argument types of the original method
 * @param {Method<D, A> | AsyncMethod<D, A>} originalMethod - The method to wrap
 * @param {ReportFunction | string} [arg] - Optional reporter function or label
 * @returns {AsyncMethod<void, A>} The wrapped method
 *
 * @example
 * ```typescript
 * class Calculator {
 *   fibonacci(n: number): number {
 *     if (n <= 1) return n;
 *     return this.fibonacci(n - 1) + this.fibonacci(n - 2);
 *   }
 * }
 *
 * const calc = new Calculator();
 *
 * // Wrap with default reporter
 * const timed = execTimeFn(calc.fibonacci.bind(calc));
 * await timed(40); // Logs: "Execution time: 450ms"
 *
 * // Wrap with custom label
 * const labeled = execTimeFn(
 *   calc.fibonacci.bind(calc),
 *   'Fibonacci calculation'
 * );
 * await labeled(40); // Logs: "Fibonacci calculation execution time: 450ms"
 *
 * // Wrap with custom reporter
 * const custom = execTimeFn(
 *   calc.fibonacci.bind(calc),
 *   (data) => {
 *     console.log(`Took ${data.execTime}ms for n=${data.args[0]}`);
 *   }
 * );
 * await custom(40); // Logs: "Took 450ms for n=40"
 * ```
 */
export function execTimeFn<D = any, A extends any[] = any[]>(
  originalMethod: Method<D, A> | AsyncMethod<D, A>,
  arg?: ReportFunction | string,
): AsyncMethod<void, A> {
  const input: ReportFunction | string = arg ?? reporter;

  return async function (this: any, ...args: A): Promise<void> {
    let repFunc: ReportFunction;

    if (typeof input === 'string') {
      if (typeof this[input] === 'function') {
        repFunc = this[input].bind(this);
      } else {
        repFunc = (data) => {
          logger.info(`${input} execution time`, { duration: `${data.execTime}ms` });
        };
      }
    } else {
      repFunc = input;
    }

    const start = Date.now();
    let result = (originalMethod as Function).apply(this, args);

    if (isPromise(result)) {
      result = await result;
    }

    repFunc({
      args,
      result,
      execTime: Date.now() - start,
    });
  };
}
