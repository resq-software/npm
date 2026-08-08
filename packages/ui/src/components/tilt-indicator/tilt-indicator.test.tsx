// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { TiltIndicator } from "./tilt-indicator";

describe("TiltIndicator", () => {
	it("exposes an img role with a data-slot for instrumentation", () => {
		const element = TiltIndicator({ pitch: 0, roll: 0 });

		expect(element.props.role).toBe("img");
		expect(element.props["data-slot"]).toBe("tilt-indicator");
	});

	it("describes a level vehicle with no envelope used", () => {
		const element = TiltIndicator({ pitch: 0, roll: 0 });

		expect(element.props["aria-label"]).toBe(
			"Tilt indicator, roll level, pitch level, 0 percent of stability limit",
		);
	});

	it("combines both axes into a single envelope fraction", () => {
		// roll 12/30 = 0.4, pitch 4/30 = 0.1333 → hypot ≈ 0.4216 → 42%.
		const element = TiltIndicator({ pitch: -4, roll: 12 });

		expect(element.props["aria-label"]).toBe(
			"Tilt indicator, roll 12 degrees right, pitch 4 degrees down, 42 percent of stability limit",
		);
	});

	it("reads exactly 100 percent when a single axis sits on its limit", () => {
		const element = TiltIndicator({ pitch: 0, roll: -30 });

		expect(element.props["aria-label"]).toBe(
			"Tilt indicator, roll 30 degrees left, pitch level, 100 percent of stability limit",
		);
	});

	it("honours asymmetric per-axis limits", () => {
		const element = TiltIndicator({ pitch: 12, pitchLimit: 12, roll: 0, rollLimit: 40 });

		expect(element.props["aria-label"]).toBe(
			"Tilt indicator, roll level, pitch 12 degrees up, 100 percent of stability limit",
		);
	});

	it("reports over-limit tilt rather than capping the percentage", () => {
		const element = TiltIndicator({ pitch: 0, roll: 45 });

		expect(element.props["aria-label"]).toBe(
			"Tilt indicator, roll 45 degrees right, pitch level, 150 percent of stability limit",
		);
	});

	it("clamps absurd tilt to ±90 degrees for display", () => {
		const element = TiltIndicator({ pitch: 0, roll: 400 });

		expect(element.props["aria-label"]).toBe(
			"Tilt indicator, roll 90 degrees right, pitch level, 300 percent of stability limit",
		);
	});

	it("falls back to the default limits when given non-positive ones", () => {
		const element = TiltIndicator({ pitch: 0, pitchLimit: Number.NaN, roll: 15, rollLimit: 0 });

		expect(element.props["aria-label"]).toBe(
			"Tilt indicator, roll 15 degrees right, pitch level, 50 percent of stability limit",
		);
	});

	it("treats non-finite input as level", () => {
		const element = TiltIndicator({ pitch: Number.NaN, roll: Number.POSITIVE_INFINITY });

		expect(element.props["aria-label"]).toBe(
			"Tilt indicator, roll level, pitch level, 0 percent of stability limit",
		);
	});

	it("honours a custom label override", () => {
		const element = TiltIndicator({ label: "Rover 3 tilt", pitch: 5, roll: 5 });

		expect(element.props["aria-label"]).toBe("Rover 3 tilt");
	});

	it("merges a consumer className over the base size", () => {
		const element = TiltIndicator({ className: "size-64", pitch: 0, roll: 0 });

		expect(element.props.className).toContain("size-64");
		expect(element.props.className).not.toContain("size-48");
	});
});
