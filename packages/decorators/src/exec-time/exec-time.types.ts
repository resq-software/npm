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
 * Function type for reporting execution time data.
 *
 * @param {ExactTimeReportData} data - The execution time report data
 * @returns {any} Can return any value (typically void)
 *
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
 * @interface ExactTimeReportData
 * @property {any[]} args - The arguments passed to the method
 * @property {any} result - The return value of the method
 * @property {number} execTime - The execution time in milliseconds
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
  /** The arguments passed to the method */
  args: unknown[];
  /** The return value of the method */
  result: unknown;
  /** The execution time in milliseconds */
  execTime: number;
}

/**
 * Type for methods that can have their execution time reported.
 *
 * @template T - The type of the class containing the method
 *
 * @param {T} target - The class prototype
 * @param {keyof T} propertyName - The name of the method
 * @param {TypedPropertyDescriptor<any>} descriptor - The property descriptor
 * @returns {any} The modified descriptor
 */
export type ExactTimeReportable<T> = (
  target: T,
  propertyName: keyof T,
  descriptor: TypedPropertyDescriptor<any>,
) => any;
