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
	METRES_PER_NAUTICAL_MILE,
	degreesToMils,
	degreesToRadians,
	fathomsToMetres,
	feetToMetres,
	knotsToMs,
	metresToFathoms,
	metresToFeet,
	metresToNauticalMiles,
	milsToDegrees,
	msToKnots,
	nauticalMilesToMetres,
	radiansToDegrees,
} from "./units.js";

describe("units", () => {
	it("defines the nautical mile exactly", () => {
		expect(METRES_PER_NAUTICAL_MILE).toBe(1852);
		expect(nauticalMilesToMetres(1)).toBe(1852);
	});

	it("converts one knot to the defined 0.5144… m/s", () => {
		expect(knotsToMs(1)).toBeCloseTo(0.5144444444, 10);
	});

	it("round-trips every pair without drift", () => {
		const pairs: ReadonlyArray<readonly [(v: number) => number, (v: number) => number]> = [
			[knotsToMs, msToKnots],
			[nauticalMilesToMetres, metresToNauticalMiles],
			[feetToMetres, metresToFeet],
			[fathomsToMetres, metresToFathoms],
			[degreesToRadians, radiansToDegrees],
			[degreesToMils, milsToDegrees],
		];
		for (const [forward, back] of pairs) {
			for (const value of [0, 1, 12.5, 359.9, -7.25]) {
				expect(back(forward(value))).toBeCloseTo(value, 10);
			}
		}
	});

	it("uses the international foot and six-foot fathom", () => {
		expect(feetToMetres(1)).toBe(0.3048);
		expect(fathomsToMetres(1)).toBeCloseTo(feetToMetres(6), 12);
	});

	it("uses NATO mils, not milliradians", () => {
		expect(degreesToMils(360)).toBe(6400);
		expect(degreesToMils(90)).toBe(1600);
	});

	it("converts the cardinal angles", () => {
		expect(degreesToRadians(180)).toBeCloseTo(Math.PI, 12);
		expect(radiansToDegrees(Math.PI / 2)).toBeCloseTo(90, 12);
	});
});
