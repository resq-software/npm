// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { TurnCoordinator } from "./turn-coordinator";

describe("TurnCoordinator", () => {
	it("exposes an img role with a data-slot for instrumentation", () => {
		const element = TurnCoordinator({ slip: 0, turn: 0 });

		expect(element.props.role).toBe("img");
		expect(element.props["data-slot"]).toBe("turn-coordinator");
	});

	it("describes wings level and a centred ball", () => {
		const element = TurnCoordinator({ slip: 0, turn: 0 });

		expect(element.props["aria-label"]).toBe("Turn coordinator, wings level, ball centred");
	});

	it("describes a coordinated right turn", () => {
		const element = TurnCoordinator({ slip: 0, turn: 18 });

		expect(element.props["aria-label"]).toBe(
			"Turn coordinator, 18 degrees right bank, ball centred",
		);
	});

	it("describes a slipping left turn", () => {
		const element = TurnCoordinator({ slip: -0.6, turn: -18 });

		expect(element.props["aria-label"]).toBe("Turn coordinator, 18 degrees left bank, ball left");
	});

	it("clamps bank to ±30 and slip to ±1", () => {
		const element = TurnCoordinator({ slip: 3, turn: 45 });

		expect(element.props["aria-label"]).toBe("Turn coordinator, 30 degrees right bank, ball right");
	});

	it("treats non-finite input as level and centred", () => {
		const element = TurnCoordinator({ slip: Number.NaN, turn: Number.NaN });

		expect(element.props["aria-label"]).toBe("Turn coordinator, wings level, ball centred");
	});

	it("honours a custom label override", () => {
		const element = TurnCoordinator({ label: "Drone 7 turn", slip: 0.2, turn: 10 });

		expect(element.props["aria-label"]).toBe("Drone 7 turn");
	});

	it("merges a consumer className over the base size", () => {
		const element = TurnCoordinator({ className: "size-64", slip: 0, turn: 0 });

		expect(element.props.className).toContain("size-64");
		expect(element.props.className).not.toContain("size-48");
	});
});
