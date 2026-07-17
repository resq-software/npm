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

/**
 * @fileoverview ResQ Systems design tokens (colors, theme colors, fonts, radii) —
 * the single source of truth shared by `@resq-systems/ui`,
 * `@resq-systems/email-templates`, and app surfaces. `oklch` is the design-system
 * source of truth; `hex` is the email/legacy-safe snapshot (email clients and
 * older targets do not support `oklch()`), so keep the two representations in sync
 * when the palette changes.
 *
 * @module @resq-systems/constants/tokens
 */

/**
 * The six canonical color roles present in **both** representations. `oklch`
 * (the design-system source of truth) and `hex` (the email-safe snapshot) must
 * each define every one of these.
 *
 * These are semantic *roles*, not raw swatches: consumers reference
 * `colors.oklch.primary`, never the literal channel values, so a palette change
 * updates the token once. The union has no meaningful ordering — membership, not
 * position, is the contract.
 */
export type ColorRole = "background" | "surface" | "border" | "foreground" | "muted" | "primary";

/**
 * Status roles that exist only in the email-safe `hex` snapshot. `oklch` does
 * not define these, so they are indexable on `colors.hex` but never on
 * {@link ColorRole} / `colors.oklch` — the type split enforces that asymmetry at
 * compile time. In apps these four states come from the `@resq-systems/ui`
 * theme's own status tokens rather than from here; the hex copies exist so
 * transactional email (which can't evaluate `oklch()`) still has them.
 */
export type StatusRole = "info" | "success" | "warning" | "danger";

/**
 * The canonical palette in its two representations. `oklch` is the source of
 * truth; `hex` is a hand-maintained snapshot that must resolve to the same
 * perceived color for each shared {@link ColorRole}, because email clients and
 * older render targets can't evaluate `oklch()`. Editing one representation
 * without the other silently drifts email away from the app — the two are only
 * *structurally* linked by the `satisfies` clause below, not value-checked.
 *
 * @example
 * ```ts
 * import { colors } from "@resq-systems/constants/tokens";
 *
 * colors.oklch.primary; // → "oklch(58.50% 0.1877 24.72)"
 * colors.hex.danger;    // → "#D43E3F" (status role — hex only)
 * ```
 */
export const colors = {
	oklch: {
		background: "oklch(16.63% 0.0262 269.37)",
		surface: "oklch(19.72% 0.0231 268.80)",
		border: "oklch(26.45% 0.0386 270.81)",
		foreground: "oklch(96.19% 0.0109 274.89)",
		muted: "oklch(64.00% 0.0535 266.82)",
		primary: "oklch(58.50% 0.1877 24.72)",
	},
	hex: {
		background: "#0A0E1A",
		surface: "#171C2B",
		border: "#1E2438",
		foreground: "#F0F2FA",
		muted: "#7D8CAE",
		primary: "#D43E3F",
		info: "#7D8CAE",
		success: "#3FB984",
		warning: "#E0A100",
		danger: "#D43E3F",
	},
	/**
	 * Categorical data-visualization palette — the five `--chart-1..5` oklch
	 * values shipped by `@resq-systems/ui` (canonical dark `:root` scale). Charts
	 * cycle these in order for series colors. `oklch` only (not email-safe).
	 */
	chart: [
		"oklch(58.50% 0.1877 24.72)",
		"oklch(64.20% 0.1560 252.61)",
		"oklch(73.39% 0.1538 161.68)",
		"oklch(78.37% 0.1587 72.99)",
		"oklch(68.62% 0.0471 261.10)",
	],
} as const satisfies {
	oklch: Record<ColorRole, `oklch(${string})`>;
	hex: Record<ColorRole | StatusRole, `#${string}`>;
	chart: readonly `oklch(${string})`[];
};

/**
 * Roles indexable on `colors.oklch` — exactly {@link ColorRole}. Type any
 * lookup into the oklch source with this so a hex-only {@link StatusRole} can
 * never index it (which would type as `string` yet be `undefined` at runtime).
 */
export type OklchColorRole = keyof typeof colors.oklch;

/** Every token name present on the email-safe `hex` snapshot. */
export type ColorTokenName = keyof typeof colors.hex;

/**
 * Browser + PWA `theme-color` / viewport meta colors, keyed by
 * `prefers-color-scheme`. `dark` is aliased to {@link colors}`.hex.background`
 * (not a re-typed copy) so the browser chrome always matches the dark page
 * background exactly; `light` is a standalone light-mode chrome color with no
 * palette counterpart. Hex, not oklch, because `<meta name="theme-color">`
 * across browsers doesn't accept `oklch()`.
 */
export const themeColor = {
	light: "#E8EAF0",
	dark: colors.hex.background,
} as const;

/**
 * Brand typefaces, ready-to-use CSS font stacks, and the webfont stylesheet.
 *
 * Within each {@link fonts.stacks} array the **first** entry is the brand face
 * and the rest are ordered fallbacks the browser walks until one resolves;
 * multi-word family names are pre-quoted so the array can be joined into a
 * `font-family` value verbatim. {@link fonts.googleFontsHref} must stay in sync
 * with these families and the weights they're actually rendered at — a face or
 * weight used in the app but missing from the href won't load.
 */
export const fonts = {
	display: "Syne",
	body: "DM Sans",
	mono: "DM Mono",
	stacks: {
		display: ["Syne", "'Helvetica Neue'", "Arial", "sans-serif"],
		body: [
			"'DM Sans'",
			"-apple-system",
			"BlinkMacSystemFont",
			"'Segoe UI'",
			"Roboto",
			"Helvetica",
			"Arial",
			"sans-serif",
		],
		mono: ["'DM Mono'", "ui-monospace", "'SF Mono'", "Menlo", "Consolas", "monospace"],
	},
	googleFontsHref:
		"https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&family=DM+Mono:wght@500&display=swap",
} as const;

/**
 * Border radius scale (px, email-safe). Mirrors the shipped `@resq-systems/ui`
 * `--radius-*` scale: `sm`→token (3px), `md`→control (4px), `lg`→panel (6px),
 * `xl` (panel + 4px = 10px). `full` is the pill radius (no UI counterpart).
 */
export const radii = {
	sm: "3px",
	md: "4px",
	lg: "6px",
	xl: "10px",
	full: "999px",
} as const;
