// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

/**
 * Source-level performance regression guards.
 *
 * Reads every component source file and runs the full
 * `collectSourceViolations` suite — catching issues across all six
 * Storybook Performance panel categories:
 *
 *   Frame Timing        → transition-all, expensive animations, will-change budget
 *   Layout & Stability  → generic radius, layout transitions, forced reflow reads
 *   Style Writes        → direct .style mutation, classList mutation
 *   React Performance   → .map() without key, inline handler arrows
 *   Input Responsiveness → blocking wheel/touch listeners
 */

import { readFileSync } from "node:fs";
import { globSync } from "tinyglobby";
import { describe, it } from "vitest";

import { collectSourceViolations, formatViolationReport } from "./perf-test-utils";

const ROOT = new URL("../", import.meta.url).pathname;

const componentFiles = globSync("components/**/*.tsx", {
	cwd: ROOT,
	ignore: ["**/*.test.tsx", "**/*.stories.tsx", "**/*.perf.test.tsx"],
}).map((f) => ({
	abs: `${ROOT}${f}`,
	rel: f,
}));

describe("Performance regression guards", () => {
	for (const { abs, rel } of componentFiles) {
		it(`${rel} — no blocking violations`, () => {
			const src = readFileSync(abs, "utf-8");
			const violations = collectSourceViolations(src, rel);
			const blocking = violations.filter((v) => v.severity === "error");

			if (blocking.length > 0) {
				throw new Error(
					`${blocking.length} blocking performance violation(s):\n${formatViolationReport(blocking)}`,
				);
			}
		});
	}
});
