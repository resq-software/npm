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
 * @fileoverview GENERATED FILE — do not edit by hand.
 *
 * MITRE CAPEC attack patterns whose Related Weaknesses intersect a CWE this catalog
 * uses. Derived from CAPEC view 1000 (Mechanisms of Attack), filtered to Standard and
 * Detailed abstractions because Meta patterns are too abstract to help anyone triaging
 * a finding.
 *
 * **Attribution, not conformance.** A CAPEC id tells a reader which family of attack a
 * finding belongs to and where to read more. It does not assert that the rule detects
 * every technique in that pattern, and nothing here changes a score or a verdict.
 *
 * Regenerate with `bun scripts/generate-capec.ts <capec-1000.csv>`.
 *
 * @module @resq-systems/security/threats/capec
 */

/** One CAPEC attack pattern, reduced to what a consumer triaging a finding needs. */
export interface AttackPattern {
	/** CAPEC identifier. */
	readonly capec: number;
	/** Pattern name, as published by MITRE. */
	readonly name: string;
	/** MITRE abstraction level: "Standard" or "Detailed". */
	readonly abstraction: string;
	/** MITRE's typical severity for the pattern. */
	readonly severity: string;
	/** Catalog CWEs this pattern relates to. */
	readonly cwes: readonly number[];
}

/** Every relevant pattern, ordered by CAPEC id. */
export const ATTACK_PATTERNS: readonly AttackPattern[] = [
	{
		capec: 1,
		name: "Accessing Functionality Not Properly Constrained by ACLs",
		abstraction: "Standard",
		severity: "High",
		cwes: [1321],
	},
	{
		capec: 3,
		name: "Using Leading 'Ghost' Character Sequences to Bypass Input Filters",
		abstraction: "Detailed",
		severity: "Medium",
		cwes: [74],
	},
	{
		capec: 6,
		name: "Argument Injection",
		abstraction: "Standard",
		severity: "High",
		cwes: [74, 78],
	},
	{
		capec: 7,
		name: "Blind SQL Injection",
		abstraction: "Detailed",
		severity: "High",
		cwes: [74, 89],
	},
	{
		capec: 8,
		name: "Buffer Overflow in an API Call",
		abstraction: "Detailed",
		severity: "High",
		cwes: [74],
	},
	{
		capec: 9,
		name: "Buffer Overflow in Local Command-Line Utilities",
		abstraction: "Detailed",
		severity: "High",
		cwes: [74],
	},
	{
		capec: 10,
		name: "Buffer Overflow via Environment Variables",
		abstraction: "Detailed",
		severity: "High",
		cwes: [74],
	},
	{
		capec: 13,
		name: "Subverting Environment Variable Values",
		abstraction: "Detailed",
		severity: "Very High",
		cwes: [74],
	},
	{
		capec: 14,
		name: "Client-side Injection-induced Buffer Overflow",
		abstraction: "Detailed",
		severity: "High",
		cwes: [74],
	},
	{
		capec: 15,
		name: "Command Delimiters",
		abstraction: "Standard",
		severity: "High",
		cwes: [78],
	},
	{
		capec: 24,
		name: "Filter Failure through Buffer Overflow",
		abstraction: "Detailed",
		severity: "High",
		cwes: [74],
	},
	{
		capec: 31,
		name: "Accessing/Intercepting/Modifying HTTP Cookies",
		abstraction: "Detailed",
		severity: "High",
		cwes: [113],
	},
	{
		capec: 34,
		name: "HTTP Response Splitting",
		abstraction: "Detailed",
		severity: "High",
		cwes: [74, 113],
	},
	{
		capec: 35,
		name: "Leverage Executable Code in Non-Executable Files",
		abstraction: "Detailed",
		severity: "Very High",
		cwes: [94, 95, 97],
	},
	{
		capec: 41,
		name: "Using Meta-characters in E-mail Headers to Inject Malicious Payloads",
		abstraction: "Detailed",
		severity: "High",
		cwes: [88],
	},
	{
		capec: 42,
		name: "MIME Conversion",
		abstraction: "Detailed",
		severity: "High",
		cwes: [74],
	},
	{
		capec: 43,
		name: "Exploiting Multiple Input Interpretation Layers",
		abstraction: "Detailed",
		severity: "High",
		cwes: [74, 78],
	},
	{
		capec: 45,
		name: "Buffer Overflow via Symbolic Links",
		abstraction: "Detailed",
		severity: "High",
		cwes: [74],
	},
	{
		capec: 46,
		name: "Overflow Variables and Tags",
		abstraction: "Detailed",
		severity: "High",
		cwes: [74],
	},
	{
		capec: 47,
		name: "Buffer Overflow via Parameter Expansion",
		abstraction: "Detailed",
		severity: "High",
		cwes: [74],
	},
	{
		capec: 50,
		name: "Password Recovery Exploitation",
		abstraction: "Standard",
		severity: "High",
		cwes: [522],
	},
	{
		capec: 51,
		name: "Poison Web Service Registry",
		abstraction: "Detailed",
		severity: "Very High",
		cwes: [74],
	},
	{
		capec: 52,
		name: "Embedding NULL Bytes",
		abstraction: "Detailed",
		severity: "High",
		cwes: [74, 158],
	},
	{
		capec: 53,
		name: "Postfix, Null Terminate, and Backslash",
		abstraction: "Detailed",
		severity: "High",
		cwes: [74, 158],
	},
	{
		capec: 63,
		name: "Cross-Site Scripting (XSS)",
		abstraction: "Standard",
		severity: "Very High",
		cwes: [79],
	},
	{
		capec: 64,
		name: "Using Slashes and URL Encoding Combined to Bypass Validation Logic",
		abstraction: "Detailed",
		severity: "High",
		cwes: [22, 74, 177],
	},
	{
		capec: 66,
		name: "SQL Injection",
		abstraction: "Standard",
		severity: "High",
		cwes: [89],
	},
	{
		capec: 67,
		name: "String Format Overflow in syslog()",
		abstraction: "Detailed",
		severity: "Very High",
		cwes: [74],
	},
	{
		capec: 71,
		name: "Using Unicode Encoding to Bypass Validation Logic",
		abstraction: "Detailed",
		severity: "High",
		cwes: [74],
	},
	{
		capec: 72,
		name: "URL Encoding",
		abstraction: "Detailed",
		severity: "High",
		cwes: [74, 177],
	},
	{
		capec: 76,
		name: "Manipulating Web Input to File System Calls",
		abstraction: "Detailed",
		severity: "Very High",
		cwes: [22, 74],
	},
	{
		capec: 77,
		name: "Manipulating User-Controlled Variables",
		abstraction: "Standard",
		severity: "Very High",
		cwes: [94, 1321],
	},
	{
		capec: 78,
		name: "Using Escaped Slashes in Alternate Encoding",
		abstraction: "Detailed",
		severity: "High",
		cwes: [22, 74],
	},
	{
		capec: 79,
		name: "Using Slashes in Alternate Encoding",
		abstraction: "Detailed",
		severity: "High",
		cwes: [22, 74],
	},
	{
		capec: 80,
		name: "Using UTF-8 Encoding to Bypass Validation Logic",
		abstraction: "Detailed",
		severity: "High",
		cwes: [74],
	},
	{
		capec: 81,
		name: "Web Server Logs Tampering",
		abstraction: "Detailed",
		severity: "High",
		cwes: [117],
	},
	{
		capec: 83,
		name: "XPath Injection",
		abstraction: "Detailed",
		severity: "High",
		cwes: [74, 91],
	},
	{
		capec: 84,
		name: "XQuery Injection",
		abstraction: "Detailed",
		severity: "Very High",
		cwes: [74],
	},
	{
		capec: 85,
		name: "AJAX Footprinting",
		abstraction: "Detailed",
		severity: "Low",
		cwes: [79, 113],
	},
	{
		capec: 88,
		name: "OS Command Injection",
		abstraction: "Standard",
		severity: "High",
		cwes: [78, 88],
	},
	{
		capec: 93,
		name: "Log Injection-Tampering-Forging",
		abstraction: "Detailed",
		severity: "High",
		cwes: [117],
	},
	{
		capec: 98,
		name: "Phishing",
		abstraction: "Standard",
		severity: "Very High",
		cwes: [451],
	},
	{
		capec: 101,
		name: "Server Side Include (SSI) Injection",
		abstraction: "Detailed",
		severity: "High",
		cwes: [74, 97],
	},
	{
		capec: 102,
		name: "Session Sidejacking",
		abstraction: "Detailed",
		severity: "High",
		cwes: [522],
	},
	{
		capec: 105,
		name: "HTTP Request Splitting",
		abstraction: "Detailed",
		severity: "High",
		cwes: [74, 113],
	},
	{
		capec: 108,
		name: "Command Line Execution through SQL Injection",
		abstraction: "Detailed",
		severity: "Very High",
		cwes: [74, 78, 89],
	},
	{
		capec: 109,
		name: "Object Relational Mapping Injection",
		abstraction: "Detailed",
		severity: "High",
		cwes: [89],
	},
	{
		capec: 110,
		name: "SQL Injection through SOAP Parameter Tampering",
		abstraction: "Detailed",
		severity: "Very High",
		cwes: [89],
	},
	{
		capec: 120,
		name: "Double Encoding",
		abstraction: "Detailed",
		severity: "Medium",
		cwes: [74, 177],
	},
	{
		capec: 126,
		name: "Path Traversal",
		abstraction: "Standard",
		severity: "Very High",
		cwes: [22],
	},
	{
		capec: 135,
		name: "Format String Injection",
		abstraction: "Standard",
		severity: "High",
		cwes: [74],
	},
	{
		capec: 136,
		name: "LDAP Injection",
		abstraction: "Standard",
		severity: "High",
		cwes: [90],
	},
	{
		capec: 163,
		name: "Spear Phishing",
		abstraction: "Detailed",
		severity: "High",
		cwes: [451],
	},
	{
		capec: 164,
		name: "Mobile Phishing",
		abstraction: "Detailed",
		severity: "High",
		cwes: [451],
	},
	{
		capec: 174,
		name: "Flash Parameter Injection",
		abstraction: "Detailed",
		severity: "Medium",
		cwes: [88],
	},
	{
		capec: 180,
		name: "Exploiting Incorrectly Configured Access Control Security Levels",
		abstraction: "Standard",
		severity: "Medium",
		cwes: [1321],
	},
	{
		capec: 193,
		name: "PHP Remote File Inclusion",
		abstraction: "Detailed",
		severity: "High",
		cwes: [98],
	},
	{
		capec: 209,
		name: "XSS Using MIME Type Mismatch",
		abstraction: "Detailed",
		severity: "Medium",
		cwes: [79],
	},
	{
		capec: 215,
		name: "Fuzzing for application mapping",
		abstraction: "Detailed",
		severity: "Low",
		cwes: [532],
	},
	{
		capec: 221,
		name: "Data Serialization External Entities Blowup",
		abstraction: "Detailed",
		severity: "",
		cwes: [611],
	},
	{
		capec: 250,
		name: "XML Injection",
		abstraction: "Standard",
		severity: "",
		cwes: [74, 91],
	},
	{
		capec: 267,
		name: "Leverage Alternate Encoding",
		abstraction: "Standard",
		severity: "High",
		cwes: [74],
	},
	{
		capec: 268,
		name: "Audit Log Manipulation",
		abstraction: "Standard",
		severity: "",
		cwes: [117],
	},
	{
		capec: 273,
		name: "HTTP Response Smuggling",
		abstraction: "Detailed",
		severity: "High",
		cwes: [74],
	},
	{
		capec: 460,
		name: "HTTP Parameter Pollution (HPP)",
		abstraction: "Detailed",
		severity: "Medium",
		cwes: [88, 235],
	},
	{
		capec: 463,
		name: "Padding Oracle Crypto Attack",
		abstraction: "Detailed",
		severity: "High",
		cwes: [347],
	},
	{
		capec: 468,
		name: "Generic Cross-Browser Cross-Domain Theft",
		abstraction: "Standard",
		severity: "Medium",
		cwes: [177],
	},
	{
		capec: 470,
		name: "Expanding Control over the Operating System from the Database",
		abstraction: "Detailed",
		severity: "Very High",
		cwes: [89],
	},
	{
		capec: 474,
		name: "Signature Spoofing by Key Theft",
		abstraction: "Detailed",
		severity: "High",
		cwes: [522],
	},
	{
		capec: 475,
		name: "Signature Spoofing by Improper Validation",
		abstraction: "Detailed",
		severity: "High",
		cwes: [347],
	},
	{
		capec: 509,
		name: "Kerberoasting",
		abstraction: "Detailed",
		severity: "High",
		cwes: [522],
	},
	{
		capec: 551,
		name: "Modify Existing Service",
		abstraction: "Detailed",
		severity: "",
		cwes: [522],
	},
	{
		capec: 555,
		name: "Remote Services with Stolen Credentials",
		abstraction: "Standard",
		severity: "Very High",
		cwes: [522],
	},
	{
		capec: 561,
		name: "Windows Admin Shares with Stolen Credentials",
		abstraction: "Detailed",
		severity: "",
		cwes: [522],
	},
	{
		capec: 588,
		name: "DOM-Based XSS",
		abstraction: "Detailed",
		severity: "Very High",
		cwes: [79],
	},
	{
		capec: 591,
		name: "Reflected XSS",
		abstraction: "Detailed",
		severity: "Very High",
		cwes: [79],
	},
	{
		capec: 592,
		name: "Stored XSS",
		abstraction: "Detailed",
		severity: "Very High",
		cwes: [79],
	},
	{
		capec: 597,
		name: "Absolute Path Traversal",
		abstraction: "Detailed",
		severity: "",
		cwes: [36],
	},
	{
		capec: 600,
		name: "Credential Stuffing",
		abstraction: "Standard",
		severity: "High",
		cwes: [522],
	},
	{
		capec: 632,
		name: "Homograph Attack via Homoglyphs",
		abstraction: "Detailed",
		severity: "Medium",
		cwes: [1007],
	},
	{
		capec: 644,
		name: "Use of Captured Hashes (Pass The Hash)",
		abstraction: "Detailed",
		severity: "High",
		cwes: [522],
	},
	{
		capec: 645,
		name: "Use of Captured Tickets (Pass The Ticket)",
		abstraction: "Detailed",
		severity: "High",
		cwes: [522],
	},
	{
		capec: 652,
		name: "Use of Known Kerberos Credentials",
		abstraction: "Standard",
		severity: "High",
		cwes: [522],
	},
	{
		capec: 653,
		name: "Use of Known Operating System Credentials",
		abstraction: "Standard",
		severity: "High",
		cwes: [522],
	},
	{
		capec: 664,
		name: "Server Side Request Forgery",
		abstraction: "Standard",
		severity: "High",
		cwes: [918],
	},
	{
		capec: 676,
		name: "NoSQL Injection",
		abstraction: "Standard",
		severity: "High",
		cwes: [943],
	},
];

/** Index from CWE to the patterns referencing it, built once at module load. */
const BY_CWE: ReadonlyMap<number, readonly AttackPattern[]> = (() => {
	const index = new Map<number, AttackPattern[]>();
	for (const pattern of ATTACK_PATTERNS) {
		for (const cwe of pattern.cwes) {
			const bucket = index.get(cwe);
			if (bucket) bucket.push(pattern);
			else index.set(cwe, [pattern]);
		}
	}
	return index;
})();

/**
 * Attack patterns related to a weakness.
 *
 * @param cwe - CWE identifier, typically a rule's `cwe` field.
 * @returns Related patterns, or an empty array when none is mapped. Empty means MITRE
 *   publishes no Standard or Detailed pattern for that weakness — not that the weakness
 *   is unimportant.
 */
export function attackPatternsForCwe(cwe: number | undefined): readonly AttackPattern[] {
	if (typeof cwe !== "number") return [];
	return BY_CWE.get(cwe) ?? [];
}
