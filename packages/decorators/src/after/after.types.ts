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
 * Function signature for after hooks.
 *
 * @template D - The return type of the decorated method
 * @param {AfterParams<D>} [x] - Parameters containing args and response
 * @returns {void}
 *
 * @example
 * ```typescript
 * const afterHook: AfterFunc<string> = ({ args, response }) => {
 *   console.log(`Method returned: ${response}`);
 * };
 * ```
 */
export type AfterFunc<D> = (x?: AfterParams<D>) => void;

/**
 * Configuration options for the @after decorator.
 *
 * @interface AfterConfig
 * @template T - The type of the class containing the decorated method
 * @template D - The return type of the decorated method
 * @property {AfterFunc<D> | keyof T} func - The after function to execute, or a method name on the class
 * @property {boolean} [wait=false] - Whether to wait for the after function to complete before returning
 *
 * @example
 * ```typescript
 * // Using a function reference
 * const config1: AfterConfig<MyClass, string> = {
 *   func: ({ args, response }) => console.log(response),
 *   wait: false
 * };

 * // Using a method name
 * const config2: AfterConfig<MyClass, string> = {
 *   func: 'logResult', // Calls this.logResult()
 *   wait: true
 * };
 * ```
 */
export interface AfterConfig<T = any, D = any> {
  /** The after function to execute, or a method name on the class */
  func: AfterFunc<D> | keyof T;
  /** Whether to wait for the after function to complete before returning */
  wait?: boolean;
}

/**
 * Parameters passed to the after hook function.
 *
 * @interface AfterParams
 * @template D - The return type of the decorated method
 * @property {any[]} args - The arguments passed to the decorated method
 * @property {D} response - The return value of the decorated method
 *
 * @example
 * ```typescript
 * const params: AfterParams<number> = {
 *   args: ['input', 42],
 *   response: 100
 * };
 * ```
 */
export interface AfterParams<D = any> {
  /** The arguments passed to the decorated method */
  args: unknown[];
  /** The return value of the decorated method */
  response: D;
}
