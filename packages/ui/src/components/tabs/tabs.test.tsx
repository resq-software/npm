// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { TabsTrigger } from "./tabs";

describe("TabsTrigger", () => {
	it("uses mono uppercase tab styling", () => {
		const element = TabsTrigger({ children: "Overview", value: "overview" });

		expect(element.props.className).toContain("font-mono");
		expect(element.props.className).toContain("uppercase");
		expect(element.props.className).toContain("tracking-[0.14em]");
	});
});
