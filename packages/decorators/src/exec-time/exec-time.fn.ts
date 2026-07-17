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
 * @fileoverview Function form of `@execTime` — `execTimeFn(method, arg?)` wraps a
 * method to measure its wall-clock duration and hand it to a reporter, preserving
 * synchronous-versus-async behavior so callers still receive the original value.
 *
 * @module @resq-systems/decorators/exec-time/exec-time.fn
 */

import { isFunction, isPromise, logger } from "../_utils.js";
import type { AsyncMethod, Method } from "../types.js";
import type { ExactTimeReportData, ReportFunction } from "./exec-time.types.js";

/**
 * Default reporter function that logs execution time using the logger.
 *
 * @param data - The execution data.
 */
const reporter: ReportFunction = (data: ExactTimeReportData): void => {
	logger.info(`Execution time: ${data.execTime}ms`);
};

/**
 * Wraps a method to measure and report its execution time.
 * Handles both synchronous and asynchronous methods.
 *
 * @template D - The return type of the original method.
 * @template A - The argument types of the original method.
 * @param originalMethod - The method to wrap.
 * @param arg - Optional reporter function or label.
 * @returns The wrapped method. Preserves the original return value and stays
 *   synchronous for synchronous methods — it only awaits when the wrapped method
 *   itself returns a promise.
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
export function execTimeFn<D, A extends unknown[] = unknown[]>(
	originalMethod: AsyncMethod<D, A>,
	arg?: ReportFunction | string,
): AsyncMethod<D, A>;
export function execTimeFn<D, A extends unknown[] = unknown[]>(
	originalMethod: Method<D, A>,
	arg?: ReportFunction | string,
): Method<D, A>;
export function execTimeFn<D = unknown, A extends unknown[] = unknown[]>(
	originalMethod: Method<D, A> | AsyncMethod<D, A>,
	arg?: ReportFunction | string,
): Method<D | Promise<D>, A> {
	const input: ReportFunction | string = arg ?? reporter;

	return function (this: unknown, ...args: A): D | Promise<D> {
		const repFunc = resolveReporter(this, input);
		const start = Date.now();
		const result: D | Promise<D> = (originalMethod as (...methodArgs: A) => D | Promise<D>).apply(
			this,
			args,
		);

		// Preserve async-ness: for a promise-returning method, report once it
		// settles and forward the resolved value, so callers still receive it.
		if (isPromise(result)) {
			const pending = result as Promise<D>;
			return pending.then((resolved) => {
				repFunc({ args, result: resolved, execTime: Date.now() - start });
				return resolved;
			});
		}

		// Synchronous method: report immediately and return the value unchanged.
		repFunc({ args, result, execTime: Date.now() - start });
		return result;
	};
}

/**
 * Resolve the reporter for a single invocation. When `input` names a method on
 * the instance it is bound to that instance; otherwise a label-prefixed logger
 * reporter is used. Extracted so {@link execTimeFn}'s wrapper stays focused on
 * timing and value forwarding.
 */
function resolveReporter(context: unknown, input: ReportFunction | string): ReportFunction {
	if (typeof input !== "string") {
		return input;
	}
	// `input` may name a reporter method on the instance; resolve it via a
	// narrow `Record` view instead of an `any`-typed `this`. Guard `context`:
	// a decorated method detached from its instance is invoked with `this`
	// undefined, and indexing that would throw.
	const named = context != null ? (context as Record<PropertyKey, unknown>)[input] : undefined;
	if (isFunction(named)) {
		return named.bind(context) as ReportFunction;
	}
	return (data) => {
		logger.info(`${input} execution time`, { duration: `${data.execTime}ms` });
	};
}
