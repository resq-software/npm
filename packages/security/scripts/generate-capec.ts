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
 * @fileoverview Regenerates `src/threats/capec.generated.ts` from MITRE's published CAPEC XML.
 *
 * Run from the package root:
 *
 * ```sh
 * curl -sSo /tmp/capec.xml https://capec.mitre.org/data/xml/capec_latest.xml
 * bun scripts/generate-capec.ts /tmp/capec.xml
 * ```
 *
 * The XML is deliberately **not** vendored. Only the derived subset is committed — the
 * patterns intersecting a CWE this catalog actually uses — so the reviewable diff stays
 * small and upstream drift arrives as a readable change rather than a megabyte of churn.
 */

import { THREAT_RULES } from "../src/threats/rules/index.js";

const csvPath = process.argv[2];
if (!csvPath) {
	console.error("usage: bun scripts/generate-capec.ts <path-to-capec_latest.xml>");
	process.exit(1);
}

const OUTPUT = new URL("../src/threats/capec.generated.ts", import.meta.url).pathname;

const catalogCwes = new Set<number>(
	THREAT_RULES.map((rule) => rule.cwe).filter((cwe): cwe is number => typeof cwe === "number"),
);

interface Pattern {
	capec: number;
	name: string;
	abstraction: string;
	severity: string;
	cwes: number[];
}

/**
 * Extract attack patterns from the CAPEC XML.
 *
 * The published CSV for view 1000 carries a `Related Weaknesses` column header with no
 * data underneath it, so a CSV-driven generator silently produces an empty mapping. The
 * XML is the only export that actually contains the weakness links.
 *
 * Parsed with bounded regular expressions rather than an XML library: the shape needed
 * here is three attributes and one child element, and adding a parser dependency to a
 * build script that runs by hand is not worth it.
 */
function extractPatterns(xml: string, catalog: ReadonlySet<number>): Pattern[] {
	const patterns: Pattern[] = [];
	const blocks = xml.split("<Attack_Pattern ").slice(1);

	for (const block of blocks) {
		const head = block.slice(0, 400);
		const id = Number(/^ID="(\d+)"/.exec(head)?.[1]);
		if (!Number.isInteger(id)) continue;

		const name = /Name="([^"]*)"/.exec(head)?.[1] ?? "";
		const abstraction = /Abstraction="([^"]*)"/.exec(head)?.[1] ?? "";

		// A block with no closing tag is truncated input, not a pattern. Slicing to a -1
		// index would keep the rest of the document, attributing every later `CWE_ID` to
		// this one pattern and inventing links MITRE never published.
		const end = block.indexOf("</Attack_Pattern>");
		if (end === -1) continue;

		const body = block.slice(0, end);
		const severity = /<Typical_Severity>([^<]*)<\/Typical_Severity>/.exec(body)?.[1] ?? "";

		const cwes = [...body.matchAll(/CWE_ID="(\d+)"/g)]
			.map((match) => Number(match[1]))
			.filter((cwe) => catalog.has(cwe));
		if (cwes.length === 0) continue;

		patterns.push({
			capec: id,
			name: decodeEntities(name),
			abstraction,
			severity,
			cwes: [...new Set(cwes)].sort((a, b) => a - b),
		});
	}

	return patterns.sort((a, b) => a.capec - b.capec);
}

/** The five XML predefined entities. Pattern names contain ampersands and quotes. */
function decodeEntities(value: string): string {
	return value
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&quot;", String.fromCharCode(34))
		.replaceAll("&apos;", String.fromCharCode(39))
		.replaceAll("&amp;", "&");
}

const xml = await Bun.file(csvPath).text();
if (!xml.includes("<Attack_Pattern ")) {
	console.error("input does not look like the CAPEC XML export");
	process.exit(1);
}
const matched = extractPatterns(xml, catalogCwes);
if (matched.length === 0) {
	console.error("no attack pattern referenced a catalog CWE; the export shape has changed");
	process.exit(1);
}

// Meta patterns are too abstract to help anyone triaging a finding.
const kept = matched.filter(
	(pattern) => pattern.abstraction === "Standard" || pattern.abstraction === "Detailed",
);

const lines: string[] = [
	"/**",
	" * Copyright 2026 ResQ Systems, Inc.",
	" *",
	' * Licensed under the Apache License, Version 2.0 (the "License");',
	" * you may not use this file except in compliance with the License.",
	" * You may obtain a copy of the License at",
	" *",
	" *     http://www.apache.org/licenses/LICENSE-2.0",
	" *",
	" * Unless required by applicable law or agreed to in writing, software",
	' * distributed under the License is distributed on an "AS IS" BASIS,',
	" * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.",
	" * See the License for the specific language governing permissions and",
	" * limitations under the License.",
	" */",
	"",
	"/**",
	" * @fileoverview GENERATED FILE — do not edit by hand.",
	" *",
	" * MITRE CAPEC attack patterns whose Related Weaknesses intersect a CWE this catalog",
	" * uses. Derived from CAPEC view 1000 (Mechanisms of Attack), filtered to Standard and",
	" * Detailed abstractions because Meta patterns are too abstract to help anyone triaging",
	" * a finding.",
	" *",
	" * **Attribution, not conformance.** A CAPEC id tells a reader which family of attack a",
	" * finding belongs to and where to read more. It does not assert that the rule detects",
	" * every technique in that pattern, and nothing here changes a score or a verdict.",
	" *",
	" * Regenerate with `bun scripts/generate-capec.ts <capec-1000.csv>`.",
	" *",
	" * @module @resq-systems/security/threats/capec",
	" */",
	"",
	"/** One CAPEC attack pattern, reduced to what a consumer triaging a finding needs. */",
	"export interface AttackPattern {",
	"\t/** CAPEC identifier. */",
	"\treadonly capec: number;",
	"\t/** Pattern name, as published by MITRE. */",
	"\treadonly name: string;",
	'\t/** MITRE abstraction level: "Standard" or "Detailed". */',
	"\treadonly abstraction: string;",
	"\t/** MITRE's typical severity for the pattern. */",
	"\treadonly severity: string;",
	"\t/** Catalog CWEs this pattern relates to. */",
	"\treadonly cwes: readonly number[];",
	"}",
	"",
	"/** Every relevant pattern, ordered by CAPEC id. */",
	"export const ATTACK_PATTERNS: readonly AttackPattern[] = [",
];

for (const pattern of kept) {
	lines.push(
		"\t{",
		`\t\tcapec: ${pattern.capec},`,
		`\t\tname: ${JSON.stringify(pattern.name)},`,
		`\t\tabstraction: ${JSON.stringify(pattern.abstraction)},`,
		`\t\tseverity: ${JSON.stringify(pattern.severity)},`,
		`\t\tcwes: [${pattern.cwes.join(", ")}],`,
		"\t},",
	);
}

lines.push(
	"];",
	"",
	"/** Index from CWE to the patterns referencing it, built once at module load. */",
	"const BY_CWE: ReadonlyMap<number, readonly AttackPattern[]> = (() => {",
	"\tconst index = new Map<number, AttackPattern[]>();",
	"\tfor (const pattern of ATTACK_PATTERNS) {",
	"\t\tfor (const cwe of pattern.cwes) {",
	"\t\t\tconst bucket = index.get(cwe);",
	"\t\t\tif (bucket) bucket.push(pattern);",
	"\t\t\telse index.set(cwe, [pattern]);",
	"\t\t}",
	"\t}",
	"\treturn index;",
	"})();",
	"",
	"/**",
	" * Attack patterns related to a weakness.",
	" *",
	" * @param cwe - CWE identifier, typically a rule's `cwe` field.",
	" * @returns Related patterns, or an empty array when none is mapped. Empty means MITRE",
	" *   publishes no Standard or Detailed pattern for that weakness — not that the weakness",
	" *   is unimportant.",
	" */",
	"export function attackPatternsForCwe(cwe: number | undefined): readonly AttackPattern[] {",
	'\tif (typeof cwe !== "number") return [];',
	"\treturn BY_CWE.get(cwe) ?? [];",
	"}",
	"",
);

await Bun.write(OUTPUT, lines.join("\n"));

const coveredCwes = new Set(kept.flatMap((pattern) => pattern.cwes));
const uncovered = [...catalogCwes].filter((cwe) => !coveredCwes.has(cwe)).sort((a, b) => a - b);
console.log(`catalog CWEs: ${catalogCwes.size}`);
console.log(`patterns matched: ${matched.length}, kept: ${kept.length}`);
console.log(`CWEs with at least one pattern: ${coveredCwes.size}`);
console.log(
	`CWEs with none: ${uncovered.length}${uncovered.length ? ` -> ${uncovered.join(", ")}` : ""}`,
);
