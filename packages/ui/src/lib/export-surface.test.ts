// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

/**
 * Export surface regression test.
 *
 * Snapshots every named export from the main barrel to catch accidental
 * removals that would break consumers.
 */

import { describe, expect, it } from "vitest";

import * as barrel from "../index";

describe("Export surface", () => {
	it("barrel exports all expected public symbols", () => {
		const exports = Object.keys(barrel).sort();
		expect(exports).toMatchSnapshot();
	});

	it("does not export fewer symbols than the established baseline", () => {
		const exports = Object.keys(barrel);
		// Baseline: if someone removes an export, this fails.
		// Update the number when intentionally adding new exports.
		expect(exports.length).toBeGreaterThanOrEqual(100);
	});

	it("every export is defined (not undefined)", () => {
		for (const [name, value] of Object.entries(barrel)) {
			expect(value, `export "${name}" is undefined`).toBeDefined();
		}
	});
});
