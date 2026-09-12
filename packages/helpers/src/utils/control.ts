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
 * @fileoverview Control-flow primitives — a `Result` discriminated union with
 * factories, exhaustiveness and truthiness assertions, and small promise helpers
 * (`promiseWithResolve`, `sleep`).
 *
 * @module @resq-systems/helpers/utils/control
 */

import { assertNever } from "@resq-systems/types";

//#region Types
/**
 * Represents a successful result containing a value.
 *
 * Interface for the success case of a Result type, containing the computed value.
 * Used in conjunction with ErrorResult to create a discriminated union for error handling.
 *
 * @example
 * ```ts
 * const success: OkResult<string> = { ok: true, value: 'Hello World' }
 * if (success.ok) {
 *   console.log(success.value) // 'Hello World'
 * }
 * ```
 * @deprecated Superseded by {@link success} / {@link failure} from
 * `@resq-systems/helpers` (the `{ success, value }` Result). Not a drop-in: the
 * discriminant is renamed `ok` → `success` when migrating. This parallel
 * `{ ok, value }` type is unused; removed in the next major.
 * @public
 */
export interface OkResult<T> {
	/** Discriminant marking the success branch; always `true`. Narrow on this to reach {@link value}. */
	readonly ok: true;
	readonly value: T;
}
/**
 * Represents a failed result containing an error.
 *
 * Interface for the error case of a Result type, containing the error information.
 * Used in conjunction with OkResult to create a discriminated union for error handling.
 *
 * @example
 * ```ts
 * const failure: ErrorResult<string> = { ok: false, error: 'Something went wrong' }
 * if (!failure.ok) {
 *   console.error(failure.error) // 'Something went wrong'
 * }
 * ```
 * @deprecated Superseded by {@link success} / {@link failure} from
 * `@resq-systems/helpers` (the `{ success, value }` Result). Not a drop-in: the
 * discriminant is renamed `ok` → `success` when migrating. This parallel
 * `{ ok, value }` type is unused; removed in the next major.
 * @public
 */
export interface ErrorResult<E> {
	/** Discriminant marking the failure branch; always `false`. Narrow on this to reach {@link error}. */
	readonly ok: false;
	readonly error: E;
}
/**
 * A discriminated union type for handling success and error cases.
 *
 * Represents either a successful result with a value or a failed result with an error.
 * This pattern provides type-safe error handling without throwing exceptions. The
 * {@link OkResult.ok | ok} property is the discriminant: `true` selects the
 * {@link OkResult} variant (read `value`), `false` the {@link ErrorResult}
 * variant (read `error`).
 *
 * @example
 * ```ts
 * function divide(a: number, b: number): Result<number, string> {
 *   if (b === 0) {
 *     return Result.err('Division by zero')
 *   }
 *   return Result.ok(a / b)
 * }
 *
 * const result = divide(10, 2)
 * if (result.ok) {
 *   console.log(`Result: ${result.value}`) // Result: 5
 * } else {
 *   console.error(`Error: ${result.error}`)
 * }
 * ```
 * @deprecated Superseded by {@link success} / {@link failure} from
 * `@resq-systems/helpers` (the `{ success, value }` Result). Not a drop-in: the
 * discriminant is renamed `ok` → `success` when migrating. This parallel
 * `{ ok, value }` type is unused; removed in the next major.
 * @public
 */
export type Result<T, E> = OkResult<T> | ErrorResult<E>;
//#endregion

//#region Public API
/**
 * Utility object for creating Result instances.
 *
 * Provides factory methods for creating OkResult and ErrorResult instances.
 * This is the preferred way to construct Result values for consistent structure.
 *
 * @example
 * ```ts
 * // Create success result
 * const success = Result.ok(42)
 * // success: OkResult<number> = { ok: true, value: 42 }
 *
 * // Create error result
 * const failure = Result.err('Invalid input')
 * // failure: ErrorResult<string> = { ok: false, error: 'Invalid input' }
 * ```
 * @deprecated Superseded by {@link success} / {@link failure} from
 * `@resq-systems/helpers`. Not a drop-in: the discriminant is renamed
 * `ok` → `success` when migrating. This parallel `{ ok, value }` Result factory
 * is unused; removed in the next major.
 * @public
 */
export const Result = {
	/**
	 * Create a successful result containing a value.
	 *
	 * @param value - The success value to wrap
	 * @returns An OkResult containing the value
	 */
	ok<T>(value: T): OkResult<T> {
		return { ok: true, value };
	},
	/**
	 * Create a failed result containing an error.
	 *
	 * @param error - The error value to wrap
	 * @returns An ErrorResult containing the error
	 */
	err<E>(error: E): ErrorResult<E> {
		return { ok: false, error };
	},

	/**
	 * Create a successful result containing an array of values.
	 *
	 * Short-circuits: iteration stops at the first {@link ErrorResult}, which is
	 * returned as-is (same reference), so later results are neither inspected nor
	 * collected. Values preserve input order.
	 *
	 * @param results - The array of results to wrap
	 * @returns An {@link OkResult} of all values in order, or the first
	 *   {@link ErrorResult} encountered.
	 */
	all<T, E>(results: readonly Result<T, E>[]): Result<T[], E> {
		const values: T[] = [];
		for (const result of results) {
			if (!result.ok) return result;
			values.push(result.value);
		}
		return { ok: true, value: values };
	},
};

/**
 * Throws an error for unhandled switch cases in exhaustive switch statements.
 *
 * Utility function to ensure exhaustive handling of discriminated unions in switch
 * statements. When called, it indicates a programming error where a case was not handled.
 * The TypeScript 'never' type ensures this function is only reachable if all cases aren't covered.
 *
 * Delegates the actual throw to `@resq-systems/types` `assertNever`, the single
 * source of truth for exhaustiveness enforcement, while preserving this
 * helper's original `Unknown switch case ...` message (including the optional
 * `property` extraction) for backward compatibility.
 *
 * @param value - The unhandled value (typed as 'never' for exhaustiveness checking)
 * @param property - Optional property name to extract from the value for better error messages
 * @returns Never returns (always throws)
 * @throws {Error} Always — reaching this at runtime means a union member went
 *   unhandled. The message is `Unknown switch case <value>` (or the extracted
 *   `property` when provided and present on an object `value`).
 *
 * @example
 * ```ts
 * type Shape = 'circle' | 'square' | 'triangle'
 *
 * function getArea(shape: Shape): number {
 *   switch (shape) {
 *     case 'circle': return Math.PI * 5 * 5
 *     case 'square': return 10 * 10
 *     case 'triangle': return 0.5 * 10 * 8
 *     default: return exhaustiveSwitchError(shape)
 *   }
 * }
 * ```
 * @internal
 */
export function exhaustiveSwitchError(value: never, property?: string): never {
	const debugValue =
		property && value && typeof value === "object" && property in value ? value[property] : value;
	return assertNever(value, `Unknown switch case ${debugValue}`);
}

/**
 * `assert` and `assertExists` now live in `@resq-systems/types/narrow` and are
 * re-exported here unchanged. Both were ported byte-for-byte, quirks included,
 * so that this is a pure move rather than a behavior change:
 *
 * - `assert` throws a plain `Error` — deliberately **not** the package's
 *   `NarrowError` subclass, which would change `err.name` and break any
 *   existing `instanceof` or name check. Its message is
 *   `message || "Assertion Error"`, so an empty-string message still falls back,
 *   and its test is falsy rather than nullish.
 * - `assertExists` keeps the loose `value == null` check (so `0`, `""`, and
 *   `false` pass), the `message ?? "value must be defined"` default, a plain
 *   `Error`, and a `NonNullable<T>` return.
 *
 * Both still strip their own frame from the stack on V8. Declaring `assert` as a
 * function rather than an annotated const also makes its `asserts` narrowing
 * robust in consumer code, and `assertExists` is now a real generic instead of
 * one collapsed by the old `omitFromStackTrace` wrapper — neither is observable
 * as a break.
 *
 * New code should prefer `invariant` and `ensureDefined` from
 * `@resq-systems/types`, which throw a structured `NarrowError`.
 *
 * @internal
 */
export { assert, assertExists } from "@resq-systems/types/narrow";

/**
 * Create a Promise with externally accessible resolve and reject functions.
 *
 * Creates a Promise along with its resolve and reject functions exposed as
 * properties on the returned object. This allows external code to control when the
 * Promise resolves or rejects, useful for coordination between async operations.
 *
 * @returns A Promise object with additional resolve and reject methods
 *
 * @example
 * ```ts
 * const deferred = promiseWithResolve<string>()
 *
 * // Set up the promise consumer
 * deferred.then(value => console.log(`Resolved: ${value}`))
 * deferred.catch(error => console.error(`Rejected: ${error}`))
 *
 * // Later, resolve from external code
 * setTimeout(() => {
 *   deferred.resolve('Hello World')
 * }, 1000)
 * ```
 * @internal
 */
export function promiseWithResolve<T>(): Promise<T> & {
	resolve(value: T): void;
	reject(reason?: unknown): void;
} {
	let resolve: (value: T) => void;
	let reject: (reason?: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return Object.assign(promise, {
		resolve: resolve!,
		reject: reject!,
	});
}

/**
 * Create a Promise that resolves after a specified delay.
 *
 * Utility function for introducing delays in async code. Returns a Promise
 * that resolves with undefined after the specified number of milliseconds. Useful for
 * implementing timeouts, rate limiting, or adding delays in testing scenarios.
 *
 * Schedules a `setTimeout` (touches the clock). There is no cancellation hook —
 * the returned promise always resolves, never rejects, and honours no
 * `AbortSignal`; the underlying timer cannot be cleared by the caller.
 *
 * @param ms - The delay in milliseconds
 * @returns A Promise that resolves after the specified delay
 *
 * @example
 * ```ts
 * async function delayedOperation() {
 *   console.log('Starting...')
 *   await sleep(1000) // Wait 1 second
 *   console.log('Done!')
 * }
 *
 * // Can also be used with .then()
 * sleep(500).then(() => {
 *   console.log('Half second has passed')
 * })
 * ```
 * @internal
 */
export function sleep(ms: number): Promise<void> {
	// eslint-disable-next-line no-restricted-globals
	return new Promise((resolve) => setTimeout(resolve, ms));
}
//#endregion
