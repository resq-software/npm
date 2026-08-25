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
 * @fileoverview Framework-neutral email design contract values and canonical
 * JSON serializer. The unhashed core is internal so digest generation cannot
 * become self-referential.
 *
 * @module @resq-systems/email-templates/email-design-contract-core
 */

import { brand, colors, fonts, radii } from "@resq-systems/constants";

/** Semantic email colors for one presentation mode. */
export interface EmailModeColors {
	readonly background: `#${string}`;
	readonly surface: `#${string}`;
	readonly border: `#${string}`;
	readonly foreground: `#${string}`;
	readonly muted: `#${string}`;
	readonly primary: `#${string}`;
}

/** Stable, unhashed values shared by email renderers across frameworks. */
export interface EmailDesignContractCore {
	readonly schemaVersion: 2;
	readonly identity: {
		readonly brandName: string;
		readonly productName: string;
		readonly descriptor: string;
		readonly legalName: string;
		readonly registeredAddress: string;
		readonly websiteUrl: string;
		readonly termsUrl: string;
		readonly privacyUrl: string;
		readonly supportEmail: string;
		readonly logoUrl: string;
		readonly logoSha256: string;
	};
	readonly modes: {
		readonly light: EmailModeColors;
		readonly dark: EmailModeColors;
	};
	readonly fonts: {
		readonly display: readonly string[];
		readonly body: readonly string[];
		readonly mono: readonly string[];
		readonly href?: string;
	};
	readonly layout: {
		readonly cardWidthPx: number;
		readonly desktopPaddingPx: number;
		readonly mobilePaddingPx: number;
		readonly radiusPx: number;
		readonly cardBorderPx: number;
		readonly minimumBodyPx: number;
		readonly minimumTapPx: number;
		readonly bodyLineHeight: number;
		readonly spacing: {
			readonly outerVerticalPx: number;
			readonly headerBottomPx: number;
			readonly contentGapPx: number;
			readonly sectionGapPx: number;
			readonly legalGapPx: number;
		};
	};
	readonly presentation: {
		readonly header: {
			readonly brandFontPx: number;
			readonly descriptorFontPx: number;
			readonly descriptorTrackingEm: number;
			readonly brandRulePx: number;
			readonly logoSizePx: number;
			readonly logoGapPx: number;
		};
		readonly cta: {
			readonly fullWidth: true;
			readonly uppercase: true;
			readonly minimumHeightPx: number;
			readonly radiusPx: number;
			readonly horizontalPaddingPx: number;
		};
		readonly footer: {
			readonly fontSizePx: number;
			readonly lineHeightPx: number;
			readonly dividerPx: number;
		};
	};
}

/** Public contract shape, including the digest of all core values. */
export interface EmailDesignContract extends EmailDesignContractCore {
	readonly integrity: {
		readonly algorithm: "sha256";
		readonly digest: string;
	};
}

/**
 * Serialize a contract to stable, deep-key-sorted JSON for integrity hashing.
 * Only the top-level integrity field is omitted.
 */
export function canonicalizeEmailContract(value: unknown): string {
	function normalize(candidate: unknown, omitTopLevelIntegrity = false): unknown {
		if (candidate === null || typeof candidate === "string" || typeof candidate === "boolean") {
			return candidate;
		}
		if (typeof candidate === "number") {
			if (!Number.isFinite(candidate)) {
				throw new TypeError("non-finite contract number");
			}
			return candidate;
		}
		if (Array.isArray(candidate)) {
			if (Object.getPrototypeOf(candidate) !== Array.prototype) {
				throw new TypeError("contract arrays must use Array.prototype");
			}
			if (Object.getOwnPropertySymbols(candidate).length > 0) {
				throw new TypeError("contract arrays cannot have symbol properties");
			}

			const lengthDescriptor = Object.getOwnPropertyDescriptor(candidate, "length");
			if (!lengthDescriptor || !("value" in lengthDescriptor)) {
				throw new TypeError("contract array length must be a data property");
			}
			const length = lengthDescriptor.value;
			const propertyNames = new Set(Object.getOwnPropertyNames(candidate));
			if (propertyNames.size !== length + 1 || !propertyNames.delete("length")) {
				throw new TypeError("contract arrays must be dense without extra properties");
			}

			const normalized: unknown[] = [];
			for (let index = 0; index < length; index += 1) {
				const key = String(index);
				if (!propertyNames.delete(key)) {
					throw new TypeError("contract arrays must not contain holes");
				}
				const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
				if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
					throw new TypeError("contract array entries must be enumerable data properties");
				}
				normalized.push(normalize(descriptor.value));
			}
			return normalized;
		}
		if (typeof candidate !== "object") {
			throw new TypeError("non-JSON contract value");
		}
		const prototype = Object.getPrototypeOf(candidate);
		if (prototype !== Object.prototype && prototype !== null) {
			throw new TypeError("contract objects must be plain objects");
		}
		if (Object.getOwnPropertySymbols(candidate).length > 0) {
			throw new TypeError("contract objects cannot have symbol properties");
		}

		const output = Object.create(null) as Record<string, unknown>;
		for (const key of Object.getOwnPropertyNames(candidate).sort()) {
			const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
			if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
				throw new TypeError("contract object entries must be enumerable data properties");
			}
			if (omitTopLevelIntegrity && key === "integrity") {
				continue;
			}
			if (descriptor.value === undefined) {
				throw new TypeError(`undefined contract value at ${key}`);
			}
			output[key] = normalize(descriptor.value);
		}
		return output;
	}

	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		throw new TypeError("email contract must be an object");
	}
	const rootPrototype = Object.getPrototypeOf(value);
	if (rootPrototype !== Object.prototype && rootPrototype !== null) {
		throw new TypeError("email contract must be a plain object");
	}
	return JSON.stringify(normalize(value, true));
}

/** Internal unhashed contract values consumed by the generator and public module. */
export const emailDesignContractCore = {
	schemaVersion: 2,
	identity: {
		brandName: brand.name,
		productName: brand.productName,
		descriptor: brand.emailDescriptor,
		legalName: brand.legalName,
		registeredAddress: brand.postalAddress,
		websiteUrl: brand.domains.marketing,
		termsUrl: brand.legal.termsUrl,
		privacyUrl: brand.legal.privacyUrl,
		supportEmail: brand.email.support,
		logoUrl: brand.logo,
		logoSha256: "f04e4334bf81acaebbfb9e57f8ee43edcfee2f8939344b11bab59f0d6093708f",
	},
	modes: {
		light: {
			background: "#E8EAF0",
			surface: "#FFFFFF",
			border: "#D8DDE7",
			foreground: "#151924",
			muted: "#555F73",
			primary: colors.hex.primary,
		},
		dark: {
			background: colors.hex.background,
			surface: colors.hex.surface,
			border: colors.hex.border,
			foreground: colors.hex.foreground,
			muted: colors.hex.muted,
			primary: colors.hex.primary,
		},
	},
	fonts: {
		display: fonts.stacks.display,
		body: fonts.stacks.body,
		mono: fonts.stacks.mono,
		href: fonts.googleFontsHref,
	},
	layout: {
		cardWidthPx: 576,
		desktopPaddingPx: 40,
		mobilePaddingPx: 24,
		radiusPx: Number.parseInt(radii.xl, 10),
		cardBorderPx: 1,
		minimumBodyPx: 15,
		minimumTapPx: 44,
		bodyLineHeight: 1.6,
		spacing: {
			outerVerticalPx: 40,
			headerBottomPx: 32,
			contentGapPx: 16,
			sectionGapPx: 24,
			legalGapPx: 24,
		},
	},
	presentation: {
		header: {
			brandFontPx: 20,
			descriptorFontPx: 10,
			descriptorTrackingEm: 0.16,
			brandRulePx: 2,
			logoSizePx: 40,
			logoGapPx: 12,
		},
		cta: {
			fullWidth: true,
			uppercase: true,
			minimumHeightPx: 44,
			radiusPx: Number.parseInt(radii.md, 10),
			horizontalPaddingPx: 24,
		},
		footer: { fontSizePx: 12, lineHeightPx: 20, dividerPx: 1 },
	},
} as const satisfies EmailDesignContractCore;
