// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "vitest";

import {
	assertRenderedNoGenericRadius,
	assertRenderedNoTransitionAll,
} from "../../lib/perf-test-utils";
import { navigationMenuTriggerStyle } from "./navigation-menu";

describe("NavigationMenu performance", () => {
	it("navigationMenuTriggerStyle produces classes without transition-all", () => {
		const classes = navigationMenuTriggerStyle();
		assertRenderedNoTransitionAll(classes, "navigationMenuTriggerStyle");
	});

	it("navigationMenuTriggerStyle produces classes without generic radius", () => {
		const classes = navigationMenuTriggerStyle();
		assertRenderedNoGenericRadius(classes, "navigationMenuTriggerStyle");
	});
});
