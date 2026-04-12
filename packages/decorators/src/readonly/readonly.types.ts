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
 * Type for decorators that make methods read-only.
 *
 * @template T - The type of the class containing the decorated method
 *
 * @param {T} target - The class prototype
 * @param {keyof T} propertyName - The name of the method being decorated
 * @param {PropertyDescriptor} descriptor - The property descriptor
 * @returns {PropertyDescriptor} The modified descriptor with writable set to false
 *
 * @example
 * ```typescript
 * type ReadonlyMethod = Readonlyable<MyClass>;
 *
 * const decorator: ReadonlyMethod = (target, key, descriptor) => {
 *   descriptor.writable = false;
 *   return descriptor;
 * };
 * ```
 */
export type Readonlyable<T = any> = (
  target: T,
  propertyName: keyof T,
  descriptor: PropertyDescriptor,
) => PropertyDescriptor;
