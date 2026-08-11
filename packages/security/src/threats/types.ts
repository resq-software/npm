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
 * @fileoverview Vocabulary for the threat rule engine — weakness categories, sink
 * contexts, severity/confidence grades, and the {@link ThreatRule} /
 * {@link ThreatFinding} shapes that carry them. Everything here is data-only so the
 * rule catalog, the scanner, and the scoring policy can be reasoned about (and
 * unit-tested) independently.
 *
 * Design note: rules are *telemetry and defense-in-depth*, not the primary control.
 * The primary control for each category is the sink-appropriate one — parameterized
 * queries for SQL, a parser-based sanitizer for HTML, canonicalize-and-contain for
 * filesystem paths, argv-array process spawning for shells. Each rule names its own
 * in {@link ThreatRule.primaryControl}.
 *
 * @module @resq-systems/security/threats/types
 */

//#region Categories

/**
 * The closed set of weakness categories the engine recognizes.
 *
 * Serves as the discriminant of {@link ThreatFinding} and drives the exhaustive
 * `switch` in `getThreatErrorMessage` — adding a variant here without a matching
 * `case` there is a compile error via `assertNever`.
 *
 * Categories follow the OWASP Web Security Testing Guide's input-validation chapter
 * so findings map onto an established taxonomy rather than package-local names.
 */
export type ThreatType =
	| "xss"
	| "sql_injection"
	| "nosql_injection"
	| "command_injection"
	| "path_traversal"
	| "prototype_pollution"
	| "homoglyph"
	| "header_injection"
	| "ldap_injection"
	| "xpath_injection"
	| "xml_injection"
	| "template_injection"
	| "file_inclusion"
	| "ssrf"
	| "formula_injection"
	| "log_injection"
	| "prompt_injection"
	| "parameter_pollution"
	| "credential_exposure"
	| "jwt_tampering"
	| "double_encoding"
	| "resource_abuse";

/**
 * The sink a value is destined for. Rules declare which contexts they apply to, and
 * the scanner only evaluates rules matching the caller's declared contexts.
 *
 * This is the single most important false-positive control in the package: a
 * biography containing `C:\Windows`, a support ticket containing `1=1`, and a code
 * snippet containing `eval(` are all perfectly legitimate `general_text`. They are
 * only suspicious when the value actually reaches a filesystem, SQL, or HTML sink.
 *
 * - `general_text` — free-form prose. Only near-universally hostile signals apply
 *   (invisible/bidirectional control characters, null bytes).
 * - `html` — rendered as HTML or interpolated into markup.
 * - `sql` / `nosql` — reaches a database query builder or driver.
 * - `shell` — reaches a child process, especially with `shell: true`.
 * - `filesystem` — becomes part of a path passed to `fs`.
 * - `url` — fetched server-side, or used to build such a request.
 * - `url_parameter` — a *single value* about to be concatenated into a query string.
 *   Distinct from `url`, where `&name=` is the normal grammar rather than evidence of
 *   an injected parameter — the same distinction `http_header` draws against a whole
 *   request.
 * - `http_header` — written into an HTTP or email header value.
 * - `jwt` — a JSON Web Token, or an already-decoded JWT header. Scoped narrowly on
 *   purpose: re-scanning a whole opaque token with every detector is the
 *   run-everything-against-everything anti-pattern this package exists to avoid. To
 *   check a `kid` or `jku` claim, extract it and declare *its* real sink
 *   (`filesystem`, `sql`, `url`).
 * - `identifier` — a username, domain, org name, package name, or brand-adjacent
 *   label where confusable-glyph collisions matter.
 * - `object_merge` — parsed into an object graph that is then merged, cloned, or
 *   assigned property-by-property (`Object.assign`, `lodash.merge`, query-string
 *   expansion). This is prototype pollution's actual sink.
 * - `template` — concatenated into template *source* (as opposed to passed as data).
 * - `xml` — parsed by an XML/SOAP/SVG parser.
 * - `ldap` / `xpath` — becomes part of an LDAP filter/DN or an XPath expression.
 * - `spreadsheet` — exported to CSV/XLSX and opened by a spreadsheet application.
 * - `log` — written to a line-based or structured log sink.
 * - `llm_prompt` — concatenated into an LLM prompt or reachable by a tool-using agent.
 */
export type ThreatContext =
	| "general_text"
	| "html"
	| "sql"
	| "nosql"
	| "shell"
	| "filesystem"
	| "url"
	| "url_parameter"
	| "http_header"
	| "jwt"
	| "identifier"
	| "object_merge"
	| "template"
	| "xml"
	| "ldap"
	| "xpath"
	| "spreadsheet"
	| "log"
	| "llm_prompt";

/** Every {@link ThreatContext} value, for iteration and "scan every sink" callers. */
export const ALL_THREAT_CONTEXTS = [
	"general_text",
	"html",
	"sql",
	"nosql",
	"shell",
	"filesystem",
	"url",
	"url_parameter",
	"http_header",
	"jwt",
	"identifier",
	"object_merge",
	"template",
	"xml",
	"ldap",
	"xpath",
	"spreadsheet",
	"log",
	"llm_prompt",
] as const satisfies readonly ThreatContext[];

//#endregion

//#region Grading

/**
 * How bad the weakness is if the match is a true positive. Independent of how
 * likely the match is to *be* a true positive — that is {@link ThreatConfidence}.
 */
export type ThreatSeverity = "low" | "medium" | "high" | "critical";

/**
 * How likely a match is to be a real attack rather than benign content that
 * happens to look like one.
 *
 * - `low` — fires on ordinary content regularly (e.g. the substring `1=1`).
 * - `medium` — unusual in ordinary content but not impossible.
 * - `high` — has essentially no benign explanation in the declared context.
 */
export type ThreatConfidence = "low" | "medium" | "high";

/** Base anomaly points contributed by a finding, before the confidence multiplier. */
export const SEVERITY_WEIGHTS: Readonly<Record<ThreatSeverity, number>> = {
	low: 1,
	medium: 2,
	high: 4,
	critical: 8,
};

/** Scales {@link SEVERITY_WEIGHTS} by how trustworthy the signature is. */
export const CONFIDENCE_MULTIPLIERS: Readonly<Record<ThreatConfidence, number>> = {
	low: 0.5,
	medium: 1,
	high: 1.5,
};

/** Ordering helper for `minSeverity` filtering. Higher is worse. */
export const SEVERITY_ORDER: Readonly<Record<ThreatSeverity, number>> = {
	low: 0,
	medium: 1,
	high: 2,
	critical: 3,
};

//#endregion

//#region Variants

/**
 * Which representation of the input a rule matched against.
 *
 * Attack signatures are routinely bypassed by encoding, so the scanner evaluates a
 * small, bounded set of representations rather than the raw bytes alone. Findings
 * record which one matched, so operators can tell "the request literally contained
 * `../`" apart from "the request contained `%2e%2e%2f`, which only becomes `../` if
 * a downstream component decodes it".
 */
export type InputVariantKind = "raw" | "nfc" | "nfkc" | "percent_decoded" | "html_decoded";

/** One representation of the scanned input. */
export interface InputVariant {
	/** Which transformation produced {@link InputVariant.value}. */
	readonly kind: InputVariantKind;
	/** The transformed string. */
	readonly value: string;
}

//#endregion

//#region Rules and findings

/**
 * A single signature in the catalog.
 *
 * @remarks
 * `pattern` **must not** carry the global (`g`) or sticky (`y`) flag. Those flags
 * make `RegExp` objects stateful via `lastIndex`, and the catalog is module-scoped
 * and shared across every call — a stateful rule would silently skip matches on
 * alternating invocations. `assertRuleCatalogIsValid` enforces this at load time.
 */
export interface ThreatRule {
	/** Stable identifier (e.g. `PATH-TRAVERSAL-ENCODED-001`). Never reused once retired. */
	readonly id: string;
	/** Weakness category this rule evidences. */
	readonly type: ThreatType;
	/** Sinks for which this rule is meaningful. Never empty. */
	readonly contexts: readonly ThreatContext[];
	/** Impact if the match is real. */
	readonly severity: ThreatSeverity;
	/** Likelihood the match is real rather than benign lookalike content. */
	readonly confidence: ThreatConfidence;
	/** One-line description for operators and log lines. Not user-facing. */
	readonly description: string;
	/** MITRE CWE identifier for the weakness, when one applies cleanly. */
	readonly cwe?: number;
	/**
	 * The control that actually prevents this weakness. Signatures detect; they do
	 * not prevent. Surfaced on findings so a reviewer reading an alert is pointed at
	 * the fix rather than at a tighter regex.
	 */
	readonly primaryControl: string;
	/** The signature. Must be non-global and non-sticky — see the remark above. */
	readonly pattern: RegExp;
	/**
	 * Restrict this rule to specific input representations. Defaults to every
	 * variant. Used by rules whose whole purpose is detecting an encoding (e.g. the
	 * percent-encoded traversal rule, which is only meaningful against `raw`).
	 */
	readonly variants?: readonly InputVariantKind[];
}

/** A rule that matched, plus where and in which representation. */
export interface ThreatFinding {
	/** {@link ThreatRule.id} of the rule that fired. */
	readonly ruleId: string;
	/** Copied from the rule — the weakness category. */
	readonly type: ThreatType;
	/** Copied from the rule. */
	readonly severity: ThreatSeverity;
	/** Copied from the rule. */
	readonly confidence: ThreatConfidence;
	/** Copied from the rule. Operator-facing; never render to end users. */
	readonly description: string;
	/** Copied from the rule, when present. */
	readonly cwe?: number;
	/** Copied from the rule — the control that actually fixes this. */
	readonly primaryControl: string;
	/** Which representation matched. */
	readonly variant: InputVariantKind;
	/** Matched substring, truncated to 50 characters so logs cannot be flooded. */
	readonly matchedPattern?: string;
	/** Match start offset *within the matched variant*, not within the raw input. */
	readonly start?: number;
	/** Match end offset (exclusive) within the matched variant. */
	readonly end?: number;
}

//#endregion

//#region Event correlation

/**
 * Where an untrusted value entered the application.
 *
 * The counterpart to {@link ThreatContext}, which names the *sink*. A context says where
 * a value is going and decides which rules run; a source says where it came from and
 * decides nothing — it is carried through so a finding can be attributed later.
 *
 * Both halves together are what makes a finding actionable: "SQL keywords in a value
 * bound to a SQL query" is a bug report, while "SQL keywords arriving in a query
 * parameter from one account, forty times in a minute" is an incident.
 */
export type InputSource =
	| "http.query"
	| "http.body"
	| "http.header"
	| "http.path"
	| "http.cookie"
	| "websocket.message"
	| "cli.argument"
	| "file.upload"
	| "database"
	| "external.api"
	| "internal";

/**
 * Who and what a scan belongs to, carried through so findings can be correlated.
 *
 * Modelled on OWASP AppSensor, whose argument is that application-layer intrusion
 * detection is about *sequences* attributed to an actor, not about individual strings. A
 * single `review` verdict is ordinarily noise; thirty of them from one account inside a
 * minute is an attack in progress, and nothing in a per-string API can express the
 * difference.
 *
 * Every field is optional and none affects detection. The scanner does not resolve,
 * validate or store any of them — it echoes them onto the result so a logging or SIEM
 * pipeline can join findings to a request and an actor without threading a correlation id
 * through its own call stack.
 *
 * Treat `actorId` as personal data: it reaches whatever sink the findings reach, so pass
 * an opaque identifier rather than an email address, or redact downstream with
 * `sanitizeForLogging`.
 */
export interface EventContext {
	/** Correlates every finding raised while handling one request. */
	readonly requestId?: string;
	/** The authenticated principal, if any. Opaque — never an email address. */
	readonly actorId?: string;
	/** The session the request belongs to, for sequence detection across requests. */
	readonly sessionId?: string;
	/** Where the value entered the application. */
	readonly source?: InputSource;
}

//#endregion

//#region Verdicts

/**
 * Policy outcome derived from the anomaly score.
 *
 * Scoring rather than first-match rejection is deliberate: any individual signature
 * produces false positives, so a single low-confidence hit should raise a signal,
 * not reject a form submission. This mirrors how OWASP CRS uses anomaly scoring with
 * tunable thresholds instead of one-rule-one-block.
 */
export type ThreatVerdict = "allow" | "review" | "block";

/** Score thresholds separating {@link ThreatVerdict} bands. */
export interface ThreatPolicy {
	/** Score at or above which the verdict becomes `review`. Default `4`. */
	readonly reviewAt: number;
	/** Score at or above which the verdict becomes `block`. Default `8`. */
	readonly blockAt: number;
}

/** Default thresholds: one high/high finding reviews, one critical finding blocks. */
export const DEFAULT_THREAT_POLICY: ThreatPolicy = {
	reviewAt: 4,
	blockAt: 8,
};

//#endregion
