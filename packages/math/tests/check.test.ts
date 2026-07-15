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
import { checkExpr } from "../src/check.js";
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
import { record, num, bool } from "../src/value.js";

describe("Sort Checker", () => {
	it("infers sorts for valid arithmetic expressions", () => {
		expect(checkExpr(N(42))).toEqual({ ok: true, sort: "num" });
		expect(checkExpr(add(N(2), N(3)))).toEqual({ ok: true, sort: "num" });
		expect(checkExpr(sub(N(2), N(3)))).toEqual({ ok: true, sort: "num" });
		expect(checkExpr(mul(N(2), N(3)))).toEqual({ ok: true, sort: "num" });
		expect(checkExpr(div(N(2), N(3)))).toEqual({ ok: true, sort: "num" });
		expect(checkExpr(mod(N(2), N(3)))).toEqual({ ok: true, sort: "num" });
		expect(checkExpr(pow(N(2), N(3)))).toEqual({ ok: true, sort: "num" });
		expect(checkExpr(neg(N(5)))).toEqual({ ok: true, sort: "num" });
		expect(checkExpr(sqrt(N(16)))).toEqual({ ok: true, sort: "num" });
		expect(checkExpr(abs(N(-7)))).toEqual({ ok: true, sort: "num" });
		expect(checkExpr(floor(N(3.7)))).toEqual({ ok: true, sort: "num" });
		expect(checkExpr(ceil(N(3.2)))).toEqual({ ok: true, sort: "num" });
		expect(checkExpr(factorial(N(5)))).toEqual({ ok: true, sort: "num" });
	});

	it("infers sorts for valid set expressions", () => {
		expect(checkExpr(S(1, 2, 3))).toEqual({ ok: true, sort: "set" });
		expect(checkExpr(union(S(1), S(2)))).toEqual({ ok: true, sort: "set" });
		expect(checkExpr(intersect(S(1), S(2)))).toEqual({ ok: true, sort: "set" });
		expect(checkExpr(diff(S(1), S(2)))).toEqual({ ok: true, sort: "set" });
		expect(checkExpr(symDiff(S(1), S(2)))).toEqual({ ok: true, sort: "set" });
		expect(checkExpr(add(S(1), S(2)))).toEqual({ ok: true, sort: "set" }); // Overloaded +
		expect(checkExpr(card(S(1, 2)))).toEqual({ ok: true, sort: "num" });
	});

	it("infers sorts for valid logic and relation expressions", () => {
		expect(checkExpr(B(true))).toEqual({ ok: true, sort: "bool" });
		expect(checkExpr(and(B(true), B(false)))).toEqual({ ok: true, sort: "bool" });
		expect(checkExpr(or(B(true), B(false)))).toEqual({ ok: true, sort: "bool" });
		expect(checkExpr(xor(B(true), B(false)))).toEqual({ ok: true, sort: "bool" });
		expect(checkExpr(implies(B(true), B(false)))).toEqual({ ok: true, sort: "bool" });
		expect(checkExpr(iff(B(true), B(false)))).toEqual({ ok: true, sort: "bool" });
		expect(checkExpr(not(B(true)))).toEqual({ ok: true, sort: "bool" });

		expect(checkExpr(eq(N(2), N(3)))).toEqual({ ok: true, sort: "bool" });
		expect(checkExpr(neq(N(2), N(3)))).toEqual({ ok: true, sort: "bool" });
		expect(checkExpr(lt(N(2), N(3)))).toEqual({ ok: true, sort: "bool" });
		expect(checkExpr(gt(N(2), N(3)))).toEqual({ ok: true, sort: "bool" });
		expect(checkExpr(lte(N(2), N(3)))).toEqual({ ok: true, sort: "bool" });
		expect(checkExpr(gte(N(2), N(3)))).toEqual({ ok: true, sort: "bool" });
		expect(checkExpr(elem(N(2), S(1, 2)))).toEqual({ ok: true, sort: "bool" });
		expect(checkExpr(notElem(N(2), S(1, 2)))).toEqual({ ok: true, sort: "bool" });
		expect(checkExpr(properSubset(S(1), S(2)))).toEqual({ ok: true, sort: "bool" });
		expect(checkExpr(subset(S(1), S(2)))).toEqual({ ok: true, sort: "bool" });
	});

	it("infers sorts for binder expressions", () => {
		expect(checkExpr(sum("i", S(1, 2), mul(v("i"), v("i"))))).toEqual({ ok: true, sort: "num" });
		expect(checkExpr(prod("i", S(1, 2), v("i")))).toEqual({ ok: true, sort: "num" });
		expect(checkExpr(forall("i", S(1, 2), eq(v("i"), N(2))))).toEqual({ ok: true, sort: "bool" });
		expect(checkExpr(exists("i", S(1, 2), eq(v("i"), N(2))))).toEqual({ ok: true, sort: "bool" });
	});

	it("resolves unbound variables with environment", () => {
		const ctx = new Map([
			["x", "num" as const],
			["y", "set" as const],
		]);
		expect(checkExpr(add(v("x"), N(10)), ctx)).toEqual({ ok: true, sort: "num" });
		expect(checkExpr(elem(v("x"), v("y")), ctx)).toEqual({ ok: true, sort: "bool" });
	});

	it("returns multiple collected errors for invalid expressions", () => {
		const bad1 = add(N(1), B(true));
		const check1 = checkExpr(bad1);
		expect(check1.ok).toBe(false);
		if (!check1.ok) {
			expect(check1.errors.length).toBe(1);
			expect(check1.errors[0]!.message).toContain("Expected compatible sorts, got num × bool");
		}

		// Multiple errors
		const bad2 = add(add(N(1), B(true)), elem(B(false), N(5)));
		const check2 = checkExpr(bad2);
		expect(check2.ok).toBe(false);
		if (!check2.ok) {
			// One for left nested +, one for right nested ∈, one for top + since left/right are invalid (unknown)
			expect(check2.errors.length).toBeGreaterThanOrEqual(2);
		}
	});

	it("validates conditionals", () => {
		// test must be bool, then/else must match
		expect(checkExpr(cond(B(true), N(1), N(2)))).toEqual({ ok: true, sort: "num" });
		expect(checkExpr(cond(B(true), S(1), S(2)))).toEqual({ ok: true, sort: "set" });

		const badTest = cond(N(5), N(1), N(2));
		const checkTest = checkExpr(badTest);
		expect(checkTest.ok).toBe(false);

		const badBranches = cond(B(true), N(1), S(2));
		const checkBranches = checkExpr(badBranches);
		expect(checkBranches.ok).toBe(false);
	});

	it("validates lambdas and calls", () => {
		// lambda x, x * x has type func
		expect(checkExpr(lambda("x", mul(v("x"), v("x"))))).toEqual({ ok: true, sort: "func" });

		// call(lambda x, x * x, 5) has type num
		expect(checkExpr(call(lambda("x", mul(v("x"), v("x"))), N(5)))).toEqual({
			ok: true,
			sort: "num",
		});

		// call with non-function should fail
		expect(checkExpr(call(N(5), N(10))).ok).toBe(false);
	});

	it("validates record member access and dotted paths", () => {
		const ctx = new Map([
			["user", "record" as const],
			["user.age", "num" as const],
			["user.active", "bool" as const],
			["order", "record" as const],
			["order.shipping", "record" as const],
			["order.shipping.fee", "num" as const],
		]);

		// Simple member access
		expect(checkExpr(member(v("user"), "age"), ctx)).toEqual({ ok: true, sort: "num" });
		expect(checkExpr(member(v("user"), "active"), ctx)).toEqual({ ok: true, sort: "bool" });

		// Fails if the path is not explicitly typed in ctx
		expect(checkExpr(member(v("user"), "name"), ctx).ok).toBe(false);

		// Nested member access
		expect(checkExpr(member(member(v("order"), "shipping"), "fee"), ctx)).toEqual({
			ok: true,
			sort: "num",
		});

		// Fail on non-record member access
		expect(checkExpr(member(N(5), "age"), ctx).ok).toBe(false);
	});

	it("resolves property sorts from literal record values", () => {
		const lit = {
			kind: "lit" as const,
			value: record({ age: num(25), active: bool(true) }),
		};
		// Should infer "num" from the literal record's property
		expect(checkExpr(member(lit, "age"))).toEqual({ ok: true, sort: "num" });
		// Should infer "bool"
		expect(checkExpr(member(lit, "active"))).toEqual({ ok: true, sort: "bool" });
		// Should fail for non-existent property
		expect(checkExpr(member(lit, "missing")).ok).toBe(false);
	});

	it("throws RecursionLimitError on deeply nested expressions", () => {
		let expr = N(1);
		for (let i = 0; i < 250; i++) {
			expr = add(expr, N(1));
		}
		expect(() => checkExpr(expr)).toThrow(RecursionLimitError);
	});
});
