// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
	assertHasDataSlot,
	assertRenderedNoGenericRadius,
	assertRenderedNoTransitionAll,
	collectClassNames,
	countElementNodes,
} from "../../lib/perf-test-utils";
import {
	Popover,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "./popover";

describe("Popover performance", () => {
	afterEach(() => vi.restoreAllMocks());

	it("PopoverTrigger rendered output has data-slot", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const html = renderToStaticMarkup(
			React.createElement(
				Popover,
				{ open: true },
				React.createElement(PopoverTrigger, null, "trigger"),
			),
		);
		expect(html).toContain("data-slot=");
	});

	it("PopoverTrigger rendered output has no transition-all", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const html = renderToStaticMarkup(
			React.createElement(
				Popover,
				{ open: true },
				React.createElement(PopoverTrigger, null, "trigger"),
			),
		);
		expect(html).not.toContain("transition-all");
	});

	it("PopoverHeader has no transition-all", () => {
		const el = PopoverHeader({ children: "Header" });
		const classes = collectClassNames(el);
		assertRenderedNoTransitionAll(classes, "PopoverHeader");
	});

	it("PopoverHeader has data-slot", () => {
		const el = PopoverHeader({ children: "Header" });
		assertHasDataSlot(el, "PopoverHeader");
	});

	it("PopoverTitle has no generic radius", () => {
		const el = PopoverTitle({ children: "Title" });
		const classes = collectClassNames(el);
		assertRenderedNoGenericRadius(classes, "PopoverTitle");
	});

	it("PopoverTitle has data-slot", () => {
		const el = PopoverTitle({ children: "Title" });
		assertHasDataSlot(el, "PopoverTitle");
	});

	it("PopoverDescription has data-slot", () => {
		const el = PopoverDescription({ children: "Description" });
		assertHasDataSlot(el, "PopoverDescription");
	});

	it("PopoverDescription element count is reasonable", () => {
		const el = PopoverDescription({ children: "Description" });
		expect(countElementNodes(el)).toBeLessThanOrEqual(3);
	});
});
