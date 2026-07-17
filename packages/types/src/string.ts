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
 * @fileoverview Template-literal string type utilities.
 *
 * @module @resq-systems/types/string
 *
 * Operating on string *types* (not values): trimming, splitting, joining, and
 * prefix/suffix predicates. Useful for typed key paths, structured log-prefix
 * or event-name schemes, and validating string-shaped configuration (e.g. a
 * host allow-list of `` `*.${string}` `` wildcards) at compile time.
 */

//#region Template-literal string types

type Whitespace = " " | "\t" | "\n" | "\r";

/** Remove leading whitespace from a string literal type. */
export type TrimLeft<S extends string> = S extends `${Whitespace}${infer R}` ? TrimLeft<R> : S;

/** Remove trailing whitespace from a string literal type. */
export type TrimRight<S extends string> = S extends `${infer R}${Whitespace}` ? TrimRight<R> : S;

/** Remove leading and trailing whitespace from a string literal type. */
export type Trim<S extends string> = TrimLeft<TrimRight<S>>;

/**
 * Split a string literal on a delimiter into a tuple of segments —
 * `Split<"a.b.c", ".">` is `["a", "b", "c"]`.
 */
export type Split<S extends string, D extends string> = S extends `${infer Head}${D}${infer Tail}`
	? [Head, ...Split<Tail, D>]
	: [S];

/**
 * Join a tuple of string literals with a delimiter —
 * `Join<["a", "b", "c"], ".">` is `"a.b.c"`.
 */
export type Join<T extends readonly string[], D extends string> = T extends readonly [
	infer Head extends string,
	...infer Rest extends string[],
]
	? Rest extends readonly []
		? Head
		: `${Head}${D}${Join<Rest, D>}`
	: "";

/** `true` when string literal `S` begins with `P`. */
export type StartsWith<S extends string, P extends string> = S extends `${P}${string}`
	? true
	: false;

/** `true` when string literal `S` ends with `P`. */
export type EndsWith<S extends string, P extends string> = S extends `${string}${P}` ? true : false;

/** Replace the **first** occurrence of `From` with `To` in `S`. */
export type Replace<S extends string, From extends string, To extends string> = From extends ""
	? S
	: S extends `${infer H}${From}${infer T}`
		? `${H}${To}${T}`
		: S;

/** Replace **every** occurrence of `From` with `To` in `S`. */
export type ReplaceAll<S extends string, From extends string, To extends string> = From extends ""
	? S
	: S extends `${infer H}${From}${infer T}`
		? `${H}${To}${ReplaceAll<T, From, To>}`
		: S;

/**
 * The "open literal union" idiom: a known set of string literals that still
 * accepts any other string, while preserving autocomplete for the known
 * members. `LiteralUnion<"development" | "production">` behaves like `string`
 * but suggests the two known values.
 */
export type LiteralUnion<Known extends string> = Known | (string & {});

/**
 * Parse a numeric string literal into a `number` literal type —
 * `ParseInt<"42">` is `42`. Resolves to `never` for non-numeric strings.
 */
export type ParseInt<S extends string> = S extends `${infer N extends number}` ? N : never;

//#endregion
