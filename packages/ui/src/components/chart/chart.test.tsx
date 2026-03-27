// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChartContainer } from "./chart";

describe("ChartContainer", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("uses telemetry-style chart shell styling", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});

		const html = renderToStaticMarkup(
			React.createElement(
				ChartContainer,
				{
					config: {
						missions: { color: "var(--chart-1)", label: "Missions" },
					},
				},
				React.createElement("div", null, "chart"),
			),
		);

		expect(html).toContain("bg-card");
		expect(html).toContain("border-border");
	});
});
