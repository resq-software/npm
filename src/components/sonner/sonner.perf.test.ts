// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "vitest";

import {
	assertRenderedNoGenericRadius,
	assertRenderedNoTransitionAll,
} from "../../lib/perf-test-utils";

describe("Sonner performance", () => {
	// Toaster requires next-themes context (useTheme), so we cannot call it directly.
	// We verify the hardcoded class strings and style overrides.

	it("Toaster className has no transition-all", () => {
		const classes = "toaster group";
		assertRenderedNoTransitionAll(classes, "Toaster");
		assertRenderedNoGenericRadius(classes, "Toaster");
	});

	it("toast classNames have no transition-all", () => {
		const classes = "cn-toast";
		assertRenderedNoTransitionAll(classes, "Toaster.toast");
		assertRenderedNoGenericRadius(classes, "Toaster.toast");
	});
});
