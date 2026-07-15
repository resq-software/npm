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
import { registerUnary, registerBinary, registerRelation, registerLogic } from "../src/instance.js";
import { MathError } from "../src/error.js";
import type { Value } from "../src/value.js";

const dummyUnary = (arg: Value): Value => arg;
const dummyBinary = (left: Value, _right: Value): Value => left;
const dummyRel = (_left: Value, _right: Value): boolean => false;
const dummyLogic = (_left: Value, _right: Value): boolean => false;

describe("Custom Registration Validation", () => {
	it("validates keys in registerUnary", () => {
		// Invalid key format
		expect(() => registerUnary("invalid", dummyUnary)).toThrow(MathError);
		// Unknown operator
		expect(() => registerUnary("unknownOp:num", dummyUnary)).toThrow(MathError);
		// Unknown sort
		expect(() => registerUnary("neg:unknownSort", dummyUnary)).toThrow(MathError);
	});

	it("validates keys in registerBinary", () => {
		// Invalid key format
		expect(() => registerBinary("invalid", dummyBinary)).toThrow(MathError);
		// Unknown operator
		expect(() => registerBinary("unknownOp:num:num", dummyBinary)).toThrow(MathError);
		// Unknown sorts
		expect(() => registerBinary("+:unknownSort:num", dummyBinary)).toThrow(MathError);
		expect(() => registerBinary("+:num:unknownSort", dummyBinary)).toThrow(MathError);
	});

	it("validates keys in registerRelation", () => {
		// Invalid key format
		expect(() => registerRelation("invalid", dummyRel)).toThrow(MathError);
		// Unknown operator
		expect(() => registerRelation("unknownOp:num:num", dummyRel)).toThrow(MathError);
		// Unknown sorts
		expect(() => registerRelation("=:unknownSort:num", dummyRel)).toThrow(MathError);
	});

	it("validates keys in registerLogic", () => {
		// Invalid key format
		expect(() => registerLogic("invalid", dummyLogic)).toThrow(MathError);
		// Unknown operator
		expect(() => registerLogic("unknownOp:bool:bool", dummyLogic)).toThrow(MathError);
		// Unknown sorts
		expect(() => registerLogic("∧:unknownSort:bool", dummyLogic)).toThrow(MathError);
	});
});
