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
import { clamp, optional } from "./numeric.js";

describe("optional", () => {
	it("passes a finite reading through, including zero", () => {
		expect(optional(0)).toBe(0);
		expect(optional(-4.5)).toBe(-4.5);
	});

	it("keeps an absent reading absent rather than collapsing it to zero", () => {
		// This is the whole point of the function: a blank readout and a reading of 0
		// must not look the same to an instrument.
		expect(optional(undefined)).toBeUndefined();
	});

	it("rejects non-finite values", () => {
		expect(optional(Number.NaN)).toBeUndefined();
		expect(optional(Number.POSITIVE_INFINITY)).toBeUndefined();
		expect(optional(Number.NEGATIVE_INFINITY)).toBeUndefined();
	});
});

describe("clamp", () => {
	it("returns a value already inside the range", () => {
		expect(clamp(5, 0, 10)).toBe(5);
	});

	it("clamps to each bound", () => {
		expect(clamp(-1, 0, 10)).toBe(0);
		expect(clamp(11, 0, 10)).toBe(10);
	});

	it("accepts the bounds themselves", () => {
		expect(clamp(0, 0, 10)).toBe(0);
		expect(clamp(10, 0, 10)).toBe(10);
	});
});
