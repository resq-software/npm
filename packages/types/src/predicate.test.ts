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
	allOf,
	alwaysFalse,
	alwaysTrue,
	and,
	anyOf,
	arrayOf,
	compose,
	eqv,
	everyOf,
	exactlyOne,
	implies,
	lazy,
	mapInput,
	nand,
	noneOf,
	not,
	nullableOf,
	nullishOf,
	optionalOf,
	or,
	type Predicate,
	recordOf,
	refineOn,
	someOf,
	structOf,
	tupleOf,
	type TypeGuard,
} from "./predicate.js";

// Leaf guards are deliberately defined locally: this suite tests the algebra, not
// the guard library, and must not couple to a sibling module's behavior.
const isString = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number => typeof value === "number";
const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";
const isPositive = (value: unknown): value is number => typeof value === "number" && value > 0;
const isNumericString = (value: string): value is `${number}` => /^\d+$/.test(value);

type Animal = "cat" | "dog" | "fish";
const isCat = (animal: Animal): animal is "cat" => animal === "cat";
const isDog = (animal: Animal): animal is "dog" => animal === "dog";

// The set of inputs every unknown-domain guard must survive without throwing.
const NASTY_INPUTS: readonly unknown[] = [
	null,
	undefined,
	Number.NaN,
	0,
	-0,
	"",
	[],
	{},
	Object.create(null) as unknown,
	new String("boxed"),
	new Number(1),
	Symbol("s"),
	() => undefined,
	{ [Symbol.toStringTag]: "Array" },
];

describe("and", () => {
	test("passes only when both guards pass", () => {
		const guard = and(isNumber, isPositive);
		expect(guard(1)).toBe(true);
		expect(guard(-1)).toBe(false);
		expect(guard("1")).toBe(false);
	});

	test("narrows to the intersection inside the guarded branch", () => {
		const value: unknown = 42;
		const guard = and(isNumber, isPositive);
		if (guard(value)) {
			const doubled: number = value * 2;
			expect(doubled).toBe(84);
		} else {
			expect.unreachable("42 must satisfy both guards");
		}
	});

	test("short-circuits: the second guard never runs when the first fails", () => {
		let calls = 0;
		const counting: Predicate<unknown> = () => {
			calls += 1;
			return true;
		};
		const guard = and<unknown>(isNumber, counting);
		expect(guard("nope")).toBe(false);
		expect(calls).toBe(0);
	});

	test("degrades to a plain predicate for non-narrowing inputs", () => {
		const isShort: Predicate<string> = (s) => s.length < 4;
		const isLower: Predicate<string> = (s) => s === s.toLowerCase();
		const guard = and(isShort, isLower);
		expect(guard("abc")).toBe(true);
		expect(guard("ABC")).toBe(false);
	});

	test("keeps the proof when the second operand is a plain rule over it", () => {
		// `isUnderTen` is the shape an ordering predicate has — it proves nothing
		// about the type, only about the value — so the result must still prove
		// `number` and must still accept an `unknown`.
		const isUnderTen: Predicate<number> = (n) => n < 10;
		const guard = and(isNumber, isUnderTen);

		expect(guard(5)).toBe(true);
		expect(guard(50)).toBe(false);
		expect(guard("5")).toBe(false);
		expect(guard(null)).toBe(false);
		expect(guard(undefined)).toBe(false);

		const value: unknown = 5;
		if (guard(value)) {
			const doubled: number = value * 2;
			expect(doubled).toBe(10);
		} else {
			expect.unreachable("5 must satisfy both operands");
		}
	});

	test("the surviving proof is what lets the result narrow an array", () => {
		const isNonEmpty: Predicate<string> = (s) => s.length > 0;
		const guard = and(isString, isNonEmpty);
		const mixed: readonly unknown[] = ["ada", "", 42, null, "grace"];

		const kept: string[] = mixed.filter(guard);
		expect(kept).toStrictEqual(["ada", "grace"]);
	});

	test("the plain-rule pair short-circuits and agrees data-first with data-last", () => {
		let calls = 0;
		const counting: Predicate<number> = () => {
			calls += 1;
			return true;
		};

		const dataFirst = and(isNumber, counting);
		const dataLast = and(counting)(isNumber);

		expect(dataFirst("nope")).toBe(false);
		expect(calls).toBe(0);

		for (const input of [1, "1", null, Number.NaN] as const) {
			expect(dataLast(input)).toBe(dataFirst(input));
		}
		// Only the two numeric inputs reached `counting`, once per call form.
		expect(calls).toBe(4);
	});
});

describe("or", () => {
	test("passes when either guard passes", () => {
		const guard = or(isString, isNumber);
		expect(guard("a")).toBe(true);
		expect(guard(1)).toBe(true);
		expect(guard(true)).toBe(false);
		expect(guard(null)).toBe(false);
	});

	test("narrows to the union inside the guarded branch", () => {
		const value: unknown = 7;
		const guard = or(isString, isNumber);
		if (guard(value)) {
			const rendered: string = typeof value === "string" ? value : value.toFixed(0);
			expect(rendered).toBe("7");
		} else {
			expect.unreachable("7 must satisfy the union guard");
		}
	});

	test("short-circuits: the second guard never runs when the first passes", () => {
		let calls = 0;
		const counting: Predicate<unknown> = () => {
			calls += 1;
			return false;
		};
		const guard = or<unknown>(isNumber, counting);
		expect(guard(1)).toBe(true);
		expect(calls).toBe(0);
	});
});

describe("not", () => {
	test("inverts the result exactly", () => {
		const guard = not(isString);
		expect(guard("a")).toBe(false);
		expect(guard(1)).toBe(true);
		expect(guard(null)).toBe(true);
		expect(guard(undefined)).toBe(true);
	});

	test("subtracts from a union domain", () => {
		const guard = not(isCat);
		expect(guard("cat")).toBe(false);
		expect(guard("dog")).toBe(true);
		expect(guard("fish")).toBe(true);
	});

	test("double negation restores the original result", () => {
		const guard = not(not(isString));
		expect(guard("a")).toBe(true);
		expect(guard(1)).toBe(false);
	});
});

describe("allOf", () => {
	test("requires every guard to pass", () => {
		const guard = allOf(isNumber, isPositive);
		expect(guard(3)).toBe(true);
		expect(guard(0)).toBe(false);
		expect(guard("3")).toBe(false);
	});

	test("a single guard behaves exactly like that guard", () => {
		const guard = allOf(isString);
		expect(guard("a")).toBe(true);
		expect(guard(1)).toBe(false);
	});

	test("NaN passes the typeof check and fails the ordering check", () => {
		const guard = allOf(isNumber, isPositive);
		expect(isNumber(Number.NaN)).toBe(true);
		expect(guard(Number.NaN)).toBe(false);
	});

	test("survives every nasty input without throwing", () => {
		const guard = allOf(isNumber, isPositive);
		for (const input of NASTY_INPUTS) {
			expect(typeof guard(input)).toBe("boolean");
		}
	});
});

describe("anyOf", () => {
	test("passes when at least one guard passes", () => {
		const guard = anyOf(isString, isNumber, isBoolean);
		expect(guard("a")).toBe(true);
		expect(guard(1)).toBe(true);
		expect(guard(false)).toBe(true);
		expect(guard(null)).toBe(false);
		expect(guard({})).toBe(false);
	});

	test("a single guard behaves exactly like that guard", () => {
		const guard = anyOf(isString);
		expect(guard("a")).toBe(true);
		expect(guard(1)).toBe(false);
	});

	test("narrows a union domain to the matching members", () => {
		const animal: Animal = "dog";
		const guard = anyOf(isCat, isDog);
		if (guard(animal)) {
			const label: "cat" | "dog" = animal;
			expect(label).toBe("dog");
		} else {
			expect.unreachable("dog must satisfy the union guard");
		}
	});
});

describe("noneOf", () => {
	test("passes only when no guard passes", () => {
		const guard = noneOf(isString, isNumber);
		expect(guard(true)).toBe(true);
		expect(guard("a")).toBe(false);
		expect(guard(1)).toBe(false);
	});

	test("subtracts every listed member from a union domain", () => {
		const guard = noneOf(isCat, isDog);
		expect(guard("fish")).toBe(true);
		expect(guard("cat")).toBe(false);
		expect(guard("dog")).toBe(false);
	});
});

describe("exactlyOne", () => {
	test("passes only on a pass-count of exactly one", () => {
		const guard = exactlyOne<unknown>(isString, isNumber, isBoolean);
		expect(guard("a")).toBe(true);
		expect(guard(1)).toBe(true);
		expect(guard(null)).toBe(false);
	});

	test("fails when two predicates pass", () => {
		const guard = exactlyOne<unknown>(isNumber, isPositive);
		expect(guard(5)).toBe(false);
		expect(guard(-5)).toBe(true);
	});

	test("never passes with no predicates", () => {
		const guard = exactlyOne<unknown>();
		expect(guard("anything")).toBe(false);
	});
});

describe("implies", () => {
	test("fails only when the antecedent holds and the consequent does not", () => {
		const guard = implies<{ kind: string; port?: number }>(
			(c) => c.kind === "tcp",
			(c) => c.port !== undefined,
		);
		expect(guard({ kind: "tcp", port: 1 })).toBe(true);
		expect(guard({ kind: "tcp" })).toBe(false);
		expect(guard({ kind: "unix" })).toBe(true);
	});

	test("is vacuously true whenever the antecedent fails", () => {
		const guard = implies<number>(alwaysFalse, alwaysFalse);
		expect(guard(1)).toBe(true);
	});

	test("is lazy in the consequent", () => {
		let calls = 0;
		const counting: Predicate<number> = () => {
			calls += 1;
			return true;
		};
		const guard = implies<number>(alwaysFalse, counting);
		expect(guard(1)).toBe(true);
		expect(calls).toBe(0);
	});
});

describe("nand", () => {
	test("fails only when both predicates pass", () => {
		const guard = nand<unknown>(isNumber, isPositive);
		expect(guard(5)).toBe(false);
		expect(guard(-5)).toBe(true);
		expect(guard("5")).toBe(true);
	});

	test("short-circuits: the second predicate never runs when the first fails", () => {
		let calls = 0;
		const counting: Predicate<unknown> = () => {
			calls += 1;
			return true;
		};
		const guard = nand<unknown>(isNumber, counting);
		expect(guard("nope")).toBe(true);
		expect(calls).toBe(0);
	});

	test("agrees with not(and(...)) on every nasty input", () => {
		const viaNand = nand<unknown>(isNumber, isPositive);
		const viaNot = not(and<unknown>(isNumber, isPositive));
		for (const input of NASTY_INPUTS) {
			expect(viaNand(input)).toBe(viaNot(input));
		}
	});
});

describe("eqv", () => {
	test("passes when both predicates agree", () => {
		const guard = eqv<unknown>(isNumber, isPositive);
		expect(guard(5)).toBe(true);
		expect(guard("x")).toBe(true);
		expect(guard(-5)).toBe(false);
	});

	test("is the negation of exactlyOne at arity two", () => {
		const viaEqv = eqv<unknown>(isNumber, isPositive);
		const viaXor = not(exactlyOne<unknown>(isNumber, isPositive));
		for (const input of NASTY_INPUTS) {
			expect(viaEqv(input)).toBe(viaXor(input));
		}
	});

	test("runs both predicates — agreement cannot be decided from one answer", () => {
		let calls = 0;
		const counting: Predicate<unknown> = () => {
			calls += 1;
			return false;
		};
		const guard = eqv<unknown>(alwaysFalse, counting);
		expect(guard(1)).toBe(true);
		expect(calls).toBe(1);
	});
});

describe("everyOf", () => {
	test("passes only when every member passes", () => {
		const isShort: Predicate<string> = (s) => s.length < 4;
		const isLower: Predicate<string> = (s) => s === s.toLowerCase();
		const guard = everyOf([isShort, isLower]);
		expect(guard("abc")).toBe(true);
		expect(guard("ABC")).toBe(false);
		expect(guard("abcdef")).toBe(false);
	});

	test("accepts the empty collection by vacuous truth", () => {
		expect(everyOf<string>([])("anything")).toBe(true);
	});

	test("short-circuits on the first failure", () => {
		let calls = 0;
		const counting: Predicate<number> = () => {
			calls += 1;
			return true;
		};
		expect(everyOf<number>([alwaysFalse, counting])(1)).toBe(false);
		expect(calls).toBe(0);
	});

	test("materializes the collection once, so a generator survives a second call", () => {
		// Arrange: a single-pass iterable. Iterating it lazily per call would make
		// the second call see an exhausted generator and pass vacuously.
		function* rules(): Generator<Predicate<number>> {
			yield alwaysFalse;
		}

		// Act
		const guard = everyOf(rules());

		// Assert
		expect(guard(1)).toBe(false);
		expect(guard(1)).toBe(false);
	});
});

describe("someOf", () => {
	test("passes when at least one member passes", () => {
		const guard = someOf<string>([(s) => s === "admin", (s) => s === "owner"]);
		expect(guard("owner")).toBe(true);
		expect(guard("guest")).toBe(false);
	});

	test("never passes with an empty collection", () => {
		expect(someOf<string>([])("anything")).toBe(false);
	});

	test("short-circuits on the first success", () => {
		let calls = 0;
		const counting: Predicate<number> = () => {
			calls += 1;
			return false;
		};
		expect(someOf<number>([alwaysTrue, counting])(1)).toBe(true);
		expect(calls).toBe(0);
	});

	test("materializes the collection once, so a generator survives a second call", () => {
		function* rules(): Generator<Predicate<number>> {
			yield alwaysTrue;
		}

		const guard = someOf(rules());

		expect(guard(1)).toBe(true);
		expect(guard(1)).toBe(true);
	});
});

describe("the dual law", () => {
	// The data-last overloads on the six dualized combinators are an annotation
	// `dualBinary` cannot verify. predicate.test-d.ts pins their *types*; this
	// block pins their *behavior*, so a body edit that swapped the two parameters
	// could not slip through with the declaration still typechecking.
	const isShort: Predicate<string> = (s) => s.length < 4;
	const isLower: Predicate<string> = (s) => s === s.toLowerCase();
	const STRINGS: readonly string[] = ["", "a", "ABC", "abc", "abcdef", "ABCDEF"];

	const PREDICATE_CASES: readonly {
		readonly name: string;
		readonly dataFirst: Predicate<string>;
		readonly dataLast: Predicate<string>;
	}[] = [
		{ name: "and", dataFirst: and(isShort, isLower), dataLast: and(isLower)(isShort) },
		{ name: "or", dataFirst: or(isShort, isLower), dataLast: or(isLower)(isShort) },
		{ name: "nand", dataFirst: nand(isShort, isLower), dataLast: nand(isLower)(isShort) },
		{ name: "eqv", dataFirst: eqv(isShort, isLower), dataLast: eqv(isLower)(isShort) },
		{
			name: "implies",
			dataFirst: implies(isShort, isLower),
			dataLast: implies(isLower)(isShort),
		},
	];

	test.each(PREDICATE_CASES)("$name agrees across both call shapes", ({ dataFirst, dataLast }) => {
		for (const input of STRINGS) {
			expect(dataLast(input)).toBe(dataFirst(input));
		}
	});

	test("compose agrees across both call shapes", () => {
		const dataFirst = compose(isString, isNumericString);
		const dataLast = compose(isNumericString)(isString);
		for (const input of [...NASTY_INPUTS, "123", "abc"]) {
			expect(dataLast(input)).toBe(dataFirst(input));
		}
	});

	test("every dualized combinator throws a TypeError naming itself on a zero-argument call", () => {
		const combinators = { and, or, nand, eqv, implies, compose };
		for (const [name, combinator] of Object.entries(combinators)) {
			const called = combinator as unknown as () => unknown;
			expect(() => called()).toThrow(TypeError);
			expect(() => called()).toThrow(new RegExp(`^${name}:`));
		}
	});

	test("arguments past the second are ignored, so reduce keeps working", () => {
		// `Array.prototype.reduce` hands its reducer four arguments. A dispatcher
		// keyed on `arguments.length === 2` would take the data-last branch here and
		// silently produce a function instead of a predicate.
		const rules: readonly Predicate<string>[] = [isShort, isLower, (s) => s !== ""];
		const folded = rules.reduce((left, right) => and(left, right));
		const reduced = rules.reduce(and);

		for (const input of STRINGS) {
			expect(reduced(input)).toBe(folded(input));
		}
		expect(reduced("abc")).toBe(true);
		expect(reduced("")).toBe(false);
	});
});

describe("compose", () => {
	test("applies the second guard to what the first proved", () => {
		const guard = compose(isString, isNumericString);
		expect(guard("123")).toBe(true);
		expect(guard("abc")).toBe(false);
		expect(guard(123)).toBe(false);
	});

	test("narrows straight through to the inner proof", () => {
		const value: unknown = "42";
		const guard = compose(isString, isNumericString);
		if (guard(value)) {
			const parsed: number = Number(value);
			expect(parsed).toBe(42);
		} else {
			expect.unreachable('"42" must satisfy the composed guard');
		}
	});

	test("does not invoke the inner guard when the outer one fails", () => {
		let calls = 0;
		const counting = (value: string): value is string => {
			calls += 1;
			return value.length > 0;
		};
		const guard = compose(isString, counting);
		expect(guard(1)).toBe(false);
		expect(calls).toBe(0);
	});
});

describe("mapInput", () => {
	test("runs the predicate against the projection", () => {
		const isValidEmail: Predicate<string> = (s) => s.includes("@");
		const guard = mapInput(isValidEmail, (user: { email: string }) => user.email);
		expect(guard({ email: "a@b.com" })).toBe(true);
		expect(guard({ email: "nope" })).toBe(false);
	});
});

describe("refineOn", () => {
	test("proves the property type and narrows the container", () => {
		const guard = refineOn("kind")(isString);
		const record: { kind: unknown } = { kind: "tcp" };
		if (guard(record)) {
			const shouted: string = record.kind.toUpperCase();
			expect(shouted).toBe("TCP");
		} else {
			expect.unreachable("kind is a string");
		}
	});

	test("rejects when the property fails the guard", () => {
		const guard = refineOn("kind")(isString);
		expect(guard({ kind: 1 })).toBe(false);
		expect(guard({ kind: undefined })).toBe(false);
	});
});

describe("lazy", () => {
	test("defers construction until the first call", () => {
		let constructed = 0;
		const guard = lazy<unknown, string>(() => {
			constructed += 1;
			return isString;
		});
		expect(constructed).toBe(0);
		expect(guard("a")).toBe(true);
		expect(constructed).toBe(1);
	});

	test("supports a self-referential recursive shape", () => {
		type Tree = { value: number; children: readonly Tree[] };
		const isTree: TypeGuard<Tree> = structOf({
			value: isNumber,
			children: arrayOf(lazy(() => isTree)),
		});
		expect(isTree({ value: 1, children: [] })).toBe(true);
		expect(isTree({ value: 1, children: [{ value: 2, children: [] }] })).toBe(true);
		expect(isTree({ value: 1, children: [{ value: "x", children: [] }] })).toBe(false);
	});
});

describe("alwaysTrue and alwaysFalse", () => {
	test("return their constant for every input", () => {
		for (const input of NASTY_INPUTS) {
			expect(alwaysTrue(input)).toBe(true);
			expect(alwaysFalse(input)).toBe(false);
		}
	});

	test("are reusable at narrower input types", () => {
		const permit: Predicate<string> = alwaysTrue;
		const deny: Predicate<string> = alwaysFalse;
		expect(permit("x")).toBe(true);
		expect(deny("x")).toBe(false);
	});
});

describe("arrayOf", () => {
	test("accepts arrays whose every element passes", () => {
		const guard = arrayOf(isString);
		expect(guard(["a", "b"])).toBe(true);
		expect(guard(["a", 1])).toBe(false);
	});

	test("accepts the empty array by vacuous truth", () => {
		expect(arrayOf(isString)([])).toBe(true);
	});

	test("rejects sparse arrays instead of skipping their holes", () => {
		// Array.prototype.every never visits a hole, so `every` alone proved
		// `readonly string[]` for an array whose elements are all `undefined`.
		const guard = arrayOf(isString);
		expect(guard(new Array(2))).toBe(false);
		// biome-ignore lint/suspicious/noSparseArray: a hole is the value under test — replacing it with `undefined` would test a different array
		expect(guard(["a", , "c"])).toBe(false);
		expect(guard(Object.assign(["a"], { length: 3 }))).toBe(false);
	});

	test("rejects array-like objects and every other nasty input", () => {
		const guard = arrayOf(isString);
		expect(guard({ length: 1, 0: "a" })).toBe(false);
		for (const input of NASTY_INPUTS) {
			if (Array.isArray(input)) {
				continue;
			}
			expect(guard(input)).toBe(false);
		}
	});

	test("narrows to a readonly array inside the guarded branch", () => {
		const value: unknown = ["a", "b"];
		const guard = arrayOf(isString);
		if (guard(value)) {
			const joined: string = value.join("-");
			expect(joined).toBe("a-b");
		} else {
			expect.unreachable("an array of strings must pass");
		}
	});
});

describe("recordOf", () => {
	test("accepts plain objects whose every value passes", () => {
		const guard = recordOf(isString);
		expect(guard({ a: "1", b: "2" })).toBe(true);
		expect(guard({ a: "1", b: 2 })).toBe(false);
	});

	test("accepts null-prototype maps, which is what JSON-shaped data looks like", () => {
		const bare = Object.create(null) as Record<string, unknown>;
		bare.a = "1";
		expect(recordOf(isString)(bare)).toBe(true);
	});

	test("rejects arrays, functions, null, and primitives", () => {
		const guard = recordOf(isString);
		expect(guard(["a"])).toBe(false);
		expect(guard([])).toBe(false);
		expect(guard(() => "a")).toBe(false);
		expect(guard(null)).toBe(false);
		expect(guard("a")).toBe(false);
	});

	test("ignores symbol keys, so a Symbol.toStringTag spoof cannot smuggle a value in", () => {
		const spoofed = { [Symbol.toStringTag]: "Array" };
		expect(recordOf(isString)(spoofed)).toBe(true);
		expect(recordOf(isString)({ ...spoofed, a: 1 })).toBe(false);
	});

	test("checks non-enumerable own keys, which Object.values would have skipped", () => {
		// Arrange: a key the index signature covers but `Object.values` cannot see.
		const smuggled: Record<string, unknown> = { a: "1" };
		Object.defineProperty(smuggled, "hidden", {
			value: () => undefined,
			enumerable: false,
		});

		// Act / Assert: the claim is `Record<string, string>` and `smuggled.hidden`
		// is a function, so the only sound answer is false.
		expect(Object.values(smuggled)).toEqual(["1"]);
		expect(recordOf(isString)(smuggled)).toBe(false);
	});

	test("accepts a non-enumerable own key whose value does pass", () => {
		const fine: Record<string, unknown> = { a: "1" };
		Object.defineProperty(fine, "hidden", { value: "2", enumerable: false });
		expect(recordOf(isString)(fine)).toBe(true);
	});

	test("does not consult the prototype chain, so a polluted Object.prototype is out of scope", () => {
		// Arrange: pollution is the caller's problem to prevent; the guard's job is
		// to stay honest about own keys, not to start failing every object in the realm.
		const proto = Object.prototype as unknown as Record<string, unknown>;
		proto.polluted = 42;
		try {
			expect(recordOf(isString)({ a: "1" })).toBe(true);
		} finally {
			delete proto.polluted;
		}
	});
});

describe("structOf", () => {
	test("checks each field with its own guard", () => {
		const guard = structOf({ id: isString, age: isNumber });
		expect(guard({ id: "a", age: 1 })).toBe(true);
		expect(guard({ id: "a", age: "1" })).toBe(false);
		expect(guard({ id: "a" })).toBe(false);
	});

	test("ignores extra properties — the check is structural, not exact", () => {
		const guard = structOf({ id: isString });
		expect(guard({ id: "a", extra: 1 })).toBe(true);
	});

	test("accepts a missing property when the field guard is optional", () => {
		const guard = structOf({ id: isString, meta: optionalOf(isNumber) });
		expect(guard({ id: "a" })).toBe(true);
		expect(guard({ id: "a", meta: 1 })).toBe(true);
		expect(guard({ id: "a", meta: null })).toBe(false);
	});

	test("rejects null, arrays, and primitives before touching any field", () => {
		const guard = structOf({ id: isString });
		expect(guard(null)).toBe(false);
		expect(guard([])).toBe(false);
		expect(guard("a")).toBe(false);
		expect(guard(undefined)).toBe(false);
	});

	test("accepts a null-prototype object", () => {
		const bare = Object.create(null) as Record<string, unknown>;
		bare.id = "a";
		expect(structOf({ id: isString })(bare)).toBe(true);
	});

	test("an empty field map accepts any non-array object", () => {
		const guard = structOf({});
		expect(guard({})).toBe(true);
		expect(guard(null)).toBe(false);
	});

	test("narrows every field inside the guarded branch", () => {
		const value: unknown = { id: "a", tags: ["x"] };
		const guard = structOf({ id: isString, tags: arrayOf(isString) });
		if (guard(value)) {
			const shouted: string = value.id.toUpperCase();
			const count: number = value.tags.length;
			expect(shouted).toBe("A");
			expect(count).toBe(1);
		} else {
			expect.unreachable("the payload matches the struct");
		}
	});
});

describe("tupleOf", () => {
	test("requires exact arity and positional types", () => {
		const guard = tupleOf(isString, isNumber);
		expect(guard(["a", 1])).toBe(true);
		expect(guard([1, "a"])).toBe(false);
		expect(guard(["a"])).toBe(false);
		expect(guard(["a", 1, true])).toBe(false);
	});

	test("rejects non-arrays and array-likes", () => {
		const guard = tupleOf(isString);
		expect(guard({ 0: "a", length: 1 })).toBe(false);
		expect(guard("a")).toBe(false);
		expect(guard(null)).toBe(false);
	});

	test("destructures with element types intact inside the guarded branch", () => {
		const value: unknown = ["a", 1];
		const guard = tupleOf(isString, isNumber);
		if (guard(value)) {
			const [name, count] = value;
			const label: string = `${name}:${count.toFixed(0)}`;
			expect(label).toBe("a:1");
		} else {
			expect.unreachable("the pair matches the tuple guard");
		}
	});
});

describe("optionalOf", () => {
	test("accepts undefined and whatever the inner guard accepts", () => {
		const guard = optionalOf(isNumber);
		expect(guard(undefined)).toBe(true);
		expect(guard(1)).toBe(true);
		expect(guard(Number.NaN)).toBe(true);
	});

	test("rejects null, which is not undefined", () => {
		expect(optionalOf(isNumber)(null)).toBe(false);
		expect(optionalOf(isNumber)("1")).toBe(false);
	});
});

describe("nullableOf", () => {
	test("accepts null and whatever the inner guard accepts", () => {
		const guard = nullableOf(isString);
		expect(guard(null)).toBe(true);
		expect(guard("a")).toBe(true);
	});

	test("rejects undefined, which is not null", () => {
		expect(nullableOf(isString)(undefined)).toBe(false);
		expect(nullableOf(isString)(0)).toBe(false);
	});
});

describe("nullishOf", () => {
	test("accepts null, undefined, and whatever the inner guard accepts", () => {
		const guard = nullishOf(isString);
		expect(guard(null)).toBe(true);
		expect(guard(undefined)).toBe(true);
		expect(guard("a")).toBe(true);
	});

	test("still rejects other falsy values that are not nullish", () => {
		const guard = nullishOf(isString);
		expect(guard(0)).toBe(false);
		expect(guard(false)).toBe(false);
		// The empty string is a string, so the inner guard accepts it.
		expect(guard("")).toBe(true);
	});
});
