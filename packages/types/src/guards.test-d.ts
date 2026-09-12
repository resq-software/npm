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
 * @fileoverview Type-level tests for `./guards.js`. Every `Expect<...>` line is a
 * compile-time assertion — this file failing to type-check IS the test failure.
 * A runtime test proves a guard answers correctly; only these prove it narrows to
 * the type it claims, and does not quietly widen to `any` on the way.
 */

import { test } from "vitest";
import type { ReadonlyNonEmptyArray } from "./collection.js";
import {
	hasKey,
	hasKeys,
	hasOwn,
	type hasOwnProperty,
	type isArray,
	type isArrayBuffer,
	type isArrayLike,
	type isAsyncIterable,
	type isBigInt,
	type isBlankString,
	type isBoolean,
	isConstructor,
	type isDate,
	isDefined,
	isError,
	type isFiniteNumber,
	isFunction,
	isInRange,
	isInstanceOf,
	type isInteger,
	isIterable,
	type isJsonArray,
	type isJsonObject,
	type isJsonPrimitive,
	isJsonValue,
	isKeyOf,
	isMap,
	isNonEmptyArray,
	type isNonEmptyString,
	isNonNull,
	isNonNullish,
	type isNull,
	isNullish,
	type isNumber,
	isNumericString,
	isObject,
	isObjectLike,
	isOneOf,
	isPlainObject,
	isPrimitive,
	type isPromise,
	type isPropertyKey,
	type isRegExp,
	type isSafeInteger,
	isSet,
	isString,
	type isSymbol,
	isThenable,
	isArrayBufferView,
	isTypedArray,
	type isUint8Array,
	type isUndefined,
	isURL,
	isValidDate,
	type NonEmptyString,
} from "./guards.js";
import type { JsonArray, JsonObject, JsonPrimitive, JsonValue } from "./json.js";
import type { Equal, Expect } from "./testing.js";

/**
 * The type a plain `unknown`-input guard proves. Generic guards cannot be probed
 * this way (their predicate is not assignable to a `never` parameter), so those
 * are locked with a full-signature {@link Equal} instead — which is the stronger
 * assertion anyway, and exactly what the helpers-compatibility contract needs.
 */
type Narrows<G> = G extends (value: unknown) => value is infer B ? B : never;

// --- primitives ---------------------------------------------------------------
type _primitives = [
	Expect<Equal<Narrows<typeof isString>, string>>,
	Expect<Equal<Narrows<typeof isNumber>, number>>,
	Expect<Equal<Narrows<typeof isFiniteNumber>, number>>,
	Expect<Equal<Narrows<typeof isInteger>, number>>,
	Expect<Equal<Narrows<typeof isSafeInteger>, number>>,
	Expect<Equal<Narrows<typeof isBoolean>, boolean>>,
	Expect<Equal<Narrows<typeof isBigInt>, bigint>>,
	Expect<Equal<Narrows<typeof isSymbol>, symbol>>,
	Expect<Equal<Narrows<typeof isUndefined>, undefined>>,
	Expect<Equal<Narrows<typeof isNull>, null>>,
	Expect<Equal<Narrows<typeof isPropertyKey>, PropertyKey>>,
	Expect<
		Equal<
			Narrows<typeof isPrimitive>,
			string | number | bigint | boolean | symbol | null | undefined
		>
	>,
	// isInRange is a factory: the guard it returns starts at unknown.
	Expect<Equal<Narrows<ReturnType<typeof isInRange>>, number>>,
];

// --- nullish ------------------------------------------------------------------
type _nullish = [
	// Generic, so the negative branch keeps the useful half of the input type.
	Expect<Equal<typeof isNullish, <A>(value: A) => value is A & (null | undefined)>>,
	// The three migrated signatures, locked byte for byte against helpers.
	Expect<Equal<typeof isDefined, <T>(value: T) => value is Exclude<T, undefined>>>,
	Expect<Equal<typeof isNonNull, <T>(value: T) => value is Exclude<T, null>>>,
	Expect<Equal<typeof isNonNullish, <T>(value: T) => value is Exclude<T, null | undefined>>>,
	// Exclude, NOT NonNullable: for `unknown` those differ (NonNullable<unknown>
	// is `{}`), so swapping them would be a silent breaking change.
	Expect<Equal<Exclude<unknown, null | undefined>, unknown>>,
	Expect<Equal<Equal<NonNullable<unknown>, unknown>, false>>,
];

// --- strings ------------------------------------------------------------------
type _strings = [
	Expect<Equal<Narrows<typeof isNonEmptyString>, NonEmptyString>>,
	// The brand is still a string, so no call site is inconvenienced...
	Expect<Equal<NonEmptyString extends string ? true : false, true>>,
	// ...but a bare string is not proof.
	Expect<Equal<string extends NonEmptyString ? true : false, false>>,
	// "Blank" is a rejection reason, not a contract — deliberately unbranded.
	Expect<Equal<Narrows<typeof isBlankString>, string>>,
	Expect<Equal<Narrows<typeof isNumericString>, `${number}`>>,
	Expect<Equal<`${number}` extends string ? true : false, true>>,
];

// --- objects ------------------------------------------------------------------
type _objects = [
	// The indexable record, not the useless `object` keyword.
	Expect<Equal<Narrows<typeof isObject>, Record<PropertyKey, unknown>>>,
	Expect<Equal<Narrows<typeof isObjectLike>, object>>,
	Expect<Equal<Narrows<typeof isPlainObject>, Record<string, unknown>>>,
];

// --- arrays and iterables -----------------------------------------------------
type _arrays = [
	// TS#17002: bare Array.isArray would give `any[]` here.
	Expect<Equal<Narrows<typeof isArray>, readonly unknown[]>>,
	Expect<Equal<Equal<Narrows<typeof isArray>, unknown[]>, false>>,
	Expect<
		Equal<typeof isNonEmptyArray, <T>(value: readonly T[]) => value is ReadonlyNonEmptyArray<T>>
	>,
	Expect<Equal<Narrows<typeof isArrayLike>, ArrayLike<unknown>>>,
	Expect<Equal<Narrows<typeof isIterable>, Iterable<unknown>>>,
	Expect<Equal<Narrows<typeof isAsyncIterable>, AsyncIterable<unknown>>>,
];

// --- collections, callables, built-ins ----------------------------------------
type _instances = [
	Expect<Equal<Narrows<typeof isMap>, Map<unknown, unknown>>>,
	Expect<Equal<Narrows<typeof isSet>, Set<unknown>>>,
	// unknown[] parameters, NOT never[] — tightening breaks existing callers.
	Expect<Equal<Narrows<typeof isFunction>, (...args: unknown[]) => unknown>>,
	Expect<Equal<Narrows<typeof isConstructor>, new (...args: never[]) => unknown>>,
	Expect<Equal<Narrows<typeof isPromise>, Promise<unknown>>>,
	// The honest type: `await` requires PromiseLike, not Promise.
	Expect<Equal<Narrows<typeof isThenable>, PromiseLike<unknown>>>,
	Expect<Equal<Narrows<typeof isDate>, Date>>,
	Expect<Equal<Narrows<typeof isValidDate>, Date>>,
	Expect<Equal<Narrows<typeof isRegExp>, RegExp>>,
	Expect<Equal<Narrows<typeof isError>, Error>>,
	Expect<Equal<Narrows<typeof isURL>, URL>>,
	Expect<Equal<Narrows<typeof isTypedArray>, ArrayBufferView>>,
	Expect<Equal<Narrows<typeof isArrayBufferView>, ArrayBufferView>>,
	Expect<Equal<Narrows<typeof isUint8Array>, Uint8Array>>,
	Expect<Equal<Narrows<typeof isArrayBuffer>, ArrayBuffer>>,
];

// --- property access and membership -------------------------------------------
const palette = { primary: 1, accent: 2 } as const;

type _access = [
	// The `const` type parameter is what keeps the literals instead of `string`.
	Expect<Equal<Narrows<ReturnType<typeof isOneOf<readonly ["a", "b"]>>>, "a" | "b">>,
	Expect<Equal<Narrows<ReturnType<typeof isInstanceOf<typeof Error>>>, Error>>,
	Expect<
		Equal<
			typeof hasKey,
			<P extends PropertyKey>(value: unknown, key: P) => value is Record<P, unknown>
		>
	>,
	Expect<
		Equal<typeof hasOwn, <P extends PropertyKey>(obj: object, key: P) => obj is Record<P, unknown>>
	>,
	// The predicate is on the SECOND parameter.
	Expect<Equal<typeof isKeyOf, <T extends object>(obj: T, key: PropertyKey) => key is keyof T>>,
	// Migrated verbatim: non-narrowing, `boolean`, and it stays that way.
	Expect<Equal<typeof hasOwnProperty, (obj: object, key: string) => boolean>>,
];

// --- json ---------------------------------------------------------------------
type _json = [
	Expect<Equal<Narrows<typeof isJsonPrimitive>, JsonPrimitive>>,
	Expect<Equal<Narrows<typeof isJsonArray>, JsonArray>>,
	Expect<Equal<Narrows<typeof isJsonObject>, JsonObject>>,
	Expect<Equal<Narrows<typeof isJsonValue>, JsonValue>>,
];

// --- narrowing in real control flow -------------------------------------------
// The tuples above lock the declared predicates; these bodies prove the compiler
// actually applies them where it counts — including the operation each guard
// exists to make legal.

function _flowPrimitives(input: unknown): void {
	if (isString(input)) {
		type _narrowed = Expect<Equal<typeof input, string>>;
		const _upper: string = input.toUpperCase();
		void _upper;
	}
	const bounded: unknown = 5;
	if (isInRange(0, 10)(bounded)) {
		type _range = Expect<Equal<typeof bounded, number>>;
		const _doubled: number = bounded * 2;
		void _doubled;
	}
	if (isNumericString(input)) {
		type _numeric = Expect<Equal<typeof input, `${number}`>>;
	}
	if (isPrimitive(input)) {
		const _rendered: string = String(input);
		void _rendered;
	}
}

function _flowNullish(maybe: string | null | undefined): void {
	if (isNullish(maybe)) {
		type _yes = Expect<Equal<typeof maybe, null | undefined>>;
		return;
	}
	// The generic signature is what keeps `string` here instead of `unknown`.
	type _no = Expect<Equal<typeof maybe, string>>;
	const _trimmed: string = maybe.trim();
	void _trimmed;
}

function _flowNullishVariants(value: string | null | undefined): void {
	if (isDefined(value)) {
		// Keeps null.
		type _kept = Expect<Equal<typeof value, string | null>>;
	}
	if (isNonNull(value)) {
		// Keeps undefined.
		type _kept = Expect<Equal<typeof value, string | undefined>>;
	}
	if (isNonNullish(value)) {
		type _kept = Expect<Equal<typeof value, string>>;
	}
}

function _flowCollections(input: unknown): void {
	if (isMap(input)) {
		const _size: number = input.size;
		void _size;
	}
	if (isSet(input)) {
		const _has: boolean = input.has("x");
		void _has;
	}
	if (isIterable(input)) {
		// for-of over the narrowed value must typecheck.
		for (const element of input) {
			void element;
		}
	}
	if (isTypedArray(input)) {
		const _bytes: number = input.byteLength;
		void _bytes;
	}
	if (isArrayBufferView(input)) {
		const _viewBytes: number = input.byteLength;
		void _viewBytes;
	}
	if (isURL(input)) {
		const _protocol: string = input.protocol;
		void _protocol;
	}
	if (isValidDate(input)) {
		const _iso: string = input.toISOString();
		void _iso;
	}
	if (isError(input)) {
		const _message: string = input.message;
		void _message;
	}
}

function _flowArrays(xs: readonly string[]): void {
	if (isNonEmptyArray(xs)) {
		type _tuple = Expect<Equal<typeof xs, ReadonlyNonEmptyArray<string>>>;
		// The entire point: no `| undefined` under noUncheckedIndexedAccess.
		const _head: string = xs[0];
		void _head;
	}
}

function _flowCallables(input: unknown): void {
	if (isFunction(input)) {
		// Arbitrary arguments must still be legal — `never[]` would break this.
		const _result: unknown = input(1, "two", {});
		void _result;
	}
	if (isConstructor(input)) {
		const _instance: unknown = new input();
		void _instance;
	}
	if (isThenable(input)) {
		const _settled: Promise<unknown> = Promise.resolve(input);
		void _settled;
	}
}

function _flowAccess(payload: unknown, key: PropertyKey): void {
	if (hasKey(payload, "id")) {
		type _readable = Expect<Equal<typeof payload.id, unknown>>;
	}
	if (hasKeys(payload, "lat", "lon")) {
		type _both = Expect<Equal<typeof payload, Record<"lat" | "lon", unknown>>>;
	}
	if (isKeyOf(palette, key)) {
		type _indexed = Expect<Equal<(typeof palette)[typeof key], 1 | 2>>;
	}
	const level: unknown = "info";
	if (isOneOf("debug", "info")(level)) {
		type _member = Expect<Equal<typeof level, "debug" | "info">>;
	}
	if (isInstanceOf(Error)(payload)) {
		type _instance = Expect<Equal<typeof payload, Error>>;
	}
	if (isObject(payload) && isString(payload.token)) {
		const _token: string = payload.token;
		void _token;
	}
	if (isObjectLike(payload) && hasOwn(payload, "id")) {
		type _own = Expect<Equal<typeof payload.id, unknown>>;
	}
	if (isPlainObject(payload)) {
		const _keys: string[] = Object.keys(payload);
		void _keys;
	}
	if (isJsonValue(payload)) {
		const _json: JsonValue = payload;
		void _json;
	}
}

test("type-level assertions compile", () => {
	// The assertions above are enforced by the typechecker; if any Expect<...>
	// resolved to a non-`true` type, this file would fail to compile and
	// `vitest --typecheck` would report it. Referencing the tuples and the flow
	// functions here keeps them "used" without exporting from a test file.
	type _all = [_primitives, _nullish, _strings, _objects, _arrays, _instances, _access, _json];
	const _assertions: _all | undefined = undefined;
	void _assertions;
	void _flowPrimitives;
	void _flowNullish;
	void _flowNullishVariants;
	void _flowCollections;
	void _flowArrays;
	void _flowCallables;
	void _flowAccess;
});
