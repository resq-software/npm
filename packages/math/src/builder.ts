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
 * @fileoverview Ergonomic AST constructors.
 *
 * Every function returns an {@link Expr} node. Names are chosen so that
 * test code and consumer code read close to mathematical notation.
 *
 * These builders are pure and allocate only — they perform **no** sort checking
 * or domain validation. `add(B(true), S(1))` builds happily; such a tree is
 * rejected only later by `checkExpr` (statically) or `evaluate` (at runtime).
 * Where a doc below mentions a `DomainError`, it is thrown at *evaluation* of the
 * built node, never by the builder itself.
 *
 * @module @resq-systems/math/builder
 *
 * @example
 * ```ts
 * import { N, S, B, add, mul, sum, v, evaluate, showValue } from "@resq-systems/math";
 *
 * // (2 + 3) × 4
 * const expr = mul(add(N(2), N(3)), N(4));
 *
 * // ∑_{i ∈ {1,2,3}} i × i
 * const sigma = sum("i", S(1, 2, 3), mul(v("i"), v("i")));
 * ```
 */

import type { BinaryOp, BinderOp, Expr, LogicOp, RelOp, UnaryOp } from "./ast.js";
import { bool, mkSet, num } from "./value.js";
import type { Value } from "./value.js";

// ────────────────────────── Literals ──────────────────────────

/** Numeric literal. */
export const N = (n: number): Expr => ({ kind: "lit", value: num(n) });

/** Set literal from variadic number args. */
export const S = (...xs: number[]): Expr => ({ kind: "lit", value: mkSet(xs) });

/** Boolean literal. */
export const B = (b: boolean): Expr => ({ kind: "lit", value: bool(b) });

/** Generic literal from an already-constructed {@link Value}. */
export const lit = (value: Value): Expr => ({ kind: "lit", value });

// ────────────────────────── Variables ──────────────────────────

/** Variable reference. */
export const v = (name: string): Expr => ({ kind: "var", name });

// ────────────────────────── Internal helpers ──────────────────────────

const unary = (op: UnaryOp, arg: Expr): Expr => ({ kind: "unary", op, arg });

const binary = (op: BinaryOp, left: Expr, right: Expr): Expr => ({
	kind: "binary",
	op,
	left,
	right,
});

const relation = (op: RelOp, left: Expr, right: Expr): Expr => ({
	kind: "relation",
	op,
	left,
	right,
});

const logic = (op: LogicOp, left: Expr, right: Expr): Expr => ({
	kind: "logic",
	op,
	left,
	right,
});

const binder = (op: BinderOp, bound: string, domain: Expr, body: Expr): Expr => ({
	kind: "binder",
	op,
	bound,
	domain,
	body,
});

// ────────────────────────── Arithmetic ──────────────────────────

/** Addition: `a + b` (overloaded on sets as disjoint union). */
export const add = (a: Expr, b: Expr): Expr => binary("+", a, b);

/** Subtraction: `a − b`. */
export const sub = (a: Expr, b: Expr): Expr => binary("-", a, b);

/** Multiplication: `a × b`. */
export const mul = (a: Expr, b: Expr): Expr => binary("×", a, b);

/** Division: `a ÷ b`. The built node throws {@link DomainError} at evaluation when the divisor is `0`. */
export const div = (a: Expr, b: Expr): Expr => binary("÷", a, b);

/** Modulo: `a mod b`. */
export const mod = (a: Expr, b: Expr): Expr => binary("mod", a, b);

/** Exponentiation: `a ^ b`. */
export const pow = (a: Expr, b: Expr): Expr => binary("pow", a, b);

/** Arithmetic negation: `−a`. */
export const neg = (a: Expr): Expr => unary("neg", a);

/** Square root: `√a`. The built node throws {@link DomainError} at evaluation on a negative argument. */
export const sqrt = (a: Expr): Expr => unary("sqrt", a);

/** Absolute value: `|a|`. */
export const abs = (a: Expr): Expr => unary("abs", a);

/** Floor: `⌊a⌋`. */
export const floor = (a: Expr): Expr => unary("floor", a);

/** Ceiling: `⌈a⌉`. */
export const ceil = (a: Expr): Expr => unary("ceil", a);

/** Factorial: `a!`. The built node throws {@link DomainError} at evaluation on a negative, non-integer, or `>170` argument. */
export const factorial = (a: Expr): Expr => unary("factorial", a);

// ────────────────────────── Set operations ──────────────────────────

/** Set union: `A ∪ B`. */
export const union = (a: Expr, b: Expr): Expr => binary("∪", a, b);

/** Set intersection: `A ∩ B`. */
export const intersect = (a: Expr, b: Expr): Expr => binary("∩", a, b);

/** Set difference: `A ∖ B`. */
export const diff = (a: Expr, b: Expr): Expr => binary("∖", a, b);

/** Symmetric difference: `A △ B`. */
export const symDiff = (a: Expr, b: Expr): Expr => binary("△", a, b);

/** Cardinality: `#A` (returns num). */
export const card = (a: Expr): Expr => unary("card", a);

// ────────────────────────── Logic ──────────────────────────

/** Logical AND: `p ∧ q`. */
export const and = (a: Expr, b: Expr): Expr => logic("∧", a, b);

/** Logical OR: `p ∨ q`. */
export const or = (a: Expr, b: Expr): Expr => logic("∨", a, b);

/** Exclusive OR: `p ⊻ q`. */
export const xor = (a: Expr, b: Expr): Expr => logic("⊻", a, b);

/** Material conditional: `p ⇒ q`. */
export const implies = (a: Expr, b: Expr): Expr => logic("⇒", a, b);

/** Biconditional: `p ⇔ q`. */
export const iff = (a: Expr, b: Expr): Expr => logic("⇔", a, b);

/** Logical negation: `¬p`. */
export const not = (a: Expr): Expr => unary("not", a);

// ────────────────────────── Relations ──────────────────────────

/** Equality: `a = b`. */
export const eq = (a: Expr, b: Expr): Expr => relation("=", a, b);

/** Inequality: `a ≠ b`. */
export const neq = (a: Expr, b: Expr): Expr => relation("≠", a, b);

/** Less than: `a < b`. */
export const lt = (a: Expr, b: Expr): Expr => relation("<", a, b);

/** Greater than: `a > b`. */
export const gt = (a: Expr, b: Expr): Expr => relation(">", a, b);

/** Less than or equal: `a ≤ b`. */
export const lte = (a: Expr, b: Expr): Expr => relation("≤", a, b);

/** Greater than or equal: `a ≥ b`. */
export const gte = (a: Expr, b: Expr): Expr => relation("≥", a, b);

/** Set membership: `x ∈ A`. */
export const elem = (a: Expr, b: Expr): Expr => relation("∈", a, b);

/** Non-membership: `x ∉ A`. */
export const notElem = (a: Expr, b: Expr): Expr => relation("∉", a, b);

/** Proper subset: `A ⊂ B`. */
export const properSubset = (a: Expr, b: Expr): Expr => relation("⊂", a, b);

/** Subset or equal: `A ⊆ B`. */
export const subset = (a: Expr, b: Expr): Expr => relation("⊆", a, b);

// ────────────────────────── Binders ──────────────────────────

/** Summation: `∑_{bound ∈ domain} body`. */
export const sum = (bound: string, domain: Expr, body: Expr): Expr =>
	binder("∑", bound, domain, body);

/** Product: `∏_{bound ∈ domain} body`. */
export const prod = (bound: string, domain: Expr, body: Expr): Expr =>
	binder("∏", bound, domain, body);

/** Universal quantifier: `∀ bound ∈ domain, body`. */
export const forall = (bound: string, domain: Expr, body: Expr): Expr =>
	binder("∀", bound, domain, body);

/** Existential quantifier: `∃ bound ∈ domain, body`. */
export const exists = (bound: string, domain: Expr, body: Expr): Expr =>
	binder("∃", bound, domain, body);

// ────────────────────────── Conditional ──────────────────────────

/** If–then–else: evaluates `test` as bool, returns `then` or `else` branch. */
export const cond = (test: Expr, then: Expr, els: Expr): Expr => ({
	kind: "cond",
	test,
	then,
	else: els,
});

// ────────────────────────── First-class Functions ──────────────────────────

/** Lambda abstraction: `λparam. body`. */
export const lambda = (param: string, body: Expr): Expr => ({
	kind: "lambda",
	param,
	body,
});

/** Function application / call: `func(arg)`. */
export const call = (func: Expr, arg: Expr): Expr => ({
	kind: "call",
	func,
	arg,
});

/** Record member access: `obj.property`. */
export const member = (obj: Expr, property: string): Expr => ({
	kind: "member",
	obj,
	property,
});
