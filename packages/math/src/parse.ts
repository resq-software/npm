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
 * @fileoverview Pratt (TDOP) parser for mathematical expressions.
 *
 * Two-phase pipeline: tokenizer → recursive descent with operator precedence.
 * Supports arithmetic, set, logic, relational, binder, and conditional
 * expressions with both Unicode and ASCII operator syntax.
 *
 * @module @resq-systems/math/parse
 */

import type { BinaryOp, BinderOp, Expr, LogicOp, RelOp, UnaryOp } from "./ast.js";
import { ParseError, RecursionLimitError } from "./error.js";
import { bool, mkSet, num } from "./value.js";

// ────────────────────────── Tokens ──────────────────────────

type TokenType =
	| "number"
	| "ident"
	| "op"
	| "lparen"
	| "rparen"
	| "lbrace"
	| "rbrace"
	| "comma"
	| "eof";

interface Token {
	readonly type: TokenType;
	readonly value: string;
	readonly pos: number;
}

// ────────────────────────── Tokenizer ──────────────────────────

const SINGLE_OPS = new Set([
	"+",
	"−",
	"×",
	"÷",
	"∪",
	"∩",
	"∖",
	"△",
	"∧",
	"∨",
	"⊻",
	"⇒",
	"⇔",
	"=",
	"≠",
	"<",
	">",
	"≤",
	"≥",
	"∈",
	"∉",
	"⊂",
	"⊆",
	"¬",
	"∑",
	"∏",
	"∀",
	"∃",
	"^",
	"!",
	"#",
	"*",
	"/",
	"-",
	"\\",
	"λ",
	".",
	"∅",
]);

const DOUBLE_OPS: ReadonlyMap<string, string> = new Map([
	["!=", "≠"],
	["<=", "≤"],
	[">=", "≥"],
	["=>", "⇒"],
	["<=>", "⇔"],
	["&&", "∧"],
	["||", "∨"],
	["->", "->"],
]);

const KEYWORDS: ReadonlyMap<string, string> = new Map([
	["and", "∧"],
	["or", "∨"],
	["xor", "⊻"],
	["not", "¬"],
	["union", "∪"],
	["intersect", "∩"],
	["diff", "∖"],
	["symdiff", "△"],
	["in", "∈"],
	["notin", "∉"],
	["subset", "⊂"],
	["subseteq", "⊆"],
	["sum", "∑"],
	["prod", "∏"],
	["forall", "∀"],
	["exists", "∃"],
	["mod", "mod"],
]);

const FUNCTIONS = new Set(["sqrt", "abs", "floor", "ceil"]);

function tokenize(src: string): readonly Token[] {
	const tokens: Token[] = [];
	let i = 0;

	while (i < src.length) {
		const ch = src[i]!;

		// Whitespace
		if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
			i++;
			continue;
		}

		// Numbers
		if (ch >= "0" && ch <= "9") {
			const start = i;
			while (i < src.length && src[i]! >= "0" && src[i]! <= "9") i++;
			if (i + 1 < src.length && src[i] === "." && src[i + 1]! >= "0" && src[i + 1]! <= "9") {
				i++;
				while (i < src.length && src[i]! >= "0" && src[i]! <= "9") i++;
			}
			tokens.push({ type: "number", value: src.slice(start, i), pos: start });
			continue;
		}

		// Identifiers / keywords
		if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")) {
			const start = i;
			while (
				i < src.length &&
				((src[i]! >= "a" && src[i]! <= "z") ||
					(src[i]! >= "A" && src[i]! <= "Z") ||
					(src[i]! >= "0" && src[i]! <= "9") ||
					src[i] === "_")
			) {
				i++;
			}
			const word = src.slice(start, i);

			if (word === "true" || word === "false") {
				tokens.push({ type: "ident", value: word, pos: start });
			} else if (word === "if" || word === "then" || word === "else") {
				tokens.push({ type: "ident", value: word, pos: start });
			} else if (FUNCTIONS.has(word)) {
				tokens.push({ type: "ident", value: word, pos: start });
			} else if (KEYWORDS.has(word)) {
				tokens.push({ type: "op", value: KEYWORDS.get(word)!, pos: start });
			} else {
				tokens.push({ type: "ident", value: word, pos: start });
			}
			continue;
		}

		// Delimiters
		if (ch === "(") {
			tokens.push({ type: "lparen", value: "(", pos: i });
			i++;
			continue;
		}
		if (ch === ")") {
			tokens.push({ type: "rparen", value: ")", pos: i });
			i++;
			continue;
		}
		if (ch === "{") {
			tokens.push({ type: "lbrace", value: "{", pos: i });
			i++;
			continue;
		}
		if (ch === "}") {
			tokens.push({ type: "rbrace", value: "}", pos: i });
			i++;
			continue;
		}
		if (ch === ",") {
			tokens.push({ type: "comma", value: ",", pos: i });
			i++;
			continue;
		}

		// Multi-char ASCII ops (try 3-char, then 2-char)
		if (i + 2 < src.length) {
			const tri = src.slice(i, i + 3);
			if (DOUBLE_OPS.has(tri)) {
				tokens.push({ type: "op", value: DOUBLE_OPS.get(tri)!, pos: i });
				i += 3;
				continue;
			}
		}
		if (i + 1 < src.length) {
			const duo = src.slice(i, i + 2);
			if (DOUBLE_OPS.has(duo)) {
				tokens.push({ type: "op", value: DOUBLE_OPS.get(duo)!, pos: i });
				i += 2;
				continue;
			}
		}

		// Single-char ops
		if (SINGLE_OPS.has(ch)) {
			tokens.push({ type: "op", value: ch, pos: i });
			i++;
			continue;
		}

		throw new ParseError(`Unexpected character: '${ch}'`, i, ch);
	}

	tokens.push({ type: "eof", value: "", pos: src.length });
	return tokens;
}

// ────────────────────────── Precedence tables ──────────────────────────

const INFIX_BP: ReadonlyMap<string, readonly [number, number]> = new Map([
	// [left bp, right bp] — equal for left-assoc, right < left for right-assoc
	["⇔", [1, 2]],
	["⇒", [3, 4]],
	["∨", [5, 6]],
	["⊻", [5, 6]],
	["∧", [7, 8]],
	// Relations — non-associative: same left & right prevents chaining
	["=", [9, 10]],
	["≠", [9, 10]],
	["<", [9, 10]],
	[">", [9, 10]],
	["≤", [9, 10]],
	["≥", [9, 10]],
	["∈", [9, 10]],
	["∉", [9, 10]],
	["⊂", [9, 10]],
	["⊆", [9, 10]],
	// Additive
	["+", [11, 12]],
	["-", [11, 12]],
	["−", [11, 12]],
	["∪", [11, 12]],
	["∩", [11, 12]],
	["∖", [11, 12]],
	["△", [11, 12]],
	// Multiplicative
	["×", [13, 14]],
	["÷", [13, 14]],
	["*", [13, 14]],
	["/", [13, 14]],
	["mod", [13, 14]],
	// Power — right-assoc
	["^", [16, 15]],
]);

const PREFIX_BP = 17; // unary prefix binding power (right bp)
const POSTFIX_BP = 19; // postfix left bp

// ────────────────────────── Operator classification ──────────────────────────

const CANON_BINARY: ReadonlyMap<string, BinaryOp> = new Map([
	["+", "+"],
	["-", "-"],
	["−", "-"],
	["×", "×"],
	["÷", "÷"],
	["*", "×"],
	["/", "÷"],
	["mod", "mod"],
	["^", "pow"],
	["∪", "∪"],
	["∩", "∩"],
	["∖", "∖"],
	["△", "△"],
]);

const CANON_REL: ReadonlyMap<string, RelOp> = new Map([
	["=", "="],
	["≠", "≠"],
	["<", "<"],
	[">", ">"],
	["≤", "≤"],
	["≥", "≥"],
	["∈", "∈"],
	["∉", "∉"],
	["⊂", "⊂"],
	["⊆", "⊆"],
]);

const CANON_LOGIC: ReadonlyMap<string, LogicOp> = new Map([
	["∧", "∧"],
	["∨", "∨"],
	["⊻", "⊻"],
	["⇒", "⇒"],
	["⇔", "⇔"],
]);

const BINDER_MAP: ReadonlyMap<string, BinderOp> = new Map([
	["∑", "∑"],
	["∏", "∏"],
	["∀", "∀"],
	["∃", "∃"],
]);

const FUNC_UNARY: ReadonlyMap<string, UnaryOp> = new Map([
	["sqrt", "sqrt"],
	["abs", "abs"],
	["floor", "floor"],
	["ceil", "ceil"],
]);

// ────────────────────────── Parser ──────────────────────────

/** Parse a math expression string into an {@link Expr} AST. */
export function parse(input: string): Expr {
	const tokens = tokenize(input);
	let pos = 0;
	let depth = 0;
	const MAX_PARSE_DEPTH = 200;

	const peek = (): Token => tokens[pos]!;
	const advance = (): Token => tokens[pos++]!;

	const expect = (type: TokenType, value?: string): Token => {
		const t = peek();
		if (t.type !== type || (value !== undefined && t.value !== value)) {
			const exp = value !== undefined ? `'${value}'` : type;
			throw new ParseError(`Expected ${exp}, got '${t.value}'`, t.pos, t.value);
		}
		return advance();
	};

	const expectOp = (value: string): Token => {
		const t = peek();
		// Accept both op token and ident-keyword that maps to this op
		if (t.type === "op" && t.value === value) return advance();
		// Also accept the keyword form for ∈ → "in"
		if (t.type === "ident" && t.value === "in" && value === "∈") return advance();
		throw new ParseError(`Expected '${value}', got '${t.value}'`, t.pos, t.value);
	};

	const expr = (minBp: number): Expr => {
		depth++;
		if (depth > MAX_PARSE_DEPTH) {
			throw new RecursionLimitError(MAX_PARSE_DEPTH);
		}
		try {
			let left = nud();

			for (;;) {
				const t = peek();

				// Postfix: factorial
				if (t.type === "op" && t.value === "!" && POSTFIX_BP >= minBp) {
					advance();
					left = { kind: "unary", op: "factorial", arg: left };
					continue;
				}

				// Infix call application: f(arg)
				if (t.type === "lparen" && 18 >= minBp) {
					advance(); // consume "("
					const arg = expr(0);
					expect("rparen");
					left = { kind: "call", func: left, arg };
					continue;
				}

				// Infix member access: obj.property
				if (t.type === "op" && t.value === "." && 20 >= minBp) {
					advance(); // consume "."
					const propTok = expect("ident");
					left = { kind: "member", obj: left, property: propTok.value };
					continue;
				}

				// Infix
				if (t.type === "op") {
					const bp = INFIX_BP.get(t.value);
					if (bp === undefined || bp[0] < minBp) break;
					advance();
					const right = expr(bp[1]);
					left = makeInfix(t.value, left, right);
					continue;
				}

				break;
			}

			return left;
		} finally {
			depth--;
		}
	};

	const nud = (): Expr => {
		const t = advance();

		// Number literal
		if (t.type === "number") {
			return { kind: "lit", value: num(Number(t.value)) };
		}

		// Parenthesized expression
		if (t.type === "lparen") {
			const inner = expr(0);
			expect("rparen");
			return inner;
		}

		// Set literal: { ... }
		if (t.type === "lbrace") {
			const elements: number[] = [];
			if (peek().type !== "rbrace") {
				elements.push(Number(expect("number").value));
				while (peek().type === "comma") {
					advance();
					elements.push(Number(expect("number").value));
				}
			}
			expect("rbrace");
			return { kind: "lit", value: mkSet(elements) };
		}

		// Unary prefix operators / operators as literals
		if (t.type === "op") {
			if (t.value === "∅") {
				return { kind: "lit", value: mkSet([]) };
			}
			if (t.value === "\\" || t.value === "λ") {
				const paramTok = expect("ident");
				const param = paramTok.value;
				const next = peek();
				if (next.type === "op" && (next.value === "->" || next.value === ".")) {
					advance();
				} else {
					throw new ParseError("Expected '->' or '.' after lambda parameter", next.pos, next.value);
				}
				const body = expr(0);
				return { kind: "lambda", param, body };
			}
			if (t.value === "-" || t.value === "−") {
				return { kind: "unary", op: "neg", arg: expr(PREFIX_BP) };
			}
			if (t.value === "¬") {
				return { kind: "unary", op: "not", arg: expr(PREFIX_BP) };
			}
			if (t.value === "#") {
				return { kind: "unary", op: "card", arg: expr(PREFIX_BP) };
			}

			// Binder ops as prefix
			const binderOp = BINDER_MAP.get(t.value);
			if (binderOp !== undefined) {
				return parseBinder(binderOp, t.pos);
			}

			throw new ParseError(`Unexpected operator in prefix position: '${t.value}'`, t.pos, t.value);
		}

		// Identifiers: keywords, functions, booleans, variables
		if (t.type === "ident") {
			if (t.value === "true") return { kind: "lit", value: bool(true) };
			if (t.value === "false") return { kind: "lit", value: bool(false) };

			// Prefix functions: sqrt, abs, floor, ceil
			const funcOp = FUNC_UNARY.get(t.value);
			if (funcOp !== undefined) {
				expect("lparen");
				const arg = expr(0);
				expect("rparen");
				return { kind: "unary", op: funcOp, arg };
			}

			// Conditional: if test then consequent else alternate
			if (t.value === "if") {
				const test = expr(0);
				expect("ident", "then");
				const then = expr(0);
				expect("ident", "else");
				const els = expr(0);
				return { kind: "cond", test, then, else: els };
			}

			// Plain variable
			return { kind: "var", name: t.value };
		}

		throw new ParseError(`Unexpected token: '${t.value}'`, t.pos, t.value);
	};

	const parseBinder = (op: BinderOp, _startPos: number): Expr => {
		expect("lparen");
		const boundTok = expect("ident");
		const bound = boundTok.value;
		expectOp("∈");
		const domain = expr(0);
		if (peek().type === "comma") {
			advance(); // consume comma
			const body = expr(0);
			expect("rparen");
			return { kind: "binder", op, bound, domain, body };
		} else {
			expect("rparen");
			const body = expr(0);
			return { kind: "binder", op, bound, domain, body };
		}
	};

	const makeInfix = (opStr: string, left: Expr, right: Expr): Expr => {
		const binOp = CANON_BINARY.get(opStr);
		if (binOp !== undefined) return { kind: "binary", op: binOp, left, right };

		const relOp = CANON_REL.get(opStr);
		if (relOp !== undefined) return { kind: "relation", op: relOp, left, right };

		const logOp = CANON_LOGIC.get(opStr);
		if (logOp !== undefined) return { kind: "logic", op: logOp, left, right };

		throw new ParseError(`Unknown infix operator: '${opStr}'`, 0, opStr);
	};

	const result = expr(0);
	if (peek().type !== "eof") {
		const t = peek();
		throw new ParseError(`Unexpected token after expression: '${t.value}'`, t.pos, t.value);
	}
	return result;
}
