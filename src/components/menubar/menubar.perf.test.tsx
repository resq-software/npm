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
import { Menubar, MenubarItem, MenubarSeparator, MenubarShortcut } from "./menubar";

describe("Menubar performance", () => {
	afterEach(() => vi.restoreAllMocks());

	it("Menubar rendered output has no transition-all", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const html = renderToStaticMarkup(React.createElement(Menubar, null));
		expect(html).not.toContain("transition-all");
	});

	it("Menubar rendered output has data-slot", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const html = renderToStaticMarkup(React.createElement(Menubar, null));
		expect(html).toContain("data-slot=");
	});

	it("Menubar DOM node count is reasonable", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const html = renderToStaticMarkup(React.createElement(Menubar, null));
		const nodeCount = (html.match(/<[a-z]/gi) || []).length;
		expect(nodeCount).toBeLessThanOrEqual(10);
	});

	it("MenubarItem has no transition-all", () => {
		const el = MenubarItem({ children: "Item" });
		const classes = collectClassNames(el);
		assertRenderedNoTransitionAll(classes, "MenubarItem");
	});

	it("MenubarItem has no generic radius", () => {
		const el = MenubarItem({ children: "Item" });
		const classes = collectClassNames(el);
		assertRenderedNoGenericRadius(classes, "MenubarItem");
	});

	it("MenubarItem has data-slot", () => {
		const el = MenubarItem({ children: "Item" });
		assertHasDataSlot(el, "MenubarItem");
	});

	it("MenubarSeparator has data-slot", () => {
		const el = MenubarSeparator({});
		assertHasDataSlot(el, "MenubarSeparator");
	});

	it("MenubarShortcut has data-slot and reasonable element count", () => {
		const el = MenubarShortcut({ children: "⌘K" });
		assertHasDataSlot(el, "MenubarShortcut");
		expect(countElementNodes(el)).toBeLessThanOrEqual(3);
	});
});
