// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { WheelOdometer, type WheelReading } from "./wheel-odometer";

const TRACKING: readonly WheelReading[] = [
	{ commanded: 1.2, label: "FL", velocity: 1.2 },
	{ commanded: 1.2, label: "FR", velocity: 1.2 },
	{ commanded: 1.2, label: "RL", velocity: 1.2 },
	{ commanded: 1.2, label: "RR", velocity: 1.2 },
];

const SLIPPING: readonly WheelReading[] = [
	{ commanded: 1.2, label: "FL", velocity: 1.2 },
	{ commanded: 1.2, label: "FR", velocity: 1.2 },
	{ commanded: 1.2, label: "RL", velocity: 0.3 },
	{ commanded: 1.2, label: "RR", velocity: 1.2 },
];

describe("WheelOdometer", () => {
	it("exposes an img role with a data-slot for instrumentation", () => {
		const element = WheelOdometer({ wheels: TRACKING });

		expect(element.props.role).toBe("img");
		expect(element.props["data-slot"]).toBe("wheel-odometer");
	});

	it("reports no slip when every wheel tracks its command", () => {
		const element = WheelOdometer({ wheels: TRACKING });

		expect(element.props["aria-label"]).toBe(
			"Wheel odometer, 4 wheels, mean wheel speed 1.2 meters per second, no slip detected",
		);
	});

	it("derives slip from the commanded-versus-measured gap", () => {
		// |0.3 − 1.2| / 2 = 0.45, above the 0.2 warning threshold.
		const element = WheelOdometer({ wheels: SLIPPING });

		expect(element.props["aria-label"]).toBe(
			"Wheel odometer, 4 wheels, mean wheel speed 1.0 meters per second, 1 slipping: RL",
		);
	});

	it("prefers an explicit slip ratio over the derived one", () => {
		const element = WheelOdometer({
			wheels: [{ commanded: 1, label: "L", slip: 0.9, velocity: 1 }],
		});

		expect(element.props["aria-label"]).toBe(
			"Wheel odometer, 1 wheel, mean wheel speed 1.0 meters per second, 1 slipping: L",
		);
	});

	it("scales slip against a custom maxVelocity", () => {
		// Same 0.9 m/s gap, but full scale is 6 → ratio 0.15, below warning.
		const element = WheelOdometer({ maxVelocity: 6, wheels: SLIPPING });

		expect(element.props["aria-label"]).toBe(
			"Wheel odometer, 4 wheels, mean wheel speed 1.0 meters per second, no slip detected",
		);
	});

	it("honours a custom slipWarning threshold", () => {
		const element = WheelOdometer({ slipWarning: 0.6, wheels: SLIPPING });

		expect(element.props["aria-label"]).toBe(
			"Wheel odometer, 4 wheels, mean wheel speed 1.0 meters per second, no slip detected",
		);
	});

	it("counts reverse wheels by absolute speed", () => {
		const element = WheelOdometer({
			wheels: [
				{ label: "L", velocity: -1 },
				{ label: "R", velocity: 1 },
			],
		});

		expect(element.props["aria-label"]).toBe(
			"Wheel odometer, 2 wheels, mean wheel speed 1.0 meters per second, no slip detected",
		);
	});

	it("declares the truncation when given more than eight wheels", () => {
		const many = Array.from({ length: 10 }, (_unused, index) => ({
			label: `W${index}`,
			velocity: 1,
		}));
		const element = WheelOdometer({ wheels: many });

		expect(element.props["aria-label"]).toBe(
			"Wheel odometer, showing 8 of 10 wheels, mean wheel speed 1.0 meters per second, no slip detected",
		);
	});

	it("describes an empty reading set", () => {
		const element = WheelOdometer({ wheels: [] });

		expect(element.props["aria-label"]).toBe("Wheel odometer, no wheel data");
	});

	it("describes a missing reading set", () => {
		const element = WheelOdometer({});

		expect(element.props["aria-label"]).toBe("Wheel odometer, no wheel data");
	});

	it("treats non-finite velocity as stopped", () => {
		const element = WheelOdometer({ wheels: [{ label: "L", velocity: Number.NaN }] });

		expect(element.props["aria-label"]).toBe(
			"Wheel odometer, 1 wheel, mean wheel speed 0.0 meters per second, no slip detected",
		);
	});

	it("falls back to defaults for non-positive scales", () => {
		const element = WheelOdometer({ maxVelocity: 0, wheels: SLIPPING });

		expect(element.props["aria-label"]).toBe(
			"Wheel odometer, 4 wheels, mean wheel speed 1.0 meters per second, 1 slipping: RL",
		);
	});

	it("honours a custom label override", () => {
		const element = WheelOdometer({ label: "Rover 3 drive", wheels: TRACKING });

		expect(element.props["aria-label"]).toBe("Rover 3 drive");
	});

	it("merges a consumer className over the base size", () => {
		const element = WheelOdometer({ className: "size-64", wheels: TRACKING });

		expect(element.props.className).toContain("size-64");
		expect(element.props.className).not.toContain("size-48");
	});
});
