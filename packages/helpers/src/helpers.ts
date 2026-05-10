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

import { Logger } from "@resq-sw/logger";

const logger = Logger.getLogger("[helpers]");

/**
 * Converts an object to a formatted JSON string with proper indentation.
 *
 * @param {object} obj - The object to convert to a JSON string
 * @returns {string} A properly formatted JSON string representation of the input object with 2-space indentation
 *
 * @example
 * ```ts
 * const obj = { name: "John", age: 30 };
 * const jsonString = Stringify(obj);
 * // Returns:
 * // {
 * //   "name": "John",
 * //   "age": 30
 * // }
 * ```
 *
 * @remarks
 * - Uses JSON.stringify() internally with null replacer and 2-space indent
 * - Handles circular references by throwing an error
 * - Preserves object structure and nesting
 * - Useful for debugging, logging, and data serialization
 * - Safe with primitives, arrays, objects, null and undefined
 */
export const Stringify = (obj: object): string => {
	return JSON.stringify(obj, null, 2);
};

/**
 * Constructs a fully qualified URL based on the current globalThis's location,
 * with an optional path.
 *
 * @param {string} [path=''] - Optional path to append to the base URL
 * @returns {string} Complete URL with proper formatting and protocol
 *
 * @example
 * ```ts
 * // Assuming current page is "http://localhost:5173/dashboard"
 * getURL("api/users") // Returns "http://localhost:5173/api/users"
 * getURL() // Returns "http://localhost:5173"
 *
 * // Assuming current page is "[https://example.com/products](https://example.com/products)"
 * getURL("test") // Returns "[https://example.com/test](https://example.com/test)"
 * ```
 *
 * @remarks
 * - Uses globalThis.location.origin as the base URL.
 * - Removes trailing slashes from base URL.
 * - Removes leading slashes from path.
 * - Handles empty/undefined path gracefully.
 * - Suitable for client-side contexts where the API/resource is on the same origin.
 * - NOT recommended for defining a fixed API base URL across environments or for server-side use.
 */
export const getURL = (path = ""): string => {
	let url = "";

	// Use the current globalThis's  origin as the base URL if available.
	// globalThis.location.origin includes the protocol, hostname, and port (e.g., "https://example.com:8080")
	if (typeof globalThis !== "undefined" && globalThis.location?.origin) {
		url = globalThis.location.origin;
	} else {
		// This function will not work correctly in a non-browser environment (e.g., during SSR or build processes)
		// where `globalThis` is not defined. We'll attempt to use environment variables for a more reliable default.
		const envBaseUrl =
			process?.env?.VITE_BASE_URL || process?.env?.NEXT_PUBLIC_BASE_URL || process?.env?.BASE_URL;

		if (envBaseUrl && typeof envBaseUrl === "string") {
			url = envBaseUrl;
		} else {
			logger.warn(
				"getURL: 'globalThis' is not defined and no environment base URL found. This function relies on client-side context. Returning empty string.",
			);
			return "";
		}
	}

	// Remove any trailing slashes from the base URL (globalThis.location.origin typically doesn't have one, but for consistency)
	url = url.replace(/\/+$/, "");

	// Remove any leading slashes from the path
	const sanitizedPath = path.replace(/^\/+/, "");

	// Combine the URL and path, ensuring a single slash in between if a path exists
	return sanitizedPath ? `${url}/${sanitizedPath}` : url;
};

/**
 * The success branch of a {@link Result}.
 *
 * @typeParam T - Type of the wrapped value.
 */
type Success<T> = {
	readonly success: true;
	readonly value: T;
};

/**
 * The failure branch of a {@link Result}.
 *
 * @typeParam E - Type of the wrapped error.
 */
type Failure<E> = {
	readonly success: false;
	readonly error: E;
};

/**
 * Discriminated union representing either a successful value or an error.
 * Discriminate with the `success` boolean field.
 *
 * @typeParam T - Type of the value on success.
 * @typeParam E - Type of the error on failure.
 *
 * @example
 * ```ts
 * function parsePort(raw: string): Result<number, string> {
 *   const n = Number(raw);
 *   return Number.isInteger(n) && n > 0 && n < 65536
 *     ? success(n)
 *     : failure(`invalid port: ${raw}`);
 * }
 *
 * const r = parsePort(process.env.PORT ?? "3000");
 * if (r.success) listen(r.value);
 * else console.error(r.error);
 * ```
 */
type Result<T, E> = Success<T> | Failure<E>;

/**
 * Wrap a value in a {@link Success} branch. The returned object is frozen
 * so consumers cannot mutate `success`/`value` after the fact.
 *
 * @param value - The value the operation produced.
 * @returns `{ success: true, value }` (frozen).
 */
export const success = <T>(value: T): Success<T> => Object.freeze({ success: true, value });

/**
 * Wrap an error in a {@link Failure} branch. The returned object is frozen
 * so consumers cannot mutate `success`/`error` after the fact.
 *
 * @param error - The error value (any type — typically `Error`, but can be
 *   a plain string, code, or domain-specific type).
 * @returns `{ success: false, error }` (frozen).
 */
export const failure = <E>(error: E): Failure<E> => Object.freeze({ success: false, error });

type ExtractAsyncArgs<Args extends Array<unknown>> =
	Args extends Array<infer PotentialArgTypes> ? [PotentialArgTypes] : [];

/**
 * Run an async function and convert thrown errors into a {@link Failure}
 * branch instead of rejecting the returned promise.
 *
 * Logs a structured `error` line via `@resq-sw/logger` whenever the inner
 * function throws — useful for keeping rejected paths visible in
 * production telemetry without forcing every caller to wrap a try/catch.
 *
 * Non-`Error` thrown values are coerced to `new Error(String(value))` so
 * the failure branch always carries a real `Error` instance with a stack.
 *
 * @param asyncFunction - The async function to invoke.
 * @param args - Arguments forwarded to `asyncFunction`.
 * @returns A `Result<T, Error>` resolving to `success(returnValue)` on
 *   resolve, or `failure(err)` on throw / reject.
 *
 * @example
 * ```ts
 * const r = await catchError(fetch, "/api/users");
 * if (r.success) handleResponse(r.value);
 * else logger.warn("fetch failed", r.error);
 * ```
 */
export const catchError = async <Args extends Array<unknown>, ReturnType>(
	asyncFunction: (...args: ExtractAsyncArgs<Args>) => Promise<ReturnType>,
	...args: ExtractAsyncArgs<Args>
): Promise<Result<ReturnType, Error>> => {
	try {
		const result = await asyncFunction(...args);
		return success(result);
	} catch (error) {
		logger.error("catchError", error);
		return failure(error instanceof Error ? error : new Error(String(error)));
	}
};

/**
 * Curried `Result` mapper. Apply a function to the value of a `Success`,
 * pass `Failure` through unchanged.
 *
 * @param fn - Pure transformation applied only to the success value.
 * @returns A function `Result<T, E> → Result<U, E>`.
 *
 * @example
 * ```ts
 * const doubled = map<number, number, string>((n) => n * 2)(success(21));
 * // → { success: true, value: 42 }
 *
 * map<number, number, string>((n) => n * 2)(failure("nope"));
 * // → { success: false, error: "nope" } (unchanged)
 * ```
 */
export const map =
	<T, U, E>(fn: (value: T) => U): ((result: Result<T, E>) => Result<U, E>) =>
	(result) =>
		result.success ? success(fn(result.value)) : result;

/**
 * Curried `Result` flatMap (also known as `chain` or `bind`). Like
 * {@link map} but the transformation itself returns a `Result`, allowing
 * fallible steps to be sequenced without nesting.
 *
 * @param fn - Result-returning step applied to the success value.
 * @returns A function `Result<T, E> → Result<U, E>`.
 *
 * @example
 * ```ts
 * const validateAge = (n: number): Result<number, string> =>
 *   n >= 0 && n < 150 ? success(n) : failure("out of range");
 *
 * bindResult(validateAge)(success(42)); // → success(42)
 * bindResult(validateAge)(success(-1)); // → failure("out of range")
 * ```
 */
export const bindResult =
	<T, U, E>(fn: (value: T) => Result<U, E>): ((result: Result<T, E>) => Result<U, E>) =>
	(result) =>
		result.success ? fn(result.value) : result;

/**
 * Compose up to five `Result`-returning steps over an input value,
 * short-circuiting on the first {@link Failure}.
 *
 * Each step receives the previous step's success value and may return a
 * new `Success` (continuing the pipeline) or a `Failure` (stopping it).
 * The first failure is returned verbatim — later steps are not invoked.
 *
 * @param input - Initial value piped into `fn1`.
 * @param functions - Up to five sequential transformations.
 * @returns Final `Result` from the last step that ran.
 *
 * @example
 * ```ts
 * railway(
 *   rawInput,
 *   parse,        // (raw) => Result<Parsed, ValidationError>
 *   normalize,    // (p)   => Result<Parsed, ValidationError>
 *   persist,      // (p)   => Result<Saved,  DatabaseError>
 * );
 * ```
 */
export function railway<TInput, T1, E>(
	input: TInput,
	fn1: (input: TInput) => Result<T1, E>,
): Result<T1, E>;
export function railway<TInput, T1, T2, E>(
	input: TInput,
	fn1: (input: TInput) => Result<T1, E>,
	fn2: (input: T1) => Result<T2, E>,
): Result<T2, E>;
export function railway<TInput, T1, T2, T3, E>(
	input: TInput,
	fn1: (input: TInput) => Result<T1, E>,
	fn2: (input: T1) => Result<T2, E>,
	fn3: (input: T2) => Result<T3, E>,
): Result<T3, E>;
export function railway<TInput, T1, T2, T3, T4, E>(
	input: TInput,
	fn1: (input: TInput) => Result<T1, E>,
	fn2: (input: T1) => Result<T2, E>,
	fn3: (input: T2) => Result<T3, E>,
	fn4: (input: T3) => Result<T4, E>,
): Result<T4, E>;
export function railway<TInput, T1, T2, T3, T4, T5, E>(
	input: TInput,
	fn1: (input: TInput) => Result<T1, E>,
	fn2: (input: T1) => Result<T2, E>,
	fn3: (input: T2) => Result<T3, E>,
	fn4: (input: T3) => Result<T4, E>,
	fn5: (input: T4) => Result<T5, E>,
): Result<T5, E>;
export function railway<TInput, TOutput, E>(
	input: TInput,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	...functions: Array<(input: any) => Result<any, E>>
): Result<TOutput, E> {
	return functions.reduce<Result<any, E>>(
		(result, fn) => (result.success ? fn(result.value) : result),
		success(input),
	) as Result<TOutput, E>;
}

/**
 * Curried error-recovery combinator. Applies `fn` to the error of a
 * {@link Failure}, optionally lifting the pipeline back to a `Success`
 * with a different success type. Pass `Success` through unchanged.
 *
 * @param fn - Recovery handler: takes the original error, returns a new
 *   `Result` (success-with-fallback or different failure).
 * @returns A function `Result<T, E1> → Result<T, E2>`.
 *
 * @example Fall back to a default
 * ```ts
 * const withFallback = recover<User, FetchError, never>((_err) =>
 *   success(GUEST_USER),
 * );
 * withFallback(failure(timeoutErr)); // → success(GUEST_USER)
 * ```
 */
export const recover =
	<T, E1, E2>(fn: (error: E1) => Result<T, E2>): ((result: Result<T, E1>) => Result<T, E2>) =>
	(result) =>
		result.success ? result : fn(result.error);

/**
 * Curried side-effect helper. On `Success`, invoke `fn(value)` for its
 * side effects and pass the result through unchanged. On `Failure`, do
 * nothing. The returned `Result` is identical to the input (same shape
 * and value identity).
 *
 * Useful for instrumentation, logging, or analytics events sprinkled
 * through a pipeline without breaking the chain.
 *
 * @param fn - Side-effect callback; its return value is discarded.
 * @returns A function `Result<T, E> → Result<T, E>` (same `Result`).
 *
 * @example
 * ```ts
 * pipe(
 *   parse(input),
 *   tap((parsed) => logger.debug("parsed", parsed)),
 *   bindResult(persist),
 * );
 * ```
 */
export const tap =
	<T, E>(fn: (value: T) => void): ((result: Result<T, E>) => Result<T, E>) =>
	(result) => {
		if (result.success) {
			fn(result.value);
		}
		return result;
	};

/**
 * Type guard: narrow `unknown` to `number`.
 *
 * Note: returns `true` for `NaN` (which is a `number`). Use
 * `Number.isFinite` afterward if you need to exclude it.
 *
 * @example
 * ```ts
 * if (isNumber(input)) input.toFixed(2);
 * ```
 */
export const isNumber = (value: unknown): value is number => typeof value === "number";

/**
 * Type guard: narrow `unknown` to `string`. Does not match `String`
 * object wrappers (`new String("x")`), only string primitives.
 *
 * @example
 * ```ts
 * if (isString(input)) input.toUpperCase();
 * ```
 */
export const isString = (value: unknown): value is string => typeof value === "string";

/**
 * Type guard: narrow `unknown` to a callable.
 *
 * Matches arrow functions, `function` declarations, classes, and
 * built-in callables. Use `isFunction` before invoking values pulled
 * from untrusted sources (e.g. dynamic imports, JSON-config).
 *
 * @example
 * ```ts
 * if (isFunction(handler)) handler(payload);
 * ```
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export const isFunction = (value: unknown): value is Function => typeof value === "function";

/**
 * Type guard: narrow `unknown` to a `PromiseLike` / `Promise`.
 *
 * Uses Promises/A+ duck-typing (presence of a callable `.then`) rather
 * than `instanceof Promise` so it works across realm boundaries
 * (iframes, workers) and with custom thenables.
 *
 * @example
 * ```ts
 * const v = maybeAsync();
 * const value = isPromise(v) ? await v : v;
 * ```
 */
export const isPromise = (value: unknown): value is Promise<unknown> =>
	!!value &&
	(typeof value === "object" || typeof value === "function") &&
	typeof (value as Promise<unknown>).then === "function";
