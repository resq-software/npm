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
 */
const CSV_FORMULA_LEAD = /^[\s'"]{0,8}[=+\-@\t\r]/;

/** Fields containing any of these must be quoted per RFC 4180 sections 2.6 and 2.7. */
const CSV_QUOTE_REQUIRED = /["\r\n]/;

/**
 * Escape one cell for CSV export.
 *
 * This is the control named by the formula-injection rules. A CSV file is not inert: a
 * cell beginning `=`, `+`, `-`, `@`, tab or CR is evaluated as a formula by Excel,
 * Sheets and LibreOffice when the recipient opens it, so the payload executes on *their*
 * machine, outside the exporting application entirely (CWE-1236).
 *
 * Two separate jobs, in order: neutralise the formula trigger with a leading apostrophe,
 * then apply RFC 4180 quoting so the field cannot break the row.
 *
 * **Only strings are prefixed.** A `number` or `boolean` came from the application's own
 * types and cannot carry a formula, so `-1234` exports as a negative number while
 * `"-1234"` exports as text. Pass numeric columns as numbers, or every negative value in
 * the sheet becomes a string.
 *
 * Three things worth knowing before relying on it:
 * - The leading apostrophe is an Excel convention, **not** an RFC 4180 construct. Readers
 *   that do not implement it surface it as a literal character in the data.
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
 * escapeCsvField(-1234); // "-1234" — a number, not a formula
 * ```
 */
export function escapeCsvField(
	value: unknown,
	options: { readonly delimiter?: string } = {},
): string {
	if (value === null || value === undefined) return "";

	const delimiter = options.delimiter ?? ",";
	const isUntrustedText = typeof value === "string";
	const text = isUntrustedText ? value : String(value);

	// NUL cannot be represented in a CSV field and breaks several readers outright.
	// biome-ignore lint/suspicious/noControlCharactersInRegex: NUL is a control character by definition
	const cleaned = text.replace(/\u0000/g, "");

	const neutralised = isUntrustedText && CSV_FORMULA_LEAD.test(cleaned) ? `'${cleaned}` : cleaned;

	const mustQuote = CSV_QUOTE_REQUIRED.test(neutralised) || neutralised.includes(delimiter);
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
