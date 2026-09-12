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
 * @fileoverview Runtime tests for total orders.
 *
 * The centrepiece is `assertOrderLaws`, which exercises totality, reflexivity,
 * antisymmetry, and transitivity over a fixed input matrix — every pair for the
 * first three, every triple for the last. Every exported instance and every
 * derived order is run through it, because a combinator that quietly breaks
 * transitivity produces a sort whose result depends on the engine's algorithm
 * and on the input's initial order, which is exactly the failure that never
 * reproduces.
 *
 * The matrices deliberately include the values that break naive comparators:
 * `NaN`, `-0`, both infinities, the empty string, an Invalid Date, an empty
 * array, and an array hole.
 */

import { describe, expect, test } from "vitest";
import {
	alwaysEqual,
	arrayOf,
	clamp,
	combine,
	combineAll,
	fromCompare,
	isBetween,
	isGreaterThan,
	isGreaterThanOrEqualTo,
	isLessThan,
	isLessThanOrEqualTo,
	make,
	mapInput,
	max,
	min,
	type Order,
	orderBigInt,
	orderBoolean,
	orderDate,
	orderNumber,
	orderString,
	type Ordering,
	reverse,
	structOf,
	toEquivalence,
	tupleOf,
} from "./order.js";

// --- fixtures -----------------------------------------------------------------

type Row = { readonly rank: number; readonly name: string };
type Tagged = { readonly n: number; readonly id: string };

const NUMBERS: readonly number[] = [
	Number.NEGATIVE_INFINITY,
	-42,
	-1,
	-0,
	0,
	1,
	42,
	Number.POSITIVE_INFINITY,
	Number.NaN,
];

/** The same matrix minus `NaN`, for comparators that cannot survive it. */
const FINITE_NUMBERS: readonly number[] = NUMBERS.filter((value) => !Number.isNaN(value));

const STRINGS: readonly string[] = ["", " ", "A", "Z", "a", "ab", "b", "é"];

const BOOLEANS: readonly boolean[] = [false, true];

const BIGINTS: readonly bigint[] = [-(2n ** 64n), -1n, 0n, 1n, 2n, 2n ** 64n];

const DATES: readonly Date[] = [
	new Date(-1),
	new Date(0),
	new Date(1),
	new Date("2020-01-01T00:00:00.000Z"),
	new Date("nope"),
	new Date(Number.NaN),
];

const ROWS: readonly Row[] = [
	{ rank: 0, name: "" },
	{ rank: 0, name: "a" },
	{ rank: 0, name: "b" },
	{ rank: 1, name: "a" },
	{ rank: 1, name: "b" },
	{ rank: 2, name: "a" },
];

const PAIRS: readonly (readonly [string, number])[] = [
	["", 0],
	["a", 0],
	["a", 1],
	["a", Number.NaN],
	["b", -1],
	["b", 0],
];

const NUMBER_ARRAYS: readonly (readonly number[])[] = [
	[],
	[0],
	[0, 0],
	[0, 1],
	[1],
	[1, 0],
	[Number.NaN],
];

const byRank = mapInput(orderNumber, (row: Row) => row.rank);
const byName = mapInput(orderString, (row: Row) => row.name);

/**
 * An order that answers with non-canonical magnitudes. It only exists through a
 * cast — the type system rejects it, which is the point — and it is the probe
 * that proves every consumer here compares by sign rather than by `=== -1`.
 */
const leaky: Order<number> = ((self: number, that: number): number =>
	self < that ? -5 : self > that ? 7 : 0) as unknown as Order<number>;

// --- law helpers --------------------------------------------------------------

/** Totality: every pair answers exactly one of the three legal values. */
function assertTotal<A>(order: Order<A>, values: readonly A[]): void {
	for (const self of values) {
		for (const that of values) {
			expect([-1, 0, 1]).toContain(order(self, that));
		}
	}
}

/** Reflexivity: every value is equal to itself. */
function assertReflexive<A>(order: Order<A>, values: readonly A[]): void {
	for (const value of values) {
		expect(order(value, value)).toBe(0);
	}
}

/** Antisymmetry: swapping the arguments flips the sign, and fixes zero. */
function assertAntisymmetric<A>(order: Order<A>, values: readonly A[]): void {
	for (const self of values) {
		for (const that of values) {
			const forward = order(self, that);
			const backward = order(that, self);
			if (forward === 0) {
				expect(backward).toBe(0);
			} else if (forward < 0) {
				expect(backward).toBeGreaterThan(0);
			} else {
				expect(backward).toBeLessThan(0);
			}
		}
	}
}

/** Transitivity, in its weak, strict, and equality forms. */
function assertTransitive<A>(order: Order<A>, values: readonly A[]): void {
	for (const a of values) {
		for (const b of values) {
			const ab = order(a, b);
			for (const c of values) {
				const bc = order(b, c);
				const ac = order(a, c);
				if (ab <= 0 && bc <= 0) {
					expect(ac).toBeLessThanOrEqual(0);
				}
				if (ab < 0 && bc < 0) {
					expect(ac).toBeLessThan(0);
				}
				if (ab === 0 && bc === 0) {
					expect(ac).toBe(0);
				}
			}
		}
	}
}

/** Sorting the matrix must produce a non-decreasing sequence. */
function assertSortsConsistently<A>(order: Order<A>, values: readonly A[]): void {
	const sorted = [...values].sort(order);
	for (let index = 1; index < sorted.length; index += 1) {
		expect(order(sorted[index - 1] as A, sorted[index] as A)).toBeLessThanOrEqual(0);
	}
}

/** The full battery. Every order in this module is put through it. */
function assertOrderLaws<A>(order: Order<A>, values: readonly A[]): void {
	assertTotal(order, values);
	assertReflexive(order, values);
	assertAntisymmetric(order, values);
	assertTransitive(order, values);
	assertSortsConsistently(order, values);
}

/** Reflexivity, symmetry, transitivity — for the relations `toEquivalence` builds. */
function assertEquivalenceLaws<A>(
	equivalent: (self: A, that: A) => boolean,
	values: readonly A[],
): void {
	for (const a of values) {
		expect(equivalent(a, a)).toBe(true);
	}
	for (const a of values) {
		for (const b of values) {
			expect(equivalent(a, b)).toBe(equivalent(b, a));
		}
	}
	for (const a of values) {
		for (const b of values) {
			if (!equivalent(a, b)) {
				continue;
			}
			for (const c of values) {
				if (equivalent(b, c)) {
					expect(equivalent(a, c)).toBe(true);
				}
			}
		}
	}
}

// --- laws ---------------------------------------------------------------------

describe("order laws", () => {
	test("orderString is a total order over the string matrix", () => {
		assertOrderLaws(orderString, STRINGS);
	});

	test("orderNumber is a total order over the numeric matrix, NaN included", () => {
		assertOrderLaws(orderNumber, NUMBERS);
	});

	test("orderBoolean is a total order", () => {
		assertOrderLaws(orderBoolean, BOOLEANS);
	});

	test("orderBigInt is a total order", () => {
		assertOrderLaws(orderBigInt, BIGINTS);
	});

	test("orderDate is a total order, Invalid Dates included", () => {
		assertOrderLaws(orderDate, DATES);
	});

	test("alwaysEqual is a total order — the degenerate one", () => {
		assertOrderLaws(alwaysEqual<number>(), NUMBERS);
	});

	test("reverse preserves the laws", () => {
		assertOrderLaws(reverse(orderNumber), NUMBERS);
		assertOrderLaws(reverse(orderDate), DATES);
	});

	test("mapInput preserves the laws", () => {
		assertOrderLaws(byRank, ROWS);
		assertOrderLaws(byName, ROWS);
	});

	test("combine preserves the laws", () => {
		assertOrderLaws(combine(byRank, byName), ROWS);
		assertOrderLaws(combine(byName, byRank), ROWS);
	});

	test("combineAll preserves the laws, including the empty fold", () => {
		assertOrderLaws(combineAll([byRank, byName]), ROWS);
		assertOrderLaws(combineAll<Row>([]), ROWS);
	});

	test("tupleOf preserves the laws", () => {
		assertOrderLaws(tupleOf([orderString, orderNumber]), PAIRS);
	});

	test("arrayOf preserves the laws", () => {
		assertOrderLaws(arrayOf(orderNumber), NUMBER_ARRAYS);
	});

	test("structOf preserves the laws", () => {
		assertOrderLaws(structOf({ rank: orderNumber, name: orderString }), ROWS);
	});

	test("fromCompare preserves the laws when the comparator is lawful", () => {
		assertOrderLaws(
			fromCompare<number>((self, that) => self - that),
			FINITE_NUMBERS,
		);
		assertOrderLaws(
			fromCompare<string>((self, that) => self.localeCompare(that)),
			STRINGS,
		);
	});

	test("a subtraction comparator is NOT lawful once NaN is in the matrix", () => {
		// Not a defect in fromCompare — a demonstration of why orderNumber exists.
		// `NaN - x` is `NaN`, which fromCompare must totalise to "equal", so NaN
		// ends up equal to every number and transitivity collapses.
		const bySubtraction = fromCompare<number>((self, that) => self - that);

		expect(bySubtraction(Number.NaN, 1)).toBe(0);
		expect(bySubtraction(Number.NaN, 2)).toBe(0);
		expect(bySubtraction(1, 2)).toBe(-1);

		// ...whereas orderNumber keeps transitivity by giving NaN a real position.
		expect(orderNumber(Number.NaN, 1)).toBe(-1);
		expect(orderNumber(Number.NaN, 2)).toBe(-1);
	});
});

// --- vocabulary ---------------------------------------------------------------

describe("Ordering", () => {
	test("an instance only ever answers -1, 0, or 1", () => {
		const answers = new Set<Ordering>();
		for (const self of NUMBERS) {
			for (const that of NUMBERS) {
				answers.add(orderNumber(self, that));
			}
		}
		expect([...answers].sort(orderNumber)).toStrictEqual([-1, 0, 1]);
	});
});

// --- constructors -------------------------------------------------------------

describe("make", () => {
	test("forces reflexivity even when the comparison would not", () => {
		// A deliberately non-reflexive comparison: it never answers 0.
		const broken = make<string>(() => 1);
		const value = "x";

		expect(broken(value, value)).toBe(0);
		expect(broken("a", "b")).toBe(1);
	});

	test("the reference-equality fast path short-circuits before the callback", () => {
		let calls = 0;
		const counted = make<string>((self, that) => {
			calls += 1;
			return self < that ? -1 : 1;
		});

		counted("a", "a");
		expect(calls).toBe(0);

		counted("a", "b");
		expect(calls).toBe(1);
	});

	test("0 and -0 take the fast path, since they are reference-equal", () => {
		let calls = 0;
		const counted = make<number>((self, that) => {
			calls += 1;
			return self < that ? -1 : 1;
		});

		expect(counted(0, -0)).toBe(0);
		expect(counted(-0, 0)).toBe(0);
		expect(calls).toBe(0);
	});
});

describe("fromCompare", () => {
	test("normalises every magnitude to a sign", () => {
		expect(fromCompare<number>(() => -5)(1, 2)).toBe(-1);
		expect(fromCompare<number>(() => -1)(1, 2)).toBe(-1);
		expect(fromCompare<number>(() => Number.NEGATIVE_INFINITY)(1, 2)).toBe(-1);
		expect(fromCompare<number>(() => 7)(1, 2)).toBe(1);
		expect(fromCompare<number>(() => Number.POSITIVE_INFINITY)(1, 2)).toBe(1);
		expect(fromCompare<number>(() => 0)(1, 2)).toBe(0);
	});

	test("-0 normalises to 0, not to -1", () => {
		const result = fromCompare<number>(() => -0)(1, 2);
		expect(result).toBe(0);
		expect(Object.is(result, -0)).toBe(false);
	});

	test("NaN collapses to equal — the only total answer", () => {
		expect(fromCompare<number>(() => Number.NaN)(1, 2)).toBe(0);
	});

	test("has no reference-equality fast path: the comparator always runs", () => {
		let calls = 0;
		const counted = fromCompare<string>((self, that) => {
			calls += 1;
			return self < that ? -1 : self > that ? 1 : 0;
		});

		expect(counted("a", "a")).toBe(0);
		expect(calls).toBe(1);
	});

	test("localeCompare is safe through it, whatever magnitude it returns", () => {
		const byLocale = fromCompare<string>((self, that) => self.localeCompare(that));
		expect(byLocale("a", "b")).toBe(-1);
		expect(byLocale("b", "a")).toBe(1);
		expect(byLocale("a", "a")).toBe(0);
	});
});

describe("alwaysEqual", () => {
	test("answers 0 for every pair", () => {
		const nothing = alwaysEqual<string>();
		for (const self of STRINGS) {
			for (const that of STRINGS) {
				expect(nothing(self, that)).toBe(0);
			}
		}
	});

	test("is the identity of combine on both sides", () => {
		const identity = alwaysEqual<Row>();
		const left = combine(identity, byRank);
		const right = combine(byRank, identity);

		for (const self of ROWS) {
			for (const that of ROWS) {
				expect(left(self, that)).toBe(byRank(self, that));
				expect(right(self, that)).toBe(byRank(self, that));
			}
		}
	});
});

// --- combining ----------------------------------------------------------------

describe("reverse", () => {
	test("flips every non-zero answer and fixes every zero", () => {
		const descending = reverse(orderNumber);
		for (const self of NUMBERS) {
			for (const that of NUMBERS) {
				const forward = orderNumber(self, that);
				expect(descending(self, that)).toBe(forward === 0 ? 0 : forward < 0 ? 1 : -1);
			}
		}
	});

	test("is an involution", () => {
		const twice = reverse(reverse(orderNumber));
		for (const self of NUMBERS) {
			for (const that of NUMBERS) {
				expect(twice(self, that)).toBe(orderNumber(self, that));
			}
		}
	});

	test("swaps arguments rather than negating, so a leaked magnitude still reverses", () => {
		const flipped = reverse(leaky);
		expect(flipped(1, 2) as number).toBe(7);
		expect(flipped(2, 1) as number).toBe(-5);
	});
});

describe("combine", () => {
	test("consults the tie-breaker only on a tie", () => {
		const byRankThenName = combine(byRank, byName);

		expect(byRankThenName({ rank: 1, name: "a" }, { rank: 1, name: "b" })).toBe(-1);
		expect(byRankThenName({ rank: 1, name: "b" }, { rank: 1, name: "a" })).toBe(1);
		expect(byRankThenName({ rank: 0, name: "z" }, { rank: 1, name: "a" })).toBe(-1);
		expect(byRankThenName({ rank: 1, name: "a" }, { rank: 1, name: "a" })).toBe(0);
	});

	test("short-circuits: the second order is not called when the first answers", () => {
		let calls = 0;
		const counted: Order<Row> = (self, that) => {
			calls += 1;
			return byName(self, that);
		};
		const combined = combine(byRank, counted);

		combined({ rank: 0, name: "a" }, { rank: 1, name: "b" });
		expect(calls).toBe(0);

		combined({ rank: 1, name: "a" }, { rank: 1, name: "b" });
		expect(calls).toBe(1);
	});

	test("is magnitude-tolerant: a leaked non-canonical answer still wins", () => {
		const combined = combine(leaky, alwaysEqual<number>());
		expect(combined(1, 2) as number).toBe(-5);
		expect(combined(2, 1) as number).toBe(7);
		expect(combined(1, 1) as number).toBe(0);
	});

	test("is associative", () => {
		const byLength = mapInput(orderNumber, (row: Row) => row.name.length);
		const left = combine(combine(byRank, byName), byLength);
		const right = combine(byRank, combine(byName, byLength));

		for (const self of ROWS) {
			for (const that of ROWS) {
				expect(left(self, that)).toBe(right(self, that));
			}
		}
	});
});

describe("combineAll", () => {
	test("agrees with nested combine", () => {
		const folded = combineAll([byRank, byName]);
		const nested = combine(byRank, byName);

		for (const self of ROWS) {
			for (const that of ROWS) {
				expect(folded(self, that)).toBe(nested(self, that));
			}
		}
	});

	test("an empty collection yields alwaysEqual", () => {
		const empty = combineAll<Row>([]);
		for (const self of ROWS) {
			for (const that of ROWS) {
				expect(empty(self, that)).toBe(0);
			}
		}
	});

	test("short-circuits at the first non-zero answer", () => {
		let calls = 0;
		const counted: Order<Row> = (self, that) => {
			calls += 1;
			return byName(self, that);
		};

		const folded = combineAll([byRank, counted, counted]);
		folded({ rank: 0, name: "a" }, { rank: 1, name: "b" });
		expect(calls).toBe(0);
	});

	test("materialises the iterable once, so a generator stays reusable", () => {
		function* orders(): Generator<Order<Row>> {
			yield byRank;
			yield byName;
		}

		const folded = combineAll(orders());
		expect(folded({ rank: 1, name: "a" }, { rank: 1, name: "b" })).toBe(-1);
		// A generator is exhausted after one pass; if it were consumed lazily the
		// second call would silently degrade to alwaysEqual.
		expect(folded({ rank: 1, name: "a" }, { rank: 1, name: "b" })).toBe(-1);
	});
});

describe("mapInput", () => {
	test("orders by the projection", () => {
		expect(byRank({ rank: 0, name: "z" }, { rank: 1, name: "a" })).toBe(-1);
		expect(byRank({ rank: 1, name: "a" }, { rank: 1, name: "z" })).toBe(0);
	});

	test("composes: mapInput(mapInput(O, f), g) equals mapInput(O, f after g)", () => {
		const nested = mapInput(
			mapInput(orderNumber, (length: number) => length),
			(row: Row) => row.name.length,
		);
		const direct = mapInput(orderNumber, (row: Row) => row.name.length);

		for (const self of ROWS) {
			for (const that of ROWS) {
				expect(nested(self, that)).toBe(direct(self, that));
			}
		}
	});

	test("inherits the projected order's NaN policy", () => {
		const byValue = mapInput(orderNumber, (row: { readonly value: number }) => row.value);
		expect(byValue({ value: Number.NaN }, { value: 0 })).toBe(-1);
		expect(byValue({ value: Number.NaN }, { value: Number.NaN })).toBe(0);
	});
});

// --- instances ----------------------------------------------------------------

describe("orderString", () => {
	test("orders by UTF-16 code unit, case-sensitively", () => {
		expect(orderString("a", "b")).toBe(-1);
		expect(orderString("b", "a")).toBe(1);
		expect(orderString("B", "a")).toBe(-1);
		expect(orderString("", "a")).toBe(-1);
		expect(orderString("", "")).toBe(0);
		expect(orderString("ab", "a")).toBe(1);
	});

	test("is not locale-aware", () => {
		// A locale-aware comparison sorts "é" next to "e"; this one puts it past "z".
		expect(orderString("é", "z")).toBe(1);
	});
});

describe("orderNumber", () => {
	test("orders finite numbers and both infinities", () => {
		expect(orderNumber(1, 2)).toBe(-1);
		expect(orderNumber(2, 1)).toBe(1);
		expect(orderNumber(Number.NEGATIVE_INFINITY, 0)).toBe(-1);
		expect(orderNumber(Number.POSITIVE_INFINITY, 0)).toBe(1);
		expect(orderNumber(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)).toBe(0);
	});

	test("treats 0 and -0 as equal in both argument orders", () => {
		expect(orderNumber(0, -0)).toBe(0);
		expect(orderNumber(-0, 0)).toBe(0);
	});

	test("treats every NaN as equal to every other NaN", () => {
		expect(orderNumber(Number.NaN, Number.NaN)).toBe(0);
		expect(orderNumber(Number.NaN, 0 / 0)).toBe(0);
		expect(orderNumber(Number.NaN, Number.parseFloat("x"))).toBe(0);
	});

	test("sorts NaN below every number, including -Infinity", () => {
		expect(orderNumber(Number.NaN, Number.NEGATIVE_INFINITY)).toBe(-1);
		expect(orderNumber(Number.NEGATIVE_INFINITY, Number.NaN)).toBe(1);
		expect([3, Number.NaN, 1, Number.NEGATIVE_INFINITY].sort(orderNumber)).toStrictEqual([
			Number.NaN,
			Number.NEGATIVE_INFINITY,
			1,
			3,
		]);
	});
});

describe("orderBoolean", () => {
	test("puts false first", () => {
		expect(orderBoolean(false, true)).toBe(-1);
		expect(orderBoolean(true, false)).toBe(1);
		expect(orderBoolean(false, false)).toBe(0);
		expect(orderBoolean(true, true)).toBe(0);
	});
});

describe("orderBigInt", () => {
	test("orders numerically well past the safe-integer range", () => {
		expect(orderBigInt(1n, 2n)).toBe(-1);
		expect(orderBigInt(10n, 2n)).toBe(1);
		expect(orderBigInt(-1n, 0n)).toBe(-1);
		expect(orderBigInt(2n ** 64n, 2n ** 64n - 1n)).toBe(1);
	});

	test("equal bigints built separately still compare equal", () => {
		expect(orderBigInt(BigInt("9007199254740993"), BigInt("9007199254740993"))).toBe(0);
	});
});

describe("orderDate", () => {
	test("orders chronologically", () => {
		expect(orderDate(new Date(0), new Date(1))).toBe(-1);
		expect(orderDate(new Date(1), new Date(0))).toBe(1);
	});

	test("compares instants, not identity", () => {
		expect(orderDate(new Date(1234), new Date(1234))).toBe(0);
	});

	test("Invalid Dates sort first and compare equal to each other", () => {
		const invalid = new Date("nope");
		const alsoInvalid = new Date(Number.NaN);

		expect(orderDate(invalid, new Date(0))).toBe(-1);
		expect(orderDate(new Date(0), invalid)).toBe(1);
		expect(orderDate(invalid, alsoInvalid)).toBe(0);
		expect(orderDate(invalid, invalid)).toBe(0);
	});

	test("is duck-typed on getTime, so a foreign-realm Date works unchanged", () => {
		// A cross-realm `Date` fails `instanceof Date` but still has `getTime`.
		// orderDate never reaches for `instanceof`, which is what makes it safe;
		// this stand-in has exactly the shape such a value presents.
		const foreign = { getTime: () => 500 } as unknown as Date;
		expect(orderDate(foreign, new Date(0))).toBe(1);
		expect(orderDate(foreign, new Date(500))).toBe(0);
	});
});

// --- shape constructors -------------------------------------------------------

describe("tupleOf", () => {
	test("compares positionally, left to right", () => {
		const byPair = tupleOf([orderString, orderNumber]);

		expect(byPair(["a", 1], ["b", 0])).toBe(-1);
		expect(byPair(["a", 2], ["a", 1])).toBe(1);
		expect(byPair(["a", 1], ["a", 1])).toBe(0);
	});

	test("an empty tuple of orders answers 0 for everything", () => {
		const byNothing = tupleOf([]);
		expect(byNothing([], [])).toBe(0);
	});

	test("does NOT length-check, unlike equivalence.tupleOf", () => {
		// Deliberate: a tuple type has fixed arity, so the check can never fire for
		// a correctly-typed input. Positions beyond the supplied orders are never
		// read, so a widened over-long array compares equal on its shared prefix.
		const byFirst = tupleOf([orderString]) as unknown as Order<readonly unknown[]>;
		expect(byFirst(["a", 99], ["a"])).toBe(0);
		expect(byFirst(["a"], ["b", 0])).toBe(-1);
	});

	test("propagates the element order's NaN policy", () => {
		const byPair = tupleOf([orderString, orderNumber]);
		expect(byPair(["a", Number.NaN], ["a", 0])).toBe(-1);
		expect(byPair(["a", Number.NaN], ["a", Number.NaN])).toBe(0);
	});
});

describe("arrayOf", () => {
	const byNumbers = arrayOf(orderNumber);

	test("compares elementwise, then by length", () => {
		expect(byNumbers([1, 2], [1, 3])).toBe(-1);
		expect(byNumbers([1, 3], [1, 2])).toBe(1);
		expect(byNumbers([1, 2], [1, 2])).toBe(0);
	});

	test("a shorter array with an equal prefix sorts first", () => {
		expect(byNumbers([1], [1, 0])).toBe(-1);
		expect(byNumbers([1, 0], [1])).toBe(1);
		expect(byNumbers([], [0])).toBe(-1);
	});

	test("two empty arrays are equal, and the empty array is below everything", () => {
		expect(byNumbers([], [])).toBe(0);
		for (const other of NUMBER_ARRAYS) {
			expect(byNumbers([], other)).toBe(other.length === 0 ? 0 : -1);
		}
	});

	test("an earlier difference beats a length difference", () => {
		expect(byNumbers([2], [1, 9, 9])).toBe(1);
	});

	test("a hole in a sparse array reads as undefined and does not throw", () => {
		const sparse: number[] = [];
		sparse[1] = 1;
		expect(0 in sparse).toBe(false);

		// The hole reaches orderNumber as `undefined`, which is neither NaN nor
		// less than 0, so it answers 1. Densify before comparing if that matters.
		expect(() => byNumbers(sparse, [0, 1])).not.toThrow();
		expect(byNumbers(sparse, [0, 1])).toBe(1);
	});
});

describe("structOf", () => {
	test("uses key enumeration order as precedence order", () => {
		const byRankThenName = structOf({ rank: orderNumber, name: orderString });

		expect(byRankThenName({ rank: 1, name: "b" }, { rank: 1, name: "a" })).toBe(1);
		expect(byRankThenName({ rank: 0, name: "z" }, { rank: 1, name: "a" })).toBe(-1);
		expect(byRankThenName({ rank: 1, name: "a" }, { rank: 1, name: "a" })).toBe(0);
	});

	test("an integer-like key silently jumps ahead of every string key", () => {
		// The hazard this module documents loudly: Object.keys returns integer-like
		// keys first, in ascending numeric order. Written name-first, compared
		// 2-first. Pinned here so a future "tidy-up" cannot change it unnoticed.
		expect(Object.keys({ name: 1, 2: 2, 10: 3, other: 4 })).toStrictEqual([
			"2",
			"10",
			"name",
			"other",
		]);

		const surprising = structOf({ name: orderString, 2: orderNumber });
		expect(surprising({ name: "a", 2: 9 }, { name: "b", 2: 1 })).toBe(1);

		// combineAll is the escape hatch: precedence is exactly what you wrote.
		const explicit = combineAll<{ readonly name: string; readonly 2: number }>([
			mapInput(orderString, (value) => value.name),
			mapInput(orderNumber, (value) => value[2]),
		]);
		expect(explicit({ name: "a", 2: 9 }, { name: "b", 2: 1 })).toBe(-1);
	});

	test("an empty field map answers 0 for everything", () => {
		const byNothing = structOf({});
		expect(byNothing({}, {})).toBe(0);
	});

	test("ignores fields that were not listed", () => {
		const byRankOnly = structOf({ rank: orderNumber });
		const left: { readonly rank: number } = { rank: 1, name: "z" } as { readonly rank: number };
		const right: { readonly rank: number } = { rank: 1, name: "a" } as { readonly rank: number };
		expect(byRankOnly(left, right)).toBe(0);
	});

	test("a field missing from both values compares undefined to undefined", () => {
		const byMissing = structOf({ absent: orderNumber });
		const empty = {} as { readonly absent: number };
		expect(byMissing(empty, { absent: 0 } as { readonly absent: number })).not.toBe(0);
		expect(byMissing(empty, {} as { readonly absent: number })).toBe(0);
	});

	test("does not re-enumerate the field map per comparison", () => {
		// The key array is hoisted when the order is built. Mutating the field map
		// afterwards must therefore have no effect — which is also what makes the
		// returned order safe to reuse across a whole sort.
		const fields: Record<string, Order<never>> = { rank: orderNumber };
		const byRankOnly = structOf(fields) as unknown as Order<Row>;
		fields.name = orderString;

		expect(byRankOnly({ rank: 1, name: "b" }, { rank: 1, name: "a" })).toBe(0);
	});
});

// --- predicates ---------------------------------------------------------------

describe("comparison predicates", () => {
	test("isLessThan is strict", () => {
		const under10 = isLessThan(orderNumber)(10);
		expect(under10(9)).toBe(true);
		expect(under10(10)).toBe(false);
		expect(under10(11)).toBe(false);
	});

	test("isGreaterThan is strict", () => {
		const over10 = isGreaterThan(orderNumber)(10);
		expect(over10(11)).toBe(true);
		expect(over10(10)).toBe(false);
		expect(over10(9)).toBe(false);
	});

	test("isLessThanOrEqualTo and isGreaterThanOrEqualTo include the bound", () => {
		expect(isLessThanOrEqualTo(orderNumber)(10)(10)).toBe(true);
		expect(isLessThanOrEqualTo(orderNumber)(10)(11)).toBe(false);
		expect(isGreaterThanOrEqualTo(orderNumber)(10)(10)).toBe(true);
		expect(isGreaterThanOrEqualTo(orderNumber)(10)(9)).toBe(false);
	});

	test("all four agree with the order on every pair in the matrix", () => {
		for (const bound of NUMBERS) {
			for (const value of NUMBERS) {
				const answer = orderNumber(value, bound);
				expect(isLessThan(orderNumber)(bound)(value)).toBe(answer < 0);
				expect(isGreaterThan(orderNumber)(bound)(value)).toBe(answer > 0);
				expect(isLessThanOrEqualTo(orderNumber)(bound)(value)).toBe(answer <= 0);
				expect(isGreaterThanOrEqualTo(orderNumber)(bound)(value)).toBe(answer >= 0);
			}
		}
	});

	test("are sign-based, not magnitude-based — the bug class we refuse to inherit", () => {
		// `leaky` answers -5 / 7. An `=== -1` implementation would say false here.
		expect(isLessThan(leaky)(2)(1)).toBe(true);
		expect(isGreaterThan(leaky)(1)(2)).toBe(true);
		expect(isLessThanOrEqualTo(leaky)(2)(1)).toBe(true);
		expect(isGreaterThanOrEqualTo(leaky)(1)(2)).toBe(true);
		expect(isBetween(leaky)({ minimum: 0, maximum: 10 })(5)).toBe(true);
	});

	test("NaN participates through orderNumber's policy, not raw JS comparison", () => {
		// Raw `NaN < 10` is false and `NaN >= 10` is also false; the order gives a
		// consistent answer instead.
		expect(isLessThan(orderNumber)(10)(Number.NaN)).toBe(true);
		expect(isGreaterThanOrEqualTo(orderNumber)(10)(Number.NaN)).toBe(false);
		expect(isLessThanOrEqualTo(orderNumber)(Number.NaN)(Number.NaN)).toBe(true);
	});

	test("survive being handed straight to Array.prototype.filter", () => {
		// The reason these are curried-only: filter calls back with three
		// arguments, and a data-first form would read the index as the bound.
		expect([5, 10, 15].filter(isLessThan(orderNumber)(10))).toStrictEqual([5]);
		expect([5, 10, 15].filter(isGreaterThan(orderNumber)(10))).toStrictEqual([15]);
	});

	test("isBetween is inclusive at both ends", () => {
		const inRange = isBetween(orderNumber)({ minimum: 1, maximum: 10 });
		expect(inRange(1)).toBe(true);
		expect(inRange(10)).toBe(true);
		expect(inRange(5)).toBe(true);
		expect(inRange(0)).toBe(false);
		expect(inRange(11)).toBe(false);
	});

	test("isBetween with inverted bounds describes an empty range", () => {
		const impossible = isBetween(orderNumber)({ minimum: 10, maximum: 1 });
		for (const value of NUMBERS) {
			expect(impossible(value)).toBe(false);
		}
	});

	test("isBetween works over a non-numeric domain", () => {
		const inWindow = isBetween(orderDate)({
			minimum: new Date("2020-01-01T00:00:00.000Z"),
			maximum: new Date("2020-12-31T00:00:00.000Z"),
		});
		expect(inWindow(new Date("2020-06-01T00:00:00.000Z"))).toBe(true);
		expect(inWindow(new Date("2021-06-01T00:00:00.000Z"))).toBe(false);
	});
});

// --- selection ----------------------------------------------------------------

describe("min and max", () => {
	const byN = mapInput(orderNumber, (tagged: Tagged) => tagged.n);
	const left: Tagged = { n: 1, id: "left" };
	const right: Tagged = { n: 1, id: "right" };

	test("min selects the lower value", () => {
		expect(min(orderNumber)(10)(4)).toBe(4);
		expect(min(orderNumber)(10)(42)).toBe(10);
		expect(min(orderNumber)(10)(10)).toBe(10);
	});

	test("max selects the higher value", () => {
		expect(max(orderNumber)(0)(4)).toBe(4);
		expect(max(orderNumber)(0)(-7)).toBe(0);
		expect(max(orderNumber)(0)(0)).toBe(0);
	});

	test("min returns the value under test on a tie — the stability contract", () => {
		expect(byN(left, right)).toBe(0);
		expect(min(byN)(right)(left)).toBe(left);
		expect(min(byN)(left)(right)).toBe(right);
	});

	test("max returns the value under test on a tie — the same contract", () => {
		expect(max(byN)(right)(left)).toBe(left);
		expect(max(byN)(left)(right)).toBe(right);
	});

	test("are sign-based, so a leaked magnitude still selects correctly", () => {
		expect(min(leaky)(2)(1)).toBe(1);
		expect(max(leaky)(1)(2)).toBe(2);
	});

	test("agree with the order across the whole matrix", () => {
		for (const bound of NUMBERS) {
			for (const value of NUMBERS) {
				const answer = orderNumber(value, bound);
				expect(min(orderNumber)(bound)(value)).toBe(answer <= 0 ? value : bound);
				expect(max(orderNumber)(bound)(value)).toBe(answer >= 0 ? value : bound);
			}
		}
	});

	test("NaN is the minimum of the numeric domain", () => {
		expect(min(orderNumber)(Number.NEGATIVE_INFINITY)(Number.NaN)).toBeNaN();
		expect(max(orderNumber)(Number.NaN)(Number.NEGATIVE_INFINITY)).toBe(Number.NEGATIVE_INFINITY);
	});
});

describe("clamp", () => {
	const toUnit = clamp(orderNumber)({ minimum: 0, maximum: 1 });

	test("pins out-of-range values to the nearest bound", () => {
		expect(toUnit(-0.5)).toBe(0);
		expect(toUnit(2)).toBe(1);
	});

	test("is inclusive and leaves in-range values untouched", () => {
		expect(toUnit(0)).toBe(0);
		expect(toUnit(1)).toBe(1);
		expect(toUnit(0.5)).toBe(0.5);
	});

	test("returns the same reference for an in-range value", () => {
		const byN = mapInput(orderNumber, (tagged: Tagged) => tagged.n);
		const bounds = { minimum: { n: 0, id: "lo" }, maximum: { n: 10, id: "hi" } };
		const value: Tagged = { n: 5, id: "mid" };

		expect(clamp(byN)(bounds)(value)).toBe(value);
	});

	test("returns the value, not the bound, when it ties with a bound", () => {
		const byN = mapInput(orderNumber, (tagged: Tagged) => tagged.n);
		const minimum: Tagged = { n: 0, id: "lo" };
		const maximum: Tagged = { n: 10, id: "hi" };
		const atFloor: Tagged = { n: 0, id: "mid" };

		expect(clamp(byN)({ minimum, maximum })(atFloor)).toBe(atFloor);
	});

	test("inverted bounds resolve to maximum rather than throwing", () => {
		const inverted = clamp(orderNumber)({ minimum: 10, maximum: 0 });
		expect(() => inverted(5)).not.toThrow();
		expect(inverted(5)).toBe(0);
		expect(inverted(-5)).toBe(0);
		expect(inverted(50)).toBe(0);
	});

	test("equal bounds collapse the range to a point", () => {
		const pinned = clamp(orderNumber)({ minimum: 3, maximum: 3 });
		expect(pinned(1)).toBe(3);
		expect(pinned(9)).toBe(3);
		expect(pinned(3)).toBe(3);
	});

	test("the result always satisfies isBetween for sane bounds", () => {
		const bounded = clamp(orderNumber)({ minimum: -1, maximum: 1 });
		const inRange = isBetween(orderNumber)({ minimum: -1, maximum: 1 });
		for (const value of NUMBERS) {
			expect(inRange(bounded(value))).toBe(true);
		}
	});

	test("is sign-based, so a leaked magnitude still clamps", () => {
		expect(clamp(leaky)({ minimum: 0, maximum: 10 })(50)).toBe(10);
		expect(clamp(leaky)({ minimum: 0, maximum: 10 })(-50)).toBe(0);
	});
});

// --- conversions --------------------------------------------------------------

describe("toEquivalence", () => {
	test("holds exactly when the order answers 0", () => {
		const sameNumber = toEquivalence(orderNumber);
		for (const self of NUMBERS) {
			for (const that of NUMBERS) {
				expect(sameNumber(self, that)).toBe(orderNumber(self, that) === 0);
			}
		}
	});

	test("satisfies the three equivalence laws over every matrix", () => {
		assertEquivalenceLaws(toEquivalence(orderNumber), NUMBERS);
		assertEquivalenceLaws(toEquivalence(orderString), STRINGS);
		assertEquivalenceLaws(toEquivalence(orderBoolean), BOOLEANS);
		assertEquivalenceLaws(toEquivalence(orderBigInt), BIGINTS);
		assertEquivalenceLaws(toEquivalence(orderDate), DATES);
		assertEquivalenceLaws(toEquivalence(structOf({ rank: orderNumber, name: orderString })), ROWS);
		assertEquivalenceLaws(toEquivalence(arrayOf(orderNumber)), NUMBER_ARRAYS);
		assertEquivalenceLaws(toEquivalence(tupleOf([orderString, orderNumber])), PAIRS);
	});

	test("inherits the order's decisions about NaN, -0, and Invalid Dates", () => {
		expect(toEquivalence(orderNumber)(0, -0)).toBe(true);
		expect(toEquivalence(orderNumber)(Number.NaN, Number.NaN)).toBe(true);
		expect(toEquivalence(orderDate)(new Date("nope"), new Date(Number.NaN))).toBe(true);
		expect(toEquivalence(orderDate)(new Date(0), new Date(0))).toBe(true);
	});

	test("the kernel of alwaysEqual relates everything", () => {
		const everything = toEquivalence(alwaysEqual<string>());
		for (const self of STRINGS) {
			for (const that of STRINGS) {
				expect(everything(self, that)).toBe(true);
			}
		}
	});
});
