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
import { evaluate as evaluateCompiled } from "../src/evaluate.js";
import { compile } from "../src/compile.js";

const evaluate = (expr: import("../src/ast.js").Expr, env?: import("../src/evaluate.js").Env) =>
	evaluateCompiled(compile(expr), env);
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
	lt,
	gt,
	lte,
	gte,
	elem,
	notElem,
	properSubset,
	subset,
	sum,
	prod,
	forall,
	exists,
	cond,
	lambda,
	call,
	member,
} from "../src/builder.js";
import { num, bool, mkSet, record } from "../src/value.js";
import {
	UnboundVariableError,
	DomainError,
	UndefinedOpError,
	SortError,
	StackError,
} from "../src/error.js";

describe("Evaluator", () => {
	describe("Arithmetic", () => {
		it("evaluates basic binary operations", () => {
			expect(evaluate(add(N(2), N(3)))).toEqual(num(5));
			expect(evaluate(sub(N(10), N(3)))).toEqual(num(7));
			expect(evaluate(mul(N(2), N(3)))).toEqual(num(6));
			expect(evaluate(div(N(10), N(4)))).toEqual(num(2.5));
			expect(evaluate(mod(N(10), N(3)))).toEqual(num(1));
			expect(evaluate(pow(N(2), N(10)))).toEqual(num(1024));
		});

		it("evaluates basic unary operations", () => {
			expect(evaluate(neg(N(5)))).toEqual(num(-5));
			expect(evaluate(sqrt(N(16)))).toEqual(num(4));
			expect(evaluate(abs(N(-7)))).toEqual(num(7));
			expect(evaluate(floor(N(3.7)))).toEqual(num(3));
			expect(evaluate(ceil(N(3.2)))).toEqual(num(4));
			expect(evaluate(factorial(N(5)))).toEqual(num(120));
			expect(evaluate(factorial(N(0)))).toEqual(num(1));
		});
	});

	describe("Sets", () => {
		it("evaluates set operations", () => {
			expect(evaluate(union(S(1, 2, 3), S(3, 4)))).toEqual(mkSet([1, 2, 3, 4]));
			expect(evaluate(intersect(S(1, 2, 3), S(2, 3, 4)))).toEqual(mkSet([2, 3]));
			expect(evaluate(diff(S(1, 2, 3), S(2)))).toEqual(mkSet([1, 3]));
			expect(evaluate(symDiff(S(1, 2, 3), S(2, 3, 4)))).toEqual(mkSet([1, 4]));
			expect(evaluate(card(S(1, 2, 3)))).toEqual(num(3));
			expect(evaluate(card(S()))).toEqual(num(0));
			expect(evaluate(add(S(1, 2), S(3, 4)))).toEqual(mkSet([1, 2, 3, 4]));
		});
	});

	describe("Logic", () => {
		it("evaluates logical connectives", () => {
			expect(evaluate(and(B(true), B(false)))).toEqual(bool(false));
			expect(evaluate(or(B(true), B(false)))).toEqual(bool(true));
			expect(evaluate(xor(B(true), B(false)))).toEqual(bool(true));
			expect(evaluate(xor(B(true), B(true)))).toEqual(bool(false));
			expect(evaluate(implies(B(false), B(true)))).toEqual(bool(true));
			expect(evaluate(implies(B(true), B(false)))).toEqual(bool(false));
			expect(evaluate(iff(B(true), B(true)))).toEqual(bool(true));
			expect(evaluate(iff(B(true), B(false)))).toEqual(bool(false));
			expect(evaluate(not(B(true)))).toEqual(bool(false));
		});
	});

	describe("Relations", () => {
		it("evaluates relational operators", () => {
			expect(evaluate(eq(N(2), N(2)))).toEqual(bool(true));
			expect(evaluate(eq(N(2), N(3)))).toEqual(bool(false));
			expect(evaluate(neq(N(2), N(3)))).toEqual(bool(true));
			expect(evaluate(lt(N(2), N(3)))).toEqual(bool(true));
			expect(evaluate(lt(N(3), N(2)))).toEqual(bool(false));
			expect(evaluate(gt(N(3), N(2)))).toEqual(bool(true));
			expect(evaluate(lte(N(2), N(2)))).toEqual(bool(true));
			expect(evaluate(lte(N(2), N(3)))).toEqual(bool(true));
			expect(evaluate(gte(N(3), N(3)))).toEqual(bool(true));
			expect(evaluate(elem(N(2), S(1, 2, 3)))).toEqual(bool(true));
			expect(evaluate(elem(N(5), S(1, 2, 3)))).toEqual(bool(false));
			expect(evaluate(notElem(N(5), S(1, 2, 3)))).toEqual(bool(true));
			expect(evaluate(properSubset(S(1), S(1, 2)))).toEqual(bool(true));
			expect(evaluate(properSubset(S(1, 2), S(1, 2)))).toEqual(bool(false));
			expect(evaluate(subset(S(1, 2), S(1, 2)))).toEqual(bool(true));

			expect(evaluate(eq(S(1, 2), S(2, 1)))).toEqual(bool(true));
			expect(evaluate(eq(B(true), B(true)))).toEqual(bool(true));
		});
	});

	describe("Binders", () => {
		it("evaluates big summations and products", () => {
			expect(evaluate(sum("i", S(1, 2, 3), mul(v("i"), v("i"))))).toEqual(num(14));
			expect(evaluate(prod("i", S(1, 2, 3), v("i")))).toEqual(num(6));
			expect(evaluate(sum("i", S(), v("i")))).toEqual(num(0));
			expect(evaluate(prod("i", S(), v("i")))).toEqual(num(1));
		});

		it("evaluates quantifiers", () => {
			expect(evaluate(forall("i", S(2, 4, 6), gt(v("i"), N(0))))).toEqual(bool(true));
			expect(evaluate(forall("i", S(2, 4, 6), gt(v("i"), N(3))))).toEqual(bool(false));
			expect(evaluate(exists("i", S(1, 2, 3), eq(v("i"), N(2))))).toEqual(bool(true));
			expect(evaluate(exists("i", S(1, 2, 3), gt(v("i"), N(10))))).toEqual(bool(false));
			expect(evaluate(forall("i", S(), gt(v("i"), N(0))))).toEqual(bool(true)); // vacuous truth
			expect(evaluate(exists("i", S(), gt(v("i"), N(0))))).toEqual(bool(false));
		});

		it("handles nested binders and variable shadowing", () => {
			// ∑_{i ∈ {1,2}} ∑_{j ∈ {1,2}} i × j = (1*1 + 1*2) + (2*1 + 2*2) = 3 + 6 = 9
			const expr = sum("i", S(1, 2), sum("j", S(1, 2), mul(v("i"), v("j"))));
			expect(evaluate(expr)).toEqual(num(9));

			// Shadowing: inner "i" shadows outer "i"
			const shadowed = sum("i", S(1, 2), sum("i", S(10, 20), v("i")));
			// S(1,2) size is 2. S(10,20) sum is 30. Total should be 2 * 30 = 60.
			expect(evaluate(shadowed)).toEqual(num(60));
		});
	});

	describe("Conditionals", () => {
		it("evaluates piecewise branch conditional nodes", () => {
			expect(evaluate(cond(B(true), N(1), N(2)))).toEqual(num(1));
			expect(evaluate(cond(B(false), N(1), N(2)))).toEqual(num(2));
		});
	});

	describe("Variables and Environment", () => {
		it("resolves variables from the context", () => {
			const env = new Map([
				["x", num(3)],
				["y", num(4)],
			]);
			expect(evaluate(add(v("x"), v("y")), env)).toEqual(num(7));
		});
	});

	describe("Records and Member Access", () => {
		it("evaluates simple member accesses", () => {
			const env = new Map([["user", record({ age: num(30), name: num(42) })]]);
			expect(evaluate(member(v("user"), "age"), env)).toEqual(num(30));
			expect(evaluate(member(v("user"), "name"), env)).toEqual(num(42));
		});

		it("evaluates nested member accesses", () => {
			const env = new Map([["order", record({ shipping: record({ fee: num(9.99) }) })]]);
			expect(evaluate(member(member(v("order"), "shipping"), "fee"), env)).toEqual(num(9.99));
		});

		it("throws error when accessing non-existent record property", () => {
			const env = new Map([["user", record({ age: num(30) })]]);
			expect(() => evaluate(member(v("user"), "nonexistent"), env)).toThrow(DomainError);
		});

		it("rejects inherited properties (prototype pollution prevention)", () => {
			const env = new Map([["user", record({ age: num(30) })]]);
			expect(() => evaluate(member(v("user"), "toString"), env)).toThrow(DomainError);
			expect(() => evaluate(member(v("user"), "constructor"), env)).toThrow(DomainError);
		});
	});

	describe("Error Paths", () => {
		it("throws on unbound variables", () => {
			expect(() => evaluate(v("z"))).toThrow(UnboundVariableError);
		});

		it("throws StackError on out-of-bounds stack index", () => {
			const invalidBound = { kind: "bound_var" as const, index: 99 };
			expect(() => evaluateCompiled(invalidBound)).toThrow(StackError);
		});

		it("throws on division by zero", () => {
			expect(() => evaluate(div(N(5), N(0)))).toThrow(DomainError);
			expect(() => evaluate(mod(N(5), N(0)))).toThrow(DomainError);
		});

		it("throws on domain violations", () => {
			expect(() => evaluate(sqrt(N(-1)))).toThrow(DomainError);
			expect(() => evaluate(factorial(N(-5)))).toThrow(DomainError);
			expect(() => evaluate(factorial(N(1.5)))).toThrow(DomainError);
		});

		it("throws when operator is not defined for sorts", () => {
			expect(() => evaluate(add(B(true), B(false)))).toThrow(UndefinedOpError);
			expect(() => evaluate(not(N(10)))).toThrow(UndefinedOpError);
		});

		it("throws on sort errors inside control structures", () => {
			expect(() => evaluate(sum("i", N(5), v("i")))).toThrow(SortError);
			expect(() => evaluate(cond(N(5), N(1), N(2)))).toThrow(SortError);
		});
	});

	describe("First-class Functions and Closures", () => {
		it("evaluates lambdas and calls", () => {
			// (λx. x * x)(5) = 25
			const square = lambda("x", mul(v("x"), v("x")));
			expect(evaluate(call(square, N(5)))).toEqual(num(25));
		});

		it("handles higher-order closures and lexical scoping stack", () => {
			// λx. λy. x + y
			const adder = lambda("x", lambda("y", add(v("x"), v("y"))));
			// (adder(5))(10) = 15
			const add5 = call(adder, N(5));
			expect(evaluate(call(add5, N(10)))).toEqual(num(15));
		});

		it("respects parameter shadowing in nested closures", () => {
			// λx. λx. x
			const doubleShadow = lambda("x", lambda("x", v("x")));
			// (doubleShadow(1))(2) should yield 2 (inner parameter shadows outer)
			const applied = call(call(doubleShadow, N(1)), N(2));
			expect(evaluate(applied)).toEqual(num(2));
		});
	});
});
