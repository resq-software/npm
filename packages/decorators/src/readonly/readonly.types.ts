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
 * Type for decorators that make methods read-only.
 *
 * @template T - The type of the class containing the decorated method
 *
 * @param {T} target - The class prototype
 * @param {keyof T} propertyName - The name of the method being decorated
 * @param {PropertyDescriptor} descriptor - The property descriptor
 * @returns {PropertyDescriptor} The modified descriptor with writable set to false
 *
 * The decorator is generic over the decorated method `F`, so the descriptor's
 * type is **preserved** end-to-end rather than erased to `Method<any>` — this is
 * exactly the shape of the built-in `MethodDecorator` (itself generic).
 *
 * @example
 * ```typescript
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
