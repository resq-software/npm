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
import { Command, CommandSeparator, CommandShortcut } from "./command";

describe("Command performance", () => {
	afterEach(() => vi.restoreAllMocks());

	it("Command rendered output has no transition-all", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const html = renderToStaticMarkup(React.createElement(Command, null));
		expect(html).not.toContain("transition-all");
	});

	it("Command rendered output has data-slot", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const html = renderToStaticMarkup(React.createElement(Command, null));
		expect(html).toContain("data-slot=");
	});

	it("Command DOM node count is reasonable", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const html = renderToStaticMarkup(React.createElement(Command, null));
		const nodeCount = (html.match(/<[a-z]/gi) || []).length;
		expect(nodeCount).toBeLessThanOrEqual(10);
	});

	it("CommandShortcut has data-slot", () => {
		const el = CommandShortcut({ children: "⌘K" });
		assertHasDataSlot(el, "CommandShortcut");
	});

	it("CommandShortcut has no transition-all", () => {
		const el = CommandShortcut({ children: "⌘K" });
		const classes = collectClassNames(el);
		assertRenderedNoTransitionAll(classes, "CommandShortcut");
	});

	it("CommandShortcut element count is reasonable", () => {
		const el = CommandShortcut({ children: "⌘K" });
		expect(countElementNodes(el)).toBeLessThanOrEqual(3);
	});

	it("CommandSeparator has no generic radius", () => {
		const el = CommandSeparator({});
		const classes = collectClassNames(el);
		assertRenderedNoGenericRadius(classes, "CommandSeparator");
	});

	it("CommandSeparator has data-slot", () => {
		const el = CommandSeparator({});
		assertHasDataSlot(el, "CommandSeparator");
	});
});
