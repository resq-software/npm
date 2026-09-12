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
import {
	arrayOf,
	combine,
	combineAll,
	eqBigInt,
	eqBoolean,
	eqDate,
	eqNumber,
	eqSameValue,
	eqStrict,
	eqString,
	type Equivalence,
	make,
	mapInput,
	recordOf,
	structOf,
	tupleOf,
} from "./equivalence.js";

// --- law harness --------------------------------------------------------------
// Every claim this module makes about reflexivity, symmetry and transitivity is
// exercised over a fixed input matrix rather than asserted once on a happy path.
// The matrices deliberately include the values that break naive relations: NaN,
// -0, Invalid Date, and structurally identical values held by two references.

/** Assert `eq(a, a)` for every sample. */
function expectReflexive<A>(eq: Equivalence<A>, samples: readonly A[]): void {
	for (const value of samples) {
		expect(eq(value, value)).toBe(true);
	}
}

/** Assert `eq(a, b) === eq(b, a)` for every ordered pair. */
function expectSymmetric<A>(eq: Equivalence<A>, samples: readonly A[]): void {
	for (const left of samples) {
		for (const right of samples) {
			expect(eq(left, right)).toBe(eq(right, left));
		}
	}
}

/** Assert `eq(a, b) && eq(b, c)` implies `eq(a, c)` for every ordered triple. */
function expectTransitive<A>(eq: Equivalence<A>, samples: readonly A[]): void {
	for (const first of samples) {
		for (const second of samples) {
			if (!eq(first, second)) {
				continue;
			}
			for (const third of samples) {
				if (eq(second, third)) {
					expect(eq(first, third)).toBe(true);
				}
			}
		}
	}
}

/** All three laws over one matrix. */
function expectLawful<A>(eq: Equivalence<A>, samples: readonly A[]): void {
	expectReflexive(eq, samples);
	expectSymmetric(eq, samples);
	expectTransitive(eq, samples);
}

const numbers: readonly number[] = [
	0,
	-0,
	1,
	-1,
	0.1,
	Number.NaN,
	Number.POSITIVE_INFINITY,
	Number.NEGATIVE_INFINITY,
	Number.MAX_SAFE_INTEGER,
	Number.EPSILON,
];

const numbersWithoutNaN: readonly number[] = numbers.filter((value) => !Number.isNaN(value));

const strings: readonly string[] = ["", "a", "A", "abc", "ABC", "é", "é", "  "];

const bigints: readonly bigint[] = [0n, -0n, 1n, -1n, 2n ** 64n];

const dates: readonly Date[] = [
	new Date(0),
	new Date(0),
	new Date(1),
	new Date(-1),
	new Date("not a date"),
	new Date("also not a date"),
];

describe("Equivalence", () => {
	test("a lambda annotated as Equivalence is callable with two values", () => {
		const sameLength: Equivalence<string> = (self, that) => self.length === that.length;
		expect(sameLength("abc", "xyz")).toBe(true);
		expect(sameLength("abc", "wxyz")).toBe(false);
	});

	test("a Predicate-shaped value satisfies the type and is not symmetric", () => {
		// A Predicate<A> is structurally assignable to Equivalence<A>, and the
		// result silently ignores the second value. Documented as a Gotcha; this
		// pins the behavior so the warning cannot quietly become wrong.
		const predicateShaped = ((value: string) => value.length > 0) as Equivalence<string>;
		expect(predicateShaped("a", "")).toBe(true);
		expect(predicateShaped("", "a")).toBe(false);
		expect(predicateShaped("a", "")).not.toBe(predicateShaped("", "a"));
	});
});

describe("make", () => {
	test("forces reflexivity for every value that is === itself", () => {
		const broken = make<string>(() => false);
		expect(broken("a", "a")).toBe(true);
		expect(broken("a", "b")).toBe(false);
	});

	test("forces reflexivity for object references too", () => {
		const broken = make<object>(() => false);
		const value = { id: 1 };
		expect(broken(value, value)).toBe(true);
		expect(broken(value, { id: 1 })).toBe(false);
	});

	test("cannot repair reflexivity at NaN — the one documented hole", () => {
		const broken = make<number>(() => false);
		expect(broken(Number.NaN, Number.NaN)).toBe(false);
		expect(broken(1, 1)).toBe(true);
		// -0 is === 0, so the fast path covers it.
		expect(broken(0, -0)).toBe(true);
	});

	test("does not call the comparison when the values are already ===", () => {
		let calls = 0;
		const counting = make<string>(() => {
			calls += 1;
			return false;
		});
		expect(counting("a", "a")).toBe(true);
		expect(calls).toBe(0);
		expect(counting("a", "b")).toBe(false);
		expect(calls).toBe(1);
	});

	test("preserves the three laws for a lawful comparison", () => {
		type User = { readonly id: string; readonly name: string };
		const sameUser = make<User>((self, that) => self.id === that.id);
		const users: readonly User[] = [
			{ id: "u1", name: "Ada" },
			{ id: "u1", name: "Ada L." },
			{ id: "u2", name: "Ada" },
			{ id: "u3", name: "Grace" },
		];
		expectLawful(sameUser, users);
	});
});

describe("eqStrict", () => {
	test("is === and nothing else", () => {
		const strict = eqStrict<number>();
		expect(strict(1, 1)).toBe(true);
		expect(strict(1, 2)).toBe(false);
		expect(strict(0, -0)).toBe(true);
	});

	test("VIOLATES reflexivity at NaN — the documented law break", () => {
		const strict = eqStrict<number>();
		expect(strict(Number.NaN, Number.NaN)).toBe(false);
	});

	test("is lawful on a NaN-free matrix", () => {
		expectLawful(eqStrict<number>(), numbersWithoutNaN);
		expectLawful(eqStrict<string>(), strings);
	});

	test("compares object identity, not structure", () => {
		const strict = eqStrict<{ readonly id: number }>();
		const value = { id: 1 };
		expect(strict(value, value)).toBe(true);
		expect(strict(value, { id: 1 })).toBe(false);
	});

	test("returns the same shared function on every call", () => {
		expect(eqStrict<string>()).toBe(eqStrict<number>());
	});
});

describe("eqSameValue", () => {
	test("is Object.is: NaN is reflexive and the zeroes are distinct", () => {
		const sameValue = eqSameValue<number>();
		expect(sameValue(Number.NaN, Number.NaN)).toBe(true);
		expect(sameValue(0, -0)).toBe(false);
		expect(sameValue(1, 1)).toBe(true);
	});

	test("is lawful over the full numeric matrix, NaN included", () => {
		expectLawful(eqSameValue<number>(), numbers);
	});

	test("is lawful over strings, bigints and arbitrary references", () => {
		expectLawful(eqSameValue<string>(), strings);
		expectLawful(eqSameValue<bigint>(), bigints);
		const values: readonly unknown[] = [{}, {}, [], Symbol.iterator, null, undefined];
		expectLawful(eqSameValue<unknown>(), values);
	});

	test("the documented three-way table holds exactly", () => {
		const strict = eqStrict<number>();
		const sameValue = eqSameValue<number>();

		expect([
			strict(Number.NaN, Number.NaN),
			sameValue(Number.NaN, Number.NaN),
			eqNumber(Number.NaN, Number.NaN),
		]).toStrictEqual([false, true, true]);

		expect([strict(0, -0), sameValue(0, -0), eqNumber(0, -0)]).toStrictEqual([true, false, true]);
	});

	test("returns the same shared function on every call", () => {
		expect(eqSameValue<string>()).toBe(eqSameValue<number>());
	});
});

describe("eqString", () => {
	test("is exact string equality", () => {
		expect(eqString("abc", "abc")).toBe(true);
		expect(eqString("abc", "ABC")).toBe(false);
		expect(eqString("", "")).toBe(true);
	});

	test("compares code units, so composed and precomposed accents differ", () => {
		expect(eqString("é", "é")).toBe(false);
		const normalized = mapInput(eqString, (value: string) => value.normalize("NFC"));
		expect(normalized("é", "é")).toBe(true);
	});

	test("is lawful", () => {
		expectLawful(eqString, strings);
	});
});

describe("eqNumber", () => {
	test("equates NaN with itself and the two zeroes with each other", () => {
		expect(eqNumber(1, 1)).toBe(true);
		expect(eqNumber(1, 2)).toBe(false);
		expect(eqNumber(Number.NaN, Number.NaN)).toBe(true);
		expect(eqNumber(0, -0)).toBe(true);
	});

	test("does not equate NaN with anything else", () => {
		for (const value of numbersWithoutNaN) {
			expect(eqNumber(Number.NaN, value)).toBe(false);
			expect(eqNumber(value, Number.NaN)).toBe(false);
		}
	});

	test("handles the infinities", () => {
		expect(eqNumber(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)).toBe(true);
		expect(eqNumber(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY)).toBe(false);
	});

	test("is lawful over the full numeric matrix, NaN included", () => {
		expectLawful(eqNumber, numbers);
	});
});

describe("eqBoolean", () => {
	test("is === over the two inhabitants", () => {
		expect(eqBoolean(true, true)).toBe(true);
		expect(eqBoolean(false, false)).toBe(true);
		expect(eqBoolean(true, false)).toBe(false);
	});

	test("is lawful", () => {
		expectLawful(eqBoolean, [true, false]);
	});
});

describe("eqBigInt", () => {
	test("is === over bigints, and 0n has no signed counterpart", () => {
		expect(eqBigInt(1n, 1n)).toBe(true);
		expect(eqBigInt(1n, 2n)).toBe(false);
		expect(eqBigInt(0n, -0n)).toBe(true);
		expect(eqBigInt(2n ** 64n, 2n ** 64n)).toBe(true);
	});

	test("is lawful", () => {
		expectLawful(eqBigInt, bigints);
	});
});

describe("eqDate", () => {
	test("compares the instant, not the reference", () => {
		expect(eqDate(new Date(0), new Date(0))).toBe(true);
		expect(eqDate(new Date(0), new Date(1))).toBe(false);
	});

	test("treats all Invalid Dates as one value", () => {
		expect(eqDate(new Date("nope"), new Date("also nope"))).toBe(true);
		const invalid = new Date("nope");
		expect(eqDate(invalid, invalid)).toBe(true);
		expect(eqDate(invalid, new Date(0))).toBe(false);
	});

	test("works across realms, because it never uses instanceof", () => {
		const foreign = runInNewContext("new Date(0)") as Date;
		expect(foreign instanceof Date).toBe(false);
		expect(eqDate(foreign, new Date(0))).toBe(true);
		expect(eqDate(foreign, new Date(1))).toBe(false);
	});

	test("is lawful, including over Invalid Dates", () => {
		expectLawful(eqDate, dates);
	});
});

describe("combine", () => {
	type Person = { readonly name: string; readonly age: number };
	const byName = mapInput(eqString, (person: Person) => person.name);
	const byAge = mapInput(eqNumber, (person: Person) => person.age);
	const people: readonly Person[] = [
		{ name: "Ada", age: 36 },
		{ name: "Ada", age: 36 },
		{ name: "Ada", age: 41 },
		{ name: "Bob", age: 36 },
		{ name: "Bob", age: 41 },
	];

	test("holds exactly when both parts hold", () => {
		const samePerson = combine(byName, byAge);
		expect(samePerson({ name: "Ada", age: 36 }, { name: "Ada", age: 36 })).toBe(true);
		expect(samePerson({ name: "Ada", age: 36 }, { name: "Ada", age: 41 })).toBe(false);
		expect(samePerson({ name: "Ada", age: 36 }, { name: "Bob", age: 36 })).toBe(false);
	});

	test("short-circuits: the second relation never runs after a false", () => {
		let calls = 0;
		const refuse: Equivalence<string> = () => false;
		const counting: Equivalence<string> = () => {
			calls += 1;
			return true;
		};
		expect(combine(refuse, counting)("a", "b")).toBe(false);
		expect(calls).toBe(0);
	});

	test("the intersection of two lawful relations is lawful", () => {
		expectLawful(combine(byName, byAge), people);
	});

	test("is commutative in outcome", () => {
		const left = combine(byName, byAge);
		const right = combine(byAge, byName);
		for (const first of people) {
			for (const second of people) {
				expect(left(first, second)).toBe(right(first, second));
			}
		}
	});
});

describe("combineAll", () => {
	type Row = { readonly id: string; readonly rev: number };
	const byId = mapInput(eqString, (row: Row) => row.id);
	const byRev = mapInput(eqNumber, (row: Row) => row.rev);
	const rows: readonly Row[] = [
		{ id: "a", rev: 1 },
		{ id: "a", rev: 1 },
		{ id: "a", rev: 2 },
		{ id: "b", rev: 1 },
	];

	test("holds exactly when every member holds", () => {
		const sameRow = combineAll([byId, byRev]);
		expect(sameRow({ id: "a", rev: 1 }, { id: "a", rev: 1 })).toBe(true);
		expect(sameRow({ id: "a", rev: 1 }, { id: "a", rev: 2 })).toBe(false);
	});

	test("the empty collection is the total relation", () => {
		const everythingIsTheSame = combineAll<string>([]);
		expect(everythingIsTheSame("a", "b")).toBe(true);
		expect(everythingIsTheSame("", "anything")).toBe(true);
		expectLawful(everythingIsTheSame, strings);
	});

	test("the empty fold is the identity element for combine", () => {
		const identity = combineAll<string>([]);
		const combined = combine(identity, eqString);
		for (const left of strings) {
			for (const right of strings) {
				expect(combined(left, right)).toBe(eqString(left, right));
			}
		}
	});

	test("materializes eagerly, so a one-shot iterator survives repeated calls", () => {
		const once = new Set<Equivalence<string>>([eqString]).values();
		const sameString = combineAll<string>(once);
		expect(sameString("a", "b")).toBe(false);
		// A lazily re-iterated (already drained) iterator would answer `true` here.
		expect(sameString("a", "b")).toBe(false);
	});

	test("materializes eagerly, so later mutation of the source is not observed", () => {
		const source: Equivalence<string>[] = [];
		const sameString = combineAll(source);
		source.push(() => false);
		expect(sameString("a", "b")).toBe(true);
	});

	test("short-circuits on the first false, in iteration order", () => {
		let calls = 0;
		const refuse: Equivalence<string> = () => false;
		const counting: Equivalence<string> = () => {
			calls += 1;
			return true;
		};
		expect(combineAll([refuse, counting])("a", "b")).toBe(false);
		expect(calls).toBe(0);
	});

	test("an intersection of lawful relations is lawful", () => {
		expectLawful(combineAll([byId, byRev]), rows);
	});
});

describe("mapInput", () => {
	test("compares the projection", () => {
		const caseInsensitive = mapInput(eqString, (value: string) => value.toLowerCase());
		expect(caseInsensitive("Hello", "HELLO")).toBe(true);
		expect(caseInsensitive("Hello", "World")).toBe(false);
	});

	test("does not run the projection when the inputs are already ===", () => {
		let projections = 0;
		const byId = mapInput(eqString, (value: { readonly id: string }) => {
			projections += 1;
			return value.id;
		});
		const value = { id: "a" };
		expect(byId(value, value)).toBe(true);
		expect(projections).toBe(0);
		expect(byId(value, { id: "a" })).toBe(true);
		expect(projections).toBe(2);
	});

	test("preserves the three laws for a pure projection", () => {
		type User = { readonly id: string; readonly name: string };
		const users: readonly User[] = [
			{ id: "u1", name: "Ada" },
			{ id: "u1", name: "Ada L." },
			{ id: "u2", name: "Grace" },
			{ id: "u3", name: "Grace" },
		];
		expectLawful(
			mapInput(eqString, (user: User) => user.id),
			users,
		);
	});

	test("a nondeterministic projection breaks reflexivity for distinct-but-equal values", () => {
		let counter = 0;
		const impure = mapInput(eqNumber, (_value: { readonly id: number }) => {
			counter += 1;
			return counter;
		});
		const left = { id: 1 };
		const right = { id: 1 };
		// The reference fast path still answers `true`...
		expect(impure(left, left)).toBe(true);
		// ...but two structurally identical values are a coin flip. Documented Gotcha.
		expect(impure(left, right)).toBe(false);
	});
});

describe("tupleOf", () => {
	const samePair = tupleOf([eqString, eqNumber]);

	test("compares positionally", () => {
		expect(samePair(["Ada", 36], ["Ada", 36])).toBe(true);
		expect(samePair(["Ada", 36], ["Ada", 41])).toBe(false);
		expect(samePair(["Ada", 36], ["Bob", 36])).toBe(false);
	});

	test("inherits the element relations' edge cases", () => {
		expect(samePair(["a", Number.NaN], ["a", Number.NaN])).toBe(true);
		expect(samePair(["a", 0], ["a", -0])).toBe(true);
	});

	test("length-checks both sides", () => {
		const widened = samePair as unknown as Equivalence<readonly unknown[]>;
		expect(widened(["a", 1, "extra"], ["a", 1])).toBe(false);
		expect(widened(["a", 1], ["a", 1, "extra"])).toBe(false);
		expect(widened(["a"], ["a", 1])).toBe(false);
	});

	test("the empty tuple relation accepts the empty tuple", () => {
		const sameEmpty = tupleOf([]);
		expect(sameEmpty([], [])).toBe(true);
		const widened = sameEmpty as unknown as Equivalence<readonly unknown[]>;
		expect(widened([], [1])).toBe(false);
	});

	test("is lawful", () => {
		const pairs: readonly (readonly [string, number])[] = [
			["a", 1],
			["a", 1],
			["a", 2],
			["b", 1],
			["a", Number.NaN],
			["a", Number.NaN],
		];
		expectLawful(samePair, pairs);
	});
});

describe("arrayOf", () => {
	const sameStrings = arrayOf(eqString);

	test("compares element-wise and is order-sensitive", () => {
		expect(sameStrings(["a", "b"], ["a", "b"])).toBe(true);
		expect(sameStrings(["a", "b"], ["b", "a"])).toBe(false);
	});

	test("empty arrays are equivalent", () => {
		expect(sameStrings([], [])).toBe(true);
	});

	test("length mismatch is false in both directions", () => {
		expect(sameStrings(["a"], ["a", "b"])).toBe(false);
		expect(sameStrings(["a", "b"], ["a"])).toBe(false);
	});

	test("reads by index, so a hole compares as undefined", () => {
		const holes = arrayOf(eqSameValue<number | undefined>());
		const sparse: (number | undefined)[] = [];
		sparse[0] = 1;
		sparse[2] = 3;
		sparse.length = 3;
		expect(Object.hasOwn(sparse, 1)).toBe(false);
		expect(holes(sparse, [1, undefined, 3])).toBe(true);
		expect(holes(sparse, [1, 2, 3])).toBe(false);
	});

	test("inherits the element relation's edge cases", () => {
		const sameNumbers = arrayOf(eqNumber);
		expect(sameNumbers([Number.NaN], [Number.NaN])).toBe(true);
		expect(arrayOf(eqStrict<number>())([Number.NaN], [Number.NaN])).toBe(false);
	});

	test("is lawful", () => {
		const lists: readonly (readonly string[])[] = [[], [], ["a"], ["a"], ["a", "b"], ["b", "a"]];
		expectLawful(sameStrings, lists);
	});
});

describe("structOf", () => {
	const sameUser = structOf({ name: eqString, age: eqNumber });

	test("compares the listed fields", () => {
		expect(sameUser({ name: "Ada", age: 36 }, { name: "Ada", age: 36 })).toBe(true);
		expect(sameUser({ name: "Ada", age: 36 }, { name: "Bob", age: 36 })).toBe(false);
		expect(sameUser({ name: "Ada", age: 36 }, { name: "Ada", age: 41 })).toBe(false);
	});

	test("ignores unlisted properties", () => {
		const sameName = structOf({ name: eqString });
		const left = { name: "Ada", email: "ada@example.com" };
		const right = { name: "Ada", email: "lovelace@example.com" };
		expect(sameName(left, right)).toBe(true);
	});

	test("a field missing on both sides compares undefined against undefined", () => {
		const sameMeta = structOf({ meta: eqSameValue<unknown>() });
		const present: { readonly meta: unknown } = { meta: undefined };
		const absent = {} as { readonly meta: unknown };
		expect(sameMeta(present, absent)).toBe(true);
		expect(sameMeta(absent, absent)).toBe(true);
	});

	test("an empty field map is the total relation", () => {
		const sameNothing = structOf({});
		expect(sameNothing({}, {})).toBe(true);
		const widened = sameNothing as unknown as Equivalence<unknown>;
		expect(widened({ a: 1 }, { b: 2 })).toBe(true);
	});

	test("short-circuits on the first mismatching field", () => {
		let calls = 0;
		const counting: Equivalence<string> = () => {
			calls += 1;
			return true;
		};
		const eq = structOf({ first: eqString, second: counting });
		expect(eq({ first: "a", second: "x" }, { first: "b", second: "x" })).toBe(false);
		expect(calls).toBe(0);
	});

	test("inherits the field relations' edge cases", () => {
		const lenient = structOf({ score: eqNumber });
		const strict = structOf({ score: eqStrict<number>() });
		expect(lenient({ score: Number.NaN }, { score: Number.NaN })).toBe(true);
		expect(strict({ score: Number.NaN }, { score: Number.NaN })).toBe(false);
	});

	test("is lawful", () => {
		const users = [
			{ name: "Ada", age: 36 },
			{ name: "Ada", age: 36 },
			{ name: "Ada", age: 41 },
			{ name: "Bob", age: 36 },
		];
		expectLawful(sameUser, users);
	});
});

describe("recordOf", () => {
	const sameScores = recordOf(eqNumber);

	test("compares every own key", () => {
		expect(sameScores({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
		expect(sameScores({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
	});

	test("key order is irrelevant", () => {
		expect(sameScores({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
	});

	test("empty records are equivalent", () => {
		expect(sameScores({}, {})).toBe(true);
	});

	test("a key-count mismatch is false in both directions", () => {
		expect(sameScores({ a: 1 }, { a: 1, b: 2 })).toBe(false);
		expect(sameScores({ a: 1, b: 2 }, { a: 1 })).toBe(false);
	});

	test("inherited properties are not own keys and are not compared", () => {
		const inherited = Object.create({ a: 1 }) as Record<string, number>;
		expect(inherited.a).toBe(1);
		expect(Object.keys(inherited)).toStrictEqual([]);
		expect(sameScores(inherited, {})).toBe(true);
	});

	test("a matching key count with a different key set is false", () => {
		const shadowed = Object.create({ a: 1 }, { b: { value: 1, enumerable: true } }) as Record<
			string,
			number
		>;
		expect(Object.keys(shadowed)).toStrictEqual(["b"]);
		expect(sameScores({ a: 1 }, shadowed)).toBe(false);
	});

	test("symbol keys are outside the type and are not compared", () => {
		const key = Symbol("hidden");
		const left = { a: 1, [key]: 1 } as Record<string, number>;
		const right = { a: 1, [key]: 2 } as Record<string, number>;
		expect(sameScores(left, right)).toBe(true);
	});

	test("inherits the value relation's edge cases", () => {
		expect(sameScores({ a: Number.NaN }, { a: Number.NaN })).toBe(true);
		expect(recordOf(eqStrict<number>())({ a: Number.NaN }, { a: Number.NaN })).toBe(false);
		expect(recordOf(eqSameValue<number>())({ a: 0 }, { a: -0 })).toBe(false);
	});

	test("a non-enumerable own key is not a key", () => {
		// `Object.hasOwn` sees this key but `Object.keys` does not. Testing
		// membership with the former while counting with the latter made the
		// relation asymmetric: two records with disjoint enumerable key sets
		// compared equal in one direction and unequal in the other.
		const right = { b: 2 } as Record<string, number>;
		Object.defineProperty(right, "a", { value: 1 });
		expect(Object.hasOwn(right, "a")).toBe(true);
		expect(Object.keys(right)).toStrictEqual(["b"]);
		expect(sameScores({ a: 1 }, right)).toBe(false);
		expect(sameScores(right, { a: 1 })).toBe(false);
	});

	test("is lawful", () => {
		const nonEnumerable = { b: 2 } as Record<string, number>;
		Object.defineProperty(nonEnumerable, "a", { value: 1 });
		const records: readonly Readonly<Record<string, number>>[] = [
			{},
			{},
			{ a: 1 },
			{ a: 1 },
			{ a: 2 },
			{ a: 1, b: 2 },
			{ b: 2, a: 1 },
			nonEnumerable,
			{ b: 2 },
		];
		expectLawful(sameScores, records);
	});
});
