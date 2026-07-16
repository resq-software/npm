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

import type { DeepPartial, Simplify } from "./object.js";

/**
 * Makes all properties in a type and all nested properties optional recursively.
 */
export type RecursivePartial<T> = DeepPartial<T>;

/**
 * Expands a type definition to show its full structure in IDE tooltips and error messages.
 */
export type Expand<T> = Simplify<T>;

/**
 * A value that may be returned synchronously or as a `Promise` / `PromiseLike`.
 */
export type Awaitable<T> = T | PromiseLike<T>;

/**
 * Makes specified keys in a type required while keeping all other properties as-is.
 */
export type Required<T, K extends keyof T> = Simplify<Omit<T, K> & { [P in K]-?: T[P] }>;

/**
 * Automatically makes properties optional if their type includes `undefined`.
 */
export type MakeUndefinedOptional<T extends object> = Simplify<
	{
		[K in keyof T as undefined extends T[K] ? never : K]: T[K];
	} & {
		[K in keyof T as undefined extends T[K] ? K : never]?: T[K];
	}
>;
