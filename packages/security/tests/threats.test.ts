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

import { describe, expect, it } from "vitest";
import { scanForThreats } from "../src/threats/engine.js";
import { ATTACK_PATTERNS, attackPatternsForCwe } from "../src/threats/capec.generated.js";
import {
	assertRuleCatalogIsValid,
	RETIRED_RULE_IDS,
	getRulesForContexts,
	THREAT_RULES,
} from "../src/threats/rules/index.js";
import { calculateThreatScore, summarizeByType, verdictForScore } from "../src/threats/scoring.js";
import { ALL_THREAT_CONTEXTS, type ThreatFinding } from "../src/threats/types.js";
import {
	buildInputVariants,
	decodeHtmlEntities,
	tryPercentDecode,
} from "../src/threats/variants.js";
import { BENIGN, COVERAGE, EVASIONS, MALICIOUS } from "./fixtures/corpora.js";
import RULE_ID_SNAPSHOT from "./fixtures/rule-ids.json" with { type: "json" };
import { expectedMutationMiss, MUTATIONS } from "./fixtures/mutations.js";

// ============================================
// Catalog invariants
// ============================================

describe("threat rule catalog", () => {
	it("passes its own validation", () => {
		expect(() => assertRuleCatalogIsValid()).not.toThrow();
	});

	it("has unique rule ids", () => {
		const ids = THREAT_RULES.map((rule) => rule.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("uses no stateful (g/y) patterns", () => {
		// A global pattern carries lastIndex between calls, so the same input would
		// match or not depending on how many scans preceded it.
		const stateful = THREAT_RULES.filter((rule) => rule.pattern.global || rule.pattern.sticky);
		expect(stateful.map((rule) => rule.id)).toEqual([]);
	});

	it("gives every rule at least one context", () => {
		const contextless = THREAT_RULES.filter((rule) => rule.contexts.length === 0);
		expect(contextless.map((rule) => rule.id)).toEqual([]);
	});

	it("gives every rule a primary control naming the real fix", () => {
		const missing = THREAT_RULES.filter((rule) => rule.primaryControl.trim().length < 10);
		expect(missing.map((rule) => rule.id)).toEqual([]);
	});

	it("only declares known contexts", () => {
		const known = new Set<string>(ALL_THREAT_CONTEXTS);
		const unknown = THREAT_RULES.flatMap((rule) =>
			rule.contexts.filter((context) => !known.has(context)).map(() => rule.id),
		);
		expect(unknown).toEqual([]);
	});

	it("restricts general_text to universally hostile signals only", () => {
		// The bar for general_text is that no legitimate value needs the character at
		// all. SQL keywords and `../` do not clear it; bidi and control chars do.
		const ids = getRulesForContexts(["general_text"]).map((rule) => rule.id);
		expect(ids).toEqual(["UNICODE-BIDI-OVERRIDE-001", "UNICODE-INVISIBLE-001", "CONTROL-CHAR-001"]);
	});

	it("deduplicates rules spanning several requested contexts", () => {
		const both = getRulesForContexts(["html", "url"]);
		expect(new Set(both).size).toBe(both.length);
	});
});

// ============================================
// Fixture coverage — the gate behind AGENTS.md
// ============================================

// AGENTS.md requires benign fixtures with every rule, and the catalog is only as good
// as the corpus that exercises it. Neither obligation was checked by anything until
// now: 34 of 132 rules were reachable by no fixture at a sink they declare, and three
// declared contexts had no benign fixture at all — so their zero-false-positive claim
// had never actually been measured.
// A rule id is public API — consumers pin them in `excludeRuleIds`. Both directions of
// drift are silent for that consumer: a reused id re-points their suppression at an
// unrelated rule, and a *removed* id turns their suppression into a no-op, so a rule
// they had accepted starts firing again. Neither shows up in a diff of their own code.
// Evasions are generated rather than hand-written: N payloads times M transforms
// explores combinations nobody enumerated. This is what surfaced MySQL versioned
// comments, the fully-encoded double-percent form, two Commix word-splitting bypasses,
// and a zero-width space raising no finding at all in sql/shell/ldap.
describe("mutation resistance", () => {
	const attacks = [
		...MALICIOUS.map((c) => ({
			label: c.label,
			payload: c.payload,
			contexts: c.contexts,
			type: c.expectType as string,
		})),
		...COVERAGE.map((c) => ({
			label: c.label,
			payload: c.payload,
			contexts: c.contexts,
			type: "coverage",
		})),
	];

	/** Every (payload, mutation) pair whose mutated form fell below the review band. */
	const misses = () => {
		const unexplained: string[] = [];
		for (const attack of attacks) {
			if (scanForThreats(attack.payload, { contexts: attack.contexts }).verdict === "allow")
				continue;
			for (const mutation of MUTATIONS) {
				if (mutation.appliesTo.length > 0 && !mutation.appliesTo.includes(attack.type as never))
					continue;
				const mutated = mutation.transform(attack.payload);
				if (mutated === attack.payload) continue;
				const result = scanForThreats(mutated, { contexts: attack.contexts });
				if (result.verdict !== "allow") continue;
				const ruleIds = result.findings.map((finding) => finding.ruleId);
				if (expectedMutationMiss(mutation.name, attack.contexts, ruleIds)) continue;
				unexplained.push(`${mutation.name} :: ${attack.label}`);
			}
		}
		return unexplained;
	};

	// A budget rather than zero, and the number is the point: it went 227 -> 17 as the
	// gaps this suite found were closed. Raising it is a decision someone has to make
	// on purpose; lowering it is the goal. The residue is narrow SQL operator swaps and
	// re-encodings of payloads that were already encoded.
	it("leaves no more than the documented residue of unexplained evasions", () => {
		expect(misses().length).toBeLessThanOrEqual(17);
	});

	it("applies every mutation to at least one payload", () => {
		const unused = MUTATIONS.filter(
			(mutation) =>
				!attacks.some((attack) => mutation.transform(attack.payload) !== attack.payload),
		).map((mutation) => mutation.name);
		expect(unused).toEqual([]);
	});
});

// CAPEC attribution: which family of attack a finding belongs to, and where to read
// more. Generated from MITRE's XML — the published CSV ships the Related Weaknesses
// column header with no data under it, which would have produced an empty mapping
// silently.
describe("CAPEC attribution", () => {
	it("maps only CWEs the catalog actually uses", () => {
		const catalog = new Set(THREAT_RULES.map((rule) => rule.cwe).filter(Boolean));
		const stray = ATTACK_PATTERNS.flatMap((pattern) => pattern.cwes).filter(
			(cwe) => !catalog.has(cwe),
		);
		expect(stray).toEqual([]);
	});

	it("resolves patterns for a weakness the catalog reports", () => {
		const patterns = attackPatternsForCwe(89);
		expect(patterns.length).toBeGreaterThan(0);
		expect(patterns.map((pattern) => pattern.capec)).toContain(66);
	});

	// Empty means MITRE publishes nothing for that weakness, which is a fact about the
	// upstream data rather than a bug here. Six catalog CWEs are in that position.
	it("returns an empty array rather than throwing for an unmapped or absent CWE", () => {
		expect(attackPatternsForCwe(1427)).toEqual([]);
		expect(attackPatternsForCwe(undefined)).toEqual([]);
		expect(attackPatternsForCwe(999999)).toEqual([]);
	});

	it("keeps only the abstractions specific enough to be useful", () => {
		const abstractions = new Set(ATTACK_PATTERNS.map((pattern) => pattern.abstraction));
		expect([...abstractions].sort()).toEqual(["Detailed", "Standard"]);
	});

	// Attribution must not become a second scoring input by accident.
	it("changes no verdict", () => {
		const before = scanForThreats("1 UNION SELECT a FROM b", { contexts: ["sql"] });
		expect(before.verdict).toBe("review");
		expect(Object.keys(before.findings[0] ?? {})).not.toContain("capec");
	});
});

// OWASP AppSensor's argument: application-layer intrusion detection is about sequences
// attributed to an actor, not individual strings. One review verdict is noise; thirty
// from one account in a minute is an incident, and a per-string API cannot say so.
describe("event correlation", () => {
	const event = {
		requestId: "req-01HX",
		actorId: "acct-9f2",
		sessionId: "sess-77",
		source: "http.query",
	} as const;

	it("echoes the supplied context verbatim", () => {
		const result = scanForThreats("1 UNION SELECT a FROM b", { contexts: ["sql"], event });
		expect(result.event).toEqual(event);
	});

	it("omits the field entirely when none is supplied", () => {
		const result = scanForThreats("1 UNION SELECT a FROM b", { contexts: ["sql"] });
		expect("event" in result).toBe(false);
	});

	// The whole point of the field is that it is inert. If it could move a score, it
	// would be an input to detection and would need validating.
	it("affects neither score nor verdict nor findings", () => {
		const withEvent = scanForThreats("1 UNION SELECT a", { contexts: ["sql"], event });
		const without = scanForThreats("1 UNION SELECT a", { contexts: ["sql"] });
		expect(withEvent.score).toBe(without.score);
		expect(withEvent.verdict).toBe(without.verdict);
		expect(withEvent.findings).toEqual(without.findings);
	});

	it("accepts a partial context", () => {
		const result = scanForThreats("x", { contexts: ["sql"], event: { requestId: "r" } });
		expect(result.event).toEqual({ requestId: "r" });
	});
});

describe("rule id stability", () => {
	/** Every id the package can emit, including the two raised outside the catalog. */
	const emittedIds = [
		...THREAT_RULES.map((rule) => rule.id),
		"RESOURCE-REPETITION-001",
		"UNICODE-MIXED-SCRIPT-001",
	].sort();

	it("matches the committed snapshot", () => {
		expect(emittedIds).toEqual(RULE_ID_SNAPSHOT);
	});

	it("never reuses a retired id", () => {
		const reused = RETIRED_RULE_IDS.filter((id) => emittedIds.includes(id));
		expect(reused).toEqual([]);
	});

	it("accounts for every id that has ever shipped", () => {
		const known = new Set([...emittedIds, ...RETIRED_RULE_IDS]);
		const unaccounted = RULE_ID_SNAPSHOT.filter((id: string) => !known.has(id));
		expect(unaccounted).toEqual([]);
	});

	// The engine honours this id in `excludeRuleIds` but it is not in THREAT_RULES, so a
	// snapshot built from the catalog alone would let a rename of it pass silently.
	it("covers the ids raised outside the catalog", () => {
		expect(RULE_ID_SNAPSHOT).toContain("RESOURCE-REPETITION-001");
		expect(RULE_ID_SNAPSHOT).toContain("UNICODE-MIXED-SCRIPT-001");
	});
});

describe("fixture coverage", () => {
	const attackCases = [...MALICIOUS, ...EVASIONS, ...COVERAGE];

	// In-context, not merely pattern-matching: a fixture bound to a sink the rule does
	// not declare never reaches that rule through the engine, so it proves nothing.
	it("exercises every rule with at least one fixture at a sink it declares", () => {
		const exercised = new Set(
			THREAT_RULES.filter((rule) =>
				attackCases.some(
					(testCase) =>
						rule.pattern.test(testCase.payload) &&
						testCase.contexts.some((context) => rule.contexts.includes(context)),
				),
			).map((rule) => rule.id),
		);

		const unexercised = THREAT_RULES.filter((rule) => !exercised.has(rule.id)).map(
			(rule) => rule.id,
		);
		expect(unexercised).toEqual([]);
	});

	it("gives every declared context at least one benign fixture", () => {
		const covered = new Set(BENIGN.flatMap((testCase) => testCase.contexts));
		const uncovered = ALL_THREAT_CONTEXTS.filter((context) => !covered.has(context));
		expect(uncovered).toEqual([]);
	});

	it("targets a rule that exists, from every coverage fixture", () => {
		const ids = new Set(THREAT_RULES.map((rule) => rule.id));
		const dangling = COVERAGE.filter((testCase) => !ids.has(testCase.expectRuleId)).map(
			(testCase) => testCase.expectRuleId,
		);
		expect(dangling).toEqual([]);
	});

	// Deliberately asserts only that the rule fires — not a verdict. Several of these
	// rules score below the allow band alone by design, and inflating their severity to
	// satisfy a test is how a catalog starts crying wolf.
	it.each(COVERAGE.map((testCase) => [testCase.expectRuleId, testCase] as const))(
		"%s fires on its coverage fixture",
		(_ruleId, testCase) => {
			const result = scanForThreats(testCase.payload, { contexts: testCase.contexts });
			expect(result.findings.map((finding) => finding.ruleId)).toContain(testCase.expectRuleId);
		},
	);
});

// ============================================
// Malicious corpus — no false negatives
// ============================================

describe("malicious corpus", () => {
	it.each(MALICIOUS.map((testCase) => [testCase.label, testCase] as const))(
		"detects %s",
		(_label, testCase) => {
			const result = scanForThreats(testCase.payload, { contexts: testCase.contexts });
			expect(result.types).toContain(testCase.expectType);
			expect(result.isSafe).toBe(false);
		},
	);

	it("scores every malicious payload above the allow band", () => {
		const allowed = MALICIOUS.filter(
			(testCase) =>
				scanForThreats(testCase.payload, { contexts: testCase.contexts }).verdict === "allow",
		);
		expect(allowed.map((testCase) => testCase.label)).toEqual([]);
	});
});

// ============================================
// Evasion corpus — encoding must not bypass
// ============================================

describe("evasion corpus", () => {
	it.each(EVASIONS.map((testCase) => [testCase.label, testCase] as const))(
		"detects %s",
		(_label, testCase) => {
			const result = scanForThreats(testCase.payload, { contexts: testCase.contexts });
			expect(result.types).toContain(testCase.expectType);
			// Asserting the category alone is not enough: a payload can carry the right
			// type from a single low-confidence rule and still score into `allow`, which
			// means the evasion works in practice. Two entries passed this suite that
			// way before the assertion was tightened.
			expect(result.verdict).not.toBe("allow");
		},
	);

	it("records which representation matched", () => {
		const result = scanForThreats("&#60;script&#62;", { contexts: ["html"] });
		const finding = result.findings.find((candidate) => candidate.ruleId === "XSS-SCRIPT-TAG-001");
		expect(finding?.variant).toBe("html_decoded");
	});

	it("misses encoded payloads when variant scanning is disabled", () => {
		const result = scanForThreats("%3Cscript%3E", { contexts: ["html"], scanVariants: false });
		expect(result.isSafe).toBe(true);
	});
});

// ============================================
// Benign corpus — no false positives
// ============================================

describe("benign corpus", () => {
	it.each(BENIGN.map((testCase) => [testCase.label, testCase] as const))(
		"accepts %s",
		(_label, testCase) => {
			const result = scanForThreats(testCase.value, { contexts: testCase.contexts });
			expect(result.findings.map((finding) => finding.ruleId)).toEqual([]);
			expect(result.verdict).toBe("allow");
		},
	);
});

// ============================================
// Context scoping — the core false-positive control
// ============================================

describe("context scoping", () => {
	it("treats a Windows path as prose in general_text and as evidence in filesystem", () => {
		const bio = "Our build scripts live in C:\\Windows\\System32 on the CI box";
		expect(scanForThreats(bio, { contexts: ["general_text"] }).isSafe).toBe(true);
		expect(scanForThreats(bio, { contexts: ["filesystem"] }).types).toContain("path_traversal");
	});

	it("treats 1=1 as arithmetic unless quote-escaped", () => {
		expect(scanForThreats("1=1", { contexts: ["sql"] }).isSafe).toBe(true);
		expect(scanForThreats("x' OR 1=1", { contexts: ["sql"] }).types).toContain("sql_injection");
	});

	it("does not run injection rules under the default context", () => {
		// The default is general_text, so a caller who forgets to declare a sink gets
		// the universal rules only — never a surprise SQL rejection on a bio field.
		expect(scanForThreats("UNION SELECT 1").isSafe).toBe(true);
	});

	it("runs command rules only when shell is declared", () => {
		expect(scanForThreats("$(whoami)", { contexts: ["general_text"] }).isSafe).toBe(true);
		expect(scanForThreats("$(whoami)", { contexts: ["shell"] }).types).toContain(
			"command_injection",
		);
	});
});

// ============================================
// Scoring and policy
// ============================================

describe("scoring", () => {
	const finding = (
		overrides: Partial<ThreatFinding> & Pick<ThreatFinding, "ruleId">,
	): ThreatFinding => ({
		type: "xss",
		severity: "high",
		confidence: "high",
		description: "test",
		primaryControl: "test",
		variant: "raw",
		...overrides,
	});

	it("multiplies severity weight by confidence", () => {
		// high (4) × high (1.5) = 6
		expect(calculateThreatScore([finding({ ruleId: "A" })])).toBe(6);
		// low (1) × low (0.5) = 0.5
		expect(
			calculateThreatScore([finding({ ruleId: "A", severity: "low", confidence: "low" })]),
		).toBe(0.5);
	});

	it("counts each rule once regardless of how many variants matched", () => {
		const raw = finding({ ruleId: "A", variant: "raw" });
		const decoded = finding({ ruleId: "A", variant: "percent_decoded" });
		expect(calculateThreatScore([raw, decoded])).toBe(6);
	});

	it("sums distinct rules", () => {
		expect(calculateThreatScore([finding({ ruleId: "A" }), finding({ ruleId: "B" })])).toBe(12);
	});

	it("returns zero for no findings", () => {
		expect(calculateThreatScore([])).toBe(0);
	});

	it("maps scores onto policy bands", () => {
		expect(verdictForScore(0)).toBe("allow");
		expect(verdictForScore(3.9)).toBe("allow");
		expect(verdictForScore(4)).toBe("review");
		expect(verdictForScore(7.9)).toBe("review");
		expect(verdictForScore(8)).toBe("block");
	});

	it("honours a custom policy", () => {
		expect(verdictForScore(4, { reviewAt: 10, blockAt: 20 })).toBe("allow");
		expect(verdictForScore(25, { reviewAt: 10, blockAt: 20 })).toBe("block");
	});

	it("summarizes by category, worst first", () => {
		const summary = summarizeByType([
			finding({ ruleId: "A", type: "xss" }),
			finding({ ruleId: "B", type: "sql_injection", severity: "critical" }),
		]);
		expect(summary[0]?.type).toBe("sql_injection");
		expect(summary[1]?.type).toBe("xss");
	});
});

// ============================================
// Tuning knobs
// ============================================

describe("scan options", () => {
	it("excludes rules by id", () => {
		const payload = "value' OR '1'='1";
		expect(scanForThreats(payload, { contexts: ["sql"] }).isSafe).toBe(false);
		expect(
			scanForThreats(payload, {
				contexts: ["sql"],
				excludeRuleIds: ["SQL-TAUTOLOGY-QUOTED-001"],
			}).isSafe,
		).toBe(true);
	});

	it("filters by minimum severity", () => {
		const payload = "SELECT 0x0123456789abcdef";
		expect(scanForThreats(payload, { contexts: ["sql"] }).isSafe).toBe(false);
		expect(scanForThreats(payload, { contexts: ["sql"], minSeverity: "high" }).isSafe).toBe(true);
	});

	it("reports truncation", () => {
		const result = scanForThreats("a".repeat(500), { maxLength: 100 });
		expect(result.truncated).toBe(true);
	});

	it("treats empty and non-string input as safe", () => {
		expect(scanForThreats("").isSafe).toBe(true);
		expect(scanForThreats(null as unknown as string).isSafe).toBe(true);
		expect(scanForThreats(undefined as unknown as string).isSafe).toBe(true);
		expect(scanForThreats(42 as unknown as string).isSafe).toBe(true);
	});

	it("flags pathological repetition as resource abuse", () => {
		const result = scanForThreats("a".repeat(300), { contexts: ["general_text"] });
		expect(result.types).toContain("resource_abuse");
	});

	it("is stateless across repeated calls", () => {
		// Regression guard: a `/g` pattern in the catalog would make the second call
		// disagree with the first.
		const payload = "<script>alert(1)</script>";
		const first = scanForThreats(payload, { contexts: ["html"] });
		const second = scanForThreats(payload, { contexts: ["html"] });
		expect(second.findings.map((finding) => finding.ruleId)).toEqual(
			first.findings.map((finding) => finding.ruleId),
		);
		expect(second.score).toBe(first.score);
	});

	it("attaches CWE identifiers to findings", () => {
		const result = scanForThreats("../../etc/passwd", { contexts: ["filesystem"] });
		expect(result.findings.some((finding) => finding.cwe === 22)).toBe(true);
	});

	it("reports match offsets within the matched variant", () => {
		const result = scanForThreats("safe text <script>", { contexts: ["html"] });
		const finding = result.findings.find((candidate) => candidate.ruleId === "XSS-SCRIPT-TAG-001");
		expect(finding?.start).toBe(10);
		expect(finding?.end).toBeGreaterThan(10);
	});
});

// ============================================
// Canonicalization variants
// ============================================

describe("input variants", () => {
	it("always includes the raw representation first", () => {
		const variants = buildInputVariants("plain");
		expect(variants[0]).toEqual({ kind: "raw", value: "plain" });
	});

	it("adds only representations that differ", () => {
		expect(buildInputVariants("plain")).toHaveLength(1);
	});

	it("adds a percent-decoded representation", () => {
		expect(buildInputVariants("%2e%2e%2f")).toContainEqual({
			kind: "percent_decoded",
			value: "../",
		});
	});

	it("adds an html-decoded representation", () => {
		expect(buildInputVariants("&lt;b&gt;")).toContainEqual({
			kind: "html_decoded",
			value: "<b>",
		});
	});

	it("survives malformed percent encoding", () => {
		expect(() => buildInputVariants("100%zz")).not.toThrow();
		expect(tryPercentDecode("100%zz")).toBeNull();
	});

	it("returns null when there is nothing to percent-decode", () => {
		expect(tryPercentDecode("no escapes here")).toBeNull();
	});

	it("decodes numeric and named html entities", () => {
		expect(decodeHtmlEntities("&#60;&#x3e;&amp;&quot;")).toBe('<>&"');
	});

	it("leaves unknown entities alone", () => {
		expect(decodeHtmlEntities("&notarealentity;")).toBe("&notarealentity;");
	});

	it("does not recursively decode", () => {
		// `&amp;#60;` decodes once to `&#60;`, not twice to `<`. Recursive decoding
		// makes the scanner disagree with the sink about what the value actually is.
		expect(decodeHtmlEntities("&amp;#60;")).toBe("&#60;");
	});
});
