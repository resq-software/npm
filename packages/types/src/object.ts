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
 * @fileoverview Deep and structural object utility types.
 *
 * The built-in `Readonly` / `Partial` / `Required` are one level deep. For
 * frozen configuration, crypto parameter bags, immutable snapshots, and
 * discriminated config unions you usually want the recursive variants — and a
 * way to express "exactly one of these keys" that the platform does not provide.
 */

/**
 * Non-recursively strip `readonly` from every property. The dual of the
 * built-in `Readonly`.
 */
export type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/**
 * Flatten intersections and mapped types into a single object literal so hover
 * tooltips and error messages show `{ a: 1; b: 2 }` instead of
 * `A & B & Omit<…>`. No effect on assignability — purely cosmetic, but it makes
 * complex branded/derived types readable.
 */
export type Simplify<T> = { [K in keyof T]: T[K] } & {};

/** The union of a type's property value types — `ValueOf<{ a: 1; b: 2 }>` is `1 | 2`. */
export type ValueOf<T> = T[keyof T];

/**
 * Strongly-typed `Object.entries` shape: the tuple union `[K, T[K]]` for each
 * own key, rather than `[string, unknown]`.
 */
export type Entries<T> = { [K in keyof T]: [K, T[K]] }[keyof T];

/**
 * Recursively mark every property (and array element, map/set member)
 * `readonly`. Functions are left intact. Ideal for `as const`-style frozen
 * configuration and immutable snapshots.
 */
export type DeepReadonly<T> = T extends (...args: never[]) => unknown
	? T
	: T extends ReadonlyMap<infer K, infer V>
		? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
		: T extends ReadonlySet<infer U>
			? ReadonlySet<DeepReadonly<U>>
			: T extends ReadonlyArray<infer U>
				? ReadonlyArray<DeepReadonly<U>>
				: T extends object
					? { readonly [K in keyof T]: DeepReadonly<T[K]> }
					: T;

/** Recursively strip `readonly` — the dual of {@link DeepReadonly}. */
export type DeepMutable<T> = T extends (...args: never[]) => unknown
	? T
	: T extends ReadonlyMap<infer K, infer V>
		? Map<DeepMutable<K>, DeepMutable<V>>
		: T extends ReadonlySet<infer U>
			? Set<DeepMutable<U>>
			: T extends ReadonlyArray<infer U>
				? Array<DeepMutable<U>>
				: T extends object
					? { -readonly [K in keyof T]: DeepMutable<T[K]> }
					: T;

/** Recursively make every property optional. */
export type DeepPartial<T> = T extends (...args: never[]) => unknown
	? T
	: T extends ReadonlyArray<infer U>
		? ReadonlyArray<DeepPartial<U>>
		: T extends object
			? { [K in keyof T]?: DeepPartial<T[K]> }
			: T;

/** Recursively make every property required (strip `?`). The dual of {@link DeepPartial}. */
export type DeepRequired<T> = T extends (...args: never[]) => unknown
	? T
	: T extends ReadonlyArray<infer U>
		? ReadonlyArray<DeepRequired<U>>
		: T extends object
			? { [K in keyof T]-?: DeepRequired<T[K]> }
			: T;

/**
 * Require **at least one** of the keys `K` of `T` (the rest stay optional).
 * Models "you must supply one of `apiKey` or `token`, and may supply both".
 */
export type RequireAtLeastOne<T, K extends keyof T = keyof T> = Omit<T, K> &
	{ [P in K]-?: Required<Pick<T, P>> & Partial<Pick<T, Exclude<K, P>>> }[K];

/**
 * Require **exactly one** of the keys `K` of `T` (the others become forbidden).
 * Models mutually-exclusive discriminated config, e.g. a rate limiter that
 * takes either a sync counter or an async counter but never both.
 */
export type RequireExactlyOne<T, K extends keyof T = keyof T> = Omit<T, K> &
	{ [P in K]-?: Required<Pick<T, P>> & { [Q in Exclude<K, P>]?: never } }[K];

/**
 * Shallow-merge `U` onto `T`: keys in both come from `U`, the result is
 * flattened. `Merge<{ a: 1; b: 2 }, { b: 3; c: 4 }>` is `{ a: 1; b: 3; c: 4 }`.
 */
export type Merge<T, U> = Simplify<Omit<T, keyof U> & U>;

/** Keep only the properties of `T` whose value type is assignable to `V`. */
export type PickByType<T, V> = {
	[K in keyof T as T[K] extends V ? K : never]: T[K];
};

/** Drop the properties of `T` whose value type is assignable to `V`. */
export type OmitByType<T, V> = {
	[K in keyof T as T[K] extends V ? never : K]: T[K];
};

/** Recursively remove `null` and `undefined` from every property. */
export type DeepNonNullable<T> = T extends (...args: never[]) => unknown
	? T
	: T extends object
		? { [K in keyof T]: DeepNonNullable<NonNullable<T[K]>> }
		: NonNullable<T>;

/**
 * Strip index signatures (`[k: string]` / `[k: number]`), keeping only the
 * explicitly-declared keys. Useful for turning a loose record back into a
 * closed shape before deriving a `keyof` union from it.
 */
export type RemoveIndexSignature<T> = {
	[K in keyof T as string extends K
		? never
		: number extends K
			? never
			: symbol extends K
				? never
				: K]: T[K];
};

/**
 * The keys of `T` that are absent from `U`, each typed `never` — the helper
 * behind {@link XOR}. Present only so the "forbidden" keys of one branch are
 * explicitly excluded in the other.
 */
export type Without<T, U> = { [K in Exclude<keyof T, keyof U>]?: never };

/**
 * Exclusive-or of two object types: a value matching `T` **or** `U` but never a
 * mix of both. Stronger than a plain union — it forbids the keys of the other
 * branch, so excess/mixed properties are a compile error. The two-type
 * counterpart of {@link RequireExactlyOne}.
 *
 * @example
 * ```ts
 * type ById = { id: string };
 * type ByEmail = { email: string };
 * declare function lookup(q: XOR<ById, ByEmail>): void;
 * lookup({ id: "1" });                 // ✓
 * lookup({ email: "a@b.com" });        // ✓
 * lookup({ id: "1", email: "a@b.com" }); // ✗ — can't be both
 * ```
 */
export type XOR<T, U> = T | U extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;
