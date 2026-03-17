// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { badgeVariants } from "./badge";

describe("badgeVariants", () => {
	it("uses mono uppercase styling for the default badge", () => {
		const classes = badgeVariants();

		expect(classes).toContain("font-mono");
		expect(classes).toContain("uppercase");
		expect(classes).toContain("bg-success/10");
	});

	it("keeps destructive badges on the destructive semantic color", () => {
		const classes = badgeVariants({ variant: "destructive" });

		expect(classes).toContain("bg-destructive/10");
		expect(classes).toContain("text-destructive-text");
	});
});
