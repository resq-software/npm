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
 * @fileoverview Shared method and decorator type aliases used across the package.
 * These keep the decorated member's signature preserved end-to-end rather than
 * erased to `any`, so `type-preservation.test.ts` stays green.
 *
 * @module @resq-systems/decorators/types
 */

/**
 * A generic method type used throughout decorators.
 *
 * Models any callable member the package wraps. `A` is a positional-argument
 * **tuple** (not a loose array), so wrapping preserves arity and per-position
 * types rather than collapsing them to `unknown[]`.
 *
 * @template D - The value the method returns (for async methods this is the
 *   `Promise`, not its resolved type — see {@link AsyncMethod}).
 * @template A - The positional argument tuple; `extends unknown[]` keeps it a
 *   tuple while allowing any shape.
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
 * correct "any function" bound (arguments are contravariant). The decorator
 * returns a descriptor of the *same* `F`, so callers see no signature change —
 * this is the legacy (`experimentalDecorators`) three-argument shape, not the
 * Stage-3 form.
 *
 * @template T - The class (or prototype) that owns the decorated method; the
 *   decorator receives it as `target` but is not required to use it.
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
 * The counterpart to {@link Method} for promise-returning members: `D` here is
 * the **resolved** value, so the method's actual return type is `Promise<D>`.
 *
 * @template D - The value the returned `Promise` resolves to (not the promise
 *   itself).
 * @template A - The positional argument tuple; `extends unknown[]` keeps it a
 *   tuple while allowing any shape.
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
 * is **preserved** end-to-end rather than erased to `AsyncMethod<any>`. The
 * `F extends (...args: never[]) => Promise<unknown>` bound restricts application
 * to promise-returning methods, and the same `F` is returned so the resolved
 * type survives.
 *
 * @template T - The class (or prototype) that owns the decorated async method;
 *   received as `target` but not required to be used.
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
