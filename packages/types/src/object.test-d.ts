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
 * @fileoverview Type-level tests for the `object.ts` additions
 * (`NoExcessProperties`, `RequiredKeys`, `OptionalKeys`). Every `Expect<...>`
 * line is a compile-time assertion — this file failing to type-check IS the test
 * failure. Run via `vitest --typecheck` (wired into this package's `test`
 * script).
 *
 * `object.ts` is 100% type-level, so there is no companion `object.test.ts`:
 * there is no runtime behavior to exercise. Same arrangement as `logic.ts`.
 *
 * The assertions use `Equal` rather than assignability throughout. For a key-set
 * type that distinction is the whole point: `"a" extends string` passes for a
 * widened result and would hide exactly the regression these tests exist to
 * catch. The `NoExcessProperties` block is the one exception — its contract is
 * *rejection at a call site*, which only `@ts-expect-error` can express — so it
 * gets both: `Equal` on the shape, and real calls for the behavior.
 */

import { test } from "vitest";
import type { NoExcessProperties, OptionalKeys, RequiredKeys, Simplify } from "./object.js";
import type { Equal, Expect } from "./testing.js";

/** The empty object, spelled without a banned `{}` literal. */
type Empty = Record<never, never>;

declare const sym: unique symbol;

interface Config {
	readonly url: string;
	readonly retries?: number;
	readonly timeout: number | undefined;
}

// --- RequiredKeys / OptionalKeys: the base case -------------------------------
type _base = [
	Expect<Equal<RequiredKeys<{ a: string; b?: number }>, "a">>,
	Expect<Equal<OptionalKeys<{ a: string; b?: number }>, "b">>,
	// The declared-optional key is the only omissible one, even when a *required*
	// key's value type includes `undefined`. Under `exactOptionalPropertyTypes`
	// those are different types, and this is the assertion that pins it.
	Expect<Equal<RequiredKeys<Config>, "url" | "timeout">>,
	Expect<Equal<OptionalKeys<Config>, "retries">>,
	Expect<Equal<RequiredKeys<{ a: string | undefined }>, "a">>,
	Expect<Equal<OptionalKeys<{ a: string | undefined }>, never>>,
	// `a?: undefined` is optional: the key may be omitted entirely.
	Expect<Equal<RequiredKeys<{ a?: undefined }>, never>>,
	Expect<Equal<OptionalKeys<{ a?: undefined }>, "a">>,
];

// --- The partition law --------------------------------------------------------
// The pair must split `keyof T` exactly: their union is the whole key set, and
// their intersection is empty. Stated once as a law and then exercised over a
// fixed matrix of shapes rather than one happy path, because a one-sided bug — a
// key claimed by both halves, or by neither — is invisible in any single
// assertion.
//
// The law is a bare tuple of `Equal` results, not of `Expect`s: a generic alias
// body is constraint-checked at its *declaration*, where `T` is still abstract,
// so an inline `Expect` would resolve to `boolean` and fail to compile. Asserting
// `Equal<PartitionLaw<X>, [true, true]>` at each concrete `X` defers the check to
// instantiation, which is where it means something.
type PartitionLaw<T> = [
	Equal<RequiredKeys<T> | OptionalKeys<T>, keyof T>,
	Equal<Extract<RequiredKeys<T>, OptionalKeys<T>>, never>,
];

type Holds = [true, true];

type _partition = [
	Expect<Equal<PartitionLaw<Empty>, Holds>>,
	Expect<Equal<PartitionLaw<{ a: 1 }>, Holds>>,
	Expect<Equal<PartitionLaw<{ a?: 1 }>, Holds>>,
	Expect<Equal<PartitionLaw<{ a: 1; b?: 2 }>, Holds>>,
	Expect<Equal<PartitionLaw<{ a?: 1; b?: 2; c: 3; d: 4 }>, Holds>>,
	Expect<Equal<PartitionLaw<{ readonly a?: 1; readonly b: 2 }>, Holds>>,
	Expect<Equal<PartitionLaw<{ a: string | undefined; b?: string }>, Holds>>,
	Expect<Equal<PartitionLaw<{ [sym]: number; b?: 1 }>, Holds>>,
	Expect<Equal<PartitionLaw<{ [k: number]: number }>, Holds>>,
	Expect<Equal<PartitionLaw<Config>, Holds>>,
];

// The one shape where the covering half of the law does NOT hold, pinned so it
// stays a known, documented fact rather than a surprise. `keyof` a *string* index
// signature is `string | number` — TypeScript admits the numeric alias of the same
// slot — while the optional half reports `string` only. The disjointness half
// still holds. Nothing is double-counted; the key set is simply wider than the
// two halves, so do not read `RequiredKeys<T> | OptionalKeys<T>` as a drop-in for
// `keyof T` on an index-signature type.
type _partitionExceptions = [
	Expect<Equal<keyof { [k: string]: number }, string | number>>,
	Expect<
		Equal<RequiredKeys<{ [k: string]: number }> | OptionalKeys<{ [k: string]: number }>, string>
	>,
	Expect<
		Equal<
			Extract<RequiredKeys<{ [k: string]: number }>, OptionalKeys<{ [k: string]: number }>>,
			never
		>
	>,
	Expect<Equal<PartitionLaw<{ [k: string]: number }>, [false, true]>>,
];

// --- Edge cases ---------------------------------------------------------------
type _edges = [
	// Empty object: both halves are empty, and neither invents a key.
	Expect<Equal<RequiredKeys<Empty>, never>>,
	Expect<Equal<OptionalKeys<Empty>, never>>,
	// `never` has no keys at all.
	Expect<Equal<RequiredKeys<never>, never>>,
	Expect<Equal<OptionalKeys<never>, never>>,
	// NOT distributive: `keyof (A | B)` is the intersection of the key sets, so a
	// union of disjoint shapes has no common keys and both halves are empty.
	Expect<Equal<RequiredKeys<{ a: 1 } | { b: 2 }>, never>>,
	Expect<Equal<OptionalKeys<{ a: 1 } | { b?: 2 }>, never>>,
	// A union of identical members behaves like the single member.
	Expect<Equal<OptionalKeys<{ a: string; b?: number } | { a: string; b?: number }>, "b">>,
	// An intersection is read through, as it would be for `keyof`.
	Expect<Equal<RequiredKeys<{ a: 1 } & { b?: 2 }>, "a">>,
	Expect<Equal<OptionalKeys<{ a: 1 } & { b?: 2 }>, "b">>,
	// `readonly` is orthogonal to optionality — it must not shift a key.
	Expect<Equal<RequiredKeys<{ readonly a?: 1; readonly b: 2 }>, "b">>,
	Expect<Equal<OptionalKeys<{ readonly a?: 1; readonly b: 2 }>, "a">>,
	// Symbol keys survive; the result is the `unique symbol`, not `symbol`.
	Expect<Equal<RequiredKeys<{ [sym]: number; b?: 1 }>, typeof sym>>,
	Expect<Equal<OptionalKeys<{ [sym]: number; b?: 1 }>, "b">>,
	// An index signature lands in the OPTIONAL half: the empty object satisfies it
	// through TypeScript's implicit-index-signature rule, so no *specific* key of
	// such a type is ever mandatory. Documented as a gotcha; pinned here because
	// the intuitive guess is the opposite.
	Expect<Equal<RequiredKeys<{ [k: string]: number }>, never>>,
	Expect<Equal<OptionalKeys<{ [k: string]: number }>, string>>,
	Expect<Equal<RequiredKeys<{ [k: number]: number }>, never>>,
	Expect<Equal<OptionalKeys<{ [k: number]: number }>, number>>,
];

// --- Derivations the docs promise --------------------------------------------
type _derived = [
	Expect<Equal<Pick<Config, OptionalKeys<Config>>, { readonly retries?: number }>>,
	Expect<Equal<Required<Pick<Config, OptionalKeys<Config>>>, { readonly retries: number }>>,
	Expect<
		Equal<
			Pick<Config, RequiredKeys<Config>>,
			{ readonly url: string; readonly timeout: number | undefined }
		>
	>,
];

// --- NoExcessProperties: shape ------------------------------------------------
type _excessShape = [
	// With no extra keys the second half is `Record<never, never>`, so the result
	// is `T` intersected with the empty object — mutually assignable with `T`, but
	// deliberately NOT `Equal` to it. `Simplify` is what flattens it.
	Expect<
		Equal<
			NoExcessProperties<{ a: number }, { a: number }>,
			{ a: number } & Readonly<Record<never, never>>
		>
	>,
	Expect<Equal<Simplify<NoExcessProperties<{ a: number }, { a: number }>>, { a: number }>>,
	// Every key of `U` that `T` does not declare is typed `never`.
	Expect<
		Equal<
			NoExcessProperties<{ a: number }, { a: number; c: boolean }>,
			{ a: number } & Readonly<Record<"c", never>>
		>
	>,
	// Keys that `T` declares are never forbidden, whether required or optional.
	Expect<
		Equal<
			NoExcessProperties<{ a: number; b?: string }, { a: number; b: string }>,
			{ a: number; b?: string } & Readonly<Record<never, never>>
		>
	>,
];

// --- NoExcessProperties: the behavior, at a real call site --------------------
// The type is inert outside the F-bounded position; these calls are the only
// thing that proves it actually rejects.
type Options = { readonly retries: number; readonly timeoutMs?: number };
declare function configure<const U extends NoExcessProperties<Options, U>>(options: U): void;

function _excessBehavior(): void {
	// Required key only.
	configure({ retries: 3 });
	// Required plus the declared optional key.
	configure({ retries: 3, timeoutMs: 50 });
	// @ts-expect-error - `timoutMs` is a typo, not a declared option
	configure({ retries: 3, timoutMs: 50 });
	// @ts-expect-error - the required key is still required
	configure({ timeoutMs: 50 });
	// @ts-expect-error - a declared key with the wrong value type is still rejected
	configure({ retries: "3" });
}

test("type-level assertions compile", () => {
	// The assertions above are enforced by the typechecker; if any Expect<...>
	// resolved to a non-`true` type, this file would fail to compile and
	// `vitest --typecheck` would report it. Referencing the tuples here keeps them
	// "used" without exporting from a test file.
	type _all = [_base, _partition, _partitionExceptions, _edges, _derived, _excessShape];
	const _assertions: _all | undefined = undefined;
	void _assertions;
	void _excessBehavior;
});
