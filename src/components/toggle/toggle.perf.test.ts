// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "vitest";

import {
	assertRenderedNoGenericRadius,
	assertRenderedNoTransitionAll,
} from "../../lib/perf-test-utils";
import { toggleVariants } from "./toggle";

const variants = ["default", "outline"] as const;
const sizes = ["default", "sm", "lg"] as const;

describe("Toggle performance", () => {
	for (const variant of variants) {
		for (const size of sizes) {
			it(`variant=${variant} size=${size} uses GPU-friendly transitions`, () => {
				const classes = toggleVariants({ variant, size });
				assertRenderedNoTransitionAll(classes, "Toggle");
				assertRenderedNoGenericRadius(classes, "Toggle");
			});
		}
	}
});
