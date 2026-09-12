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

import { runInNewContext } from "node:vm";
import { describe, expect, test } from "vitest";
import {
	hasKey,
	hasKeys,
	hasOwn,
	hasOwnProperty,
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
	isUint8Array,
	isUndefined,
	isURL,
	isValidDate,
} from "./guards.js";

// Genuinely cross-realm values: a `vm` context has its own intrinsics, so every
// one of these fails `instanceof` against our realm's constructors. This is the
// exact failure mode the tag-based guards exist to survive.
const realm = runInNewContext(`({
	map: new Map([["a", 1]]),
	set: new Set([1]),
	date: new Date(0),
	invalidDate: new Date("not a date"),
	regexp: /x/g,
	error: new Error("boom"),
	array: [1, 2],
	buffer: new ArrayBuffer(8),
	bytes: new Uint8Array([1, 2, 3]),
	plain: { a: 1 },
	promise: Promise.resolve(1),
})`) as Record<string, unknown>;

// Objects that lie about their species via Symbol.toStringTag. Every tag-based
// guard must reject these, because the caller will immediately reach for a
// method the decoy does not have.
const spoof = (tag: string): unknown => ({ [Symbol.toStringTag]: tag });

const nullProto = Object.create(null) as Record<string, unknown>;
nullProto.a = 1;

class Widget {
	public readonly id = "w1";
	public label(): string {
		return this.id;
	}
}

describe("isString", () => {
	test("accepts primitive strings, including empty", () => {
		expect(isString("")).toBe(true);
		expect(isString("hi")).toBe(true);
	});

	test("rejects boxed strings and every other type", () => {
		// A boxed String is an object, and is precisely the negative case under test.
		expect(isString(new String("hi"))).toBe(false);
		expect(isString(0)).toBe(false);
		expect(isString(null)).toBe(false);
		expect(isString(undefined)).toBe(false);
		expect(isString(Symbol("hi"))).toBe(false);
	});

	test("narrows inside the guarded branch", () => {
		const value: unknown = "hi";
		if (!isString(value)) {
			throw new Error("guard should have matched");
		}
		expect(value.toUpperCase()).toBe("HI");
	});
});

describe("isNumber", () => {
	test("accepts NaN — documented, deliberate, load-bearing compatibility", () => {
		expect(isNumber(Number.NaN)).toBe(true);
	});

	test("accepts every other number, infinities and negative zero included", () => {
		expect(isNumber(0)).toBe(true);
		expect(isNumber(-0)).toBe(true);
		expect(isNumber(Number.POSITIVE_INFINITY)).toBe(true);
	});

	test("rejects numeric strings and bigints", () => {
		expect(isNumber("42")).toBe(false);
		expect(isNumber(42n)).toBe(false);
		expect(isNumber(null)).toBe(false);
	});
});

describe("isFiniteNumber", () => {
	test("accepts finite numbers", () => {
		expect(isFiniteNumber(0)).toBe(true);
		expect(isFiniteNumber(-1.5)).toBe(true);
	});

	test("rejects NaN and both infinities — the whole reason it exists", () => {
		expect(isFiniteNumber(Number.NaN)).toBe(false);
		expect(isFiniteNumber(Number.POSITIVE_INFINITY)).toBe(false);
		expect(isFiniteNumber(Number.NEGATIVE_INFINITY)).toBe(false);
	});

	test("rejects numeric strings — it does not coerce", () => {
		expect(isFiniteNumber("1")).toBe(false);
	});
});

describe("isInteger", () => {
	test("accepts whole numbers of either sign", () => {
		expect(isInteger(0)).toBe(true);
		expect(isInteger(-7)).toBe(true);
		expect(isInteger(2.0)).toBe(true);
	});

	test("rejects fractions, NaN, infinity, and strings", () => {
		expect(isInteger(2.5)).toBe(false);
		expect(isInteger(Number.NaN)).toBe(false);
		expect(isInteger(Number.POSITIVE_INFINITY)).toBe(false);
		expect(isInteger("2")).toBe(false);
	});
});

describe("isSafeInteger", () => {
	test("accepts integers inside the double-precision safe range", () => {
		expect(isSafeInteger(2 ** 53 - 1)).toBe(true);
		expect(isSafeInteger(-(2 ** 53) + 1)).toBe(true);
	});

	test("rejects integers that already lost precision", () => {
		expect(isSafeInteger(2 ** 53)).toBe(false);
		// biome-ignore lint/correctness/noPrecisionLoss: a literal that loses precision on the way in is exactly the hazard isSafeInteger detects
		expect(isSafeInteger(9007199254740993)).toBe(false);
	});
});

describe("isInRange", () => {
	test("treats both bounds as inclusive", () => {
		const isPercent = isInRange(0, 100);
		expect(isPercent(0)).toBe(true);
		expect(isPercent(100)).toBe(true);
		expect(isPercent(50.5)).toBe(true);
	});

	test("rejects out-of-range values, NaN, and non-numbers", () => {
		const isPercent = isInRange(0, 100);
		expect(isPercent(-0.001)).toBe(false);
		expect(isPercent(101)).toBe(false);
		expect(isPercent(Number.NaN)).toBe(false);
		expect(isPercent("50")).toBe(false);
		expect(isPercent(null)).toBe(false);
	});

	test("is storable and reusable — the reason it is curried", () => {
		const isProbability = isInRange(0, 1);
		expect([0, 0.5, 1, 2].filter(isProbability)).toEqual([0, 0.5, 1]);
	});
});

describe("isBoolean", () => {
	test("accepts both booleans", () => {
		expect(isBoolean(true)).toBe(true);
		expect(isBoolean(false)).toBe(true);
	});

	test("rejects falsy non-booleans", () => {
		expect(isBoolean(0)).toBe(false);
		expect(isBoolean("")).toBe(false);
		expect(isBoolean(null)).toBe(false);
	});
});

describe("isBigInt", () => {
	test("accepts bigint literals and rejects numbers", () => {
		expect(isBigInt(0n)).toBe(true);
		expect(isBigInt(0)).toBe(false);
		expect(isBigInt("0n")).toBe(false);
	});
});

describe("isSymbol", () => {
	test("accepts unique, registered, and well-known symbols", () => {
		expect(isSymbol(Symbol("x"))).toBe(true);
		expect(isSymbol(Symbol.for("x"))).toBe(true);
		expect(isSymbol(Symbol.iterator)).toBe(true);
	});

	test("rejects the symbol's description", () => {
		expect(isSymbol("x")).toBe(false);
	});
});

describe("isUndefined", () => {
	test("distinguishes undefined from null and from a missing property", () => {
		expect(isUndefined(undefined)).toBe(true);
		expect(isUndefined(({} as { missing?: unknown }).missing)).toBe(true);
		expect(isUndefined(null)).toBe(false);
		expect(isUndefined(0)).toBe(false);
	});
});

describe("isNull", () => {
	test("accepts only null, undeterred by typeof null being object", () => {
		expect(isNull(null)).toBe(true);
		expect(isNull(undefined)).toBe(false);
		expect(isNull({})).toBe(false);
		expect(isNull(0)).toBe(false);
	});
});

describe("isPropertyKey", () => {
	test("accepts strings, numbers, and symbols", () => {
		expect(isPropertyKey("a")).toBe(true);
		expect(isPropertyKey(1)).toBe(true);
		expect(isPropertyKey(Symbol("a"))).toBe(true);
	});

	test("rejects everything that cannot index an object", () => {
		expect(isPropertyKey(null)).toBe(false);
		expect(isPropertyKey(undefined)).toBe(false);
		expect(isPropertyKey(true)).toBe(false);
		expect(isPropertyKey({})).toBe(false);
	});
});

describe("isPrimitive", () => {
	test("accepts every primitive, null and undefined included", () => {
		for (const value of ["", 0, 0n, false, Symbol("s"), null, undefined]) {
			expect(isPrimitive(value)).toBe(true);
		}
	});

	test("rejects objects, arrays, and functions", () => {
		expect(isPrimitive({})).toBe(false);
		expect(isPrimitive([])).toBe(false);
		expect(isPrimitive(() => undefined)).toBe(false);
		expect(isPrimitive(nullProto)).toBe(false);
	});

	test("is the exact complement of isObjectLike", () => {
		const cases: unknown[] = ["", 0, null, undefined, {}, [], () => undefined, new Date()];
		for (const value of cases) {
			expect(isPrimitive(value)).toBe(!isObjectLike(value));
		}
	});
});

describe("isNullish", () => {
	test("accepts null and undefined only", () => {
		expect(isNullish(null)).toBe(true);
		expect(isNullish(undefined)).toBe(true);
		expect(isNullish(0)).toBe(false);
		expect(isNullish("")).toBe(false);
		expect(isNullish(Number.NaN)).toBe(false);
	});

	test("preserves the input type in the negative branch", () => {
		const maybe: string | null = "hi";
		if (isNullish(maybe)) {
			throw new Error("guard should not have matched");
		}
		expect(maybe.trim()).toBe("hi");
	});
});

describe("isDefined", () => {
	test("keeps null and rejects only undefined", () => {
		expect(isDefined(null)).toBe(true);
		expect(isDefined(0)).toBe(true);
		expect(isDefined(undefined)).toBe(false);
	});

	test("filters an array down to the still-nullable elements", () => {
		const xs: (number | undefined | null)[] = [1, undefined, null, 2];
		expect(xs.filter(isDefined)).toEqual([1, null, 2]);
	});
});

describe("isNonNull", () => {
	test("keeps undefined and rejects only null", () => {
		expect(isNonNull(undefined)).toBe(true);
		expect(isNonNull(0)).toBe(true);
		expect(isNonNull(null)).toBe(false);
	});

	test("filters an array while keeping undefined", () => {
		const xs: (string | null | undefined)[] = ["a", null, undefined];
		expect(xs.filter(isNonNull)).toEqual(["a", undefined]);
	});
});

describe("isNonNullish", () => {
	test("rejects both null and undefined but keeps every falsy value", () => {
		expect(isNonNullish(null)).toBe(false);
		expect(isNonNullish(undefined)).toBe(false);
		expect(isNonNullish(0)).toBe(true);
		expect(isNonNullish("")).toBe(true);
		expect(isNonNullish(false)).toBe(true);
		expect(isNonNullish(Number.NaN)).toBe(true);
	});

	test("is the filter idiom it exists for", () => {
		const xs: (string | null | undefined)[] = ["a", null, "b", undefined];
		expect(xs.filter(isNonNullish)).toEqual(["a", "b"]);
	});
});

describe("isNonEmptyString", () => {
	test("accepts any string of length one or more, falsy-looking ones included", () => {
		expect(isNonEmptyString("0")).toBe(true);
		expect(isNonEmptyString("false")).toBe(true);
		// Whitespace has length; blankness is isBlankString's question, not this one.
		expect(isNonEmptyString(" ")).toBe(true);
	});

	test("rejects the empty string and every non-string", () => {
		expect(isNonEmptyString("")).toBe(false);
		expect(isNonEmptyString(null)).toBe(false);
		expect(isNonEmptyString(0)).toBe(false);
		expect(isNonEmptyString(["a"])).toBe(false);
	});
});

describe("isBlankString", () => {
	test("accepts empty and whitespace-only strings", () => {
		expect(isBlankString("")).toBe(true);
		expect(isBlankString("   ")).toBe(true);
		expect(isBlankString("\n\t\r ")).toBe(true);
	});

	test("rejects strings with content and every non-string", () => {
		expect(isBlankString("x")).toBe(false);
		expect(isBlankString(" x ")).toBe(false);
		expect(isBlankString(null)).toBe(false);
		expect(isBlankString(undefined)).toBe(false);
	});
});

describe("isNumericString", () => {
	test("accepts signed, fractional, and exponential decimal literals", () => {
		expect(isNumericString("42")).toBe(true);
		expect(isNumericString("-1.5")).toBe(true);
		expect(isNumericString("+0")).toBe(true);
		expect(isNumericString(".5")).toBe(true);
		expect(isNumericString("1e10")).toBe(true);
		expect(isNumericString("-1.5e-3")).toBe(true);
		expect(isNumericString("007")).toBe(true);
	});

	test("rejects the empty and whitespace strings that Number() turns into 0", () => {
		expect(isNumericString("")).toBe(false);
		expect(isNumericString("   ")).toBe(false);
		expect(isNumericString("\n")).toBe(false);
	});

	test("rejects non-decimal notations that Number() would happily coerce", () => {
		expect(isNumericString("0x10")).toBe(false);
		expect(isNumericString("0b11")).toBe(false);
		expect(isNumericString("Infinity")).toBe(false);
		expect(isNumericString("NaN")).toBe(false);
		expect(isNumericString("1,000")).toBe(false);
		expect(isNumericString("1 ")).toBe(false);
	});

	test("rejects actual numbers — it is a string guard", () => {
		expect(isNumericString(42)).toBe(false);
	});

	test("rejects a long non-numeric string in linear time", () => {
		// Regression: the earlier `\\d+\\.?\\d*` alternative backtracked quadratically,
		// so a 100 KB rejecting input pinned the event loop for ~5.7 s. This guard is
		// documented for process.env, query strings, and request bodies, so the input
		// is attacker-controlled by design.
		const hostile = `${"9".repeat(100_000)}!`;
		const started = performance.now();
		expect(isNumericString(hostile)).toBe(false);
		expect(performance.now() - started).toBeLessThan(250);
	});

	test("still rejects a long string with a trailing dot and exponent noise", () => {
		expect(isNumericString(`${"9".repeat(50_000)}.5e`)).toBe(false);
		expect(isNumericString(`${"9".repeat(50_000)}.5e3`)).toBe(true);
	});
});

describe("isObject", () => {
	test("accepts anything indexable, arrays and instances included", () => {
		expect(isObject({})).toBe(true);
		expect(isObject([])).toBe(true);
		expect(isObject(new Date())).toBe(true);
		expect(isObject(nullProto)).toBe(true);
	});

	test("rejects null, primitives, and functions", () => {
		expect(isObject(null)).toBe(false);
		expect(isObject(undefined)).toBe(false);
		expect(isObject("x")).toBe(false);
		expect(isObject(() => undefined)).toBe(false);
	});

	test("makes the guarded value readable by key", () => {
		const body: unknown = { token: "abc" };
		if (!isObject(body) || !isString(body.token)) {
			throw new Error("guard should have matched");
		}
		expect(body.token).toBe("abc");
	});
});

describe("isObjectLike", () => {
	test("accepts functions as well as objects", () => {
		expect(isObjectLike(() => undefined)).toBe(true);
		expect(isObjectLike(class {})).toBe(true);
		expect(isObjectLike({})).toBe(true);
		expect(isObjectLike([])).toBe(true);
	});

	test("rejects null and every primitive", () => {
		expect(isObjectLike(null)).toBe(false);
		expect(isObjectLike(undefined)).toBe(false);
		expect(isObjectLike(0)).toBe(false);
		expect(isObjectLike(Symbol("s"))).toBe(false);
	});
});

describe("isPlainObject", () => {
	test("accepts object literals, JSON.parse output, and null-prototype bags", () => {
		expect(isPlainObject({ a: 1 })).toBe(true);
		expect(isPlainObject(JSON.parse('{"a":1}'))).toBe(true);
		expect(isPlainObject(nullProto)).toBe(true);
		expect(isPlainObject(Object.create(null))).toBe(true);
	});

	test("accepts a plain object from another realm", () => {
		expect(isPlainObject(realm.plain)).toBe(true);
	});

	test("rejects arrays, built-ins, and class instances", () => {
		expect(isPlainObject([])).toBe(false);
		expect(isPlainObject(new Date())).toBe(false);
		expect(isPlainObject(new Map())).toBe(false);
		expect(isPlainObject(Promise.resolve())).toBe(false);
		expect(isPlainObject(new Widget())).toBe(false);
		expect(isPlainObject(/x/)).toBe(false);
	});

	test("rejects objects that carry a custom Symbol.toStringTag", () => {
		expect(isPlainObject(spoof("Widget"))).toBe(false);
	});

	test("rejects null, functions, and primitives", () => {
		expect(isPlainObject(null)).toBe(false);
		expect(isPlainObject(() => undefined)).toBe(false);
		expect(isPlainObject("x")).toBe(false);
	});
});

describe("isArray", () => {
	test("accepts arrays, including arrays from another realm", () => {
		expect(isArray([])).toBe(true);
		expect(isArray([1, 2])).toBe(true);
		expect(isArray(realm.array)).toBe(true);
	});

	test("rejects array-likes, typed arrays, strings, and objects", () => {
		expect(isArray({ length: 0 })).toBe(false);
		expect(isArray(new Uint8Array(1))).toBe(false);
		expect(isArray("abc")).toBe(false);
		expect(isArray(null)).toBe(false);
	});
});

describe("isNonEmptyArray", () => {
	test("accepts arrays with at least one element", () => {
		expect(isNonEmptyArray([1])).toBe(true);
		expect(isNonEmptyArray([undefined])).toBe(true);
	});

	test("rejects the empty array", () => {
		expect(isNonEmptyArray([])).toBe(false);
	});

	test("makes the first element defined without an assertion", () => {
		const xs: readonly string[] = ["a", "b"];
		if (!isNonEmptyArray(xs)) {
			throw new Error("guard should have matched");
		}
		const head: string = xs[0];
		expect(head).toBe("a");
	});
});

describe("isArrayLike", () => {
	test("accepts strings, arrays, typed arrays, and length-bearing objects", () => {
		expect(isArrayLike("abc")).toBe(true);
		expect(isArrayLike([])).toBe(true);
		expect(isArrayLike(new Uint8Array(2))).toBe(true);
		expect(isArrayLike({ length: 0 })).toBe(true);
		expect(isArrayLike({ 0: "a", length: 1 })).toBe(true);
	});

	test("rejects functions even though they have a length", () => {
		expect(isArrayLike((a: number, b: number) => a + b)).toBe(false);
	});

	test("rejects objects with a missing, negative, or fractional length", () => {
		expect(isArrayLike({})).toBe(false);
		expect(isArrayLike({ length: -1 })).toBe(false);
		expect(isArrayLike({ length: 1.5 })).toBe(false);
		expect(isArrayLike({ length: "2" })).toBe(false);
		expect(isArrayLike({ length: Number.NaN })).toBe(false);
	});

	test("rejects null, undefined, and other primitives", () => {
		expect(isArrayLike(null)).toBe(false);
		expect(isArrayLike(undefined)).toBe(false);
		expect(isArrayLike(3)).toBe(false);
	});
});

describe("isIterable", () => {
	test("accepts arrays, strings, Maps, Sets, and generators", () => {
		expect(isIterable([])).toBe(true);
		expect(isIterable("ab")).toBe(true);
		expect(isIterable(new Map())).toBe(true);
		expect(isIterable(new Set())).toBe(true);
		expect(isIterable((function* gen() {})())).toBe(true);
	});

	test("rejects plain objects, null, undefined, and numbers", () => {
		expect(isIterable({})).toBe(false);
		expect(isIterable(null)).toBe(false);
		expect(isIterable(undefined)).toBe(false);
		expect(isIterable(1)).toBe(false);
	});

	test("rejects an object whose Symbol.iterator is not callable", () => {
		expect(isIterable({ [Symbol.iterator]: 1 })).toBe(false);
	});

	test("makes the value spreadable", () => {
		const input: unknown = new Set([1, 2]);
		expect(isIterable(input) ? [...input] : [input]).toEqual([1, 2]);
	});
});

describe("isAsyncIterable", () => {
	test("accepts an async generator", () => {
		expect(isAsyncIterable((async function* gen() {})())).toBe(true);
	});

	test("rejects sync iterables, promises, null, and undefined", () => {
		expect(isAsyncIterable([])).toBe(false);
		expect(isAsyncIterable(Promise.resolve())).toBe(false);
		expect(isAsyncIterable(null)).toBe(false);
		expect(isAsyncIterable(undefined)).toBe(false);
	});

	test("rejects an object whose Symbol.asyncIterator is not callable", () => {
		expect(isAsyncIterable({ [Symbol.asyncIterator]: "nope" })).toBe(false);
	});
});

describe("isMap", () => {
	test("accepts a Map from this realm and a Map from another realm", () => {
		expect(isMap(new Map())).toBe(true);
		expect(isMap(realm.map)).toBe(true);
	});

	test("rejects a Symbol.toStringTag decoy", () => {
		expect(isMap(spoof("Map"))).toBe(false);
	});

	test("rejects Sets, WeakMaps, plain objects, and null", () => {
		expect(isMap(new Set())).toBe(false);
		expect(isMap(new WeakMap())).toBe(false);
		expect(isMap({})).toBe(false);
		expect(isMap(null)).toBe(false);
	});

	test("makes .size readable after narrowing", () => {
		const value: unknown = new Map([["a", 1]]);
		if (!isMap(value)) {
			throw new Error("guard should have matched");
		}
		expect(value.size).toBe(1);
	});
});

describe("isSet", () => {
	test("accepts a Set from this realm and a Set from another realm", () => {
		expect(isSet(new Set())).toBe(true);
		expect(isSet(realm.set)).toBe(true);
	});

	test("rejects a Symbol.toStringTag decoy", () => {
		expect(isSet(spoof("Set"))).toBe(false);
	});

	test("rejects Maps, WeakSets, arrays, and null", () => {
		expect(isSet(new Map())).toBe(false);
		expect(isSet(new WeakSet())).toBe(false);
		expect(isSet([])).toBe(false);
		expect(isSet(null)).toBe(false);
	});
});

describe("isFunction", () => {
	test("accepts every callable shape", () => {
		expect(isFunction(() => undefined)).toBe(true);
		expect(isFunction(function named() {})).toBe(true);
		expect(isFunction(async () => undefined)).toBe(true);
		expect(isFunction(function* gen() {})).toBe(true);
		expect(isFunction(class {})).toBe(true);
		expect(isFunction(Math.max)).toBe(true);
	});

	test("rejects non-callables", () => {
		expect(isFunction({})).toBe(false);
		expect(isFunction(null)).toBe(false);
		expect(isFunction("() => {}")).toBe(false);
	});

	test("the narrowed value still accepts arbitrary arguments", () => {
		const handler: unknown = (...args: unknown[]) => args.length;
		if (!isFunction(handler)) {
			throw new Error("guard should have matched");
		}
		// This call is the compatibility contract: `never[]` parameters would
		// have made it a compile error for every existing caller.
		expect(handler(1, "two", {})).toBe(3);
	});
});

describe("isConstructor", () => {
	test("accepts classes and ordinary function declarations", () => {
		expect(isConstructor(class {})).toBe(true);
		expect(isConstructor(Widget)).toBe(true);
		expect(isConstructor(function named() {})).toBe(true);
		expect(isConstructor(Map)).toBe(true);
	});

	test("rejects arrows, methods, async functions, and generators", () => {
		expect(isConstructor(() => undefined)).toBe(false);
		expect(isConstructor({ method() {} }.method)).toBe(false);
		expect(isConstructor(async function anAsync() {})).toBe(false);
		expect(isConstructor(function* gen() {})).toBe(false);
	});

	test("rejects non-functions", () => {
		expect(isConstructor({})).toBe(false);
		expect(isConstructor(null)).toBe(false);
		expect(isConstructor("class {}")).toBe(false);
	});

	test("does not run the constructor body", () => {
		let ran = false;
		class SideEffect {
			constructor() {
				ran = true;
			}
		}
		expect(isConstructor(SideEffect)).toBe(true);
		expect(ran).toBe(false);
	});
});

describe("isPromise", () => {
	test("accepts real promises, including one from another realm", () => {
		expect(isPromise(Promise.resolve())).toBe(true);
		expect(isPromise(realm.promise)).toBe(true);
	});

	test("accepts a callable thenable — the duck-typed contract it must preserve", () => {
		const callableThenable = Object.assign(() => undefined, {
			// biome-ignore lint/suspicious/noThenProperty: a callable thenable is the fixture under test
			then: (resolve: (value: number) => void) => resolve(1),
		});
		expect(isPromise(callableThenable)).toBe(true);
	});

	test("accepts a plain object thenable", () => {
		// biome-ignore lint/suspicious/noThenProperty: an object thenable is the fixture under test
		expect(isPromise({ then: () => undefined })).toBe(true);
	});

	test("rejects objects with a non-callable then, and every non-thenable", () => {
		// biome-ignore lint/suspicious/noThenProperty: a non-callable `then` is the fixture under test
		expect(isPromise({ then: 1 })).toBe(false);
		expect(isPromise({})).toBe(false);
		expect(isPromise(null)).toBe(false);
		expect(isPromise(undefined)).toBe(false);
		expect(isPromise(0)).toBe(false);
	});
});

describe("isThenable", () => {
	test("agrees with isPromise on every input", () => {
		const cases: unknown[] = [
			Promise.resolve(),
			// biome-ignore lint/suspicious/noThenProperty: thenables are the fixtures under test
			{ then: () => undefined },
			// biome-ignore lint/suspicious/noThenProperty: thenables are the fixtures under test
			{ then: 1 },
			null,
			0,
			"",
		];
		for (const value of cases) {
			expect(isThenable(value)).toBe(isPromise(value));
		}
	});

	test("narrows to something awaitable", async () => {
		const value: unknown = Promise.resolve(7);
		expect(isThenable(value) ? await value : value).toBe(7);
	});
});

describe("isDate", () => {
	test("accepts Dates from this realm and from another realm", () => {
		expect(isDate(new Date())).toBe(true);
		expect(isDate(realm.date)).toBe(true);
	});

	test("accepts an invalid Date — it is still a Date", () => {
		expect(isDate(new Date("not a date"))).toBe(true);
	});

	test("rejects timestamps, date strings, and null", () => {
		expect(isDate(Date.now())).toBe(false);
		expect(isDate("2026-01-01")).toBe(false);
		expect(isDate(null)).toBe(false);
	});

	test("rejects a Symbol.toStringTag decoy", () => {
		// The tag alone is forgeable, and a date-wrapper class defining
		// Symbol.toStringTag for nicer console output is ordinary. The internal-slot
		// probe is what makes the narrowing safe to act on.
		expect(isDate(spoof("Date"))).toBe(false);
		expect(isDate({ toISOString: () => "2026-01-01T00:00:00.000Z" })).toBe(false);
	});
});

describe("isValidDate", () => {
	test("accepts a parseable Date, including one from another realm", () => {
		expect(isValidDate(new Date(0))).toBe(true);
		expect(isValidDate(realm.date)).toBe(true);
	});

	test("rejects a Date built from garbage — the guard everyone forgets", () => {
		expect(isValidDate(new Date("not a date"))).toBe(false);
		expect(isValidDate(realm.invalidDate)).toBe(false);
	});

	test("rejects a decoy without throwing", () => {
		expect(isValidDate(spoof("Date"))).toBe(false);
		expect(isValidDate({ getTime: () => 0 })).toBe(false);
	});

	test("cannot be fooled by an own getTime override", () => {
		const lying = new Date("not a date");
		Object.defineProperty(lying, "getTime", { value: () => 0 });
		expect(isValidDate(lying)).toBe(false);
	});
});

describe("isRegExp", () => {
	test("accepts regexes from this realm and from another realm", () => {
		expect(isRegExp(/x/)).toBe(true);
		expect(isRegExp(/x/g)).toBe(true);
		expect(isRegExp(realm.regexp)).toBe(true);
	});

	test("rejects a decoy and a pattern-shaped object", () => {
		expect(isRegExp(spoof("RegExp"))).toBe(false);
		expect(isRegExp({ source: "x", flags: "g" })).toBe(false);
		expect(isRegExp("/x/")).toBe(false);
	});
});

describe("isError", () => {
	test("accepts Errors, subclasses, and Errors from another realm", () => {
		expect(isError(new Error("x"))).toBe(true);
		expect(isError(new TypeError("x"))).toBe(true);
		expect(isError(realm.error)).toBe(true);
	});

	test("accepts a subclass that overrode Symbol.toStringTag", () => {
		class Weird extends Error {
			public readonly [Symbol.toStringTag] = "Weird";
		}
		expect(isError(new Weird("x"))).toBe(true);
	});

	test("rejects error-shaped objects and thrown primitives", () => {
		expect(isError({ message: "x", name: "Error" })).toBe(false);
		expect(isError("boom")).toBe(false);
		expect(isError(null)).toBe(false);
	});

	test("rejects a Symbol.toStringTag decoy with no usable message", () => {
		// Without this, the documented catch idiom logs `undefined` in place of the
		// real cause — the error is not merely mistyped, it is lost.
		expect(isError(spoof("Error"))).toBe(false);
		expect(isError({ [Symbol.toStringTag]: "Error", message: 123 })).toBe(false);
	});

	test("is the catch-binding guard", () => {
		try {
			throw new TypeError("expected");
		} catch (cause) {
			expect(isError(cause) ? cause.message : String(cause)).toBe("expected");
		}
	});
});

describe("isURL", () => {
	test("accepts a URL instance", () => {
		expect(isURL(new URL("https://example.test/a"))).toBe(true);
	});

	test("rejects URL strings and decoys", () => {
		expect(isURL("https://example.test/a")).toBe(false);
		expect(isURL(spoof("URL"))).toBe(false);
		expect(isURL({ href: "https://example.test/" })).toBe(false);
		expect(isURL(null)).toBe(false);
	});

	test("makes .protocol readable after narrowing", () => {
		const target: unknown = new URL("http://example.test/");
		if (!isURL(target)) {
			throw new Error("guard should have matched");
		}
		expect(target.protocol).toBe("http:");
	});
});

describe("isArrayBufferView", () => {
	test("accepts every typed-array kind and DataView", () => {
		expect(isArrayBufferView(new Uint8Array(1))).toBe(true);
		expect(isArrayBufferView(new Float64Array(1))).toBe(true);
		expect(isArrayBufferView(new DataView(new ArrayBuffer(8)))).toBe(true);
		expect(isArrayBufferView(realm.bytes)).toBe(true);
	});

	test("rejects the buffer itself and plain arrays", () => {
		expect(isArrayBufferView(new ArrayBuffer(8))).toBe(false);
		expect(isArrayBufferView([1, 2])).toBe(false);
		expect(isArrayBufferView(null)).toBe(false);
	});
});

describe("isTypedArray", () => {
	test("accepts every typed-array kind, from this realm and another", () => {
		expect(isTypedArray(new Uint8Array(1))).toBe(true);
		expect(isTypedArray(new Float64Array(1))).toBe(true);
		expect(isTypedArray(new BigInt64Array(1))).toBe(true);
		expect(isTypedArray(realm.bytes)).toBe(true);
	});

	test("rejects DataView, matching node:util.types and lodash", () => {
		// The whole reason this guard is separate from isArrayBufferView: callers
		// swap it for util.types.isTypedArray, which returns false here.
		expect(isTypedArray(new DataView(new ArrayBuffer(8)))).toBe(false);
	});

	test("rejects the buffer itself and plain arrays", () => {
		expect(isTypedArray(new ArrayBuffer(8))).toBe(false);
		expect(isTypedArray([1, 2])).toBe(false);
		expect(isTypedArray(null)).toBe(false);
	});
});

describe("isUint8Array", () => {
	test("accepts Uint8Arrays from this realm and from another realm", () => {
		expect(isUint8Array(new Uint8Array([1]))).toBe(true);
		expect(isUint8Array(realm.bytes)).toBe(true);
	});

	test("rejects the other typed-array kinds and DataView", () => {
		expect(isUint8Array(new Uint8ClampedArray(1))).toBe(false);
		expect(isUint8Array(new Int8Array(1))).toBe(false);
		expect(isUint8Array(new DataView(new ArrayBuffer(8)))).toBe(false);
	});

	test("rejects a decoy", () => {
		expect(isUint8Array(spoof("Uint8Array"))).toBe(false);
	});
});

describe("isArrayBuffer", () => {
	test("accepts buffers from this realm and from another realm", () => {
		expect(isArrayBuffer(new ArrayBuffer(8))).toBe(true);
		expect(isArrayBuffer(realm.buffer)).toBe(true);
	});

	test("rejects views over a buffer — the binary-protocol bug it exists for", () => {
		const buffer = new ArrayBuffer(8);
		expect(isArrayBuffer(new Uint8Array(buffer))).toBe(false);
		expect(isArrayBuffer(new DataView(buffer))).toBe(false);
	});

	test("rejects a decoy", () => {
		expect(isArrayBuffer(spoof("ArrayBuffer"))).toBe(false);
	});
});

describe("hasKey", () => {
	test("accepts own and inherited keys on objects and functions", () => {
		expect(hasKey({ a: 1 }, "a")).toBe(true);
		expect(hasKey({}, "toString")).toBe(true);
		expect(hasKey(new Widget(), "label")).toBe(true);
		expect(hasKey(() => undefined, "call")).toBe(true);
	});

	test("accepts symbol keys", () => {
		const tag = Symbol("tag");
		expect(hasKey({ [tag]: 1 }, tag)).toBe(true);
	});

	test("rejects missing keys and every primitive", () => {
		expect(hasKey({ a: 1 }, "b")).toBe(false);
		expect(hasKey(null, "a")).toBe(false);
		expect(hasKey(undefined, "a")).toBe(false);
		expect(hasKey("abc", "length")).toBe(false);
	});

	test("makes the key readable as unknown", () => {
		const cause: unknown = { message: "boom" };
		const message = hasKey(cause, "message") && isString(cause.message) ? cause.message : "?";
		expect(message).toBe("boom");
	});
});

describe("hasKeys", () => {
	test("requires every listed key to be present", () => {
		const frame = { lat: 1, lon: 2, at: 3 };
		expect(hasKeys(frame, "lat", "lon", "at")).toBe(true);
		expect(hasKeys(frame, "lat", "alt")).toBe(false);
	});

	test("still rejects primitives when called with no keys", () => {
		expect(hasKeys({})).toBe(true);
		expect(hasKeys(null)).toBe(false);
		expect(hasKeys(42)).toBe(false);
	});

	test("makes every listed key readable", () => {
		const frame: unknown = { lat: 1, lon: 2 };
		if (!hasKeys(frame, "lat", "lon")) {
			throw new Error("guard should have matched");
		}
		expect([frame.lat, frame.lon]).toEqual([1, 2]);
	});
});

describe("hasOwn", () => {
	test("accepts own keys only", () => {
		expect(hasOwn({ a: 1 }, "a")).toBe(true);
		expect(hasOwn({}, "toString")).toBe(false);
		expect(hasOwn(new Widget(), "label")).toBe(false);
		expect(hasOwn(new Widget(), "id")).toBe(true);
	});

	test("is not fooled by an object that shadows hasOwnProperty", () => {
		const hostile = { hasOwnProperty: () => true };
		expect(hasOwn(hostile, "nope")).toBe(false);
	});

	test("works on null-prototype dictionaries", () => {
		expect(hasOwn(nullProto, "a")).toBe(true);
		expect(hasOwn(nullProto, "b")).toBe(false);
	});
});

describe("hasOwnProperty", () => {
	test("reports own keys and ignores inherited ones", () => {
		expect(hasOwnProperty({ a: 1 }, "a")).toBe(true);
		expect(hasOwnProperty({}, "toString")).toBe(false);
		expect(hasOwnProperty(new Widget(), "label")).toBe(false);
	});

	test("agrees with hasOwn at runtime — it is the same delegation", () => {
		const target = { a: 1 };
		for (const key of ["a", "b", "toString"]) {
			expect(hasOwnProperty(target, key)).toBe(hasOwn(target, key));
		}
	});
});

describe("isKeyOf", () => {
	test("accepts own keys of the object", () => {
		const palette = { primary: 1, accent: 2 } as const;
		expect(isKeyOf(palette, "primary")).toBe(true);
		expect(isKeyOf(palette, "missing")).toBe(false);
	});

	test("rejects inherited keys so the narrowed index cannot lie", () => {
		const palette = { primary: 1 } as const;
		// `"toString" in palette` would be true; indexing it would hand back a
		// function where the type promised `1`.
		expect(isKeyOf(palette, "toString")).toBe(false);
	});

	test("makes the index safe", () => {
		const palette = { primary: 1, accent: 2 } as const;
		const name: string = "accent";
		expect(isKeyOf(palette, name) ? palette[name] : 0).toBe(2);
	});
});

describe("isOneOf", () => {
	test("accepts only the listed values", () => {
		const isLevel = isOneOf("debug", "info", "warn", "error");
		expect(isLevel("info")).toBe(true);
		expect(isLevel("trace")).toBe(false);
		expect(isLevel(null)).toBe(false);
	});

	test("uses SameValueZero, so NaN matches NaN and +0 matches -0", () => {
		expect(isOneOf(Number.NaN)(Number.NaN)).toBe(true);
		expect(isOneOf(0)(-0)).toBe(true);
	});

	test("compares objects by reference", () => {
		const a = { id: 1 };
		const isA = isOneOf(a);
		expect(isA(a)).toBe(true);
		expect(isA({ id: 1 })).toBe(false);
	});

	test("with no values accepts nothing", () => {
		expect(isOneOf()("anything")).toBe(false);
	});
});

describe("isInstanceOf", () => {
	test("narrows by constructor and composes into filter", () => {
		const isErrorInstance = isInstanceOf(Error);
		expect(isErrorInstance(new TypeError("x"))).toBe(true);
		expect(isErrorInstance("x")).toBe(false);
		expect([new Error("a"), "b", new Error("c")].filter(isErrorInstance)).toHaveLength(2);
	});

	test("accepts abstract base classes", () => {
		abstract class Base {
			public abstract run(): void;
		}
		class Impl extends Base {
			public run(): void {}
		}
		expect(isInstanceOf(Base)(new Impl())).toBe(true);
		expect(isInstanceOf(Base)({})).toBe(false);
	});

	test("fails across realms — the documented caveat", () => {
		expect(isInstanceOf(Map)(realm.map)).toBe(false);
		// ...which is exactly why isMap exists.
		expect(isMap(realm.map)).toBe(true);
	});
});

describe("isJsonPrimitive", () => {
	test("accepts the four JSON leaves", () => {
		expect(isJsonPrimitive(null)).toBe(true);
		expect(isJsonPrimitive("a")).toBe(true);
		expect(isJsonPrimitive(1)).toBe(true);
		expect(isJsonPrimitive(false)).toBe(true);
	});

	test("accepts NaN and Infinity, which stringify to null", () => {
		expect(isJsonPrimitive(Number.NaN)).toBe(true);
		expect(isJsonPrimitive(Number.POSITIVE_INFINITY)).toBe(true);
	});

	test("rejects undefined, bigint, symbol, and functions", () => {
		expect(isJsonPrimitive(undefined)).toBe(false);
		expect(isJsonPrimitive(1n)).toBe(false);
		expect(isJsonPrimitive(Symbol("s"))).toBe(false);
		expect(isJsonPrimitive(() => undefined)).toBe(false);
	});
});

describe("isJsonArray", () => {
	test("accepts arrays whose every element is JSON", () => {
		expect(isJsonArray([])).toBe(true);
		expect(isJsonArray([1, "a", null, { b: [] }])).toBe(true);
	});

	test("rejects arrays containing a non-JSON element", () => {
		expect(isJsonArray([() => undefined])).toBe(false);
		expect(isJsonArray([1n])).toBe(false);
		expect(isJsonArray([new Date()])).toBe(false);
	});

	test("rejects non-arrays", () => {
		expect(isJsonArray({ 0: 1, length: 1 })).toBe(false);
		expect(isJsonArray("[]")).toBe(false);
	});

	test("rejects sparse arrays, which do not round-trip through JSON", () => {
		// Array.prototype.every skips holes, so the naive implementation accepted
		// these. JSON.stringify(new Array(2)) is "[null,null]" — not a round-trip.
		expect(isJsonArray(new Array(2))).toBe(false);
		// biome-ignore lint/suspicious/noSparseArray: a hole is the value under test — replacing it with `undefined` would test a different array
		expect(isJsonArray(["a", , "c"])).toBe(false);
		expect(isJsonValue(new Array(2))).toBe(false);
	});
});

describe("isJsonObject", () => {
	test("accepts plain objects of JSON values and tolerates undefined members", () => {
		expect(isJsonObject({})).toBe(true);
		expect(isJsonObject({ a: 1, b: [null], c: { d: "x" } })).toBe(true);
		// JSON.stringify drops the key entirely, which is what the type models.
		expect(isJsonObject({ a: undefined })).toBe(true);
	});

	test("accepts a null-prototype dictionary", () => {
		expect(isJsonObject(nullProto)).toBe(true);
	});

	test("rejects non-plain objects and non-JSON members", () => {
		expect(isJsonObject(new Date())).toBe(false);
		expect(isJsonObject([])).toBe(false);
		expect(isJsonObject(new Widget())).toBe(false);
		expect(isJsonObject({ a: () => undefined })).toBe(false);
		expect(isJsonObject({ a: 1n })).toBe(false);
	});

	test("rejects a non-enumerable member that JSON.stringify would have dropped", () => {
		// Arrange: `JSON.stringify` ignores non-enumerable keys, so this object does
		// serialize cleanly — but a consumer holding a `JsonObject` reads `.hidden`
		// and gets a function back. The guard's promise is about property access,
		// not about serialization, so the sound answer is false.
		const hidden: Record<string, unknown> = { a: 1 };
		Object.defineProperty(hidden, "hidden", {
			value: () => undefined,
			enumerable: false,
		});

		expect(JSON.stringify(hidden)).toBe('{"a":1}');
		expect(isJsonObject(hidden)).toBe(false);
		// isJsonValue delegates here, so the correction propagates.
		expect(isJsonValue(hidden)).toBe(false);
	});

	test("accepts a non-enumerable member that is itself a JSON value", () => {
		const fine: Record<string, unknown> = { a: 1 };
		Object.defineProperty(fine, "hidden", { value: "ok", enumerable: false });
		expect(isJsonObject(fine)).toBe(true);
	});
});

describe("isJsonValue", () => {
	test("accepts a deeply nested round-trippable value", () => {
		const value = { a: [1, "b", null, { c: [true, {}] }], d: {} };
		expect(isJsonValue(value)).toBe(true);
		expect(isJsonValue(JSON.parse(JSON.stringify(value)))).toBe(true);
	});

	test("rejects anything JSON cannot represent, at any depth", () => {
		expect(isJsonValue(undefined)).toBe(false);
		expect(isJsonValue(() => undefined)).toBe(false);
		expect(isJsonValue({ a: { b: [Symbol("s")] } })).toBe(false);
		expect(isJsonValue({ a: { b: new Map() } })).toBe(false);
	});

	test("recurses without bound on a cyclic graph — the documented hazard", () => {
		const cyclic: Record<string, unknown> = {};
		cyclic.self = cyclic;
		expect(() => isJsonValue(cyclic)).toThrow(RangeError);
	});
});
