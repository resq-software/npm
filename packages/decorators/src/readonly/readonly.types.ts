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
 * @fileoverview Types for the `@readonly` method decorator: the decorator
 * signature that preserves the decorated method's type end-to-end.
 *
 * @module @resq-systems/decorators/readonly/readonly.types
 */

/**
 * Signature for decorators that make a method read-only.
 *
 * Generic over the decorated method `F`, so the descriptor's type is preserved
 * end-to-end rather than erased to `Method<any>` — the shape of the built-in
 * (itself generic) `MethodDecorator`.
 *
 * @template T - The class type that owns the decorated method.
 * @param target - The class prototype.
 * @param propertyName - The name of the method being decorated.
 * @param descriptor - The property descriptor.
 * @returns The modified descriptor with `writable` set to `false`.
 * @example
 * ```ts
 * type ReadonlyMethod = Readonlyable<MyClass>;
 *
 * const decorator: ReadonlyMethod = (_target, _key, descriptor) => ({
 *   ...descriptor,
 *   writable: false,
 * });
 * ```
 */
export type Readonlyable<T = unknown> = <F extends (...args: never[]) => unknown>(
	target: T,
	propertyName: PropertyKey,
	descriptor: TypedPropertyDescriptor<F>,
) => TypedPropertyDescriptor<F>;
