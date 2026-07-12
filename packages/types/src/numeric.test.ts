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

import { describe, expect, test } from "vitest";
import {
	coercePositiveInt,
	isNonNegativeInt,
	isPositiveInt,
	isPositiveMillis,
	isPositiveNumber,
	isUnitInterval,
	toPositiveInt,
	toUnitInterval,
} from "./numeric.js";

describe("PositiveInt", () => {
	test("accepts integers > 0", () => {
		expect(isPositiveInt(1)).toBe(true);
		expect(isPositiveInt(1000)).toBe(true);
	});

	test("rejects zero, negatives, floats, and NaN", () => {
		expect(isPositiveInt(0)).toBe(false);
		expect(isPositiveInt(-1)).toBe(false);
		expect(isPositiveInt(1.5)).toBe(false);
		expect(isPositiveInt(Number.NaN)).toBe(false);
		expect(isPositiveInt(Number.POSITIVE_INFINITY)).toBe(false);
	});

	test("toPositiveInt throws on invalid input", () => {
		expect(() => toPositiveInt(0)).toThrow(TypeError);
		expect(toPositiveInt(3)).toBe(3);
	});

	test("coercePositiveInt returns null on invalid input", () => {
		expect(coercePositiveInt(0)).toBeNull();
		expect(coercePositiveInt(3)).toBe(3);
	});
});

describe("NonNegativeInt", () => {
	test("accepts zero and positives, rejects negatives and floats", () => {
		expect(isNonNegativeInt(0)).toBe(true);
		expect(isNonNegativeInt(5)).toBe(true);
		expect(isNonNegativeInt(-1)).toBe(false);
		expect(isNonNegativeInt(0.5)).toBe(false);
	});
});

describe("PositiveMillis", () => {
	test("accepts finite positive numbers (including fractions), rejects <= 0", () => {
		expect(isPositiveMillis(0.5)).toBe(true);
		expect(isPositiveMillis(250)).toBe(true);
		expect(isPositiveMillis(0)).toBe(false);
		expect(isPositiveMillis(-1)).toBe(false);
		expect(isPositiveMillis(Number.POSITIVE_INFINITY)).toBe(false);
	});
});

describe("PositiveNumber", () => {
	test("accepts fractional and integer positives, rejects <= 0 and non-finite", () => {
		expect(isPositiveNumber(0.5)).toBe(true);
		expect(isPositiveNumber(10)).toBe(true);
		expect(isPositiveNumber(0)).toBe(false);
		expect(isPositiveNumber(-1)).toBe(false);
		expect(isPositiveNumber(Number.NaN)).toBe(false);
		expect(isPositiveNumber(Number.POSITIVE_INFINITY)).toBe(false);
	});
});

describe("UnitInterval", () => {
	test("accepts [0, 1], rejects outside the interval", () => {
		expect(isUnitInterval(0)).toBe(true);
		expect(isUnitInterval(0.42)).toBe(true);
		expect(isUnitInterval(1)).toBe(true);
		expect(isUnitInterval(-0.01)).toBe(false);
		expect(isUnitInterval(1.01)).toBe(false);
		expect(() => toUnitInterval(2)).toThrow(TypeError);
	});
});
