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
import { parse } from "../src/parse.js";
import { evaluate as evaluateCompiled } from "../src/evaluate.js";
import { compile } from "../src/compile.js";

const evaluate = (expr: import("../src/ast.js").Expr, env?: import("../src/evaluate.js").Env) =>
	evaluateCompiled(compile(expr), env);
import { num, bool, mkSet, record } from "../src/value.js";
import { ParseError } from "../src/error.js";

describe("Pratt Parser", () => {
	describe("Literals", () => {
		it("parses numeric literals", () => {
			expect(evaluate(parse("42"))).toEqual(num(42));
			expect(evaluate(parse("3.14"))).toEqual(num(3.14));
		});

		it("parses boolean literals", () => {
			expect(evaluate(parse("true"))).toEqual(bool(true));
			expect(evaluate(parse("false"))).toEqual(bool(false));
		});

		it("parses set literals", () => {
			expect(evaluate(parse("{1, 2, 3}"))).toEqual(mkSet([1, 2, 3]));
			expect(evaluate(parse("{}"))).toEqual(mkSet([]));
		});
	});

	describe("Arithmetic and Precedence", () => {
		it("respects operator precedence", () => {
			expect(evaluate(parse("2 + 3 * 4"))).toEqual(num(14));
			expect(evaluate(parse("2 * 3 + 4"))).toEqual(num(10));
			expect(evaluate(parse("2 + 3 × 4"))).toEqual(num(14)); // Unicode ×
			expect(evaluate(parse("10 - 2 - 3"))).toEqual(num(5)); // Left-associative
			expect(evaluate(parse("2 ^ 3 ^ 2"))).toEqual(num(512)); // Right-associative 2^(3^2) = 2^9
		});

		it("respects parentheses grouping", () => {
			expect(evaluate(parse("(2 + 3) * 4"))).toEqual(num(20));
		});
	});

	describe("Unary and Postfix Operators", () => {
		it("parses unary prefix operators", () => {
			expect(evaluate(parse("-5"))).toEqual(num(-5));
			expect(evaluate(parse("not true"))).toEqual(bool(false));
			expect(evaluate(parse("¬false"))).toEqual(bool(true));
			expect(evaluate(parse("#{1, 2, 3}"))).toEqual(num(3));
		});

		it("parses factorial postfix operator", () => {
			expect(evaluate(parse("5!"))).toEqual(num(120));
			expect(evaluate(parse("0!"))).toEqual(num(1));
		});

		it("parses functions as prefix calls", () => {
			expect(evaluate(parse("sqrt(16)"))).toEqual(num(4));
			expect(evaluate(parse("abs(-7)"))).toEqual(num(7));
			expect(evaluate(parse("floor(3.7)"))).toEqual(num(3));
			expect(evaluate(parse("ceil(3.2)"))).toEqual(num(4));
		});
	});

	describe("Sets, Logic and Relations", () => {
		it("parses set operators", () => {
			expect(evaluate(parse("{1, 2} union {2, 3}"))).toEqual(mkSet([1, 2, 3]));
			expect(evaluate(parse("{1, 2} ∪ {2, 3}"))).toEqual(mkSet([1, 2, 3]));
			expect(evaluate(parse("{1, 2} intersect {2, 3}"))).toEqual(mkSet([2]));
			expect(evaluate(parse("{1, 2} diff {2, 3}"))).toEqual(mkSet([1]));
			expect(evaluate(parse("{1, 2} symdiff {2, 3}"))).toEqual(mkSet([1, 3]));
		});

		it("parses logic operators", () => {
			expect(evaluate(parse("true and false"))).toEqual(bool(false));
			expect(evaluate(parse("true or false"))).toEqual(bool(true));
			expect(evaluate(parse("true xor false"))).toEqual(bool(true));
			expect(evaluate(parse("true && false"))).toEqual(bool(false));
			expect(evaluate(parse("true || false"))).toEqual(bool(true));
			expect(evaluate(parse("true => false"))).toEqual(bool(false));
			expect(evaluate(parse("true <=> true"))).toEqual(bool(true));
		});

		it("parses relational operators", () => {
			expect(evaluate(parse("2 = 2"))).toEqual(bool(true));
			expect(evaluate(parse("2 != 2"))).toEqual(bool(false));
			expect(evaluate(parse("2 ≠ 2"))).toEqual(bool(false));
			expect(evaluate(parse("2 <= 3"))).toEqual(bool(true));
			expect(evaluate(parse("3 >= 3"))).toEqual(bool(true));
			expect(evaluate(parse("2 in {1, 2, 3}"))).toEqual(bool(true));
			expect(evaluate(parse("5 in {1, 2, 3}"))).toEqual(bool(false));
			expect(evaluate(parse("5 ∈ {1, 2, 3}"))).toEqual(bool(false));
			expect(evaluate(parse("{1} subset {1, 2}"))).toEqual(bool(true));
			expect(evaluate(parse("{1} subseteq {1, 2}"))).toEqual(bool(true));
		});
	});

	describe("Binders and Control Flow", () => {
		it("parses binder constructs", () => {
			expect(evaluate(parse("sum(i in {1, 2, 3}, i * i)"))).toEqual(num(14));
			expect(evaluate(parse("prod(i in {1, 2, 3}, i)"))).toEqual(num(6));
			expect(evaluate(parse("forall(x in {2, 4, 6}, x > 0)"))).toEqual(bool(true));
			expect(evaluate(parse("exists(x in {1, 2}, x = 2)"))).toEqual(bool(true));
		});

		it("parses conditional nodes", () => {
			expect(evaluate(parse("if true then 1 else 2"))).toEqual(num(1));
			expect(evaluate(parse("if false then 1 else 2"))).toEqual(num(2));
		});

		it("parses lambdas and call applications", () => {
			expect(evaluate(parse("(\\x -> x * x)(5)"))).toEqual(num(25));
			expect(evaluate(parse("(λx. x * x)(5)"))).toEqual(num(25));
		});
	});

	describe("Records and Member Access", () => {
		it("parses and evaluates member accesses on environment records", () => {
			const env = new Map([["user", record({ age: num(25), active: bool(true) })]]);
			expect(evaluate(parse("user.age"), env)).toEqual(num(25));
			expect(evaluate(parse("user.active"), env)).toEqual(bool(true));
		});

		it("parses nested member accesses", () => {
			const env = new Map([["order", record({ shipping: record({ fee: num(5.99) }) })]]);
			expect(evaluate(parse("order.shipping.fee"), env)).toEqual(num(5.99));
		});

		it("respects precedence in operations with member access", () => {
			const env = new Map([["item", record({ price: num(10), qty: num(3) })]]);
			expect(evaluate(parse("item.price * item.qty + 5"), env)).toEqual(num(35));
			expect(evaluate(parse("-(item.price)"), env)).toEqual(num(-10));
		});
	});

	describe("Variables and Parsing Errors", () => {
		it("parses variables and evaluates them", () => {
			const env = new Map([
				["x", num(10)],
				["y", num(20)],
			]);
			expect(evaluate(parse("x + y"), env)).toEqual(num(30));
		});

		it("throws ParseError on malformed input", () => {
			expect(() => parse("")).toThrow(ParseError);
			expect(() => parse("2 +")).toThrow(ParseError);
			expect(() => parse("@")).toThrow(ParseError);
			expect(() => parse("(2 + 3")).toThrow(ParseError);
			expect(() => parse("sum(i in {1}, )")).toThrow(ParseError);
		});
	});
});
