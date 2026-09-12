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
 * @fileoverview Type-level tests for total orders. Every `Expect<...>` line is a
 * compile-time assertion — this file failing to type-check IS the test failure.
 *
 * Three claims here carry more weight than the rest, because each is the whole
 * reason a design decision was made:
 *
 * 1. `Order<T>` widens to a loose `(a, b) => number` comparator for free, and the
 *    reverse does not. That is what gives `@resq-systems/dsa` interop with no
 *    dependency edge, and what makes `fromCompare` the only way back.
 * 2. The comparison predicates return exactly `Predicate<A>` — not a
 *    structurally-similar `(self: A) => boolean`, and never a `Refinement`. The
 *    bridge into the guard algebra is declared, not accidental.
 * 3. Nothing in this module has a data-last form. The `@ts-expect-error` lines
 *    are what stop one from appearing by accident.
 */

import { test } from "vitest";
import type { Equivalence } from "./equivalence.js";
import { isNumber, isString } from "./guards.js";
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
	type orderBigInt,
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
import { and, type Predicate, type Refinement } from "./predicate.js";
import type { Equal, Expect } from "./testing.js";

// --- fixtures -----------------------------------------------------------------

type Row = { readonly rank: number; readonly name: string };

/**
 * A local mirror of `@resq-systems/dsa`'s `CompareFn<T>`, declared rather than
 * imported. `dsa` must stay zero-runtime-dep, so even a type-only import would
 * leak into its emitted `.d.ts` — the interop asserted below is purely
 * structural, which is exactly the property that makes the edge unnecessary.
 */
type CompareFn<T> = (a: T, b: T) => number;

const byRank = mapInput(orderNumber, (row: Row) => row.rank);
const byName = mapInput(orderString, (row: Row) => row.name);

// --- vocabulary ---------------------------------------------------------------

type _ordering = [
	Expect<Equal<Ordering, -1 | 0 | 1>>,
	Expect<Equal<ReturnType<Order<number>>, Ordering>>,
	// The union is closed: nothing else is an Ordering.
	Expect<Equal<2 extends Ordering ? true : false, false>>,
	Expect<Equal<number extends Ordering ? true : false, false>>,
	Expect<Equal<Ordering extends number ? true : false, true>>,
];

type _variance = [
	// `in A` makes the parameter contravariant, so an order over a wider type is
	// reusable at a narrower one.
	Expect<Equal<Order<unknown> extends Order<string> ? true : false, true>>,
	Expect<Equal<Order<string> extends Order<unknown> ? true : false, false>>,
	// ...which makes `Order<never>` the top of the family, and therefore the
	// correct constraint for the shape constructors' element slots.
	Expect<Equal<Order<number> extends Order<never> ? true : false, true>>,
	Expect<Equal<Order<string> extends Order<never> ? true : false, true>>,
];

type _compareFnInterop = [
	// The claim that removes any need for a `toCompare` export.
	Expect<Equal<Order<number> extends CompareFn<number> ? true : false, true>>,
	Expect<Equal<Order<Date> extends CompareFn<Date> ? true : false, true>>,
	// ...and the claim that makes `fromCompare` the only sanctioned way back.
	Expect<Equal<CompareFn<number> extends Order<number> ? true : false, false>>,
];

type _notAnOrder = [
	// A `Predicate<A>` is structurally acceptable where an `Equivalence<A>` is
	// expected (both answer `boolean`), but NOT where an `Order<A>` is: `boolean`
	// is not assignable to `-1 | 0 | 1`. The narrow return type closes that hole.
	Expect<Equal<Predicate<number> extends Order<number> ? true : false, false>>,
	Expect<Equal<Order<number> extends Predicate<number> ? true : false, false>>,
];

// A loose comparator is rejected at the definition site. This is the assertion
// the whole `Ordering` design exists to make possible.
// @ts-expect-error — `a - b` is a `number`, not an `Ordering`.
const _subtraction: Order<number> = (a, b) => a - b;

// @ts-expect-error — `localeCompare` returns an unbounded number.
const _localeCompare: Order<string> = (a, b) => a.localeCompare(b);

// @ts-expect-error — `boolean` is not assignable to `Ordering` either.
const _boolean: Order<number> = (a, b) => a < b;

// --- constructors -------------------------------------------------------------

const byLength = make<string>((self, that) =>
	self.length < that.length ? -1 : self.length > that.length ? 1 : 0,
);
const byLocale = fromCompare<string>((self, that) => self.localeCompare(that));
const nothing = alwaysEqual<Row>();

type _constructors = [
	Expect<Equal<typeof byLength, Order<string>>>,
	Expect<Equal<typeof byLocale, Order<string>>>,
	Expect<Equal<typeof nothing, Order<Row>>>,
	Expect<Equal<ReturnType<typeof alwaysEqual<Date>>, Order<Date>>>,
];

// `make` demands the narrow return type; `fromCompare` is where the loose one is
// allowed in.
// @ts-expect-error — the comparison must already be an `Ordering`.
make<number>((self, that) => self - that);

// --- instances ----------------------------------------------------------------

type _instances = [
	Expect<Equal<typeof orderString, Order<string>>>,
	Expect<Equal<typeof orderNumber, Order<number>>>,
	Expect<Equal<typeof orderBoolean, Order<boolean>>>,
	Expect<Equal<typeof orderBigInt, Order<bigint>>>,
	Expect<Equal<typeof orderDate, Order<Date>>>,
];

// --- combining ----------------------------------------------------------------

const descending = reverse(orderNumber);
const byRankThenName = combine(byRank, byName);
const folded = combineAll([byRank, byName]);
const emptyFold = combineAll<Row>([]);

type _combining = [
	Expect<Equal<typeof descending, Order<number>>>,
	Expect<Equal<typeof byRankThenName, Order<Row>>>,
	Expect<Equal<typeof folded, Order<Row>>>,
	Expect<Equal<typeof emptyFold, Order<Row>>>,
	// `mapInput` really is contravariant: the result is an order over the *input*
	// of the projection, not over its output.
	Expect<Equal<typeof byRank, Order<Row>>>,
	Expect<Equal<typeof byName, Order<Row>>>,
];

// Nothing in this module is dualised. These lines are what keeps it that way.
// @ts-expect-error — `mapInput` has no data-last form; it needs both arguments.
mapInput(orderNumber);

// @ts-expect-error — `combine` is data-first only.
combine(byRank);

// @ts-expect-error — `combineAll` takes an iterable of orders, not an order.
combineAll(byRank);

// @ts-expect-error — the two orders must agree on their domain.
combine(byRank, orderString);

// --- shape constructors -------------------------------------------------------

const byPair = tupleOf([orderString, orderNumber]);
const byTriple = tupleOf([orderString, orderNumber, orderBoolean]);
const byEmptyTuple = tupleOf([]);
const byNumbers = arrayOf(orderNumber);
const byNestedArrays = arrayOf(arrayOf(orderNumber));
const byStruct = structOf({ rank: orderNumber, name: orderString });
const byEmptyStruct = structOf({});

type _shapes = [
	// The tuple arity and the per-position element types both survive.
	Expect<Equal<typeof byPair, Order<readonly [string, number]>>>,
	Expect<Equal<typeof byTriple, Order<readonly [string, number, boolean]>>>,
	Expect<Equal<typeof byEmptyTuple, Order<readonly []>>>,
	Expect<Equal<typeof byNumbers, Order<readonly number[]>>>,
	Expect<Equal<typeof byNestedArrays, Order<readonly (readonly number[])[]>>>,
	Expect<Equal<typeof byStruct, Order<{ readonly rank: number; readonly name: string }>>>,
];

// The inferred element types are enforced at the call site, not merely displayed.
// @ts-expect-error — position 1 is a `number`, not a `string`.
byPair(["a", "b"], ["a", 1]);

// @ts-expect-error — the array element type comes from the item order.
byNumbers(["a"], []);

// @ts-expect-error — `rank` is a `number`.
byStruct({ rank: "1", name: "a" }, { rank: 1, name: "a" });

// The empty field map still produces an order; it just never answers non-zero.
type _emptyStruct = Expect<Equal<Parameters<typeof byEmptyStruct>["length"], 2>>;

// --- the bridge into the guard algebra ----------------------------------------

const under10 = isLessThan(orderNumber)(10);
const over10 = isGreaterThan(orderNumber)(10);
const atMost10 = isLessThanOrEqualTo(orderNumber)(10);
const atLeast10 = isGreaterThanOrEqualTo(orderNumber)(10);
const inRange = isBetween(orderNumber)({ minimum: 1, maximum: 10 });
const beforeEpoch = isLessThan(orderDate)(new Date(0));

type _bridge = [
	// EXACTLY `Predicate<A>` — the connection to predicate.ts is declared, not
	// merely structural.
	Expect<Equal<typeof under10, Predicate<number>>>,
	Expect<Equal<typeof over10, Predicate<number>>>,
	Expect<Equal<typeof atMost10, Predicate<number>>>,
	Expect<Equal<typeof atLeast10, Predicate<number>>>,
	Expect<Equal<typeof inRange, Predicate<number>>>,
	Expect<Equal<typeof beforeEpoch, Predicate<Date>>>,
	// NEVER a `Refinement`: `x < 10` proves nothing about the type of `x`.
	Expect<Equal<typeof under10 extends Refinement.Any ? true : false, false>>,
	Expect<Equal<typeof inRange extends Refinement.Any ? true : false, false>>,
	// ...but it is a first-class member of the predicate vocabulary.
	Expect<Equal<typeof under10 extends Predicate.Any ? true : false, true>>,
];

// Composing with a `/guards` guard keeps the guard's proof: the result still
// accepts `unknown` and still narrows to `number`.
const isSmallNumber = and(isNumber, under10);
const isNumberInRange = and(isNumber, inRange);
const isShortString = and(isString, (text: string) => text.length < 4);

type _composition = [
	Expect<Equal<typeof isSmallNumber, Refinement<unknown, number>>>,
	Expect<Equal<typeof isNumberInRange, Refinement<unknown, number>>>,
	// The same general shape, unrelated to ordering — evidence the overload that
	// makes this work is not Order-specific.
	Expect<Equal<typeof isShortString, Refinement<unknown, string>>>,
];

// Curried only. A data-first call is not offered, and the curried result is a
// one-argument function — which is what makes it safe in `.filter`.
// @ts-expect-error — the predicate takes exactly one argument.
under10(1, 2);

// @ts-expect-error — the bound must belong to the ordered domain.
isLessThan(orderNumber)("10");

// @ts-expect-error — `isBetween` takes an options object, not positional bounds.
isBetween(orderNumber)(1, 10);

// --- selection ----------------------------------------------------------------

const cappedAt10 = min(orderNumber)(10);
const flooredAt0 = max(orderNumber)(0);
const toUnit = clamp(orderNumber)({ minimum: 0, maximum: 1 });
const clampRow = clamp(byRank)({ minimum: { rank: 0, name: "" }, maximum: { rank: 9, name: "" } });

type _selection = [
	Expect<Equal<typeof cappedAt10, (value: number) => number>>,
	Expect<Equal<typeof flooredAt0, (value: number) => number>>,
	Expect<Equal<typeof toUnit, (value: number) => number>>,
	// Selection stays in the ordered domain — it never widens to the bound's type.
	Expect<Equal<typeof clampRow, (value: Row) => Row>>,
	Expect<Equal<ReturnType<typeof toUnit>, number>>,
];

// @ts-expect-error — `clamp` takes an options object, not positional bounds.
clamp(orderNumber)(0, 1);

// @ts-expect-error — both bounds are required.
clamp(orderNumber)({ minimum: 0 });

// --- conversions --------------------------------------------------------------

const sameNumber = toEquivalence(orderNumber);
const sameRow = toEquivalence(byStruct);

type _conversions = [
	Expect<Equal<typeof sameNumber, Equivalence<number>>>,
	Expect<Equal<typeof sameRow, Equivalence<{ readonly rank: number; readonly name: string }>>>,
	// The kernel is an `Equivalence`, not an `Order` — the return type is the
	// entire content of the conversion.
	Expect<Equal<typeof sameNumber extends Order<number> ? true : false, false>>,
];

// A no-op so the file is a valid Vitest module; every assertion above is checked
// by `tsc`, not at runtime.
test("order.test-d.ts type assertions compile", () => {});
