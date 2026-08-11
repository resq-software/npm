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
 * @module @resq-systems/types/object
 *
 * The built-in `Readonly` / `Partial` / `Required` are one level deep. For
 * frozen configuration, crypto parameter bags, immutable snapshots, and
 * discriminated config unions you usually want the recursive variants — and a
 * way to express "exactly one of these keys" that the platform does not provide.
 */

//#region Shallow helpers

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

//#endregion

//#region Deep helpers

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

//#endregion

//#region Derivation & combination

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

//#endregion

//#region Key sets & excess-property control

/**
 * The empty object type, isolated behind an alias so the one lint suppression it
 * needs lives at exactly one site. Used as the "requires no key at all" probe by
 * {@link RequiredKeys} and {@link OptionalKeys}.
 *
 * @internal
 */
// biome-ignore lint/complexity/noBannedTypes: `{}` is load-bearing here — it is the only shape that asks "can this property be omitted entirely?", which is exactly how an optional key is told apart from a required one.
type EmptyShape = {};

/**
 * Forbid keys that `T` does not declare, by typing every extra key of the
 * candidate `U` as `never`.
 *
 * **When to use**
 *
 * Use it on a generic factory, builder, or client constructor that takes an
 * options bag. TypeScript's excess-property check fires only when a *fresh
 * object literal* is assigned to a **known** type; the moment that bag flows
 * through a type parameter the check evaporates and a typo'd key is silently
 * accepted. This puts the check back.
 *
 * **Details**
 *
 * It is only meaningful in the self-referential (F-bounded) position
 * `<const U extends NoExcessProperties<Shape, U>>`. `U` is inferred from the
 * literal at the call site and then fed back in, so `Exclude<keyof U, keyof T>`
 * names precisely the keys the caller invented. Declared optional keys of `T`
 * stay optional, and when `U` has no extra keys the extra half is
 * `Record<never, never>` — an intersection with the empty object, i.e. `T`
 * unchanged. Writing `NoExcessProperties<A, B>` for two *fixed* types is legal
 * but pointless: nothing infers `U`, so nothing is rejected that a plain `A`
 * would not already reject.
 *
 * **Gotchas**
 *
 * It rejects the extra key rather than removing it, so the diagnostic lands on
 * that property as "not assignable to type `never`" — accurate, but it reads
 * oddly the first time. It constrains only the *key set*: use it together with
 * the shape, never instead of it. The result is a live intersection, not a
 * flattened object — `NoExcessProperties<{ a: number }, { a: number }>` is
 * `{ a: number } & Readonly<Record<never, never>>`, which is *mutually
 * assignable* with `{ a: number }` but not `Equal` to it. Wrap it in
 * {@link Simplify} when the hover text matters.
 *
 * **Example** (Rejecting a typo'd option that passes through a generic factory)
 *
 * ```ts
 * type Options = { readonly retries: number; readonly timeoutMs?: number };
 *
 * declare function configure<const U extends NoExcessProperties<Options, U>>(options: U): void;
 *
 * configure({ retries: 3 });                 // ✓
 * configure({ retries: 3, timeoutMs: 50 });  // ✓
 * configure({ retries: 3, timoutMs: 50 });   // ✗ — `timoutMs` is not an option
 * ```
 *
 * @typeParam T - The permitted shape.
 * @typeParam U - The candidate type, normally inferred from the call site.
 *
 * @see {@link Without} — the same "these keys must be absent" device, used to build {@link XOR}.
 * @see {@link RequireExactlyOne} when the keys are all known and the rule is mutual exclusion.
 * @category utility types
 * @since 0.2.0
 */
export type NoExcessProperties<T, U> = T & Readonly<Record<Exclude<keyof U, keyof T>, never>>;

/**
 * The union of the keys of `T` that must be present — every key declared without
 * a `?` modifier.
 *
 * **When to use**
 *
 * Use it when you need the *set* of required keys as a type: to build a
 * "supply at least these" parameter, to split a config into its mandatory and
 * optional halves, or to assert in a type test that a refactor did not quietly
 * make a field optional. `IsOptionalKey` in `@resq-systems/types/logic` answers
 * the same question one key at a time; this is the whole set at once.
 *
 * **Details**
 *
 * The `-?` in the mapped type strips optionality before the probe runs, so
 * `EmptyShape extends Pick<T, K>` is decided by the *original* declaration
 * rather than by a modifier the mapped type re-applied. Under this package's
 * `exactOptionalPropertyTypes` the distinction is sharp: `{ a?: string }` may
 * omit the key, `{ a: string | undefined }` must supply it explicitly, and they
 * are not the same type.
 *
 * **Gotchas**
 *
 * Not distributive over a union — `keyof (A | B)` is the *intersection* of the
 * two key sets, so `RequiredKeys<{ a: 1 } | { b: 2 }>` is `never`. Distribute
 * first if that is not what you want.
 *
 * An index signature is reported as **optional**, never required:
 * `RequiredKeys<{ [k: string]: number }>` is `never` and
 * `OptionalKeys<{ [k: string]: number }>` is `string`. That follows from the
 * probe — the empty object type satisfies an index signature through TypeScript's
 * implicit-index-signature rule — and it is the right answer, since no *specific*
 * key of such a type is ever mandatory.
 *
 * Both are meant for object types. On an array or tuple, `keyof T` also carries
 * `length` and every `Array.prototype` member, so the answer is not the
 * positional key set you would expect; reach for `Length` from
 * `collection.ts` when what you actually want is tuple arity.
 *
 * **Example** (Splitting a config into its mandatory and optional halves)
 *
 * ```ts
 * interface Config {
 * 	readonly url: string;
 * 	readonly retries?: number;
 * 	readonly timeout: number | undefined;
 * }
 *
 * type Mandatory = RequiredKeys<Config>; // "url" | "timeout"
 * type Defaults = Pick<Config, OptionalKeys<Config>>; // { readonly retries?: number }
 * ```
 *
 * @typeParam T - The object type to partition.
 *
 * @see {@link OptionalKeys} — the other half of the partition.
 * @see {@link RequireAtLeastOne}
 * @see {@link RequireExactlyOne}
 * @category utility types
 * @since 0.2.0
 */
export type RequiredKeys<T> = {
	[K in keyof T]-?: EmptyShape extends Pick<T, K> ? never : K;
}[keyof T];

/**
 * The union of the keys of `T` that may be omitted — every key declared with a
 * `?` modifier.
 *
 * **When to use**
 *
 * Use it as the complement of {@link RequiredKeys}: to type a defaults object
 * (`Required<Pick<T, OptionalKeys<T>>>`), to prove a key really is omissible, or
 * to drive a "which of these did the caller actually pass" mapped type.
 *
 * **Details**
 *
 * Identical machinery to {@link RequiredKeys} with the two branches swapped, so
 * for any ordinary object type the pair partitions `keyof T` exactly — no key is
 * reported by both, and none by neither. The one documented exception is a
 * *string* index signature: `keyof { [k: string]: number }` is `string | number`
 * (TypeScript admits the numeric alias of the same slot) while the optional half
 * reports `string` alone, so the two halves cover less than `keyof T`. They are
 * still disjoint. Do not treat the union of the halves as a drop-in for `keyof T`
 * on an index-signature type.
 *
 * **Gotchas**
 *
 * All of {@link RequiredKeys}' gotchas apply unchanged — no distribution over a
 * union, index signatures land here rather than in {@link RequiredKeys}, and
 * arrays/tuples are out of scope. One more specific to this half: a *required*
 * key whose value type merely includes `undefined` is **not** optional under
 * `exactOptionalPropertyTypes`, so `OptionalKeys<{ a: string | undefined }>` is
 * `never`.
 *
 * **Example** (Typing a defaults bag)
 *
 * ```ts
 * interface Config {
 * 	readonly url: string;
 * 	readonly retries?: number;
 * 	readonly backoffMs?: number;
 * }
 *
 * type Omissible = OptionalKeys<Config>; // "retries" | "backoffMs"
 * type Defaults = Required<Pick<Config, OptionalKeys<Config>>>;
 * ```
 *
 * @typeParam T - The object type to partition.
 *
 * @see {@link RequiredKeys} — the other half of the partition.
 * @see {@link DeepPartial}
 * @category utility types
 * @since 0.2.0
 */
export type OptionalKeys<T> = {
	[K in keyof T]-?: EmptyShape extends Pick<T, K> ? K : never;
}[keyof T];

//#endregion
