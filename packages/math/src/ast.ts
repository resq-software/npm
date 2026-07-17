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

//#region Operator Types

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

//#endregion

//#region Named AST

/** Literal value node (number, set, bool, function, or record). */
export interface LitExpr {
	readonly kind: "lit";
	readonly value: Value;
}

/** Named variable reference, resolved against a scope or environment. */
export interface VarExpr {
	readonly kind: "var";
	readonly name: string;
}

/** Unary operator applied to a single operand. */
export interface UnaryExpr {
	readonly kind: "unary";
	readonly op: UnaryOp;
	readonly arg: Expr;
}

/** Binary (arithmetic or set) operator over two operands. */
export interface BinaryExpr {
	readonly kind: "binary";
	readonly op: BinaryOp;
	readonly left: Expr;
	readonly right: Expr;
}

/** Relational comparison yielding a `bool`. */
export interface RelExpr {
	readonly kind: "relation";
	readonly op: RelOp;
	readonly left: Expr;
	readonly right: Expr;
}

/** Logical connective over two `bool` operands. */
export interface LogicExpr {
	readonly kind: "logic";
	readonly op: LogicOp;
	readonly left: Expr;
	readonly right: Expr;
}

/** Binder (sum, product, or quantifier) that binds `bound` over `domain`. */
export interface BinderExpr {
	readonly kind: "binder";
	readonly op: BinderOp;
	readonly bound: string;
	readonly domain: Expr;
	readonly body: Expr;
}

/** If–then–else conditional; both branches must share a sort. */
export interface CondExpr {
	readonly kind: "cond";
	readonly test: Expr;
	readonly then: Expr;
	readonly else: Expr;
}

/** Lambda abstraction binding a single named parameter. */
export interface LambdaExpr {
	readonly kind: "lambda";
	readonly param: string;
	readonly body: Expr;
}

/** Function application of `func` to a single `arg`. */
export interface CallExpr {
	readonly kind: "call";
	readonly func: Expr;
	readonly arg: Expr;
}

/** Record property access (`obj.property`). */
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

//#endregion

//#region Compiled AST

/** Compiled literal node — unchanged from its {@link LitExpr} source. */
export interface CLitExpr {
	readonly kind: "lit";
	readonly value: Value;
}

/** Free variable resolved from the evaluation environment by name. */
export interface CFreeVarExpr {
	readonly kind: "free_var";
	readonly name: string;
}

/** Bound variable addressed by its De Bruijn index into the value stack. */
export interface CBoundVarExpr {
	readonly kind: "bound_var";
	/** Stack offset from the top; index 0 is the innermost binding. */
	readonly index: number;
}

/** Compiled unary operator application. */
export interface CUnaryExpr {
	readonly kind: "unary";
	readonly op: UnaryOp;
	readonly arg: CompiledExpr;
}

/** Compiled binary operator application. */
export interface CBinaryExpr {
	readonly kind: "binary";
	readonly op: BinaryOp;
	readonly left: CompiledExpr;
	readonly right: CompiledExpr;
}

/** Compiled relational comparison. */
export interface CRelExpr {
	readonly kind: "relation";
	readonly op: RelOp;
	readonly left: CompiledExpr;
	readonly right: CompiledExpr;
}

/** Compiled logical connective. */
export interface CLogicExpr {
	readonly kind: "logic";
	readonly op: LogicOp;
	readonly left: CompiledExpr;
	readonly right: CompiledExpr;
}

/** Compiled binder; the bound name is erased in favor of stack indices. */
export interface CBinderExpr {
	readonly kind: "binder";
	readonly op: BinderOp;
	readonly domain: CompiledExpr;
	/** Body where the bound name is replaced by index lookups. */
	readonly body: CompiledExpr;
}

/** Compiled conditional. */
export interface CCondExpr {
	readonly kind: "cond";
	readonly test: CompiledExpr;
	readonly then: CompiledExpr;
	readonly else: CompiledExpr;
}

/** Compiled lambda; the parameter name is erased in favor of a stack slot. */
export interface CLambdaExpr {
	readonly kind: "lambda";
	/** Compiled body evaluated with the argument pushed onto the stack. */
	readonly body: CompiledExpr;
}

/** Compiled function application. */
export interface CCallExpr {
	readonly kind: "call";
	readonly func: CompiledExpr;
	readonly arg: CompiledExpr;
}

/** Compiled record property access. */
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

//#endregion
