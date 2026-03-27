// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from "vitest";

import {
	collectRenderedViolations,
	countElementNodes,
	formatViolationReport,
	hasBlockingViolations,
} from "../../lib/perf-test-utils";
import {
	ComboboxChip,
	ComboboxEmpty,
	ComboboxItem,
	ComboboxLabel,
	ComboboxSeparator,
} from "./combobox";

describe("Combobox performance", () => {
	afterEach(() => vi.restoreAllMocks());

	it("ComboboxItem has no blocking perf violations", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const el = ComboboxItem({ children: "Item", value: "item" });
		const violations = collectRenderedViolations(el, "ComboboxItem");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("ComboboxLabel has no blocking perf violations", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const el = ComboboxLabel({ children: "Label" });
		const violations = collectRenderedViolations(el, "ComboboxLabel");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("ComboboxEmpty has no blocking perf violations", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const el = ComboboxEmpty({ children: "No results" });
		const violations = collectRenderedViolations(el, "ComboboxEmpty");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("ComboboxSeparator has no blocking perf violations", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const el = ComboboxSeparator({});
		const violations = collectRenderedViolations(el, "ComboboxSeparator");
		if (hasBlockingViolations(violations)) {
			throw new Error(formatViolationReport(violations));
		}
	});

	it("ComboboxChip element count is reasonable", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const el = ComboboxChip({ children: "Chip", showRemove: false });
		expect(countElementNodes(el)).toBeLessThanOrEqual(5);
	});
});
