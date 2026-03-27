// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "vitest";

import {
	assertRenderedNoGenericRadius,
	assertRenderedNoTransitionAll,
} from "../../lib/perf-test-utils";
import { toggleVariants } from "../toggle/toggle";

describe("ToggleGroup performance", () => {
	// ToggleGroupItem requires ToggleGroupContext, so we test the underlying
	// toggleVariants CVA function that produces the class strings.

	it("toggleVariants default has no transition-all", () => {
		const classes = toggleVariants({ size: "default", variant: "default" });
		assertRenderedNoTransitionAll(classes, "toggleVariants(default)");
		assertRenderedNoGenericRadius(classes, "toggleVariants(default)");
	});

	it("toggleVariants outline has no transition-all", () => {
		const classes = toggleVariants({ size: "default", variant: "outline" });
		assertRenderedNoTransitionAll(classes, "toggleVariants(outline)");
		assertRenderedNoGenericRadius(classes, "toggleVariants(outline)");
	});

	it("toggleVariants sm has no generic radius", () => {
		const classes = toggleVariants({ size: "sm", variant: "default" });
		assertRenderedNoTransitionAll(classes, "toggleVariants(sm)");
		assertRenderedNoGenericRadius(classes, "toggleVariants(sm)");
	});
});
