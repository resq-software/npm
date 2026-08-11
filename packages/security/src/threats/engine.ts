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
 * @fileoverview The scan engine: evaluate the rules applicable to a declared set of
 * sinks against a bounded set of input representations, then score the result.
 *
 * The engine's defining constraint is that **the caller must say where the value is
 * going**. Running every detector against every field is what makes signature-based
 * validation unusable in practice — a biography containing `C:\Windows`, a support
 * ticket containing `1=1`, and a programming question containing `eval(` are all
 * ordinary text, and only become evidence when the value actually reaches a
 * filesystem, SQL, or HTML sink. Declaring the context is the difference between a
 * detector that catches attacks and one that rejects customers.
 *
 * @module @resq-systems/security/threats/engine
 */

import { getRulesForContexts } from "./rules/index.js";
import { calculateThreatScore, verdictForScore } from "./scoring.js";
import {
	DEFAULT_THREAT_POLICY,
	type EventContext,
	type InputVariant,
	SEVERITY_ORDER,
	type ThreatContext,
	type ThreatFinding,
	type ThreatPolicy,
	type ThreatSeverity,
	type ThreatType,
	type ThreatVerdict,
} from "./types.js";
import { buildInputVariants } from "./variants.js";

//#region Constants

/**
 * Characters scanned before truncation.
 *
 * Bounds worst-case regex cost per call. Individual rules are bounded too — no
 * unbounded nested quantifiers — so this is a second line of defense rather than the
 * only one, but a 50 MB paste should not become a 50 MB × 89-rule scan regardless.
 */
export const MAX_SCAN_LENGTH = 100_000;

/** Matched substrings are truncated to this many characters before entering a finding. */
const MAX_MATCH_EXCERPT = 50;

/**
 * Run length at which a repeated single character is reported as resource abuse.
 * Set well above anything that occurs in prose or formatted text.
 */
const REPETITION_THRESHOLD = 200;

//#endregion

//#region Options and result

/** Controls what {@link scanForThreats} evaluates and how it grades the outcome. */
export interface ThreatScanOptions {
	/**
	 * Correlation metadata, echoed onto the result untouched.
	 *
	 * Affects nothing about detection. See {@link EventContext} for why it exists.
	 */
	readonly event?: EventContext;
	/**
	 * Sinks the value is destined for.
	 *
	 * Defaults to `["general_text"]`, which enables only the universal rules — bidi
	 * overrides, invisible characters, control characters. Any caller that wants
	 * injection detection must name the sink it is protecting; that requirement is
	 * the package's primary false-positive control, not an inconvenience.
	 */
	readonly contexts?: readonly ThreatContext[];
	/** Truncation bound. Defaults to {@link MAX_SCAN_LENGTH}. */
	readonly maxLength?: number;
	/**
	 * Scan encoded representations in addition to the raw string. Defaults to `true`.
	 * Pass `false` when the caller has already decoded the value and re-decoding
	 * would misrepresent it.
	 */
	readonly scanVariants?: boolean;
	/** Drop findings below this severity before scoring. Defaults to `"low"`. */
	readonly minSeverity?: ThreatSeverity;
	/**
	 * Rule IDs to skip. The tuning knob to reach for first: silencing one noisy rule
	 * on one route beats disabling a whole category.
	 */
	readonly excludeRuleIds?: readonly string[];
	/** Score thresholds. Defaults to {@link DEFAULT_THREAT_POLICY}. */
	readonly policy?: ThreatPolicy;
}

/** Outcome of a scan. */
export interface ThreatScanResult {
	/**
	 * The {@link EventContext} the caller supplied, echoed verbatim.
	 *
	 * Present only when one was passed. The scanner neither resolves nor validates it.
	 */
	readonly event?: EventContext;
	/** `true` when nothing fired at all — strictly stronger than `verdict === "allow"`. */
	readonly isSafe: boolean;
	/** Anomaly score. See {@link calculateThreatScore}. */
	readonly score: number;
	/** Policy band derived from {@link ThreatScanResult.score}. */
	readonly verdict: ThreatVerdict;
	/** Every finding, in catalog order then variant order. */
	readonly findings: readonly ThreatFinding[];
	/** Distinct weakness categories present, in first-seen order. */
	readonly types: readonly ThreatType[];
	/** `true` when the input exceeded `maxLength` and the tail went unscanned. */
	readonly truncated: boolean;
}

/** Result returned for empty or non-string input. */
const SAFE_RESULT: ThreatScanResult = {
	isSafe: true,
	score: 0,
	verdict: "allow",
	findings: [],
	types: [],
	truncated: false,
};

//#endregion

//#region Scanning

/**
 * Structural check that is cheaper and more informative computed than matched.
 *
 * A backreference like `/(.)\1{200,}/` expresses "long repeated run" but costs far
 * more than the single linear pass below, and the pass can report the actual run
 * length in the finding.
 *
 * @param value - Bounded input.
 * @returns At most one finding, for the first over-threshold run.
 */
function detectResourceAbuse(value: string): ThreatFinding[] {
	let runStart = 0;

	for (let i = 1; i <= value.length; i++) {
		if (i < value.length && value[i] === value[runStart]) continue;

		const runLength = i - runStart;
		if (runLength >= REPETITION_THRESHOLD) {
			return [
				{
					ruleId: "RESOURCE-REPETITION-001",
					type: "resource_abuse",
					severity: "medium",
					confidence: "medium",
					description: `Single character repeated ${runLength} times`,
					cwe: 1333,
					primaryControl:
						"Bound input length at the boundary and use linear-time matching (RE2) for untrusted patterns",
					variant: "raw",
					matchedPattern: value.slice(runStart, runStart + MAX_MATCH_EXCERPT),
					start: runStart,
					end: i,
				},
			];
		}
		runStart = i;
	}

	return [];
}

/**
 * Scan a value against the rules for its declared sinks.
 *
 * Every applicable rule is evaluated against every applicable representation, so the
 * finding list may contain one rule more than once with different `variant` values.
 * Scoring collapses those — see {@link calculateThreatScore} — so an encoded payload
 * is not penalized twice merely for being encoded.
 *
 * Non-string input (`null`, `undefined`, a number) is reported safe rather than
 * throwing: this is a detector, and rejecting the wrong *type* belongs to the
 * caller's schema layer.
 *
 * @param input - The candidate value.
 * @param options - Contexts and tuning. See {@link ThreatScanOptions}.
 * @returns A {@link ThreatScanResult}. Never throws.
 *
 * @example Scoping to the actual sink
 * ```ts
 * const bio = "I maintain build scripts under C:\\Windows\\System32";
 *
 * scanForThreats(bio, { contexts: ["general_text"] }).verdict; // "allow"
 * scanForThreats(bio, { contexts: ["filesystem"] }).verdict;   // "review"
 * ```
 */
export function scanForThreats(input: string, options: ThreatScanOptions = {}): ThreatScanResult {
	if (typeof input !== "string" || input.length === 0) {
		return SAFE_RESULT;
	}

	const {
		contexts = ["general_text"],
		maxLength = MAX_SCAN_LENGTH,
		scanVariants = true,
		minSeverity = "low",
		excludeRuleIds,
		policy = DEFAULT_THREAT_POLICY,
	} = options;

	const truncated = input.length > maxLength;
	const bounded = truncated ? input.slice(0, maxLength) : input;

	const excluded = excludeRuleIds && excludeRuleIds.length > 0 ? new Set(excludeRuleIds) : null;
	const severityFloor = SEVERITY_ORDER[minSeverity];

	const rules = getRulesForContexts(contexts);
	const rawOnly: readonly InputVariant[] = [{ kind: "raw", value: bounded }];
	const variants = scanVariants ? buildInputVariants(bounded) : rawOnly;

	const findings: ThreatFinding[] = [];

	for (const rule of rules) {
		if (excluded?.has(rule.id)) continue;
		if (SEVERITY_ORDER[rule.severity] < severityFloor) continue;

		for (const variant of variants) {
			if (rule.variants && !rule.variants.includes(variant.kind)) continue;

			// Patterns are validated non-global at catalog load, so `exec` carries no
			// lastIndex state between calls and always matches from position 0.
			const match = rule.pattern.exec(variant.value);
			if (match === null) continue;

			findings.push({
				ruleId: rule.id,
				type: rule.type,
				severity: rule.severity,
				confidence: rule.confidence,
				description: rule.description,
				...(rule.cwe === undefined ? {} : { cwe: rule.cwe }),
				primaryControl: rule.primaryControl,
				variant: variant.kind,
				matchedPattern: match[0].slice(0, MAX_MATCH_EXCERPT),
				start: match.index,
				end: match.index + match[0].length,
			});
		}
	}

	if (SEVERITY_ORDER.medium >= severityFloor && !excluded?.has("RESOURCE-REPETITION-001")) {
		findings.push(...detectResourceAbuse(bounded));
	}

	const score = calculateThreatScore(findings);

	const types: ThreatType[] = [];
	for (const finding of findings) {
		if (!types.includes(finding.type)) types.push(finding.type);
	}

	return {
		isSafe: findings.length === 0,
		score,
		verdict: verdictForScore(score, policy),
		findings,
		types,
		truncated,
		...(options.event === undefined ? {} : { event: options.event }),
	};
}

//#endregion
