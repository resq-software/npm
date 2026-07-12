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
 * ResQ Systems design tokens — the single source of truth shared by `@resq-systems/ui`,
 * `@resq-systems/email-templates`, and app surfaces.
 *
 * `oklch` is the design-system source of truth; `hex` is the email/legacy-safe
 * snapshot (email clients and older targets do not support `oklch()`). Keep the
 * two representations in sync when the palette changes.
 */
/**
 * The six canonical color roles present in **both** representations. `oklch`
 * (the design-system source of truth) and `hex` (the email-safe snapshot) must
 * each define every one of these.
 */
export type ColorRole = "background" | "surface" | "border" | "foreground" | "muted" | "primary";

/**
 * Status roles that exist only in the email-safe `hex` snapshot. `oklch` does
 * not define these, so they are indexable on `colors.hex` but never on
 * `colors.oklch`.
 */
export type StatusRole = "info" | "success" | "warning" | "danger";

export const colors = {
	oklch: {
		background: "oklch(16.63% 0.0262 269.37)",
		surface: "oklch(22.90% 0.0302 269.75)",
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
} as const satisfies {
	oklch: Record<ColorRole, `oklch(${string})`>;
	hex: Record<ColorRole | StatusRole, `#${string}`>;
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
 * Browser + PWA `theme-color` / viewport meta colors. `dark` tracks the
 * canonical page background; `light` is the light-mode chrome color.
 */
export const themeColor = {
	light: "#E8EAF0",
	dark: colors.hex.background,
} as const;

/** Brand typefaces, ready-to-use CSS font stacks, and the webfont stylesheet. */
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

/** Border radius scale (px, email-safe). */
export const radii = {
	sm: "6px",
	md: "8px",
	lg: "12px",
	xl: "14px",
	full: "999px",
} as const;
