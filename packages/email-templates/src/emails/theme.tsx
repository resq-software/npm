/**
 * Copyright 2026 ResQ Software
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

import { pixelBasedPreset } from "@react-email/components";
import { type ReactElement, createContext, createElement } from "react";
import type { EmailCategory } from "../schemas.js";
import { emailColors, emailFonts, emailOrg } from "./tokens.js";

export interface EmailThemeFonts {
	display: string[];
	sans: string[];
	mono: string[];
}

/** Organization identity rendered into email chrome (header, signature, footer). */
export interface EmailOrgIdentity {
	brandName: string;
	productName: string;
	legalName: string;
	registeredAddress: string;
	supportEmail: string;
	websiteUrl: string;
	termsUrl: string;
	privacyUrl: string;
	logoUrl: string;
}

/** The full, resolved theme every template renders against. */
export interface EmailTheme {
	/** Color tokens → Tailwind `theme.extend.colors` (email-safe hex). */
	colors: Record<string, string>;
	/** Font stacks → Tailwind `theme.extend.fontFamily` (pre-quoted multi-word names). */
	fonts: EmailThemeFonts;
	/** Organization identity for header lockup, signatures, and legal footer. */
	org: EmailOrgIdentity;
	/** Optional stylesheet `<link>` injected in `<Head>` for brand webfonts. */
	fontsHref?: string;
}

/** A partial theme a consumer supplies to rebrand; unset keys fall back to the base. */
export interface EmailThemeOverride {
	colors?: Record<string, string>;
	fonts?: Partial<EmailThemeFonts>;
	/** Override organization identity fields (shallow-merged over the base). */
	org?: Partial<EmailOrgIdentity>;
	/** Pass `null` to drop the webfont link entirely. */
	fontsHref?: string | null;
}

/** The default ResQ brand theme (dark-first, red primary, Syne/DM Sans/DM Mono). */
export const defaultEmailTheme: EmailTheme = {
	colors: { ...emailColors },
	fonts: {
		display: [...emailFonts.stacks.display],
		sans: [...emailFonts.stacks.body],
		mono: [...emailFonts.stacks.mono],
	},
	org: { ...emailOrg },
	fontsHref: emailFonts.googleFontsHref,
};

/** Merge an override onto a base theme (colors/fonts shallow-merge; `fontsHref: null` removes it). */
export function resolveEmailTheme(base: EmailTheme, override?: EmailThemeOverride): EmailTheme {
	if (!override) return base;
	return {
		colors: { ...base.colors, ...override.colors },
		fonts: { ...base.fonts, ...override.fonts },
		org: { ...base.org, ...override.org },
		fontsHref: override.fontsHref === null ? undefined : (override.fontsHref ?? base.fontsHref),
	};
}

/** Merge an override onto the default ResQ theme. */
export function mergeEmailTheme(override?: EmailThemeOverride): EmailTheme {
	return resolveEmailTheme(defaultEmailTheme, override);
}

/** Build the `<Tailwind config>` object from a resolved theme. */
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

/** Context carrying the active theme; defaults to the ResQ brand. */
export const EmailThemeContext = createContext<EmailTheme>(defaultEmailTheme);

/**
 * Wrap an element so it renders against a theme override (used by `renderEmail`).
 * Returns the element unchanged when there is no override, so the default theme
 * flows through context.
 */
export function withEmailTheme(element: ReactElement, override?: EmailThemeOverride): ReactElement {
	if (!override) return element;
	return createElement(EmailThemeContext.Provider, { value: mergeEmailTheme(override) }, element);
}

/** Per-send message policy carried through context to the legal footer. */
export interface EmailMessage {
	/** Compliance class; defaults to `transactional`. */
	category: EmailCategory;
	/** Where the unsubscribe/preferences link points (used for `marketing`). */
	unsubscribeUrl?: string;
}

/** Context carrying the active message policy; defaults to a transactional send. */
export const EmailMessageContext = createContext<EmailMessage>({ category: "transactional" });

/**
 * Wrap an element so it renders against a message policy (used by `renderEmail`).
 * Returns the element unchanged when no message is given, so the default
 * transactional policy flows through context.
 */
export function withEmailMessage(element: ReactElement, message?: EmailMessage): ReactElement {
	if (!message) return element;
	return createElement(EmailMessageContext.Provider, { value: message }, element);
}
