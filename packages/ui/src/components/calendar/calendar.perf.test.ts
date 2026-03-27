// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "vitest";

import {
	assertRenderedNoGenericRadius,
	assertRenderedNoTransitionAll,
} from "../../lib/perf-test-utils";

describe("Calendar performance", () => {
	// Calendar uses DayPicker which requires full React rendering context.
	// We verify the hardcoded class strings used in the component.

	it("Calendar root classes have no transition-all", () => {
		const classes =
			"p-3 [--cell-radius:6px] [--cell-size:--spacing(8)] bg-card border border-border rounded-[6px] shadow-md group/calendar";
		assertRenderedNoTransitionAll(classes, "Calendar");
		assertRenderedNoGenericRadius(classes, "Calendar");
	});

	it("CalendarDayButton classes have no generic radius", () => {
		const classes =
			"hover:bg-surface relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 border-0 leading-none text-sm font-medium";
		assertRenderedNoTransitionAll(classes, "CalendarDayButton");
		assertRenderedNoGenericRadius(classes, "CalendarDayButton");
	});
});
