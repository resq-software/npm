// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { PanelFrame, type PanelFrameProps } from "./panel-frame";

/** Every string the frame renders, joined for fragment assertions. */
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

/** Does the tree contain an element of this intrinsic type? */
function contains(node: unknown, type: string): boolean {
	if (Array.isArray(node)) return node.some((child) => contains(child, type));
	if (node === null || typeof node !== "object") return false;
	const candidate = node as { props?: { children?: unknown }; type?: unknown };
	if (candidate.type === type) return true;
	return contains(candidate.props?.children, type);
}

const BASE: PanelFrameProps = { title: "Depth" };

describe("PanelFrame", () => {
	it("renders a section named by its title", () => {
		const element = PanelFrame(BASE);

		expect(element.type).toBe("section");
		expect(element.props["aria-label"]).toBe("Depth");
		expect(element.props["data-slot"]).toBe("panel-frame");
	});

	it("renders the title as a heading, not as decoration", () => {
		expect(contains(PanelFrame(BASE), "h2")).toBe(true);
		expect(textOf(PanelFrame(BASE))).toContain("Depth");
	});

	it("defaults to secondary priority so the grid always has something to obey", () => {
		expect(PanelFrame(BASE).props["data-priority"]).toBe("secondary");
	});

	it("carries the declared priority for the grid to degrade by", () => {
		expect(PanelFrame({ ...BASE, priority: "primary" }).props["data-priority"]).toBe("primary");
		expect(PanelFrame({ ...BASE, priority: "ancillary" }).props["data-priority"]).toBe("ancillary");
	});

	it("merges a caller className rather than dropping it", () => {
		expect(PanelFrame({ ...BASE, className: "col-span-2" }).props.className).toContain(
			"col-span-2",
		);
	});
});

describe("PanelFrame staleness", () => {
	it("marks staleness the same way the instruments do", () => {
		const element = PanelFrame({ ...BASE, stale: true });

		expect(element.props["data-stale"]).toBe("");
		expect(element.props["aria-label"]).toBe("Stale, Depth");
	});

	it("badges the header with a word, not colour alone", () => {
		expect(textOf(PanelFrame({ ...BASE, stale: true }))).toContain("Stale");
	});

	it("leaves the outer section undimmed so the header stays legible", () => {
		expect(String(PanelFrame({ ...BASE, stale: true }).props.className)).not.toContain(
			"opacity-45",
		);
	});

	it("carries no staleness marks when current", () => {
		const element = PanelFrame(BASE);

		expect(element.props["data-stale"]).toBeUndefined();
		expect(textOf(element)).not.toContain("Stale");
	});
});

describe("PanelFrame collapse and error states", () => {
	it("hides the body when collapsed but keeps the panel addressable", () => {
		const element = PanelFrame({ ...BASE, children: "gauge", collapsed: true });

		expect(element.props["data-collapsed"]).toBe("");
		expect(textOf(element)).not.toContain("gauge");
		expect(textOf(element)).toContain("Depth");
	});

	it("renders children when not collapsed", () => {
		expect(textOf(PanelFrame({ ...BASE, children: "gauge" }))).toContain("gauge");
	});

	it("replaces the body with the error rather than showing both", () => {
		const element = PanelFrame({ ...BASE, children: "gauge", error: "Source unreachable" });

		expect(textOf(element)).toContain("Source unreachable");
		expect(textOf(element)).not.toContain("gauge");
	});

	it("still shows an error message when the panel is also stale", () => {
		// The body dim is for untrustworthy readings; an error is not a reading.
		const element = PanelFrame({ ...BASE, error: "Source unreachable", stale: true });

		expect(textOf(element)).toContain("Source unreachable");
	});

	it("renders header actions alongside the title", () => {
		expect(textOf(PanelFrame({ ...BASE, actions: "m/ft" }))).toContain("m/ft");
	});

	it("renders nothing but the title when given no children, actions or error", () => {
		expect(textOf(PanelFrame(BASE))).toBe("Depth");
	});
});
