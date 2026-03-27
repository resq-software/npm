// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "vitest";

import {
	assertRenderedNoGenericRadius,
	assertRenderedNoTransitionAll,
} from "../../lib/perf-test-utils";
import { buttonVariants } from "./button";

const variants = [
	"default",
	"destructive",
	"ghost",
	"link",
	"outline",
	"secondary",
	"urgent",
] as const;
const sizes = ["default", "sm", "xs", "lg", "icon", "icon-sm", "icon-xs", "icon-lg"] as const;

describe("Button performance", () => {
	for (const variant of variants) {
		for (const size of sizes) {
			it(`variant=${variant} size=${size} uses GPU-friendly transitions`, () => {
				const classes = buttonVariants({ variant, size });
				assertRenderedNoTransitionAll(classes, "Button");
				assertRenderedNoGenericRadius(classes, "Button");
			});
		}
	}
});
