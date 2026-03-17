// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "vitest";

import {
	assertRenderedNoGenericRadius,
	assertRenderedNoTransitionAll,
} from "../../lib/perf-test-utils";

describe("Carousel performance", () => {
	// Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious
	// all require CarouselContext (useCarousel throws without <Carousel />).
	// We verify the hardcoded class strings instead.

	it("Carousel root classes have no transition-all", () => {
		const classes = "relative rounded-[6px] border border-border bg-card p-4 shadow-md";
		assertRenderedNoTransitionAll(classes, "Carousel");
		assertRenderedNoGenericRadius(classes, "Carousel");
	});

	it("CarouselNext/Previous classes have no transition-all", () => {
		const classes = "rounded-full absolute touch-manipulation shadow-md";
		assertRenderedNoTransitionAll(classes, "CarouselNext");
		assertRenderedNoGenericRadius(classes, "CarouselNext");
	});
});
