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

import type { CompiledExpr } from "./ast.js";
import { DomainError, SortError, UnboundVariableError, UndefinedOpError } from "./error.js";
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

/** An environment mapping free/global variables to values. */
export type Env = ReadonlyMap<string, Value>;

/**
 * Evaluate a compiled expression to a concrete {@link Value}.
 *
 * @param expr - The compiled expression to evaluate.
 * @param env - Global free variables. Defaults to empty.
 * @param stack - The stack of active bound lexical variables (top at the end).
 * @returns The computed value.
 *
 * @throws {@link UnboundVariableError} if a free variable is missing in `env`.
 * @throws {@link UndefinedOpError} if no operator instance matches the types.
 * @throws {@link DomainError} if runtime boundaries (div-by-zero etc) are violated.
 */
export const evaluate = (
	expr: CompiledExpr,
	env: Env = new Map(),
	stack: readonly Value[] = [],
): Value => {
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
				throw new Error(`Runtime Error: Lexical stack overflow accessing index ${expr.index}`);
			}
			return stack[idx]!;
		}

		case "unary": {
			const arg = evaluate(expr.arg, env, stack);
			const key = encodeUnary(expr.op, arg.sort);
			const impl = lookupUnary(key);
			if (!impl) throw new UndefinedOpError(expr.op, [arg.sort]);
			return impl(arg);
		}

		case "binary": {
			const left = evaluate(expr.left, env, stack);
			const right = evaluate(expr.right, env, stack);
			const key = encodeBinary(expr.op, left.sort, right.sort);
			const impl = lookupBinary(key);
			if (!impl) throw new UndefinedOpError(expr.op, [left.sort, right.sort]);
			return impl(left, right);
		}

		case "relation": {
			const left = evaluate(expr.left, env, stack);
			const right = evaluate(expr.right, env, stack);
			const key = encodeRel(expr.op, left.sort, right.sort);
			const impl = lookupRel(key);
			if (!impl) throw new UndefinedOpError(expr.op, [left.sort, right.sort]);
			return bool(impl(left, right));
		}

		case "logic": {
			const left = evaluate(expr.left, env, stack);
			const right = evaluate(expr.right, env, stack);
			const key = encodeLogic(expr.op, left.sort, right.sort);
			const impl = lookupLogic(key);
			if (!impl) throw new UndefinedOpError(expr.op, [left.sort, right.sort]);
			return bool(impl(left, right));
		}

		case "binder": {
			const domain = evaluate(expr.domain, env, stack);
			if (domain.sort !== "set") {
				throw new SortError("set", domain.sort, `domain of ${expr.op}`);
			}

			switch (expr.op) {
				case "∑": {
					let acc = 0;
					for (const x of domain.value) {
						const val = evaluate(expr.body, env, [...stack, num(x)]);
						acc += asNum(val, `body of ∑`);
					}
					return num(acc);
				}

				case "∏": {
					let acc = 1;
					for (const x of domain.value) {
						const val = evaluate(expr.body, env, [...stack, num(x)]);
						acc *= asNum(val, `body of ∏`);
					}
					return num(acc);
				}

				case "∀": {
					for (const x of domain.value) {
						const val = evaluate(expr.body, env, [...stack, num(x)]);
						if (!asBool(val, `body of ∀`)) return bool(false);
					}
					return bool(true);
				}

				case "∃": {
					for (const x of domain.value) {
						const val = evaluate(expr.body, env, [...stack, num(x)]);
						if (asBool(val, `body of ∃`)) return bool(true);
					}
					return bool(false);
				}
			}
			break;
		}

		case "cond": {
			const test = evaluate(expr.test, env, stack);
			const condition = asBool(test, "condition of if-then-else");
			return condition ? evaluate(expr.then, env, stack) : evaluate(expr.else, env, stack);
		}

		case "lambda":
			// Lexically capture the current stack in a closure
			return func(expr.body, stack);

		case "call": {
			const fnVal = evaluate(expr.func, env, stack);
			const argVal = evaluate(expr.arg, env, stack);
			const { body, closure } = asFunc(fnVal, "function application");
			// Extend stack with argument value and run compiled body
			return evaluate(body, env, [...closure, argVal]);
		}

		case "member": {
			const objVal = evaluate(expr.obj, env, stack);
			const rec = asRecord(objVal, `accessing property '${expr.property}'`);
			const propVal = rec[expr.property];
			if (propVal === undefined) {
				throw new DomainError("member", `Property '${expr.property}' does not exist on record`);
			}
			return propVal;
		}
	}
};
