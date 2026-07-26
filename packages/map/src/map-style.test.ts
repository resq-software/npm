// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { DEFAULT_MAP_STYLE_URL, resolveMapStyle } from "./map-style";

describe("resolveMapStyle", () => {
	it("returns the default when no override is given", () => {
		expect(resolveMapStyle()).toBe(DEFAULT_MAP_STYLE_URL);
		expect(resolveMapStyle(undefined)).toBe(DEFAULT_MAP_STYLE_URL);
	});

	it("uses a non-empty override", () => {
		expect(resolveMapStyle("https://tiles.example.com/style.json")).toBe(
			"https://tiles.example.com/style.json",
		);
	});

	it("falls back to the default for blank overrides", () => {
		expect(resolveMapStyle("")).toBe(DEFAULT_MAP_STYLE_URL);
		expect(resolveMapStyle("   ")).toBe(DEFAULT_MAP_STYLE_URL);
	});
});
