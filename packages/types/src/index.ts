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
 * - **Brands** ({@link Brand}, {@link brandRefiner}, {@link unsafeBrand},
 *   {@link refineAll}) — nominal types that make "validated" vs "raw" a
 *   compile-time distinction, plus {@link BrandsOf} / {@link Unbrand} /
 *   {@link HasBrand} to take one apart again. Also available at
 *   `@resq-systems/types/brand`.
 * - **Accumulating brand validation** ({@link brandParser}, {@link BrandError})
 *   — one refiner built from N labelled constraints that reports **every**
 *   failure rather than the first. Also available at
 *   `@resq-systems/types/brand-parse`.
 * - **Numerics** ({@link PositiveInt}, {@link UnitInterval}, …) — bounded number
 *   brands with smart constructors.
 * - **Exhaustiveness** ({@link assertNever}) — turn an unhandled union member
 *   into a build error.
 * - **Object / collection / string** utilities — the recursive and
 *   template-literal helpers the platform does not ship.
 * - **Guards** ({@link isString}, {@link isPlainObject}, {@link isNonNullish}, …)
 *   — the leaf `unknown → T` checks, written and tested once, instead of a
 *   `typeof` re-derived slightly differently in every file that needs it. Also
 *   available at `@resq-systems/types/guards`.
 * - **Predicates** ({@link and}, {@link nand}, {@link allOf}, {@link everyOf},
 *   {@link structOf}) — the guard algebra. A hand-written `value is T` is a
 *   promise the compiler **never checks**; compose one out of small obvious
 *   guards and let the combinators do the type arithmetic. Six of the
 *   combinators ({@link and}, {@link or}, {@link nand}, {@link eqv},
 *   {@link implies}, {@link compose}) accept both a data-first and a data-last
 *   call form, so they can be dropped straight into a `pipe`. Also available at
 *   `@resq-systems/types/predicate`.
 * - **Narrowing** ({@link ensure}, {@link parse}, {@link assertBy}) — turn a
 *   guard into a value or a throw. The value-returning forms are the primary API
 *   because an `asserts` signature stops narrowing in **consumer** code unless
 *   every binding in the call chain is annotated. Also available at
 *   `@resq-systems/types/narrow`.
 * - **Tagged unions** ({@link matchTag}, {@link byTag}, {@link TaggedUnionOf}) —
 *   dispatch on a discriminant where a forgotten arm is a **compile error**, not
 *   an `undefined` at 3am. Also available at `@resq-systems/types/union`.
 * - **Boolean type operators** ({@link If}, {@link BoolEqv}, {@link IsEqual},
 *   {@link IsTuple}) — the conditional-type primitives the rest of this package
 *   is built from. Also available at `@resq-systems/types/logic`.
 * - **Testing** ({@link Equal}, {@link Expect}) — a type-level assertion kit,
 *   also available at `@resq-systems/types/testing`.
 *
 * **Subpath-only modules.** Three modules are reachable **only** through their
 * own entry point and are deliberately absent from this barrel:
 *
 * - `@resq-systems/types/equivalence` — binary equivalence relations
 *   (`Equivalence`, `eqStrict`, `eqSameValue`, `eqNumber`, `combine`, …).
 * - `@resq-systems/types/order` — total orders and the bridge into the guard
 *   algebra (`Order`, `Ordering`, `orderNumber`, `isLessThan`, `clamp`, …).
 * - `@resq-systems/types/filter` — the typed case split, a narrowing function
 *   whose rejection branch carries a type (`Filter`, `fromPredicate`, …).
 *
 * That is not an oversight. Each of the three exports `make`, and between them
 * they re-export `mapInput`, `tupleOf`, `arrayOf`, `structOf`, `recordOf`, `or`,
 * and `compose` — names this barrel already carries from `predicate.js` with
 * different meanings. One name per concept per module is the rule; a barrel that
 * had to rename half of them would break it. Import them from their subpath.
 *
 * **Deprecated migration shims are also subpath-only.** `assert` and
 * `assertExists` (`@resq-systems/types/narrow`) and `hasOwnProperty`
 * (`@resq-systems/types/guards`) exist to let `@resq-systems/helpers` re-export
 * its historical names unchanged. They are kept out of this barrel on purpose:
 * each is the odd one out in its own family — the two assertions throw a plain
 * `Error` instead of a {@link NarrowError}, and `hasOwnProperty` is the only
 * guard that returns plain `boolean` instead of narrowing — and sorting first in
 * autocomplete next to the correct {@link invariant}, {@link ensureDefined} and
 * {@link hasOwn} is how a consumer picks the wrong one. Keeping them off the
 * barrel also keeps them out of the package's frozen public surface.
 *
 * **Example** (Reaching every module through the one barrel specifier)
 *
 * ```ts doctest
 * import { ensure, isNonEmptyString, matchTag } from "@resq-systems/types";
 *
 * const raw: unknown = "ada";
 * const name = ensure(raw, isNonEmptyString);
 *
 * name.length; // => 3
 *
 * type Event = { kind: "click"; x: number } | { kind: "key"; code: string };
 *
 * const describe = (event: Event): string =>
 *   matchTag(event, "kind", {
 *     click: (member) => `click@${member.x}`,
 *     key: (member) => `key:${member.code}`,
 *   });
 *
 * describe({ kind: "key", code: "Escape" }); // => "key:Escape"
 * ```
 */

export { assertNever, assertUnreachable } from "./assert.js";
export { brandRefiner, refineAll, unsafeBrand } from "./brand.js";
export type { Brand, BrandRefiner, BrandsOf, HasBrand, Opaque, Tag, Unbrand } from "./brand.js";
export { BrandError, brandParser } from "./brand-parse.js";
export type { BrandParser } from "./brand-parse.js";
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
	NoExcessProperties,
	OmitByType,
	OptionalKeys,
	PickByType,
	RemoveIndexSignature,
	RequireAtLeastOne,
	RequireExactlyOne,
	RequiredKeys,
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
export {
	hasKey,
	hasKeys,
	hasOwn,
	isArray,
	isArrayBuffer,
	isArrayBufferView,
	isArrayLike,
	isAsyncIterable,
	isBigInt,
	isBlankString,
	isBoolean,
	isConstructor,
	isDate,
	isDefined,
	isError,
	isFiniteNumber,
	isFunction,
	isInRange,
	isInstanceOf,
	isInteger,
	isIterable,
	isJsonArray,
	isJsonObject,
	isJsonPrimitive,
	isJsonValue,
	isKeyOf,
	isMap,
	isNonEmptyArray,
	isNonEmptyString,
	isNonNull,
	isNonNullish,
	isNull,
	isNullish,
	isNumber,
	isNumericString,
	isObject,
	isObjectLike,
	isOneOf,
	isPlainObject,
	isPrimitive,
	isPromise,
	isPropertyKey,
	isRegExp,
	isSafeInteger,
	isSet,
	isString,
	isSymbol,
	isThenable,
	isTypedArray,
	isURL,
	isUint8Array,
	isUndefined,
	isValidDate,
} from "./guards.js";
export type { NonEmptyString } from "./guards.js";
export type {
	AllTrue,
	And,
	AnyTrue,
	BoolEqv,
	BoolXor,
	Extends,
	ExtendsDistributive,
	If,
	Implies,
	IsBooleanLiteral,
	IsEmptyObject,
	IsEqual,
	IsLiteral,
	IsMutuallyAssignable,
	IsNullable,
	IsNumericLiteral,
	IsOptionalKey,
	IsPlainObject,
	IsReadonlyKey,
	IsStringLiteral,
	IsSubtypeOf,
	IsSupertypeOf,
	IsTuple,
	IsUndefinable,
	Nand,
	Nor,
	Not,
	Or,
} from "./logic.js";
export {
	NarrowError,
	assertBy,
	assertDefined,
	assertGuard,
	assertNonNullish,
	ensure,
	ensureDefined,
	invariant,
	isNarrowError,
	narrowAll,
	parse,
	tryNarrow,
	unsafeNarrow,
} from "./narrow.js";
export type { Assertion, NarrowResult } from "./narrow.js";
export {
	allOf,
	alwaysFalse,
	alwaysTrue,
	and,
	anyOf,
	arrayOf,
	compose,
	eqv,
	everyOf,
	exactlyOne,
	implies,
	lazy,
	mapInput,
	nand,
	noneOf,
	not,
	nullableOf,
	nullishOf,
	optionalOf,
	or,
	recordOf,
	refineOn,
	someOf,
	structOf,
	tupleOf,
} from "./predicate.js";
export type { Predicate, Refinement, TypeGuard } from "./predicate.js";
export {
	UnhandledTagError,
	byTag,
	hasTag,
	isTagged,
	isTaggedWith,
	isUnhandledTagError,
	matchTag,
	matchTagPartial,
} from "./union.js";
export type {
	DiscriminantKeys,
	ExhaustiveHandlers,
	MemberByTag,
	MemberByTagOr,
	MembersWithoutTag,
	PartialHandlers,
	TagMapOf,
	TagValueOf,
	TaggedGuard,
	TaggedMember,
	TaggedUnionOf,
} from "./union.js";
