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

import { describe, expect, test } from "vitest";
import {
	type Filter,
	compose,
	fromMaybe,
	fromPredicate,
	fromThrowing,
	make,
	mapFail,
	mapPass,
	or,
	toPredicate,
	toUndefined,
} from "./filter.js";
import { NarrowError, type NarrowResult, isNarrowError, parse, tryNarrow } from "./narrow.js";
import type { Refinement } from "./predicate.js";

//#region Fixtures

const isString = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number => typeof value === "number";
/** Rejects everything — pins the "all fail" column of every table. */
const isNothing = (_value: unknown): _value is never => false;
/** Accepts everything and does not narrow — the `Exclude<A, A>` trap, at runtime. */
const isAnything = (_value: unknown): _value is unknown => true;

/** Throw an arbitrary reason without writing a literal `throw`. */
const raise = (reason: unknown): never => {
	throw reason;
};

/**
 * The shared input matrix. Every table below runs the full cross product of this
 * against {@link GUARDS}, so the edge cases are exercised by every law rather
 * than by one bespoke assertion each.
 */
const INPUTS: readonly unknown[] = [
	"ada",
	"",
	"0",
	42,
	0,
	-0,
	Number.NaN,
	Number.POSITIVE_INFINITY,
	Number.NEGATIVE_INFINITY,
	0n,
	true,
	false,
	null,
	undefined,
	[],
	{},
	new Date(0),
	new Date(Number.NaN), // Invalid Date
	Symbol.for("@resq-systems/types#filter-test"),
];

const GUARDS: readonly (readonly [label: string, guard: Refinement<unknown, unknown>])[] = [
	["isString", isString],
	["isNumber", isNumber],
	["isNothing", isNothing],
	["isAnything", isAnything],
];

/** The two literal default messages `parse` produces, written out on purpose. */
const DEFAULT_MESSAGE = "Value did not satisfy the guard";
const expectedMessage = (expected: string | undefined): string =>
	expected === undefined ? DEFAULT_MESSAGE : `Expected ${expected}`;

/**
 * Flatten a result to plain data before comparing. `toStrictEqual` does compare
 * an `Error` subclass's own enumerable properties, so a direct comparison would
 * also work — but it reports the whole object on failure, and it says nothing
 * about *which* fields the two halves are required to agree on. Naming
 * `name`/`message`/`value`/`expected`/`path` here makes the contract between
 * `mapFail` and `parse` explicit and the diff readable.
 */
type Snapshot =
	| { readonly ok: true; readonly value: unknown }
	| {
			readonly ok: false;
			readonly name: string;
			readonly message: string;
			readonly value: unknown;
			readonly expected: string | undefined;
			readonly path: readonly PropertyKey[] | undefined;
	  };

const snapshot = (result: NarrowResult<unknown, NarrowError>): Snapshot =>
	result.ok
		? { ok: true, value: result.value }
		: {
				ok: false,
				name: result.error.name,
				message: result.error.message,
				value: result.error.value,
				expected: result.error.expected,
				path: result.error.path,
			};

//#endregion

//#region Constructors

describe("fromPredicate", () => {
	test.each(GUARDS)("%s partitions every input into exactly one branch", (_name, guard) => {
		const filter = fromPredicate(guard);
		for (const input of INPUTS) {
			const result = filter(input);
			expect(result.ok).toBe(guard(input));
			if (result.ok) {
				expect(result).toStrictEqual({ ok: true, value: input });
				expect("error" in result).toBe(false);
			} else {
				expect(result).toStrictEqual({ ok: false, error: input });
				expect("value" in result).toBe(false);
			}
		}
	});

	test("carries the input by identity on both branches", () => {
		const target = { id: 1 };
		const kept = fromPredicate(isAnything)(target);
		const dropped = fromPredicate(isNothing)(target);
		expect(kept.ok && kept.value).toBe(target);
		expect(!dropped.ok && dropped.error).toBe(target);
	});

	test("keeps -0 distinct from 0 and preserves NaN on both branches", () => {
		const keep = fromPredicate(isNumber);
		const negativeZero = keep(-0);
		expect(negativeZero.ok && Object.is(negativeZero.value, -0)).toBe(true);
		const nan = keep(Number.NaN);
		expect(nan.ok && Number.isNaN(nan.value)).toBe(true);

		const reject = fromPredicate(isString);
		const rejectedZero = reject(-0);
		expect(!rejectedZero.ok && Object.is(rejectedZero.error, -0)).toBe(true);
	});

	test("accepts a plain predicate and carries the input on both branches", () => {
		const isShort = fromPredicate((value: string) => value.length < 4);
		expect(isShort("abc")).toStrictEqual({ ok: true, value: "abc" });
		expect(isShort("abcd")).toStrictEqual({ ok: false, error: "abcd" });
		expect(isShort("")).toStrictEqual({ ok: true, value: "" });
	});
});

describe("make", () => {
	const body = (input: string): NarrowResult<number, string> =>
		input.length % 2 === 0 ? { ok: true, value: input.length } : { ok: false, error: input };

	test("is identity at runtime", () => {
		expect(make(body)).toBe(body);
	});

	test("wraps a hand-written case split", () => {
		const evenLength = make(body);
		expect(evenLength("abcd")).toStrictEqual({ ok: true, value: 4 });
		expect(evenLength("abc")).toStrictEqual({ ok: false, error: "abc" });
		expect(evenLength("")).toStrictEqual({ ok: true, value: 0 });
	});
});

describe("fromMaybe", () => {
	const firstChar = fromMaybe((raw: string) => (raw.length > 0 ? raw[0] : undefined));

	test("passes a produced value and rejects with the original input", () => {
		expect(firstChar("ada")).toStrictEqual({ ok: true, value: "a" });
		expect(firstChar("")).toStrictEqual({ ok: false, error: "" });
	});

	test("treats null as a pass, not a rejection", () => {
		const alwaysNull = fromMaybe((_input: string) => null);
		expect(alwaysNull("x")).toStrictEqual({ ok: true, value: null });
	});

	test("passes NaN and -0, which are values rather than absences", () => {
		const passthrough = fromMaybe((input: number) => input);
		const nan = passthrough(Number.NaN);
		expect(nan.ok && Number.isNaN(nan.value)).toBe(true);
		const negativeZero = passthrough(-0);
		expect(negativeZero.ok && Object.is(negativeZero.value, -0)).toBe(true);
	});

	test("calls the projection exactly once per application", () => {
		let calls = 0;
		const counted = fromMaybe((input: string) => {
			calls += 1;
			return input.length > 0 ? input : undefined;
		});
		counted("a");
		counted("");
		expect(calls).toBe(2);
	});
});

describe("fromThrowing", () => {
	const parseJson = fromThrowing((raw: string): unknown => JSON.parse(raw));

	test("passes the return value and rejects with the input that provoked the throw", () => {
		expect(parseJson('{"id":1}')).toStrictEqual({ ok: true, value: { id: 1 } });
		expect(parseJson("not json")).toStrictEqual({ ok: false, error: "not json" });
	});

	test("catches a thrown non-Error and still rejects with the input", () => {
		const hostile = fromThrowing((input: string): string =>
			raise(input === "" ? "a bare string" : { code: 42 }),
		);
		expect(hostile("")).toStrictEqual({ ok: false, error: "" });
		expect(hostile("x")).toStrictEqual({ ok: false, error: "x" });
	});

	test("passes an undefined return value — only a throw is a rejection", () => {
		const voided = fromThrowing((_input: string): undefined => undefined);
		expect(voided("x")).toStrictEqual({ ok: true, value: undefined });
	});

	test("does not catch an async rejection — the promise passes through as a success", async () => {
		const asyncish = fromThrowing((_input: string) => Promise.reject(new Error("later")));
		const result = asyncish("x");
		expect(result.ok).toBe(true);
		if (result.ok) {
			await expect(result.value).rejects.toThrow("later");
		}
	});
});

//#endregion

//#region Laws

describe("laws", () => {
	/** A pass-through filter — the two-sided identity for `compose`. */
	const identity: Filter<unknown, unknown, never> = (input) => ({ ok: true, value: input });

	test.each(GUARDS)("toPredicate(fromPredicate(%s)) agrees with the guard", (_name, guard) => {
		const decision = toPredicate(fromPredicate(guard));
		for (const input of INPUTS) {
			expect(decision(input)).toBe(guard(input));
		}
	});

	test.each(GUARDS)("mapPass obeys the identity law for %s", (_name, guard) => {
		const self = fromPredicate(guard);
		const mapped = mapPass(self, (value) => value);
		for (const input of INPUTS) {
			expect(mapped(input)).toStrictEqual(self(input));
		}
	});

	test.each(GUARDS)("mapPass obeys the composition law for %s", (_name, guard) => {
		const self = fromPredicate(guard);
		const f = (value: unknown): string => `${String(value)}!`;
		const g = (value: string): number => value.length;
		const twice = mapPass(mapPass(self, f), g);
		const once = mapPass(self, (value) => g(f(value)));
		for (const input of INPUTS) {
			expect(twice(input)).toStrictEqual(once(input));
		}
	});

	test.each(GUARDS)("mapFail obeys the identity law for %s", (_name, guard) => {
		const self = fromPredicate(guard);
		const mapped = mapFail(self, (value) => value);
		for (const input of INPUTS) {
			expect(mapped(input)).toStrictEqual(self(input));
		}
	});

	test.each(GUARDS)("mapFail obeys the composition law for %s", (_name, guard) => {
		const self = fromPredicate(guard);
		const f = (value: unknown): string => `${String(value)}?`;
		const g = (value: string): number => value.length;
		const twice = mapFail(mapFail(self, f), g);
		const once = mapFail(self, (value) => g(f(value)));
		for (const input of INPUTS) {
			expect(twice(input)).toStrictEqual(once(input));
		}
	});

	test("mapPass and mapFail touch exactly one branch each", () => {
		let passCalls = 0;
		let failCalls = 0;
		const self = fromPredicate(isString);
		const mapped = mapPass(self, (value) => {
			passCalls += 1;
			return value;
		});
		const remapped = mapFail(self, (value) => {
			failCalls += 1;
			return value;
		});
		for (const input of INPUTS) {
			mapped(input);
			remapped(input);
		}
		const passes = INPUTS.filter(isString).length;
		expect(passCalls).toBe(passes);
		expect(failCalls).toBe(INPUTS.length - passes);
	});

	test("mapPass and mapFail forward the untouched branch by reference", () => {
		const failure = { ok: false, error: "boom" } as const;
		const success = { ok: true, value: "kept" } as const;
		const alwaysFails: Filter<unknown, never, "boom"> = () => failure;
		const alwaysPasses: Filter<unknown, "kept", never> = () => success;
		expect(mapPass(alwaysFails, (value) => value)("x")).toBe(failure);
		expect(mapFail(alwaysPasses, (value) => value)("x")).toBe(success);
	});

	test("or short-circuits: the right filter never sees a value the left accepted", () => {
		let rightCalls = 0;
		const right: Filter<unknown, unknown, unknown> = (input) => {
			rightCalls += 1;
			return { ok: false, error: input };
		};
		const either = or(fromPredicate(isString), right);
		for (const input of INPUTS) {
			either(input);
		}
		expect(rightCalls).toBe(INPUTS.length - INPUTS.filter(isString).length);
	});

	test("or is associative on every input", () => {
		const a = fromPredicate(isString);
		const b = fromPredicate(isNumber);
		const c = fromPredicate((value: unknown) => typeof value === "boolean");
		const leftNested = or(or(a, b), c);
		const rightNested = or(a, or(b, c));
		for (const input of INPUTS) {
			expect(leftNested(input)).toStrictEqual(rightNested(input));
		}
	});

	test("a rejecting filter is the left identity of or, and an accepting one absorbs it", () => {
		const never = fromPredicate(isNothing);
		const inner = fromPredicate(isString);
		const always = fromPredicate(isAnything);
		for (const input of INPUTS) {
			expect(or(never, inner)(input)).toStrictEqual(inner(input));
			expect(or(always, inner)(input)).toStrictEqual(always(input));
		}
	});

	test("or keeps only the right-hand rejection payload", () => {
		const left = mapFail(fromPredicate(isString), () => "left" as const);
		const right = mapFail(fromPredicate(isNumber), () => "right" as const);
		expect(or(left, right)(true)).toStrictEqual({ ok: false, error: "right" });
	});

	test("compose short-circuits: the second stage never sees a rejected value", () => {
		let secondCalls = 0;
		const second: Filter<string, string, string> = (input) => {
			secondCalls += 1;
			return { ok: true, value: input };
		};
		const composed = compose(fromPredicate(isString), second);
		for (const input of INPUTS) {
			composed(input);
		}
		expect(secondCalls).toBe(INPUTS.filter(isString).length);
	});

	test("compose is associative on every input", () => {
		const a = fromPredicate(isString);
		const b = fromMaybe((raw: string) => {
			const parsed = Number.parseInt(raw, 10);
			return Number.isNaN(parsed) ? undefined : parsed;
		});
		const c = fromPredicate((value: number) => value >= 0);
		const leftNested = compose(compose(a, b), c);
		const rightNested = compose(a, compose(b, c));
		for (const input of INPUTS) {
			expect(leftNested(input)).toStrictEqual(rightNested(input));
		}
	});

	test.each(GUARDS)("an always-passing filter is the identity of compose (%s)", (_name, guard) => {
		const self = fromPredicate(guard);
		for (const input of INPUTS) {
			expect(compose(identity, self)(input)).toStrictEqual(self(input));
			expect(compose(self, identity)(input)).toStrictEqual(self(input));
		}
	});

	test("compose reports which stage rejected when the payload types differ", () => {
		const first = mapFail(fromPredicate(isString), () => "not-a-string" as const);
		const second = mapFail(
			fromPredicate((value: string) => value.length > 1),
			() => "too-short" as const,
		);
		const composed = compose(first, second);
		expect(composed(42)).toStrictEqual({ ok: false, error: "not-a-string" });
		expect(composed("a")).toStrictEqual({ ok: false, error: "too-short" });
		expect(composed("ab")).toStrictEqual({ ok: true, value: "ab" });
	});
});

//#endregion

//#region Anti-drift: pinned against ./narrow

describe("toUndefined is tryNarrow, point-free", () => {
	test.each(GUARDS)("agrees with tryNarrow across the input matrix for %s", (_name, guard) => {
		const unwrap = toUndefined(fromPredicate(guard));
		for (const input of INPUTS) {
			const viaFilter = unwrap(input);
			const viaNarrow = tryNarrow(input, guard);
			expect(viaFilter).toStrictEqual(viaNarrow);
			// `toStrictEqual` would not tell -0 from 0, so pin identity too.
			expect(Object.is(viaFilter, viaNarrow)).toBe(true);
		}
	});

	test("cannot tell a rejection from an accepted undefined — the documented gotcha", () => {
		const passesUndefined: Filter<unknown, unknown, never> = (input) => ({
			ok: true,
			value: input,
		});
		expect(toUndefined(passesUndefined)(undefined)).toBeUndefined();
		expect(toUndefined(fromPredicate(isNothing))(undefined)).toBeUndefined();
	});
});

describe("mapFail(fromPredicate(g), …) is parse", () => {
	const MESSAGES: readonly (string | undefined)[] = [undefined, "custom failure"];
	const EXPECTATIONS: readonly (string | undefined)[] = [undefined, "string"];

	test.each(GUARDS)("agrees with parse across message x expected x input for %s", (_n, guard) => {
		for (const message of MESSAGES) {
			for (const expected of EXPECTATIONS) {
				const viaFilter = mapFail(
					fromPredicate(guard),
					(input) =>
						new NarrowError(message ?? expectedMessage(expected), { value: input, expected }),
				);
				for (const input of INPUTS) {
					expect(snapshot(viaFilter(input))).toStrictEqual(
						snapshot(parse(input, guard, message, expected)),
					);
				}
			}
		}
	});

	test("pins the two default message literals parse produces", () => {
		const withoutExpectation = parse(42, isString);
		expect(withoutExpectation.ok).toBe(false);
		expect(!withoutExpectation.ok && withoutExpectation.error.message).toBe(
			"Value did not satisfy the guard",
		);
		expect(DEFAULT_MESSAGE).toBe("Value did not satisfy the guard");

		const withExpectation = parse(42, isString, undefined, "string");
		expect(!withExpectation.ok && withExpectation.error.message).toBe("Expected string");
		expect(expectedMessage("string")).toBe("Expected string");
	});

	test("the error mapFail builds is recognized by isNarrowError", () => {
		const asString = mapFail(
			fromPredicate(isString),
			(input) => new NarrowError("Expected string", { value: input, expected: "string" }),
		);
		const result = asString(42);
		expect(result.ok).toBe(false);
		expect(!result.ok && isNarrowError(result.error)).toBe(true);
		expect(!result.ok && result.error.value).toBe(42);
	});
});

//#endregion

//#region Bridges

describe("toPredicate", () => {
	test("feeds Array.prototype.filter without an adapter", () => {
		const isKept = toPredicate(fromPredicate(isString));
		const values: readonly unknown[] = ["a", 1, "b", null, undefined];
		expect(values.filter(isKept)).toStrictEqual(["a", "b"]);
	});

	test("ignores the extra arguments Array.prototype.filter passes", () => {
		const isKept = toPredicate(fromPredicate(isNumber));
		// `.filter` calls back with (value, index, array); a Predicate takes one.
		expect([0, "x", 2].filter(isKept)).toStrictEqual([0, 2]);
	});

	test("survives an empty array", () => {
		const isKept = toPredicate(fromPredicate(isString));
		expect(([] as readonly unknown[]).filter(isKept)).toStrictEqual([]);
	});
});

describe("toUndefined", () => {
	test("pairs with ?? on both branches", () => {
		const asString = toUndefined(fromPredicate(isString));
		expect(asString("ada") ?? "fallback").toBe("ada");
		expect(asString(42) ?? "fallback").toBe("fallback");
		// An empty string is falsy but not a rejection — `??` is the right operator.
		expect(asString("") ?? "fallback").toBe("");
	});
});

//#endregion
