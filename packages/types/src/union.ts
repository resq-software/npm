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
 * @fileoverview Discriminated-union tooling: tags, guards, and exhaustive matching.
 *
 * @module @resq-systems/types/union
 *
 * A discriminated union is the cheapest correctness tool TypeScript gives you,
 * and the standard library gives you nothing to work with it. You end up
 * hand-writing the same four things per union: a guard per variant, a `switch`
 * whose `default` arm you hope someone remembers to make exhaustive, a lookup
 * table keyed by tag, and an `Extract<U, { kind: "x" }>` alias so the narrowed
 * member has a name. This module supplies all four generically, with **zero
 * runtime dependencies** and no pattern-matching DSL to learn — the 80% of
 * `ts-pattern` you actually reach for.
 *
 * The vocabulary is deliberately `Discriminant*` / `TagValue*` rather than
 * `Tag*`: {@link Tag} is already taken by the brand carrier in
 * `@resq-systems/types/brand`, and both are re-exported from the same barrel.
 *
 * **Nothing in this module is dualized**, and the exclusion is structural rather
 * than a matter of taste. {@link hasTag} takes the value under test first, which
 * is precisely the `Array.prototype` landmine `@resq-systems/types/guards`
 * documents: `.map`/`.filter` invoke their callback with three arguments, an
 * arity-dispatching wrapper would therefore take the data-first branch with the
 * *index* in the key slot, and `number extends PropertyKey` means the compiler
 * raises nothing. {@link matchTag} and {@link matchTagPartial} take their data
 * first for the same reason, and are arity 3 and 4 — a curried form would have to
 * guess which trailing argument the caller meant to omit.
 *
 * **Example** (Routing on a tag without a fall-through hole)
 *
 * ```ts doctest
 * import { matchTag } from "@resq-systems/types/union";
 *
 * type Shape =
 * 	| { kind: "circle"; radius: number }
 * 	| { kind: "square"; side: number }
 * 	| { kind: "rect"; w: number; h: number };
 *
 * // ✗ compile error the moment Shape gains a member.
 * const area = (s: Shape): number =>
 * 	matchTag(s, "kind", {
 * 		circle: (c) => Math.PI * c.radius ** 2, // c is the circle member
 * 		square: (q) => q.side ** 2,
 * 		rect: (r) => r.w * r.h,
 * 	});
 *
 * area({ kind: "square", side: 3 }); // => 9
 * ```
 *
 * @see `assertNever` in `@resq-systems/types/assert` for the `switch`-based form
 *   when you want a statement rather than an expression.
 */

import { hasKey } from "./guards.js";
import { NarrowError } from "./narrow.js";
import type { Simplify } from "./object.js";

//#region Discriminant types

/**
 * The keys of `U` that could actually serve as a discriminant.
 *
 * **When to use**
 *
 * Use to constrain a key parameter — your own or a caller's — to the properties
 * that could genuinely discriminate `U`, so a key that is merely present on one
 * member, or that holds a value no record can be keyed by, is rejected at the
 * signature rather than at a lookup.
 *
 * **Details**
 *
 * A candidate must be present on **every** member of the union (which `keyof U`
 * over a union already guarantees) *and* carry a `PropertyKey` value, since only
 * strings, numbers, and symbols can key a handler record.
 *
 * Deliberately written as a distributive conditional over `K` rather than as a
 * mapped type — a homomorphic mapped type would distribute over `U` itself and
 * hand back each member's own keys instead of the shared ones, which is the
 * opposite of what a discriminant is.
 *
 * **Example** (Selecting the shared tag key)
 *
 * ```ts doctest
 * import type { DiscriminantKeys } from "@resq-systems/types/union";
 *
 * type Shape =
 * 	| { kind: "circle"; radius: number }
 * 	| { kind: "square"; side: number };
 *
 * // "kind" — `radius` and `side` are not shared, so they never qualify.
 * const witness: DiscriminantKeys<Shape> = "kind";
 *
 * witness; // => "kind"
 * ```
 *
 * @typeParam U - The union to inspect.
 * @typeParam K - Internal distribution parameter; leave it defaulted.
 * @see {@link TagValueOf}
 * @see {@link MemberByTag}
 * @category utility types
 * @since 0.2.0
 */
export type DiscriminantKeys<U, K extends keyof U = keyof U> = K extends unknown
	? [U[K]] extends [PropertyKey]
		? K
		: never
	: never;

/**
 * The union of tag values carried at key `K`.
 *
 * **When to use**
 *
 * Use when you need the set of tags a union can carry — the set you must cover to
 * be exhaustive, and the key set of both {@link ExhaustiveHandlers} and
 * {@link TagMapOf}.
 *
 * **Details**
 *
 * Named `TagValueOf` rather than the obvious `TagsOf` because
 * `@resq-systems/types/brand` already exports a `Tag` interface through the same
 * barrel; the two concepts are unrelated and must not read as siblings.
 *
 * **Example** (Listing every tag a union can carry)
 *
 * ```ts doctest
 * import type { TagValueOf } from "@resq-systems/types/union";
 *
 * type Shape =
 * 	| { kind: "circle"; radius: number }
 * 	| { kind: "square"; side: number }
 * 	| { kind: "rect"; w: number; h: number };
 *
 * // "circle" | "square" | "rect"
 * const witness: TagValueOf<Shape, "kind"> = "circle";
 *
 * witness; // => "circle"
 * ```
 *
 * @typeParam U - The discriminated union.
 * @typeParam K - The discriminant key.
 * @see {@link DiscriminantKeys}
 * @see {@link ExhaustiveHandlers}
 * @see {@link TagMapOf}
 * @category utility types
 * @since 0.2.0
 */
export type TagValueOf<U, K extends PropertyKey> = U extends Record<K, infer T> ? T : never;

/**
 * The single member of `U` whose `K` property is `T`.
 *
 * **When to use**
 *
 * Use to give a variant you refer to repeatedly a name, instead of spelling out
 * an inline `Extract<…>` at every site.
 *
 * **Details**
 *
 * The primitive every other export here is built on. It keeps `Extract`'s `never`
 * floor: asking for a tag no member carries collapses to `never`, which is the
 * right answer for a closed union you named yourself. The **runtime tag guards**
 * deliberately do not narrow to this type — see {@link MemberByTagOr} for why a
 * proof must never bottom out.
 *
 * **Example** (Naming one variant)
 *
 * ```ts doctest
 * import type { MemberByTag } from "@resq-systems/types/union";
 *
 * type Shape =
 * 	| { kind: "circle"; radius: number }
 * 	| { kind: "square"; side: number };
 *
 * type Circle = MemberByTag<Shape, "kind", "circle">;
 *
 * const witness: Circle = { kind: "circle", radius: 2 };
 *
 * witness.radius; // => 2
 * ```
 *
 * @typeParam U - The discriminated union.
 * @typeParam K - The discriminant key.
 * @typeParam T - The tag value to select.
 * @see {@link MemberByTagOr}
 * @see {@link TagMapOf}
 * @category utility types
 * @since 0.2.0
 */
export type MemberByTag<U, K extends PropertyKey, T> = Extract<U, Record<K, T>>;

/**
 * {@link MemberByTag} with the `never` floor removed — the type the **runtime tag
 * guards** narrow to.
 *
 * **When to use**
 *
 * Use wherever the thing being narrowed might be an *open* record rather than a
 * union you enumerated: the result of {@link hasTag}, a parsed wire payload, a
 * plugin registry. For a closed union you own, {@link MemberByTag} says the same
 * thing more directly.
 *
 * **Details**
 *
 * `Extract` is the right answer for a closed union you named yourself, and
 * {@link MemberByTag} keeps that behavior: asking for a tag no member carries
 * should collapse to `never`. But a *guard* must never prove `never` for a check
 * that can succeed at runtime, and `never` is assignable to everything, so a
 * bottomed-out proof silently disables every downstream check. That is exactly
 * what happens to the shape {@link hasTag} produces: `Record<K, PropertyKey>` has
 * no literal members to extract, so `Extract` finds nothing.
 *
 * When the extraction is empty this falls back to `U & Record<K, T>` — the honest
 * statement that the value is still whatever it was, and its tag slot now holds
 * `T`.
 *
 * **Example** (Keeping a guard's proof off the `never` floor)
 *
 * ```ts doctest
 * import type { MemberByTagOr } from "@resq-systems/types/union";
 *
 * type Shape =
 * 	| { kind: "circle"; radius: number }
 * 	| { kind: "square"; side: number };
 *
 * // A closed union behaves exactly like `MemberByTag`.
 * const closed: MemberByTagOr<Shape, "kind", "circle"> = { kind: "circle", radius: 2 };
 *
 * // An open record stays inhabitable — plain `Extract` would bottom out at `never`.
 * const open: MemberByTagOr<Record<"kind", PropertyKey>, "kind", "circle"> = { kind: "circle" };
 *
 * [closed.kind, open.kind]; // => ["circle", "circle"]
 * ```
 *
 * @typeParam U - The union (or open record) being narrowed.
 * @typeParam K - The discriminant key.
 * @typeParam T - The tag value to select.
 * @see {@link MemberByTag}
 * @see {@link isTaggedWith}
 * @see {@link hasTag}
 * @category utility types
 * @since 0.2.0
 */
export type MemberByTagOr<U, K extends PropertyKey, T> = [Extract<U, Record<K, T>>] extends [never]
	? U & Record<K, T>
	: Extract<U, Record<K, T>>;

/**
 * Every member of `U` whose `K` property is **not** `T` — the complement of
 * {@link MemberByTag}.
 *
 * **When to use**
 *
 * Use to name "the rest of the union" after peeling one or more variants off:
 * the residual a partial dispatch hands downstream, the parameter of a helper
 * that must not receive the case you already handled, the return type of a
 * filter that drops one tag.
 *
 * **Details**
 *
 * One token — `Exclude` where {@link MemberByTag} is `Extract` — and it inherits
 * `Exclude`'s distribution over both operands. `T` may be a **union of tags**,
 * in which case every matching arm is peeled at once, so
 * `MembersWithoutTag<U, K, A | B>` is `MembersWithoutTag<MembersWithoutTag<U, K, A>, K, B>`.
 * Selecting a tag no member carries leaves `U` untouched, and selecting the
 * whole tag union collapses to `never` — the mirror image of
 * {@link MemberByTag}'s floor, and correct in both directions:
 * `MemberByTag<U, K, T> | MembersWithoutTag<U, K, T>` is always `U`.
 *
 * Like every type here it is parameterized on the discriminant key rather than
 * hard-wired to `_tag`, because the discriminant this workspace actually uses is
 * `kind`.
 *
 * **Example** (Naming the residual)
 *
 * ```ts doctest
 * import type { MembersWithoutTag } from "@resq-systems/types/union";
 *
 * type Shape =
 * 	| { kind: "circle"; radius: number }
 * 	| { kind: "square"; side: number }
 * 	| { kind: "rect"; w: number; h: number };
 *
 * // Everything the `circle` arm did not handle.
 * type NotCircle = MembersWithoutTag<Shape, "kind", "circle">;
 *
 * const rest: NotCircle[] = [
 * 	{ kind: "square", side: 3 },
 * 	{ kind: "rect", w: 2, h: 5 },
 * ];
 *
 * rest.map((member) => member.kind); // => ["square", "rect"]
 * ```
 *
 * **Example** (Handing the un-handled arms onward)
 *
 * ```ts doctest
 * import type { MembersWithoutTag } from "@resq-systems/types/union";
 *
 * type Event =
 * 	| { kind: "click"; x: number }
 * 	| { kind: "key"; code: string }
 * 	| { kind: "scroll"; dy: number };
 *
 * const route = (event: Event): string => {
 * 	if (event.kind === "click") {
 * 		return `click:${event.x}`;
 * 	}
 * 	// The narrowing the compiler performed, given a name a signature can use.
 * 	const remaining: MembersWithoutTag<Event, "kind", "click"> = event;
 * 	return remaining.kind;
 * };
 *
 * route({ kind: "scroll", dy: 9 }); // => "scroll"
 * ```
 *
 * @typeParam U - The discriminated union.
 * @typeParam K - The discriminant key.
 * @typeParam T - The tag value (or union of tag values) to remove.
 * @see {@link MemberByTag}
 * @see {@link MemberByTagOr}
 * @see {@link matchTagPartial}
 * @category utility types
 * @since 0.2.0
 */
export type MembersWithoutTag<U, K extends PropertyKey, T> = Exclude<U, Record<K, T>>;

/**
 * A handler record covering every tag of `U`, where each arm receives its own
 * **already-narrowed** member.
 *
 * **When to use**
 *
 * Use to type a hand-rolled dispatch table you build once and apply many times,
 * or to constrain a caller-supplied arm set. {@link matchTag} applies this
 * constraint for you at the call site.
 *
 * **Details**
 *
 * Omitting an arm is a compile error, which is the whole point: no `default`
 * branch means no place for a newly-added union member to quietly fall through.
 * The key set is {@link TagValueOf} and each arm's parameter is
 * {@link MemberByTag}, so the payload is available without a second narrowing
 * step.
 *
 * **Example** (A table that cannot silently lose a variant)
 *
 * ```ts doctest
 * import type { ExhaustiveHandlers } from "@resq-systems/types/union";
 *
 * type Shape =
 * 	| { kind: "circle"; radius: number }
 * 	| { kind: "square"; side: number }
 * 	| { kind: "rect"; w: number; h: number };
 *
 * // ✗ compile error if any arm is dropped.
 * const handlers: ExhaustiveHandlers<Shape, "kind", number> = {
 * 	circle: (c) => c.radius, // c is narrowed, not Shape
 * 	square: (q) => q.side,
 * 	rect: (r) => r.w * r.h,
 * };
 *
 * handlers.rect({ kind: "rect", w: 4, h: 5 }); // => 20
 * ```
 *
 * @typeParam U - The discriminated union.
 * @typeParam K - The discriminant key.
 * @typeParam R - The common return type of every arm.
 * @see {@link PartialHandlers}
 * @see {@link matchTag}
 * @category utility types
 * @since 0.2.0
 */
export type ExhaustiveHandlers<U, K extends PropertyKey, R> = {
	[T in TagValueOf<U, K> & PropertyKey]: (member: MemberByTag<U, K, T>) => R;
};

/**
 * {@link ExhaustiveHandlers} with every arm optional.
 *
 * **When to use**
 *
 * Use for genuinely open unions — a wire protocol you do not own, a plugin
 * registry, a schema whose producer deploys ahead of you. For a union you own,
 * reach for {@link ExhaustiveHandlers} instead and let the compiler keep you
 * honest.
 *
 * **Details**
 *
 * Keeping this a separate named type is exactly what lets {@link matchTag} stay
 * strict instead of growing a `default` escape hatch — {@link matchTagPartial} is
 * the one entry point that accepts this shape, and it demands a fallback in
 * exchange. Each arm still receives its own narrowed member; only the arm's
 * *presence* is optional.
 *
 * **Example** (Handling the variants you know about)
 *
 * ```ts doctest
 * import type { PartialHandlers } from "@resq-systems/types/union";
 *
 * type WireEvent =
 * 	| { type: "click"; x: number; y: number }
 * 	| { type: "key"; code: string };
 *
 * // Every arm optional — `matchTagPartial` routes the rest to a fallback.
 * const handlers: PartialHandlers<WireEvent, "type", string> = {
 * 	key: (event) => event.code, // event is the key member, not WireEvent
 * };
 *
 * handlers.key?.({ type: "key", code: "Escape" }); // => "Escape"
 * ```
 *
 * @typeParam U - The discriminated union.
 * @typeParam K - The discriminant key.
 * @typeParam R - The common return type of every arm.
 * @see {@link ExhaustiveHandlers}
 * @see {@link matchTagPartial}
 * @category utility types
 * @since 0.2.0
 */
export type PartialHandlers<U, K extends PropertyKey, R> = Partial<ExhaustiveHandlers<U, K, R>>;

/**
 * A tag-to-member lookup table.
 *
 * **When to use**
 *
 * Use to type registries, per-variant configuration, and reducer maps whose value
 * type must track the variant its key selects.
 *
 * **Details**
 *
 * The inverse direction of {@link ExhaustiveHandlers}: same key set, but the
 * values are the members themselves rather than functions over them.
 *
 * Named `TagMapOf` and not `…Entries` so it does not read as a variant of
 * `Entries` from `@resq-systems/types/object`, which is a different shape.
 *
 * **Example** (Indexing variants by tag)
 *
 * ```ts doctest
 * import type { TagMapOf } from "@resq-systems/types/union";
 *
 * type Shape =
 * 	| { kind: "circle"; radius: number }
 * 	| { kind: "square"; side: number };
 *
 * type ByKind = TagMapOf<Shape, "kind">;
 *
 * const circle: ByKind["circle"] = { kind: "circle", radius: 2 };
 *
 * circle.radius; // => 2
 * ```
 *
 * @typeParam U - The discriminated union.
 * @typeParam K - The discriminant key.
 * @see {@link TaggedUnionOf}
 * @see {@link MemberByTag}
 * @category utility types
 * @since 0.2.0
 */
export type TagMapOf<U, K extends PropertyKey> = {
	[T in TagValueOf<U, K> & PropertyKey]: MemberByTag<U, K, T>;
};

/**
 * Build a discriminated union from a payload map, keyed on any discriminant you
 * choose.
 *
 * **When to use**
 *
 * Use when you are *declaring* a union rather than consuming one, and you want
 * the tag literal and the map key to be structurally incapable of drifting apart.
 *
 * **Details**
 *
 * The inverse of {@link TagMapOf}: you write the interesting part (the
 * per-variant payloads) once and the tag property is woven in for you.
 *
 * Reuses `Simplify` from `@resq-systems/types/object` so the result hovers as a
 * flat object literal rather than as `Record<"type", "a"> & { x: number }`.
 *
 * **Example** (Declaring a union from its payloads)
 *
 * ```ts doctest
 * import type { TaggedUnionOf } from "@resq-systems/types/union";
 *
 * // { type: "click"; x: number; y: number } | { type: "key"; code: string }
 * type Event = TaggedUnionOf<"type", {
 * 	click: { x: number; y: number };
 * 	key: { code: string };
 * }>;
 *
 * const witness: Event = { type: "click", x: 1, y: 2 };
 *
 * witness.type; // => "click"
 * ```
 *
 * @typeParam K - The discriminant key to inject.
 * @typeParam M - A map from tag value to that variant's payload.
 * @see {@link TagMapOf}
 * @category utility types
 * @since 0.2.0
 */
export type TaggedUnionOf<K extends string, M extends Record<string, object>> = {
	[T in keyof M]: Simplify<Record<K, T> & M[T]>;
}[keyof M];

//#endregion

//#region Tag guards

/**
 * Check whether a value is an object carrying a usable tag at `key`.
 *
 * **When to use**
 *
 * Use as the entry point from `unknown` into tagged-union land — typically on
 * freshly parsed JSON, a `catch` binding, or a message from another process.
 * After this returns, the value is safe to hand to {@link matchTag} or to a guard
 * minted by {@link byTag}.
 *
 * **Details**
 *
 * Rejects `null`, primitives, and objects whose tag slot holds an object, an
 * array, `undefined`, or a boolean — a "tag" that cannot key a record is not a
 * tag, and treating it as one is how you end up looking up `handlers[undefined]`.
 *
 * The proof is the open `Record<K, PropertyKey>`, which is why the tag guards
 * narrow through {@link MemberByTagOr} rather than {@link MemberByTag}: an open
 * record has no literal members for `Extract` to find.
 *
 * The value under test is the **first** parameter, so this is never dualized —
 * see the module overview for the `Array.prototype` failure mode that rules it
 * out.
 *
 * **Example** (Entering from `unknown`)
 *
 * ```ts doctest
 * import { hasTag } from "@resq-systems/types/union";
 *
 * const raw: unknown = JSON.parse(`{"kind":"circle","radius":2}`);
 *
 * // Inside the guard, `raw` is Record<"kind", PropertyKey>.
 * const tag = hasTag(raw, "kind") ? String(raw.kind) : "untagged";
 * tag; // => "circle"
 *
 * hasTag({ kind: {} }, "kind"); // => false
 * hasTag(null, "kind"); // => false
 * ```
 *
 * @typeParam K - The discriminant key, inferred from `key`.
 * @param value - Any value, typically freshly parsed JSON.
 * @param key - The discriminant property to look for.
 * @returns `true` when `value` carries a `PropertyKey` at `key`.
 * @see {@link isTagged}
 * @see {@link isTaggedWith}
 * @see {@link MemberByTagOr}
 * @category guards
 * @since 0.2.0
 */
export function hasTag<K extends PropertyKey>(
	value: unknown,
	key: K,
): value is Record<K, PropertyKey> {
	if (value === null || (typeof value !== "object" && typeof value !== "function")) {
		return false;
	}
	if (!hasKey(value, key)) {
		return false;
	}
	const tag: unknown = (value as Record<PropertyKey, unknown>)[key];
	return typeof tag === "string" || typeof tag === "number" || typeof tag === "symbol";
}

/**
 * What {@link isTagged} proves about a value of type `U`.
 *
 * **When to use**
 *
 * Use to name the result of a `_tag` narrowing — in a signature that forwards a
 * guard's proof, or in a type-level test. Direct callers rarely need it;
 * {@link TaggedGuard} applies it for them.
 *
 * **Details**
 *
 * Two cases, chosen by whether the input already advertises a `_tag`. When it
 * does, this selects the matching **member, payload included**. When it does not
 * — `unknown` at a boundary — there is nothing to select from, so the proof is the
 * bare `{ readonly _tag: T }` shape, which is exactly what the runtime check
 * establishes.
 *
 * That first case is not a nicety. `Array.prototype.filter`'s narrowing overload
 * requires the proven type to be a **subtype of the element type**, and
 * `{ readonly _tag: "TimeoutError" }` is not a subtype of a `TimeoutError` member
 * that also carries `ms`. TypeScript reports nothing — it silently falls back to
 * the non-narrowing overload and hands back the un-narrowed array. Since every
 * real `Data.TaggedError` carries a payload, that is every real call site.
 *
 * The outer test is wrapped in a tuple (`[U] extends [...]`) so it does **not**
 * distribute: `Extract` has to see the whole union at once, or each member would
 * be tested against the tag in isolation and the non-matching ones would come
 * back as `HttpError & Record<"_tag", "TimeoutError">` instead of dropping out.
 *
 * **Example** (Member with payload, versus the bare shape from `unknown`)
 *
 * ```ts doctest
 * import type { TaggedMember } from "@resq-systems/types/union";
 *
 * type TimeoutError = { readonly _tag: "TimeoutError"; readonly ms: number };
 * type ParseError = { readonly _tag: "ParseError"; readonly at: number };
 * type AppError = TimeoutError | ParseError;
 *
 * // The input advertises `_tag`, so this is the whole member — `ms` included.
 * const member: TaggedMember<AppError, "TimeoutError"> = { _tag: "TimeoutError", ms: 30 };
 *
 * // The input is `unknown`, so the honest proof is just the tag slot.
 * const shape: TaggedMember<unknown, "TimeoutError"> = { _tag: "TimeoutError" };
 *
 * [member.ms, shape._tag]; // => [30, "TimeoutError"]
 * ```
 *
 * @typeParam U - The input type being narrowed.
 * @typeParam T - The literal `_tag` value being matched.
 * @see {@link TaggedGuard}
 * @see {@link isTagged}
 * @see {@link MemberByTagOr}
 * @category utility types
 * @since 0.2.0
 */
export type TaggedMember<U, T extends PropertyKey> = [U] extends [Record<"_tag", PropertyKey>]
	? MemberByTagOr<U, "_tag", T>
	: { readonly _tag: T };

/**
 * The guard {@link isTagged} returns.
 *
 * **When to use**
 *
 * Use to annotate a stored or passed-around `_tag` guard — a module-level
 * constant, a record of guards, a parameter that accepts one — so the narrowing
 * survives the annotation instead of collapsing to `(value: unknown) => boolean`.
 *
 * **Details**
 *
 * Deliberately **one** generic call signature rather than two overloads. When a
 * callback with multiple call signatures is passed to a generic function,
 * TypeScript infers from the *last* one only — so an overload pair would fix
 * direct calls and leave `filter`, the case this exists for, still broken. A
 * single signature whose result is computed by {@link TaggedMember} covers both,
 * which is what makes the proof land on the union **member** (payload included)
 * rather than on the bare tag shape.
 *
 * The `U &` is what makes the predicate provably assignable to the parameter
 * while `U` is still generic; TypeScript reduces it away at every instantiation
 * (`Err & TimeoutError` is `TimeoutError`, `unknown & { _tag: T }` is
 * `{ _tag: T }`), so it never shows up in hover output.
 *
 * **Example** (Naming a stored guard without losing the narrowing)
 *
 * ```ts doctest
 * import { isTagged, type TaggedGuard } from "@resq-systems/types/union";
 *
 * type TimeoutError = { readonly _tag: "TimeoutError"; readonly ms: number };
 * type ParseError = { readonly _tag: "ParseError"; readonly at: number };
 *
 * const failures: ReadonlyArray<TimeoutError | ParseError> = [
 * 	{ _tag: "TimeoutError", ms: 30 },
 * 	{ _tag: "ParseError", at: 7 },
 * ];
 *
 * const isTimeout: TaggedGuard<"TimeoutError"> = isTagged("TimeoutError");
 *
 * // The annotation keeps `filter` narrowing to the member, so `.ms` is reachable.
 * const waits = failures.filter(isTimeout).map((failure) => failure.ms);
 * waits; // => [30]
 * ```
 *
 * @typeParam T - The literal `_tag` value being matched.
 * @see {@link isTagged}
 * @see {@link TaggedMember}
 * @category models
 * @since 0.2.0
 */
export type TaggedGuard<T extends PropertyKey> = <U>(value: U) => value is U & TaggedMember<U, T>;

/**
 * Build a guard for the Effect-ecosystem `_tag` convention.
 *
 * **When to use**
 *
 * Use whenever you are discriminating a `Data.TaggedClass`, `Data.TaggedError`,
 * or `Schema.TaggedStruct`. Reach for {@link isTaggedWith} instead when the
 * discriminant is anything other than `_tag`.
 *
 * **Details**
 *
 * `Data.TaggedClass`, `Data.TaggedError`, and `Schema.TaggedStruct` all
 * discriminate on `_tag`, and both `@resq-systems/http` and
 * `@resq-systems/rate-limiting` sit on Effect — so this one special case earns
 * its own export rather than making every call site spell out
 * `isTaggedWith("_tag", …)`.
 *
 * Curried, so the result is a reusable value that drops straight into
 * `Array.prototype.filter` or a predicate combinator. The proof is the union
 * **member**, payload included (see {@link TaggedMember}), which is what makes it
 * narrow correctly through `filter` rather than silently falling back to the
 * non-narrowing overload.
 *
 * **Example** (Filtering one error variant out of a union)
 *
 * ```ts doctest
 * import { isTagged } from "@resq-systems/types/union";
 *
 * type TimeoutError = { readonly _tag: "TimeoutError"; readonly ms: number };
 * type ParseError = { readonly _tag: "ParseError"; readonly at: number };
 *
 * const failures: ReadonlyArray<TimeoutError | ParseError> = [
 * 	{ _tag: "TimeoutError", ms: 30 },
 * 	{ _tag: "ParseError", at: 7 },
 * ];
 *
 * const isTimeout = isTagged("TimeoutError");
 *
 * const waits = failures.filter(isTimeout).map((failure) => failure.ms);
 * waits; // => [30]
 * ```
 *
 * @typeParam T - The literal tag, preserved by the `const` modifier.
 * @param tag - The `_tag` value to match.
 * @returns A {@link TaggedGuard} — narrows a `_tag`-carrying union to the matching
 *   member, and narrows `unknown` to `{ readonly _tag: T }`.
 * @see {@link isTaggedWith}
 * @see {@link TaggedGuard}
 * @see {@link TaggedMember}
 * @category constructors
 * @since 0.2.0
 */
export function isTagged<const T extends string>(tag: T): TaggedGuard<T> {
	const guard = (value: unknown): value is { readonly _tag: T } =>
		hasTag(value, "_tag") && value._tag === tag;
	// One runtime function, two type-level entry points. The cast is the seam: the
	// implementation genuinely accepts `unknown`, which is a superset of what the
	// union-narrowing overload accepts, so both signatures are honest.
	return guard as TaggedGuard<T>;
}

/**
 * Bind a discriminant key **and** a tag value, and get back a reusable guard.
 *
 * **When to use**
 *
 * Use for any union that does not discriminate on `_tag` — the general form of
 * {@link isTagged}. When a whole module works with one union, {@link byTag} binds
 * the key a stage earlier so it is not repeated on every line.
 *
 * **Details**
 *
 * Curried on purpose. A guard that is a *value* can be named once and reused
 * everywhere — including as the callback to `filter`, where the narrowed element
 * type flows into the resulting array type. The proof is {@link MemberByTagOr},
 * so it lands on the union **member** with its payload, and does not bottom out
 * at `never` when the input is an open record.
 *
 * **Example** (Minting a variant guard for an arbitrary discriminant)
 *
 * ```ts doctest
 * import { isTaggedWith } from "@resq-systems/types/union";
 *
 * type Shape =
 * 	| { kind: "circle"; radius: number }
 * 	| { kind: "square"; side: number };
 *
 * const shapes: Shape[] = [
 * 	{ kind: "circle", radius: 2 },
 * 	{ kind: "square", side: 3 },
 * ];
 *
 * const isCircle = isTaggedWith("kind", "circle");
 *
 * // Narrowed inside a block, and through `filter` into the array's element type.
 * const radii = shapes.filter(isCircle).map((circle) => circle.radius);
 * radii; // => [2]
 * ```
 *
 * @typeParam K - The discriminant key.
 * @typeParam T - The literal tag, preserved by the `const` modifier.
 * @param key - The discriminant property.
 * @param tag - The tag value to match.
 * @returns A guard narrowing its argument to {@link MemberByTagOr}.
 * @see {@link byTag}
 * @see {@link isTagged}
 * @see {@link MemberByTagOr}
 * @category constructors
 * @since 0.2.0
 */
export function isTaggedWith<K extends PropertyKey, const T extends PropertyKey>(
	key: K,
	tag: T,
): <U extends Record<K, PropertyKey>>(value: U) => value is MemberByTagOr<U, K, T> {
	// The `as PropertyKey` casts are required: TypeScript reports TS2367 ("this
	// comparison appears unintentional") between the still-generic `U[K]` and the
	// literal `T`, even though every concrete instantiation overlaps.
	return <U extends Record<K, PropertyKey>>(value: U): value is MemberByTagOr<U, K, T> =>
		(value[key] as PropertyKey) === (tag as PropertyKey);
}

/**
 * Bind the discriminant key once per union, then mint guards cheaply.
 *
 * **When to use**
 *
 * Use in a module that works with a single union and would otherwise repeat its
 * discriminant key on every line. For a one-off guard, {@link isTaggedWith} is
 * one call instead of two.
 *
 * **Details**
 *
 * The same machinery as {@link isTaggedWith}, split one stage earlier. Each
 * minted guard narrows to {@link MemberByTagOr}, so the member's payload survives
 * into a `filter` result exactly as it does for the two-argument form.
 *
 * **Example** (One key, many variant guards)
 *
 * ```ts doctest
 * import { byTag } from "@resq-systems/types/union";
 *
 * type Shape =
 * 	| { kind: "circle"; radius: number }
 * 	| { kind: "square"; side: number }
 * 	| { kind: "rect"; w: number; h: number };
 *
 * const shapes: Shape[] = [
 * 	{ kind: "circle", radius: 2 },
 * 	{ kind: "rect", w: 4, h: 5 },
 * ];
 *
 * const byKind = byTag("kind");
 * const isRect = byKind("rect");
 *
 * const areas = shapes.filter(isRect).map((r) => r.w * r.h); // r is the rect member
 * areas; // => [20]
 * ```
 *
 * @typeParam K - The discriminant key.
 * @param key - The discriminant property to bind.
 * @returns A factory taking a tag value and returning a guard.
 * @see {@link isTaggedWith}
 * @see {@link isTagged}
 * @category constructors
 * @since 0.2.0
 */
export function byTag<K extends PropertyKey>(
	key: K,
): <const T extends PropertyKey>(
	tag: T,
) => <U extends Record<K, PropertyKey>>(value: U) => value is MemberByTagOr<U, K, T> {
	return <const T extends PropertyKey>(tag: T) => isTaggedWith(key, tag);
}

//#endregion

//#region Errors

/**
 * Thrown by {@link matchTag} and {@link matchTagPartial} when the value's tag has
 * no handler.
 *
 * **When to use**
 *
 * Use at a boundary that consumes data you do not control, to tell "the producer
 * shipped a variant we do not handle" apart from an ordinary validation failure.
 * {@link isUnhandledTagError} is the guard for the `catch` binding.
 *
 * **Details**
 *
 * In well-typed code this is unreachable — the compiler enforces exhaustiveness —
 * so reaching it means the call came from untyped JavaScript, or the data's tag
 * drifted from the type (a deploy-skew or schema-version problem). Either way it
 * must fail loudly and name the offending tag, rather than dying as an opaque
 * "handler is not a function".
 *
 * Extends `NarrowError` from `@resq-systems/types/narrow` so a single `catch`
 * clause covers everything this package throws.
 *
 * **Example** (Reporting a variant this consumer predates)
 *
 * ```ts doctest
 * import { isUnhandledTagError, matchTag } from "@resq-systems/types/union";
 *
 * type Shape =
 * 	| { kind: "circle"; radius: number }
 * 	| { kind: "square"; side: number };
 *
 * // A producer shipped a variant this consumer does not know about.
 * const fromTheWire = { kind: "triangle", base: 1, height: 2 } as unknown as Shape;
 *
 * let reported = "none";
 * try {
 * 	matchTag(fromTheWire, "kind", {
 * 		circle: (c) => c.radius,
 * 		square: (q) => q.side,
 * 	});
 * } catch (error) {
 * 	if (isUnhandledTagError(error)) reported = String(error.tag);
 * }
 *
 * reported; // => "triangle"
 * ```
 *
 * @see {@link isUnhandledTagError}
 * @see {@link matchTag}
 * @category errors
 * @since 0.2.0
 */
export class UnhandledTagError extends NarrowError {
	/** The tag value that had no handler. */
	readonly tag: PropertyKey;

	/** The discriminant key the tag was read from. */
	readonly key: PropertyKey;

	/**
	 * @param tag - The unhandled tag value.
	 * @param key - The discriminant key it was read from.
	 */
	constructor(tag: PropertyKey, key: PropertyKey) {
		super(`No handler for tag ${String(tag)} at discriminant ${String(key)}`, {
			value: tag,
			expected: "a tag with a matching handler",
		});
		this.name = "UnhandledTagError";
		this.tag = tag;
		this.key = key;
		// `NarrowError`'s constructor pins the prototype to `NarrowError.prototype`
		// (so `instanceof` survives an ES5 downlevel). That assignment also lands on
		// subclass instances, so without this line `instanceof UnhandledTagError`
		// would be false for an error this class just constructed.
		Object.setPrototypeOf(this, UnhandledTagError.prototype);
	}
}

/**
 * Narrow an `unknown` caught value to {@link UnhandledTagError}.
 *
 * **When to use**
 *
 * Use in a `catch` clause that must separate "the data carried a variant we do
 * not handle" — usually worth an alert, since it means a producer shipped ahead
 * of a consumer — from an ordinary validation failure.
 *
 * **Details**
 *
 * Checks `instanceof` first, then falls back to a structural test so an instance
 * that crossed a realm boundary (a worker message, a `vm` context, a bundle that
 * ended up with two copies of this module) is still recognised.
 *
 * The fallback deliberately does **not** gate on `instanceof Error`: an `Error`
 * built in another realm is an instance of *that* realm's `Error` intrinsic, so
 * the one check most likely to fail cross-realm cannot be the one guarding the
 * cross-realm path. It duck-types on `name`, a string `message`, and the two own
 * fields this class adds — which is enough to reject both a plain object that
 * merely borrows the name and an error that borrows the name without the fields.
 * This mirrors `isNarrowError` in `@resq-systems/types/narrow`.
 *
 * **Example** (Separating tag drift from ordinary failures)
 *
 * ```ts doctest
 * import { isUnhandledTagError, UnhandledTagError } from "@resq-systems/types/union";
 *
 * const caught: unknown = new UnhandledTagError("triangle", "kind");
 *
 * const seen = isUnhandledTagError(caught) ? String(caught.tag) : "other";
 * seen; // => "triangle"
 *
 * isUnhandledTagError(new Error("boom")); // => false
 * ```
 *
 * @param value - The caught value.
 * @returns `true` when `value` is an {@link UnhandledTagError}.
 * @see {@link UnhandledTagError}
 * @category guards
 * @since 0.2.0
 */
export function isUnhandledTagError(value: unknown): value is UnhandledTagError {
	if (value instanceof UnhandledTagError) {
		return true;
	}
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const candidate = value as { readonly name?: unknown; readonly message?: unknown };
	return (
		candidate.name === "UnhandledTagError" &&
		typeof candidate.message === "string" &&
		"tag" in value &&
		"key" in value
	);
}

//#endregion

//#region Exhaustive matching

/**
 * The runtime shape a handler record is erased to before dispatch. Internal —
 * the public constraint is {@link ExhaustiveHandlers}, which is what enforces
 * exhaustiveness and per-arm narrowing.
 *
 * @internal
 */
type HandlerTable = Readonly<Record<PropertyKey, ((member: never) => unknown) | undefined>>;

/**
 * Look up a handler by tag, considering **own properties only**.
 *
 * A plain object literal inherits `toString`, `valueOf`, `constructor`, and
 * friends from `Object.prototype`, and they are all callable. A bare
 * `handlers[tag]` on data-driven input would therefore happily dispatch a
 * `{ kind: "toString" }` payload into `Object.prototype.toString` and return
 * `"[object Object]"` instead of failing — a silent wrong answer, and a
 * prototype-shaped hole in any dispatcher fed by the network. The `Object.hasOwn`
 * gate closes it, so an inherited key is treated as "no handler".
 *
 * @internal
 */
function lookupHandler(
	handlers: object,
	tag: PropertyKey,
): ((member: never) => unknown) | undefined {
	if (!Object.hasOwn(handlers, tag)) {
		return undefined;
	}
	return (handlers as HandlerTable)[tag];
}

/**
 * Dispatch on a tag with **compile-time exhaustiveness**, as an expression.
 *
 * **When to use**
 *
 * Use for any union you own, in place of a `switch` whose `default` arm you have
 * to remember to make exhaustive. Reach for {@link matchTagPartial} only when the
 * union is genuinely open.
 *
 * **Details**
 *
 * Each handler receives its own narrowed member, and a missing arm is a compile
 * error — so there is no `default` branch for a newly-added union member to fall
 * through. The return type is computed from the handlers themselves: uniform
 * arms give you that type, mixed arms give you the honest union.
 *
 * The signature captures the whole handler record as `H` rather than taking a
 * free result parameter `R`. That is not stylistic: `R` is not inferable through
 * a mapped type with computed keys, and resolves to `unknown` at every call site.
 *
 * Handler lookup considers **own properties only**, so a payload tagged
 * `"toString"` or `"constructor"` throws rather than dispatching into the
 * inherited `Object.prototype` method of the same name.
 *
 * The value under test is the **first** parameter and the arity is 3, so this is
 * never dualized — see the module overview.
 *
 * **Gotchas**
 *
 * An *extra* arm for a tag that does not exist on `U` is **not rejected** —
 * excess-property checking does not apply in this inference position — and it
 * widens the computed return type. A misspelled tag is still caught, but it
 * surfaces as a *missing arm* error for the tag you meant, not as an unknown-key
 * error for the one you typed.
 *
 * **Example** (Dispatching to an honest union of arm results)
 *
 * ```ts doctest
 * import { matchTag } from "@resq-systems/types/union";
 *
 * type Shape =
 * 	| { kind: "circle"; radius: number }
 * 	| { kind: "square"; side: number }
 * 	| { kind: "rect"; w: number; h: number };
 *
 * // number | string | null — the honest union, not `unknown`.
 * const label = (shape: Shape) =>
 * 	matchTag(shape, "kind", {
 * 		circle: (c) => c.radius, // number
 * 		square: (q) => `${q.side}`, // string
 * 		rect: () => null, // null
 * 	});
 *
 * label({ kind: "square", side: 3 }); // => "3"
 * label({ kind: "rect", w: 4, h: 5 }); // => null
 * ```
 *
 * @typeParam U - The discriminated union, inferred from `value`.
 * @typeParam K - The discriminant key, inferred from `key`.
 * @typeParam H - The handler record, inferred from `handlers`.
 * @param value - The union member to dispatch on.
 * @param key - The discriminant property.
 * @param handlers - One handler per tag; each receives its narrowed member.
 * @returns Whatever the selected handler returned.
 * @throws {UnhandledTagError} When the tag has no handler — only reachable from
 *   untyped callers, or from data whose tag drifted from its declared type.
 * @see {@link matchTagPartial}
 * @see {@link ExhaustiveHandlers}
 * @see {@link UnhandledTagError}
 * @category pattern matching
 * @since 0.2.0
 */
export function matchTag<
	U extends Record<K, PropertyKey>,
	K extends keyof U & PropertyKey,
	H extends ExhaustiveHandlers<U, K, unknown>,
>(value: U, key: K, handlers: H): ReturnType<H[keyof H]> {
	const tag: PropertyKey = value[key];
	const handler = lookupHandler(handlers, tag);
	if (typeof handler !== "function") {
		throw new UnhandledTagError(tag, key);
	}
	return (handler as (member: U) => ReturnType<H[keyof H]>)(value);
}

/**
 * {@link matchTag} for genuinely open unions: handle the tags you care about and
 * route everything else to `fallback`.
 *
 * **When to use**
 *
 * Use for a union you do not own — a wire protocol, a plugin registry, a schema
 * whose producer deploys ahead of you. A union you own should never need it; this
 * is the escape valve that lets {@link matchTag} stay strict.
 *
 * **Details**
 *
 * The result is the union of the supplied arms' return types and the fallback's,
 * so a partial match never silently claims to produce more than it does.
 *
 * As with {@link matchTag}, handler lookup considers **own properties only** — a
 * payload tagged `"toString"` routes to `fallback`, not to the inherited
 * `Object.prototype` method.
 *
 * The value under test is the **first** parameter and the arity is 4, so this is
 * never dualized — see the module overview.
 *
 * **Example** (Handling the known tags, routing the rest)
 *
 * ```ts doctest
 * import { matchTagPartial } from "@resq-systems/types/union";
 *
 * type Shape =
 * 	| { kind: "circle"; radius: number }
 * 	| { kind: "square"; side: number };
 *
 * // number | string — the arms' results plus the fallback's.
 * const size = (shape: Shape) =>
 * 	matchTagPartial(shape, "kind", { circle: (c) => c.radius }, () => "unknown");
 *
 * size({ kind: "circle", radius: 2 }); // => 2
 * size({ kind: "square", side: 3 }); // => "unknown"
 * ```
 *
 * @typeParam U - The discriminated union, inferred from `value`.
 * @typeParam K - The discriminant key, inferred from `key`.
 * @typeParam H - The partial handler record, inferred from `handlers`.
 * @typeParam R - The fallback's return type.
 * @param value - The union member to dispatch on.
 * @param key - The discriminant property.
 * @param handlers - Zero or more handlers, each receiving its narrowed member.
 * @param fallback - Invoked with the un-narrowed member when no arm matched.
 * @returns The selected handler's result, or the fallback's.
 * @see {@link matchTag}
 * @see {@link PartialHandlers}
 * @category pattern matching
 * @since 0.2.0
 */
export function matchTagPartial<
	U extends Record<K, PropertyKey>,
	K extends keyof U & PropertyKey,
	H extends PartialHandlers<U, K, unknown>,
	R,
>(
	value: U,
	key: K,
	handlers: H,
	fallback: (member: U) => R,
): ReturnType<NonNullable<H[keyof H]>> | R {
	const tag: PropertyKey = value[key];
	const handler = lookupHandler(handlers, tag);
	if (typeof handler !== "function") {
		return fallback(value);
	}
	return (handler as (member: U) => ReturnType<NonNullable<H[keyof H]>>)(value);
}

//#endregion
