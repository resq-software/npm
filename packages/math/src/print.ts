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
 * @fileoverview Pretty-printer for math expression ASTs.
 *
 * Renders an {@link Expr} tree back to human-readable infix notation with
 * minimal parentheses (driven by a precedence table). Two output modes are
 * supported: Unicode (default) for display, and ASCII for environments that
 * cannot render extended characters.
 *
 * @module @resq-systems/math/print
 */

import type { BinaryOp, BinderOp, Expr, LogicOp, RelOp, UnaryOp } from "./ast.js";

// ────────────────────────── Options ──────────────────────────

/** Configuration for the expression pretty-printer. */
export interface PrintOptions {
	/** Use ASCII-only symbols instead of Unicode. Default: false. */
	readonly ascii?: boolean;
}

// ────────────────────────── Precedence table ──────────────────────────

/** Precedence levels — higher binds tighter. */
const PREC_IFF = 1;
const PREC_IMPLIES = 2;
const PREC_OR = 3;
const PREC_AND = 4;
const PREC_REL = 5;
const PREC_ADD = 6;
const PREC_MUL = 7;
const PREC_POW = 8;
const PREC_UNARY = 9;
const PREC_ATOM = 10;

const binaryPrec: Readonly<Record<BinaryOp, number>> = {
	"+": PREC_ADD,
	"-": PREC_ADD,
	"×": PREC_MUL,
	"÷": PREC_MUL,
	mod: PREC_MUL,
	pow: PREC_POW,
	"∪": PREC_ADD,
	"∩": PREC_ADD,
	"∖": PREC_ADD,
	"△": PREC_ADD,
};

const relPrec: Readonly<Record<RelOp, number>> = {
	"=": PREC_REL,
	"≠": PREC_REL,
	"<": PREC_REL,
	">": PREC_REL,
	"≤": PREC_REL,
	"≥": PREC_REL,
	"∈": PREC_REL,
	"∉": PREC_REL,
	"⊂": PREC_REL,
	"⊆": PREC_REL,
};

const logicPrec: Readonly<Record<LogicOp, number>> = {
	"⇔": PREC_IFF,
	"⇒": PREC_IMPLIES,
	"∨": PREC_OR,
	"⊻": PREC_OR,
	"∧": PREC_AND,
};

// ────────────────────────── Symbol tables ──────────────────────────

const binaryUnicode: Readonly<Record<BinaryOp, string>> = {
	"+": "+",
	"-": "−",
	"×": "×",
	"÷": "÷",
	mod: "mod",
	pow: "^",
	"∪": "∪",
	"∩": "∩",
	"∖": "∖",
	"△": "△",
};

const binaryAscii: Readonly<Record<BinaryOp, string>> = {
	"+": "+",
	"-": "-",
	"×": "*",
	"÷": "/",
	mod: "mod",
	pow: "^",
	"∪": "union",
	"∩": "intersect",
	"∖": "diff",
	"△": "symdiff",
};

const relUnicode: Readonly<Record<RelOp, string>> = {
	"=": "=",
	"≠": "≠",
	"<": "<",
	">": ">",
	"≤": "≤",
	"≥": "≥",
	"∈": "∈",
	"∉": "∉",
	"⊂": "⊂",
	"⊆": "⊆",
};

const relAscii: Readonly<Record<RelOp, string>> = {
	"=": "=",
	"≠": "!=",
	"<": "<",
	">": ">",
	"≤": "<=",
	"≥": ">=",
	"∈": "in",
	"∉": "not-in",
	"⊂": "subset",
	"⊆": "subseteq",
};

const logicUnicode: Readonly<Record<LogicOp, string>> = {
	"∧": "∧",
	"∨": "∨",
	"⊻": "⊻",
	"⇒": "⇒",
	"⇔": "⇔",
};

const logicAscii: Readonly<Record<LogicOp, string>> = {
	"∧": "and",
	"∨": "or",
	"⊻": "xor",
	"⇒": "=>",
	"⇔": "<=>",
};

const binderUnicode: Readonly<Record<BinderOp, string>> = {
	"∑": "∑",
	"∏": "∏",
	"∀": "∀",
	"∃": "∃",
};

const binderAscii: Readonly<Record<BinderOp, string>> = {
	"∑": "sum",
	"∏": "prod",
	"∀": "forall",
	"∃": "exists",
};

// ────────────────────────── Helpers ──────────────────────────

/** Return the precedence level for any expression node. */
const exprPrec = (expr: Expr): number => {
	switch (expr.kind) {
		case "lit":
		case "var":
			return PREC_ATOM;
		case "unary":
			return PREC_UNARY;
		case "binary":
			return binaryPrec[expr.op];
		case "relation":
			return relPrec[expr.op];
		case "logic":
			return logicPrec[expr.op];
		case "binder":
		case "cond":
		case "lambda":
		case "call":
		case "member":
			return PREC_ATOM;
	}
};

/**
 * Wrap `inner` in parentheses when its precedence is lower (looser) than
 * `outerPrec`. Caller passes the already-printed string to avoid recomputation.
 */
const wrapIf = (inner: string, needsWrap: boolean): string => (needsWrap ? `(${inner})` : inner);

// ────────────────────────── Core printer ──────────────────────────

/**
 * Render an expression AST to readable mathematical notation.
 *
 * @param expr - The expression tree to print.
 * @param options - Optional formatting configuration.
 * @returns A string representation with minimal parentheses.
 */
export const print = (expr: Expr, options?: PrintOptions): string => {
	const ascii = options?.ascii === true;

	const go = (node: Expr): string => {
		switch (node.kind) {
			case "lit":
				return printLit(node, ascii);
			case "var":
				return node.name;
			case "unary":
				return printUnary(node.op, node.arg, ascii, go);
			case "binary":
				return printBinary(node.op, node.left, node.right, ascii, go);
			case "relation":
				return printRel(node.op, node.left, node.right, ascii, go);
			case "logic":
				return printLogic(node.op, node.left, node.right, ascii, go);
			case "binder":
				return printBinder(node.op, node.bound, node.domain, node.body, ascii, go);
			case "cond":
				return printCond(node.test, node.then, node.else, go);
			case "lambda":
				return printLambda(node.param, node.body, ascii, go);
			case "call":
				return printCall(node.func, node.arg, go);
			case "member":
				return printMember(node.obj, node.property, go);
		}
	};

	return go(expr);
};

// ────────────────────────── Node printers ──────────────────────────

/** Render a literal value. */
const printLit = (
	node: { readonly kind: "lit"; readonly value: import("./value.js").Value },
	ascii: boolean,
): string => {
	const v = node.value;
	switch (v.sort) {
		case "num":
			return Object.is(v.value, -0) ? "-0" : String(v.value);
		case "bool":
			return String(v.value);
		case "set": {
			if (v.value.size === 0) return ascii ? "{}" : "∅";
			return `{${[...v.value].join(", ")}}`;
		}
		case "func":
			return "<function>";
		case "record": {
			const entries = Object.entries(v.value).map(
				([k, val]) => `${k}: ${print({ kind: "lit", value: val }, { ascii })}`,
			);
			return `{${entries.join(", ")}}`;
		}
	}
};

/** Render a unary expression with correct wrapping. */
const printUnary = (op: UnaryOp, arg: Expr, ascii: boolean, go: (e: Expr) => string): string => {
	const inner = go(arg);
	switch (op) {
		case "neg": {
			const needsWrap = exprPrec(arg) < PREC_UNARY;
			return `${ascii ? "-" : "−"}${wrapIf(inner, needsWrap)}`;
		}
		case "not": {
			const needsWrap = exprPrec(arg) < PREC_UNARY;
			return `${ascii ? "not " : "¬"}${wrapIf(inner, needsWrap)}`;
		}
		case "sqrt":
			return ascii ? `sqrt(${inner})` : `√(${inner})`;
		case "abs":
			return `|${inner}|`;
		case "floor":
			return ascii ? `floor(${inner})` : `⌊${inner}⌋`;
		case "ceil":
			return ascii ? `ceil(${inner})` : `⌈${inner}⌉`;
		case "card":
			return `#${wrapIf(inner, exprPrec(arg) < PREC_UNARY)}`;
		case "factorial": {
			const needsWrap = exprPrec(arg) < PREC_UNARY;
			return `${wrapIf(inner, needsWrap)}!`;
		}
	}
};

/**
 * Render a binary infix expression with minimal parens.
 *
 * `pow` is right-associative, so we wrap the left child when its precedence
 * equals `pow`'s precedence, but *not* the right child in that case.
 */
const printBinary = (
	op: BinaryOp,
	left: Expr,
	right: Expr,
	ascii: boolean,
	go: (e: Expr) => string,
): string => {
	const prec = binaryPrec[op];
	const sym = ascii ? binaryAscii[op] : binaryUnicode[op];

	const leftPrec = exprPrec(left);
	const rightPrec = exprPrec(right);

	const wrapLeft =
		op === "pow"
			? leftPrec <= prec // right-assoc: wrap left on equal prec
			: leftPrec < prec;
	const wrapRight =
		op === "pow"
			? rightPrec < prec // right-assoc: don't wrap right on equal prec
			: rightPrec < prec;

	return `${wrapIf(go(left), wrapLeft)} ${sym} ${wrapIf(go(right), wrapRight)}`;
};

/** Render a relational expression. */
const printRel = (
	op: RelOp,
	left: Expr,
	right: Expr,
	ascii: boolean,
	go: (e: Expr) => string,
): string => {
	const prec = relPrec[op];
	const sym = ascii ? relAscii[op] : relUnicode[op];
	const l = wrapIf(go(left), exprPrec(left) < prec);
	const r = wrapIf(go(right), exprPrec(right) < prec);
	return `${l} ${sym} ${r}`;
};

/** Render a logic expression. */
const printLogic = (
	op: LogicOp,
	left: Expr,
	right: Expr,
	ascii: boolean,
	go: (e: Expr) => string,
): string => {
	const prec = logicPrec[op];
	const sym = ascii ? logicAscii[op] : logicUnicode[op];
	const l = wrapIf(go(left), exprPrec(left) < prec);
	const r = wrapIf(go(right), exprPrec(right) < prec);
	return `${l} ${sym} ${r}`;
};

/** Render a binder expression: ∑(i ∈ domain) body. */
const printBinder = (
	op: BinderOp,
	bound: string,
	domain: Expr,
	body: Expr,
	ascii: boolean,
	go: (e: Expr) => string,
): string => {
	const sym = ascii ? binderAscii[op] : binderUnicode[op];
	const inSym = ascii ? "in" : "∈";
	return `${sym}(${bound} ${inSym} ${go(domain)}) ${go(body)}`;
};

/** Render a conditional expression: if test then a else b. */
const printCond = (test: Expr, then_: Expr, else_: Expr, go: (e: Expr) => string): string =>
	`if ${go(test)} then ${go(then_)} else ${go(else_)}`;

/** Render a lambda function: λparam. body */
const printLambda = (
	param: string,
	body: Expr,
	ascii: boolean,
	go: (e: Expr) => string,
): string => {
	const sym = ascii ? "\\" : "λ";
	const arr = ascii ? " -> " : ". ";
	return `${sym}${param}${arr}${go(body)}`;
};

/** Render a call application: func(arg) */
const printCall = (func: Expr, arg: Expr, go: (e: Expr) => string): string => {
	const f = go(func);
	const a = go(arg);
	return `${f}(${a})`;
};

/** Render a member property access: obj.property */
const printMember = (obj: Expr, property: string, go: (e: Expr) => string): string => {
	const inner = go(obj);
	const needsWrap = exprPrec(obj) < PREC_ATOM;
	return `${wrapIf(inner, needsWrap)}.${property}`;
};
