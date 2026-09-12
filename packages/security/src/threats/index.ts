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
 * @fileoverview Public entry for the context-aware threat rule engine.
 *
 * The engine is a *detector*: it produces graded, CWE-tagged telemetry about what an
 * untrusted value looks like. It is not the control that stops any of the attacks it
 * names — every rule carries a `primaryControl` string naming the control that does.
 * Use findings to log, score, rate-limit, and route for review; use parameterized
 * queries, parser-based sanitizers, path containment, and argv-array process spawning
 * to actually be safe.
 *
 * @module @resq-systems/security/threats
 *
 * @example Scope the scan to the sink the value reaches
 * ```ts
 * import { scanForThreats } from "@resq-systems/security/threats";
 *
 * const result = scanForThreats(req.query.file ?? "", { contexts: ["filesystem"] });
 * if (result.verdict === "block") {
 *   logger.warn("path traversal attempt", { findings: result.findings });
 *   return new Response("Bad request", { status: 400 });
 * }
 * ```
 *
 * @example Tune a single noisy rule instead of a whole category
 * ```ts
 * // A code-snippet field legitimately contains SQL comments.
 * scanForThreats(snippet, {
 *   contexts: ["sql"],
 *   excludeRuleIds: ["SQL-COMMENT-TERMINATOR-001", "SQL-COMMENT-INLINE-001"],
 * });
 * ```
 */

export { MAX_SCAN_LENGTH, scanForThreats } from "./engine.js";
export type { ThreatScanOptions, ThreatScanResult } from "./engine.js";
export {
	assertRuleCatalogIsValid,
	COMMAND_INJECTION_RULES,
	FILE_INCLUSION_RULES,
	FORMULA_INJECTION_RULES,
	getRulesForContexts,
	HEADER_INJECTION_RULES,
	LDAP_INJECTION_RULES,
	LOG_INJECTION_RULES,
	NOSQL_INJECTION_RULES,
	PATH_TRAVERSAL_RULES,
	PROMPT_INJECTION_RULES,
	PROTOTYPE_POLLUTION_RULES,
	SQL_INJECTION_RULES,
	SSRF_RULES,
	TEMPLATE_INJECTION_RULES,
	THREAT_RULES,
	UNIVERSAL_RULES,
	XML_INJECTION_RULES,
	XPATH_INJECTION_RULES,
	XSS_RULES,
} from "./rules/index.js";
export {
	calculateThreatScore,
	scoreForFinding,
	summarizeByType,
	verdictForScore,
} from "./scoring.js";
export type { ThreatTypeSummary } from "./scoring.js";
export {
	ALL_THREAT_CONTEXTS,
	CONFIDENCE_MULTIPLIERS,
	DEFAULT_THREAT_POLICY,
	SEVERITY_ORDER,
	SEVERITY_WEIGHTS,
} from "./types.js";
export type {
	EventContext,
	InputSource,
	InputVariant,
	InputVariantKind,
	ThreatConfidence,
	ThreatContext,
	ThreatFinding,
	ThreatPolicy,
	ThreatRule,
	ThreatSeverity,
	ThreatType,
	ThreatVerdict,
} from "./types.js";
export { buildInputVariants, decodeHtmlEntities, tryPercentDecode } from "./variants.js";

export { ATTACK_PATTERNS, attackPatternsForCwe } from "./capec.generated.js";
export type { AttackPattern } from "./capec.generated.js";
