// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { navigationMenuTriggerStyle } from "./navigation-menu";

describe("navigationMenuTriggerStyle", () => {
	it("uses mono uppercase navigation styling", () => {
		const classes = navigationMenuTriggerStyle();

		expect(classes).toContain("font-mono");
		expect(classes).toContain("uppercase");
		expect(classes).toContain("tracking-[0.14em]");
	});
});
