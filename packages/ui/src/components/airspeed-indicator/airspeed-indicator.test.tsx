// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { AirspeedIndicator } from "./airspeed-indicator";

describe("AirspeedIndicator", () => {
	it("exposes an img role with a data-slot for instrumentation", () => {
		const element = AirspeedIndicator({ speed: 100 });

		expect(element.props.role).toBe("img");
		expect(element.props["data-slot"]).toBe("airspeed-indicator");
	});

	it("labels the current speed with its unit", () => {
		const element = AirspeedIndicator({ speed: 120 });

		expect(element.props["aria-label"]).toBe("Airspeed indicator, 120 kt");
	});

	it("uses a custom unit", () => {
		const element = AirspeedIndicator({ speed: 30, unit: "m/s" });

		expect(element.props["aria-label"]).toBe("Airspeed indicator, 30 m/s");
	});

	it("clamps speed above the range to the maximum", () => {
		const element = AirspeedIndicator({ maxSpeed: 200, speed: 260 });

		expect(element.props["aria-label"]).toBe("Airspeed indicator, 200 kt");
	});

	it("clamps negative speed to zero", () => {
		const element = AirspeedIndicator({ speed: -5 });

		expect(element.props["aria-label"]).toBe("Airspeed indicator, 0 kt");
	});

	it("falls back to the default range when maxSpeed is invalid", () => {
		const element = AirspeedIndicator({ maxSpeed: 0, speed: 250 });

		expect(element.props["aria-label"]).toBe("Airspeed indicator, 200 kt");
	});

	it("treats non-finite speed as zero", () => {
		const element = AirspeedIndicator({ speed: Number.NaN });

		expect(element.props["aria-label"]).toBe("Airspeed indicator, 0 kt");
	});

	it("honours a custom label override", () => {
		const element = AirspeedIndicator({ label: "Drone 7 airspeed", speed: 90 });

		expect(element.props["aria-label"]).toBe("Drone 7 airspeed");
	});

	it("merges a consumer className over the base size", () => {
		const element = AirspeedIndicator({ className: "size-64", speed: 0 });

		expect(element.props.className).toContain("size-64");
		expect(element.props.className).not.toContain("size-48");
	});
});
