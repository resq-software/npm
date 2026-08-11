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
 * @fileoverview Anomaly scoring — turns a list of findings into a number and a
 * policy verdict.
 *
 * The point of scoring is that no single signature is trustworthy enough to reject a
 * request on its own. A lone low-confidence hit should raise a signal; a cluster of
 * high-confidence hits should stop the request. This is the model OWASP CRS uses —
 * anomaly score plus tunable thresholds — rather than one-rule-one-block, and it is
 * what makes per-route tuning possible: an operator raises `blockAt` for a field that
 * legitimately carries code samples instead of disabling detection wholesale.
 *
 * @module @resq-systems/security/threats/scoring
 */

import {
	CONFIDENCE_MULTIPLIERS,
	DEFAULT_THREAT_POLICY,
	SEVERITY_WEIGHTS,
	type ThreatFinding,
	type ThreatPolicy,
	type ThreatType,
	type ThreatVerdict,
} from "./types.js";

//#region Scoring

/**
 * Points a single finding contributes: severity weight scaled by confidence.
 *
 * @param finding - The finding to weigh.
 * @returns A non-negative score contribution.
 */
export function scoreForFinding(finding: ThreatFinding): number {
	return SEVERITY_WEIGHTS[finding.severity] * CONFIDENCE_MULTIPLIERS[finding.confidence];
}

/**
 * Total anomaly score for a set of findings.
 *
 * Each **rule** counts once no matter how many variants it matched in. Without that
 * collapse a payload written as `%3Cscript%3E` would score twice — once for `raw` and
 * once for `percent_decoded` — penalizing an input for being encoded rather than for
 * what it contains.
 *
 * @param findings - Findings from one scan.
 * @returns The summed score; `0` for an empty list.
 *
 * @example
 * ```ts
 * // one high/high finding (4 × 1.5) plus one medium/low finding (2 × 0.5)
 * calculateThreatScore(findings); // 7
 * ```
 */
export function calculateThreatScore(findings: readonly ThreatFinding[]): number {
	const bestPerRule = new Map<string, number>();

	for (const finding of findings) {
		const score = scoreForFinding(finding);
		const existing = bestPerRule.get(finding.ruleId);
		if (existing === undefined || score > existing) {
			bestPerRule.set(finding.ruleId, score);
		}
	}

	let total = 0;
	for (const score of bestPerRule.values()) {
		total += score;
	}
	return total;
}

//#endregion

//#region Policy

/**
 * Map a score onto a policy band.
 *
 * @param score - Output of {@link calculateThreatScore}.
 * @param policy - Thresholds. Defaults to {@link DEFAULT_THREAT_POLICY} — `review`
 *   at 4, `block` at 8.
 * @returns `"allow"`, `"review"`, or `"block"`.
 */
export function verdictForScore(
	score: number,
	policy: ThreatPolicy = DEFAULT_THREAT_POLICY,
): ThreatVerdict {
	if (score >= policy.blockAt) return "block";
	if (score >= policy.reviewAt) return "review";
	return "allow";
}

/** One category's contribution to a scan result. */
export interface ThreatTypeSummary {
	/** The weakness category. */
	readonly type: ThreatType;
	/** How many findings carried this category. */
	readonly count: number;
	/** Summed score contribution, before per-rule deduplication. */
	readonly score: number;
}

/**
 * Summarize findings by weakness category, highest score first.
 *
 * Useful for dashboards and alert routing, where "three SQL findings and one XSS
 * finding" is more actionable than a flat list.
 *
 * @param findings - Findings from one scan.
 * @returns Category totals sorted by descending score, then by category name so ties
 *   are ordered deterministically.
 */
export function summarizeByType(findings: readonly ThreatFinding[]): readonly ThreatTypeSummary[] {
	const totals = new Map<ThreatType, { count: number; score: number }>();

	for (const finding of findings) {
		const entry = totals.get(finding.type) ?? { count: 0, score: 0 };
		entry.count += 1;
		entry.score += scoreForFinding(finding);
		totals.set(finding.type, entry);
	}

	return [...totals.entries()]
		.map(([type, entry]) => ({ type, count: entry.count, score: entry.score }))
		.sort((a, b) => b.score - a.score || a.type.localeCompare(b.type));
}

//#endregion
