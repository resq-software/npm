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
 * @fileoverview Detection accuracy, measured as precision, recall, F1 and false-positive
 * rate rather than as a count of passing assertions.
 *
 * Modelled on the OWASP Benchmark, whose point is that a security tool should be scored
 * on accuracy across true *and* false cases — not on how many payloads it can name.
 *
 * **The headline number is deliberately not the flattering one.** Precision and recall
 * over the hand-written corpora are 100%, and that is close to meaningless: those
 * fixtures and these rules were written alongside one another, so the corpus is a
 * self-graded exam. It is asserted here as a regression floor and nothing more.
 *
 * The figure worth reading is recall over *generated* evasions. The mutation layer
 * applies transforms nobody wrote with these rules in mind, so a miss there is a real
 * miss — and that number moved from roughly 73% to 97% as the gaps it found were closed.
 */

import { describe, expect, it } from "vitest";
import { scanForThreats } from "../src/threats/engine.js";
import { BENIGN, COVERAGE, MALICIOUS } from "./fixtures/corpora.js";
import { expectedMutationMiss, MUTATIONS } from "./fixtures/mutations.js";

//#region Measurement

/** A malicious value counts as detected once it leaves the allow band. */
function isDetected(value: string, contexts: readonly string[]): boolean {
	return scanForThreats(value, { contexts: contexts as never }).verdict !== "allow";
}

/**
 * A benign value counts as clean only when it raises **no finding at all**.
 *
 * Stricter than "stayed in the allow band", on purpose: a finding somebody has to triage
 * is a cost even when the verdict is right, and the package's zero-false-positive claim
 * is about findings rather than verdicts.
 */
function isClean(value: string, contexts: readonly string[]): boolean {
	return scanForThreats(value, { contexts: contexts as never }).findings.length === 0;
}

/** Confusion-matrix counts for one population. */
interface Counts {
	truePositives: number;
	falseNegatives: number;
	trueNegatives: number;
	falsePositives: number;
}

/** Ratio guarding against an empty denominator. */
const ratio = (numerator: number, denominator: number): number =>
	denominator === 0 ? Number.NaN : numerator / denominator;

/** Standard accuracy metrics over a confusion matrix. */
function metrics(counts: Counts) {
	const precision = ratio(counts.truePositives, counts.truePositives + counts.falsePositives);
	const recall = ratio(counts.truePositives, counts.truePositives + counts.falseNegatives);
	return {
		precision,
		recall,
		f1: ratio(2 * precision * recall, precision + recall),
		falsePositiveRate: ratio(counts.falsePositives, counts.falsePositives + counts.trueNegatives),
	};
}

/** Score the hand-written corpora. */
function scoreHandWritten(): Counts {
	const counts: Counts = {
		truePositives: 0,
		falseNegatives: 0,
		trueNegatives: 0,
		falsePositives: 0,
	};
	for (const testCase of MALICIOUS) {
		if (isDetected(testCase.payload, testCase.contexts)) counts.truePositives++;
		else counts.falseNegatives++;
	}
	for (const testCase of BENIGN) {
		if (isClean(testCase.value, testCase.contexts)) counts.trueNegatives++;
		else counts.falsePositives++;
	}
	return counts;
}

/** Score the generated evasions, separating documented misses from real ones. */
function scoreGenerated(): { detected: number; missed: number; excused: number } {
	const attacks = [
		...MALICIOUS.map((testCase) => ({
			payload: testCase.payload,
			contexts: testCase.contexts,
			type: testCase.expectType as string,
		})),
		...COVERAGE.map((testCase) => ({
			payload: testCase.payload,
			contexts: testCase.contexts,
			type: "coverage",
		})),
	];

	let detected = 0;
	let missed = 0;
	let excused = 0;

	for (const attack of attacks) {
		// Transforming something already undetected measures nothing.
		if (!isDetected(attack.payload, attack.contexts)) continue;

		for (const mutation of MUTATIONS) {
			if (mutation.appliesTo.length > 0 && !mutation.appliesTo.includes(attack.type as never)) {
				continue;
			}
			const mutatedPayload = mutation.transform(attack.payload);
			if (mutatedPayload === attack.payload) continue;

			const result = scanForThreats(mutatedPayload, { contexts: attack.contexts });
			if (result.verdict !== "allow") {
				detected++;
				continue;
			}
			const reason = expectedMutationMiss(
				mutation.name,
				attack.contexts,
				result.findings.map((finding) => finding.ruleId),
			);
			if (reason) excused++;
			else missed++;
		}
	}

	return { detected, missed, excused };
}

//#endregion

describe("detection accuracy", () => {
	describe("hand-written corpora", () => {
		const counts = scoreHandWritten();
		const scores = metrics(counts);

		// Asserted as a floor, not advertised as a result. The corpus and the catalog were
		// written together, so falling below 100% here is a regression — staying at it is
		// not an achievement.
		it("misses no malicious fixture", () => {
			expect(counts.falseNegatives).toBe(0);
			expect(scores.recall).toBe(1);
		});

		// The expensive half. A detector that fires on ordinary input gets switched off, at
		// which point its recall stops mattering at all.
		it("fires on no benign fixture", () => {
			expect(counts.falsePositives).toBe(0);
			expect(scores.falsePositiveRate).toBe(0);
		});

		it("keeps both populations large enough for the numbers to mean anything", () => {
			expect(counts.truePositives + counts.falseNegatives).toBeGreaterThanOrEqual(80);
			expect(counts.trueNegatives + counts.falsePositives).toBeGreaterThanOrEqual(100);
		});
	});

	describe("generated evasions", () => {
		const { detected, missed, excused } = scoreGenerated();
		const recall = ratio(detected, detected + missed);

		// The honest figure: these payloads came from transforms rather than being authored
		// against the catalog, so a miss here is a real one.
		it("keeps recall over generated evasions above 97%", () => {
			expect(recall).toBeGreaterThan(0.97);
		});

		it("generates enough evasions for the figure to be meaningful", () => {
			expect(detected + missed + excused).toBeGreaterThan(700);
		});

		// Every excused miss carries a written reason, and the excused population is
		// bounded. Without this, "excused" becomes the place failures go to hide.
		it("keeps the excused population smaller than the detected one", () => {
			expect(excused).toBeGreaterThan(0);
			expect(excused).toBeLessThan(detected);
		});
	});

	// Measured at rule level rather than verdict level, deliberately: several of these
	// rules score below the review band alone by design, so a verdict-level measure would
	// report them as misses when the rule fired exactly as intended.
	it("fires every rule on its own coverage fixture", () => {
		const silent = COVERAGE.filter((testCase) => {
			const result = scanForThreats(testCase.payload, { contexts: testCase.contexts });
			return !result.findings.some((finding) => finding.ruleId === testCase.expectRuleId);
		}).map((testCase) => testCase.expectRuleId);
		expect(silent).toEqual([]);
	});
});
