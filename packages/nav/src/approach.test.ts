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
import { closestApproach } from "./approach.js";

describe("closestApproach", () => {
	it("solves a head-on closing geometry", () => {
		// Contact one mile north, closing at 20 knots: collision in three minutes.
		const solution = closestApproach({ east: 0, north: 1 }, { east: 0, north: -20 });
		expect(solution?.cpa).toBeCloseTo(0, 9);
		expect(solution?.tcpa).toBeCloseTo(3, 9);
		expect(solution?.opening).toBe(false);
	});

	it("reports a real passing distance for an offset track", () => {
		// Contact a mile north and half a mile east, running due south past us.
		const solution = closestApproach({ east: 0.5, north: 1 }, { east: 0, north: -10 });
		expect(solution?.cpa).toBeCloseTo(0.5, 9);
		expect(solution?.tcpa).toBeCloseTo(6, 9);
	});

	it("flags an opening contact instead of reporting a bare tcpa of zero", () => {
		// Already past and running away northward.
		const solution = closestApproach({ east: 0, north: 1 }, { east: 0, north: 10 });
		expect(solution?.opening).toBe(true);
		expect(solution?.tcpa).toBe(0);
		expect(solution?.cpa).toBeCloseTo(1, 9);
	});

	it("distinguishes station-keeping from opening — both report tcpa 0", () => {
		const holding = closestApproach({ east: 0, north: 2 }, { east: 0, north: 0 });
		const opening = closestApproach({ east: 0, north: 2 }, { east: 0, north: 5 });
		expect(holding?.tcpa).toBe(0);
		expect(opening?.tcpa).toBe(0);
		// The flag is the only thing telling these apart, which is why it exists.
		expect(holding?.opening).toBe(false);
		expect(opening?.opening).toBe(true);
	});

	it("reports the present range when relative motion is zero", () => {
		const solution = closestApproach({ east: 3, north: 4 }, { east: 0, north: 0 });
		expect(solution?.cpa).toBeCloseTo(5, 9);
	});

	it("does not call the exact closest-approach instant opening", () => {
		// Relative velocity perpendicular to the offset: tcpa is exactly 0, and the
		// contact is AT its closest approach rather than past it.
		const solution = closestApproach({ east: 0, north: 1 }, { east: 5, north: 0 });
		expect(solution?.tcpa).toBe(0);
		expect(solution?.opening).toBe(false);
		expect(solution?.cpa).toBeCloseTo(1, 9);
	});

	it("always states the model it assumed", () => {
		expect(closestApproach({ east: 0, north: 1 }, { east: 0, north: -10 })?.model).toBe(
			"constant-velocity",
		);
	});

	it("refuses a non-finite vector rather than returning a plausible number", () => {
		expect(closestApproach({ east: Number.NaN, north: 1 }, { east: 0, north: -10 })).toBeNull();
		expect(closestApproach({ east: 0, north: 1 }, { east: 0, north: Number.NaN })).toBeNull();
		expect(
			closestApproach({ east: 0, north: Number.POSITIVE_INFINITY }, { east: 0, north: -10 }),
		).toBeNull();
	});
});
