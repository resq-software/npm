/*
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
import type { Coordinates2D, Coordinates3D } from "../src/distance.js";
import { Distance } from "../src/distance.js";
import { type Latitude, type Longitude, toLatitude, toLongitude } from "../src/schemas.js";

/** Builds a branded 2D coordinate from raw in-range numbers. */
const coord = (lat: number, lng: number): Coordinates2D => ({
	lat: toLatitude(lat),
	lng: toLongitude(lng),
});

/** Builds a branded 3D coordinate from raw in-range numbers. */
const coord3 = (lat: number, lng: number, alt: number): Coordinates3D => ({
	lat: toLatitude(lat),
	lng: toLongitude(lng),
	alt,
});

describe("Distance", () => {
	describe("euclidean", () => {
		test("calculates distance between two 2D points", () => {
			expect(Distance.euclidean(coord(0, 0), coord(3, 4))).toBeCloseTo(5, 5);
		});

		test("returns 0 for identical points", () => {
			const p = coord(5, 5);
			expect(Distance.euclidean(p, p)).toBeCloseTo(0, 5);
		});

		test("throws for non-finite coordinates", () => {
			// A cast simulates untrusted input: a non-finite latitude that
			// bypassed the branded smart constructor still trips runtime validation.
			const p1: Coordinates2D = { lat: Number.NaN as Latitude, lng: 0 as Longitude };
			expect(() => Distance.euclidean(p1, coord(0, 0))).toThrow();
		});
	});

	describe("haversine", () => {
		test("calculates distance between NYC and London", () => {
			const km = Distance.haversine(coord(40.7128, -74.006), coord(51.5074, -0.1278));
			// Known distance is ~5570 km
			expect(km).toBeGreaterThan(5500);
			expect(km).toBeLessThan(5600);
		});

		test("returns 0 for identical points", () => {
			const p = coord(40.7128, -74.006);
			expect(Distance.haversine(p, p)).toBeCloseTo(0, 5);
		});

		test("throws for out-of-range latitude", () => {
			// Untrusted input: 91° latitude slipped past the branded type.
			const p1: Coordinates2D = { lat: 91 as Latitude, lng: 0 as Longitude };
			expect(() => Distance.haversine(p1, coord(0, 0))).toThrow();
		});

		test("throws for out-of-range longitude", () => {
			const p1: Coordinates2D = { lat: 0 as Latitude, lng: 181 as Longitude };
			expect(() => Distance.haversine(p1, coord(0, 0))).toThrow();
		});
	});

	describe("manhattan", () => {
		test("calculates sum of absolute differences", () => {
			expect(Distance.manhattan(coord(0, 0), coord(3, 4))).toBeCloseTo(7, 5);
		});
	});

	describe("chebyshev", () => {
		test("calculates max of absolute differences", () => {
			expect(Distance.chebyshev(coord(0, 0), coord(3, 7))).toBeCloseTo(7, 5);
		});
	});

	describe("threed", () => {
		test("calculates 3D distance with altitude", () => {
			const dist = Distance.threed(coord3(0, 0, 0), coord3(0, 0, 100));
			expect(dist).toBeGreaterThan(0);
		});

		test("throws for missing altitude", () => {
			const a = coord(0, 0) as Coordinates3D;
			expect(() => Distance.threed(a, coord3(0, 0, 100))).toThrow();
		});
	});

	describe("calculate", () => {
		test("dispatches to euclidean", () => {
			const result = Distance.calculate("euclidean", coord(0, 0), coord(3, 4));
			expect(result).toBeCloseTo(5, 5);
		});

		test("dispatches to haversine", () => {
			const result = Distance.calculate(
				"haversine",
				coord(40.7128, -74.006),
				coord(51.5074, -0.1278),
			);
			expect(result).toBeGreaterThan(5500);
		});

		test("dispatches to manhattan", () => {
			expect(Distance.calculate("manhattan", coord(1, 2), coord(4, 6))).toBeCloseTo(7, 5);
		});
	});

	describe("safe", () => {
		test("returns valid result for good coordinates", () => {
			const result = Distance.calculateSafe("euclidean", coord(0, 0), coord(3, 4));
			expect(result.valid).toBe(true);
			expect(result.distance).toBeCloseTo(5, 5);
			expect(result.formula).toBe("euclidean");
		});

		test("returns invalid result for bad coordinates", () => {
			const p1: Coordinates2D = { lat: Number.NaN as Latitude, lng: 0 as Longitude };
			const result = Distance.calculateSafe("euclidean", p1, coord(0, 0));
			expect(result.valid).toBe(false);
			expect(result.error).toBeDefined();
		});
	});

	describe("coordinate smart constructors", () => {
		test("reject out-of-range latitude and longitude", () => {
			expect(() => toLatitude(91)).toThrow();
			expect(() => toLatitude(-90.1)).toThrow();
			expect(() => toLongitude(181)).toThrow();
			expect(() => toLongitude(-180.1)).toThrow();
		});

		test("accept boundary values", () => {
			expect(toLatitude(90)).toBe(90);
			expect(toLatitude(-90)).toBe(-90);
			expect(toLongitude(180)).toBe(180);
			expect(toLongitude(-180)).toBe(-180);
		});
	});
});
