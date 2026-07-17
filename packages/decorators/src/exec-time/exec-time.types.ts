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
 * @fileoverview Types for the `@execTime` decorator — the reporter signature
 * (`ReportFunction`), the report payload (`ExactTimeReportData`), and the
 * dual legacy/Stage-3 decorator shape (`ExactTimeReportable`).
 *
 * @module @resq-systems/decorators/exec-time/exec-time.types
 */

import type { AsyncMethod, Method } from "../types.js";

/**
 * Function type for reporting execution time data.
 *
 * Invoked once per timed call with the measured {@link ExactTimeReportData}. Any
 * returned value is ignored (the signature allows non-`void` only for
 * convenience), and it runs for its side effect — logging, metrics — after the
 * method settles.
 *
 * @param data - The execution time report data.
 * @returns Any value (typically `void`); the caller discards it.
 * @example
 * ```typescript
 * const customReporter: ReportFunction = (data) => {
 *   console.log(`Method took ${data.execTime}ms with args:`, data.args);
 *   metrics.timing('method.duration', data.execTime);
 * };
 * ```
 */
export type ReportFunction = (data: ExactTimeReportData) => unknown;

/**
 * Data structure containing execution time information.
 *
 * A snapshot handed to a {@link ReportFunction} after one invocation. For an
 * async method the report is taken after the promise resolves, so {@link result}
 * is the fulfilled value and {@link execTime} spans until resolution.
 *
 * @example
 * ```typescript
 * const reportData: ExactTimeReportData = {
 *   args: [42, 'test'],
 *   result: 'success',
 *   execTime: 150
 * };
 * ```
 */
export interface ExactTimeReportData {
	/** The exact positional arguments the timed method was called with. */
	args: unknown[];
	/** The method's return value — the resolved value for an async method. */
	result: unknown;
	/**
	 * Elapsed wall-clock time in **milliseconds** (`Date.now` deltas, integer ms
	 * resolution), measured from just before the call to just after it settles.
	 */
	execTime: number;
}

/**
 * Type for methods that can have their execution time reported.
 *
 * The **dual-protocol** shape of `@execTime`: the same callable must satisfy both
 * the legacy (`experimentalDecorators`) three-argument method decorator and the
 * Stage-3 `(value, context)` decorator. The two protocols disagree on the return
 * type, which is why it is deliberately `any` (see the inline `biome-ignore`) —
 * any concrete union would break one caller.
 *
 * @template T - The class owning the method; `propertyName` is a `keyof T` in the
 *   legacy form.
 * @param target - The class prototype.
 * @param propertyName - The name of the method.
 * @param descriptor - The property descriptor.
 * @returns The modified descriptor.
 */
export type ExactTimeReportable<T> = (
	target: T,
	propertyName: keyof T,
	descriptor: TypedPropertyDescriptor<Method | AsyncMethod>,
	// biome-ignore lint/suspicious/noExplicitAny: `execTime` is a dual legacy + Stage-3 decorator factory. The return must stay `any` so `@execTime` type-checks both as a legacy method decorator (returns a descriptor or void) and as a Stage-3 decorator (returns a replacement method). Any concrete union breaks one of the two protocols.
) => any;
