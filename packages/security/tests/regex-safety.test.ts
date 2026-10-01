/**
 * Copyright 2026 ResQ Systems, Inc.
 * SPDX-License-Identifier: Apache-2.0
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
 * @fileoverview ReDoS guard for the rule catalog: a measured time budget per rule,
 * plus a structural check for the constructs that cause catastrophic backtracking.
 *
 * This measures rather than only linting. Static checkers such as `safe-regex2` are
 * useful, but their own maintainers note they produce both false positives and false
 * negatives — a static verdict cannot say whether *this* pattern is slow on *this*
 * engine. Wall-clock against adversarial input can, and that is the property that
 * actually matters. The structural checks run alongside to catch shapes that are
 * dangerous even when today's inputs happen not to trigger them.
 *
 * If a rule ever genuinely needs a construct that cannot be bounded, the fix is a
 * linear-time engine (RE2/RE2JS), not a cleverer backtracking pattern.
 */

import { describe, expect, it } from "vitest";
import { scanForThreats } from "../src/threats/engine.js";
import { THREAT_RULES } from "../src/threats/rules/index.js";
import { ALL_THREAT_CONTEXTS, type ThreatRule } from "../src/threats/types.js";
import { PERFORMANCE } from "./fixtures/corpora.js";

/**
 * Per-rule budget against a 100 000-character adversarial input.
 *
 * Generous on purpose: this is a catastrophic-backtracking tripwire, not a
 * microbenchmark. A pattern that blows up takes seconds or minutes, not 30 ms, so a
 * failure here is never ambiguous.
 */
const RULE_BUDGET_MS = 30;

/** Budget for a full every-context scan of one adversarial input. */
const SCAN_BUDGET_MS = 750;

/** Length of the adversarial strings built for the per-rule benchmark. */
const ADVERSARIAL_LENGTH = 100_000;

/** Single characters an attacker can repeat to provoke backtracking. */
const ADVERSARIAL_SEEDS = [
	"a",
	" ",
	"'",
	'"',
	"<",
	">",
	"/",
	"\\",
	"%",
	"$",
	"{",
	"(",
	"[",
	"`",
	"-",
	"0",
	".",
	"&",
	";",
	":",
	"\t",
] as const;

/** Adversarial inputs reused across every rule. Built once. */
const ADVERSARIAL_INPUTS: readonly string[] = [
	...ADVERSARIAL_SEEDS.map((seed) => seed.repeat(ADVERSARIAL_LENGTH)),
	"a ".repeat(ADVERSARIAL_LENGTH / 2),
	"ab".repeat(ADVERSARIAL_LENGTH / 2),
	`${"<".repeat(ADVERSARIAL_LENGTH / 2)}x`,
	`${"$(".repeat(ADVERSARIAL_LENGTH / 2)}x`,
	`${"{{".repeat(ADVERSARIAL_LENGTH / 2)}x`,
];

/**
 * Runs of each JavaScript line terminator, for the rules compiled with `/m`.
 *
 * Under `/m`, `^` matches after every terminator, so a leading run that can cross one
 * rescans the rest of the input from each line start and goes quadratic. Without `/m`,
 * `^` matches at index 0 alone and a terminator is one more character, which the
 * shared inputs already cover.
 */
const LINE_TERMINATOR_INPUTS: readonly string[] = [
	"\n".repeat(ADVERSARIAL_LENGTH),
	"\r".repeat(ADVERSARIAL_LENGTH),
	"\u2028".repeat(ADVERSARIAL_LENGTH),
	"\u2029".repeat(ADVERSARIAL_LENGTH),
	"\r\n".repeat(ADVERSARIAL_LENGTH / 2),
	"\n ".repeat(ADVERSARIAL_LENGTH / 2),
	"\n\t".repeat(ADVERSARIAL_LENGTH / 2),
];

/**
 * Time one rule against each input and keep the slowest.
 *
 * @param rule - The rule under test.
 * @param inputs - Adversarial inputs to try in turn.
 * @returns The slowest time in milliseconds, and the first characters of that input.
 */
const worstCase = (
	rule: ThreatRule,
	inputs: readonly string[],
): { readonly ms: number; readonly head: string } => {
	let ms = 0;
	let head = "";

	for (const input of inputs) {
		const started = performance.now();
		rule.pattern.test(input);
		const elapsed = performance.now() - started;
		if (elapsed > ms) {
			ms = elapsed;
			// Escape everything outside printable ASCII so a run of whitespace or line
			// terminators is legible in the failure message.
			head = input
				.slice(0, 8)
				.replace(
					/[^\x21-\x7e]/g,
					(char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
				);
		}
	}

	return { ms, head };
};

// ============================================
// Structural checks
// ============================================

describe("rule pattern structure", () => {
	it.each(THREAT_RULES.map((rule) => [rule.id, rule] as const))(
		"%s has no unbounded quantifier over a group",
		(_id, rule) => {
			// `(…)*`, `(…)+`, and `(…){n,}` turn linear matching into exponential
			// matching when the group's alternatives overlap. Every rule here uses a
			// bounded `{0,n}` form instead.
			expect(rule.pattern.source).not.toMatch(/\)[*+]/);
			expect(rule.pattern.source).not.toMatch(/\)\{\d+,\}/);
		},
	);

	it.each(THREAT_RULES.map((rule) => [rule.id, rule] as const))(
		"%s uses no backreference",
		(_id, rule) => {
			// Backreferences force a backtracking engine and block a future move to
			// RE2. The one place the catalog needs "repeated run" semantics — the
			// resource-abuse check — is a linear scan in the engine instead.
			expect(rule.pattern.source).not.toMatch(/\\[1-9]/);
		},
	);

	it.each(THREAT_RULES.map((rule) => [rule.id, rule] as const))(
		"%s bounds every any-character quantifier",
		(_id, rule) => {
			// `.*` / `.+` on an unanchored pattern is the classic blowup. `\s{0,8}` and
			// similar over a single narrow class are safe, so only the any-character
			// forms are rejected.
			expect(rule.pattern.source).not.toMatch(/\.\*/);
			expect(rule.pattern.source).not.toMatch(/\.\+/);
			expect(rule.pattern.source).not.toMatch(/\[\\s\\S\][*+]/);
		},
	);
});

// ============================================
// Measured cost
// ============================================

describe("rule pattern cost", () => {
	it.each(THREAT_RULES.map((rule) => [rule.id, rule] as const))(
		"%s stays within its time budget on adversarial input",
		(id, rule) => {
			const { ms, head } = worstCase(rule, ADVERSARIAL_INPUTS);
			expect(ms, `${id} took ${ms.toFixed(1)}ms on input starting "${head}"`).toBeLessThan(
				RULE_BUDGET_MS,
			);
		},
	);
});

describe("multiline rule cost", () => {
	const multiline = THREAT_RULES.filter((rule) => rule.pattern.multiline);

	it("has at least one multiline rule to measure", () => {
		expect(multiline.length).toBeGreaterThan(0);
	});

	it.each(multiline.map((rule) => [rule.id, rule] as const))(
		"%s stays within its time budget on runs of line terminators",
		(id, rule) => {
			const { ms, head } = worstCase(rule, LINE_TERMINATOR_INPUTS);
			expect(ms, `${id} took ${ms.toFixed(1)}ms on input starting "${head}"`).toBeLessThan(
				RULE_BUDGET_MS,
			);
		},
	);
});

describe("full-scan cost", () => {
	it.each(PERFORMANCE.map((testCase) => [testCase.label, testCase] as const))(
		"scans %s across every context within budget",
		(label, testCase) => {
			const input = testCase.build();

			const started = performance.now();
			const result = scanForThreats(input, { contexts: ALL_THREAT_CONTEXTS });
			const elapsed = performance.now() - started;

			expect(elapsed, `${label} took ${elapsed.toFixed(1)}ms`).toBeLessThan(SCAN_BUDGET_MS);
			// The scan must still produce a usable result rather than bailing out.
			expect(result.verdict).toBeDefined();
		},
	);

	it("bounds work by truncating over-long input", () => {
		const huge = "a".repeat(5_000_000);

		const started = performance.now();
		const result = scanForThreats(huge, { contexts: ALL_THREAT_CONTEXTS });
		const elapsed = performance.now() - started;

		expect(result.truncated).toBe(true);
		expect(elapsed).toBeLessThan(SCAN_BUDGET_MS);
	});
});
