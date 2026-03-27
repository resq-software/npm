// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { FieldLegend } from "./field";

describe("FieldLegend", () => {
	it("uses mono uppercase legend styling for section labels", () => {
		const element = FieldLegend({ children: "Mission details" });

		expect(element.props.className).toContain("font-mono");
		expect(element.props.className).toContain("uppercase");
		expect(element.props.className).toContain("tracking-[0.18em]");
	});
});
