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
 * Makes all properties in a type and all nested properties optional recursively.
 */
export type RecursivePartial<T> = {
	[P in keyof T]?: RecursivePartial<T[P]>;
};

/**
 * Expands a type definition to show its full structure in IDE tooltips and error messages.
 */
export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

/**
 * A value that may be returned synchronously or as a `Promise` / `PromiseLike`.
 */
export type Awaitable<T> = T | PromiseLike<T>;

/**
 * Makes specified keys in a type required while keeping all other properties as-is.
 */
export type Required<T, K extends keyof T> = Expand<Omit<T, K> & { [P in K]-?: T[P] }>;

/**
 * Automatically makes properties optional if their type includes `undefined`.
 */
export type MakeUndefinedOptional<T extends object> = Expand<
	{
		[P in { [K in keyof T]: undefined extends T[K] ? never : K }[keyof T]]: T[P];
	} & {
		[P in { [K in keyof T]: undefined extends T[K] ? K : never }[keyof T]]?: T[P];
	}
>;
