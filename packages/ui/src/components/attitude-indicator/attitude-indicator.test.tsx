// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { AttitudeIndicator } from "./attitude-indicator";

describe("AttitudeIndicator", () => {
	it("exposes an img role with a data-slot for instrumentation", () => {
		const element = AttitudeIndicator({ pitch: 0, roll: 0 });

		expect(element.props.role).toBe("img");
		expect(element.props["data-slot"]).toBe("attitude-indicator");
	});

	it("describes a level attitude for screen readers", () => {
		const element = AttitudeIndicator({ pitch: 0, roll: 0 });

		expect(element.props["aria-label"]).toContain("pitch level");
		expect(element.props["aria-label"]).toContain("wings level");
	});

	it("labels pitch and bank direction from the numeric attitude", () => {
		const element = AttitudeIndicator({ pitch: 8, roll: -15 });

		expect(element.props["aria-label"]).toContain("8 degrees nose up");
		expect(element.props["aria-label"]).toContain("15 degrees left bank");
	});

	it("clamps pitch beyond vertical to 90 degrees", () => {
		const element = AttitudeIndicator({ pitch: 200, roll: 0 });

		expect(element.props["aria-label"]).toContain("90 degrees nose up");
	});

	it("wraps roll into the (-180, 180] range", () => {
		const element = AttitudeIndicator({ pitch: 0, roll: 190 });

		expect(element.props["aria-label"]).toContain("170 degrees left bank");
	});

	it("treats non-finite input as zero", () => {
		const element = AttitudeIndicator({ pitch: Number.NaN, roll: 0 });

		expect(element.props["aria-label"]).toContain("pitch level");
	});

	it("honours a custom label override", () => {
		const element = AttitudeIndicator({ label: "Drone 7 attitude", pitch: 5, roll: 5 });

		expect(element.props["aria-label"]).toBe("Drone 7 attitude");
	});

	it("merges a consumer className over the base size", () => {
		const element = AttitudeIndicator({ className: "size-64", pitch: 0, roll: 0 });

		expect(element.props.className).toContain("size-64");
		expect(element.props.className).toContain("relative");
		expect(element.props.className).not.toContain("size-48");
	});
});
