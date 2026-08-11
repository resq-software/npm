// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { StatusAnnouncer } from "./status-announcer";

describe("StatusAnnouncer", () => {
	it("renders a data-slot for instrumentation", () => {
		expect(StatusAnnouncer({}).props["data-slot"]).toBe("status-announcer");
	});

	it("announces politely by default", () => {
		const element = StatusAnnouncer({ message: "Battery at 20 percent" });

		expect(element.props["aria-live"]).toBe("polite");
		expect(element.props.role).toBe("status");
	});

	it("interrupts only when told to", () => {
		const element = StatusAnnouncer({ message: "Failsafe triggered", urgency: "assertive" });

		expect(element.props["aria-live"]).toBe("assertive");
		expect(element.props.role).toBe("alert");
	});

	it("carries the urgency for instrumentation", () => {
		expect(StatusAnnouncer({ urgency: "assertive" }).props["data-urgency"]).toBe("assertive");
	});

	it("reads the message as one utterance rather than word by word", () => {
		expect(StatusAnnouncer({ message: "Link restored" }).props["aria-atomic"]).toBe("true");
	});

	it("renders the message", () => {
		expect(StatusAnnouncer({ message: "Link restored" }).props.children).toBe("Link restored");
	});
});

describe("StatusAnnouncer mounting", () => {
	it("renders the region even with nothing to say", () => {
		// A live region mounted together with its first message is frequently
		// missed outright, so the container must already be in the DOM.
		const element = StatusAnnouncer({});

		expect(element.type).toBe("div");
		expect(element.props["aria-live"]).toBe("polite");
	});

	it("renders empty text rather than nothing, so only the text ever changes", () => {
		expect(StatusAnnouncer({}).props.children).toBe("");
	});

	it("hides visually without leaving the accessibility tree", () => {
		const className = String(StatusAnnouncer({}).props.className);

		expect(className).toContain("sr-only");
		expect(className).not.toContain("hidden");
	});

	it("merges a caller className rather than dropping it", () => {
		expect(StatusAnnouncer({ className: "absolute" }).props.className).toContain("absolute");
	});
});
