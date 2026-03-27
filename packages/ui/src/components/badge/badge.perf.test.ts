// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "vitest";

import {
	assertRenderedNoGenericRadius,
	assertRenderedNoTransitionAll,
} from "../../lib/perf-test-utils";
import { badgeVariants } from "./badge";

const variants = ["default", "destructive", "ghost", "link", "outline", "secondary"] as const;

describe("Badge performance", () => {
	for (const variant of variants) {
		it(`variant=${variant} uses GPU-friendly transitions`, () => {
			const classes = badgeVariants({ variant });
			assertRenderedNoTransitionAll(classes, "Badge");
			assertRenderedNoGenericRadius(classes, "Badge");
		});
	}
});
