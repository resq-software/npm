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
 * A generic method type used throughout decorators.
 *
 * @template D - The return type of the method
 * @template A - The argument types of the method (as an array)
 *
 * @example
 * ```typescript
 * const myMethod: Method<number, [string, boolean]> = (name, active) => {
 *   return active ? name.length : 0;
 * };
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Method<D = any, A extends any[] = any[]> = (...args: A) => D;

/**
 * A generic decorator type for method decorators.
 *
 * @template T - The class type containing the method
 *
 * @example
 * ```typescript
 * const myDecorator: Decorator<MyClass> = (target, propertyName, descriptor) => {
 *   // Decorator implementation
 *   return descriptor;
 * };
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Decorator<T = any> = (
  target: T,
  propertyName: keyof T,
  descriptor: TypedPropertyDescriptor<Method<any>>,
) => TypedPropertyDescriptor<Method<any>>;

/**
 * A generic async method type.
 *
 * @template D - The resolved type of the Promise
 * @template A - The argument types of the method (as an array)
 *
 * @example
 * ```typescript
 * const fetchData: AsyncMethod<User, [string]> = async (userId) => {
 *   return await api.getUser(userId);
 * };
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AsyncMethod<D = any, A extends any[] = any[]> = (...args: A) => Promise<D>;

/**
 * A decorator type specifically for async methods.
 *
 * @template T - The class type containing the method
 *
 * @example
 * ```typescript
 * const asyncDecorator: AsyncDecorator<MyClass> = (target, propertyName, descriptor) => {
 *   const original = descriptor.value!;
 *   descriptor.value = async function(...args) {
 *     console.log('Before async call');
 *     const result = await original.apply(this, args);
 *     console.log('After async call');
 *     return result;
 *   };
 *   return descriptor;
 * };
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AsyncDecorator<T = any> = (
  target: T,
  propertyName: keyof T,
  descriptor: TypedPropertyDescriptor<AsyncMethod<any>>,
) => TypedPropertyDescriptor<AsyncMethod<any>>;
