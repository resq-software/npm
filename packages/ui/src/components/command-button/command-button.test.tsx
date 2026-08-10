// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";

import { CommandButton, type CommandState } from "./command-button";

/** Every string the button renders. */
function textOf(node: unknown, acc: string[] = []): string {
	if (typeof node === "string" || typeof node === "number") {
		acc.push(String(node));
		return acc.join(" ");
	}
	if (Array.isArray(node)) {
		for (const child of node) textOf(child, acc);
		return acc.join(" ");
	}
	if (node !== null && typeof node === "object") {
		textOf((node as { props?: { children?: unknown } }).props?.children, acc);
	}
	return acc.join(" ");
}

const RTL = { command: "Return to launch" };

describe("CommandButton", () => {
	it("renders a button with a data-slot for instrumentation", () => {
		const element = CommandButton(RTL);

		expect(element.type).toBe("button");
		expect(element.props["data-slot"]).toBe("command-button");
	});

	it("is type=button, so it cannot submit a surrounding form by accident", () => {
		expect(CommandButton(RTL).props.type).toBe("button");
	});

	it("names the command", () => {
		expect(CommandButton(RTL).props["aria-label"]).toBe("Return to launch");
		expect(textOf(CommandButton(RTL))).toContain("Return to launch");
	});

	it("accepts a caller override for the label", () => {
		expect(CommandButton({ ...RTL, label: "RTL" }).props["aria-label"]).toBe("RTL");
	});

	it("merges a caller className rather than dropping it", () => {
		expect(CommandButton({ ...RTL, className: "col-span-2" }).props.className).toContain(
			"col-span-2",
		);
	});

	it("keeps a visible focus ring, since a console is driven by keyboard", () => {
		expect(CommandButton(RTL).props.className).toContain("focus-visible:ring");
	});
});

describe("CommandButton state", () => {
	it("starts idle and says nothing beyond the command", () => {
		const element = CommandButton(RTL);

		expect(element.props["data-state"]).toBe("idle");
		expect(textOf(element)).toBe("Return to launch");
	});

	it("carries the vehicle's reported state for instrumentation", () => {
		const states: CommandState[] = ["sending", "acknowledged", "rejected", "timed-out"];

		for (const state of states) {
			expect(CommandButton({ ...RTL, state }).props["data-state"]).toBe(state);
		}
	});

	it("words a request in flight as sending, not as done", () => {
		const element = CommandButton({ ...RTL, state: "sending" });

		expect(textOf(element)).toContain("Sending");
		expect(element.props["aria-label"]).toBe("Return to launch, sending");
	});

	it("only claims acknowledgement when the vehicle acknowledged", () => {
		expect(CommandButton({ ...RTL, state: "acknowledged" }).props["aria-label"]).toBe(
			"Return to launch, acknowledged",
		);
	});

	it("distinguishes a rejection from silence", () => {
		expect(textOf(CommandButton({ ...RTL, state: "rejected" }))).toContain("Rejected");
		expect(textOf(CommandButton({ ...RTL, state: "timed-out" }))).toContain("No response");
	});

	it("carries state as a word, never colour alone", () => {
		for (const state of ["sending", "acknowledged", "rejected", "timed-out"] as CommandState[]) {
			expect(textOf(CommandButton({ ...RTL, state })).length).toBeGreaterThan(
				"Return to launch".length,
			);
		}
	});

	it("does not change state when clicked, because a click is not an outcome", () => {
		const onClick = vi.fn();
		const element = CommandButton({ ...RTL, onClick });

		element.props.onClick?.();

		expect(onClick).toHaveBeenCalledTimes(1);
		// The rendered element is a pure function of props: the click reports
		// upward and the vehicle decides what the button becomes.
		expect(element.props["data-state"]).toBe("idle");
	});
});

describe("CommandButton confirmation", () => {
	it("marks a destructive command as needing confirmation", () => {
		const element = CommandButton({ ...RTL, confirm: true });

		expect(element.props["data-confirm"]).toBe("");
		expect(element.props["aria-label"]).toBe(
			"Return to launch, destructive, confirmation required",
		);
	});

	it("asks for a second press once armed", () => {
		const element = CommandButton({ ...RTL, armed: true, confirm: true });

		expect(element.props["data-armed"]).toBe("");
		expect(textOf(element)).toContain("Confirm?");
		expect(element.props["aria-label"]).toBe("Return to launch, press again to confirm");
	});

	it("ignores armed on a command that is not destructive", () => {
		const element = CommandButton({ ...RTL, armed: true });

		expect(element.props["data-armed"]).toBeUndefined();
		expect(textOf(element)).not.toContain("Confirm?");
	});

	it("says both the confirmation and the state when a destructive command is in flight", () => {
		expect(
			CommandButton({ ...RTL, armed: true, confirm: true, state: "sending" }).props["aria-label"],
		).toBe("Return to launch, press again to confirm, sending");
	});
});

describe("CommandButton availability", () => {
	it("says why it is unavailable rather than only greying out", () => {
		const element = CommandButton({ ...RTL, unavailableReason: "no GPS fix" });

		expect(element.props["aria-label"]).toBe("Return to launch, unavailable, no GPS fix");
		expect(element.props["aria-disabled"]).toBe(true);
	});

	it("stays reachable by keyboard so the reason is actually announced", () => {
		// A natively disabled button leaves the tab order, and a screen reader
		// skipping it would never read the reason at all.
		expect(CommandButton({ ...RTL, unavailableReason: "no GPS fix" }).props.disabled).toBe(false);
	});

	it("refuses to activate while unavailable", () => {
		const onClick = vi.fn();
		const element = CommandButton({ ...RTL, onClick, unavailableReason: "no GPS fix" });

		element.props.onClick?.({ preventDefault: vi.fn() });

		expect(onClick).not.toHaveBeenCalled();
	});

	it("activates normally when it is available", () => {
		const onClick = vi.fn();
		const element = CommandButton({ ...RTL, onClick });

		element.props.onClick?.({ preventDefault: vi.fn() });

		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("dims an unavailable command", () => {
		expect(CommandButton({ ...RTL, unavailableReason: "no GPS fix" }).props.className).toContain(
			"opacity-45",
		);
	});

	it("puts the reason before any state, since it is why nothing will happen", () => {
		expect(
			CommandButton({ ...RTL, state: "sending", unavailableReason: "link down" }).props[
				"aria-label"
			],
		).toBe("Return to launch, unavailable, link down");
	});

	it("still honours an explicit disabled without inventing a reason", () => {
		const element = CommandButton({ ...RTL, disabled: true });

		expect(element.props.disabled).toBe(true);
		expect(element.props["aria-label"]).toBe("Return to launch");
	});

	it("is enabled when it is available", () => {
		expect(CommandButton(RTL).props.disabled).toBe(false);
	});
});
