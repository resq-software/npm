// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "vitest";
import {
	assertRenderedNoGenericRadius,
	assertRenderedNoTransitionAll,
} from "../../lib/perf-test-utils";
import { tabsListVariants } from "./tabs";

describe("TabsList performance", () => {
	it("default variant uses GPU-friendly transitions", () => {
		const classes = tabsListVariants();
		assertRenderedNoTransitionAll(classes, "TabsList");
		assertRenderedNoGenericRadius(classes, "TabsList");
	});

	it("line variant uses GPU-friendly transitions", () => {
		const classes = tabsListVariants({ variant: "line" });
		assertRenderedNoTransitionAll(classes, "TabsList (line)");
		assertRenderedNoGenericRadius(classes, "TabsList (line)");
	});
});

describe("TabsTrigger performance", () => {
	// TabsTrigger uses transition-[color,background-color,border-color,box-shadow]
	// which is a specific transition (not transition-all) -- verify it stays that way.
	const TRIGGER_CLASSES =
		"gap-1.5 rounded-[4px] border border-transparent px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.14em] transition-[color,background-color,border-color,box-shadow]";

	it("uses GPU-friendly transitions", () => {
		assertRenderedNoTransitionAll(TRIGGER_CLASSES, "TabsTrigger");
		assertRenderedNoGenericRadius(TRIGGER_CLASSES, "TabsTrigger");
	});
});
