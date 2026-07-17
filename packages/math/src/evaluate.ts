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
 * @fileoverview Stack-based evaluator for compiled math expressions.
 *
 * Resolves bound variables in O(1) time using De Bruijn indices into a lexically
 * scoped stack of values. Supports closures (lambdas) and function application.
 *
 * @module @resq-systems/math/evaluate
 */

import { assertNever } from "./_assert.js";
import type { CompiledExpr } from "./ast.js";
import {
	DomainError,
	ExecutionLimitError,
	RecursionLimitError,
	SortError,
	StackError,
	UnboundVariableError,
	UndefinedOpError,
} from "./error.js";
import {
	encodeBinary,
	encodeLogic,
	encodeRel,
	encodeUnary,
	lookupBinary,
	lookupLogic,
	lookupRel,
	lookupUnary,
} from "./instance.js";
import type { Value } from "./value.js";
import { asBool, asFunc, asNum, asRecord, bool, func, num } from "./value.js";

//#region Types

/** An environment mapping free/global variables to values. */
export type Env = ReadonlyMap<string, Value>;

/** Options to configure execution boundaries and limits. */
export interface EvaluateOptions {
	/** Maximum recursion depth before a {@link RecursionLimitError} is thrown. Defaults to 200. */
	readonly maxDepth?: number;
	/** Maximum evaluation steps before an {@link ExecutionLimitError} is thrown. Defaults to 10000. */
	readonly maxSteps?: number;
}

interface EvalContext {
	depth: number;
	steps: number;
	readonly maxDepth: number;
	readonly maxSteps: number;
}

//#endregion

//#region Public API

/**
 * Evaluate a compiled expression to a concrete {@link Value}.
 *
 * @param expr - The compiled expression to evaluate.
 * @param env - Global free variables. Defaults to empty.
 * @param stack - The stack of active bound lexical variables (top at the end).
 * @param options - Configure step and depth limits to prevent DoS.
 * @returns The computed value.
 *
 * @throws {@link UnboundVariableError} if a free variable is missing in `env`.
 * @throws {@link UndefinedOpError} if no operator instance matches the types.
 * @throws {@link DomainError} if runtime boundaries (div-by-zero etc) are violated.
 * @throws {@link ExecutionLimitError} if execution steps exceed maxSteps.
 * @throws {@link RecursionLimitError} if recursion depth exceeds maxDepth.
 */
export const evaluate = (
	expr: CompiledExpr,
	env: Env = new Map(),
	stack: readonly Value[] = [],
	options?: EvaluateOptions,
): Value => {
	const ctx: EvalContext = {
		depth: 0,
		steps: 0,
		maxDepth: options?.maxDepth ?? 200,
		maxSteps: options?.maxSteps ?? 10000,
	};
	const mutStack = [...stack];
	return evaluateInternal(expr, env, mutStack, ctx);
};

//#endregion

//#region Internal

const evaluateInternal = (
	expr: CompiledExpr,
	env: Env,
	stack: Value[],
	ctx: EvalContext,
): Value => {
	ctx.steps++;
	if (ctx.steps > ctx.maxSteps) {
		throw new ExecutionLimitError(ctx.maxSteps);
	}
	ctx.depth++;
	if (ctx.depth > ctx.maxDepth) {
		throw new RecursionLimitError(ctx.maxDepth);
	}

	try {
		switch (expr.kind) {
			case "lit":
				return expr.value;

			case "free_var": {
				const val = env.get(expr.name);
				if (val === undefined) throw new UnboundVariableError(expr.name);
				return val;
			}

			case "bound_var": {
				const idx = stack.length - 1 - expr.index;
				if (idx < 0 || idx >= stack.length) {
					throw new StackError(expr.index, stack.length);
				}
				return stack[idx]!;
			}

			case "unary": {
				const arg = evaluateInternal(expr.arg, env, stack, ctx);
				const key = encodeUnary(expr.op, arg.sort);
				const impl = lookupUnary(key);
				if (!impl) throw new UndefinedOpError(expr.op, [arg.sort]);
				return impl(arg);
			}

			case "binary": {
				const left = evaluateInternal(expr.left, env, stack, ctx);
				const right = evaluateInternal(expr.right, env, stack, ctx);
				const key = encodeBinary(expr.op, left.sort, right.sort);
				const impl = lookupBinary(key);
				if (!impl) throw new UndefinedOpError(expr.op, [left.sort, right.sort]);
				return impl(left, right);
			}

			case "relation": {
				const left = evaluateInternal(expr.left, env, stack, ctx);
				const right = evaluateInternal(expr.right, env, stack, ctx);
				const key = encodeRel(expr.op, left.sort, right.sort);
				const impl = lookupRel(key);
				if (!impl) throw new UndefinedOpError(expr.op, [left.sort, right.sort]);
				return bool(impl(left, right));
			}

			case "logic": {
				const left = evaluateInternal(expr.left, env, stack, ctx);
				const right = evaluateInternal(expr.right, env, stack, ctx);
				const key = encodeLogic(expr.op, left.sort, right.sort);
				const impl = lookupLogic(key);
				if (!impl) throw new UndefinedOpError(expr.op, [left.sort, right.sort]);
				return bool(impl(left, right));
			}

			case "binder": {
				const domain = evaluateInternal(expr.domain, env, stack, ctx);
				if (domain.sort !== "set") {
					throw new SortError("set", domain.sort, `domain of ${expr.op}`);
				}

				switch (expr.op) {
					case "∑": {
						let acc = 0;
						for (const x of domain.value) {
							stack.push(num(x));
							const val = evaluateInternal(expr.body, env, stack, ctx);
							stack.pop();
							acc += asNum(val, `body of ∑`);
						}
						return num(acc);
					}

					case "∏": {
						let acc = 1;
						for (const x of domain.value) {
							stack.push(num(x));
							const val = evaluateInternal(expr.body, env, stack, ctx);
							stack.pop();
							acc *= asNum(val, `body of ∏`);
						}
						return num(acc);
					}

					case "∀": {
						for (const x of domain.value) {
							stack.push(num(x));
							const val = evaluateInternal(expr.body, env, stack, ctx);
							stack.pop();
							if (!asBool(val, `body of ∀`)) return bool(false);
						}
						return bool(true);
					}

					case "∃": {
						for (const x of domain.value) {
							stack.push(num(x));
							const val = evaluateInternal(expr.body, env, stack, ctx);
							stack.pop();
							if (asBool(val, `body of ∃`)) return bool(true);
						}
						return bool(false);
					}

					default:
						return assertNever(expr);
				}
			}

			case "cond": {
				const test = evaluateInternal(expr.test, env, stack, ctx);
				const condition = asBool(test, "condition of if-then-else");
				return condition
					? evaluateInternal(expr.then, env, stack, ctx)
					: evaluateInternal(expr.else, env, stack, ctx);
			}

			case "lambda":
				// Lexically capture the current stack in a closure
				return func(expr.body, [...stack]);

			case "call": {
				const fnVal = evaluateInternal(expr.func, env, stack, ctx);
				const argVal = evaluateInternal(expr.arg, env, stack, ctx);
				const { body, closure } = asFunc(fnVal, "function application");
				// Extend stack with argument value and run compiled body
				return evaluateInternal(body, env, [...closure, argVal], ctx);
			}

			case "member": {
				const objVal = evaluateInternal(expr.obj, env, stack, ctx);
				const rec = asRecord(objVal, `accessing property '${expr.property}'`);
				if (!Object.hasOwn(rec, expr.property)) {
					throw new DomainError("member", `Property '${expr.property}' does not exist on record`);
				}
				const propVal = rec[expr.property];
				if (propVal === undefined) {
					throw new DomainError("member", `Property '${expr.property}' does not exist on record`);
				}
				return propVal;
			}

			default:
				return assertNever(expr);
		}
	} finally {
		ctx.depth--;
	}
};

//#endregion
