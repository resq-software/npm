// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { buttonVariants } from "./button";

describe("buttonVariants", () => {
	it("uses mono uppercase styling for the default button", () => {
		const classes = buttonVariants();

		expect(classes).toContain("bg-primary");
		expect(classes).toContain("font-mono");
		expect(classes).toContain("uppercase");
	});

	it("generates destructive variant classes", () => {
		const classes = buttonVariants({ variant: "destructive" });
		expect(classes).toContain("bg-destructive");
	});

	it("uses a branded primary border for the outline button", () => {
		const classes = buttonVariants({ variant: "outline" });

		expect(classes).toContain("border-primary");
		expect(classes).toContain("text-primary-text");
	});

	it("generates size classes for sm", () => {
		const classes = buttonVariants({ size: "sm" });
		expect(classes).toContain("h-7");
	});
});
