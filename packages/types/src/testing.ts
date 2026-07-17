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
 * @fileoverview Type-level test kit.
 *
 * @module @resq-systems/types/testing
 *
 * The same primitives the type-challenges project uses to assert that a type
 * resolves to what you expect. Exported so consumers can lock their own
 * branded types and inference against regressions in a `*.test-d.ts` file:
 *
 * @example
 * ```ts
 * import type { Equal, Expect } from "@resq-systems/types/testing";
 *
 * type _cases = [
 *   Expect<Equal<Awaited<Promise<number>>, number>>,
 *   Expect<Equal<ReturnType<() => string>, string>>,
 * ];
 * ```
 *
 * A failing assertion is a **compile error** on the `Expect<...>` line, so these
 * "tests" run wherever the file is type-checked.
 */

//#region Type-level test kit

/**
 * Strict type equality. `Equal<X, Y>` is `true` only when `X` and `Y` are
 * mutually assignable *and* identical — it distinguishes `any` from `unknown`,
 * `{ a: 1 }` from `{ readonly a: 1 }`, and other pairs that a plain
 * `X extends Y ? Y extends X` check conflates.
 */
export type Equal<X, Y> =
	(<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

/** The negation of {@link Equal}. */
export type NotEqual<X, Y> = Equal<X, Y> extends true ? false : true;

/** Assert that a type is exactly `true`. Fails to compile otherwise. */
export type Expect<T extends true> = T;

/** Assert that a type is exactly `true` (alias of {@link Expect}). */
export type ExpectTrue<T extends true> = T;

/** Assert that a type is exactly `false`. Fails to compile otherwise. */
export type ExpectFalse<T extends false> = T;

/**
 * Assert that `U` is assignable to `T` (a one-way subtype/constraint check) and
 * pass `U` through. Unlike {@link Equal}, which demands exact identity, this
 * only checks assignability — use it to lock "X still satisfies contract Y":
 *
 * @example
 * ```ts
 * type _ok = Verify<{ id: string }, { id: string; extra: number }>; // ✓
 * type _no = Verify<{ id: string }, { id: number }>;                 // ✗ compile error
 * ```
 */
export type Verify<T, U extends T> = U;

/** `true` only for the `any` type. */
export type IsAny<T> = 0 extends 1 & T ? true : false;

/** `true` only for the `never` type. */
export type IsNever<T> = [T] extends [never] ? true : false;

/** `true` only for the `unknown` type (and not for `any`). */
export type IsUnknown<T> = IsAny<T> extends true ? false : unknown extends T ? true : false;

//#endregion
