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
 * @fileoverview Protocol- and token-level signatures: HTTP parameter pollution,
 * credential exposure, and JWT tampering.
 *
 * `credential_exposure` inverts the direction of every other category in the catalog.
 * The rest detect a hostile value arriving; these detect the application's own secret
 * *leaving* — in a URL it is about to fetch, or a line it is about to log. Both are
 * outbound sinks, so the context model still fits, but the user-facing message must
 * not accuse the submitter of anything.
 *
 * @module @resq-systems/security/threats/rules/protocol
 */

import type { ThreatRule } from "../types.js";

//#region HTTP parameter pollution

/**
 * Parameter pollution.
 *
 * Only the *injected-parameter* half is detectable here. Duplicate-key pollution —
 * `?id=1&id=2` exploiting parser disagreement between ASP.NET, PHP, and Servlet
 * stacks — is not: the engine sees one string and never the parameter map, and
 * duplicate keys are legal and routine (`?tag=a&tag=b`). That half is a parsing
 * decision, documented as such rather than faked with a signature.
 */
export const PARAMETER_POLLUTION_RULES: readonly ThreatRule[] = [
	{
		id: "PARAM-POLLUTION-PRIVILEGED-001",
		type: "parameter_pollution",
		// `url_parameter`, never `url`. In a whole URL `&role=` is ordinary grammar;
		// inside a single value about to be concatenated into a query string it is an
		// injected parameter. Attaching these to `url` produced measured false positives
		// on `?sku=99&color=red` and on OAuth authorize URLs.
		contexts: ["url_parameter"],
		severity: "high",
		confidence: "medium",
		description: "Injected parameter naming a privilege, price, or credential field",
		cwe: 235,
		primaryControl:
			"Build query strings with URLSearchParams or encodeURIComponent per value; read parameters through one parser and reject duplicate keys server-side",
		// `client_id`, `scope`, `state`, `next`, `redirect`, `callback`, and `lang` are
		// deliberately absent — that exclusion is what lets nested OAuth URLs pass.
		pattern:
			/[&;][a-z0-9_.[-]{0,24}(?:role|is_?admin|admin|user_?id|userid|uid|account_?id|amount|price|total|quantity|qty|access_?token|api_?key|apikey|client_?secret|secret|password|passwd|pwd|session_?id|sessionid|signature|hmac|permissions?|privilege|is_?staff|superuser|debug)[\]"']{0,2}\s{0,4}=/i,
	},
	{
		id: "PARAM-POLLUTION-APPEND-001",
		type: "parameter_pollution",
		contexts: ["url_parameter"],
		severity: "medium",
		confidence: "low",
		description: "Value appends an additional query parameter",
		cwe: 235,
		primaryControl:
			"Build query strings with URLSearchParams or encodeURIComponent per value; read parameters through one parser and reject duplicate keys server-side",
		// `&`-only: including `;` fired on connection strings (`Server=a;Database=b`),
		// so `;`-separated pollution against a non-privileged name stays undetected.
		// The `^[^?]{0,256}` guard keeps nested `redirect_uri` values from firing, but
		// it is positional — a bare sub-query with no leading `?` still matches. Graded
		// medium/low (1.0) so it never reaches review on its own.
		pattern: /^[^?]{0,256}&[a-z_][a-z0-9_.-]{1,48}(?:\[[a-z0-9_.-]{0,32}\])?\s{0,4}=/i,
	},
];

//#endregion

//#region Credential exposure

/** Repeated across the URL-borne credential rules. */
const CRED_URL_CONTROL =
	"Carry credentials in the Authorization header or a POST body, never a query string; set Referrer-Policy: no-referrer and rotate any token that reached a URL";

/** Repeated across the log-borne credential rules. */
const CRED_LOG_CONTROL =
	"Log structured records with an allowlist of loggable fields; redact by key with safeStringify";

/**
 * Credential material appearing where it will be stored, logged, or sent onward.
 *
 * A generic `password=…` / `api_key: …` assignment rule was written and then dropped:
 * it produced false positives on every realistic log line of the form
 * `"api_key: required for this endpoint"` and `"validation failed: password: too_short"`.
 * Shipping it weakened would trade the category's credibility for coverage.
 */
export const CREDENTIAL_EXPOSURE_RULES: readonly ThreatRule[] = [
	{
		id: "CRED-URL-QUERY-001",
		type: "credential_exposure",
		contexts: ["url", "log"],
		severity: "high",
		confidence: "medium",
		description: "Credential-bearing query parameter — leaks via Referer, proxies, and logs",
		cwe: 598,
		primaryControl: CRED_URL_CONTROL,
		// `sid`, `auth`, `key`, and bare `token` are excluded: `?sid=` is routinely a
		// store identifier. `sig`/`signature`/`X-Amz-*` are excluded because S3
		// presigned URLs legitimately carry them.
		pattern:
			/[?&](?:access[_-]?token|auth[_-]?token|id[_-]?token|refresh[_-]?token|api[_-]?key|api[_-]?secret|client[_-]?secret|secret[_-]?key|session[_-]?id|session[_-]?token|jsessionid|phpsessid|password|passwd|pwd)=[^&#\s]{4,256}/i,
	},
	{
		id: "CRED-AUTH-SCHEME-001",
		type: "credential_exposure",
		contexts: ["log"],
		severity: "high",
		confidence: "high",
		description: "Authorization header value written to a log",
		cwe: 532,
		primaryControl: CRED_LOG_CONTROL,
		pattern:
			/\b(?:proxy-)?authorization\s{0,4}:\s{0,4}(?:bearer|basic|digest|token|apikey)\s{0,4}[A-Za-z0-9+/=._~-]{8,512}/i,
	},
	{
		id: "CRED-JWT-001",
		type: "credential_exposure",
		contexts: ["url", "log"],
		severity: "high",
		confidence: "high",
		description: "JSON Web Token in a URL or log line",
		cwe: 522,
		primaryControl: CRED_URL_CONTROL,
		pattern: /\beyJ[A-Za-z0-9_-]{10,400}\.eyJ[A-Za-z0-9_-]{10,400}\./,
	},
	{
		id: "CRED-PROVIDER-KEY-001",
		type: "credential_exposure",
		contexts: ["url", "log"],
		severity: "critical",
		confidence: "high",
		description: "Provider API key or personal access token",
		cwe: 532,
		primaryControl:
			"Load provider keys from a secret manager, never from source or a URL; rotate immediately on exposure",
		// Case-sensitive by design — an `i` flag collides with ordinary hex digests.
		pattern:
			/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b|\bgh[pousr]_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{22,82}\b|\bxox[abprs]-[A-Za-z0-9-]{10,120}|\bsk_live_[A-Za-z0-9]{16,64}\b|\bsk-(?:ant|proj)-[A-Za-z0-9_-]{20,120}/,
	},
];

//#endregion

//#region Double encoding

/**
 * Double percent-encoding.
 *
 * `%253Cscript%253E` decodes once to `%3Cscript%3E` and twice to `<script>`. The
 * scanner decodes once, so the payload was invisible to every signature — verified at
 * 0/allow before this rule existed. The traversal case had an explicit
 * `%252e%252e%252f` rule; nothing covered the general class.
 *
 * Its own category rather than a subtype of whatever it eventually decodes to: at scan
 * time the eventual sink is unknown, and the signal — "this input is shaped to survive
 * one decoding pass" — is itself the finding. The real fix is to decode exactly once,
 * at a defined boundary, and never again.
 */
export const DOUBLE_ENCODING_RULES: readonly ThreatRule[] = [
	{
		// The sibling rule below matches the form where only the percent sign is
		// re-encoded. Encoding the hex digits as well yields the same byte after two
		// decodes, and is invisible to a pattern that expects those digits to follow the
		// escaped percent literally. Measured: the half-encoded spelling of a script tag
		// scored review, while the fully-encoded spelling of the identical payload
		// scored zero.
		id: "ENCODING-DOUBLE-PERCENT-002",
		type: "double_encoding",
		contexts: ["url", "url_parameter", "html", "filesystem", "sql", "http_header", "xml"],
		severity: "high",
		confidence: "high",
		description: "Percent sign and its hex digits each encoded separately",
		cwe: 177,
		primaryControl:
			"Decode exactly once at a defined boundary and never re-decode; reject input that still contains an escape prefix after decoding",
		pattern: /%25%[0-9a-f]{2}%[0-9a-f]{2}/i,
	},

	{
		id: "ENCODING-DOUBLE-PERCENT-001",
		type: "double_encoding",
		contexts: ["url", "url_parameter", "html", "filesystem", "sql", "http_header", "xml"],
		severity: "high",
		confidence: "medium",
		description: "Escape prefix that decodes to a metacharacter only after a second pass",
		cwe: 177,
		primaryControl:
			"Decode exactly once at a defined boundary and never re-decode; reject input that still contains an escape prefix after decoding",
		// Only sequences decoding to a character with syntactic meaning: space, quote,
		// percent, apostrophe, parens, dot, slash, angle brackets, semicolon, ampersand,
		// equals, backslash, NUL, CR, LF. A bare `%25` is not enough — "100%25 off" is
		// an ordinary encoded string and must not fire.
		variants: ["raw"],
		pattern: /%25(?:2[0257CEFcef]|3[CEce]|22|26|27|28|29|3[BbDd]|5[Cc]|00|0[ADad])/,
	},
];

//#endregion

//#region JWT

/** Repeated across the JWT rules. */
const JWT_CONTROL =
	"Verify with an explicit algorithm allowlist (jwtVerify(token, key, { algorithms: ['RS256'] })); never let the token's own header select the algorithm, and reject 'none' unconditionally";

/**
 * JWT tampering.
 *
 * Scoped to the unsecured-token case alone. `kid`, `jku`, and `x5u` injection are
 * *already covered* — extract the claim and declare its real sink, and the existing
 * rules fire: `kid=../../../../dev/null` with `filesystem` hits PATH-TRAVERSAL-001,
 * `jku=http://169.254.169.254/` with `url` hits SSRF-METADATA-001. Re-scanning a whole
 * opaque token with every detector would be the run-everything-against-everything
 * anti-pattern the engine exists to avoid.
 */
export const JWT_RULES: readonly ThreatRule[] = [
	{
		id: "JWT-ALG-NONE-UNSECURED-001",
		type: "jwt_tampering",
		contexts: ["jwt", "http_header"],
		severity: "high",
		confidence: "high",
		description: "Unsecured JWT — three segments with an empty signature",
		cwe: 347,
		primaryControl: JWT_CONTROL,
		// Structural, not lexical. RFC 7519 §6.1 requires an empty signature segment,
		// so this is immune to base64 alignment, key ordering, whitespace, and `alg`
		// casing — all of which change how `"alg":"none"` encodes (`hbGciOiJub25l`,
		// `YWxnIjoibm9uZ`, `ImFsZyI6Im5vbmUi`, depending on offset mod 3).
		// Requiring `eyJ` on *both* segments, not just `ey`, removes false positives on
		// filenames such as `eyewitness_statement_final.v2.`.
		pattern:
			/(?:^|[\s,;=("'[])eyJ[A-Za-z0-9_-]{16,2000}\.eyJ[A-Za-z0-9_-]{8,4000}\.(?:$|[\s,;)"'\]&#])/,
	},
	{
		id: "JWT-ALG-NONE-HEADER-001",
		type: "jwt_tampering",
		contexts: ["jwt"],
		severity: "high",
		confidence: "high",
		description: "Decoded JWT header selecting the 'none' algorithm",
		cwe: 347,
		primaryControl: JWT_CONTROL,
		// Covers what the structural rule cannot: `alg:none` carrying a non-empty
		// signature, which naive verifiers still accept.
		pattern: /"alg"\s{0,8}:\s{0,8}"\s{0,8}none\s{0,8}"/i,
	},
];

//#endregion
