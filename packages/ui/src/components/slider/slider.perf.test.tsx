// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Slider } from "./slider";

describe("Slider performance", () => {
	afterEach(() => vi.restoreAllMocks());

	it("rendered output has data-slot", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const html = renderToStaticMarkup(React.createElement(Slider, {}));
		expect(html).toContain('data-slot="slider"');
	});

	it("uses GPU-friendly transitions", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const html = renderToStaticMarkup(React.createElement(Slider, {}));
		expect(html).not.toContain("transition-all");
	});
});
