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

/**
 * @fileoverview Value guards and cloning — `isDefined`/`isNonNull`/`isNonNullish`
 * narrowing type guards and a `structuredClone` with a JSON fallback for older
 * runtimes.
 *
 * @module @resq-systems/helpers/utils/value
 */

/**
 * Get whether a value is not undefined.
 *
 * @param value - The value to check.
 * @returns True if the value is not undefined, with proper type narrowing.
 * @example
 * ```ts
 * const maybeString: string | undefined = getValue()
 *
 * if (isDefined(maybeString)) {
 *   // TypeScript knows maybeString is string, not undefined
 *   console.log(maybeString.toUpperCase())
 * }
 *
 * // Filter undefined values from arrays
 * const values = [1, undefined, 2, undefined, 3]
 * const definedValues = values.filter(isDefined) // [1, 2, 3]
 * ```
 * @public
 */
export function isDefined<T>(value: T): value is Exclude<T, undefined> {
	return value !== undefined;
}

/**
 * Get whether a value is not null.
 *
 * @param value - The value to check.
 * @returns True if the value is not null, with proper type narrowing.
 * @example
 * ```ts
 * const maybeString: string | null = getValue()
 *
 * if (isNonNull(maybeString)) {
 *   // TypeScript knows maybeString is string, not null
 *   console.log(maybeString.length)
 * }
 *
 * // Filter null values from arrays
 * const values = ["a", null, "b", null, "c"]
 * const nonNullValues = values.filter(isNonNull) // ["a", "b", "c"]
 * ```
 * @public
 */
export function isNonNull<T>(value: T): value is Exclude<T, null> {
	return value !== null;
}

/**
 * Get whether a value is not nullish (not null and not undefined).
 *
 * @param value - The value to check.
 * @returns True if the value is neither null nor undefined, with proper type narrowing.
 * @example
 * ```ts
 * const maybeString: string | null | undefined = getValue()
 *
 * if (isNonNullish(maybeString)) {
 *   // TypeScript knows maybeString is string, not null or undefined
 *   console.log(maybeString.charAt(0))
 * }
 *
 * // Filter nullish values from arrays
 * const values = ["hello", null, "world", undefined, "!"]
 * const cleanValues = values.filter(isNonNullish) // ["hello", "world", "!"]
 * ```
 * @public
 */
export function isNonNullish<T>(value: T): value is Exclude<T, null | undefined> {
	return value !== null && value !== undefined;
}

type MaybeStructuredClone = { structuredClone?: <T>(value: T) => T };

function getStructuredClone(): [<T>(i: T) => T, boolean] {
	if (typeof globalThis !== "undefined" && (globalThis as MaybeStructuredClone).structuredClone) {
		return [globalThis.structuredClone as <T>(i: T) => T, true];
	}

	if (typeof global !== "undefined" && (global as MaybeStructuredClone).structuredClone) {
		return [global.structuredClone as <T>(i: T) => T, true];
	}

	if (typeof window !== "undefined" && (window as MaybeStructuredClone).structuredClone) {
		return [window.structuredClone as <T>(i: T) => T, true];
	}

	return [<T>(i: T): T => (i ? (JSON.parse(JSON.stringify(i)) as T) : i), false];
}

const _structuredClone = getStructuredClone();

/**
 * Create a deep copy of a value. Uses the structuredClone API if available, otherwise uses JSON.parse(JSON.stringify()).
 *
 * The two backends are **not** equivalent, and which one is active is fixed at
 * module load (see {@link isNativeStructuredClone}):
 * - Native: preserves `Date`, `Map`, `Set`, `ArrayBuffer`, cyclic references, etc.
 * - JSON fallback: only round-trips JSON-representable data — `Date` becomes a
 *   string, `Map`/`Set`/functions/`undefined` are dropped, and a falsy input is
 *   returned as-is without copying. The example below is faithful under the native
 *   backend; under the fallback the `date` field would come back as a string.
 *
 * @param i - The value to clone.
 * @returns A deep copy of the input value.
 * @throws {DataCloneError} (native backend) if `i` holds a non-cloneable value
 *   such as a function or symbol.
 * @throws {TypeError} (JSON fallback) if `i` contains a circular reference or a
 *   `BigInt`, since `JSON.stringify` cannot serialize either.
 * @example
 * ```ts
 * const original = { a: 1, b: { c: 2 } }
 * const copy = structuredClone(original)
 *
 * copy.b.c = 3
 * console.log(original.b.c) // 2 (unchanged)
 * console.log(copy.b.c) // 3
 *
 * // Works with complex objects
 * const complexObject = {
 *   date: new Date(),
 *   array: [1, 2, 3],
 *   nested: { deep: { value: "test" } }
 * }
 * const cloned = structuredClone(complexObject)
 * ```
 * @public
 */
export const structuredClone = _structuredClone[0];

/**
 * Whether the current environment has native structuredClone support.
 *
 * Resolved once at module load. When `false`, {@link structuredClone} uses the
 * JSON fallback with all its limitations (no `Date`/`Map`/`Set`/functions, throws
 * on cycles and `BigInt`) — branch on this when clone fidelity matters.
 *
 * @returns True if using native structuredClone, false if using JSON fallback.
 * @internal
 */
export const isNativeStructuredClone = _structuredClone[1];

/**
 * The prototype object used by structuredClone for cloned objects.
 * When we patch structuredClone in jsdom for testing (see https://github.com/jsdom/jsdom/issues/3363),
 * the Object that is used as a prototype for the cloned object is not the same as the Object in
 * the code under test (that comes from jsdom's fake global context). This constant is used in
 * our code to work around this case.
 *
 * This is also the case for Array prototype, but that problem can be worked around with an
 * Array.isArray() check.
 * @internal
 */
export const STRUCTURED_CLONE_OBJECT_PROTOTYPE = Object.getPrototypeOf(structuredClone({}));
