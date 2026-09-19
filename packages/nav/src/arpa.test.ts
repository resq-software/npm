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
import {
	compareByRisk,
	formatBearing,
	isUsableCpa,
	nearestByRange,
	worstApproach,
} from "./arpa.js";

describe("isUsableCpa", () => {
	it("accepts zero and positive distances", () => {
		expect(isUsableCpa(0)).toBe(true);
		expect(isUsableCpa(2.5)).toBe(true);
	});

	it("rejects a negative CPA — it is nonsense, not a nearer one", () => {
		expect(isUsableCpa(-0.1)).toBe(false);
	});

	it("rejects absent and non-finite readings", () => {
		expect(isUsableCpa(undefined)).toBe(false);
		expect(isUsableCpa(Number.NaN)).toBe(false);
		expect(isUsableCpa(Number.POSITIVE_INFINITY)).toBe(false);
	});
});

describe("compareByRisk", () => {
	it("puts the smaller usable CPA first", () => {
		expect(compareByRisk({ cpa: 0.2, range: 9 }, { cpa: 1.5, range: 1 })).toBeLessThan(0);
	});

	it("falls back to range when neither reports a CPA", () => {
		expect(compareByRisk({ range: 2 }, { range: 5 })).toBeLessThan(0);
	});

	it("never assumes a contact without a CPA is safe — it ranks on proximity instead", () => {
		// The no-CPA contact sorts after a genuinely close one...
		expect(compareByRisk({ range: 8 }, { cpa: 0.1, range: 9 })).toBeGreaterThan(0);
		// ...but is still ordered among its peers rather than discarded.
		const contacts = [{ range: 9 }, { cpa: 0.1, range: 10 }, { range: 3 }];
		const sorted = [...contacts].sort(compareByRisk);
		expect(sorted[0]?.cpa).toBe(0.1);
		expect(sorted[1]?.range).toBe(3);
		expect(sorted[2]?.range).toBe(9);
	});

	it("treats a negative CPA as unusable rather than as the nearest risk", () => {
		// A negative CPA must not hijack the top of the list.
		expect(compareByRisk({ cpa: -5, range: 9 }, { cpa: 1, range: 9 })).toBeGreaterThan(0);
	});
});

describe("nearestByRange", () => {
	it("finds the closest contact in the given set", () => {
		expect(nearestByRange([{ range: 5 }, { range: 2 }, { range: 8 }])?.range).toBe(2);
	});

	it("does not assume the input is sorted", () => {
		expect(nearestByRange([{ range: 8 }, { range: 1 }])?.range).toBe(1);
	});

	it("returns null for an empty set", () => {
		expect(nearestByRange([])).toBeNull();
	});
});

describe("worstApproach", () => {
	it("finds the smallest usable CPA", () => {
		const worst = worstApproach([{ cpa: 2, range: 1 }, { cpa: 0.4, range: 9 }, { range: 1 }]);
		expect(worst?.cpa).toBe(0.4);
	});

	it("ignores contacts with no usable CPA", () => {
		expect(worstApproach([{ range: 1 }, { cpa: Number.NaN, range: 2 }])).toBeNull();
	});

	it("returns null for an empty set", () => {
		expect(worstApproach([])).toBeNull();
	});
});

describe("formatBearing", () => {
	it("pads to three digits the way a bearing is spoken", () => {
		expect(formatBearing(7)).toBe("007");
		expect(formatBearing(70)).toBe("070");
		expect(formatBearing(170)).toBe("170");
	});

	it("renders a full turn as 000, not 360", () => {
		expect(formatBearing(360)).toBe("000");
		expect(formatBearing(359.7)).toBe("000");
	});

	it("wraps negative bearings", () => {
		expect(formatBearing(-10)).toBe("350");
	});
});
