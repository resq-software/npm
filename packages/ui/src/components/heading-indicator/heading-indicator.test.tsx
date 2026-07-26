// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { HeadingIndicator } from "./heading-indicator";

describe("HeadingIndicator", () => {
	it("exposes an img role with a data-slot for instrumentation", () => {
		const element = HeadingIndicator({ heading: 0 });

		expect(element.props.role).toBe("img");
		expect(element.props["data-slot"]).toBe("heading-indicator");
	});

	it("labels the current heading in degrees", () => {
		const element = HeadingIndicator({ heading: 135 });

		expect(element.props["aria-label"]).toBe("Heading indicator, 135 degrees");
	});

	it("wraps headings past 360 back into range", () => {
		const element = HeadingIndicator({ heading: 450 });

		expect(element.props["aria-label"]).toBe("Heading indicator, 90 degrees");
	});

	it("wraps negative headings into range", () => {
		const element = HeadingIndicator({ heading: -90 });

		expect(element.props["aria-label"]).toBe("Heading indicator, 270 degrees");
	});

	it("treats non-finite input as north", () => {
		const element = HeadingIndicator({ heading: Number.NaN });

		expect(element.props["aria-label"]).toBe("Heading indicator, 0 degrees");
	});

	it("honours a custom label override", () => {
		const element = HeadingIndicator({ heading: 30, label: "Drone 7 heading" });

		expect(element.props["aria-label"]).toBe("Drone 7 heading");
	});

	it("merges a consumer className over the base size", () => {
		const element = HeadingIndicator({ className: "size-64", heading: 0 });

		expect(element.props.className).toContain("size-64");
		expect(element.props.className).not.toContain("size-48");
	});
});
