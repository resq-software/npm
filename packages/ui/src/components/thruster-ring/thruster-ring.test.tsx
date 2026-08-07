// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { ThrusterRing, type ThrusterReading } from "./thruster-ring";

const VECTORED_SIX: readonly ThrusterReading[] = [
	{ angle: 45, label: "FR", output: 0.62 },
	{ angle: 135, label: "AR", output: -0.4 },
	{ angle: 225, label: "AL", output: -0.38 },
	{ angle: 315, label: "FL", output: 0.6 },
	{ angle: 90, label: "VR", output: 0.22 },
	{ angle: 270, label: "VL", output: 0.24 },
];

describe("ThrusterRing", () => {
	it("exposes an img role with a data-slot for instrumentation", () => {
		const element = ThrusterRing({ thrusters: VECTORED_SIX });

		expect(element.props.role).toBe("img");
		expect(element.props["data-slot"]).toBe("thruster-ring");
	});

	it("reports the peak output and a clean saturation state", () => {
		const element = ThrusterRing({ thrusters: VECTORED_SIX });

		expect(element.props["aria-label"]).toBe(
			"Thruster ring, 6 thrusters, maximum output 62 percent, no saturation",
		);
	});

	it("names saturated thrusters", () => {
		const element = ThrusterRing({
			thrusters: [
				{ label: "FR", output: 0.99 },
				{ label: "FL", output: 0.3 },
			],
		});

		expect(element.props["aria-label"]).toBe(
			"Thruster ring, 2 thrusters, maximum output 99 percent, 1 saturated: FR",
		);
	});

	it("treats full reverse as saturation too", () => {
		const element = ThrusterRing({ thrusters: [{ label: "AL", output: -1 }] });

		expect(element.props["aria-label"]).toBe(
			"Thruster ring, 1 thruster, maximum output 100 percent, 1 saturated: AL",
		);
	});

	it("honours a custom saturation threshold", () => {
		const element = ThrusterRing({
			saturation: 0.5,
			thrusters: [
				{ label: "FR", output: 0.62 },
				{ label: "FL", output: 0.3 },
			],
		});

		expect(element.props["aria-label"]).toBe(
			"Thruster ring, 2 thrusters, maximum output 62 percent, 1 saturated: FR",
		);
	});

	it("clamps outputs beyond full scale", () => {
		const element = ThrusterRing({ thrusters: [{ label: "T1", output: 4 }] });

		expect(element.props["aria-label"]).toBe(
			"Thruster ring, 1 thruster, maximum output 100 percent, 1 saturated: T1",
		);
	});

	it("treats a non-finite output as stopped", () => {
		const element = ThrusterRing({ thrusters: [{ label: "T1", output: Number.NaN }] });

		expect(element.props["aria-label"]).toBe(
			"Thruster ring, 1 thruster, maximum output 0 percent, no saturation",
		);
	});

	it("declares the truncation past twelve thrusters", () => {
		const many = Array.from({ length: 16 }, (_unused, index) => ({
			label: `T${index}`,
			output: 0.1,
		}));
		const element = ThrusterRing({ thrusters: many });

		expect(element.props["aria-label"]).toBe(
			"Thruster ring, showing 12 of 16 thrusters, maximum output 10 percent, no saturation",
		);
	});

	it("describes an empty thruster set", () => {
		expect(ThrusterRing({ thrusters: [] }).props["aria-label"]).toBe(
			"Thruster ring, no thruster data",
		);
		expect(ThrusterRing({}).props["aria-label"]).toBe("Thruster ring, no thruster data");
	});

	it("honours a custom label override", () => {
		const element = ThrusterRing({ label: "ROV 2 thrust", thrusters: VECTORED_SIX });

		expect(element.props["aria-label"]).toBe("ROV 2 thrust");
	});

	it("merges a consumer className over the base size", () => {
		const element = ThrusterRing({ className: "size-64", thrusters: VECTORED_SIX });

		expect(element.props.className).toContain("size-64");
		expect(element.props.className).not.toContain("size-48");
	});
});
