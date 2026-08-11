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
 * @fileoverview Query-language signatures: SQL, NoSQL/document-store operators,
 * LDAP filters, and XPath expressions.
 *
 * These are the rules most prone to false positives, because ordinary English and
 * ordinary source code contain SQL keywords constantly. Two mitigations apply:
 *
 * 1. Every rule is scoped to a query context, so none of them runs against a bio, a
 *    support ticket, or a search box whose value is bound as a parameter.
 * 2. Tautology rules require a quote or paren adjacent to the comparison, so the
 *    bare substring `1=1` — which occurs in perfectly ordinary arithmetic — no
 *    longer fires on its own. The previous catalog matched `/1\s*=\s*1/` outright.
 *
 * Detection here is telemetry. Parameterized queries are the control: a bound
 * parameter is safe no matter which keywords it contains, and an interpolated one is
 * unsafe no matter how many signatures it dodges.
 *
 * @module @resq-systems/security/threats/rules/datastore
 */

import type { ThreatRule } from "../types.js";

//#region SQL

/** Repeated across every SQL rule. */
const SQL_CONTROL = "Bind values as query parameters; never concatenate SQL strings";

/** SQL-injection signatures. Scoped to the `sql` context. */
export const SQL_INJECTION_RULES: readonly ThreatRule[] = [
	{
		id: "SQL-UNION-001",
		type: "sql_injection",
		contexts: ["sql"],
		severity: "high",
		confidence: "high",
		description: "UNION SELECT — classic result-set grafting",
		cwe: 89,
		primaryControl: SQL_CONTROL,
		pattern: /\bUNION\s+(?:ALL\s+)?SELECT\b/i,
	},
	{
		id: "SQL-DROP-001",
		type: "sql_injection",
		contexts: ["sql"],
		severity: "critical",
		confidence: "high",
		description: "DROP of a schema object",
		cwe: 89,
		primaryControl: SQL_CONTROL,
		pattern: /\bDROP\s+(?:TABLE|DATABASE|SCHEMA|INDEX|VIEW|FUNCTION|PROCEDURE)\b/i,
	},
	{
		id: "SQL-DELETE-001",
		type: "sql_injection",
		contexts: ["sql"],
		severity: "high",
		confidence: "medium",
		description: "DELETE FROM in a value position",
		cwe: 89,
		primaryControl: SQL_CONTROL,
		pattern: /\bDELETE\s+FROM\b/i,
	},
	{
		id: "SQL-TRUNCATE-001",
		type: "sql_injection",
		contexts: ["sql"],
		severity: "high",
		confidence: "medium",
		description: "TRUNCATE TABLE in a value position",
		cwe: 89,
		primaryControl: SQL_CONTROL,
		pattern: /\bTRUNCATE\s+TABLE\b/i,
	},
	{
		id: "SQL-STACKED-001",
		type: "sql_injection",
		contexts: ["sql"],
		severity: "high",
		confidence: "high",
		description: "Statement separator followed by a new statement",
		cwe: 89,
		primaryControl: SQL_CONTROL,
		pattern: /;\s{0,8}(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|GRANT|EXEC|UNION)\b/i,
	},
	{
		id: "SQL-TAUTOLOGY-QUOTED-001",
		type: "sql_injection",
		contexts: ["sql"],
		severity: "high",
		confidence: "high",
		description: "Quote-escaped always-true comparison",
		cwe: 89,
		primaryControl: SQL_CONTROL,
		pattern: /['"]\s{0,8}(?:OR|AND)\s+['"]?\w{1,20}['"]?\s{0,8}=\s{0,8}['"]?\w{1,20}/i,
	},
	{
		id: "SQL-TAUTOLOGY-NUMERIC-001",
		type: "sql_injection",
		contexts: ["sql"],
		severity: "high",
		confidence: "high",
		description: "Quote- or paren-escaped numeric always-true comparison",
		cwe: 89,
		primaryControl: SQL_CONTROL,
		// Requires the escape character. A bare `1=1` is ordinary arithmetic and is
		// deliberately *not* matched — that was the old catalog's worst false positive.
		pattern: /['")]\s{0,8}(?:OR|AND)\s+\d{1,10}\s{0,8}=\s{0,8}\d{1,10}/i,
	},
	{
		id: "SQL-COMMENT-TERMINATOR-001",
		type: "sql_injection",
		contexts: ["sql"],
		severity: "medium",
		confidence: "low",
		description: "Trailing SQL comment, used to truncate the rest of a statement",
		cwe: 89,
		primaryControl: SQL_CONTROL,
		// The comment must follow a quote, paren, or digit — the position it occupies
		// when it truncates an injected statement. A bare `(?:--|#)…$` fires on CSS
		// colours (`#ff00aa`), issue references (`#123`), and em-dash-style prose.
		pattern: /['")\d]\s{0,8}(?:--|#)[^\r\n]{0,64}$/,
	},
	{
		// sqlmap ships this as its `versionedkeywords` tamper: MySQL executes the body of
		// a versioned comment while every other engine ignores it, so wrapping each
		// keyword hides the statement from a scanner looking for bare keywords. A value
		// reaching a SQL sink has no legitimate reason to contain one.
		id: "SQL-VERSIONED-COMMENT-001",
		type: "sql_injection",
		contexts: ["sql"],
		severity: "high",
		confidence: "high",
		description: "MySQL versioned comment, whose contents execute on MySQL only",
		cwe: 89,
		primaryControl: SQL_CONTROL,
		pattern: /\/\*!\d{0,5}/,
	},
	{
		id: "SQL-COMMENT-INLINE-001",
		type: "sql_injection",
		contexts: ["sql"],
		severity: "medium",
		confidence: "low",
		description: "Inline block comment, used to split keywords past naive filters",
		cwe: 89,
		primaryControl: SQL_CONTROL,
		pattern: /\/\*[\s\S]{0,200}?\*\//,
	},
	{
		id: "SQL-COMMENT-SPLIT-KEYWORD-001",
		type: "sql_injection",
		contexts: ["sql"],
		severity: "high",
		confidence: "high",
		description: "Inline comment separating two SQL keywords — keyword-filter evasion",
		cwe: 89,
		primaryControl: SQL_CONTROL,
		// `1 UNION/**/SELECT/**/1` defeats SQL-UNION-001, which requires whitespace
		// between the keywords, and previously scored only 1.0 from the generic
		// inline-comment rule — an `allow` verdict on a working injection. A comment
		// *between two keywords* has no benign explanation in a bound value, so this is
		// graded high/high where the bare-comment rule stays low/low.
		pattern:
			/\b(?:UNION|SELECT|INSERT|UPDATE|DELETE|DROP|FROM|WHERE|ORDER|GROUP|HAVING|AND|OR)\s{0,8}\/\*[^*]{0,64}\*\/\s{0,8}(?:UNION|SELECT|ALL|DISTINCT|FROM|WHERE|INTO|TABLE|BY|\d|['"])/i,
	},
	{
		id: "SQL-TIME-BLIND-001",
		type: "sql_injection",
		contexts: ["sql"],
		severity: "high",
		confidence: "high",
		description: "Time-delay function used for blind injection",
		cwe: 89,
		primaryControl: SQL_CONTROL,
		pattern: /\b(?:SLEEP|PG_SLEEP|BENCHMARK)\s{0,8}\(|\bWAITFOR\s+DELAY\b/i,
	},
	{
		id: "SQL-METADATA-001",
		type: "sql_injection",
		contexts: ["sql"],
		severity: "high",
		confidence: "medium",
		description: "Access to database metadata catalogs",
		cwe: 89,
		primaryControl: SQL_CONTROL,
		pattern:
			/\b(?:INFORMATION_SCHEMA|pg_catalog|sysobjects|syscolumns|sqlite_master|all_tables)\b/i,
	},
	{
		id: "SQL-XP-PROC-001",
		type: "sql_injection",
		contexts: ["sql"],
		severity: "critical",
		confidence: "high",
		description: "SQL Server extended procedure enabling OS access",
		cwe: 89,
		primaryControl: SQL_CONTROL,
		pattern: /\b(?:xp_cmdshell|xp_regread|xp_regwrite|xp_dirtree|sp_oacreate)\b/i,
	},
	{
		id: "SQL-FILE-IO-001",
		type: "sql_injection",
		contexts: ["sql"],
		severity: "critical",
		confidence: "high",
		description: "SQL file read/write primitive",
		cwe: 89,
		primaryControl: SQL_CONTROL,
		pattern:
			/\bINTO\s+(?:OUT|DUMP)FILE\b|\bLOAD_FILE\s{0,8}\(|\bCOPY\s+\w{1,64}\s+FROM\s+PROGRAM\b/i,
	},
	{
		id: "SQL-ENGINE-FILE-IO-001",
		type: "sql_injection",
		contexts: ["sql"],
		severity: "critical",
		confidence: "high",
		description: "Engine-specific file read/write primitive",
		cwe: 89,
		primaryControl: SQL_CONTROL,
		// SQL-FILE-IO-001 covers only the MySQL forms. Every primitive below scanned
		// clean unless the payload happened to carry a `;`, in which case
		// SQL-STACKED-001 caught it incidentally — remove the semicolon and each was
		// 0/allow.
		pattern:
			/\bpg_(?:read_file|read_binary_file|ls_dir|stat_file)\s{0,8}\(|\blo_(?:import|export)\s{0,8}\(|\bOPENROWSET\s{0,8}\(|\bOPENDATASOURCE\s{0,8}\(|\bATTACH\s+DATABASE\b|\bUTL_FILE\s{0,8}\./i,
	},
	{
		id: "SQL-OUT-OF-BAND-001",
		type: "sql_injection",
		contexts: ["sql"],
		severity: "critical",
		confidence: "high",
		description: "Out-of-band exfiltration or network primitive",
		cwe: 89,
		primaryControl: SQL_CONTROL,
		// Oracle's network packages and Postgres dblink are the standard out-of-band
		// channels for blind injection: they make the database itself perform the
		// exfiltration, so no data need come back through the response.
		pattern:
			/\bUTL_HTTP\s{0,8}\.|\bUTL_INADDR\s{0,8}\.|\bUTL_SMTP\s{0,8}\.|\bUTL_TCP\s{0,8}\.|\bDBMS_LDAP\s{0,8}\.|\bDBMS_PIPE\s{0,8}\.\s{0,8}RECEIVE_MESSAGE\b|\bdblink(?:_connect|_exec)?\s{0,8}\(/i,
	},
	{
		id: "SQL-HEX-LITERAL-001",
		type: "sql_injection",
		contexts: ["sql"],
		severity: "low",
		confidence: "low",
		description: "Long hex literal, sometimes used to smuggle string constants",
		cwe: 89,
		primaryControl: SQL_CONTROL,
		// Bounded at 8+ digits so ordinary colour codes (`0xFF00AA`) and short
		// constants do not fire. The old catalog used `/0x[0-9a-f]+/`, which matched
		// every CSS colour in the corpus.
		pattern: /\b0x[0-9a-f]{8,}\b/i,
	},
];

//#endregion

//#region NoSQL

/** Repeated across every NoSQL rule. */
const NOSQL_CONTROL =
	"Cast query values to primitives and reject object-valued inputs; never pass raw request bodies to a query builder";

/** Document-store operator injection (MongoDB and compatible drivers). */
export const NOSQL_INJECTION_RULES: readonly ThreatRule[] = [
	{
		id: "NOSQL-OPERATOR-OBJECT-001",
		type: "nosql_injection",
		contexts: ["nosql"],
		severity: "high",
		confidence: "high",
		description: "Object literal whose first key is a query operator",
		cwe: 943,
		primaryControl: NOSQL_CONTROL,
		pattern: /\{\s{0,8}["']?\$[a-z]{2,20}["']?\s{0,8}:/i,
	},
	{
		id: "NOSQL-JS-EXECUTION-001",
		type: "nosql_injection",
		contexts: ["nosql"],
		severity: "critical",
		confidence: "high",
		description: "Server-side JavaScript execution operator",
		cwe: 943,
		primaryControl: NOSQL_CONTROL,
		pattern: /\$(?:where|function|accumulator)\s{0,8}["']?\s{0,8}:/i,
	},
	{
		id: "NOSQL-OPERATOR-001",
		type: "nosql_injection",
		contexts: ["nosql"],
		severity: "medium",
		confidence: "medium",
		description: "Query operator token",
		cwe: 943,
		primaryControl: NOSQL_CONTROL,
		pattern:
			/\$(?:gte?|lte?|ne|eq|nin?|and|or|not|nor|exists|type|mod|regex|text|all|elemMatch|size|slice|expr|jsonSchema)\b/i,
	},
	{
		id: "NOSQL-OPERATOR-ARRAY-001",
		type: "nosql_injection",
		contexts: ["nosql"],
		severity: "medium",
		confidence: "medium",
		description: "Array subscript naming a query operator",
		cwe: 943,
		primaryControl: NOSQL_CONTROL,
		pattern: /\[\s{0,8}["']?\$[a-z]{2,20}["']?\s{0,8}\]/i,
	},
];

//#endregion

//#region LDAP

/** Repeated across every LDAP rule. */
const LDAP_CONTROL =
	"Escape filter values per RFC 4515 and DN components per RFC 4514 using the LDAP client's escaping helper";

/** LDAP filter and DN injection. */
export const LDAP_INJECTION_RULES: readonly ThreatRule[] = [
	{
		id: "LDAP-FILTER-WILDCARD-001",
		type: "ldap_injection",
		contexts: ["ldap"],
		severity: "high",
		confidence: "high",
		description: "Injected filter clause matching any value",
		cwe: 90,
		primaryControl: LDAP_CONTROL,
		pattern: /[()&|!]\s{0,8}\(\s{0,8}[a-z0-9;.-]{1,64}\s{0,8}=\s{0,8}\*/i,
	},
	{
		id: "LDAP-FILTER-CLOSE-001",
		type: "ldap_injection",
		contexts: ["ldap"],
		severity: "high",
		confidence: "medium",
		description: "Filter-terminating parenthesis followed by a boolean operator",
		cwe: 90,
		primaryControl: LDAP_CONTROL,
		pattern: /\)\s{0,8}[&|]\s{0,8}\(/,
	},
	{
		id: "LDAP-METACHAR-001",
		type: "ldap_injection",
		contexts: ["ldap"],
		severity: "medium",
		confidence: "low",
		description: "Unescaped LDAP filter metacharacter",
		cwe: 90,
		primaryControl: LDAP_CONTROL,
		pattern: /[*()\\]/,
	},
	{
		id: "LDAP-DN-INJECTION-001",
		type: "ldap_injection",
		contexts: ["ldap"],
		severity: "high",
		confidence: "medium",
		description: "RDN separator in a value destined for a distinguished name",
		cwe: 90,
		primaryControl:
			"Escape DN components per RFC 4514 using the LDAP client's DN escaping helper — filter escaping (RFC 4515) is a different function and does not cover these characters",
		// The filter rules above cover RFC 4515 metacharacters (`*`, parens, backslash).
		// A DN uses a different grammar entirely: `,` and `+` separate relative
		// distinguished names, so `admin,ou=admins,dc=example,dc=com` re-parents the
		// entry. All three DN forms scanned 0/allow before this rule.
		// Confidence is medium because a common name can legitimately contain a comma
		// ("Smith, John") — which is exactly why it must be escaped, not rejected.
		pattern: /[,+]\s{0,8}(?:cn|ou|dc|o|uid|sn|givenname|mail|member|objectclass)\s{0,8}=/i,
	},
	{
		id: "LDAP-DN-METACHAR-001",
		type: "ldap_injection",
		contexts: ["ldap"],
		severity: "medium",
		confidence: "low",
		description: "Unescaped RFC 4514 distinguished-name metacharacter",
		cwe: 90,
		primaryControl: "Escape DN components per RFC 4514 using the LDAP client's DN escaping helper",
		// Leading/trailing space and `#` are also special in a DN, but flagging them
		// would fire on nearly every human name, so only the structural characters are
		// listed here.
		pattern: /["<>;]|^[+,]|[+,]$/,
	},
];

//#endregion

//#region XPath

/** Repeated across every XPath rule. */
const XPATH_CONTROL =
	"Use a precompiled XPath with variable binding (XPathVariableResolver or equivalent); never concatenate expressions";

/** XPath/XQuery injection. */
export const XPATH_INJECTION_RULES: readonly ThreatRule[] = [
	{
		id: "XPATH-TAUTOLOGY-001",
		type: "xpath_injection",
		contexts: ["xpath"],
		severity: "high",
		confidence: "high",
		description: "Quote-escaped always-true predicate",
		cwe: 643,
		primaryControl: XPATH_CONTROL,
		pattern: /['"]\s{0,8}(?:or|and)\s+['"]?\w{1,20}['"]?\s{0,8}=\s{0,8}['"]?\w{1,20}/i,
	},
	{
		id: "XPATH-NODE-ESCAPE-001",
		type: "xpath_injection",
		contexts: ["xpath"],
		severity: "high",
		confidence: "high",
		description: "Predicate closed then unioned with a new node path",
		cwe: 643,
		primaryControl: XPATH_CONTROL,
		pattern: /\]\s{0,8}\|\s{0,8}\/{1,2}/,
	},
	{
		id: "XPATH-AXIS-001",
		type: "xpath_injection",
		contexts: ["xpath"],
		severity: "medium",
		confidence: "medium",
		description: "Explicit XPath axis, used to walk outside the intended subtree",
		cwe: 643,
		primaryControl: XPATH_CONTROL,
		pattern:
			/\b(?:ancestor|descendant|following|preceding|parent|child|self)(?:-or-self)?\s{0,8}::/i,
	},
	{
		id: "XPATH-FUNCTION-001",
		type: "xpath_injection",
		contexts: ["xpath"],
		severity: "low",
		confidence: "low",
		description: "XPath function call in a value position",
		cwe: 643,
		primaryControl: XPATH_CONTROL,
		pattern: /\b(?:count|name|local-name|namespace-uri|string-length|substring|position)\s{0,8}\(/i,
	},
];

//#endregion
