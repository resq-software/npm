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

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	canonicalizeEmailContract,
	emailDesignContract,
	emailDesignContractIntegrity,
} from "../src/email-design-contract";

describe("email design contract", () => {
	it("publishes the approved company-first identity and modes", () => {
		expect(emailDesignContract).toEqual({
			schemaVersion: 1,
			identity: {
				brandName: "ResQ Systems",
				productName: "ResQ Tactical OS",
				descriptor: "Autonomous Disaster Response",
				legalName: "ResQ Systems, Inc.",
				registeredAddress:
					"ResQ Systems, Inc., 131 Continental Dr, Suite 305, Newark, DE 19713, USA",
				websiteUrl: "https://resq.software",
				termsUrl: "https://resq.software/legal/terms",
				privacyUrl: "https://resq.software/legal/privacy",
				supportEmail: "contact@resq.software",
			},
			modes: {
				light: {
					background: "#E8EAF0",
					surface: "#FFFFFF",
					border: "#D8DDE7",
					foreground: "#151924",
					muted: "#555F73",
					primary: "#D43E3F",
				},
				dark: {
					background: "#0A0E1A",
					surface: "#171C2B",
					border: "#1E2438",
					foreground: "#F0F2FA",
					muted: "#7D8CAE",
					primary: "#D43E3F",
				},
			},
			fonts: {
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
				href: "https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&family=DM+Mono:wght@500&display=swap",
			},
			layout: {
				cardWidthPx: 576,
				desktopPaddingPx: 40,
				mobilePaddingPx: 24,
				radiusPx: 10,
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
				},
				cta: {
					fullWidth: true,
					uppercase: true,
					minimumHeightPx: 44,
					radiusPx: 4,
					horizontalPaddingPx: 24,
				},
				footer: { fontSizePx: 12, lineHeightPx: 20, dividerPx: 1 },
			},
			integrity: { algorithm: "sha256", digest: emailDesignContractIntegrity },
		});
	});

	it("uses stable deep-key JSON and a non-self-referential SHA-256 digest", () => {
		const canonical = canonicalizeEmailContract(emailDesignContract);
		const parsed = JSON.parse(canonical) as Record<string, unknown>;
		expect(Object.hasOwn(parsed, "integrity")).toBe(false);
		expect(canonicalizeEmailContract({ b: 1, a: { d: 2, c: 3 } })).toBe(
			'{"a":{"c":3,"d":2},"b":1}',
		);
		expect(createHash("sha256").update(canonical, "utf8").digest("hex")).toBe(
			emailDesignContractIntegrity,
		);
	});

	it("preserves an own __proto__ key without colliding with a plain object", () => {
		const withProto = JSON.parse('{"__proto__":{"x":1},"a":1}') as Record<string, unknown>;
		const canonical = canonicalizeEmailContract(withProto);

		expect(canonical).toBe('{"__proto__":{"x":1},"a":1}');
		expect(canonical).not.toBe(canonicalizeEmailContract({ a: 1 }));
	});

	it("rejects sparse arrays while preserving explicit null entries", () => {
		expect(() => canonicalizeEmailContract({ values: new Array(1) })).toThrow();
		expect(canonicalizeEmailContract({ values: [null] })).toBe('{"values":[null]}');
	});

	it("rejects arrays with extra string or symbol properties", () => {
		const withStringProperty = [1] as number[] & { extra?: number };
		withStringProperty.extra = 2;
		const symbol = Symbol("array metadata");
		const withSymbolProperty = [1] as number[] & { [symbol]?: number };
		withSymbolProperty[symbol] = 2;

		expect(() => canonicalizeEmailContract({ values: withStringProperty })).toThrow();
		expect(() => canonicalizeEmailContract({ values: withSymbolProperty })).toThrow();
	});

	it("rejects symbol keys on plain objects", () => {
		const symbol = Symbol("object metadata");
		const value: Record<PropertyKey, unknown> = { a: 1 };
		value[symbol] = 2;

		expect(() => canonicalizeEmailContract(value)).toThrow();
	});

	it("rejects explicit undefined array entries", () => {
		expect(() => canonicalizeEmailContract({ values: [undefined] })).toThrow();
	});

	it("rejects object accessors without invoking them", () => {
		let reads = 0;
		const value: Record<string, unknown> = {};
		Object.defineProperty(value, "secret", {
			enumerable: true,
			get: () => {
				reads += 1;
				return "not canonical";
			},
		});

		expect(() => canonicalizeEmailContract(value)).toThrow();
		expect(reads).toBe(0);
	});

	it("rejects array accessors without invoking them", () => {
		let reads = 0;
		const value: unknown[] = [];
		Object.defineProperty(value, "0", {
			enumerable: true,
			get: () => {
				reads += 1;
				return "not canonical";
			},
		});
		value.length = 1;

		expect(() => canonicalizeEmailContract({ value })).toThrow();
		expect(reads).toBe(0);
	});

	it("preserves null-prototype JSON objects", () => {
		const value = Object.create(null) as Record<string, unknown>;
		value.b = 1;
		value.a = { d: 2, c: 3 };

		expect(canonicalizeEmailContract(value)).toBe('{"a":{"c":3,"d":2},"b":1}');
	});

	it("keeps the checked-in integrity module byte-for-byte deterministic", () => {
		const generatedSource = readFileSync(
			new URL("../src/email-design-contract-integrity.ts", import.meta.url),
			"utf8",
		);
		expect(generatedSource).toBe(
			`/** Generated by scripts/generate-email-contract-integrity.ts. Do not edit. */\nexport const emailDesignContractIntegrity =\n\t${JSON.stringify(emailDesignContractIntegrity)} as const;\n`,
		);
	});

	it("pins the constants dependency exactly to the constants package version", () => {
		const emailPackageJson = JSON.parse(
			readFileSync(new URL("../package.json", import.meta.url), "utf8"),
		) as { dependencies?: Record<string, string> };
		const constantsPackageJson = JSON.parse(
			readFileSync(new URL("../../constants/package.json", import.meta.url), "utf8"),
		) as { version?: string };
		const constantsDependency = emailPackageJson.dependencies?.["@resq-systems/constants"];

		expect(constantsDependency).toBe(constantsPackageJson.version);
		expect(constantsDependency).toMatch(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
	});

	it.each([undefined, Number.NaN, Number.POSITIVE_INFINITY])(
		"rejects non-canonical value %s",
		(value) => expect(() => canonicalizeEmailContract({ value })).toThrow(),
	);

	it("rejects a non-plain root object before omitting integrity", () => {
		expect(() => canonicalizeEmailContract(new Date(0))).toThrow(
			"email contract must be a plain object",
		);
	});
});
