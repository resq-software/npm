// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	attitudeToHeading,
	attitudeToTilt,
	batteryStatusToProps,
	pressureToDepth,
	vfrHudToCompass,
} from "./mavlink";

describe("attitudeToTilt", () => {
	it("converts radians to degrees", () => {
		const tilt = attitudeToTilt({ pitch: -Math.PI / 36, roll: Math.PI / 12, yaw: 0 });

		expect(tilt.roll).toBeCloseTo(15, 6);
		expect(tilt.pitch).toBeCloseTo(-5, 6);
	});
});

describe("attitudeToHeading", () => {
	it("converts yaw to degrees", () => {
		expect(attitudeToHeading({ pitch: 0, roll: 0, yaw: Math.PI / 2 })).toBeCloseTo(90, 6);
	});

	it("wraps a negative yaw into 0-359", () => {
		expect(attitudeToHeading({ pitch: 0, roll: 0, yaw: -Math.PI / 2 })).toBeCloseTo(270, 6);
	});
});

describe("vfrHudToCompass", () => {
	it("converts ground speed from metres per second to knots", () => {
		// 5.144 m/s is 10 knots.
		expect(vfrHudToCompass({ groundspeed: 5.14444 }).speed).toBeCloseTo(10, 3);
	});

	it("passes heading through unchanged", () => {
		expect(vfrHudToCompass({ heading: 42 }).heading).toBe(42);
	});

	it("leaves absent readings undefined", () => {
		expect(vfrHudToCompass({})).toEqual({ heading: undefined, speed: undefined });
	});
});

describe("pressureToDepth", () => {
	it("reads zero at the surface", () => {
		expect(pressureToDepth(1013.25)).toBeCloseTo(0, 9);
	});

	it("reads about ten metres per bar in seawater", () => {
		expect(pressureToDepth(2013.25)).toBeCloseTo(9.949, 2);
	});

	it("goes deeper per bar in fresh water", () => {
		const salt = pressureToDepth(2013.25);
		const fresh = pressureToDepth(2013.25, { waterDensity: 1000 });

		expect(fresh).toBeGreaterThan(salt);
		expect(fresh).toBeCloseTo(10.197, 2);
	});

	it("honours a custom surface pressure", () => {
		expect(pressureToDepth(1000, { surfacePressureHpa: 1000 })).toBeCloseTo(0, 9);
	});

	it("falls back to seawater for a non-positive density", () => {
		expect(pressureToDepth(2013.25, { waterDensity: 0 })).toBeCloseTo(pressureToDepth(2013.25), 9);
	});

	it("reads negative above the surface", () => {
		expect(pressureToDepth(900)).toBeLessThan(0);
	});
});

describe("batteryStatusToProps", () => {
	it("converts cell millivolts to volts", () => {
		expect(batteryStatusToProps({ voltages: [4110, 4090] }).cellVoltages).toEqual([4.11, 4.09]);
	});

	it("drops the UINT16_MAX absent-cell sentinel", () => {
		expect(batteryStatusToProps({ voltages: [4110, 4090, 65535, 65535] }).cellVoltages).toEqual([
			4.11, 4.09,
		]);
	});

	it("keeps a genuine zero-volt cell visible", () => {
		// A dead cell is exactly what the operator needs to see.
		expect(batteryStatusToProps({ voltages: [4110, 0] }).cellVoltages).toEqual([4.11, 0]);
	});

	it("sums pack voltage from the reported cells", () => {
		expect(batteryStatusToProps({ voltages: [4110, 4090, 65535] }).voltage).toBeCloseTo(8.2, 6);
	});

	it("flips the MAVLink current sign to the gauge convention", () => {
		// 1240 cA discharging → −12.4 A.
		expect(batteryStatusToProps({ current_battery: 1240 }).current).toBeCloseTo(-12.4, 6);
	});

	it("treats -1 current as unknown", () => {
		expect(batteryStatusToProps({ current_battery: -1 }).current).toBeUndefined();
	});

	it("passes battery_remaining through as a percentage", () => {
		expect(batteryStatusToProps({ battery_remaining: 78 }).percentage).toBe(78);
	});

	it("treats -1 remaining as unknown", () => {
		expect(batteryStatusToProps({ battery_remaining: -1 }).percentage).toBeUndefined();
	});

	it("converts centi-degrees to degrees Celsius", () => {
		expect(batteryStatusToProps({ temperature: 3400 }).temperature).toBeCloseTo(34, 6);
	});

	it("treats INT16_MAX temperature as unknown", () => {
		expect(batteryStatusToProps({ temperature: 32767 }).temperature).toBeUndefined();
	});

	it("leaves an empty status entirely undefined", () => {
		expect(batteryStatusToProps({})).toEqual({
			cellVoltages: undefined,
			current: undefined,
			percentage: undefined,
			temperature: undefined,
			voltage: undefined,
		});
	});
});
