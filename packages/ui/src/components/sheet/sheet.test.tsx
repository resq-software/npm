// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { SheetTitle } from "./sheet";

describe("SheetTitle", () => {
	it("uses display typography for overlay titles", () => {
		const element = SheetTitle({ children: "Responder details" });

		expect(element.props.className).toContain("font-display");
		expect(element.props.className).toContain("font-bold");
	});
});
