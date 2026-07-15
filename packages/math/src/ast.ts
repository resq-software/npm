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
 * @fileoverview AST node types for mathematical expressions.
 *
 * Exposes two representation layers:
 *   1. High-level named AST (`Expr`): Parsed directly from strings or built
 *      programmatically. Uses names for variables (`var`) and binders (`binder`).
 *   2. Compiled index-based AST (`CompiledExpr`): Produced by compiling an `Expr`.
 *      Replaces scoped variable names with De Bruijn indices (`bound_var`) and
 *      free variables with `free_var`.
 *
 * @module @resq-systems/math/ast
 */

import type { Value } from "./value.js";

// ────────────────────────── Operator unions ──────────────────────────

/** Unary prefix/postfix operators. */
export type UnaryOp = "neg" | "sqrt" | "abs" | "floor" | "ceil" | "not" | "card" | "factorial";

/** Binary infix operators. */
export type BinaryOp = "+" | "-" | "×" | "÷" | "mod" | "pow" | "∪" | "∩" | "∖" | "△";

/** Relational operators — return `bool`. */
export type RelOp = "=" | "≠" | "<" | ">" | "≤" | "≥" | "∈" | "∉" | "⊂" | "⊆";

/** Logical connectives — operate on and return `bool`. */
export type LogicOp = "∧" | "∨" | "⊻" | "⇒" | "⇔";

/** Binder operators — introduce a bound variable over a domain. */
export type BinderOp = "∑" | "∏" | "∀" | "∃";

// ────────────────────────── 1. High-level Named AST (Expr) ──────────────────────────

export interface LitExpr {
	readonly kind: "lit";
	readonly value: Value;
}

export interface VarExpr {
	readonly kind: "var";
	readonly name: string;
}

export interface UnaryExpr {
	readonly kind: "unary";
	readonly op: UnaryOp;
	readonly arg: Expr;
}

export interface BinaryExpr {
	readonly kind: "binary";
	readonly op: BinaryOp;
	readonly left: Expr;
	readonly right: Expr;
}

export interface RelExpr {
	readonly kind: "relation";
	readonly op: RelOp;
	readonly left: Expr;
	readonly right: Expr;
}

export interface LogicExpr {
	readonly kind: "logic";
	readonly op: LogicOp;
	readonly left: Expr;
	readonly right: Expr;
}

export interface BinderExpr {
	readonly kind: "binder";
	readonly op: BinderOp;
	readonly bound: string;
	readonly domain: Expr;
	readonly body: Expr;
}

export interface CondExpr {
	readonly kind: "cond";
	readonly test: Expr;
	readonly then: Expr;
	readonly else: Expr;
}

export interface LambdaExpr {
	readonly kind: "lambda";
	readonly param: string;
	readonly body: Expr;
}

export interface CallExpr {
	readonly kind: "call";
	readonly func: Expr;
	readonly arg: Expr;
}

export interface MemberExpr {
	readonly kind: "member";
	readonly obj: Expr;
	readonly property: string;
}

/** Named AST representation layer. */
export type Expr =
	| LitExpr
	| VarExpr
	| UnaryExpr
	| BinaryExpr
	| RelExpr
	| LogicExpr
	| BinderExpr
	| CondExpr
	| LambdaExpr
	| CallExpr
	| MemberExpr;

// ────────────────────────── 2. Compiled Index-based AST (CompiledExpr) ──────────────────────────

export interface CLitExpr {
	readonly kind: "lit";
	readonly value: Value;
}

export interface CFreeVarExpr {
	readonly kind: "free_var";
	readonly name: string;
}

export interface CBoundVarExpr {
	readonly kind: "bound_var";
	readonly index: number; // Stack offset from the top
}

export interface CUnaryExpr {
	readonly kind: "unary";
	readonly op: UnaryOp;
	readonly arg: CompiledExpr;
}

export interface CBinaryExpr {
	readonly kind: "binary";
	readonly op: BinaryOp;
	readonly left: CompiledExpr;
	readonly right: CompiledExpr;
}

export interface CRelExpr {
	readonly kind: "relation";
	readonly op: RelOp;
	readonly left: CompiledExpr;
	readonly right: CompiledExpr;
}

export interface CLogicExpr {
	readonly kind: "logic";
	readonly op: LogicOp;
	readonly left: CompiledExpr;
	readonly right: CompiledExpr;
}

export interface CBinderExpr {
	readonly kind: "binder";
	readonly op: BinderOp;
	readonly domain: CompiledExpr;
	readonly body: CompiledExpr; // bound name is replaced by index lookups in body
}

export interface CCondExpr {
	readonly kind: "cond";
	readonly test: CompiledExpr;
	readonly then: CompiledExpr;
	readonly else: CompiledExpr;
}

export interface CLambdaExpr {
	readonly kind: "lambda";
	readonly body: CompiledExpr; // Compiled body
}

export interface CCallExpr {
	readonly kind: "call";
	readonly func: CompiledExpr;
	readonly arg: CompiledExpr;
}

export interface CMemberExpr {
	readonly kind: "member";
	readonly obj: CompiledExpr;
	readonly property: string;
}

/** Scoped compiled AST layer ready for execution. */
export type CompiledExpr =
	| CLitExpr
	| CFreeVarExpr
	| CBoundVarExpr
	| CUnaryExpr
	| CBinaryExpr
	| CRelExpr
	| CLogicExpr
	| CBinderExpr
	| CCondExpr
	| CLambdaExpr
	| CCallExpr
	| CMemberExpr;
