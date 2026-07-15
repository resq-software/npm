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
 * @fileoverview Public API for `@resq-systems/math` — a type-safe mathematical
 * expression engine with sort-based dispatch, static validation, and a Pratt parser.
 *
 * Tree-shakeable: importing `evaluate` does not pull in `parse`, and vice versa.
 * Zero runtime dependencies.
 *
 * @module @resq-systems/math
 *
 * @example Programmatic AST construction
 * ```ts
 * import { N, S, add, mul, sum, v, compile, evaluate, showValue } from "@resq-systems/math";
 *
 * const expr = compile(mul(add(N(2), N(3)), N(4)));
 * console.log(showValue(evaluate(expr))); // "20"
 * ```
 *
 * @example Parse → Compile → Check → Evaluate pipeline
 * ```ts
 * import { parse, checkExpr, compile, evaluate, showValue } from "@resq-systems/math";
 *
 * const expr = parse("sum(i in {1, 2, 3}, i * i)");
 * const check = checkExpr(expr);
 * if (check.ok) {
 *   console.log(showValue(evaluate(compile(expr)))); // "14"
 * }
 * ```
 */

// ── Errors ──────────────────────────────────────────────────────────────────
export {
	DomainError,
	MathError,
	ParseError,
	SortError,
	StackError,
	UnboundVariableError,
	UndefinedOpError,
} from "./error.js";

// ── Values ──────────────────────────────────────────────────────────────────
export {
	asBool,
	asFunc,
	asNum,
	asSet,
	asRecord,
	bool,
	func,
	mkSet,
	num,
	record,
	setEq,
	showValue,
} from "./value.js";
export type { Sort, Value } from "./value.js";

// ── AST ─────────────────────────────────────────────────────────────────────
export type {
	BinaryExpr,
	BinaryOp,
	BinderExpr,
	BinderOp,
	CondExpr,
	Expr,
	LitExpr,
	LogicExpr,
	LogicOp,
	RelExpr,
	RelOp,
	UnaryExpr,
	UnaryOp,
	VarExpr,
	LambdaExpr,
	CallExpr,
	MemberExpr,
	// Compiled
	CompiledExpr,
	CBinaryExpr,
	CBinderExpr,
	CCallExpr,
	CCondExpr,
	CFreeVarExpr,
	CBoundVarExpr,
	CLambdaExpr,
	CLitExpr,
	CLogicExpr,
	CRelExpr,
	CUnaryExpr,
	CMemberExpr,
} from "./ast.js";

// ── Builders ────────────────────────────────────────────────────────────────
export {
	// Literals
	B,
	N,
	S,
	lit,
	// Variables
	v,
	// Arithmetic
	abs,
	add,
	ceil,
	div,
	factorial,
	floor,
	mod,
	mul,
	neg,
	pow,
	sqrt,
	sub,
	// Set operations
	card,
	diff,
	intersect,
	symDiff,
	union,
	// Logic
	and,
	iff,
	implies,
	not,
	or,
	xor,
	// Relations
	elem,
	eq,
	gt,
	gte,
	lt,
	lte,
	neq,
	notElem,
	properSubset,
	subset,
	// Binders
	exists,
	forall,
	prod,
	sum,
	// Control
	cond,
	// Lambdas
	lambda,
	call,
	// Records
	member,
} from "./builder.js";

// ── Dispatch instances ──────────────────────────────────────────────────────
export {
	lookupBinary,
	lookupLogic,
	lookupRel,
	lookupUnary,
	registerBinary,
	registerLogic,
	registerRelation,
	registerUnary,
	encodeBinary,
	encodeLogic,
	encodeRel,
	encodeUnary,
} from "./instance.js";

// ── Compiler ────────────────────────────────────────────────────────────────
export { compile } from "./compile.js";

// ── Evaluator ───────────────────────────────────────────────────────────────
export { evaluate } from "./evaluate.js";
export type { Env } from "./evaluate.js";

// ── Sort checker ────────────────────────────────────────────────────────────
export { checkExpr } from "./check.js";
export type { CheckResult, SortContext } from "./check.js";

// ── Pretty printer ──────────────────────────────────────────────────────────
export { print } from "./print.js";
export type { PrintOptions } from "./print.js";

// ── Parser ──────────────────────────────────────────────────────────────────
export { parse } from "./parse.js";
