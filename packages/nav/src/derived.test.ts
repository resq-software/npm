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
	crabAngleDeg,
	crossTrackNm,
	differentialDriveMotion,
	enduranceHours,
	observedCurrent,
	rateOfTurnDegPerSec,
	slipRatio,
	stoppingDistanceM,
	turnRadiusM,
} from "./derived.js";

describe("crabAngleDeg", () => {
	it("returns the signed divergence, positive when the track is to starboard", () => {
		expect(crabAngleDeg(0, 10)).toBe(10);
		expect(crabAngleDeg(10, 0)).toBe(-10);
	});

	it("takes the short way round through north", () => {
		expect(crabAngleDeg(350, 10)).toBe(20);
		expect(crabAngleDeg(10, 350)).toBe(-20);
	});

	it("refuses when either input is absent or non-finite", () => {
		expect(crabAngleDeg(undefined, 10)).toBeUndefined();
		expect(crabAngleDeg(10, undefined)).toBeUndefined();
		expect(crabAngleDeg(Number.NaN, 10)).toBeUndefined();
		expect(crabAngleDeg(10, Number.POSITIVE_INFINITY)).toBeUndefined();
	});
});

describe("observedCurrent", () => {
	it("reports set as the direction the current flows toward", () => {
		// Ground track is 1 kn further east than the water track: current sets east.
		const current = observedCurrent({ east: 1, north: 0 }, { east: 0, north: 0 });
		expect(current?.setDeg).toBeCloseTo(90, 9);
		expect(current?.drift).toBeCloseTo(1, 9);
	});

	it("reports a northward set as 000, not 180", () => {
		const current = observedCurrent({ east: 0, north: 2 }, { east: 0, north: 0 });
		expect(current?.setDeg).toBeCloseTo(0, 9);
		expect(current?.drift).toBeCloseTo(2, 9);
	});

	it("reports zero drift, and no direction at all, when ground and water agree", () => {
		const current = observedCurrent({ east: 3, north: 4 }, { east: 3, north: 4 });
		expect(current?.drift).toBe(0);
		// A zero vector has no direction; claiming it sets north would be a fabrication.
		expect(current?.setDeg).toBeUndefined();
		expect(current !== undefined && "setDeg" in current).toBe(false);
	});

	it("refuses on a non-finite component", () => {
		expect(observedCurrent({ east: Number.NaN, north: 0 }, { east: 0, north: 0 })).toBeUndefined();
	});
});

describe("slipRatio", () => {
	it("is zero for pure rolling and one for a fully spinning wheel", () => {
		expect(slipRatio(2, 2)).toBe(0);
		expect(slipRatio(0, 2)).toBe(1);
	});

	it("is fractional under partial slip", () => {
		expect(slipRatio(1.5, 2)).toBeCloseTo(0.25, 12);
	});

	it("refuses a stationary wheel rather than reporting perfect traction", () => {
		expect(slipRatio(0, 0)).toBeUndefined();
		expect(slipRatio(1, -1)).toBeUndefined();
	});

	it("refuses when either input is absent", () => {
		expect(slipRatio(undefined, 2)).toBeUndefined();
		expect(slipRatio(2, undefined)).toBeUndefined();
	});
});

describe("stoppingDistanceM", () => {
	it("sums the reaction, braking and margin terms", () => {
		// 10 m/s, 0.5 s latency -> 5 m; 10^2 / (2*2) -> 25 m; +1 m margin.
		expect(
			stoppingDistanceM({ speedMs: 10, latencyS: 0.5, brakingMs2: 2, marginM: 1 }),
		).toBeCloseTo(31, 12);
	});

	it("counts latency as distance, not as nothing", () => {
		const withLatency = stoppingDistanceM({ speedMs: 10, latencyS: 1, brakingMs2: 2, marginM: 0 });
		const without = stoppingDistanceM({ speedMs: 10, latencyS: 0, brakingMs2: 2, marginM: 0 });
		expect((withLatency ?? 0) - (without ?? 0)).toBeCloseTo(10, 12);
	});

	it("refuses non-positive braking and negative terms", () => {
		expect(
			stoppingDistanceM({ speedMs: 10, latencyS: 0.5, brakingMs2: 0, marginM: 1 }),
		).toBeUndefined();
		expect(
			stoppingDistanceM({ speedMs: -1, latencyS: 0.5, brakingMs2: 2, marginM: 1 }),
		).toBeUndefined();
		expect(
			stoppingDistanceM({ speedMs: 10, latencyS: -1, brakingMs2: 2, marginM: 1 }),
		).toBeUndefined();
		expect(
			stoppingDistanceM({ speedMs: 10, latencyS: 1, brakingMs2: 2, marginM: -1 }),
		).toBeUndefined();
	});
});

describe("enduranceHours", () => {
	it("divides declared usable energy by measured draw", () => {
		expect(enduranceHours(500, 250)).toBeCloseTo(2, 12);
	});

	it("refuses zero draw rather than reporting infinite endurance", () => {
		expect(enduranceHours(500, 0)).toBeUndefined();
		expect(enduranceHours(500, -10)).toBeUndefined();
	});

	it("refuses absent inputs and negative energy", () => {
		expect(enduranceHours(undefined, 250)).toBeUndefined();
		expect(enduranceHours(-1, 250)).toBeUndefined();
	});
});

describe("turnRadiusM", () => {
	it("derives radius from speed and yaw rate", () => {
		// 10 m/s at 1 rad/s -> 10 m. 1 rad/s is 180/pi deg/s.
		expect(turnRadiusM(10, 180 / Math.PI)).toBeCloseTo(10, 9);
	});

	it("is sign-agnostic — a port turn has the same radius as a starboard one", () => {
		expect(turnRadiusM(10, -5)).toBeCloseTo(turnRadiusM(10, 5) ?? 0, 12);
	});

	it("refuses a straight run instead of returning a huge number", () => {
		expect(turnRadiusM(10, 0)).toBeUndefined();
		expect(turnRadiusM(10, 1e-9)).toBeUndefined();
	});
});

describe("rateOfTurnDegPerSec", () => {
	it("divides the heading change by the interval", () => {
		expect(rateOfTurnDegPerSec(0, 30, 10)).toBeCloseTo(3, 12);
	});

	it("takes the short way round through north", () => {
		expect(rateOfTurnDegPerSec(350, 10, 10)).toBeCloseTo(2, 12);
		expect(rateOfTurnDegPerSec(10, 350, 10)).toBeCloseTo(-2, 12);
	});

	it("refuses a non-positive interval", () => {
		expect(rateOfTurnDegPerSec(0, 30, 0)).toBeUndefined();
		expect(rateOfTurnDegPerSec(0, 30, -1)).toBeUndefined();
	});
});

describe("crossTrackNm", () => {
	const start = { latitude: 0, longitude: 0 };
	const northLeg = { latitude: 1, longitude: 0 };

	it("is zero on track", () => {
		expect(crossTrackNm(start, northLeg, { latitude: 0.5, longitude: 0 })).toBeCloseTo(0, 9);
	});

	it("is positive to starboard of a northbound leg", () => {
		const east = crossTrackNm(start, northLeg, { latitude: 0.5, longitude: 0.1 });
		expect(east).toBeGreaterThan(0);
	});

	it("is negative to port of a northbound leg", () => {
		const west = crossTrackNm(start, northLeg, { latitude: 0.5, longitude: -0.1 });
		expect(west).toBeLessThan(0);
	});

	it("refuses a zero-length leg", () => {
		expect(crossTrackNm(start, start, { latitude: 0.5, longitude: 0.1 })).toBeUndefined();
	});

	it("refuses an out-of-range position instead of projecting it to a plausible zero", () => {
		expect(crossTrackNm(start, northLeg, { latitude: 91, longitude: 0 })).toBeUndefined();
		expect(crossTrackNm(start, northLeg, { latitude: 0.5, longitude: 181 })).toBeUndefined();
	});

	it("refuses an out-of-range leg endpoint", () => {
		expect(crossTrackNm({ latitude: 91, longitude: 0 }, northLeg, start)).toBeUndefined();
		expect(crossTrackNm(start, { latitude: 0, longitude: 400 }, start)).toBeUndefined();
	});
});

describe("differentialDriveMotion", () => {
	it("drives straight when both wheels match", () => {
		const motion = differentialDriveMotion(2, 2, 0.5, 1);
		expect(motion?.speedMs).toBeCloseTo(1, 12);
		expect(motion?.yawRateRadPerSec).toBeCloseTo(0, 12);
	});

	it("pivots when the wheels oppose", () => {
		const motion = differentialDriveMotion(-2, 2, 0.5, 1);
		expect(motion?.speedMs).toBeCloseTo(0, 12);
		expect(motion?.yawRateRadPerSec).toBeCloseTo(2, 12);
	});

	it("refuses non-positive geometry", () => {
		expect(differentialDriveMotion(2, 2, 0, 1)).toBeUndefined();
		expect(differentialDriveMotion(2, 2, 0.5, 0)).toBeUndefined();
	});

	it("refuses absent wheel speeds", () => {
		expect(differentialDriveMotion(undefined, 2, 0.5, 1)).toBeUndefined();
	});
});
