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
 * Configuration options for the @before decorator.
 *
 * @interface BeforeConfig
 * @template T - The type of the class containing the decorated method
 * @property {((...args: any[]) => any) | keyof T} func - The before function to execute, or a method name on the class
 * @property {boolean} [wait=false] - Whether to wait for the before function to complete before executing the method
 *
 * @example
 * ```typescript
 * // Using a function reference
 * const config1: BeforeConfig<MyClass> = {
 *   func: () => console.log('Before method'),
 *   wait: false
 * };

 * // Using a method name
 * const config2: BeforeConfig<MyClass> = {
 *   func: 'validate',
 *   wait: true
 * };
 * ```
 */
export interface BeforeConfig<T> {
  /** The before function to execute, or a method name on the class */
  func: ((...args: unknown[]) => unknown) | keyof T;
  /** Whether to wait for the before function to complete before executing the method */
  wait?: boolean;
}
