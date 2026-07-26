// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { Altimeter } from "./altimeter";

describe("Altimeter", () => {
	it("exposes an img role with a data-slot for instrumentation", () => {
		const element = Altimeter({ altitude: 0 });

		expect(element.props.role).toBe("img");
		expect(element.props["data-slot"]).toBe("altimeter");
	});

	it("labels the current altitude in feet", () => {
		const element = Altimeter({ altitude: 4250 });

		expect(element.props["aria-label"]).toBe("Altimeter, 4250 feet");
	});

	it("uses a custom unit verbatim", () => {
		const element = Altimeter({ altitude: 100, unit: "m" });

		expect(element.props["aria-label"]).toBe("Altimeter, 100 m");
	});

	it("supports negative altitude", () => {
		const element = Altimeter({ altitude: -50 });

		expect(element.props["aria-label"]).toBe("Altimeter, -50 feet");
	});

	it("treats non-finite input as sea level", () => {
		const element = Altimeter({ altitude: Number.NaN });

		expect(element.props["aria-label"]).toBe("Altimeter, 0 feet");
	});

	it("honours a custom label override", () => {
		const element = Altimeter({ altitude: 500, label: "Drone 7 altitude" });

		expect(element.props["aria-label"]).toBe("Drone 7 altitude");
	});

	it("merges a consumer className over the base size", () => {
		const element = Altimeter({ altitude: 0, className: "size-64" });

		expect(element.props.className).toContain("size-64");
		expect(element.props.className).not.toContain("size-48");
	});
});
