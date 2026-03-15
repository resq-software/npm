// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { SidebarGroupLabel } from "./sidebar";

describe("SidebarGroupLabel", () => {
	it("uses mono uppercase section label styling", () => {
		const element = SidebarGroupLabel({ children: "Operations" });

		expect(element.props.className).toContain("font-mono");
		expect(element.props.className).toContain("uppercase");
		expect(element.props.className).toContain("tracking-[0.18em]");
	});
});
