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
import { Select, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "./select";

describe("Select performance", () => {
	afterEach(() => vi.restoreAllMocks());

	it("SelectTrigger rendered output has no transition-all", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const html = renderToStaticMarkup(
			React.createElement(
				Select,
				null,
				React.createElement(
					SelectTrigger,
					null,
					React.createElement(SelectValue, { placeholder: "Select" }),
				),
			),
		);
		expect(html).not.toContain("transition-all");
	});

	it("SelectTrigger rendered output has data-slot", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const html = renderToStaticMarkup(
			React.createElement(
				Select,
				null,
				React.createElement(
					SelectTrigger,
					null,
					React.createElement(SelectValue, { placeholder: "Select" }),
				),
			),
		);
		expect(html).toContain("data-slot=");
	});

	it("SelectTrigger DOM node count is reasonable", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const html = renderToStaticMarkup(
			React.createElement(
				Select,
				null,
				React.createElement(
					SelectTrigger,
					null,
					React.createElement(SelectValue, { placeholder: "Select" }),
				),
			),
		);
		const nodeCount = (html.match(/<[a-z]/gi) || []).length;
		expect(nodeCount).toBeLessThanOrEqual(10);
	});

	it("SelectLabel has data-slot", () => {
		const el = SelectLabel({ children: "Label" });
		assertHasDataSlot(el, "SelectLabel");
	});

	it("SelectLabel has no generic radius", () => {
		const el = SelectLabel({ children: "Label" });
		const classes = collectClassNames(el);
		assertRenderedNoGenericRadius(classes, "SelectLabel");
	});

	it("SelectSeparator has data-slot", () => {
		const el = SelectSeparator({});
		assertHasDataSlot(el, "SelectSeparator");
	});

	it("SelectSeparator has no transition-all", () => {
		const el = SelectSeparator({});
		const classes = collectClassNames(el);
		assertRenderedNoTransitionAll(classes, "SelectSeparator");
	});

	it("SelectLabel element count is reasonable", () => {
		const el = SelectLabel({ children: "Label" });
		expect(countElementNodes(el)).toBeLessThanOrEqual(3);
	});
});
