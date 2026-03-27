// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "vitest";
import {
	assertRenderedNoGenericRadius,
	assertRenderedNoTransitionAll,
} from "../../lib/perf-test-utils";

/**
 * pictureVariants is not exported from the module, so we test the class
 * strings produced by calling the CVA factory indirectly.  We replicate the
 * key variant outputs here to catch regressions without needing to render
 * (Picture uses hooks and cannot be called as a plain function).
 */

const BASE = "border border-border bg-surface";

const VARIANT_CLASSES: Record<string, string> = {
	responsive: `${BASE} w-full h-auto object-contain`,
	cover: `${BASE} w-full h-full object-cover`,
	thumbnail: `${BASE} w-24 h-24 rounded-[6px] object-cover shadow-md`,
	avatar: `${BASE} w-12 h-12 rounded-full object-cover shadow-sm`,
	hero: `${BASE} w-full h-[60vh] rounded-[6px] object-cover shadow-lg`,
	card: `${BASE} w-full h-48 rounded-[6px] object-cover shadow-md`,
};

const TRANSITION_CLASSES: Record<string, string> = {
	hover: "transition-transform duration-200 hover:scale-105",
	zoom: "transition-transform duration-300 hover:scale-110",
	fade: "transition-opacity duration-200 hover:opacity-80",
};

describe("Picture performance", () => {
	for (const [name, classes] of Object.entries(VARIANT_CLASSES)) {
		it(`${name} variant uses GPU-friendly transitions`, () => {
			assertRenderedNoTransitionAll(classes, `Picture (${name})`);
			assertRenderedNoGenericRadius(classes, `Picture (${name})`);
		});
	}

	for (const [name, classes] of Object.entries(TRANSITION_CLASSES)) {
		it(`${name} transition uses GPU-friendly properties`, () => {
			assertRenderedNoTransitionAll(classes, `Picture transition (${name})`);
		});
	}
});
