// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { VerticalSpeedIndicator } from "./vertical-speed-indicator";

describe("VerticalSpeedIndicator", () => {
	it("exposes an img role with a data-slot for instrumentation", () => {
		const element = VerticalSpeedIndicator({ verticalSpeed: 0 });

		expect(element.props.role).toBe("img");
		expect(element.props["data-slot"]).toBe("vertical-speed-indicator");
	});

	it("describes level flight", () => {
		const element = VerticalSpeedIndicator({ verticalSpeed: 0 });

		expect(element.props["aria-label"]).toBe("Vertical speed indicator, level");
	});

	it("describes a climb", () => {
		const element = VerticalSpeedIndicator({ verticalSpeed: 750 });

		expect(element.props["aria-label"]).toBe("Vertical speed indicator, 750 feet per minute climb");
	});

	it("describes a descent", () => {
		const element = VerticalSpeedIndicator({ verticalSpeed: -1200 });

		expect(element.props["aria-label"]).toBe(
			"Vertical speed indicator, 1200 feet per minute descent",
		);
	});

	it("clamps beyond the full-scale rate", () => {
		const element = VerticalSpeedIndicator({ maxRate: 2000, verticalSpeed: 5000 });

		expect(element.props["aria-label"]).toBe(
			"Vertical speed indicator, 2000 feet per minute climb",
		);
	});

	it("treats non-finite input as level", () => {
		const element = VerticalSpeedIndicator({ verticalSpeed: Number.NaN });

		expect(element.props["aria-label"]).toBe("Vertical speed indicator, level");
	});

	it("honours a custom label override", () => {
		const element = VerticalSpeedIndicator({ label: "Drone 7 climb", verticalSpeed: 400 });

		expect(element.props["aria-label"]).toBe("Drone 7 climb");
	});

	it("merges a consumer className over the base size", () => {
		const element = VerticalSpeedIndicator({ className: "size-64", verticalSpeed: 0 });

		expect(element.props.className).toContain("size-64");
		expect(element.props.className).not.toContain("size-48");
	});
});
