// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
	parseTopic,
	stateToBattery,
	stateToCommand,
	stateToErrorSummary,
	stateToPose,
} from "./vda5050";

describe("parseTopic", () => {
	it("splits a well-formed topic", () => {
		expect(parseTopic("uagv/v2/resq/AGV-7/state")).toEqual({
			interfaceName: "uagv",
			majorVersion: 2,
			manufacturer: "resq",
			serialNumber: "AGV-7",
			topic: "state",
		});
	});

	it("reads a multi-digit major version", () => {
		expect(parseTopic("uagv/v12/resq/AGV-7/state")?.majorVersion).toBe(12);
	});

	it("rejects a topic with the wrong segment count", () => {
		expect(parseTopic("uagv/v2/resq/AGV-7")).toBeNull();
		expect(parseTopic("uagv/v2/resq/AGV-7/state/extra")).toBeNull();
	});

	it("rejects a malformed version segment", () => {
		expect(parseTopic("uagv/2/resq/AGV-7/state")).toBeNull();
		expect(parseTopic("uagv/vX/resq/AGV-7/state")).toBeNull();
	});

	it("rejects empty segments", () => {
		expect(parseTopic("uagv/v2//AGV-7/state")).toBeNull();
		expect(parseTopic("uagv/v2/resq/AGV-7/")).toBeNull();
	});
});

describe("stateToPose", () => {
	it("maps an initialised position, keeping theta in radians", () => {
		const pose = stateToPose({
			agvPosition: { positionInitialized: true, theta: Math.PI / 2, x: 1.2, y: 3.4 },
		});

		expect(pose).toEqual({ theta: Math.PI / 2, x: 1.2, y: 3.4 });
	});

	it("accepts a position that omits the initialised flag", () => {
		expect(stateToPose({ agvPosition: { theta: 0, x: 1, y: 2 } })).not.toBeNull();
	});

	it("refuses a position the AGV has disowned", () => {
		expect(
			stateToPose({ agvPosition: { positionInitialized: false, theta: 0, x: 1, y: 2 } }),
		).toBeNull();
	});

	it("refuses a missing or unusable position", () => {
		expect(stateToPose({})).toBeNull();
		expect(stateToPose({ agvPosition: { theta: 0, x: Number.NaN, y: 2 } })).toBeNull();
	});

	it("defaults a non-finite theta to zero rather than dropping the pose", () => {
		expect(stateToPose({ agvPosition: { theta: Number.NaN, x: 1, y: 2 } })?.theta).toBe(0);
	});
});

describe("stateToBattery", () => {
	it("passes the 0-100 charge straight through", () => {
		const battery = stateToBattery({
			batteryState: { batteryCharge: 78, batteryVoltage: 24.6 },
		});

		expect(battery).toEqual({ percentage: 78, voltage: 24.6 });
	});

	it("leaves an absent battery state undefined", () => {
		expect(stateToBattery({})).toEqual({ percentage: undefined, voltage: undefined });
	});

	it("ignores non-finite readings", () => {
		expect(
			stateToBattery({ batteryState: { batteryCharge: Number.NaN } }).percentage,
		).toBeUndefined();
	});
});

describe("stateToCommand", () => {
	it("normalizes velocity against the supplied full scale", () => {
		const command = stateToCommand(
			{ velocity: { omega: 0.75, vx: 1 } },
			{ angular: 1.5, linear: 2 },
		);

		expect(command.linear).toBeCloseTo(0.5, 6);
		expect(command.angular).toBeCloseTo(0.5, 6);
	});

	it("clamps a velocity beyond full scale", () => {
		const command = stateToCommand({ velocity: { omega: -9, vx: 9 } }, { angular: 1, linear: 1 });

		expect(command.linear).toBe(1);
		expect(command.angular).toBe(-1);
	});

	it("reads a missing velocity as stopped", () => {
		expect(stateToCommand({}, { angular: 1, linear: 1 })).toEqual({ angular: 0, linear: 0 });
	});

	it("reads a non-positive scale as stopped rather than dividing by zero", () => {
		expect(stateToCommand({ velocity: { vx: 1 } }, { angular: 1, linear: 0 }).linear).toBe(0);
	});
});

describe("stateToErrorSummary", () => {
	it("counts fatal and warning errors separately", () => {
		const summary = stateToErrorSummary({
			errors: [
				{ errorLevel: "WARNING", errorType: "lowBattery" },
				{ errorLevel: "FATAL", errorType: "motorFault" },
				{ errorLevel: "FATAL", errorType: "estop" },
			],
		});

		expect(summary).toEqual({ fatal: 2, warnings: 1 });
	});

	it("matches the fatal level case-insensitively", () => {
		expect(stateToErrorSummary({ errors: [{ errorLevel: "fatal" }] }).fatal).toBe(1);
	});

	it("treats an unlabelled error as a warning rather than dropping it", () => {
		expect(stateToErrorSummary({ errors: [{ errorType: "unknown" }] })).toEqual({
			fatal: 0,
			warnings: 1,
		});
	});

	it("reports zero for a clean state", () => {
		expect(stateToErrorSummary({})).toEqual({ fatal: 0, warnings: 0 });
		expect(stateToErrorSummary({ errors: [] })).toEqual({ fatal: 0, warnings: 0 });
	});
});
