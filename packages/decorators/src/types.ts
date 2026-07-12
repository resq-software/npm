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
export type Method<D = unknown, A extends unknown[] = unknown[]> = (...args: A) => D;

/**
 * A generic decorator type for method decorators.
 *
 * Generic over the decorated method `F`, so the descriptor's method type is
 * **preserved** end-to-end (exactly the built-in `MethodDecorator` shape)
 * rather than erased to `Method<any>`. `(...args: never[]) => unknown` is the
 * correct "any function" bound (arguments are contravariant).
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
export type Decorator<T = unknown> = <F extends (...args: never[]) => unknown>(
	target: T,
	propertyName: PropertyKey,
	descriptor: TypedPropertyDescriptor<F>,
) => TypedPropertyDescriptor<F>;

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
export type AsyncMethod<D = unknown, A extends unknown[] = unknown[]> = (...args: A) => Promise<D>;

/**
 * A decorator type specifically for async methods.
 *
 * Generic over the decorated async method `F`, so the descriptor's method type
 * is **preserved** end-to-end rather than erased to `AsyncMethod<any>`.
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
export type AsyncDecorator<T = unknown> = <F extends (...args: never[]) => Promise<unknown>>(
	target: T,
	propertyName: PropertyKey,
	descriptor: TypedPropertyDescriptor<F>,
) => TypedPropertyDescriptor<F>;
