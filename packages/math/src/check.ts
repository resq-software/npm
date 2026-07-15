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
 * @fileoverview Static sort (type) checker for math AST expressions.
 *
 * Walks the expression tree and infers the {@link Sort} of every sub-expression
 * without evaluating it. Sort mismatches and unbound variables are collected
 * into an array of {@link SortError} instances so the consumer receives
 * _complete_ diagnostics rather than stopping at the first error.
 *
 * @module @resq-systems/math/check
 */

import type { BinaryOp, BinderOp, Expr, RelOp, UnaryOp } from "./ast.js";
import { SortError } from "./error.js";
import type { Sort } from "./value.js";

// ────────────────────────── Public types ──────────────────────────

/** Maps variable names to their known sort in the current scope. */
export type SortContext = ReadonlyMap<string, Sort>;

/**
 * The result of sort-checking an expression.
 *
 * On success, carries the inferred sort. On failure, carries every
 * {@link SortError} discovered during the walk.
 */
export type CheckResult =
	| { readonly ok: true; readonly sort: Sort }
	| { readonly ok: false; readonly errors: readonly SortError[] };

// ────────────────────────── Operator → sort tables ──────────────────────────

/**
 * Unary operators that accept `num` and produce `num`.
 * `not` (bool→bool) and `card` (set→num) are handled separately.
 */
const UNARY_NUM_TO_NUM: ReadonlySet<UnaryOp> = new Set<UnaryOp>([
	"neg",
	"sqrt",
	"abs",
	"floor",
	"ceil",
	"factorial",
]);

/** Binary operators valid on `num × num → num`. */
const BIN_NUM: ReadonlySet<BinaryOp> = new Set<BinaryOp>(["+", "-", "×", "÷", "mod", "pow"]);

/** Binary operators valid on `set × set → set`. */
const BIN_SET: ReadonlySet<BinaryOp> = new Set<BinaryOp>(["+", "∪", "∩", "∖", "△"]);

/** Relational operators that accept `num × num`. */
const REL_NUM_NUM: ReadonlySet<RelOp> = new Set<RelOp>(["=", "≠", "<", ">", "≤", "≥"]);

/** Relational operators that accept `set × set`. */
const REL_SET_SET: ReadonlySet<RelOp> = new Set<RelOp>(["=", "≠", "⊂", "⊆"]);

/** Relational operators that accept `bool × bool`. */
const REL_BOOL_BOOL: ReadonlySet<RelOp> = new Set<RelOp>(["=", "≠"]);

/** Relational operators that accept `num × set` (membership). */
const REL_NUM_SET: ReadonlySet<RelOp> = new Set<RelOp>(["∈", "∉"]);

/** Binder operators whose body must be `num` and whose result is `num`. */
const BINDER_NUM: ReadonlySet<BinderOp> = new Set<BinderOp>(["∑", "∏"]);

/** Binder operators whose body must be `bool` and whose result is `bool`. */
const BINDER_BOOL: ReadonlySet<BinderOp> = new Set<BinderOp>(["∀", "∃"]);

// ────────────────────────── Helpers ──────────────────────────

const OK = (sort: Sort): CheckResult => ({ ok: true, sort });
const FAIL = (errors: readonly SortError[]): CheckResult => ({ ok: false, errors });

/** Convenience: create a single-error failure. */
const fail1 = (expected: string, actual: string, context?: string): CheckResult =>
	FAIL([new SortError(expected, actual, context)]);

// ────────────────────────── Core checker ──────────────────────────

/**
 * Infer the sort of `expr` under the given variable context, collecting
 * **all** sort errors encountered during the recursive walk.
 *
 * @param expr - The expression AST node to check.
 * @param ctx  - An optional mapping from variable names to their sorts.
 *               Defaults to an empty context.
 * @returns A {@link CheckResult} — either the inferred sort or an array of
 *          every {@link SortError} discovered.
 */
export const checkExpr = (expr: Expr, ctx: SortContext = new Map()): CheckResult => {
	switch (expr.kind) {
		// ── Literal ──────────────────────────────────────────
		case "lit":
			return OK(expr.value.sort);

		// ── Variable ─────────────────────────────────────────
		case "var": {
			const sort = ctx.get(expr.name);
			if (sort === undefined) {
				return FAIL([new SortError("bound variable", "unbound", expr.name)]);
			}
			return OK(sort);
		}

		// ── Unary ────────────────────────────────────────────
		case "unary": {
			const argResult = checkExpr(expr.arg, ctx);
			if (!argResult.ok) return argResult;

			const { op } = expr;
			const argSort = argResult.sort;

			if (UNARY_NUM_TO_NUM.has(op)) {
				return argSort === "num" ? OK("num") : fail1("num", argSort, op);
			}
			if (op === "not") {
				return argSort === "bool" ? OK("bool") : fail1("bool", argSort, "not");
			}
			// op === "card"
			return argSort === "set" ? OK("num") : fail1("set", argSort, "card");
		}

		// ── Binary ───────────────────────────────────────────
		case "binary": {
			const leftResult = checkExpr(expr.left, ctx);
			const rightResult = checkExpr(expr.right, ctx);

			if (!leftResult.ok || !rightResult.ok) {
				const errors: SortError[] = [];
				if (!leftResult.ok) errors.push(...leftResult.errors);
				if (!rightResult.ok) errors.push(...rightResult.errors);
				return FAIL(errors);
			}

			const ls = leftResult.sort;
			const rs = rightResult.sort;
			const { op } = expr;

			if (ls === "num" && rs === "num" && BIN_NUM.has(op)) return OK("num");
			if (ls === "set" && rs === "set" && BIN_SET.has(op)) return OK("set");

			return fail1("compatible sorts", `${ls} × ${rs}`, op);
		}

		// ── Relation ─────────────────────────────────────────
		case "relation": {
			const leftResult = checkExpr(expr.left, ctx);
			const rightResult = checkExpr(expr.right, ctx);

			if (!leftResult.ok || !rightResult.ok) {
				const errors: SortError[] = [];
				if (!leftResult.ok) errors.push(...leftResult.errors);
				if (!rightResult.ok) errors.push(...rightResult.errors);
				return FAIL(errors);
			}

			const ls = leftResult.sort;
			const rs = rightResult.sort;
			const { op } = expr;

			if (ls === "num" && rs === "num" && REL_NUM_NUM.has(op)) return OK("bool");
			if (ls === "set" && rs === "set" && REL_SET_SET.has(op)) return OK("bool");
			if (ls === "bool" && rs === "bool" && REL_BOOL_BOOL.has(op)) return OK("bool");
			if (ls === "num" && rs === "set" && REL_NUM_SET.has(op)) return OK("bool");

			return fail1("compatible sorts", `${ls} × ${rs}`, op);
		}

		// ── Logic ────────────────────────────────────────────
		case "logic": {
			const leftResult = checkExpr(expr.left, ctx);
			const rightResult = checkExpr(expr.right, ctx);

			if (!leftResult.ok || !rightResult.ok) {
				const errors: SortError[] = [];
				if (!leftResult.ok) errors.push(...leftResult.errors);
				if (!rightResult.ok) errors.push(...rightResult.errors);
				return FAIL(errors);
			}

			const errors: SortError[] = [];
			if (leftResult.sort !== "bool") {
				errors.push(new SortError("bool", leftResult.sort, `${expr.op} (left)`));
			}
			if (rightResult.sort !== "bool") {
				errors.push(new SortError("bool", rightResult.sort, `${expr.op} (right)`));
			}
			return errors.length > 0 ? FAIL(errors) : OK("bool");
		}

		// ── Binder ───────────────────────────────────────────
		case "binder": {
			const domainResult = checkExpr(expr.domain, ctx);
			const errors: SortError[] = [];

			if (!domainResult.ok) {
				errors.push(...domainResult.errors);
			} else if (domainResult.sort !== "set") {
				errors.push(new SortError("set", domainResult.sort, `${expr.op} domain`));
			}

			// Extend context: bound variable has sort `num`.
			const innerCtx = new Map(ctx);
			innerCtx.set(expr.bound, "num");

			const bodyResult = checkExpr(expr.body, innerCtx);
			if (!bodyResult.ok) {
				errors.push(...bodyResult.errors);
			} else if (BINDER_NUM.has(expr.op) && bodyResult.sort !== "num") {
				errors.push(new SortError("num", bodyResult.sort, `${expr.op} body`));
			} else if (BINDER_BOOL.has(expr.op) && bodyResult.sort !== "bool") {
				errors.push(new SortError("bool", bodyResult.sort, `${expr.op} body`));
			}

			if (errors.length > 0) return FAIL(errors);

			return BINDER_NUM.has(expr.op) ? OK("num") : OK("bool");
		}

		// ── Conditional ──────────────────────────────────────
		case "cond": {
			const testResult = checkExpr(expr.test, ctx);
			const thenResult = checkExpr(expr.then, ctx);
			const elseResult = checkExpr(expr.else, ctx);

			// Propagate child errors first.
			if (!testResult.ok || !thenResult.ok || !elseResult.ok) {
				const errors: SortError[] = [];
				if (!testResult.ok) errors.push(...testResult.errors);
				if (!thenResult.ok) errors.push(...thenResult.errors);
				if (!elseResult.ok) errors.push(...elseResult.errors);
				return FAIL(errors);
			}

			// All children are ok — validate structural constraints.
			const errors: SortError[] = [];

			if (testResult.sort !== "bool") {
				errors.push(new SortError("bool", testResult.sort, "cond test"));
			}
			if (thenResult.sort !== elseResult.sort) {
				errors.push(
					new SortError(thenResult.sort, elseResult.sort, "cond branches must have same sort"),
				);
			}

			return errors.length > 0 ? FAIL(errors) : OK(thenResult.sort);
		}

		// ── Lambda ───────────────────────────────────────────
		case "lambda": {
			const innerCtx = new Map(ctx);
			const paramSort = ctx.get(expr.param) ?? "num";
			innerCtx.set(expr.param, paramSort);
			const bodyResult = checkExpr(expr.body, innerCtx);
			if (!bodyResult.ok) return bodyResult;
			return OK("func");
		}

		// ── Call ─────────────────────────────────────────────
		case "call": {
			const funcResult = checkExpr(expr.func, ctx);
			const argResult = checkExpr(expr.arg, ctx);

			if (!funcResult.ok || !argResult.ok) {
				const errors: SortError[] = [];
				if (!funcResult.ok) errors.push(...funcResult.errors);
				if (!argResult.ok) errors.push(...argResult.errors);
				return FAIL(errors);
			}

			if (funcResult.sort !== "func") {
				return fail1("func", funcResult.sort, "function call");
			}

			if (expr.func.kind === "lambda") {
				const innerCtx = new Map(ctx);
				innerCtx.set(expr.func.param, argResult.sort);
				return checkExpr(expr.func.body, innerCtx);
			}

			// Look up call path in context (e.g. "getItem()")
			const path = getMemberPath(expr);
			if (path) {
				const mappedSort = ctx.get(path);
				if (mappedSort) return OK(mappedSort);
				return fail1("declared function return sort", "untyped", path);
			}

			return OK("num");
		}

		case "member": {
			const objRes = checkExpr(expr.obj, ctx);
			if (!objRes.ok) return objRes;
			if (objRes.sort !== "record") {
				return fail1("record", objRes.sort, `accessing property '${expr.property}'`);
			}

			// Resolve sort statically from literal record values
			if (expr.obj.kind === "lit" && expr.obj.value.sort === "record") {
				const propVal = expr.obj.value.value[expr.property];
				if (propVal === undefined) {
					return fail1(
						"existing property",
						"undefined",
						`property '${expr.property}' on literal record`,
					);
				}
				return OK(propVal.sort);
			}

			const path = getMemberPath(expr);
			if (path) {
				const mappedSort = ctx.get(path);
				if (mappedSort) return OK(mappedSort);
				return fail1("declared property sort", "untyped", path);
			}

			return fail1("declared property sort", "untyped", expr.property);
		}
	}
};

/** Helper to extract a dotted property path or call path for static type resolution. */
const getMemberPath = (expr: Expr): string | null => {
	if (expr.kind === "var") return expr.name;
	if (expr.kind === "call") {
		const sub = getMemberPath(expr.func);
		return sub ? `${sub}()` : null;
	}
	if (expr.kind === "member") {
		const sub = getMemberPath(expr.obj);
		return sub ? `${sub}.${expr.property}` : null;
	}
	return null;
};
