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
 * @fileoverview Type for the `@delegate` decorator — `Delegatable` describes a
 * method decorator that transforms an async method into one that deduplicates
 * concurrent calls with the same key.
 *
 * @module @resq-systems/decorators/delegate/delegate.types
 */

import type { AsyncMethod } from "../types.js";

/**
 * Type for the @delegate decorator function.
 * Transforms an async method into one that deduplicates concurrent calls.
 *
 * @template T - The type of the class containing the decorated method.
 * @template D - The return type of the decorated async method.
 * @param target - The class prototype.
 * @param propertyName - The name of the method being decorated.
 * @param descriptor - The property descriptor.
 * @returns The modified descriptor.
 * @example
 * ```typescript
 * type MyDelegatable = Delegatable<MyService, User>;
 *
 * // Usage in decorator factory
 * const decorator: MyDelegatable = delegate((id) => id);
 * ```
 */
export type Delegatable<T, D> = (
	target: T,
	propertyName: keyof T,
	descriptor: TypedPropertyDescriptor<AsyncMethod<D>>,
) => TypedPropertyDescriptor<AsyncMethod<D>>;
