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
import { NarrowError } from "./narrow.js";
import {
	byTag,
	hasTag,
	isTagged,
	isTaggedWith,
	isUnhandledTagError,
	matchTag,
	matchTagPartial,
	type MembersWithoutTag,
	UnhandledTagError,
} from "./union.js";

type Circle = { kind: "circle"; radius: number };
type Square = { kind: "square"; side: number };
type Rect = { kind: "rect"; w: number; h: number };
type Shape = Circle | Square | Rect;

const circle: Circle = { kind: "circle", radius: 2 };
const square: Square = { kind: "square", side: 3 };
const rect: Rect = { kind: "rect", w: 4, h: 5 };
const shapes: Shape[] = [circle, square, rect];

/** The complete arm set, reused wherever exhaustiveness is not what's under test. */
const area = {
	circle: (c: Circle) => c.radius * c.radius,
	square: (q: Square) => q.side * q.side,
	rect: (r: Rect) => r.w * r.h,
};

/**
 * Data whose tag is not in the type — the only way `matchTag` can fail at
 * runtime, and exactly what an untyped caller or a schema-skewed producer sends.
 */
const asShape = (value: object): Shape => value as Shape;

/**
 * Widen a value back to its declared union. `const s: Shape = circle` narrows
 * `s` to `Circle` by declaration, which would make `matchTag` infer the single
 * member rather than the union — a TypeScript flow-analysis detail, not a
 * property of this module, but it changes which arms these tests must supply.
 */
const anyShape = (value: Shape): Shape => value;

type Coded = { code: 1; a: string } | { code: 2; b: number };

const anyCoded = (value: Coded): Coded => value;

const TAG = Symbol("tag");
type SymTagged = { kind: typeof TAG; a: number } | { kind: "plain"; b: number };

const anySymTagged = (value: SymTagged): SymTagged => value;

describe("hasTag", () => {
	test("accepts an object whose key holds a string, number, or symbol", () => {
		expect(hasTag({ kind: "circle" }, "kind")).toBe(true);
		expect(hasTag({ code: 7 }, "code")).toBe(true);
		expect(hasTag({ kind: TAG }, "kind")).toBe(true);
	});

	test("rejects null, undefined, and primitives", () => {
		expect(hasTag(null, "kind")).toBe(false);
		expect(hasTag(undefined, "kind")).toBe(false);
		expect(hasTag(0, "kind")).toBe(false);
		expect(hasTag("", "kind")).toBe(false);
		expect(hasTag(false, "kind")).toBe(false);
		expect(hasTag(Symbol("s"), "kind")).toBe(false);
	});

	test("rejects a primitive even when the key exists on its wrapper", () => {
		// "abc".length is 3, but a primitive is not a tagged union member.
		expect(hasTag("abc", "length")).toBe(false);
	});

	test("rejects an object missing the key", () => {
		expect(hasTag({}, "kind")).toBe(false);
		expect(hasTag({ other: "circle" }, "kind")).toBe(false);
	});

	test("rejects a key whose value cannot address a handler record", () => {
		// Anything that is not a PropertyKey would index the handler table as
		// undefined or as a coerced string, so it is not a tag.
		expect(hasTag({ kind: undefined }, "kind")).toBe(false);
		expect(hasTag({ kind: null }, "kind")).toBe(false);
		expect(hasTag({ kind: true }, "kind")).toBe(false);
		expect(hasTag({ kind: {} }, "kind")).toBe(false);
		expect(hasTag({ kind: [] }, "kind")).toBe(false);
		expect(hasTag({ kind: () => "circle" }, "kind")).toBe(false);
	});

	test("accepts a null-prototype object", () => {
		const bare = Object.create(null) as Record<string, unknown>;
		bare.kind = "circle";
		expect(hasTag(bare, "kind")).toBe(true);
	});

	test("is not fooled by Symbol.toStringTag spoofing", () => {
		const spoofed = { kind: "circle", [Symbol.toStringTag]: "Array" };
		expect(hasTag(spoofed, "kind")).toBe(true);
		expect(hasTag({ [Symbol.toStringTag]: "Object" }, "kind")).toBe(false);
	});

	test("narrows the value inside the guarded branch", () => {
		const raw: unknown = { kind: "circle", radius: 2 };
		let seen: PropertyKey | null = null;
		if (hasTag(raw, "kind")) {
			// Reading `.kind` off an `unknown` only compiles because of the guard.
			seen = raw.kind;
		}
		expect(seen).toBe("circle");
	});
});

describe("isTagged", () => {
	test("matches the Effect-style _tag convention", () => {
		const isTimeout = isTagged("TimeoutError");
		expect(isTimeout({ _tag: "TimeoutError" })).toBe(true);
		expect(isTimeout({ _tag: "OtherError" })).toBe(false);
	});

	test("rejects values with no usable _tag", () => {
		const isTimeout = isTagged("TimeoutError");
		expect(isTimeout(null)).toBe(false);
		expect(isTimeout(undefined)).toBe(false);
		expect(isTimeout({})).toBe(false);
		expect(isTimeout("TimeoutError")).toBe(false);
		expect(isTimeout({ _tag: 1 })).toBe(false);
		expect(isTimeout({ tag: "TimeoutError" })).toBe(false);
	});

	test("narrows unknown to the tagged shape", () => {
		const isTimeout = isTagged("TimeoutError");
		const value: unknown = { _tag: "TimeoutError", elapsed: 30 };
		let tag = "";
		if (isTimeout(value)) {
			tag = value._tag;
		}
		expect(tag).toBe("TimeoutError");
	});

	test("is reusable as a filter callback", () => {
		const isA = isTagged("A");
		const values: unknown[] = [{ _tag: "A" }, { _tag: "B" }, null, { _tag: "A" }];
		expect(values.filter(isA)).toHaveLength(2);
	});
});

describe("isTaggedWith", () => {
	test("narrows to the matching member inside an if", () => {
		const isCircle = isTaggedWith("kind", "circle");
		let radius = 0;
		if (isCircle(circle)) {
			radius = circle.radius;
		}
		expect(radius).toBe(2);
		expect(isCircle(square)).toBe(false);
	});

	test("keeps only the matching members when used with filter", () => {
		const isCircle = isTaggedWith("kind", "circle");
		expect(shapes.filter(isCircle)).toEqual([circle]);
	});

	test("works with numeric tags", () => {
		const isOne = isTaggedWith("code", 1);
		const coded: Coded[] = [
			{ code: 1, a: "x" },
			{ code: 2, b: 9 },
		];
		expect(coded.filter(isOne)).toEqual([{ code: 1, a: "x" }]);
	});

	test("works with symbol tags", () => {
		const isSym = isTaggedWith("kind", TAG);
		const values: SymTagged[] = [
			{ kind: TAG, a: 1 },
			{ kind: "plain", b: 2 },
		];
		expect(values.filter(isSym)).toEqual([{ kind: TAG, a: 1 }]);
	});

	test("does not match on a loosely-equal tag", () => {
		const isOne = isTaggedWith("code", 1);
		// "1" == 1 is true, but the comparison must be strict.
		expect(isOne({ code: "1" as unknown as 1 })).toBe(false);
	});
});

describe("byTag", () => {
	test("binds the key once and mints independent guards", () => {
		const byKind = byTag("kind");
		const isCircle = byKind("circle");
		const isRect = byKind("rect");

		expect(isCircle(circle)).toBe(true);
		expect(isCircle(rect)).toBe(false);
		expect(isRect(rect)).toBe(true);
		expect(shapes.filter(isRect)).toEqual([rect]);
	});

	test("separately-bound factories do not share their key", () => {
		const byKind = byTag("kind");
		const byCode = byTag("code");
		expect(byKind("circle")(circle)).toBe(true);
		expect(byCode(1)({ code: 1, a: "x" })).toBe(true);
		expect(byCode(2)({ code: 1, a: "x" })).toBe(false);
	});
});

describe("matchTag", () => {
	test("dispatches to the arm named by the tag", () => {
		expect(matchTag(circle, "kind", area)).toBe(4);
		expect(matchTag(square, "kind", area)).toBe(9);
		expect(matchTag(rect, "kind", area)).toBe(20);
	});

	test("hands each arm its own narrowed member", () => {
		const received = matchTag(square, "kind", {
			circle: (c: Circle) => c,
			square: (q: Square) => q,
			rect: (r: Rect) => r,
		});
		expect(received).toBe(square);
	});

	test("returns the arm's value even when it is falsy", () => {
		const zeroed = matchTag(circle, "kind", {
			circle: () => 0,
			square: () => 1,
			rect: () => 2,
		});
		expect(zeroed).toBe(0);
	});

	test("works with numeric tags", () => {
		const coded = anyCoded({ code: 2, b: 9 });
		expect(matchTag(coded, "code", { 1: (m) => m.a, 2: (m) => String(m.b) })).toBe("9");
	});

	test("works with symbol tags", () => {
		const value = anySymTagged({ kind: TAG, a: 7 });
		expect(matchTag(value, "kind", { [TAG]: (m) => m.a, plain: (m) => m.b })).toBe(7);
	});

	test("throws UnhandledTagError when the data's tag is not in the handlers", () => {
		const rogue = asShape({ kind: "hexagon", sides: 6 });
		expect(() => matchTag(rogue, "kind", area)).toThrow(UnhandledTagError);
	});

	test("names the offending tag and key in the error", () => {
		const rogue = asShape({ kind: "hexagon" });
		try {
			matchTag(rogue, "kind", area);
			expect.unreachable("matchTag must throw for an unhandled tag");
		} catch (error) {
			expect(isUnhandledTagError(error)).toBe(true);
			expect((error as UnhandledTagError).tag).toBe("hexagon");
			expect((error as UnhandledTagError).key).toBe("kind");
			expect((error as Error).message).toContain("hexagon");
			expect((error as Error).message).toContain("kind");
		}
	});

	test("does not dispatch into an inherited Object.prototype method", () => {
		// Without an own-property check, handlers["toString"] resolves to
		// Object.prototype.toString — a callable — and would silently return
		// "[object Object]" instead of failing.
		for (const inherited of ["toString", "valueOf", "constructor", "hasOwnProperty"]) {
			const polluted = asShape({ kind: inherited });
			expect(() => matchTag(polluted, "kind", area)).toThrow(UnhandledTagError);
		}
	});

	test("throws rather than dispatching for a __proto__ tag", () => {
		const polluted = asShape({ kind: "__proto__" });
		expect(() => matchTag(polluted, "kind", area)).toThrow(UnhandledTagError);
	});
});

describe("matchTagPartial", () => {
	test("uses a matching arm when one is present", () => {
		expect(matchTagPartial(circle, "kind", { circle: (c) => c.radius }, () => "none")).toBe(2);
	});

	test("routes an unhandled tag to the fallback instead of throwing", () => {
		const value = anyShape(rect);
		expect(matchTagPartial(value, "kind", { circle: (c) => c.radius }, () => "none")).toBe("none");
	});

	test("hands the fallback the whole un-narrowed member", () => {
		const value = anyShape(rect);
		const seen = matchTagPartial(value, "kind", { circle: () => null }, (member) => member);
		expect(seen).toBe(rect);
	});

	test("always falls back when no arms are supplied", () => {
		expect(matchTagPartial(circle, "kind", {}, () => "none")).toBe("none");
		expect(matchTagPartial(rect, "kind", {}, () => "none")).toBe("none");
	});

	test("falls back for a tag inherited from Object.prototype", () => {
		const polluted = asShape({ kind: "toString" });
		expect(matchTagPartial(polluted, "kind", { circle: () => 1 }, () => "none")).toBe("none");
	});

	test("falls back when an arm is present but explicitly undefined", () => {
		const handlers = { circle: undefined } as unknown as { circle?: (c: Circle) => number };
		expect(matchTagPartial(circle, "kind", handlers, () => "none")).toBe("none");
	});
});

describe("UnhandledTagError", () => {
	test("is an instance of itself, of NarrowError, and of Error", () => {
		const error = new UnhandledTagError("hexagon", "kind");
		// NarrowError's constructor re-pins the prototype; the subclass must undo
		// that or `instanceof UnhandledTagError` silently becomes false.
		expect(error).toBeInstanceOf(UnhandledTagError);
		expect(error).toBeInstanceOf(NarrowError);
		expect(error).toBeInstanceOf(Error);
	});

	test("carries the tag, the key, and its own name", () => {
		const error = new UnhandledTagError(404, "code");
		expect(error.tag).toBe(404);
		expect(error.key).toBe("code");
		expect(error.name).toBe("UnhandledTagError");
	});

	test("stringifies a symbol tag instead of throwing on interpolation", () => {
		const error = new UnhandledTagError(TAG, "kind");
		expect(error.tag).toBe(TAG);
		expect(error.message).toContain("Symbol(tag)");
	});

	test("populates the NarrowError context it inherits", () => {
		const error = new UnhandledTagError("hexagon", "kind");
		expect(error.value).toBe("hexagon");
		expect(error.expected).toBe("a tag with a matching handler");
	});
});

describe("isUnhandledTagError", () => {
	test("accepts an instance", () => {
		expect(isUnhandledTagError(new UnhandledTagError("hexagon", "kind"))).toBe(true);
	});

	test("rejects other errors and non-errors", () => {
		expect(isUnhandledTagError(new Error("boom"))).toBe(false);
		expect(isUnhandledTagError(new TypeError("boom"))).toBe(false);
		expect(isUnhandledTagError(new NarrowError("boom"))).toBe(false);
		expect(isUnhandledTagError(null)).toBe(false);
		expect(isUnhandledTagError(undefined)).toBe(false);
		expect(isUnhandledTagError("UnhandledTagError")).toBe(false);
		expect(isUnhandledTagError({})).toBe(false);
	});

	test("recognizes a genuinely cross-realm twin", () => {
		// Built inside a `vm` context, so it fails `instanceof UnhandledTagError`
		// AND `instanceof Error` — the realm has its own Error intrinsic. Gating the
		// fallback on `instanceof Error` made this return false, which is the whole
		// bug: the check most likely to fail cross-realm cannot guard the
		// cross-realm path.
		const alien: unknown = runInNewContext(`
			const e = new Error("No handler for tag x at discriminant kind");
			e.name = "UnhandledTagError";
			e.tag = "x";
			e.key = "kind";
			e
		`);

		expect(alien instanceof Error).toBe(false);
		expect(isUnhandledTagError(alien)).toBe(true);
	});

	test("recognizes a same-realm twin from a duplicated bundle copy", () => {
		const alien = new Error("No handler for tag x at discriminant kind");
		alien.name = "UnhandledTagError";
		Object.assign(alien, { tag: "x", key: "kind" });
		expect(isUnhandledTagError(alien)).toBe(true);
	});

	test("rejects an error that only borrows the name", () => {
		const impostor = new Error("boom");
		impostor.name = "UnhandledTagError";
		expect(isUnhandledTagError(impostor)).toBe(false);
	});

	test("rejects a plain object that merely looks the part", () => {
		expect(isUnhandledTagError({ name: "UnhandledTagError", tag: "x", key: "kind" })).toBe(false);
	});
});

describe("MembersWithoutTag", () => {
	/**
	 * The type erases, so what a runtime test can pin is the *contract it
	 * describes*: the values that actually reach a residual handler must be
	 * exactly the members the peeled tag did not select. Exactness of the type
	 * itself — including the complement law — is asserted in `union.test-d.ts`.
	 */
	const residual = (shape: MembersWithoutTag<Shape, "kind", "circle">): string => shape.kind;

	test("receives every member except the peeled one", () => {
		const reached = shapes.filter((shape) => shape.kind !== "circle").map(residual);
		expect(reached).toStrictEqual(["square", "rect"]);
	});

	test("the peeled member and the residual partition the union", () => {
		const peeled = shapes.filter((shape) => shape.kind === "circle");
		const rest = shapes.filter((shape) => shape.kind !== "circle");
		expect(peeled.length + rest.length).toBe(shapes.length);
		expect(peeled.some((shape) => rest.includes(shape))).toBe(false);
	});

	test("names the parameter of the helper a partial dispatch delegates to", () => {
		// `matchTagPartial`'s fallback is typed with the whole union, because it
		// cannot know which arms the caller supplied. Once the handled arms are
		// known statically, `MembersWithoutTag` is the honest parameter type for
		// whatever that fallback hands the rest of the union to.
		const describeShape = (shape: Shape): string => {
			if (shape.kind === "circle") {
				return `circle:${shape.radius}`;
			}
			return residual(shape);
		};

		expect(shapes.map(describeShape)).toStrictEqual(["circle:2", "square", "rect"]);
	});
});
