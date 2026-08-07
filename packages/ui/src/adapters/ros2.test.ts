// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	batteryStateToProps,
	imuToHeading,
	imuToTilt,
	laserScanToProps,
	occupancyGridToProps,
	odometryToPose,
	quaternionToEuler,
	teleopToTwist,
} from "./ros2";

/** Quaternion for a yaw-only rotation of `deg` degrees. */
function yawQuaternion(deg: number) {
	const half = (deg * Math.PI) / 360;
	return { w: Math.cos(half), x: 0, y: 0, z: Math.sin(half) };
}

describe("laserScanToProps", () => {
	it("maps the LaserScan fields onto the instrument props", () => {
		const props = laserScanToProps({
			angle_increment: Math.PI / 180,
			angle_min: -Math.PI,
			range_max: 12,
			range_min: 0.1,
			ranges: [1, 2, 3],
		});

		expect(props).toEqual({
			angleIncrement: Math.PI / 180,
			angleMin: -Math.PI,
			rangeMax: 12,
			rangeMin: 0.1,
			ranges: [1, 2, 3],
		});
	});

	it("leaves absent range limits undefined rather than inventing them", () => {
		const props = laserScanToProps({
			angle_increment: 0.01,
			angle_min: 0,
			ranges: [1],
		});

		expect(props.rangeMin).toBeUndefined();
		expect(props.rangeMax).toBeUndefined();
	});

	it("passes a typed array through without copying", () => {
		const ranges = Float32Array.from([1, 2, 3]);

		expect(laserScanToProps({ angle_increment: 0.1, angle_min: 0, ranges }).ranges).toBe(ranges);
	});
});

describe("occupancyGridToProps", () => {
	it("maps info fields and the origin position", () => {
		const data = new Int8Array(4);
		const props = occupancyGridToProps({
			data,
			info: {
				height: 2,
				origin: { position: { x: -1.5, y: 2.5 } },
				resolution: 0.05,
				width: 2,
			},
		});

		expect(props).toEqual({
			cells: data,
			height: 2,
			origin: { x: -1.5, y: 2.5 },
			resolution: 0.05,
			width: 2,
		});
	});

	it("defaults a missing origin to zero", () => {
		const props = occupancyGridToProps({
			data: [0],
			info: { height: 1, resolution: 0.1, width: 1 },
		});

		expect(props.origin).toEqual({ x: 0, y: 0 });
	});
});

describe("batteryStateToProps", () => {
	it("scales the ROS 0-1 fraction into a 0-100 percentage", () => {
		expect(batteryStateToProps({ percentage: 0.78 }).percentage).toBeCloseTo(78, 6);
	});

	it("clamps an out-of-range fraction", () => {
		expect(batteryStateToProps({ percentage: 1.4 }).percentage).toBe(100);
		expect(batteryStateToProps({ percentage: -0.2 }).percentage).toBe(0);
	});

	it("keeps the ROS current sign convention", () => {
		// Negative is discharging in both ROS and the gauge, so no flip.
		expect(batteryStateToProps({ current: -12.4 }).current).toBe(-12.4);
	});

	it("passes cell voltages through", () => {
		expect(batteryStateToProps({ cell_voltage: [4.11, 4.09] }).cellVoltages).toEqual([4.11, 4.09]);
	});

	it("drops non-finite cells and an empty string", () => {
		expect(batteryStateToProps({ cell_voltage: [4.11, Number.NaN] }).cellVoltages).toEqual([4.11]);
		expect(batteryStateToProps({ cell_voltage: [] }).cellVoltages).toBeUndefined();
	});

	it("leaves absent readings undefined", () => {
		expect(batteryStateToProps({})).toEqual({
			cellVoltages: undefined,
			current: undefined,
			percentage: undefined,
			temperature: undefined,
			voltage: undefined,
		});
	});

	it("ignores non-finite scalars", () => {
		expect(batteryStateToProps({ voltage: Number.NaN }).voltage).toBeUndefined();
	});
});

describe("quaternionToEuler", () => {
	it("reads an identity quaternion as level", () => {
		const euler = quaternionToEuler({ w: 1, x: 0, y: 0, z: 0 });

		expect(euler.roll).toBeCloseTo(0, 9);
		expect(euler.pitch).toBeCloseTo(0, 9);
		expect(euler.yaw).toBeCloseTo(0, 9);
	});

	it("reads a pure yaw rotation", () => {
		expect(quaternionToEuler(yawQuaternion(90)).yaw).toBeCloseTo(Math.PI / 2, 6);
	});

	it("reads a pure roll rotation", () => {
		const half = Math.PI / 8;
		const euler = quaternionToEuler({ w: Math.cos(half), x: Math.sin(half), y: 0, z: 0 });

		expect(euler.roll).toBeCloseTo(Math.PI / 4, 6);
		expect(euler.pitch).toBeCloseTo(0, 6);
	});

	it("survives a gimbal-lock quaternion without producing NaN", () => {
		// Straight up: 2(wy - zx) rounds past 1, which would break a bare asin.
		const half = Math.PI / 4;
		const euler = quaternionToEuler({ w: Math.cos(half), x: 0, y: Math.sin(half), z: 0 });

		expect(Number.isNaN(euler.pitch)).toBe(false);
		expect(euler.pitch).toBeCloseTo(Math.PI / 2, 6);
	});
});

describe("imuToTilt", () => {
	it("converts roll and pitch to degrees", () => {
		const half = Math.PI / 24;
		const tilt = imuToTilt({
			orientation: { w: Math.cos(half), x: Math.sin(half), y: 0, z: 0 },
		});

		expect(tilt.roll).toBeCloseTo(15, 5);
		expect(tilt.pitch).toBeCloseTo(0, 5);
	});
});

describe("imuToHeading", () => {
	it("returns a heading in degrees", () => {
		expect(imuToHeading({ orientation: yawQuaternion(90) })).toBeCloseTo(90, 5);
	});

	it("wraps a negative yaw into the positive range", () => {
		expect(imuToHeading({ orientation: yawQuaternion(-90) })).toBeCloseTo(270, 5);
	});
});

describe("odometryToPose", () => {
	it("maps position and yaw, keeping theta in radians", () => {
		const pose = odometryToPose({
			pose: { pose: { orientation: yawQuaternion(90), position: { x: 1.2, y: 3.4 } } },
		});

		expect(pose.x).toBe(1.2);
		expect(pose.y).toBe(3.4);
		expect(pose.theta).toBeCloseTo(Math.PI / 2, 6);
	});
});

describe("teleopToTwist", () => {
	it("scales the normalized axes into real units", () => {
		const twist = teleopToTwist({ angular: -0.5, linear: 0.6 }, { angular: 2, linear: 1.5 });

		expect(twist.linear.x).toBeCloseTo(0.9, 6);
		expect(twist.angular.z).toBeCloseTo(-1, 6);
	});

	it("zeroes the unused axes", () => {
		const twist = teleopToTwist({ angular: 1, linear: 1 }, { angular: 1, linear: 1 });

		expect(twist.linear.y).toBe(0);
		expect(twist.linear.z).toBe(0);
		expect(twist.angular.x).toBe(0);
		expect(twist.angular.y).toBe(0);
	});
});
