// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { Progress } from "./progress";

describe("Progress", () => {
	it("uses a branded dark track and accent fill", () => {
		const element = Progress({ value: 42 });
		const indicator = element.props.children;

		expect(element.props.className).toContain("bg-surface");
		expect(element.props.className).toContain("border");
		expect(indicator.props.className).toContain("bg-primary");
	});
});
