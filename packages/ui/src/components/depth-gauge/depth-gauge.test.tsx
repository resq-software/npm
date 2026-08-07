// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { DepthGauge } from "./depth-gauge";

describe("DepthGauge", () => {
	it("exposes an img role with a data-slot for instrumentation", () => {
		const element = DepthGauge({ depth: 12.4 });

		expect(element.props.role).toBe("img");
		expect(element.props["data-slot"]).toBe("depth-gauge");
	});

	it("reports depth alone when no seabed is known", () => {
		const element = DepthGauge({ depth: 12.4 });

		expect(element.props["aria-label"]).toBe("Depth gauge, 12.4 meters");
	});

	it("derives altitude above the seabed", () => {
		const element = DepthGauge({ depth: 12.4, seabed: 16 });

		expect(element.props["aria-label"]).toBe("Depth gauge, 12.4 meters, 3.6 meters above seabed");
	});

	it("raises a proximity warning inside the altitude threshold", () => {
		const element = DepthGauge({ depth: 15.2, seabed: 16 });

		expect(element.props["aria-label"]).toBe(
			"Depth gauge, 15.2 meters, 0.8 meters above seabed, seabed proximity warning",
		);
	});

	it("honours a custom altitude warning", () => {
		const element = DepthGauge({ altitudeWarning: 5, depth: 12.4, seabed: 16 });

		expect(element.props["aria-label"]).toBe(
			"Depth gauge, 12.4 meters, 3.6 meters above seabed, seabed proximity warning",
		);
	});

	it("reports a negative altitude when the vehicle is below the sounding", () => {
		const element = DepthGauge({ depth: 17, seabed: 16 });

		expect(element.props["aria-label"]).toBe(
			"Depth gauge, 17.0 meters, -1.0 meters above seabed, seabed proximity warning",
		);
	});

	it("includes the depth-hold setpoint when supplied", () => {
		const element = DepthGauge({ depth: 12.4, seabed: 16, target: 12 });

		expect(element.props["aria-label"]).toBe(
			"Depth gauge, 12.4 meters, 3.6 meters above seabed, target depth 12.0 meters",
		);
	});

	it("drops decimals past a hundred metres", () => {
		const element = DepthGauge({ depth: 148.7 });

		expect(element.props["aria-label"]).toBe("Depth gauge, 149 meters");
	});

	it("describes a missing depth reading", () => {
		expect(DepthGauge({}).props["aria-label"]).toBe("Depth gauge, no depth data");
		expect(DepthGauge({ depth: Number.NaN, seabed: 16 }).props["aria-label"]).toBe(
			"Depth gauge, no depth data",
		);
	});

	it("ignores a non-finite seabed rather than printing NaN", () => {
		const element = DepthGauge({ depth: 12.4, seabed: Number.POSITIVE_INFINITY });

		expect(element.props["aria-label"]).toBe("Depth gauge, 12.4 meters");
	});

	it("honours a custom label override", () => {
		const element = DepthGauge({ depth: 12.4, label: "ROV 2 depth" });

		expect(element.props["aria-label"]).toBe("ROV 2 depth");
	});

	it("merges a consumer className over the base size", () => {
		const element = DepthGauge({ className: "size-64", depth: 12.4 });

		expect(element.props.className).toContain("size-64");
		expect(element.props.className).not.toContain("size-48");
	});
});
