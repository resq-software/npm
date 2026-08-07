// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { CompassRose } from "./compass-rose";

describe("CompassRose", () => {
	it("exposes an img role with a data-slot for instrumentation", () => {
		const element = CompassRose({ heading: 42 });

		expect(element.props.role).toBe("img");
		expect(element.props["data-slot"]).toBe("compass-rose");
	});

	it("pads bearings to three digits", () => {
		const element = CompassRose({ heading: 7 });

		expect(element.props["aria-label"]).toBe("Compass rose, heading 007 degrees");
	});

	it("narrates heading, course, speed and drift together", () => {
		const element = CompassRose({ course: 48, heading: 42, speed: 6.2 });

		expect(element.props["aria-label"]).toBe(
			"Compass rose, heading 042 degrees, course over ground 048 degrees, speed over ground 6.2 knots, 6 degrees starboard drift",
		);
	});

	it("reads a course to the left of the heading as port drift", () => {
		const element = CompassRose({ course: 30, heading: 42, speed: 6.2 });

		expect(element.props["aria-label"]).toContain("12 degrees port drift");
	});

	it("resolves drift across the north crossover", () => {
		// 355° → 005° is 10° to starboard, not 350° to port.
		const element = CompassRose({ course: 5, heading: 355 });

		expect(element.props["aria-label"]).toContain("10 degrees starboard drift");
	});

	it("reports no drift when course matches heading", () => {
		const element = CompassRose({ course: 42, heading: 42 });

		expect(element.props["aria-label"]).toContain("no drift");
	});

	it("wraps bearings beyond a full turn", () => {
		const element = CompassRose({ heading: 400 });

		expect(element.props["aria-label"]).toBe("Compass rose, heading 040 degrees");
	});

	it("renders 360 degrees as 000", () => {
		const element = CompassRose({ heading: 360 });

		expect(element.props["aria-label"]).toBe("Compass rose, heading 000 degrees");
	});

	it("omits drift when only one of heading and course is known", () => {
		expect(CompassRose({ course: 48, speed: 6.2 }).props["aria-label"]).toBe(
			"Compass rose, course over ground 048 degrees, speed over ground 6.2 knots",
		);
	});

	it("describes a total loss of heading data", () => {
		expect(CompassRose({}).props["aria-label"]).toBe("Compass rose, no heading data");
		expect(CompassRose({ speed: 6.2 }).props["aria-label"]).toBe("Compass rose, no heading data");
	});

	it("ignores non-finite readings rather than printing NaN", () => {
		const element = CompassRose({ course: Number.NaN, heading: 42, speed: 6.2 });

		expect(element.props["aria-label"]).toBe(
			"Compass rose, heading 042 degrees, speed over ground 6.2 knots",
		);
	});

	it("honours a custom label override", () => {
		const element = CompassRose({ heading: 42, label: "USV 1 compass" });

		expect(element.props["aria-label"]).toBe("USV 1 compass");
	});

	it("reports an exact half-turn divergence as starboard, not port", () => {
		// normalizeDelta's range is (−180, 180], so 180 must not read as −180.
		const element = CompassRose({ course: 180, heading: 0 });

		expect(element.props["aria-label"]).toContain("180 degrees starboard drift");
	});

	it("merges a consumer className over the base size", () => {
		const element = CompassRose({ className: "size-64", heading: 42 });

		expect(element.props.className).toContain("size-64");
		expect(element.props.className).not.toContain("size-48");
	});
});
