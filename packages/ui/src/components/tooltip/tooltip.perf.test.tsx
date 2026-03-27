// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
	assertRenderedNoGenericRadius,
	assertRenderedNoTransitionAll,
} from "../../lib/perf-test-utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

describe("Tooltip performance", () => {
	afterEach(() => vi.restoreAllMocks());

	it("TooltipTrigger rendered output has no transition-all", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const html = renderToStaticMarkup(
			React.createElement(
				Tooltip,
				{ open: true },
				React.createElement(TooltipTrigger, null, "trigger"),
			),
		);
		expect(html).not.toContain("transition-all");
	});

	it("TooltipTrigger rendered output has data-slot", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const html = renderToStaticMarkup(
			React.createElement(
				Tooltip,
				{ open: true },
				React.createElement(TooltipTrigger, null, "trigger"),
			),
		);
		expect(html).toContain("data-slot=");
	});

	it("TooltipTrigger DOM node count is reasonable", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const html = renderToStaticMarkup(
			React.createElement(
				Tooltip,
				{ open: true },
				React.createElement(TooltipTrigger, null, "trigger"),
			),
		);
		const nodeCount = (html.match(/<[a-z]/gi) || []).length;
		expect(nodeCount).toBeLessThanOrEqual(10);
	});

	it("TooltipContent class strings have no generic radius", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const el = TooltipContent({ children: "content" });
		const classes = JSON.stringify(el);
		assertRenderedNoGenericRadius(classes, "TooltipContent");
	});

	it("TooltipContent class strings have no transition-all", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const el = TooltipContent({ children: "content" });
		const classes = JSON.stringify(el);
		assertRenderedNoTransitionAll(classes, "TooltipContent");
	});
});
