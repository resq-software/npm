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
 * @fileoverview Backwards-compatibility aliases for the deep-object utilities.
 *
 * @module @resq-systems/types/compat
 *
 * Thin re-namings ({@link RecursivePartial}, {@link Expand}, …) that map legacy
 * or third-party utility-type names onto the canonical helpers in the object
 * module, so packages migrating onto this toolkit keep compiling without a
 * rename sweep.
 */

import type { DeepPartial, Simplify } from "./object.js";

/**
 * Legacy alias of {@link DeepPartial} — recursively marks every property
 * optional. Kept only so code using the `RecursivePartial` name from other
 * toolkits compiles unchanged; new code should import {@link DeepPartial}.
 *
 * @typeParam T - The object type to make deeply optional.
 */
export type RecursivePartial<T> = DeepPartial<T>;

/**
 * Legacy alias of {@link Simplify} — flattens a type into a single object
 * literal so IDE tooltips and error messages show the resolved shape instead of
 * a chain of intersections. Purely cosmetic; assignability is unchanged.
 *
 * @typeParam T - The type to expand for display.
 */
export type Expand<T> = Simplify<T>;

/**
 * A value that may be delivered synchronously or asynchronously: `T` itself, or
 * anything `await`-able that resolves to `T`. Use it to type a parameter or
 * return that a caller is free to make either sync or `async` — `await`-ing an
 * `Awaitable<T>` always yields `T`.
 *
 * @typeParam T - The resolved value type.
 */
export type Awaitable<T> = T | PromiseLike<T>;

/**
 * Make the keys `K` of `T` required while leaving the rest untouched — the
 * partial-application counterpart of the global `Required`, which has no
 * key-selecting overload.
 *
 * This intentionally **shadows** the global `Required<T>` within any module that
 * imports it: the second `K` parameter is required, so a bare `Required<T>` will
 * no longer type-check where this alias is in scope. Import it deliberately.
 *
 * @typeParam T - The source object type.
 * @typeParam K - The subset of `T`'s keys to force required.
 *
 * @example
 * ```ts
 * type Config = { host?: string; port?: number; tls?: boolean };
 * type Connectable = Required<Config, "host" | "port">;
 * //   ^? { host: string; port: number; tls?: boolean }
 * ```
 */
export type Required<T, K extends keyof T> = Simplify<Omit<T, K> & { [P in K]-?: T[P] }>;

/**
 * Rewrite `T` so that any property whose type includes `undefined` becomes
 * genuinely **optional** (`?`), while properties that cannot be `undefined` stay
 * required. Bridges the gap between "value may be `undefined`" and "key may be
 * omitted", which TypeScript otherwise treats as distinct.
 *
 * The `extends object` bound is required because the mapping keys over `T`; pass
 * an object shape, not a primitive or union.
 *
 * @typeParam T - The object type to relax; must be an object shape.
 *
 * @example
 * ```ts
 * type Raw = { id: string; note: string | undefined };
 * type Relaxed = MakeUndefinedOptional<Raw>;
 * //   ^? { id: string; note?: string | undefined }
 * ```
 */
export type MakeUndefinedOptional<T extends object> = Simplify<
	{
		[K in keyof T as undefined extends T[K] ? never : K]: T[K];
	} & {
		[K in keyof T as undefined extends T[K] ? K : never]?: T[K];
	}
>;
