/**
 * Copyright 2026 ResQ Systems, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { colors, fonts, radii } from "@resq-systems/constants/tokens";
import { describe, expect, it } from "vitest";

/**
 * Drift guard: `@resq-systems/constants` is the canonical source of truth for the
 * shared design tokens. This asserts `globals.css` carries the same values so the
 * UI CSS and the constants package (which email + other apps consume) can never
 * silently diverge. Covers the six oklch brand roles, the `--radius-*` scale, the
 * `--chart-1..5` palette, `--surface`, and the primary font families.
 *
 * Font *fallback stacks* are intentionally NOT compared: `@resq-systems/constants`
 * ships email-safe fallbacks (`fonts.stacks`, consumed by
 * `@resq-systems/email-templates`) while `globals.css` uses web-generic fallbacks;
 * only the primary family (the brand-meaningful token) is guarded here.
 *
 * `@resq-systems/constants` is the single source; update it, then update
 * `globals.css` to match.
 */
const css = readFileSync(join(process.cwd(), "src", "styles", "globals.css"), "utf8");

/** Parse `oklch(L% C H)` into a numeric [L, C, H] tuple (ignores formatting). */
function parseOklch(value: string): [number, number, number] {
	const match = value.match(/oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)/i);
	if (!match) throw new Error(`Not an oklch value: ${value}`);
	return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Read a `--<name>: oklch(...)` custom property from globals.css. */
function cssVar(name: string): [number, number, number] {
	const match = css.match(new RegExp(`--${name}:\\s*(oklch\\([^)]+\\))`));
	if (!match) throw new Error(`--${name} not found in globals.css`);
	return parseOklch(match[1]);
}

/** Read a raw custom-property value (everything up to the terminating `;`). */
function cssRaw(name: string): string {
	const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
	if (!match) throw new Error(`--${name} not found in globals.css`);
	return match[1].trim();
}

/**
 * Resolve a radius custom property to pixels, following `var(--radius-*)`
 * references and `calc(var(--radius-*) + Npx)` expressions.
 */
function radiusPx(name: string): number {
	const raw = cssRaw(name);
	const literal = raw.match(/^([\d.]+)px$/);
	if (literal) return Number(literal[1]);
	const varRef = raw.match(/^var\(--([\w-]+)\)$/);
	if (varRef) return radiusPx(varRef[1]);
	const calcRef = raw.match(/^calc\(\s*var\(--([\w-]+)\)\s*\+\s*([\d.]+)px\s*\)$/);
	if (calcRef) return radiusPx(calcRef[1]) + Number(calcRef[2]);
	throw new Error(`Unsupported radius expression for --${name}: ${raw}`);
}

/** First (primary) font family of a `--<name>` stack, surrounding quotes stripped. */
function cssPrimaryFont(name: string): string {
	return cssRaw(name)
		.split(",")[0]
		.trim()
		.replace(/^['"]|['"]$/g, "");
}

/** constants token → the globals.css custom property that must carry the same value. */
const mapping: Record<keyof typeof colors.oklch, string> = {
	background: "background",
	foreground: "foreground",
	surface: "surface",
	border: "border",
	muted: "muted-foreground",
	primary: "primary",
};

describe("globals.css brand tokens stay in sync with @resq-systems/constants", () => {
	for (const [token, cssName] of Object.entries(mapping) as [keyof typeof colors.oklch, string][]) {
		it(`--${cssName} matches constants.oklch.${token}`, () => {
			expect(cssVar(cssName)).toEqual(parseOklch(colors.oklch[token]));
		});
	}
});

type RadiusToken = "sm" | "md" | "lg" | "xl";

/** constants radius token → the globals.css `--radius-*` custom property. */
const radiusMapping: Record<RadiusToken, string> = {
	sm: "radius-sm",
	md: "radius-md",
	lg: "radius-lg",
	xl: "radius-xl",
};

describe("globals.css radius scale stays in sync with @resq-systems/constants", () => {
	for (const [token, cssName] of Object.entries(radiusMapping) as [RadiusToken, string][]) {
		it(`--${cssName} matches constants.radii.${token}`, () => {
			expect(radiusPx(cssName)).toBe(Number.parseInt(radii[token], 10));
		});
	}
});

describe("globals.css chart palette stays in sync with @resq-systems/constants", () => {
	for (const [index, value] of colors.chart.entries()) {
		const cssName = `chart-${index + 1}`;
		it(`--${cssName} matches constants.colors.chart[${index}]`, () => {
			expect(cssVar(cssName)).toEqual(parseOklch(value));
		});
	}
});

type FontToken = "display" | "body" | "mono";

/** constants primary font family → the globals.css font custom property. */
const fontMapping: Record<FontToken, string> = {
	display: "font-display-family",
	body: "font-body",
	mono: "font-data",
};

describe("globals.css primary font families stay in sync with @resq-systems/constants", () => {
	for (const [token, cssName] of Object.entries(fontMapping) as [FontToken, string][]) {
		it(`--${cssName} primary family matches constants.fonts.${token}`, () => {
			expect(cssPrimaryFont(cssName)).toBe(fonts[token]);
		});
	}
});
