// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { TableHead } from "./table";

describe("TableHead", () => {
	it("uses data-label styling for table headers", () => {
		const element = TableHead({ children: "Zone" });

		expect(element.props.className).toContain("font-mono");
		expect(element.props.className).toContain("uppercase");
		expect(element.props.className).toContain("text-hint");
	});
});
