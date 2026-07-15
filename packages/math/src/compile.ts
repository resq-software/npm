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
 * @fileoverview Compiler pass for scope resolution and De Bruijn index translation.
 *
 * Compiles a named AST `Expr` into an index-based `CompiledExpr`. Resolves
 * lexically scoped variables (introduced by binders and lambdas) into stack
 * offset indices. Variables defined outside lexical scopes remain `free_var`
 * nodes and are resolved from the environment map at evaluation.
 *
 * @module @resq-systems/math/compile
 */

import type { CompiledExpr, Expr } from "./ast.js";
import { RecursionLimitError } from "./error.js";

/**
 * Compile a named mathematical expression AST into an index-based executable AST.
 *
 * @param expr - The named AST node to compile.
 * @param scope - The stack of active lexical variable names (innermost binder at the end).
 * @returns The compiled expression node.
 */
export function compile(expr: Expr, scope: readonly string[] = []): CompiledExpr {
	return compileInternal(expr, scope, 0);
}

function compileInternal(expr: Expr, scope: readonly string[], depth: number): CompiledExpr {
	const MAX_DEPTH = 200;
	if (depth > MAX_DEPTH) {
		throw new RecursionLimitError(MAX_DEPTH);
	}

	switch (expr.kind) {
		case "lit":
			return { kind: "lit", value: expr.value };

		case "var": {
			const idx = scope.lastIndexOf(expr.name);
			if (idx !== -1) {
				// Stack offset: index 0 is the innermost (end of the array)
				return { kind: "bound_var", index: scope.length - 1 - idx };
			}
			return { kind: "free_var", name: expr.name };
		}

		case "unary":
			return {
				kind: "unary",
				op: expr.op,
				arg: compileInternal(expr.arg, scope, depth + 1),
			};

		case "binary":
			return {
				kind: "binary",
				op: expr.op,
				left: compileInternal(expr.left, scope, depth + 1),
				right: compileInternal(expr.right, scope, depth + 1),
			};

		case "relation":
			return {
				kind: "relation",
				op: expr.op,
				left: compileInternal(expr.left, scope, depth + 1),
				right: compileInternal(expr.right, scope, depth + 1),
			};

		case "logic":
			return {
				kind: "logic",
				op: expr.op,
				left: compileInternal(expr.left, scope, depth + 1),
				right: compileInternal(expr.right, scope, depth + 1),
			};

		case "binder":
			return {
				kind: "binder",
				op: expr.op,
				domain: compileInternal(expr.domain, scope, depth + 1),
				body: compileInternal(expr.body, [...scope, expr.bound], depth + 1),
			};

		case "cond":
			return {
				kind: "cond",
				test: compileInternal(expr.test, scope, depth + 1),
				// biome-ignore lint/suspicious/noThenProperty: standard AST property for conditionals
				then: compileInternal(expr.then, scope, depth + 1),
				else: compileInternal(expr.else, scope, depth + 1),
			};

		case "lambda":
			return {
				kind: "lambda",
				body: compileInternal(expr.body, [...scope, expr.param], depth + 1),
			};

		case "call":
			return {
				kind: "call",
				func: compileInternal(expr.func, scope, depth + 1),
				arg: compileInternal(expr.arg, scope, depth + 1),
			};

		case "member":
			return {
				kind: "member",
				obj: compileInternal(expr.obj, scope, depth + 1),
				property: expr.property,
			};
	}
}
