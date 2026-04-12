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

import type { AsyncMethod } from '../types.js';
/*
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
 * @fileoverview Type definitions for the Delegate decorator.
 * Provides the Delegatable type for method decorators that deduplicate async calls.
 *
 * @module @resq/typescript/decorators/delegate/types
 *
 * @copyright Copyright (c) 2026 ResQ
 * @license MIT
 */

/**
 * Type for the @delegate decorator function.
 * Transforms an async method into one that deduplicates concurrent calls.
 *
 * @template T - The type of the class containing the decorated method
 * @template D - The return type of the decorated async method
 *
 * @param {T} target - The class prototype
 * @param {keyof T} propertyName - The name of the method being decorated
 * @param {TypedPropertyDescriptor<AsyncMethod<D>>} descriptor - The property descriptor
 * @returns {TypedPropertyDescriptor<AsyncMethod<D>>} The modified descriptor
 *
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
