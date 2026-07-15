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

import { describe, expect, it } from "vitest";
import { print } from "../src/print.js";
import { RecursionLimitError } from "../src/error.js";
import {
	N,
	S,
	B,
	v,
	add,
	sub,
	mul,
	div,
	mod,
	pow,
	neg,
	sqrt,
	abs,
	floor,
	ceil,
	factorial,
	union,
	intersect,
	diff,
	symDiff,
	card,
	and,
	or,
	xor,
	implies,
	iff,
	not,
	eq,
	neq,
	gt,
	lte,
	gte,
	elem,
	notElem,
	properSubset,
	subset,
	sum,
	forall,
	cond,
	lambda,
	call,
	member,
	lit,
} from "../src/builder.js";
import { record } from "../src/value.js";

describe("Pretty Printer", () => {
	describe("Atoms and Literals", () => {
		it("prints simple values correctly", () => {
			expect(print(N(5))).toBe("5");
			expect(print(N(-0))).toBe("-0");
			expect(print(B(true))).toBe("true");
			expect(print(B(false))).toBe("false");
			expect(print(v("x"))).toBe("x");
			expect(print(S(1, 2, 3))).toBe("{1, 2, 3}");
			expect(print(S())).toBe("∅");
		});

		it("prints empty set as {} in ASCII mode", () => {
			expect(print(S(), { ascii: true })).toBe("{}");
		});
	});

	describe("Arithmetic", () => {
		it("prints operators in Unicode by default", () => {
			expect(print(add(N(2), N(3)))).toBe("2 + 3");
			expect(print(sub(N(2), N(3)))).toBe("2 − 3"); // Unicode minus
			expect(print(mul(N(2), N(3)))).toBe("2 × 3");
			expect(print(div(N(2), N(3)))).toBe("2 ÷ 3");
			expect(print(mod(N(2), N(3)))).toBe("2 mod 3");
			expect(print(pow(N(2), N(3)))).toBe("2 ^ 3");
		});

		it("prints operators in ASCII when requested", () => {
			expect(print(sub(N(2), N(3)), { ascii: true })).toBe("2 - 3");
			expect(print(mul(N(2), N(3)), { ascii: true })).toBe("2 * 3");
			expect(print(div(N(2), N(3)), { ascii: true })).toBe("2 / 3");
		});
	});

	describe("Precedence and Parentheses", () => {
		it("adds parentheses when child has lower precedence", () => {
			// (2 + 3) × 4
			expect(print(mul(add(N(2), N(3)), N(4)))).toBe("(2 + 3) × 4");
			// 4 × (2 + 3)
			expect(print(mul(N(4), add(N(2), N(3))))).toBe("4 × (2 + 3)");
		});

		it("omits parentheses when child has higher precedence", () => {
			// 2 + 3 × 4
			expect(print(add(N(2), mul(N(3), N(4))))).toBe("2 + 3 × 4");
		});

		it("handles power associativity correctly (right-associative)", () => {
			// (2 ^ 3) ^ 4 -> (2 ^ 3) ^ 4
			expect(print(pow(pow(N(2), N(3)), N(4)))).toBe("(2 ^ 3) ^ 4");
			// 2 ^ (3 ^ 4) -> 2 ^ 3 ^ 4
			expect(print(pow(N(2), pow(N(3), N(4))))).toBe("2 ^ 3 ^ 4");
		});
	});

	describe("Unary Operators", () => {
		it("renders prefix and postfix operators correctly", () => {
			expect(print(neg(N(5)))).toBe("−5");
			expect(print(not(B(true)))).toBe("¬true");
			expect(print(card(S(1, 2)))).toBe("#{1, 2}");
			expect(print(factorial(N(5)))).toBe("5!");

			// Brackets / Functions
			expect(print(sqrt(N(16)))).toBe("sqrt(16)");
			expect(print(abs(neg(N(5))))).toBe("abs(−5)");
			expect(print(floor(N(3.7)))).toBe("floor(3.7)");
			expect(print(ceil(N(3.2)))).toBe("ceil(3.2)");
		});

		it("uses ASCII equivalents in ASCII mode", () => {
			expect(print(neg(N(5)), { ascii: true })).toBe("-5");
			expect(print(not(B(true)), { ascii: true })).toBe("not true");
			expect(print(sqrt(N(16)), { ascii: true })).toBe("sqrt(16)");
		});
	});

	describe("Set and Logic Operations", () => {
		it("renders set operations", () => {
			expect(print(union(S(1), S(2)))).toBe("{1} ∪ {2}");
			expect(print(intersect(S(1), S(2)))).toBe("{1} ∩ {2}");
			expect(print(diff(S(1), S(2)))).toBe("{1} ∖ {2}");
			expect(print(symDiff(S(1), S(2)))).toBe("{1} △ {2}");
		});

		it("renders logical operations", () => {
			expect(print(and(B(true), B(false)))).toBe("true ∧ false");
			expect(print(or(B(true), B(false)))).toBe("true ∨ false");
			expect(print(xor(B(true), B(false)))).toBe("true ⊻ false");
			expect(print(implies(B(true), B(false)))).toBe("true ⇒ false");
			expect(print(iff(B(true), B(false)))).toBe("true ⇔ false");
		});

		it("renders set/logic in ASCII mode", () => {
			expect(print(union(S(1), S(2)), { ascii: true })).toBe("{1} union {2}");
			expect(print(and(B(true), B(false)), { ascii: true })).toBe("true and false");
			expect(print(implies(B(true), B(false)), { ascii: true })).toBe("true => false");
			expect(print(iff(B(true), B(false)), { ascii: true })).toBe("true <=> false");
		});
	});

	describe("Relations", () => {
		it("renders relational operators", () => {
			expect(print(eq(N(2), N(2)))).toBe("2 = 2");
			expect(print(neq(N(2), N(2)))).toBe("2 ≠ 2");
			expect(print(lte(N(2), N(2)))).toBe("2 ≤ 2");
			expect(print(gte(N(2), N(2)))).toBe("2 ≥ 2");
			expect(print(elem(N(2), S(1, 2)))).toBe("2 ∈ {1, 2}");
			expect(print(notElem(N(2), S(1, 2)))).toBe("2 ∉ {1, 2}");
			expect(print(properSubset(S(1), S(2)))).toBe("{1} ⊂ {2}");
			expect(print(subset(S(1), S(2)))).toBe("{1} ⊆ {2}");
		});

		it("renders relations in ASCII mode", () => {
			expect(print(neq(N(2), N(2)), { ascii: true })).toBe("2 != 2");
			expect(print(lte(N(2), N(2)), { ascii: true })).toBe("2 <= 2");
			expect(print(gte(N(2), N(2)), { ascii: true })).toBe("2 >= 2");
			expect(print(elem(N(2), S(1, 2)), { ascii: true })).toBe("2 in {1, 2}");
			expect(print(subset(S(1), S(2)), { ascii: true })).toBe("{1} subseteq {2}");
		});
	});

	describe("Binders and Control Flow", () => {
		it("renders binders", () => {
			expect(print(sum("i", S(1, 2), mul(v("i"), v("i"))))).toBe("∑(i ∈ {1, 2}) i × i");
			expect(print(forall("x", S(1, 2), gt(v("x"), N(0))))).toBe("∀(x ∈ {1, 2}) x > 0");
		});

		it("renders binders in ASCII mode", () => {
			expect(print(sum("i", S(1, 2), mul(v("i"), v("i"))), { ascii: true })).toBe(
				"sum(i in {1, 2}) i * i",
			);
			expect(print(forall("x", S(1, 2), gt(v("x"), N(0))), { ascii: true })).toBe(
				"forall(x in {1, 2}) x > 0",
			);
		});

		it("renders conditionals", () => {
			expect(print(cond(B(true), N(1), N(2)))).toBe("if true then 1 else 2");
		});

		it("renders lambdas and calls", () => {
			expect(print(lambda("x", mul(v("x"), v("x"))))).toBe("λx. x × x");
			expect(print(lambda("x", mul(v("x"), v("x"))), { ascii: true })).toBe("\\x -> x * x");
			expect(print(call(v("f"), N(5)))).toBe("f(5)");
		});

		it("renders records and member access", () => {
			expect(print(lit(record({ a: N(1).value, b: B(false).value })))).toBe("{a: 1, b: false}");
			expect(print(member(v("user"), "age"))).toBe("user.age");
			expect(print(member(add(N(2), N(3)), "prop"))).toBe("(2 + 3).prop");
			expect(print(member(v("order"), "shipping"))).toBe("order.shipping");
		});

		it("throws RecursionLimitError on deeply nested expressions", () => {
			let expr = N(1);
			for (let i = 0; i < 250; i++) {
				expr = add(expr, N(1));
			}
			expect(() => print(expr)).toThrow(RecursionLimitError);
		});
	});
});
