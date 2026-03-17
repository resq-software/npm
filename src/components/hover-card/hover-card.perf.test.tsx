// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
	assertRenderedNoGenericRadius,
	assertRenderedNoTransitionAll,
} from "../../lib/perf-test-utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card";

describe("HoverCard performance", () => {
	afterEach(() => vi.restoreAllMocks());

	it("HoverCardTrigger rendered output has no transition-all", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const html = renderToStaticMarkup(
			React.createElement(
				HoverCard,
				{ open: true },
				React.createElement(HoverCardTrigger, null, "trigger"),
			),
		);
		expect(html).not.toContain("transition-all");
	});

	it("HoverCardTrigger rendered output has data-slot", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const html = renderToStaticMarkup(
			React.createElement(
				HoverCard,
				{ open: true },
				React.createElement(HoverCardTrigger, null, "trigger"),
			),
		);
		expect(html).toContain("data-slot=");
	});

	it("HoverCardTrigger DOM node count is reasonable", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const html = renderToStaticMarkup(
			React.createElement(
				HoverCard,
				{ open: true },
				React.createElement(HoverCardTrigger, null, "trigger"),
			),
		);
		const nodeCount = (html.match(/<[a-z]/gi) || []).length;
		expect(nodeCount).toBeLessThanOrEqual(10);
	});

	it("HoverCardContent class strings have no generic radius", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const el = HoverCardContent({ children: "content" });
		const classes = JSON.stringify(el);
		assertRenderedNoGenericRadius(classes, "HoverCardContent");
	});

	it("HoverCardContent class strings have no transition-all", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const el = HoverCardContent({ children: "content" });
		const classes = JSON.stringify(el);
		assertRenderedNoTransitionAll(classes, "HoverCardContent");
	});
});
