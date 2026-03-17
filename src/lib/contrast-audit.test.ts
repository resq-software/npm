// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

/**
 * WCAG contrast compliance test.
 *
 * Reads color tokens directly from globals.css and validates every
 * foreground/background pair against WCAG AA thresholds.
 * If someone changes a token value and breaks contrast, this test fails.
 *
 * Also validates the multi-format color parser (hex, rgb, hsl, oklch,
 * oklab, lab, lch, named colors).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
	contrastRatio,
	DEFAULT_PAIRS,
	extractTokensFromCSS,
	formatAudit,
	relativeLuminance,
	runContrastAudit,
	toLinearRGB,
} from "./contrast-audit";

// ─── Multi-format parser tests ──────────────────────────────────────────────

describe("toLinearRGB parser", () => {
	it("parses hex (#RRGGBB)", () => {
		const rgb = toLinearRGB("#ffffff");
		expect(rgb.r).toBeCloseTo(1, 3);
		expect(rgb.g).toBeCloseTo(1, 3);
		expect(rgb.b).toBeCloseTo(1, 3);
	});

	it("parses shorthand hex (#RGB)", () => {
		const rgb = toLinearRGB("#000");
		expect(rgb.r).toBeCloseTo(0, 3);
	});

	it("parses rgb()", () => {
		const rgb = toLinearRGB("rgb(255, 255, 255)");
		expect(rgb.r).toBeCloseTo(1, 3);
	});

	it("parses rgb() with spaces (CSS4)", () => {
		const rgb = toLinearRGB("rgb(0 0 0)");
		expect(rgb.r).toBeCloseTo(0, 3);
	});

	it("parses hsl()", () => {
		const rgb = toLinearRGB("hsl(0, 0%, 100%)");
		expect(relativeLuminance(rgb)).toBeCloseTo(1, 2);
	});

	it("parses oklch()", () => {
		const rgb = toLinearRGB("oklch(100% 0 0)");
		expect(relativeLuminance(rgb)).toBeCloseTo(1, 2);
	});

	it("parses oklab()", () => {
		const rgb = toLinearRGB("oklab(100% 0 0)");
		expect(relativeLuminance(rgb)).toBeCloseTo(1, 2);
	});

	it("parses lab()", () => {
		const rgb = toLinearRGB("lab(100% 0 0)");
		expect(relativeLuminance(rgb)).toBeCloseTo(1, 1);
	});

	it("parses lch()", () => {
		const rgb = toLinearRGB("lch(0% 0 0)");
		expect(relativeLuminance(rgb)).toBeCloseTo(0, 2);
	});

	it("parses CSS named colors", () => {
		const white = toLinearRGB("white");
		expect(relativeLuminance(white)).toBeCloseTo(1, 3);
		const black = toLinearRGB("black");
		expect(relativeLuminance(black)).toBeCloseTo(0, 3);
	});

	it("throws on unsupported format", () => {
		expect(() => toLinearRGB("not-a-color")).toThrow("Unsupported color format");
	});

	it("white-on-black contrast is 21:1", () => {
		const wLum = relativeLuminance(toLinearRGB("#ffffff"));
		const bLum = relativeLuminance(toLinearRGB("#000000"));
		expect(contrastRatio(wLum, bLum)).toBeCloseTo(21, 0);
	});
});

// ─── Theme extraction + compliance ──────────────────────────────────────────

const cssPath = resolve(import.meta.dirname, "../styles/globals.css");
const css = readFileSync(cssPath, "utf-8");
const themes = extractTokensFromCSS(css);

describe("WCAG contrast compliance", () => {
	it("extracts both dark and light themes from globals.css", () => {
		expect(Object.keys(themes)).toContain("dark");
		expect(Object.keys(themes)).toContain("light");
		expect(Object.keys(themes.dark).length).toBeGreaterThan(10);
		expect(Object.keys(themes.light).length).toBeGreaterThan(10);
	});

	for (const [mode, tokens] of Object.entries(themes)) {
		describe(`${mode} mode`, () => {
			for (const pair of DEFAULT_PAIRS) {
				if (!tokens[pair.fg] || !tokens[pair.bg]) continue;

				it(`${pair.fg} on ${pair.bg} meets ${pair.minRatio}:1 (${pair.label})`, () => {
					const { audits } = runContrastAudit({ [mode]: tokens }, [pair]);
					const result = audits[0].results[0];
					expect(
						result.pass,
						`${result.fg} on ${result.bg}: ${result.ratio.toFixed(2)}:1 (need ${result.required}:1)`,
					).toBe(true);
				});
			}
		});
	}

	it("full audit passes with report", () => {
		const { globalPass, audits } = runContrastAudit(themes);
		if (!globalPass) {
			const report = audits.map(formatAudit).join("\n\n");
			const failures = audits
				.flatMap((a) => a.results)
				.filter((r) => !r.pass)
				.map((r) => `${r.fg} on ${r.bg}: ${r.ratio.toFixed(2)}:1 (need ${r.required}:1)`)
				.join("\n  ");
			throw new Error(`Contrast failures:\n  ${failures}\n\n${report}`);
		}
		expect(globalPass).toBe(true);
	});
});
