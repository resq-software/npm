// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { DrawerTitle } from "./drawer";

describe("DrawerTitle", () => {
	it("uses display typography for overlay titles", () => {
		const element = DrawerTitle({ children: "Deployment summary" });

		expect(element.props.className).toContain("font-display");
		expect(element.props.className).toContain("font-bold");
	});
});
