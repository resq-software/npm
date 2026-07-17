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
 * @fileoverview Public API for `@resq-systems/types` — a zero-dependency
 * advanced TypeScript toolkit shared across the ResQ Systems packages.
 *
 * @module @resq-systems/types
 *
 * - **Brands** ({@link Brand}, {@link brandRefiner}, {@link unsafeBrand}) —
 *   nominal types that make "validated" vs "raw" a compile-time distinction.
 * - **Numerics** ({@link PositiveInt}, {@link UnitInterval}, …) — bounded number
 *   brands with smart constructors.
 * - **Exhaustiveness** ({@link assertNever}) — turn an unhandled union member
 *   into a build error.
 * - **Object / collection / string** utilities — the recursive and
 *   template-literal helpers the platform does not ship.
 * - **Testing** ({@link Equal}, {@link Expect}) — a type-level assertion kit,
 *   also available at `@resq-systems/types/testing`.
 *
 * @example
 * ```ts
 * import { type Brand, brandRefiner, assertNever } from "@resq-systems/types";
 * ```
 */

export { assertNever, assertUnreachable } from "./assert.js";
export { brandRefiner, unsafeBrand } from "./brand.js";
export type { Brand, BrandRefiner, Opaque, Tag } from "./brand.js";
export type {
	Concat,
	Enumerate,
	Flatten,
	Head,
	Includes,
	IsEmpty,
	IsUnion,
	Last,
	LastInUnion,
	Length,
	NonEmptyArray,
	NumberRange,
	Push,
	ReadonlyNonEmptyArray,
	Reverse,
	Tail,
	TupleToUnion,
	UnionToIntersection,
	UnionToTuple,
	Unshift,
	Zip,
} from "./collection.js";
export {
	coerceNonNegativeInt,
	coercePositiveInt,
	coercePositiveMillis,
	coercePositiveNumber,
	coerceUnitInterval,
	isNonNegativeInt,
	isPositiveInt,
	isPositiveMillis,
	isPositiveNumber,
	isUnitInterval,
	toNonNegativeInt,
	toPositiveInt,
	toPositiveMillis,
	toPositiveNumber,
	toUnitInterval,
} from "./numeric.js";
export type {
	NonNegativeInt,
	PositiveInt,
	PositiveMillis,
	PositiveNumber,
	UnitInterval,
} from "./numeric.js";
export type {
	DeepMutable,
	DeepNonNullable,
	DeepPartial,
	DeepReadonly,
	DeepRequired,
	Entries,
	Merge,
	Mutable,
	OmitByType,
	PickByType,
	RemoveIndexSignature,
	RequireAtLeastOne,
	RequireExactlyOne,
	Simplify,
	ValueOf,
	Without,
	XOR,
} from "./object.js";
export type {
	EndsWith,
	Join,
	LiteralUnion,
	ParseInt,
	Replace,
	ReplaceAll,
	Split,
	StartsWith,
	Trim,
	TrimLeft,
	TrimRight,
} from "./string.js";
export type {
	Equal,
	Expect,
	ExpectFalse,
	ExpectTrue,
	IsAny,
	IsNever,
	IsUnknown,
	NotEqual,
	Verify,
} from "./testing.js";
export type {
	Awaitable,
	Expand,
	MakeUndefinedOptional,
	RecursivePartial,
	Required,
} from "./compat.js";
export type { JsonArray, JsonObject, JsonPrimitive, JsonValue } from "./json.js";
