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
 * @fileoverview Payload transforms, applied to the attack corpus to *generate* evasions
 * rather than hand-writing them.
 *
 * Modelled on sqlmap's `--tamper` scripts and Commix's documented filter bypasses. The
 * point is leverage: a fixed evasion corpus only ever contains what somebody thought of,
 * while N payloads times M transforms explores combinations nobody enumerated. Applying
 * these transforms to the existing corpus is what surfaced MySQL versioned comments, the
 * fully-encoded double-percent form, and two Commix word-splitting bypasses — none of
 * which the hand-written evasion fixtures covered.
 *
 * These are transforms, not payloads: no third-party corpus is vendored, and nothing
 * here reaches the blocking layer.
 */

import type { ThreatType } from "../../src/threats/types.js";

/** A payload transform. */
export interface PayloadMutation {
	/** Stable name, used as the test title. */
	readonly name: string;
	/**
	 * Threat types this transform is meaningful for. Empty means every type — an
	 * encoding transform applies to anything, while `space2comment` only means something
	 * in SQL.
	 */
	readonly appliesTo: readonly ThreatType[];
	/** Produce the mutated payload. Must be deterministic. */
	readonly transform: (input: string) => string;
}

const SQL: readonly ThreatType[] = ["sql_injection"];
const SHELL: readonly ThreatType[] = ["command_injection"];
const MARKUP: readonly ThreatType[] = ["xss", "xml_injection"];

/** Alternating case. Deterministic, unlike sqlmap's randomised version. */
const alternateCase = (value: string): string =>
	[...value]
		.map((char, index) => (index % 2 === 0 ? char.toUpperCase() : char.toLowerCase()))
		.join("");

const percentEncode = (value: string): string =>
	[...value].map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`).join("");

/**
 * Every transform, applied to every applicable attack payload by the mutation suite.
 *
 * @see https://github.com/sqlmapproject/sqlmap — the `tamper/` directory
 * @see https://github.com/commixproject/commix/wiki/Filters-bypass-examples
 */
export const MUTATIONS: readonly PayloadMutation[] = [
	// ── sqlmap tamper analogues ──────────────────────────────────────────
	{ name: "space2comment", appliesTo: SQL, transform: (v) => v.replaceAll(" ", "/**/") },
	{ name: "space2plus", appliesTo: SQL, transform: (v) => v.replaceAll(" ", "+") },
	{ name: "space2multiplespace", appliesTo: SQL, transform: (v) => v.replaceAll(" ", "    ") },
	{
		name: "versionedkeywords",
		appliesTo: SQL,
		transform: (v) => v.replace(/\b(UNION|SELECT|FROM|WHERE|OR|AND|DROP|DELETE)\b/gi, "/*!$1*/"),
	},
	{ name: "equaltolike", appliesTo: SQL, transform: (v) => v.replace(/=/g, " LIKE ") },
	{ name: "apostrophemask", appliesTo: SQL, transform: (v) => v.replaceAll("'", "\uff07") },
	{
		name: "comment_after_keyword",
		appliesTo: SQL,
		transform: (v) => v.replace(/\b(UNION|SELECT|OR|AND)\b/gi, "$1/**/"),
	},

	// ── Commix filter-bypass analogues ───────────────────────────────────
	// biome-ignore lint/suspicious/noTemplateCurlyInString: the literal ${IFS} is the payload
	{ name: "ifs_for_space", appliesTo: SHELL, transform: (v) => v.replaceAll(" ", "${IFS}") },
	{ name: "brace_expansion_space", appliesTo: SHELL, transform: (v) => v.replaceAll(" ", "{,}") },
	{
		name: "backslash_in_command",
		appliesTo: SHELL,
		transform: (v) =>
			v.replace(/\b(cat|curl|wget|nc|sh|bash|rm|id)\b/g, (m) => `${m[0]}\\${m.slice(1)}`),
	},
	{
		name: "quotes_in_command",
		appliesTo: SHELL,
		transform: (v) =>
			v.replace(/\b(cat|curl|wget|nc|sh|bash|rm|id)\b/g, (m) => `${m[0]}""${m.slice(1)}`),
	},
	{ name: "tab_for_space", appliesTo: SHELL, transform: (v) => v.replaceAll(" ", "\u0009") },

	// ── markup separators (H5SC territory) ───────────────────────────────
	{
		name: "attr_separator_newline",
		appliesTo: MARKUP,
		transform: (v) => v.replace(/ (on\w+|src|href)=/gi, "\u000a$1="),
	},
	{
		name: "attr_separator_formfeed",
		appliesTo: MARKUP,
		transform: (v) => v.replace(/ (on\w+|src|href)=/gi, "\u000c$1="),
	},
	{
		name: "tag_slash_separator",
		appliesTo: MARKUP,
		transform: (v) => v.replace(/<(\w+) /g, "<$1/"),
	},

	// ── encoding families the canonicalization variants are meant to cover ──
	{ name: "randomcase", appliesTo: [], transform: alternateCase },
	{ name: "percent_encode_all", appliesTo: [], transform: percentEncode },
	{
		name: "double_percent_encode",
		appliesTo: [],
		transform: (v) => percentEncode(percentEncode(v)),
	},
	{
		name: "html_entity_decimal",
		appliesTo: [],
		transform: (v) => [...v].map((char) => `&#${char.codePointAt(0)};`).join(""),
	},
	{
		name: "fullwidth",
		appliesTo: [],
		transform: (v) =>
			[...v]
				.map((char) => {
					const codePoint = char.codePointAt(0) ?? 0;
					return codePoint >= 0x21 && codePoint <= 0x7e
						? String.fromCodePoint(codePoint + 0xfee0)
						: char;
				})
				.join(""),
	},
	{
		name: "zero_width_inside_words",
		appliesTo: [],
		transform: (v) => v.replace(/\b(\w)(\w+)\b/g, "$1\u200b$2"),
	},
];

/** Sinks at which a percent-encoded value is decoded before it is used. */
const PERCENT_DECODING_SINKS: ReadonlySet<string> = new Set([
	"url",
	"url_parameter",
	"html",
	"filesystem",
	"sql",
	"http_header",
	"xml",
]);

/**
 * Whether a mutated payload is expected to fall below the review band, and why.
 *
 * The mutation suite asserts that *every other* combination still scores. None of these
 * three is a gap in the catalog — each is a case where the transform produced something
 * that is still detected, no longer an attack, or was never applicable.
 *
 * @param mutation - The transform applied.
 * @param contexts - Sinks the payload was scanned against.
 * @param ruleIds - Rules that fired on the mutated payload.
 * @returns A reason string when the miss is expected, otherwise `null`.
 */
export function expectedMutationMiss(
	mutation: string,
	contexts: readonly string[],
	ruleIds: readonly string[],
): string | null {
	// Detected, but deliberately not escalated. UNICODE-INVISIBLE-001 fires on these, so
	// the finding is raised and a caller reading `findings` sees it. The verdict stays
	// `allow` because the same code points are orthographic in Persian and Hindi and
	// structural in every ZWJ emoji sequence, all of which score identically. Separating
	// evasion from orthography needs script analysis, not a heavier weight.
	if (mutation === "zero_width_inside_words" && ruleIds.includes("UNICODE-INVISIBLE-001")) {
		return "invisible characters are detected but not escalated: ZWJ and ZWNJ are legitimate in Persian, Hindi and emoji";
	}

	// Not an evasion. Percent-decoding does not happen at these sinks, so the transform
	// produced a value that would never be decoded back into the payload.
	if (
		(mutation === "double_percent_encode" || mutation === "percent_encode_all") &&
		!contexts.some((context) => PERCENT_DECODING_SINKS.has(context))
	) {
		return "the sink never percent-decodes, so the encoded form is not a payload";
	}

	// Not a payload. JavaScript property names are case-sensitive, so a case-mutated
	// prototype key pollutes nothing and a case-mutated credential is not a credential.
	if (mutation === "randomcase") {
		return "case mutation destroys the payload: identifiers and credentials are case-sensitive";
	}

	return null;
}
