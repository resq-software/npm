// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

/**
 * Source-level quality regression guards.
 *
 * These complement the performance guards with checks for:
 *   A11y             → focus-visible styles on interactive components
 *   Font compliance  → correct font families per STYLE_GUIDE.md
 *   Semantic tokens  → no raw hex in className strings
 *   SSR safety       → no bare window/document outside hooks
 *   Reduced motion   → animations respect prefers-reduced-motion
 *   Prop forwarding  → className merging via cn()
 */

import { readFileSync } from "node:fs";
import { globSync } from "tinyglobby";
import { describe, it } from "vitest";

import {
	assertClassNameMerging,
	assertFontCompliance,
	assertInteractiveHasFocusVisible,
	assertNoRawHexInClassNames,
	assertReducedMotion,
	assertSSRSafe,
} from "./perf-test-utils";

const ROOT = new URL("../", import.meta.url).pathname;

const componentFiles = globSync("components/**/*.tsx", {
	cwd: ROOT,
	ignore: ["**/*.test.tsx", "**/*.stories.tsx", "**/*.perf.test.tsx"],
}).map((f) => ({
	abs: `${ROOT}${f}`,
	rel: f,
}));

describe("Quality regression guards", () => {
	describe("A11y — interactive elements have focus-visible styles", () => {
		for (const { abs, rel } of componentFiles) {
			it(rel, () => {
				const src = readFileSync(abs, "utf-8");
				assertInteractiveHasFocusVisible(src, rel);
			});
		}
	});

	describe("Style guide — font compliance", () => {
		for (const { abs, rel } of componentFiles) {
			it(rel, () => {
				const src = readFileSync(abs, "utf-8");
				assertFontCompliance(src, rel);
			});
		}
	});

	describe("Semantic tokens — no raw hex in classNames", () => {
		for (const { abs, rel } of componentFiles) {
			it(rel, () => {
				const src = readFileSync(abs, "utf-8");
				assertNoRawHexInClassNames(src, rel);
			});
		}
	});

	describe("SSR safety — no bare window/document outside hooks", () => {
		for (const { abs, rel } of componentFiles) {
			it(rel, () => {
				const src = readFileSync(abs, "utf-8");
				assertSSRSafe(src, rel);
			});
		}
	});

	describe("Reduced motion — animations respect prefers-reduced-motion", () => {
		for (const { abs, rel } of componentFiles) {
			it(rel, () => {
				const src = readFileSync(abs, "utf-8");
				assertReducedMotion(src, rel);
			});
		}
	});

	describe("Prop forwarding — className merging via cn()", () => {
		for (const { abs, rel } of componentFiles) {
			it(rel, () => {
				const src = readFileSync(abs, "utf-8");
				assertClassNameMerging(src, rel);
			});
		}
	});
});
