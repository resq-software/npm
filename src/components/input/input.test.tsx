// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { Input } from "./input";

describe("Input", () => {
	it("uses the branded dark surface styling by default", () => {
		const element = Input({ type: "text" });

		expect(element.props.className).toContain("bg-surface");
		expect(element.props.className).toContain("border-border");
	});
});
