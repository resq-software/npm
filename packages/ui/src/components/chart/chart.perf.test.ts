// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "vitest";

import {
	assertRenderedNoGenericRadius,
	assertRenderedNoTransitionAll,
} from "../../lib/perf-test-utils";

describe("Chart performance", () => {
	// ChartContainer requires ChartContext and ResponsiveContainer; we verify class strings.

	it("ChartContainer classes have no transition-all", () => {
		const classes =
			"bg-card border border-border rounded-[6px] p-4 shadow-md flex aspect-video justify-center text-xs";
		assertRenderedNoTransitionAll(classes, "ChartContainer");
		assertRenderedNoGenericRadius(classes, "ChartContainer");
	});

	it("ChartTooltipContent wrapper classes have no transition-all", () => {
		const classes =
			"border-border bg-card gap-2 rounded-[6px] border px-3 py-2 text-xs shadow-xl grid min-w-[9rem] items-start";
		assertRenderedNoTransitionAll(classes, "ChartTooltipContent");
		assertRenderedNoGenericRadius(classes, "ChartTooltipContent");
	});
});
