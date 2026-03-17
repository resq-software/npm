// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
	assertRenderedNoGenericRadius,
	assertRenderedNoTransitionAll,
	collectClassNames,
	countElementNodes,
} from "../../lib/perf-test-utils";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "./dialog";

describe("Dialog performance", () => {
	afterEach(() => vi.restoreAllMocks());

	it("DialogContent rendered output has no transition-all", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const html = renderToStaticMarkup(
			React.createElement(
				Dialog,
				{ open: true, modal: false },
				React.createElement(DialogContent, { showCloseButton: false }, "test"),
			),
		);
		expect(html).not.toContain("transition-all");
	});

	it("Dialog root element has data-slot", () => {
		const el = Dialog({});
		expect(el.props["data-slot"]).toBe("dialog");
	});

	it("DialogContent DOM node count is reasonable", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const html = renderToStaticMarkup(
			React.createElement(
				Dialog,
				{ open: true, modal: false },
				React.createElement(DialogContent, { showCloseButton: false }, "test"),
			),
		);
		const nodeCount = (html.match(/<[a-z]/gi) || []).length;
		expect(nodeCount).toBeLessThanOrEqual(10);
	});

	it("DialogHeader has no generic radius", () => {
		const el = DialogHeader({ className: "", children: "Header" });
		const classes = collectClassNames(el);
		assertRenderedNoGenericRadius(classes, "DialogHeader");
	});

	it("DialogFooter has no transition-all", () => {
		const el = DialogFooter({ className: "", children: "Footer" });
		const classes = collectClassNames(el);
		assertRenderedNoTransitionAll(classes, "DialogFooter");
	});

	it("DialogFooter element count is reasonable", () => {
		const el = DialogFooter({ children: "Footer" });
		expect(countElementNodes(el)).toBeLessThanOrEqual(5);
	});
});
