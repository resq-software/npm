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
 * @fileoverview `@execTime` decorator — measures and reports the wall-clock
 * execution time of a method. Useful for performance monitoring and debugging
 * slow operations; supports both legacy and Stage-3 decorator forms.
 *
 * @module @resq-systems/decorators/exec-time/exec-time
 *
 * @example
 * ```typescript
 * class DataService {
 *   @execTime()
 *   async fetchLargeDataset(): Promise<Data[]> {
 *     return await database.query('SELECT * FROM large_table');
 *   }
 *
 *   @execTime('Heavy computation')
 *   computePrimes(n: number): number[] {
 *     // ... computation
 *   }
 * }
 * ```
 */

import type { AsyncMethod, Method } from "../types.js";
import { execTimeFn } from "./exec-time.fn.js";
import type { ExactTimeReportable, ReportFunction } from "./exec-time.types.js";

/**
 * Decorator that measures and reports the execution time of methods.
 * Supports both legacy (TypeScript) and standard (Stage 3) decorator formats.
 *
 * Detects the protocol at decoration time: given a descriptor it rewrites
 * `descriptor.value` (legacy form); otherwise it treats the arguments as the
 * Stage-3 `(value, context)` pair and returns the wrapped method for a `method`
 * kind. See {@link execTimeFn} for the timing, async, and reporter-resolution
 * contract (including that rejected async methods are not reported).
 *
 * @template T - The type of the class containing the decorated method.
 * @param arg - Optional reporter function or label string.
 * @returns The decorator function.
 * @throws {Error} At decoration time, with message
 *   `"@execTime is applicable only on methods."`, when the legacy descriptor has
 *   no method value or the Stage-3 context's `kind` is not `"method"`.
 * @example
 * ```typescript
 * class PerformanceMonitor {
 *   // Uses default console reporter
 *   @execTime()
 *   processData(data: any[]): void {
 *     // Processing...
 *   }
 *
 *   // Uses custom label
 *   @execTime('Database Query')
 *   async fetchUsers(): Promise<User[]> {
 *     return db.users.findAll();
 *   }
 *
 *   // Uses custom reporter function
 *   @execTime((data) => {
 *     metrics.histogram('method_duration', data.execTime);
 *     console.log(`${data.execTime}ms: ${data.args.join(', ')}`);
 *   })
 *   heavyCalculation(input: number): number {
 *     return input ** 2;
 *   }
 * }
 * ```
 */
export function execTime<T = unknown>(arg?: ReportFunction | string): ExactTimeReportable<T> {
	return (
		targetOrValue: T | Method | AsyncMethod,
		propertyNameOrContext: keyof T | ClassMethodDecoratorContext,
		descriptor?: TypedPropertyDescriptor<Method | AsyncMethod>,
	) => {
		// Legacy (experimentalDecorators) form: (target, propertyName, descriptor)
		if (descriptor) {
			if (descriptor.value) {
				descriptor.value = execTimeFn(descriptor.value, arg);
				return descriptor;
			}
			throw new Error("@execTime is applicable only on methods.");
		}

		// Standard (Stage 3) form: (value, context)
		const method = targetOrValue as Method | AsyncMethod;
		const context = propertyNameOrContext as ClassMethodDecoratorContext;

		if (context.kind === "method") {
			return execTimeFn(method, arg);
		}

		throw new Error("@execTime is applicable only on methods.");
	};
}
