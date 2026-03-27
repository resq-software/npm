// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { DialogTitle } from "./dialog";

describe("DialogTitle", () => {
	it("uses display typography for overlay titles", () => {
		const element = DialogTitle({ children: "Incident response" });

		expect(element.props.className).toContain("font-display");
		expect(element.props.className).toContain("font-bold");
	});
});
