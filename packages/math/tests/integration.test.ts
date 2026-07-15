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

import { describe, expect, it } from "vitest";
import { parse } from "../src/parse.js";
import { checkExpr } from "../src/check.js";
import { evaluate as evaluateCompiled } from "../src/evaluate.js";
import { compile } from "../src/compile.js";

const evaluate = (expr: import("../src/ast.js").Expr, env?: import("../src/evaluate.js").Env) =>
	evaluateCompiled(compile(expr), env);
import { showValue } from "../src/value.js";
import { print } from "../src/print.js";

describe("Integration Pipeline", () => {
	const runPipeline = (input: string): string => {
		const expr = parse(input);
		const check = checkExpr(expr);
		if (!check.ok) {
			throw new Error(`Static check failed: ${check.errors.map((e) => e.message).join(", ")}`);
		}
		const val = evaluate(expr);
		return showValue(val);
	};

	it("runs the full pipeline for the original demo expressions", () => {
		expect(runPipeline("(2 + 3) * 4")).toBe("20");
		expect(runPipeline("{1,2,3} union {3,4}")).toBe("{1, 2, 3, 4}");
		expect(runPipeline("{1,2} + {2,3}")).toBe("{1, 2, 3}");
		expect(runPipeline("#({1,2,3} intersect {2,3,4})")).toBe("2");
		expect(runPipeline("2 in {1,2,3}")).toBe("true");
		expect(runPipeline("{1} subseteq {1,2}")).toBe("true");
		expect(runPipeline("sum(i in {1,2,3}, i * i)")).toBe("14");
	});

	it("verifies parser and printer round-trip equivalence", () => {
		const cases = [
			"(2 + 3) * 4",
			"sum(i in {1, 2, 3}, i * i)",
			"if true then 1 else 2",
			"2 ∈ {1, 2, 3}",
			"{1} ∪ {2, 3}",
			"2 ^ 3 ^ 2",
		];

		for (const input of cases) {
			const expr1 = parse(input);
			const printed = print(expr1);
			const expr2 = parse(printed);

			// Both ASTs should evaluate to the same value
			expect(evaluate(expr1)).toEqual(evaluate(expr2));
		}
	});
});
