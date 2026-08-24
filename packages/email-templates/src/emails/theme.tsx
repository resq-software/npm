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
 * @fileoverview Email theming system — the resolved `EmailTheme` shape, override
 * merging, the Tailwind config builder, and React contexts carrying the active theme
 * and per-send message policy.
 *
 * @module @resq-systems/email-templates/emails/theme
 */

import { pixelBasedPreset } from "@react-email/components";
import { type ReactElement, createContext, createElement } from "react";
import type { EmailCategory } from "../schemas.js";
import { emailColors, emailDarkColors, emailFonts, emailOrg } from "./tokens.js";

//#region Types

/**
 * Font stacks the theme exposes to Tailwind's `fontFamily` extension. Each array
 * is a CSS font-family stack in priority order (preferred face first, generic
 * fallback last); multi-word names are pre-quoted so they drop straight into a
 * `font-family` value.
 */
export interface EmailThemeFonts {
	/** Stack for display/heading text. */
	display: string[];
	/** Stack for body/sans text. */
	sans: string[];
	/** Stack for monospace text (codes, metadata). */
	mono: string[];
}

/**
 * Organization identity rendered into email chrome (header, signature, footer).
 *
 * All `*Url` fields are absolute URLs. {@link EmailOrgIdentity.registeredAddress}
 * leads with the legal entity name, so it stands alone as a complete CAN-SPAM
 * postal line without a separate `legalName` line in the footer.
 */
export interface EmailOrgIdentity {
	/** Short brand name used in sign-offs, e.g. "— The {brandName} team". */
	brandName: string;
	/** Product name shown in the header lockup beside the logo. */
	productName: string;
	/** Descriptor shown beneath the company name in the header lockup. */
	descriptor: string;
	/** Full legal entity name. */
	legalName: string;
	/** Registered postal address, prefixed with the legal name; a complete CAN-SPAM line. */
	registeredAddress: string;
	/** Support inbox address, rendered as a `mailto:` link. */
	supportEmail: string;
	/** Marketing/website URL (absolute). Never used as an unsubscribe target. */
	websiteUrl: string;
	/** Absolute URL of the Terms page. */
	termsUrl: string;
	/** Absolute URL of the Privacy page. */
	privacyUrl: string;
	/** Absolute URL of the header logo image. */
	logoUrl: string;
}

/** The six semantic color roles shared by the light and dark email shell. */
export interface EmailShellColors {
	background: string;
	surface: string;
	border: string;
	foreground: string;
	muted: string;
	primary: string;
}

/** The full, resolved theme every template renders against. */
export interface EmailTheme {
	/** Color tokens → Tailwind `theme.extend.colors` (email-safe hex). */
	colors: Record<string, string>;
	/** Dark-mode shell colors applied through the authored media query. */
	darkColors: EmailShellColors;
	/** Font stacks → Tailwind `theme.extend.fontFamily` (pre-quoted multi-word names). */
	fonts: EmailThemeFonts;
	/** Organization identity for header lockup, signatures, and legal footer. */
	org: EmailOrgIdentity;
	/** Optional stylesheet `<link>` injected in `<Head>` for brand webfonts. */
	fontsHref?: string;
}

/**
 * A partial theme a consumer supplies to rebrand; unset keys fall back to the
 * base. All object fields are **shallow**-merged over the base one level deep (see
 * {@link resolveEmailTheme}), so supplying `colors` replaces only the named color
 * tokens, not the whole palette.
 */
export interface EmailThemeOverride {
	/** Color tokens to override (email-safe hex); merged over the base palette. */
	colors?: Record<string, string>;
	/** Dark-mode shell color overrides, merged independently over the base mode. */
	darkColors?: Partial<EmailShellColors>;
	/** Font stacks to override; unspecified stacks keep the base. */
	fonts?: Partial<EmailThemeFonts>;
	/** Override organization identity fields (shallow-merged over the base). */
	org?: Partial<EmailOrgIdentity>;
	/** Replace the webfont `<link>` href, or pass `null` to drop it entirely. */
	fontsHref?: string | null;
}

//#endregion

//#region Public API

/** The default ResQ Systems brand theme (light-first, dark-aware, Syne/DM Sans/DM Mono). */
export const defaultEmailTheme: EmailTheme = {
	colors: { ...emailColors },
	darkColors: { ...emailDarkColors },
	fonts: {
		display: [...emailFonts.stacks.display],
		sans: [...emailFonts.stacks.body],
		mono: [...emailFonts.stacks.mono],
	},
	org: { ...emailOrg },
	fontsHref: emailFonts.googleFontsHref,
};

/**
 * Merge an override onto a base theme, producing a new resolved theme.
 *
 * Pure — never mutates `base`. `colors`, `fonts`, and `org` are **shallow**-merged
 * (override keys replace base keys one level deep), so a partial `fonts` override
 * keeps the base's other stacks. `fontsHref` follows a three-way rule: `null`
 * drops the webfont link entirely, absent/`undefined` keeps the base href, and any
 * string replaces it.
 *
 * @param base - The theme to start from.
 * @param override - Fields to overlay; when omitted, `base` is returned by reference.
 * @returns The merged theme, or `base` itself when there is no override.
 */
export function resolveEmailTheme(base: EmailTheme, override?: EmailThemeOverride): EmailTheme {
	if (!override) return base;
	return {
		colors: { ...base.colors, ...override.colors },
		darkColors: { ...base.darkColors, ...override.darkColors },
		fonts: { ...base.fonts, ...override.fonts },
		org: { ...base.org, ...override.org },
		fontsHref: override.fontsHref === null ? undefined : (override.fontsHref ?? base.fontsHref),
	};
}

/**
 * Project a full theme color map down to the six stable email shell roles.
 *
 * @param colors - A resolved light or dark color map.
 * @returns A new shell-role object without mutating `colors`.
 */
export function pickShellRoles(
	colors: EmailShellColors | Record<string, string>,
): EmailShellColors {
	return {
		background: colors.background,
		surface: colors.surface,
		border: colors.border,
		foreground: colors.foreground,
		muted: colors.muted,
		primary: colors.primary,
	};
}

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function validateDarkModeColor(role: keyof EmailShellColors, value: string): string {
	if (typeof value !== "string" || !HEX_COLOR_PATTERN.test(value)) {
		throw new TypeError(`invalid dark-mode color for ${role}: expected #RRGGBB`);
	}
	return value;
}

/**
 * Build the narrowly scoped dark-mode enhancement for the shared email shell.
 *
 * Every interpolated token is validated as a six-digit hex color first, so a
 * consumer override cannot inject declarations or selectors into the stylesheet.
 *
 * @param theme - The resolved theme whose dark shell roles should be authored.
 * @returns A deterministic `prefers-color-scheme: dark` stylesheet.
 */
export function buildDarkModeCss(theme: EmailTheme): string {
	const darkColors = pickShellRoles(theme.darkColors);
	const background = validateDarkModeColor("background", darkColors.background);
	const surface = validateDarkModeColor("surface", darkColors.surface);
	const border = validateDarkModeColor("border", darkColors.border);
	const foreground = validateDarkModeColor("foreground", darkColors.foreground);
	const muted = validateDarkModeColor("muted", darkColors.muted);
	const primary = validateDarkModeColor("primary", darkColors.primary);

	return `@media (prefers-color-scheme: dark) {
  .resq-email-body { background-color: ${background} !important; }
  .resq-email-card { background-color: ${surface} !important; border-color: ${border} !important; }
  .resq-email-foreground { color: ${foreground} !important; }
  .resq-email-muted { color: ${muted} !important; }
  .resq-email-neutral-divider { border-color: ${border} !important; }
  .resq-email-brand-rule { background-color: ${primary} !important; }
}`;
}

/**
 * Merge an override onto the default ResQ Systems theme.
 *
 * Pure convenience wrapper over {@link resolveEmailTheme} with
 * {@link defaultEmailTheme} as the base.
 *
 * @param override - Fields to overlay on the default theme.
 * @returns The resolved theme.
 */
export function mergeEmailTheme(override?: EmailThemeOverride): EmailTheme {
	return resolveEmailTheme(defaultEmailTheme, override);
}

/**
 * Build the `<Tailwind config>` object from a resolved theme.
 *
 * Pure — projects the theme's colors and font stacks into a Tailwind
 * `theme.extend` config atop the pixel-based preset (email clients need px units,
 * not rem).
 *
 * @param theme - The resolved theme to project.
 * @returns The config object to pass to react-email's `<Tailwind>`.
 */
export function buildTailwindConfig(theme: EmailTheme) {
	return {
		presets: [pixelBasedPreset],
		theme: {
			extend: {
				colors: { ...theme.colors },
				fontFamily: {
					display: [...theme.fonts.display],
					sans: [...theme.fonts.sans],
					mono: [...theme.fonts.mono],
				},
			},
		},
	};
}

/** Context carrying the active theme; defaults to the ResQ Systems brand. */
export const EmailThemeContext = createContext<EmailTheme>(defaultEmailTheme);

/**
 * Wrap an element so it renders against a theme override (used by `renderEmail`).
 * Returns the element unchanged when there is no override, so the default theme
 * flows through context.
 *
 * Pure — builds a new provider element and does not mutate `element`.
 *
 * @param element - The email element tree to wrap.
 * @param override - Theme fields to overlay; when omitted, `element` is returned unchanged.
 * @returns `element`, wrapped in an {@link EmailThemeContext} provider when an override is given.
 */
export function withEmailTheme(element: ReactElement, override?: EmailThemeOverride): ReactElement {
	if (!override) return element;
	return createElement(EmailThemeContext.Provider, { value: mergeEmailTheme(override) }, element);
}

/**
 * Per-send message policy carried through context to the legal footer.
 *
 * The unsubscribe affordance renders only when {@link EmailMessage.category} is
 * `"marketing"` **and** {@link EmailMessage.unsubscribeUrl} is set; a marketing
 * send with no `unsubscribeUrl` simply omits it (there is no homepage fallback).
 */
export interface EmailMessage {
	/** Compliance class; defaults to `transactional`. */
	category: EmailCategory;
	/** Absolute unsubscribe/preferences URL; only consulted for `marketing` sends. */
	unsubscribeUrl?: string;
}

/** Context carrying the active message policy; defaults to a transactional send. */
export const EmailMessageContext = createContext<EmailMessage>({ category: "transactional" });

/**
 * Wrap an element so it renders against a message policy (used by `renderEmail`).
 * Returns the element unchanged when no message is given, so the default
 * transactional policy flows through context.
 *
 * Pure — builds a new provider element and does not mutate `element`.
 *
 * @param element - The email element tree to wrap.
 * @param message - The per-send policy; when omitted, `element` is returned unchanged.
 * @returns `element`, wrapped in an {@link EmailMessageContext} provider when a message is given.
 */
export function withEmailMessage(element: ReactElement, message?: EmailMessage): ReactElement {
	if (!message) return element;
	return createElement(EmailMessageContext.Provider, { value: message }, element);
}

//#endregion
