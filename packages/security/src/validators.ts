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
 * @fileoverview Signature-based threat detection for untrusted input — regex/glyph
 * catalogs and detectors for XSS, SQL/NoSQL injection, command injection, path
 * traversal, and Unicode homoglyphs, plus field-level refinements and user-facing
 * error messages. Defense-in-depth signal only; never a substitute for parameterized
 * queries, output encoding, or a vetted HTML sanitizer.
 *
 * @module @resq-systems/security/validators
 */

import { assertNever } from "@resq-systems/types";

//#region Constants

/**
 * XSS attack patterns — detect script injection, event handlers, and dangerous URIs.
 */
const XSS_PATTERNS = [
	// Script tags (opening only — avoids ReDoS from greedy cross-tag matching)
	/<script\b/gi,
	// Event handlers
	/\bon\w+\s*=/gi,
	// JavaScript URIs
	/javascript\s*:/gi,
	// Data URIs with script content
	/data\s*:\s*text\/html/gi,
	/data\s*:\s*application\/javascript/gi,
	// Expression evaluation
	/expression\s*\(/gi,
	// VBScript
	/vbscript\s*:/gi,
	// Iframe injection
	/<iframe\b/gi,
	// Object/embed injection
	/<object\b/gi,
	/<embed\b/gi,
	// Style-based attacks
	/<style\b/gi,
	// Document manipulation
	/document\s*\.\s*(cookie|domain|write|location)/gi,
	// Window manipulation
	/window\s*\.\s*(location|open|eval)/gi,
	// Eval and Function constructor
	/\beval\s*\(/gi,
	/\bnew\s+Function\s*\(/gi,
	// innerHTML manipulation
	/\.innerHTML\s*=/gi,
	// Prototype pollution
	/__proto__/gi,
	/constructor\s*\[/gi,
];

/**
 * SQL injection patterns — detect common SQL attack vectors.
 */
const SQL_INJECTION_PATTERNS = [
	// UNION-based injection
	/\bUNION\s+(ALL\s+)?SELECT\b/gi,
	// DROP/DELETE/TRUNCATE attacks
	/\bDROP\s+(TABLE|DATABASE|INDEX|VIEW)\b/gi,
	/\bDELETE\s+FROM\b/gi,
	/\bTRUNCATE\s+TABLE\b/gi,
	// Comment-based attacks
	/--\s*$/gm,
	/\/\*[\s\S]*?\*\//g,
	// Always-true conditions
	/'\s*OR\s+'[\d\w]+'\s*=\s*'[\d\w]+/gi,
	/'\s*OR\s+\d+\s*=\s*\d+/gi,
	/"\s*OR\s+"[\d\w]+"\s*=\s*"[\d\w]+/gi,
	/1\s*=\s*1/g,
	// Stacked queries
	/;\s*(SELECT|INSERT|UPDATE|DELETE|DROP|EXEC|UNION)/gi,
	// Time-based blind injection
	/SLEEP\s*\(\s*\d+\s*\)/gi,
	/WAITFOR\s+DELAY/gi,
	/BENCHMARK\s*\(/gi,
	// Information schema access
	/INFORMATION_SCHEMA/gi,
	// Hex encoding bypass
	/0x[0-9a-f]+/gi,
	// EXEC/EXECUTE
	/\bEXEC(UTE)?\s*\(/gi,
	// xp_ procedures (SQL Server)
	/\bxp_\w+/gi,
];

/**
 * NoSQL injection patterns — detect MongoDB and other NoSQL attack vectors.
 */
const NOSQL_INJECTION_PATTERNS = [
	// MongoDB operators
	/\$(?:gt|gte|lt|lte|ne|eq|in|nin|and|or|not|nor|exists|type|mod|regex|text|where|all|elemMatch|size|slice|expr|jsonSchema|meta)\b/gi,
	// JavaScript execution in MongoDB
	/\$where\s*:/gi,
	/\$function\s*:/gi,
	// Operator injection
	/\{\s*\$[a-z]+\s*:/gi,
	// Array injection
	/\[\s*\$[a-z]+\s*\]/gi,
];

/**
 * Path traversal patterns — detect directory traversal attacks.
 */
const PATH_TRAVERSAL_PATTERNS = [
	// Directory traversal
	/\.\.[/\\]/g,
	// URL-encoded traversal
	/%2e%2e[%2f%5c]/gi,
	/%252e%252e%252f/gi,
	// Double-encoded
	/\.\.%2f/gi,
	/\.\.%5c/gi,
	// Null byte injection
	/%00/g,
	// Common sensitive paths
	/\/etc\/passwd/gi,
	/\/etc\/shadow/gi,
	/\/proc\/self/gi,
	/C:\\Windows/gi,
	/C:\\System32/gi,
];

/**
 * Homoglyph map — Unicode characters that render like ASCII letters but are not,
 * as used in phishing and IDN homograph attacks. Maps each ASCII letter to its known
 * lookalikes.
 */
const HOMOGLYPH_MAP: Record<string, string[]> = {
	a: ["а", "ɑ", "α", "а"], // Cyrillic а, Latin alpha, Greek alpha
	c: ["с", "ϲ", "ⅽ"], // Cyrillic с, Greek lunate sigma
	e: ["е", "ε", "ė"], // Cyrillic е, Greek epsilon
	o: ["о", "ο", "ᴏ", "०"], // Cyrillic о, Greek omicron
	p: ["р", "ρ"], // Cyrillic р, Greek rho
	s: ["ѕ", "ꜱ"], // Cyrillic ѕ
	x: ["х", "χ"], // Cyrillic х, Greek chi
	y: ["у", "γ"], // Cyrillic у, Greek gamma
	B: ["В", "Β"], // Cyrillic В, Greek Beta
	H: ["Н", "Η"], // Cyrillic Н, Greek Eta
	K: ["К", "Κ"], // Cyrillic К, Greek Kappa
	M: ["М", "Μ"], // Cyrillic М, Greek Mu
	P: ["Р", "Ρ"], // Cyrillic Р, Greek Rho
	T: ["Т", "Τ"], // Cyrillic Т, Greek Tau
};

//#endregion

//#region Detection

/**
 * Outcome of {@link detectThreatPatterns}.
 *
 * `isSafe` is the boolean shortcut; `threats` is the full list of
 * findings (one per detector that fired). Use
 * {@link getThreatErrorMessage} to render a user-facing message for
 * the first finding.
 */
export interface ThreatDetectionResult {
	/** `true` when no detectors fired. Equivalent to `threats.length === 0`. */
	isSafe: boolean;
	/** All findings produced by enabled detectors, in detector order. */
	threats: ThreatFinding[];
}

/**
 * A single detector hit. Detectors that fire return at most one
 * finding per call (one example is enough to reject the input).
 */
export interface ThreatFinding {
	/** Discriminant: which detector matched. See {@link ThreatType}. */
	type: ThreatType;
	/** Human-readable description suitable for log lines (not for end users — use {@link getThreatErrorMessage} instead). */
	description: string;
	/** First 50 chars of the matching substring, for diagnostics. Truncated to prevent leaking large payloads in logs. */
	matchedPattern?: string;
}

/**
 * The closed set of threat categories the validators recognize. Serves as the
 * discriminant of {@link ThreatFinding} (its `type` field) and drives the
 * exhaustive `switch` in {@link getThreatErrorMessage} — adding a variant here
 * without a matching `case` there becomes a compile error via `assertNever`.
 * Add new categories here when adding a new detector.
 */
export type ThreatType =
	| "xss"
	| "sql_injection"
	| "nosql_injection"
	| "command_injection"
	| "path_traversal"
	| "homoglyph";

/**
 * Detect XSS-style payloads (script tags, event handlers, dangerous
 * URI schemes, prototype pollution, …) in a UTF-8 input.
 *
 * Inputs longer than 100 000 characters are truncated before scanning
 * to bound regex evaluation cost and prevent ReDoS on crafted
 * payloads. Returns at most one finding — the regex catalog is
 * exhaustive enough that the first hit is sufficient for a
 * reject-or-sanitize decision.
 *
 * @param input - String to scan.
 * @returns Empty array when nothing matches, or a single
 *   {@link ThreatFinding} of type `"xss"`.
 *
 * @example
 * ```ts
 * containsXSSPatterns(`<img src=x onerror="alert(1)">`);
 * // → [{ type: "xss", description: "...", matchedPattern: "onerror=" }]
 * ```
 */
export function containsXSSPatterns(input: string): ThreatFinding[] {
	const findings: ThreatFinding[] = [];
	// Limit input length to prevent ReDoS on crafted payloads
	const bounded = input.length > 100_000 ? input.slice(0, 100_000) : input;

	for (const pattern of XSS_PATTERNS) {
		const match = bounded.match(pattern);
		if (match) {
			findings.push({
				type: "xss",
				description: "Potential cross-site scripting (XSS) detected",
				matchedPattern: match[0].slice(0, 50),
			});
			break; // One finding per type is enough
		}
	}

	return findings;
}

/**
 * Detect SQL-injection patterns (UNION SELECT, DROP TABLE,
 * comment-based bypasses, always-true tautologies, stacked queries)
 * in input.
 *
 * **Not a replacement for parameterised queries.** Use this as a
 * defense-in-depth signal in addition to a properly bound prepared
 * statement, never as the only barrier.
 *
 * @param input - String to scan. Truncated at 100 000 characters.
 * @returns Empty array, or one finding of type `"sql_injection"`.
 */
export function containsSQLInjection(input: string): ThreatFinding[] {
	const findings: ThreatFinding[] = [];
	const bounded = input.length > 100_000 ? input.slice(0, 100_000) : input;

	for (const pattern of SQL_INJECTION_PATTERNS) {
		const match = bounded.match(pattern);
		if (match) {
			findings.push({
				type: "sql_injection",
				description: "Potential SQL injection detected",
				matchedPattern: match[0].slice(0, 50),
			});
			break;
		}
	}

	return findings;
}

/**
 * Detect NoSQL-injection patterns — Mongo-style operator injection
 * (`$where`, `$ne`, `$regex`), JavaScript-in-query payloads, and
 * structural manipulators that can bypass auth filters in document
 * stores.
 *
 * @param input - String to scan.
 * @returns Empty array, or one finding of type `"nosql_injection"`.
 */
export function containsNoSQLInjection(input: string): ThreatFinding[] {
	const findings: ThreatFinding[] = [];

	for (const pattern of NOSQL_INJECTION_PATTERNS) {
		const match = input.match(pattern);
		if (match) {
			findings.push({
				type: "nosql_injection",
				description: "Potential NoSQL injection detected",
				matchedPattern: match[0].slice(0, 50),
			});
			break;
		}
	}

	return findings;
}

/**
 * Detect shell command-injection patterns: command substitution
 * (`$(...)`, backticks), chained dangerous commands (`; rm`, `; curl`,
 * …) and shell-piped exec (`| sh`, `| bash`).
 *
 * **Off by default in {@link detectThreatPatterns}** — these patterns
 * occasionally fire on legitimate user content. Enable explicitly
 * (`checkCommandInjection: true`) only when input flows into a child
 * process or shell.
 *
 * @param input - String to scan. Truncated at 100 000 characters.
 * @returns Empty array, or one finding of type `"command_injection"`.
 */
export function containsCommandInjection(input: string): ThreatFinding[] {
	const findings: ThreatFinding[] = [];

	// Only check for the most dangerous patterns, not all shell chars
	const dangerousPatterns = [
		/\$\([^)]{1,200}\)/g, // Command substitution (bounded)
		/`[^`]{1,200}`/g, // Backtick command substitution (bounded)
		/;\s*(rm|del|cat|wget|curl|nc)\b/gi, // Chained dangerous commands
		/\|\s*(sh|bash|cmd)\b/gi, // Piped to shell
	];

	const bounded = input.length > 100_000 ? input.slice(0, 100_000) : input;

	for (const pattern of dangerousPatterns) {
		const match = bounded.match(pattern);
		if (match) {
			findings.push({
				type: "command_injection",
				description: "Potential command injection detected",
				matchedPattern: match[0].slice(0, 50),
			});
			break;
		}
	}

	return findings;
}

/**
 * Detect path-traversal payloads — `../`, encoded dots, raw absolute
 * paths trying to escape a base directory. Pair with `path.resolve()`
 * + a `startsWith()` containment check on the canonicalised path
 * before reading or writing the file.
 *
 * @param input - String to scan.
 * @returns Empty array, or one finding of type `"path_traversal"`.
 */
export function containsPathTraversal(input: string): ThreatFinding[] {
	const findings: ThreatFinding[] = [];

	for (const pattern of PATH_TRAVERSAL_PATTERNS) {
		const match = input.match(pattern);
		if (match) {
			findings.push({
				type: "path_traversal",
				description: "Potential path traversal attack detected",
				matchedPattern: match[0].slice(0, 50),
			});
			break;
		}
	}

	return findings;
}

/**
 * Detect lookalike Unicode characters (Cyrillic / Greek glyphs that
 * render identically to common ASCII letters). The classic phishing
 * trick is `paypaӏ.com` (`ӏ` instead of `l`); this detector catches
 * the building blocks.
 *
 * Use {@link normalizeUnicode} to *replace* homoglyphs with their
 * ASCII equivalents — this function only flags their presence.
 *
 * @param input - String to scan.
 * @returns Empty array, or one finding of type `"homoglyph"` (the
 *   first matched lookalike).
 */
export function containsHomoglyphs(input: string): ThreatFinding[] {
	const findings: ThreatFinding[] = [];

	for (const [, homoglyphs] of Object.entries(HOMOGLYPH_MAP)) {
		for (const homoglyph of homoglyphs) {
			if (input.includes(homoglyph)) {
				findings.push({
					type: "homoglyph",
					description: "Suspicious lookalike Unicode character detected",
					matchedPattern: homoglyph,
				});
				return findings; // One finding is enough
			}
		}
	}

	return findings;
}

//#endregion

//#region Validation

/**
 * Per-detector toggles for {@link detectThreatPatterns}.
 *
 * Defaults: XSS, SQL, NoSQL, path-traversal, and homoglyph detectors
 * are **on**; command injection is **off** (false-positive prone).
 * Pass `false` to disable a detector or `true` to force-enable
 * `checkCommandInjection`.
 */
export interface ThreatDetectionConfig {
	/** Default `true`. */
	checkXSS?: boolean;
	/** Default `true`. */
	checkSQLInjection?: boolean;
	/** Default `true`. */
	checkNoSQLInjection?: boolean;
	/** Default `false` — opt in only when input reaches a shell. */
	checkCommandInjection?: boolean;
	/** Default `true`. */
	checkPathTraversal?: boolean;
	/** Default `true`. */
	checkHomoglyphs?: boolean;
}

const DEFAULT_CONFIG: ThreatDetectionConfig = {
	checkXSS: true,
	checkSQLInjection: true,
	checkNoSQLInjection: true,
	checkCommandInjection: false, // Off by default, can cause false positives
	checkPathTraversal: true,
	checkHomoglyphs: true,
};

/**
 * Run every enabled detector against `input` and aggregate findings.
 *
 * Returns early-but-not-immediately: each individual detector still
 * runs to completion, but each detector returns at most one finding,
 * so the aggregate threats array is small (≤ 6 entries).
 *
 * Non-string inputs (`null`, `undefined`, numbers, …) are treated as
 * safe — wrap caller-side validation around this if you want to
 * reject non-strings.
 *
 * @param input - The candidate string.
 * @param config - Detector toggles. Defaults turn on everything
 *   except command-injection.
 * @returns `{ isSafe, threats }`.
 *
 * @example
 * ```ts
 * const result = detectThreatPatterns(req.body.query);
 * if (!result.isSafe) return new Response(getThreatErrorMessage(result), { status: 400 });
 * ```
 */
export function detectThreatPatterns(
	input: string,
	config: ThreatDetectionConfig = DEFAULT_CONFIG,
): ThreatDetectionResult {
	if (!input || typeof input !== "string") {
		return { isSafe: true, threats: [] };
	}

	const threats: ThreatFinding[] = [];

	if (config.checkXSS !== false) {
		threats.push(...containsXSSPatterns(input));
	}

	if (config.checkSQLInjection !== false) {
		threats.push(...containsSQLInjection(input));
	}

	if (config.checkNoSQLInjection !== false) {
		threats.push(...containsNoSQLInjection(input));
	}

	if (config.checkCommandInjection) {
		threats.push(...containsCommandInjection(input));
	}

	if (config.checkPathTraversal !== false) {
		threats.push(...containsPathTraversal(input));
	}

	if (config.checkHomoglyphs !== false) {
		threats.push(...containsHomoglyphs(input));
	}

	return {
		isSafe: threats.length === 0,
		threats,
	};
}

/**
 * Boolean shortcut over {@link detectThreatPatterns} — discards the
 * findings list when you only need a yes/no decision.
 *
 * @param input - String to test.
 * @param config - Optional detector toggles.
 * @returns `true` when no detector fires.
 */
export function isSafeInput(input: string, config?: ThreatDetectionConfig): boolean {
	return detectThreatPatterns(input, config).isSafe;
}

/**
 * HTML-entity escape `&`, `<`, `>`, `"`, `'`, and `/` for safe
 * insertion into HTML text and attribute contexts.
 *
 * **Limited scope.** This is appropriate for plain text destined for
 * `textContent` or attribute values, not for unfiltered HTML
 * rendering. For rich-text use a vetted sanitizer (DOMPurify on the
 * client, sanitize-html or similar on the server).
 *
 * Returns `""` for non-string or empty input.
 *
 * @param input - Untrusted string.
 * @returns Entity-escaped output safe to interpolate into HTML.
 */
export function sanitizeForDisplay(input: string): string {
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
 * Canonicalise a string for safe equality checks against ASCII.
 *
 * Two-pass:
 * 1. Normalize to NFC (composed form) so combining-character
 *    sequences don't compare differently from their pre-composed
 *    counterparts.
 * 2. Replace known homoglyphs (Cyrillic `А`, Greek `Ε`, …) with their
 *    ASCII equivalents (`A`, `E`, …).
 *
 * Use before storing user-controlled identifiers (usernames, domain
 * names) and before comparing them to a denylist or to each other.
 *
 * Returns `""` for non-string or empty input.
 *
 * @param input - Raw string from an untrusted source.
 * @returns ASCII-normalized, NFC-composed string.
 */
export function normalizeUnicode(input: string): string {
	if (!input || typeof input !== "string") return "";

	// Normalize to NFC (composed form)
	let normalized = input.normalize("NFC");

	// Replace known homoglyphs with ASCII equivalents
	for (const [ascii, homoglyphs] of Object.entries(HOMOGLYPH_MAP)) {
		for (const homoglyph of homoglyphs) {
			normalized = normalized.replace(new RegExp(homoglyph, "g"), ascii);
		}
	}

	return normalized;
}

//#endregion

//#region Validation Helpers

/**
 * Generic user-facing fallback message. Render this verbatim when a
 * detector fires but you don't want to expose which one. Prefer
 * {@link getThreatErrorMessage} for category-specific messages.
 */
export const THREAT_DETECTED_MESSAGE = "Input contains potentially unsafe content";

/**
 * Boolean refinement helper for use with `zod.string().refine(...)`,
 * `effect/Schema.filter(...)`, or any predicate-based validator.
 *
 * Equivalent to `isSafeInput(input)` with default config.
 */
export function validateSafeText(input: string): boolean {
	return isSafeInput(input);
}

/**
 * Refinement for human name fields. More permissive than
 * {@link validateSafeText} — allows international letters,
 * combining marks, hyphens, apostrophes, and spaces — but still
 * rejects HTML/SQL/NoSQL injection patterns and homoglyph forgeries.
 *
 * Suitable for first/last/full-name inputs in registration forms.
 *
 * @returns `true` when the name passes both the threat detectors and
 *   the name-shape regex.
 */
export function validateSafeName(input: string): boolean {
	// Normalize first to handle combining characters
	const normalized = input.normalize("NFC");

	// Names shouldn't contain HTML or script patterns
	if (!isSafeInput(normalized, { checkCommandInjection: false })) {
		return false;
	}

	// Additional check: names should be primarily letters, spaces, hyphens, apostrophes
	// This allows international names while blocking obvious injection attempts
	const namePattern = /^[\p{L}\p{M}'\-\s.]+$/u;
	return namePattern.test(normalized);
}

/**
 * Refinement for email fields. Combines:
 *
 * 1. RFC-style format check (length-bounded to ≤ 254 chars to
 *    prevent ReDoS).
 * 2. XSS / SQL / NoSQL / homoglyph detectors — emails are extremely
 *    constrained and should never legitimately contain HTML or query
 *    operators.
 *
 * @returns `true` when both checks pass.
 */
export function validateSafeEmail(input: string): boolean {
	// Standard format check — bounded length to prevent ReDoS
	if (input.length > 254) return false;
	const emailPattern =
		/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
	if (!emailPattern.test(input)) {
		return false;
	}

	// Check for injection patterns in email
	// Emails shouldn't have HTML, SQL commands, etc.
	const result = detectThreatPatterns(input, {
		checkXSS: true,
		checkSQLInjection: true,
		checkNoSQLInjection: true,
		checkCommandInjection: false,
		checkPathTraversal: false,
		checkHomoglyphs: true,
	});

	return result.isSafe;
}

/**
 * Map a {@link ThreatDetectionResult} into a user-facing error
 * message string suitable for an HTTP 400 response or form
 * validation error. Returns `""` when the result is safe (so
 * `error || undefined` works).
 *
 * Uses only the **first** finding for the message — exposing every
 * threat type to the user can leak information about the detection
 * rules. For full diagnostics, log `result.threats` server-side
 * rather than returning them.
 */
export function getThreatErrorMessage(result: ThreatDetectionResult): string {
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
		case "homoglyph":
			return "Input contains suspicious lookalike characters";
		default:
			return assertNever(threat.type);
	}
}
//#endregion
