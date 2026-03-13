// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { buttonVariants } from "./button";

describe("buttonVariants", () => {
	it("generates default variant classes", () => {
		const classes = buttonVariants();
		expect(classes).toContain("bg-primary");
	});

	it("generates destructive variant classes", () => {
		const classes = buttonVariants({ variant: "destructive" });
		expect(classes).toContain("bg-destructive");
	});

	it("generates outline variant classes", () => {
		const classes = buttonVariants({ variant: "outline" });
		expect(classes).toContain("border");
	});

	it("generates size classes for sm", () => {
		const classes = buttonVariants({ size: "sm" });
		expect(classes).toContain("h-7");
	});
});
