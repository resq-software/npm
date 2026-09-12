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
 * @fileoverview Browser- and protocol-facing signatures: XSS, prototype pollution,
 * HTTP/SMTP header injection (CRLF), spreadsheet formula injection, and log forging.
 *
 * None of these rules is the control that stops the attack. XSS is stopped by
 * context-correct output encoding plus a parser-based sanitizer; prototype pollution
 * by schema validation that rejects unknown keys and by null-prototype dictionaries;
 * header injection by a header API that refuses CR/LF; formula injection by prefixing
 * exported cells; log forging by structured logging that encodes field values.
 *
 * @module @resq-systems/security/threats/rules/web
 */

import type { ThreatRule } from "../types.js";

//#region Cross-site scripting

/** Repeated across every XSS rule — the control that actually prevents the weakness. */
const XSS_CONTROL = "Escape at the HTML sink; sanitize rich HTML with DOMPurify";

/** XSS signatures. Meaningful only where the value is interpolated into markup. */
export const XSS_RULES: readonly ThreatRule[] = [
	{
		id: "XSS-SCRIPT-TAG-001",
		type: "xss",
		contexts: ["html", "xml"],
		severity: "high",
		confidence: "high",
		description: "Opening <script> tag",
		cwe: 79,
		primaryControl: XSS_CONTROL,
		// Opening tag only — a greedy `<script>[\s\S]*</script>` invites backtracking
		// blowups on crafted input and adds no detection value.
		pattern: /<\s*script\b/i,
	},
	{
		id: "XSS-EVENT-HANDLER-001",
		type: "xss",
		contexts: ["html", "xml"],
		severity: "high",
		confidence: "high",
		description: "Inline event handler attribute inside a tag",
		cwe: 79,
		primaryControl: XSS_CONTROL,
		pattern: /<[a-z][^>]{0,300}\bon[a-z]{3,20}\s{0,8}=/i,
	},
	{
		id: "XSS-EVENT-HANDLER-002",
		type: "xss",
		contexts: ["html"],
		severity: "medium",
		confidence: "medium",
		description: "Event-handler-shaped assignment to a quoted value",
		cwe: 79,
		primaryControl: XSS_CONTROL,
		pattern:
			/\bon(?:error|load|click|focus|blur|submit|change|toggle|mouse[a-z]{2,12}|key[a-z]{2,6}|animation[a-z]{3,10}|pointer[a-z]{2,12})\s{0,8}=\s{0,8}["'`]/i,
	},
	{
		id: "XSS-URI-SCHEME-001",
		type: "xss",
		contexts: ["html", "url", "xml"],
		severity: "high",
		confidence: "medium",
		description: "Script-bearing URI scheme",
		cwe: 79,
		primaryControl: "Allowlist the URL scheme before rendering or navigating",
		pattern: /\b(?:javascript|vbscript|livescript|mocha)\s{0,8}:/i,
	},
	{
		id: "XSS-DATA-URI-001",
		type: "xss",
		contexts: ["html", "url"],
		severity: "high",
		confidence: "high",
		description: "data: URI carrying an active content type",
		cwe: 79,
		primaryControl: "Allowlist the URL scheme before rendering or navigating",
		pattern:
			/\bdata\s{0,8}:\s{0,8}(?:text\/html|image\/svg\+xml|application\/(?:javascript|xhtml\+xml|ecmascript))/i,
	},
	{
		id: "XSS-DANGEROUS-TAG-001",
		type: "xss",
		contexts: ["html", "xml"],
		// High rather than medium: these tags load or reframe active content, which
		// buys clickjacking, phishing overlays, and drive-by loads even without script
		// execution. Confidence stays medium because a rich-text field may legitimately
		// permit some of them — that is what `excludeRuleIds` is for.
		severity: "high",
		confidence: "medium",
		description: "Tag that can load or reframe active content",
		cwe: 79,
		primaryControl: XSS_CONTROL,
		pattern: /<\s{0,8}(?:iframe|object|embed|applet|base|meta|link|svg|math|portal|frameset)\b/i,
	},
	{
		id: "XSS-STYLE-EXPRESSION-001",
		type: "xss",
		contexts: ["html"],
		severity: "medium",
		confidence: "medium",
		description: "CSS expression() — legacy IE script execution vector",
		cwe: 79,
		primaryControl: XSS_CONTROL,
		pattern: /\bexpression\s{0,8}\(/i,
	},
	{
		id: "XSS-DOM-SINK-001",
		type: "xss",
		contexts: ["html"],
		severity: "medium",
		confidence: "medium",
		description: "Reference to a credential- or navigation-bearing DOM property",
		cwe: 79,
		primaryControl: XSS_CONTROL,
		pattern:
			/\b(?:document|window)\s{0,8}\.\s{0,8}(?:cookie|domain|write|writeln|location|open)\b/i,
	},
	{
		id: "XSS-DOM-SINK-002",
		type: "xss",
		contexts: ["html"],
		severity: "medium",
		confidence: "medium",
		description: "Assignment to a raw-markup DOM sink",
		cwe: 79,
		primaryControl: "Assign via textContent, or sanitize with DOMPurify first",
		pattern: /\b(?:innerHTML|outerHTML|srcdoc)\s{0,8}=|\binsertAdjacentHTML\s{0,8}\(/i,
	},
	{
		id: "XSS-DYNAMIC-EVAL-001",
		type: "xss",
		contexts: ["html"],
		severity: "high",
		confidence: "medium",
		description: "Dynamic code evaluation (eval / Function constructor)",
		cwe: 95,
		primaryControl: "Never evaluate strings; a CSP without 'unsafe-eval' blocks this",
		pattern: /\beval\s{0,8}\(|\bnew\s+Function\s{0,8}\(/i,
	},
	{
		id: "XSS-URI-SCHEME-002",
		type: "xss",
		contexts: ["html", "url"],
		severity: "high",
		confidence: "medium",
		description: "Script-bearing URI scheme split by tab, CR, or LF",
		cwe: 79,
		primaryControl:
			"Allowlist the URL scheme after canonicalization: decode HTML character references, strip ASCII tab/CR/LF, then compare against an allowlist (http, https, mailto)",
		// XSS-URI-SCHEME-001 allows whitespace only *between* the token and the colon,
		// so `jav&#x09;ascript:alert(1)` scanned clean and still executes in current
		// browsers — the WHATWG URL parser strips exactly tab, CR, and LF from a scheme.
		// The leading lookahead requires an intra-token separator, so a plain
		// `javascript:` is not double-scored by this rule and -001 together.
		pattern:
			/(?=[a-z\t\n\r]{0,16}[\t\n\r])j[\t\n\r]{0,8}a[\t\n\r]{0,8}v[\t\n\r]{0,8}a[\t\n\r]{0,8}s[\t\n\r]{0,8}c[\t\n\r]{0,8}r[\t\n\r]{0,8}i[\t\n\r]{0,8}p[\t\n\r]{0,8}t[\t\n\r ]{0,8}:/i,
	},
	{
		id: "XSS-DYNAMIC-EVAL-002",
		type: "xss",
		contexts: ["html"],
		// Graded to match XSS-DYNAMIC-EVAL-001: a string-argument timer is
		// eval-equivalent, so the same severity applies. Confidence stays medium
		// because the token appears in ordinary code discussion.
		severity: "high",
		confidence: "medium",
		description: "String-argument timer or Function call — an implicit eval sink",
		cwe: 95,
		primaryControl: "Never evaluate strings; a CSP without 'unsafe-eval' blocks this",
		pattern:
			/\b(?:setTimeout|setInterval|setImmediate|Function)\s{0,8}\(\s{0,8}["'`]|\bexecScript\s{0,8}\(/i,
	},
	{
		id: "XSS-DYNAMIC-EVAL-003",
		type: "xss",
		contexts: ["html"],
		severity: "medium",
		confidence: "medium",
		description: "constructor.constructor chain used to reach the Function constructor",
		cwe: 95,
		primaryControl: "Never evaluate strings; a CSP without 'unsafe-eval' blocks this",
		pattern: /\bconstructor\s{0,8}(?:\.\s{0,8}constructor|\[\s{0,8}["'`]constructor)/i,
	},
	{
		id: "XSS-EVENT-HANDLER-003",
		type: "xss",
		contexts: ["html"],
		severity: "high",
		confidence: "medium",
		description: "Event handler introduced by breaking out of a quoted attribute",
		cwe: 79,
		primaryControl: XSS_CONTROL,
		// XSS-EVENT-HANDLER-001 needs a preceding `<tag`; -002 needs a quote *after*
		// the `=`. An attribute-breakout payload (`" onmouseover=alert(1) x="`) has
		// neither, so it scanned clean while its quoted twin scored 2 — the pair was
		// inconsistent precisely on the harder case.
		// Handler names are an explicit allowlist rather than `on[a-z]{3,20}`, so
		// `"onboarding="` and `"onlineStatus="` cannot trip it.
		pattern:
			/["'`]\s{0,8}on(?:error|load|click|focus|blur|submit|change|toggle|wheel|scroll|input|select|paste|copy|cut|contextmenu|auxclick|mouse[a-z]{2,12}|key[a-z]{2,6}|animation[a-z]{3,10}|pointer[a-z]{2,12}|drag[a-z]{0,10}|touch[a-z]{2,10})\s{0,8}=/i,
	},
	{
		id: "XSS-EVENT-HANDLER-004",
		type: "xss",
		contexts: ["html"],
		// High, matching every other event-handler rule: an inline handler assigned a
		// call expression *is* script execution. Confidence stays medium because the
		// same text appears in escaped documentation.
		severity: "high",
		confidence: "medium",
		description: "Unquoted event handler assigned a callable expression",
		cwe: 79,
		primaryControl: XSS_CONTROL,
		// The `(?:^|[^.\w-])` prefix is a consuming class rather than a lookbehind, to
		// match catalog style; it excludes ordinary property assignment (`el.onclick=`).
		// Whitespace before `=` is forbidden, which kills prose false positives such as
		// "onload = init()" at the cost of missing spaced payloads into unquoted sinks.
		pattern:
			/(?:^|[^.\w-])on(?:error|load|click|focus|blur|submit|change|toggle|wheel|scroll|input|select|paste|copy|cut|contextmenu|auxclick|mouse[a-z]{2,12}|key[a-z]{2,6}|animation[a-z]{3,10}|pointer[a-z]{2,12}|drag[a-z]{0,10}|touch[a-z]{2,10})=\s{0,8}[\w$.[\]]{1,40}\s{0,8}[(`]/i,
	},
	{
		id: "XSS-FORM-TAG-001",
		type: "xss",
		contexts: ["html"],
		severity: "high",
		confidence: "medium",
		description: "Injected form or input element — credential-harvesting overlay",
		cwe: 79,
		primaryControl: XSS_CONTROL,
		// Must exclude `html_decoded`: without that it fires on any CMS body that
		// documents HTML in escaped form (`&lt;form action="/login"&gt;`). An
		// entity-encoded form tag is already neutralized — the encoding *is* the
		// control. Percent-encoded evasion stays covered.
		variants: ["raw", "nfc", "nfkc", "percent_decoded"],
		pattern: /<\s{0,8}(?:form|input|textarea|button|select|keygen|isindex)\b/i,
	},
	{
		id: "XSS-STYLE-TAG-001",
		type: "xss",
		contexts: ["html"],
		severity: "medium",
		confidence: "medium",
		description: "Injected style element",
		cwe: 79,
		primaryControl: XSS_CONTROL,
		variants: ["raw", "nfc", "nfkc", "percent_decoded"],
		pattern: /<\s{0,8}style\b/i,
	},
	{
		id: "XSS-DANGLING-MARKUP-001",
		type: "xss",
		contexts: ["html"],
		severity: "high",
		confidence: "medium",
		description: "Unterminated resource attribute — exfiltrates the following markup",
		cwe: 79,
		primaryControl: XSS_CONTROL,
		pattern:
			/\b(?:src|href|action|formaction|poster|background)\s{0,8}=\s{0,8}["'][^"'<>]{0,300}$/i,
	},
];

//#endregion

//#region Prototype pollution

/** Repeated across the prototype-pollution rules. */
const PROTO_CONTROL =
	"Reject unknown keys via schema validation; use Object.create(null) maps and a merge that skips __proto__/constructor/prototype";

/**
 * Prototype-pollution signatures.
 *
 * Deliberately its own {@link ThreatRule.type} rather than a subcategory of XSS:
 * this is an object-graph manipulation weakness, not a markup one, and it is fixed
 * by different controls (`Object.create(null)` dictionaries, schema validation that
 * rejects unknown keys, merge helpers that skip inherited and forbidden keys).
 *
 * The patterns match structural property paths, so `__proto__` reached via bracket
 * notation or as a quoted JSON key is caught while prose that merely mentions the
 * word is not.
 */
export const PROTOTYPE_POLLUTION_RULES: readonly ThreatRule[] = [
	{
		id: "PROTO-POLLUTION-PROTO-001",
		type: "prototype_pollution",
		contexts: ["object_merge", "nosql", "url", "template"],
		severity: "critical",
		confidence: "high",
		description: "__proto__ used as a structural property path segment",
		cwe: 1321,
		primaryControl: PROTO_CONTROL,
		pattern: /(?:^|[.[\]"'])__proto__(?:$|[.[\]"'])/,
	},
	{
		id: "PROTO-POLLUTION-PROTOTYPE-001",
		type: "prototype_pollution",
		contexts: ["object_merge", "nosql", "url", "template"],
		severity: "high",
		confidence: "medium",
		description: "'prototype' used as a structural property path segment",
		cwe: 1321,
		primaryControl: PROTO_CONTROL,
		pattern: /(?:^|[.[\]"'])prototype(?:$|[.[\]"'])/,
	},
	{
		id: "PROTO-POLLUTION-CONSTRUCTOR-001",
		type: "prototype_pollution",
		contexts: ["object_merge", "nosql", "url", "template"],
		severity: "critical",
		confidence: "high",
		description: "constructor.prototype access chain",
		cwe: 1321,
		primaryControl: PROTO_CONTROL,
		// Two shapes: property/bracket access (`constructor.prototype`,
		// `constructor["prototype"]`) and the nested-object form that arrives through
		// a JSON body or query-string expansion (`"constructor":{"prototype":…}`).
		pattern:
			/\bconstructor\s{0,8}(?:\.|\[)\s{0,8}["']?prototype\b|["']constructor["']\s{0,8}:\s{0,8}\{\s{0,8}["']prototype["']/i,
	},
];

//#endregion

//#region Header injection

/** Repeated across the header-injection rules. */
const HEADER_CONTROL = "Use a header API that rejects CR/LF; never concatenate raw header strings";

/** CRLF injection into HTTP or SMTP header values (response splitting). */
export const HEADER_INJECTION_RULES: readonly ThreatRule[] = [
	{
		id: "HEADER-CRLF-001",
		type: "header_injection",
		contexts: ["http_header"],
		severity: "high",
		confidence: "high",
		description: "Raw CR or LF in a header value",
		cwe: 113,
		primaryControl: HEADER_CONTROL,
		pattern: /[\r\n]/,
	},
	{
		id: "HEADER-CRLF-ENCODED-001",
		type: "header_injection",
		contexts: ["http_header", "url"],
		severity: "high",
		confidence: "medium",
		description: "Percent-encoded CR/LF or NUL, decodable into a header break",
		cwe: 113,
		primaryControl: HEADER_CONTROL,
		pattern: /%0d|%0a|%00/i,
		variants: ["raw"],
	},
	{
		id: "HEADER-SMUGGLED-NAME-001",
		type: "header_injection",
		contexts: ["http_header"],
		severity: "critical",
		confidence: "high",
		description: "Line break followed by a security-relevant header name",
		cwe: 113,
		primaryControl: HEADER_CONTROL,
		pattern:
			/[\r\n]\s{0,8}(?:set-cookie|location|content-length|transfer-encoding|host|authorization|bcc|cc|to)\s{0,8}:/i,
	},
	{
		id: "HEADER-UNICODE-LINEBREAK-001",
		type: "header_injection",
		contexts: ["http_header", "log"],
		severity: "high",
		confidence: "high",
		description: "Unicode line break — treated as a newline by some parsers and loggers",
		cwe: 113,
		primaryControl: HEADER_CONTROL,
		// U+2028 LINE SEPARATOR, U+2029 PARAGRAPH SEPARATOR, U+0085 NEL. None is matched
		// by `[\r\n]`, yet each terminates a line in JS string literals, in several log
		// processors, and in some header parsers. All three scanned clean before this.
		pattern: /[\u2028\u2029\u0085]/,
	},
	{
		id: "HEADER-CRLF-OVERLONG-001",
		type: "header_injection",
		contexts: ["http_header", "url"],
		severity: "high",
		confidence: "high",
		description: "Overlong or Unicode-squeezed encoding of CR/LF",
		cwe: 113,
		primaryControl: HEADER_CONTROL,
		// `%e5%98%8a` is U+560A, whose low byte is 0x0A: any component that narrows
		// UTF-16 to a byte emits a bare LF. `%c0%8a` is the overlong UTF-8 form of the
		// same byte. Both slip past a filter that only looks for `%0a`.
		variants: ["raw"],
		pattern: /%e5%98%8[ad]|%c0%8[ad]|%c1%8[ad]/i,
	},
];

//#endregion

//#region Spreadsheet formula injection

/** Repeated across the formula-injection rules. */
const FORMULA_CONTROL =
	"Escape exported cells with escapeCsvField / toCsvRow before writing the file";

/** CSV/XLSX formula injection — the payload executes in the *recipient's* spreadsheet. */
export const FORMULA_INJECTION_RULES: readonly ThreatRule[] = [
	{
		id: "CSV-FORMULA-LEAD-001",
		type: "formula_injection",
		contexts: ["spreadsheet"],
		severity: "high",
		confidence: "medium",
		description: "Cell value begins with a formula-trigger character",
		cwe: 1236,
		primaryControl: FORMULA_CONTROL,
		pattern: /^[\s'"]{0,8}[=+\-@\t\r]/,
	},
	{
		id: "CSV-DDE-001",
		type: "formula_injection",
		contexts: ["spreadsheet"],
		severity: "critical",
		confidence: "high",
		description: "Spreadsheet function capable of remote fetch or command execution",
		cwe: 1236,
		primaryControl: FORMULA_CONTROL,
		pattern:
			/\b(?:DDE|DDEAUTO|WEBSERVICE|HYPERLINK|IMPORTXML|IMPORTDATA|IMPORTFEED|IMPORTHTML|IMPORTRANGE|RTD)\s{0,8}\(/i,
	},
];

//#endregion

//#region Log forging

/** Repeated across the log-injection rules. */
const LOG_CONTROL =
	"Log structured records; encode field values with encodeLogValue before writing them";

/** Log injection — forged entries, and terminal escape sequences in logged content. */
export const LOG_INJECTION_RULES: readonly ThreatRule[] = [
	{
		id: "LOG-CRLF-001",
		type: "log_injection",
		contexts: ["log"],
		severity: "medium",
		confidence: "medium",
		description: "Line break in a value written to a line-based log",
		cwe: 117,
		primaryControl: LOG_CONTROL,
		pattern: /[\r\n]/,
	},
	{
		id: "LOG-FORGED-ENTRY-001",
		type: "log_injection",
		contexts: ["log"],
		severity: "high",
		confidence: "medium",
		description: "Line break followed by a forged log-level marker",
		cwe: 117,
		primaryControl: LOG_CONTROL,
		pattern: /[\r\n]\s{0,8}[[{(]?\s{0,8}(?:INFO|WARN|WARNING|ERROR|DEBUG|FATAL|TRACE|CRITICAL)\b/i,
	},
	{
		id: "LOG-ANSI-ESCAPE-001",
		type: "log_injection",
		contexts: ["log"],
		severity: "medium",
		confidence: "high",
		description: "ANSI/terminal escape sequence in logged content",
		cwe: 117,
		primaryControl:
			"Encode with encodeLogValue, or strip with stripAnsi when the rendering matters more than the record",
		// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI sequences are defined by the ESC control character
		pattern: /\u001b\[[0-9;?]{0,32}[\x40-\x7e]/,
	},
];

//#endregion
