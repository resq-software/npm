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
 * @fileoverview Type-level tests for the union module. Every `Expect<...>` line
 * is a compile-time assertion — this file failing to type-check IS the test
 * failure. Run via `vitest --typecheck` (wired into this package's `test`
 * script).
 */

import { test } from "vitest";
import type { Equal, Expect, IsAny } from "./testing.js";
import {
	byTag,
	type DiscriminantKeys,
	type ExhaustiveHandlers,
	hasTag,
	isTagged,
	isTaggedWith,
	matchTag,
	matchTagPartial,
	type MemberByTag,
	type MemberByTagOr,
	type MembersWithoutTag,
	type PartialHandlers,
	type TaggedUnionOf,
	type TagMapOf,
	type TagValueOf,
} from "./union.js";

// --- fixtures -----------------------------------------------------------------
type Circle = { kind: "circle"; radius: number };
type Square = { kind: "square"; side: number };
type Rect = { kind: "rect"; w: number; h: number };
type Shape = Circle | Square | Rect;

/** A union whose second shared key holds a non-`PropertyKey` value. */
type WithObjectKey = { kind: "a"; meta: { z: 1 } } | { kind: "b"; meta: { z: 2 } };

/** A union whose second shared key is a boolean — not usable as a discriminant. */
type WithBooleanKey = { kind: "a"; ok: boolean } | { kind: "b"; ok: boolean };

/** Numeric tags are as legal as string tags. */
type Coded = { code: 1; a: string } | { code: 2; b: number };

declare const shape: Shape;
declare const shapes: Shape[];

// --- discriminant types -------------------------------------------------------
type _discriminants = [
	// Only the shared, PropertyKey-valued key qualifies — radius/side/w/h do not.
	Expect<Equal<DiscriminantKeys<Shape>, "kind">>,
	// An object-valued shared key is excluded...
	Expect<Equal<DiscriminantKeys<WithObjectKey>, "kind">>,
	// ...and so is a boolean-valued one; `boolean` cannot key a handler record.
	Expect<Equal<DiscriminantKeys<WithBooleanKey>, "kind">>,
	Expect<Equal<DiscriminantKeys<Coded>, "code">>,
	// A non-union object offers every PropertyKey-valued key.
	Expect<Equal<DiscriminantKeys<{ a: string; b: number; c: object }>, "a" | "b">>,
	Expect<Equal<TagValueOf<Shape, "kind">, "circle" | "square" | "rect">>,
	Expect<Equal<TagValueOf<Coded, "code">, 1 | 2>>,
	// A key no member carries yields no tags at all.
	Expect<Equal<TagValueOf<Shape, "missing">, never>>,
	Expect<Equal<MemberByTag<Shape, "kind", "circle">, Circle>>,
	Expect<Equal<MemberByTag<Shape, "kind", "rect">, Rect>>,
	// Selecting a tag that does not exist collapses to `never`, not to the union.
	Expect<Equal<MemberByTag<Shape, "kind", "hexagon">, never>>,
	// Selecting the whole tag union round-trips back to the union.
	Expect<Equal<MemberByTag<Shape, "kind", "circle" | "square" | "rect">, Shape>>,
	Expect<Equal<TagMapOf<Shape, "kind">["circle"], Circle>>,
	Expect<Equal<TagMapOf<Shape, "kind">["rect"], Rect>>,
	Expect<Equal<keyof TagMapOf<Shape, "kind">, "circle" | "square" | "rect">>,
];

// --- MembersWithoutTag --------------------------------------------------------
type _withoutTag = [
	// Peels exactly one arm and leaves the others intact.
	Expect<Equal<MembersWithoutTag<Shape, "kind", "circle">, Square | Rect>>,
	Expect<Equal<MembersWithoutTag<Shape, "kind", "rect">, Circle | Square>>,
	// `Exclude` distributes over `T`, so a union of tags peels every matching arm.
	Expect<Equal<MembersWithoutTag<Shape, "kind", "circle" | "square">, Rect>>,
	// ...and peeling one at a time is the same thing.
	Expect<
		Equal<
			MembersWithoutTag<MembersWithoutTag<Shape, "kind", "circle">, "kind", "square">,
			MembersWithoutTag<Shape, "kind", "circle" | "square">
		>
	>,
	// Removing every tag leaves nothing — the mirror of `MemberByTag`'s `never` floor.
	Expect<Equal<MembersWithoutTag<Shape, "kind", "circle" | "square" | "rect">, never>>,
	// A tag no member carries removes nothing.
	Expect<Equal<MembersWithoutTag<Shape, "kind", "hexagon">, Shape>>,
	// Neither does a key no member carries.
	Expect<Equal<MembersWithoutTag<Shape, "missing", "circle">, Shape>>,
	// `never` matches no member, so it too is a no-op rather than an emptying.
	Expect<Equal<MembersWithoutTag<Shape, "kind", never>, Shape>>,
	// Numeric tags behave identically — nothing here is string-specific.
	Expect<Equal<MembersWithoutTag<Coded, "code", 1>, { code: 2; b: number }>>,
	// A single-member "union" is peelable down to `never`.
	Expect<Equal<MembersWithoutTag<Circle, "kind", "circle">, never>>,
	// THE COMPLEMENT LAW: extract ∪ exclude reconstitutes the union, for a single
	// tag and for a union of tags alike.
	Expect<
		Equal<MemberByTag<Shape, "kind", "circle"> | MembersWithoutTag<Shape, "kind", "circle">, Shape>
	>,
	Expect<
		Equal<
			| MemberByTag<Shape, "kind", "circle" | "rect">
			| MembersWithoutTag<Shape, "kind", "circle" | "rect">,
			Shape
		>
	>,
	// ...and the two halves are disjoint: nothing survives both.
	Expect<
		Equal<MemberByTag<Shape, "kind", "circle"> & MembersWithoutTag<Shape, "kind", "circle">, never>
	>,
	// It is the complement of `MemberByTag`, not of `MemberByTagOr`: on a closed
	// union those agree, so the law holds through either spelling.
	Expect<
		Equal<
			MemberByTagOr<Shape, "kind", "circle"> | MembersWithoutTag<Shape, "kind", "circle">,
			Shape
		>
	>,
];

// --- handler records ----------------------------------------------------------
type CompleteHandlers = {
	circle: (m: Circle) => number;
	square: (m: Square) => number;
	rect: (m: Rect) => number;
};

type _handlers = [
	// Each arm is keyed by its tag and receives its own narrowed member.
	Expect<
		Equal<
			ExhaustiveHandlers<Shape, "kind", number>,
			{
				circle: (member: Circle) => number;
				square: (member: Square) => number;
				rect: (member: Rect) => number;
			}
		>
	>,
	// A complete record satisfies the exhaustive shape...
	Expect<
		Equal<CompleteHandlers extends ExhaustiveHandlers<Shape, "kind", number> ? true : false, true>
	>,
	// ...while an incomplete one does not.
	Expect<
		Equal<
			{ circle: (m: Circle) => number } extends ExhaustiveHandlers<Shape, "kind", number>
				? true
				: false,
			false
		>
	>,
	// The partial form accepts an empty record, which is exactly its purpose.
	Expect<
		Equal<Record<string, never> extends PartialHandlers<Shape, "kind", number> ? true : false, true>
	>,
	Expect<
		Equal<
			PartialHandlers<Shape, "kind", number>,
			Partial<ExhaustiveHandlers<Shape, "kind", number>>
		>
	>,
];

// --- TaggedUnionOf ------------------------------------------------------------
type BuiltEvent = TaggedUnionOf<"type", { click: { x: number; y: number }; key: { code: string } }>;
type BuiltOnKind = TaggedUnionOf<"kind", { circle: { radius: number } }>;

type _built = [
	// The tag property is woven in and the result is flat, not an intersection.
	Expect<
		Equal<BuiltEvent, { type: "click"; x: number; y: number } | { type: "key"; code: string }>
	>,
	// Any discriminant key works — `type` is not hardcoded.
	Expect<Equal<BuiltOnKind, { kind: "circle"; radius: number }>>,
	// Round-trip: a built union is still consumable by the rest of the module.
	Expect<Equal<TagValueOf<BuiltEvent, "type">, "click" | "key">>,
	Expect<Equal<MemberByTag<BuiltEvent, "type", "key">, { type: "key"; code: string }>>,
];

// --- guards -------------------------------------------------------------------
const isCircle = isTaggedWith("kind", "circle");
const byKind = byTag("kind");
const isRect = byKind("rect");
const isTimeout = isTagged("TimeoutError");

type TimeoutError = { readonly _tag: "TimeoutError"; readonly ms: number };
type HttpError = { readonly _tag: "HttpError"; readonly status: number };
declare const failures: readonly (TimeoutError | HttpError)[];
const timeouts = failures.filter(isTimeout);
const timeoutMemberOrNull = (e: TimeoutError | HttpError) => (isTimeout(e) ? e : null);

const circleOrNull = (s: Shape) => (isCircle(s) ? s : null);
const rectOrNull = (s: Shape) => (isRect(s) ? s : null);
const timeoutOrNull = (v: unknown) => (isTimeout(v) ? v : null);
const tagOrNull = (v: unknown) => (hasTag(v, "kind") ? v.kind : null);

const circles = shapes.filter(isCircle);
const rects = shapes.filter(isRect);

type _guards = [
	// The guard narrows to exactly the member — not to `Shape`, not to `any`.
	Expect<Equal<ReturnType<typeof circleOrNull>, Circle | null>>,
	Expect<Equal<IsAny<ReturnType<typeof circleOrNull>>, false>>,
	// A guard minted through the two-stage `byTag` narrows identically.
	Expect<Equal<ReturnType<typeof rectOrNull>, Rect | null>>,
	// The narrowing survives `filter`, so the array element type is the member.
	Expect<Equal<typeof circles, Circle[]>>,
	Expect<Equal<typeof rects, Rect[]>>,
	// `isTagged` narrows `unknown` to the Effect-style `_tag` shape.
	Expect<Equal<ReturnType<typeof timeoutOrNull>, { readonly _tag: "TimeoutError" } | null>>,
	// `hasTag` proves only that a usable tag is present, nothing more.
	Expect<Equal<ReturnType<typeof tagOrNull>, PropertyKey | null>>,
	// `isTagged` narrows a payload-carrying union to the member, not to the bare
	// `{ _tag }` shape — which `Array.prototype.filter` silently refuses to accept
	// as a narrowing callback, because it is not a subtype of the element type.
	Expect<Equal<typeof timeouts, TimeoutError[]>>,
	Expect<Equal<ReturnType<typeof timeoutMemberOrNull>, TimeoutError | null>>,
];

// --- guards over an open, non-literal tag shape -------------------------------
// The workflow `hasTag`'s own JSDoc recommends: enter from `unknown`, then mint a
// guard with `byTag`. `Extract` finds nothing in `Record<"kind", PropertyKey>`,
// so the naive `MemberByTag` collapsed to `never` — and `never` is assignable to
// everything, so every downstream check silently stopped checking.
declare const raw: unknown;
const isCircleTag = byTag("kind")("circle");

function openTagNarrowing(): unknown {
	if (!hasTag(raw, "kind")) {
		return null;
	}
	if (!isCircleTag(raw)) {
		return null;
	}
	return raw;
}

type _openTag = [
	Expect<Equal<MemberByTagOr<Shape, "kind", "circle">, Circle>>,
	// Not `never`: the honest statement is "still what it was, tag pinned to T".
	Expect<
		Equal<
			MemberByTagOr<Record<"kind", PropertyKey>, "kind", "circle">,
			Record<"kind", PropertyKey> & Record<"kind", "circle">
		>
	>,
	Expect<Equal<IsAny<ReturnType<typeof openTagNarrowing>>, false>>,
	// `MemberByTag` keeps its `never` floor — that behaviour is asserted above and
	// is correct for a named alias over a closed union.
	Expect<Equal<MemberByTag<Record<"kind", PropertyKey>, "kind", "circle">, never>>,
];

// --- matchTag -----------------------------------------------------------------
const uniform = matchTag(shape, "kind", {
	circle: (c) => c.radius,
	square: (q) => q.side,
	rect: (r) => r.w * r.h,
});

const mixed = matchTag(shape, "kind", {
	circle: (c) => c.radius,
	square: (q) => `${q.side}`,
	rect: () => null,
});

// Returning an arm's parameter proves it was contextually typed to its member.
const echoed = matchTag(shape, "kind", {
	circle: (c) => c,
	square: () => null,
	rect: () => null,
});

const incompleteHandlers = { circle: (c: Circle) => c.radius, square: (q: Square) => q.side };
// @ts-expect-error - omitting the `rect` arm is a compile error; that is the point.
const incomplete = matchTag(shape, "kind", incompleteHandlers);

const partial = matchTagPartial(shape, "kind", { circle: (c) => c.radius }, () => "unknown");
const onlyFallback = matchTagPartial(shape, "kind", {}, () => 0);
const fallbackSeesUnion = matchTagPartial(shape, "kind", { circle: () => 1 }, (member) => member);

type _match = [
	// Uniform arms collapse to that one type...
	Expect<Equal<typeof uniform, number>>,
	// ...and the result is genuinely inferred, not silently `unknown` or `any`.
	Expect<Equal<IsAny<typeof uniform>, false>>,
	// Mixed arms produce the honest union rather than widening to `unknown`.
	Expect<Equal<typeof mixed, number | string | null>>,
	// The `circle` arm's parameter is exactly Circle, not Shape.
	Expect<Equal<typeof echoed, Circle | null>>,
	// The partial form unions the handled arms with the fallback.
	Expect<Equal<typeof partial, number | string>>,
	// With no arms at all, the fallback's type is the whole result.
	Expect<Equal<typeof onlyFallback, number>>,
	// The fallback receives the un-narrowed member.
	Expect<Equal<typeof fallbackSeesUnion, number | Shape>>,
];

test("type-level assertions compile", () => {
	// The assertions above are enforced by the typechecker; if any Expect<...>
	// resolved to a non-`true` type, this file would fail to compile and
	// `vitest --typecheck` would report it. Referencing the tuples and the sample
	// values here keeps them "used" without exporting from a test file.
	type _all = [_discriminants, _withoutTag, _handlers, _built, _guards, _match];
	const _assertions: _all | undefined = undefined;
	void _assertions;
	void incomplete;
});
