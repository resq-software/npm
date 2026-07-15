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

import { expectTypeOf, test } from "vitest";
import type { Expr } from "../src/ast.js";
import type { Value, Sort } from "../src/value.js";
import type { CheckResult } from "../src/check.js";
import { num, bool, mkSet } from "../src/value.js";
import { N, S, B, add, sum, v } from "../src/builder.js";
import { evaluate } from "../src/evaluate.js";
import { checkExpr } from "../src/check.js";
import { parse } from "../src/parse.js";
import { print } from "../src/print.js";

test("Type safety tests", () => {
	// Builders produce Expr nodes
	expectTypeOf(N(5)).toMatchTypeOf<Expr>();
	expectTypeOf(S(1, 2)).toMatchTypeOf<Expr>();
	expectTypeOf(B(true)).toMatchTypeOf<Expr>();
	expectTypeOf(add(N(2), N(3))).toMatchTypeOf<Expr>();
	expectTypeOf(v("x")).toMatchTypeOf<Expr>();
	expectTypeOf(sum("i", S(1), N(1))).toMatchTypeOf<Expr>();

	// Value structures
	expectTypeOf(num(5)).toMatchTypeOf<Value>();
	expectTypeOf(bool(true)).toMatchTypeOf<Value>();
	expectTypeOf(mkSet([1])).toMatchTypeOf<Value>();

	expectTypeOf(num(5).sort).toMatchTypeOf<Sort>();

	// Pipeline return types
	expectTypeOf(parse("42")).toMatchTypeOf<Expr>();
	expectTypeOf(evaluate(N(5))).toMatchTypeOf<Value>();
	expectTypeOf(checkExpr(N(5))).toMatchTypeOf<CheckResult>();
	expectTypeOf(print(N(5))).toBeString();
});
