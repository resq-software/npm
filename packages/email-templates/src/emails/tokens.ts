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
 * @fileoverview Email-safe brand tokens — the hex color palette, font stacks, and
 * organization identity, sourced from `@resq-systems/constants` so branding stays
 * centralized across apps.
 *
 * @module @resq-systems/email-templates/emails/tokens
 */

import { brand } from "@resq-systems/constants/brand";
import { colors, fonts } from "@resq-systems/constants/tokens";
import { emailDesignContract } from "../email-design-contract.js";

/**
 * Email-safe hex color tokens, sourced from the shared `@resq-systems/constants`
 * design tokens so the brand palette lives in one place across apps. Email
 * clients don't support `oklch()`, so the hex snapshot is used here.
 */
export const emailColors = {
	...emailDesignContract.modes.light,
	info: colors.hex.info,
	success: colors.hex.success,
	warning: colors.hex.warning,
	danger: colors.hex.danger,
} as const;

/** Email shell colors applied as a dark-mode enhancement. */
export const emailDarkColors = emailDesignContract.modes.dark;

/** Brand font stacks + webfont stylesheet href, from the shared design tokens. */
export const emailFonts = fonts;

/** Union of the available email-safe color token names. */
export type EmailColorToken = keyof typeof emailColors;

/**
 * Organization identity for email chrome (header lockup, signatures, legal
 * footer), derived from the shared `@resq-systems/constants` brand so names,
 * addresses, and legal URLs live in one place across apps.
 */
export const emailOrg = {
	brandName: brand.name,
	productName: brand.productName,
	descriptor: brand.emailDescriptor,
	legalName: brand.legalName,
	registeredAddress: brand.postalAddress,
	supportEmail: brand.email.support,
	websiteUrl: brand.domains.marketing,
	termsUrl: brand.legal.termsUrl,
	privacyUrl: brand.legal.privacyUrl,
	logoUrl: brand.logo,
} as const;
