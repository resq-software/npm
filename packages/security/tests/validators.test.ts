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

import { describe, expect, it } from "vitest";
import { scanForThreats } from "../src/threats/engine.js";
import {
	containsCommandInjection,
	containsHomoglyphs,
	containsNoSQLInjection,
	containsPathTraversal,
	containsPrototypePollution,
	containsSQLInjection,
	containsXSSPatterns,
	detectThreatPatterns,
	encodeJsonForScript,
	encodeLogValue,
	escapeCsvField,
	escapeHtmlAttribute,
	escapeHtmlText,
	getThreatErrorMessage,
	isSafeInput,
	normalizeUnicode,
	sanitizeForDisplay,
	toCsvRow,
	validateSafeEmail,
	validateSafeName,
	validateSafeText,
} from "../src/validators.js";

// ============================================
// XSS Detection
// ============================================

describe("containsXSSPatterns", () => {
	it("should detect script tags", () => {
		const result = containsXSSPatterns('<script>alert("xss")</script>');
		expect(result.length).toBeGreaterThan(0);
		expect(result[0]!.type).toBe("xss");
	});

	it("should detect event handlers", () => {
		const result = containsXSSPatterns("<img onerror=alert(1)>");
		expect(result.length).toBeGreaterThan(0);
	});

	it("should detect javascript: URIs", () => {
		const result = containsXSSPatterns("javascript:alert(1)");
		expect(result.length).toBeGreaterThan(0);
	});

	it("should detect iframe injection", () => {
		const result = containsXSSPatterns('<iframe src="evil.com"></iframe>');
		expect(result.length).toBeGreaterThan(0);
	});

	it("should detect eval calls", () => {
		const result = containsXSSPatterns('eval("malicious")');
		expect(result.length).toBeGreaterThan(0);
	});

	it("should NOT classify prototype pollution as XSS", () => {
		// Prototype pollution is a distinct weakness class with distinct controls, so
		// it reports as `prototype_pollution` — see the suite below.
		expect(containsXSSPatterns('{"__proto__":{"isAdmin":true}}')).toEqual([]);
	});

	it("should return empty array for safe input", () => {
		expect(containsXSSPatterns("Hello, world!")).toEqual([]);
	});
});

// ============================================
// Prototype Pollution Detection
// ============================================

describe("containsPrototypePollution", () => {
	it("should detect __proto__ in a JSON body", () => {
		const result = containsPrototypePollution('{"__proto__":{"isAdmin":true}}');
		expect(result.length).toBeGreaterThan(0);
		expect(result[0]!.type).toBe("prototype_pollution");
		expect(result[0]!.cwe).toBe(1321);
	});

	it("should detect bracket notation in a query string", () => {
		expect(containsPrototypePollution("a[__proto__][isAdmin]=1").length).toBeGreaterThan(0);
	});

	it("should detect a constructor.prototype chain", () => {
		expect(containsPrototypePollution("obj.constructor.prototype.x = 1").length).toBeGreaterThan(0);
	});

	it("should not fire on prose that merely mentions the property", () => {
		expect(containsPrototypePollution("the __proto__ property is legacy")).toEqual([]);
	});
});

// ============================================
// SQL Injection Detection
// ============================================

describe("containsSQLInjection", () => {
	it("should detect UNION SELECT", () => {
		const result = containsSQLInjection("UNION SELECT * FROM users");
		expect(result.length).toBeGreaterThan(0);
		expect(result[0]!.type).toBe("sql_injection");
	});

	it("should detect DROP TABLE", () => {
		const result = containsSQLInjection("DROP TABLE users");
		expect(result.length).toBeGreaterThan(0);
	});

	it("should detect always-true conditions", () => {
		const result = containsSQLInjection("' OR '1'='1");
		expect(result.length).toBeGreaterThan(0);
	});

	it("should detect SLEEP-based blind injection", () => {
		const result = containsSQLInjection("SLEEP(5)");
		expect(result.length).toBeGreaterThan(0);
	});

	it("should detect stacked queries", () => {
		const result = containsSQLInjection("; DROP TABLE users");
		expect(result.length).toBeGreaterThan(0);
	});

	it("should return empty array for safe input", () => {
		expect(containsSQLInjection("SELECT is a nice word")).toEqual([]);
	});
});

// ============================================
// NoSQL Injection Detection
// ============================================

describe("containsNoSQLInjection", () => {
	it("should detect MongoDB $gt operator", () => {
		const result = containsNoSQLInjection('{"$gt": ""}');
		expect(result.length).toBeGreaterThan(0);
		expect(result[0]!.type).toBe("nosql_injection");
	});

	it("should detect $where injection", () => {
		const result = containsNoSQLInjection("$where: function(){}");
		expect(result.length).toBeGreaterThan(0);
	});

	it("should detect operator injection pattern", () => {
		const result = containsNoSQLInjection("{ $ne: null }");
		expect(result.length).toBeGreaterThan(0);
	});

	it("should return empty array for safe input", () => {
		expect(containsNoSQLInjection("just a normal string")).toEqual([]);
	});
});

// ============================================
// Command Injection Detection
// ============================================

describe("containsCommandInjection", () => {
	it("should detect command substitution with $()", () => {
		const result = containsCommandInjection("$(rm -rf /)");
		expect(result.length).toBeGreaterThan(0);
		expect(result[0]!.type).toBe("command_injection");
	});

	it("should detect backtick command substitution", () => {
		const result = containsCommandInjection("`cat /etc/passwd`");
		expect(result.length).toBeGreaterThan(0);
	});

	it("should detect chained dangerous commands", () => {
		const result = containsCommandInjection("; rm -rf /");
		expect(result.length).toBeGreaterThan(0);
	});

	it("should detect pipe to shell", () => {
		const result = containsCommandInjection("| bash");
		expect(result.length).toBeGreaterThan(0);
	});

	it("should return empty array for safe input", () => {
		expect(containsCommandInjection("hello world")).toEqual([]);
	});
});

// ============================================
// Path Traversal Detection
// ============================================

describe("containsPathTraversal", () => {
	it("should detect ../ traversal", () => {
		const result = containsPathTraversal("../../etc/passwd");
		expect(result.length).toBeGreaterThan(0);
		expect(result[0]!.type).toBe("path_traversal");
	});

	it("should detect ..\\ traversal", () => {
		const result = containsPathTraversal("..\\..\\windows\\system32");
		expect(result.length).toBeGreaterThan(0);
	});

	it("should detect URL-encoded traversal", () => {
		const result = containsPathTraversal("%2e%2e%2f");
		expect(result.length).toBeGreaterThan(0);
	});

	it("should detect null byte injection", () => {
		const result = containsPathTraversal("file.txt%00.jpg");
		expect(result.length).toBeGreaterThan(0);
	});

	it("should detect /etc/passwd path", () => {
		const result = containsPathTraversal("/etc/passwd");
		expect(result.length).toBeGreaterThan(0);
	});

	it("should return empty array for safe input", () => {
		expect(containsPathTraversal("normal/path/file.txt")).toEqual([]);
	});
});

// ============================================
// Homoglyph Detection
// ============================================

describe("containsHomoglyphs", () => {
	it("should detect Cyrillic 'a' lookalike", () => {
		const result = containsHomoglyphs("p\u0430ypal"); // Cyrillic а
		expect(result.length).toBeGreaterThan(0);
		expect(result[0]!.type).toBe("homoglyph");
	});

	it("should detect Cyrillic 'o' lookalike", () => {
		const result = containsHomoglyphs("g\u043E\u043Egle"); // Cyrillic о
		expect(result.length).toBeGreaterThan(0);
	});

	it("should return empty array for pure ASCII", () => {
		expect(containsHomoglyphs("hello world")).toEqual([]);
	});
});

// ============================================
// detectThreatPatterns (main validator)
// ============================================

describe("detectThreatPatterns", () => {
	it("should return isSafe: true for clean input", () => {
		const result = detectThreatPatterns("Hello, world!");
		expect(result.isSafe).toBe(true);
		expect(result.threats).toEqual([]);
	});

	it("should detect XSS by default", () => {
		const result = detectThreatPatterns("<script>alert(1)</script>");
		expect(result.isSafe).toBe(false);
		expect(result.threats.some((t) => t.type === "xss")).toBe(true);
	});

	it("should skip command injection by default", () => {
		const result = detectThreatPatterns("$(whoami)");
		// Command injection is off by default
		expect(result.isSafe).toBe(true);
	});

	it("should detect command injection when enabled", () => {
		const result = detectThreatPatterns("$(whoami)", { checkCommandInjection: true });
		expect(result.isSafe).toBe(false);
	});

	it("should allow disabling specific checks", () => {
		const result = detectThreatPatterns("UNION SELECT 1", {
			checkSQLInjection: false,
			checkXSS: false,
			checkNoSQLInjection: false,
			checkPathTraversal: false,
			checkHomoglyphs: false,
		});
		expect(result.isSafe).toBe(true);
	});

	it("should return isSafe: true for empty/null input", () => {
		expect(detectThreatPatterns("").isSafe).toBe(true);
		expect(detectThreatPatterns(null as unknown as string).isSafe).toBe(true);
	});
});

// ============================================
// isSafeInput
// ============================================

describe("isSafeInput", () => {
	it("should return true for safe input", () => {
		expect(isSafeInput("Hello, world!")).toBe(true);
	});

	it("should return false for XSS payload", () => {
		expect(isSafeInput("<script>alert(1)</script>")).toBe(false);
	});

	it("should return false for SQL injection", () => {
		expect(isSafeInput("' OR '1'='1")).toBe(false);
	});
});

// ============================================
// sanitizeForDisplay
// ============================================

describe("sanitizeForDisplay", () => {
	it("should escape HTML angle brackets", () => {
		expect(sanitizeForDisplay("<div>")).toBe("&lt;div&gt;");
	});

	it("should escape ampersands", () => {
		expect(sanitizeForDisplay("foo & bar")).toBe("foo &amp; bar");
	});

	it("should escape double quotes", () => {
		expect(sanitizeForDisplay('"hello"')).toBe("&quot;hello&quot;");
	});

	it("should escape single quotes", () => {
		expect(sanitizeForDisplay("it's")).toBe("it&#x27;s");
	});

	it("should escape forward slashes", () => {
		expect(sanitizeForDisplay("a/b")).toBe("a&#x2F;b");
	});

	it("should return empty string for null/undefined", () => {
		expect(sanitizeForDisplay(null as unknown as string)).toBe("");
		expect(sanitizeForDisplay(undefined as unknown as string)).toBe("");
	});

	it("should return empty string for empty input", () => {
		expect(sanitizeForDisplay("")).toBe("");
	});

	it("should escape a full script tag", () => {
		expect(sanitizeForDisplay('<script>alert("xss")</script>')).toBe(
			"&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;",
		);
	});
});

// ============================================
// normalizeUnicode
// ============================================

describe("normalizeUnicode", () => {
	it("should replace Cyrillic 'a' with ASCII 'a'", () => {
		const result = normalizeUnicode("p\u0430ypal"); // Cyrillic а
		expect(result).toBe("paypal");
	});

	it("should replace Cyrillic 'o' with ASCII 'o'", () => {
		const result = normalizeUnicode("g\u043E\u043Egle");
		expect(result).toBe("google");
	});

	it("should return empty string for null/undefined", () => {
		expect(normalizeUnicode(null as unknown as string)).toBe("");
		expect(normalizeUnicode(undefined as unknown as string)).toBe("");
	});

	it("should leave pure ASCII unchanged", () => {
		expect(normalizeUnicode("hello")).toBe("hello");
	});

	it("should normalize NFC form", () => {
		// e + combining acute accent -> precomposed e-acute
		const decomposed = "e\u0301";
		const result = normalizeUnicode(decomposed);
		expect(result).toBe("\u00E9");
	});
});

// ============================================
// validateSafeText / validateSafeName / validateSafeEmail
// ============================================

describe("validateSafeText", () => {
	it("should return true for safe text", () => {
		expect(validateSafeText("Hello, world!")).toBe(true);
	});

	it("should return false for XSS payload", () => {
		expect(validateSafeText("<script>alert(1)</script>")).toBe(false);
	});
});

describe("validateSafeName", () => {
	it("should accept simple names", () => {
		expect(validateSafeName("John Doe")).toBe(true);
	});

	it("should accept hyphenated names", () => {
		expect(validateSafeName("Mary-Jane")).toBe(true);
	});

	it("should accept names with apostrophes", () => {
		expect(validateSafeName("O'Brien")).toBe(true);
	});

	it("should accept international names", () => {
		expect(validateSafeName("Jos\u00E9 Garc\u00EDa")).toBe(true);
	});

	it("should reject names with script injection", () => {
		expect(validateSafeName('<script>alert("xss")</script>')).toBe(false);
	});

	it("should reject names with numbers or special chars", () => {
		expect(validateSafeName("John123")).toBe(false);
	});
});

describe("validateSafeEmail", () => {
	it("should accept valid emails", () => {
		expect(validateSafeEmail("user@example.com")).toBe(true);
	});

	it("should reject emails without @", () => {
		expect(validateSafeEmail("invalid-email")).toBe(false);
	});

	it("should reject emails without domain", () => {
		expect(validateSafeEmail("user@")).toBe(false);
	});

	it("should reject emails with XSS in local part", () => {
		expect(validateSafeEmail("<script>@example.com")).toBe(false);
	});
});

// ============================================
// getThreatErrorMessage
// ============================================

describe("getThreatErrorMessage", () => {
	it("should return empty string for safe result", () => {
		expect(getThreatErrorMessage({ isSafe: true, threats: [] })).toBe("");
	});

	it("should return XSS message for xss threat", () => {
		const msg = getThreatErrorMessage({
			isSafe: false,
			threats: [{ type: "xss", description: "XSS detected" }],
		});
		expect(msg).toContain("script");
	});

	it("should return SQL message for sql_injection threat", () => {
		const msg = getThreatErrorMessage({
			isSafe: false,
			threats: [{ type: "sql_injection", description: "SQL injection" }],
		});
		expect(msg).toContain("database");
	});

	it("should return path traversal message", () => {
		const msg = getThreatErrorMessage({
			isSafe: false,
			threats: [{ type: "path_traversal", description: "Path traversal" }],
		});
		expect(msg).toContain("file path");
	});

	it("should return homoglyph message", () => {
		const msg = getThreatErrorMessage({
			isSafe: false,
			threats: [{ type: "homoglyph", description: "Homoglyph" }],
		});
		expect(msg).toContain("lookalike");
	});
});

// Every encoder below shipped with no test at all, and each is the `primaryControl` of
// at least one rule. An encoder that does not do what its rule claims is worse than no
// encoder: the caller's round-trip check passes while the sink stays open.
describe("output encoders", () => {
	const ESCAPE = String.fromCharCode(27);
	const NUL = String.fromCharCode(0);

	describe("escapeHtmlAttribute", () => {
		it.each([
			["tab", "\t", "&#x09;"],
			["carriage return", "\r", "&#x0D;"],
			["line feed", "\n", "&#x0A;"],
		])("keeps the existing escape for %s byte-identical", (_label, char, entity) => {
			expect(escapeHtmlAttribute(`a${char}b`)).toBe(`a${entity}b`);
		});

		// U+000C ends an unquoted attribute value; U+000D does not, because the input
		// stream preprocessor normalises it to U+000A before the tokenizer runs. This used
		// to escape the one that cannot matter and miss this one.
		it("escapes the form feed that actually terminates an unquoted value", () => {
			expect(escapeHtmlAttribute("foo\fautofocus")).toBe("foo&#x0C;autofocus");
		});

		it.each([
			["null", "\u0000", "&#x00;"],
			["vertical tab", "\u000b", "&#x0B;"],
			["escape", "\u001b", "&#x1B;"],
			["delete", "\u007f", "&#x7F;"],
			["C1 next-line", "\u0085", "&#x85;"],
			["line separator", "\u2028", "&#x2028;"],
			["paragraph separator", "\u2029", "&#x2029;"],
		])("escapes %s", (_label, char, entity) => {
			expect(escapeHtmlAttribute(`a${char}b`)).toBe(`a${entity}b`);
		});

		it("leaves ordinary text alone apart from the documented set", () => {
			expect(escapeHtmlAttribute("Jos\u00e9 Mu\u00f1oz")).toBe("Jos\u00e9&#x20;Mu\u00f1oz");
		});

		it.each([
			["", ""],
			[null, ""],
			[undefined, ""],
		])("returns an empty string for %o", (input, expected) => {
			expect(escapeHtmlAttribute(input as unknown as string)).toBe(expected);
		});

		// Element text has no unquoted-attribute state, so widening that one would be
		// churn with no threat behind it.
		it("does not change escapeHtmlText, where a form feed terminates nothing", () => {
			expect(escapeHtmlText("a\fb")).toBe("a\fb");
		});
	});

	describe("encodeLogValue", () => {
		it.each([
			["a forged entry", "alice\nINFO  promoted", "alice\\nINFO  promoted"],
			["a CRLF split", "alice\r\nERROR fake", "alice\\r\\nERROR fake"],
			["a tab", "a\tb", "a\\tb"],
		])("renders %s on one line", (_label, input, expected) => {
			expect(encodeLogValue(input)).toBe(expected);
		});

		it.each([
			["ANSI erase display", `x${ESCAPE}[2J`],
			["ANSI cursor up", `x${ESCAPE}[5A`],
			["OSC window title", `x${ESCAPE}]0;pwned`],
			["bidi override", "x\u202eadmin"],
			["zero-width space", "ad\u200bmin"],
			["byte order mark", "\ufeffx"],
			["NUL", `x${NUL}root`],
			["line separator", "x\u2028y"],
		])("leaves no raw control or formatting character for %s", (_label, input) => {
			expect(encodeLogValue(input)).not.toMatch(
				// biome-ignore lint/suspicious/noControlCharactersInRegex: asserting no control character survives
				/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/,
			);
		});

		// The point of a control is that the rule stops firing once it is applied.
		it.each([
			["forged entry", "alice\nINFO  promoted"],
			["ANSI escape", `alice${ESCAPE}[2J`],
			["bidi override", "alice\u202eadmin"],
		])("closes the finding it is the control for: %s", (_label, payload) => {
			expect(scanForThreats(payload, { contexts: ["log"] }).findings.length).toBeGreaterThan(0);
			expect(scanForThreats(encodeLogValue(payload), { contexts: ["log"] }).findings).toEqual([]);
		});

		it.each([
			"alice@example.com",
			"/home/dashboard?tab=recent",
			"Jos\u00e9 Mu\u00f1oz",
			"\u4e16\u754c",
		])("passes benign value %o through unchanged", (value) => {
			expect(encodeLogValue(value)).toBe(value);
		});

		// Silent truncation in an audit record is its own problem, so it is announced.
		it("announces truncation rather than applying it silently", () => {
			expect(encodeLogValue("a".repeat(5000))).toContain("[truncated 2952 chars]");
		});

		it("honours an explicit maxLength", () => {
			expect(encodeLogValue("abcdef", { maxLength: 3 })).toBe("abc[truncated 3 chars]");
		});

		it.each([
			["", ""],
			[null, ""],
			[undefined, ""],
		])("returns an empty string for %o", (input, expected) => {
			expect(encodeLogValue(input as unknown as string)).toBe(expected);
		});
	});

	describe("escapeCsvField", () => {
		/**
		 * RFC 4180 reader, so these assert a round trip rather than a golden string. A CR,
		 * LF or CRLF outside quotes ends a record, as it does for a spreadsheet.
		 */
		const parseCsv = (text: string, delimiter = ","): string[][] => {
			const records: string[][] = [];
			let record: string[] = [];
			let field = "";
			let index = 0;
			let quoted = false;
			while (index < text.length) {
				const char = text[index];
				if (quoted) {
					if (char === '"') {
						if (text[index + 1] === '"') {
							field += '"';
							index += 2;
							continue;
						}
						quoted = false;
						index++;
						continue;
					}
					field += char;
					index++;
					continue;
				}
				if (char === '"' && field === "") {
					quoted = true;
					index++;
					continue;
				}
				if (char === delimiter) {
					record.push(field);
					field = "";
					index++;
					continue;
				}
				if (char === "\r" || char === "\n") {
					records.push([...record, field]);
					record = [];
					field = "";
					index += char === "\r" && text[index + 1] === "\n" ? 2 : 1;
					continue;
				}
				field += char;
				index++;
			}
			records.push([...record, field]);
			return records;
		};

		/** One encoded row, which must read back as exactly one record. */
		const parseCsvRow = (row: string, delimiter = ","): string[] => {
			const records = parseCsv(row, delimiter);
			if (records.length !== 1) throw new Error(`expected one record, read ${records.length}`);
			return records[0];
		};

		it.each([
			"=SUM(1)",
			"+1+1",
			"-1+1",
			"@SUM(1)",
			"\t=1",
			"\r=1",
			" =cmd|'/c calc'!A1",
			'"=1+1',
			'=WEBSERVICE("https://evil.example")',
		])("neutralises the formula trigger in %o", (payload) => {
			const encoded = escapeCsvField(payload);
			const inner = encoded.startsWith('"') ? encoded.slice(1) : encoded;
			expect(inner).not.toMatch(/^[=+\-@\t\r\n\uff1d\uff0b\uff0d\uff20]/);
		});

		// A reader that strips leading whitespace and quotes strips all of them, so the
		// encoder has to see through a run of any length, not only a short one.
		it.each([
			["9 leading spaces", `${" ".repeat(9)}=1+1`],
			["20 leading spaces", `${" ".repeat(20)}=HYPERLINK("https://evil.example")`],
			["mixed quotes and spaces", `${`' "`.repeat(4)}=1+1`],
			["a TAB behind leading spaces", `${" ".repeat(9)}\tSUM(1)`],
			["a CR behind leading spaces", `${" ".repeat(9)}\rSUM(1)`],
			["Unicode whitespace", `${"\u00a0\u3000\ufeff".repeat(4)}=1+1`],
		])("neutralises a trigger behind %s", (_label, payload) => {
			const decoded = parseCsvRow(escapeCsvField(payload))[0];

			expect(decoded).toBe(`'${payload}`);
		});

		// JavaScript's `\s` omits U+001C to U+001F and U+0085, but Python's `strip()` removes
		// all five, .NET's `Trim()` removes U+0085 and Java's `trim()` U+001C to U+001F.
		// Python's `str.splitlines()` also ends a line at each of them but U+001F, so a
		// trigger behind one gains an apostrophe after it as well as at the start.
		const WHITESPACE_OUTSIDE_JS_S = [
			["U+001C", "\x1c=1+1", "'\x1c'=1+1"],
			["U+001F", "\x1f=1+1", "'\x1f=1+1"],
			["U+0085", "\x85=1+1", "'\x85'=1+1"],
			[
				"all five behind spaces",
				`  \x1c\x1d\x1e\x1f\x85=HYPERLINK("https://evil.example")`,
				`'  \x1c'\x1d'\x1e'\x1f\x85'=HYPERLINK("https://evil.example")`,
			],
		] as const;

		it.each(WHITESPACE_OUTSIDE_JS_S)(
			"neutralises a trigger behind %s",
			(_label, payload, expected) => {
				expect(parseCsvRow(escapeCsvField(payload))[0]).toBe(expected);
			},
		);

		it.each(WHITESPACE_OUTSIDE_JS_S)("detects a trigger behind %s", (_label, payload) => {
			const ruleIds = scanForThreats(payload, { contexts: ["spreadsheet"] }).findings.map(
				(finding) => finding.ruleId,
			);

			expect(ruleIds).toContain("CSV-FORMULA-LEAD-001");
		});

		// The OWASP CSV Injection list names LF and the full-width forms as triggers too.
		const LF_AND_FULL_WIDTH_TRIGGERS = [
			["a leading LF", "\nSUM(1)"],
			["LF behind leading spaces", `${" ".repeat(9)}\nSUM(1)`],
			["a full-width equals sign", '\uff1dHYPERLINK("https://evil.example")'],
			["a full-width plus sign", "\uff0b1+1"],
			["a full-width minus sign", "\uff0d1+1"],
			["a full-width at sign", "\uff20SUM(1)"],
			["a full-width trigger behind leading spaces", `${" ".repeat(9)}\uff1d1+1`],
		] as const;

		it.each(LF_AND_FULL_WIDTH_TRIGGERS)("neutralises %s", (_label, payload) => {
			const decoded = parseCsvRow(escapeCsvField(payload))[0];

			expect(decoded).toBe(`'${payload}`);
		});

		// NFKC folding already exposes a full-width trigger to the scan, but only on the
		// `nfkc` variant. The rule should match the value as written, as the encoder does.
		it.each(LF_AND_FULL_WIDTH_TRIGGERS)("detects %s in the raw value", (_label, payload) => {
			const result = scanForThreats(payload, { contexts: ["spreadsheet"] });
			const rawRuleIds = result.findings
				.filter((finding) => finding.variant === "raw")
				.map((finding) => finding.ruleId);

			expect(rawRuleIds).toContain("CSV-FORMULA-LEAD-001");
		});

		// NFKC folds these onto a trigger or onto the leading run, and `CSV-FORMULA-LEAD-001`
		// matches the scan's `nfkc` variant, so the encoder has to agree with the rule. The
		// file keeps the value as written, so the apostrophe is the only change.
		it.each([
			["a small equals sign", '\ufe66HYPERLINK("https://evil.example")'],
			["a small plus sign", "\ufe621+1"],
			["a small hyphen-minus", "\ufe631+1"],
			["a small commercial at", "\ufe6bSUM(1)"],
			["a full-width quotation mark before a trigger", "\uff02=1+1"],
			["a full-width apostrophe before a trigger", "\uff07=1+1"],
			["a superscript plus sign", "\u207a1+1"],
		])("neutralises %s, which the rule detects after NFKC", (_label, payload) => {
			const ruleIds = scanForThreats(payload, { contexts: ["spreadsheet"] }).findings.map(
				(finding) => finding.ruleId,
			);

			expect(ruleIds).toContain("CSV-FORMULA-LEAD-001");
			expect(parseCsvRow(escapeCsvField(payload))[0]).toBe(`'${payload}`);
		});

		// NFKC expands U+FDFA to 18 code units. Normalizing the whole of this value would need
		// a string longer than V8 allows, so one large cell would abort the export. Compared
		// as a boolean, so a failure never prints the 30M-character value.
		it("encodes a value whose NFKC form is too long for a string", () => {
			const value = `x${"ﷺ".repeat(30_000_000)}`;

			expect(escapeCsvField(value) === value).toBe(true);
		});

		// Only the head is normalized, so the head has to cover the whole leading run, which
		// includes the full-width quotation mark because NFKC folds it onto `"`.
		it("neutralises a small equals sign behind a long full-width quotation mark run", () => {
			const payload = `${"＂".repeat(1_000_000)}﹦1+1`;

			expect(escapeCsvField(payload) === `'${payload}`).toBe(true);
		});

		// An array stringifies to its elements joined by commas, so its first element
		// becomes the cell's leading text. Only the application's own scalars skip the prefix.
		it.each([
			["an array", ['=HYPERLINK("https://evil.example")', "x"]],
			["an object with its own toString", { toString: () => "=1+1" }],
		])("neutralises a trigger in %s", (_label, value) => {
			const decoded = parseCsvRow(escapeCsvField(value))[0];

			expect(decoded).toBe(`'${String(value)}`);
		});

		it.each([
			["plain text", "hello"],
			["plain text behind leading spaces", `${" ".repeat(20)}hello`],
			["a negative number", -1234],
			["a negative bigint", -5n],
		])("leaves %s unprefixed", (_label, value) => {
			expect(escapeCsvField(value)).toBe(String(value));
		});

		// A leading apostrophe and a position-independent DDE rule mean the encoded value
		// still scans dirty. That is correct: the rules describe the value, the encoder
		// protects the file. Asserting a clean scan would force both rules to be weakened.
		it("still scans as a finding, because the rules describe the value not the file", () => {
			const encoded = escapeCsvField("=SUM(1)");
			const result = scanForThreats(encoded, { contexts: ["spreadsheet"] });
			expect(result.findings.length).toBeGreaterThan(0);
		});

		it("detects a trigger behind a long leading run, as the encoder does", () => {
			const result = scanForThreats(`${" ".repeat(20)}=1+1`, { contexts: ["spreadsheet"] });

			expect(result.findings.map((finding) => finding.ruleId)).toContain("CSV-FORMULA-LEAD-001");
		});

		it("round-trips one encode through one decode", () => {
			const cells = ["Ada Lovelace", "=1+1", 42, -1234, true, null];
			expect(parseCsvRow(toCsvRow(cells))).toEqual([
				"Ada Lovelace",
				"'=1+1",
				"42",
				"-1234",
				"true",
				"",
			]);
		});

		it.each([
			["a quote", 'He said "hi"'],
			["the delimiter", "a,b"],
			["a line feed", "line1\nline2"],
			["a carriage return", "line1\rline2"],
			["separators before plain text", "a, b; c\td"],
		])("quotes and recovers a field containing %s", (_label, value) => {
			expect(parseCsvRow(escapeCsvField(value))[0]).toBe(value);
		});

		// Numbers come from the application's own types and cannot carry a formula, so
		// prefixing them would turn every negative value in a sheet into text.
		it("prefixes a numeric string but not a number", () => {
			expect(escapeCsvField(-1234)).toBe("-1234");
			expect(escapeCsvField("-1234")).toBe("'-1234");
		});

		it("quotes on the configured delimiter", () => {
			expect(toCsvRow(["a;b"], { delimiter: ";" })).toBe('"a;b"');
		});

		// A reader may split on a different separator than the writer used, and an unquoted
		// separator would then start a cell whose leading trigger was never checked. Quoting
		// keeps the separator inside a first-column cell, while the reader is in step with the
		// writer and so sees the quote open the field. The apostrophe after the separator is
		// the one value change.
		it.each([
			[",", ";"],
			[";", ","],
			["\t", ","],
		])("keeps %o inside a first-column cell when the delimiter is %o", (separator, delimiter) => {
			const value = `x${separator}=cmd|' /C calc'!A0`;
			const encoded = escapeCsvField(value, { delimiter });

			expect(parseCsvRow(encoded, separator)).toEqual([`x${separator}'=cmd|' /C calc'!A0`]);
		});

		/**
		 * A formula character that a reader reaches by trimming whitespace and double quotes,
		 * with no apostrophe in front of it. TAB, CR and LF count as whitespace here, as they
		 * do after a boundary: a field that starts at the end of a value runs on into the
		 * file's own line break or delimiter, and then the next cell, which is neutralised in
		 * its own right.
		 */
		// biome-ignore lint/suspicious/noControlCharactersInRegex: U+001C to U+001F are whitespace to the readers that trim them
		const LIVE_FORMULA = /^[\s\x1c-\x1f\x85"]*[=+\-@\uff1d\uff0b\uff0d\uff20]/;

		// A quote opens a field only at the start of a field as the reader sees it, so a reader
		// that splits on another separator takes the quote literally in a later column. The
		// apostrophe after the separator neutralises the cell it starts there instead.
		it.each([
			[",", ";"],
			[";", ","],
			[",", "\t"],
		])(
			"neutralises every column when the delimiter is %o and the reader splits on %o",
			(delimiter, separator) => {
				const value = `x${separator}=cmd|' /C calc'!A0${separator}y`;
				const neutralised = `x${separator}'=cmd|' /C calc'!A0${separator}y`;

				expect(parseCsvRow(toCsvRow([value, "a"], { delimiter }), separator)).toEqual([
					`${neutralised}${delimiter}a`,
				]);
				expect(parseCsvRow(toCsvRow(["a", value], { delimiter }), separator)).toEqual([
					`a${delimiter}"x`,
					"'=cmd|' /C calc'!A0",
					'y"',
				]);
			},
		);

		// The same for a line break, read by a reader that ends a record only at a line break
		// outside quotes. In a later column it takes the quote literally, so the LF ends the
		// record, and the next record's first cell starts with the apostrophe.
		it("neutralises a line break in a later column for a reader that splits on another separator", () => {
			expect(parseCsv(toCsvRow(["x\n=1+1", "a"]), ";")).toEqual([["x\n'=1+1,a"]]);
			expect(parseCsv(toCsvRow(["a", "x\n=1+1"]), ";")).toEqual([['a,"x'], ["'=1+1\""]]);
		});

		it.each([",", ";", "\t", "\n", "\r"])(
			"leaves no live field for a reader that ignores quotes and splits on %o",
			(separator) => {
				const value = `x${separator}=1${separator} @2${separator}"=3${separator}-4`;
				const fields = toCsvRow(["a", value, "b"]).split(separator);

				expect(fields.length).toBeGreaterThan(4);
				expect(fields.filter((field) => LIVE_FORMULA.test(field))).toEqual([]);
			},
		);

		// A value holding the reader's separator and then `"` leaves that reader inside a
		// quoted field across the row's line break, so from there it starts fields where the
		// writer did not. Each of those starts behind a boundary, where the apostrophe is.
		it("neutralises the fields a reader thrown out of step by a quote sees", () => {
			const file = [
				["a", 'x;"'],
				["b", "y;=1+1"],
				["c", "z\n@SUM(1)"],
			]
				.map((cells) => toCsvRow(cells))
				.join("\r\n");
			const fields = parseCsv(file, ";").flat();

			expect(fields).toContain("'=1+1\"");
			expect(fields.filter((field) => LIVE_FORMULA.test(field))).toEqual([]);
		});

		// The apostrophe goes right after the boundary, in front of the leading run, as it
		// does at the start of the value. TAB, CR and LF are in that run, and are boundaries
		// themselves, so a CRLF before a trigger gains an apostrophe after the CR and the LF.
		it.each([
			["an LF", "x\n=1+1", "x\n'=1+1"],
			["a CR", "x\r+1+1", "x\r'+1+1"],
			["a CRLF", "x\r\n=1+1", "x\r'\n'=1+1"],
			['", "', "x, =1+1", "x,' =1+1"],
			["a semicolon", "x;@SUM(1)", "x;'@SUM(1)"],
			["a TAB", "x\t-1+1", "x\t'-1+1"],
			["a comma and a TAB", "x,\t=SUM(1)", "x,'\t'=SUM(1)"],
			["a comma before a quote", 'x,"=1+1', `x,'"=1+1`],
			["a long leading run", `x,${" ".repeat(20)}=1+1`, `x,'${" ".repeat(20)}=1+1`],
			["every separator", "=1,+2;-3\t@4\n=5", "'=1,'+2;'-3\t'@4\n'=5"],
		])("neutralises a formula after %s inside the value", (_label, value, expected) => {
			expect(parseCsvRow(escapeCsvField(value))[0]).toBe(expected);
		});

		// After a boundary, TAB, CR and LF lead no formula on their own, so text with line
		// breaks or TABs and no formula reads back unchanged. Only quoting is added.
		it.each([
			["a CRLF", "line1\r\nline2"],
			["a blank line", "a\n\nb"],
			["a comma and a TAB", "x,\ty"],
			["two CRLFs", "a\r\n\r\nb"],
			["two TABs", "x\t\ty"],
			["a table of text", "Name:\tAda\r\nRole:\tEngineer\r\n"],
		])("leaves text with %s unchanged apart from quoting", (_label, value) => {
			expect(escapeCsvField(value)).toBe(`"${value}"`);
		});

		// At the start of the value, TAB, CR and LF are still triggers, as OWASP lists them.
		it.each([
			["a TAB", "\tSUM(1)", "'\tSUM(1)"],
			["a CR", "\rSUM(1)", "'\rSUM(1)"],
			["an LF", "\nSUM(1)", "'\nSUM(1)"],
			["a CRLF", "\r\nSUM(1)", "'\r\nSUM(1)"],
			["a TAB behind a space", " \tSUM(1)", "' \tSUM(1)"],
		])("still prefixes a value that starts with %s", (_label, value, expected) => {
			expect(parseCsvRow(escapeCsvField(value))[0]).toBe(expected);
		});

		// After a boundary, a run of TAB, CR and LF is seen through to a real trigger,
		// including one that only NFKC folds onto a trigger or the leading run.
		it.each([
			["a TAB before '='", "x,\t=1", "x,'\t'=1"],
			["a CRLF and spaces before a full-width plus sign", "x\r\n  \uff0b1", "x\r'\n'  \uff0b1"],
			["an LF and a TAB before a small equals sign", "x;\n\t\ufe66=1", "x;'\n'\t'\ufe66=1"],
			["a TAB and a full-width quotation mark before '@'", "x;\t\uff02@1", "x;'\t'\uff02@1"],
		])("neutralises a boundary followed by %s", (_label, value, expected) => {
			expect(parseCsvRow(escapeCsvField(value))[0]).toBe(expected);
		});

		// Python's `str.splitlines()` also ends a line at these, so a reader that splits the
		// file into lines that way starts a field after each. U+037E is `;` once NFC or NFKC
		// has run. None needs quoting, so the field is written as is.
		it.each(["\v", "\f", "\x1c", "\x1d", "\x1e", "\x85", "\u2028", "\u2029", "\u037e"])(
			"neutralises a formula after %o, and leaves plain text after it alone",
			(separator) => {
				expect(escapeCsvField(`x${separator}=1`)).toBe(`x${separator}'=1`);
				expect(escapeCsvField(`x${separator} @1`)).toBe(`x${separator}' @1`);
				expect(escapeCsvField(`x${separator}y`)).toBe(`x${separator}y`);
			},
		);

		it("leaves no live field for a reader that splits lines as str.splitlines() does", () => {
			const file = toCsvRow(["a", "x\u2028=1\v@2\x85-3", "b"]);
			const fields = file
				// biome-ignore lint/suspicious/noControlCharactersInRegex: these are the line separators str.splitlines() uses
				.split(/\r\n|[\n\r\v\f\x1c-\x1e\x85\u2028\u2029]/)
				.flatMap((line) => line.split(","));

			expect(fields).toHaveLength(6);
			expect(fields.filter((field) => LIVE_FORMULA.test(field))).toEqual([]);
		});

		// Each character of a multi-character delimiter is a boundary, so a reader that splits
		// on one character alone finds the cell it starts neutralised.
		it("neutralises a formula after each character of a multi-character delimiter", () => {
			expect(escapeCsvField("x|=1~+2", { delimiter: "|~" })).toBe(`"x|'=1~'+2"`);
		});

		// A delimiter outside the BMP is one character but two code units, so the boundary is
		// the whole surrogate pair and the apostrophe goes after it, not between its halves.
		it("neutralises a formula after a delimiter outside the BMP", () => {
			expect(escapeCsvField("x\u{1f600}=1", { delimiter: "\u{1f600}" })).toBe(`"x\u{1f600}'=1"`);
		});

		it.each([
			["its first character", "x|=1+1", "x|'=1+1"],
			["its last character", "x~=1+1", "x~'=1+1"],
		])(
			"quotes and neutralises a field containing %s of a multi-character delimiter",
			(_label, value, expected) => {
				expect(escapeCsvField(value, { delimiter: "|~" })).toBe(`"${expected}"`);
			},
		);

		it("keeps a cell whole for a reader that splits on the delimiter's last character", () => {
			const row = toCsvRow(["a", "x~=1+1"], { delimiter: "|~" });

			expect(parseCsvRow(row, "~")).toEqual(["a|", "x~'=1+1"]);
		});

		// A reader that splits on the delimiter's first character does not see a field start
		// at the quote, so in a later column it splits the value there, behind the apostrophe.
		it("neutralises a later column for a reader that splits on the delimiter's first character", () => {
			const row = toCsvRow(["a", "x|=1+1"], { delimiter: "|~" });

			expect(parseCsvRow(row, "|")).toEqual(["a", '~"x', "'=1+1\""]);
		});

		// The NFKC check applies after a boundary as it does at the start of the value.
		it.each([
			["a small equals sign", "x,\ufe66HYPERLINK(1)", "x,'\ufe66HYPERLINK(1)"],
			["a full-width quotation mark before a trigger", "x;\uff02=1+1", "x;'\uff02=1+1"],
			["a superscript plus sign", "x\n\u207a1+1", "x\n'\u207a1+1"],
			[
				"a run of full-width quotation marks around an LF",
				"\uff02\n\uff02=1",
				"'\uff02\n'\uff02=1",
			],
		])(
			"neutralises %s after a boundary, which NFKC folds onto a formula lead",
			(_label, value, expected) => {
				expect(parseCsvRow(escapeCsvField(value))[0]).toBe(expected);
			},
		);

		// Numbers, booleans and bigints come from the application's own types, so they gain no
		// apostrophe, even where the delimiter makes part of their text a field start. An
		// array is text, so its later elements are neutralised too.
		it("inserts no apostrophe into a number, boolean or bigint", () => {
			expect(escapeCsvField(1e-7, { delimiter: "e" })).toBe('"1e-7"');
			expect(escapeCsvField(-5n, { delimiter: "-" })).toBe('"-5"');
			expect(escapeCsvField(true, { delimiter: "r" })).toBe('"true"');
			expect(escapeCsvField("1e-7", { delimiter: "e" })).toBe(`"1e'-7"`);
			expect(escapeCsvField([1, -2])).toBe(`"1,'-2"`);
		});

		// The remaining limit. A reader that splits on a character that is not a boundary gets
		// no apostrophe there, and a quote protects it only where it opens a field.
		it("still leaves a live cell to a reader that splits on a pipe", () => {
			expect(parseCsvRow(toCsvRow(["a", "x,=1|=2"]), "|")).toEqual([`a,"x,'=1`, '=2"']);
			expect(parseCsvRow(toCsvRow(["x|=1"]), "|")).toEqual(["x", "=1"]);
		});

		it("still leaves a live cell to a reader that splits on a space", () => {
			expect(parseCsvRow(toCsvRow(["a", "x, =1"]), " ")).toEqual([`a,"x,'`, '=1"']);
		});

		// The documented delimiter limit. `escapeCsvField` accepts any delimiter, but the
		// delimiter is written between cells, where no apostrophe can go.
		it("leaves a trigger at a field start when the delimiter holds one", () => {
			expect(toCsvRow(["", "1+1"], { delimiter: "=" })).toBe("=1+1");
			expect(toCsvRow(["", "1+1"], { delimiter: "\ufe66" })).toBe("\ufe661+1");

			const row = toCsvRow(["x,", "1+1"], { delimiter: "@" });

			expect(row.split(",").filter((field) => LIVE_FORMULA.test(field))).toEqual(['"@1+1']);
		});

		it("lets a reader that splits on an apostrophe delimiter cut the apostrophe off", () => {
			const row = toCsvRow(["x,=1"], { delimiter: "'" });

			expect(row).toBe(`"x,'=1"`);
			expect(row.split("'").filter((field) => LIVE_FORMULA.test(field))).toEqual(['=1"']);
		});

		it("breaks RFC 4180 framing, but not the apostrophes, when the delimiter holds a quote, CR or LF", () => {
			expect(parseCsv(toCsvRow(["", "b"], { delimiter: '"' }), '"')).toEqual([["b"]]);
			expect(parseCsv(toCsvRow(["a", "b"], { delimiter: "\r" }))).toEqual([["a"], ["b"]]);
			expect(parseCsv(toCsvRow(["a", "x,=1"], { delimiter: "\n" }))).toEqual([["a"], ["x,'=1"]]);
		});

		/**
		 * The definition the linear pass implements, tested afresh at the start of the value
		 * and after each boundary: the pattern, or the pattern on the NFKC form of the head.
		 * TAB, CR and LF are triggers at the start and leading-run characters only after a
		 * boundary. Quadratic, so only for short values.
		 */
		const referenceLeadStarts = (value: string, delimiter: string): number[] => {
			const boundaries = new Set([
				...",;\t\r\n\v\f\x1c\x1d\x1e\x85\u2028\u2029\u037e",
				...delimiter,
			]);
			// biome-ignore lint/suspicious/noControlCharactersInRegex: U+001C to U+001F are whitespace to the readers that trim them
			const startLead = /^[\s\x1c-\x1f\x85'"]*[=+\-@\t\r\n\uff1d\uff0b\uff0d\uff20]/;
			// biome-ignore lint/suspicious/noControlCharactersInRegex: U+001C to U+001F are whitespace to the readers that trim them
			const fieldLead = /^[\s\x1c-\x1f\x85'"]*[=+\-@\uff1d\uff0b\uff0d\uff20]/;
			// biome-ignore lint/suspicious/noControlCharactersInRegex: U+001C to U+001F are whitespace to the readers that trim them
			const nfkcRun = /^[\s\x1c-\x1f\x85'"\uff02\uff07]*/;
			const leads = (from: number): boolean => {
				const lead = from === 0 ? startLead : fieldLead;
				const rest = value.slice(from);
				const run = nfkcRun.exec(rest)?.[0].length ?? 0;
				return lead.test(rest) || lead.test(rest.slice(0, run + 16).normalize("NFKC"));
			};
			const starts = leads(0) ? [0] : [];
			let index = 0;
			for (const character of value) {
				index += character.length;
				if (boundaries.has(character) && leads(index)) starts.push(index);
			}
			return starts;
		};

		/** Mulberry32: a 32-bit PRNG whose state and output stay integers, via Math.imul. */
		const mulberry32 = (seed: number): (() => number) => {
			let state = seed | 0;
			return () => {
				state = (state + 0x6d2b79f5) | 0;
				let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
				mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
				return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
			};
		};

		it("agrees with testing the pattern afresh at every field start", () => {
			const alphabet = [
				..."ab1 '\"=+-@,;|\t\r\n",
				"\v",
				"\u00a0",
				"\u3000",
				"\x1c",
				"\x85",
				"\u2028",
				"\u037e",
				"\uff02",
				"\uff07",
				"\uff1d",
				"\uff0b",
				"\ufe66",
				"\u207a",
				"\u0301",
				"\u0338",
				"\ufdfa",
				"\u{1f600}",
			];
			const delimiters = [",", ";", "\t", "|~", " ", "\u{1f600}"];
			const next = mulberry32(0x5eed_c5f);
			const random = (bound: number): number => Math.floor(next() * bound);
			const rounds = 6_000;
			const inputs = new Set<string>();
			const mismatches: string[] = [];
			for (let round = 0; round < rounds; round++) {
				const length = random(24);
				const value = Array.from({ length }, () => alphabet[random(alphabet.length)]).join("");
				const delimiter = delimiters[random(delimiters.length)] ?? ",";
				inputs.add(JSON.stringify([value, delimiter]));
				const expected = referenceLeadStarts(value, delimiter).reduceRight(
					(text, start) => `${text.slice(0, start)}'${text.slice(start)}`,
					value,
				);
				// The field is quoted whenever it holds a comma, so one comma-split record is it.
				const decoded = parseCsvRow(escapeCsvField(value, { delimiter }))[0];
				if (decoded !== expected) mismatches.push(JSON.stringify([value, delimiter]));
			}

			// A generator that cycles early would pass while testing a few hundred cases.
			expect(inputs.size).toBeGreaterThanOrEqual(rounds * 0.9);
			expect(mismatches).toEqual([]);
		});

		// Testing the pattern at each boundary would rescan the leading run behind it, which is
		// quadratic in these. Compared as booleans, so a failure never prints the value.
		it.each([
			["a million LFs", "\n".repeat(1_000_000), `"'${"\n".repeat(1_000_000)}"`],
			['a million ", "', `${", ".repeat(1_000_000)}=1`, `"${", ".repeat(999_999)},' =1"`],
			["a million TABs and '='", `${"\t".repeat(1_000_000)}=`, `"${"'\t".repeat(1_000_000)}'="`],
			[
				"a million U+2028 and '='",
				`${"\u2028".repeat(1_000_000)}=`,
				`${"'\u2028".repeat(1_000_000)}'=`,
			],
			[
				"a million U+FDFA behind commas",
				`${",\ufdfa".repeat(1_000_000)},=1`,
				`"${",\ufdfa".repeat(1_000_000)},'=1"`,
			],
		])("encodes %s in well under a second", (_label, value, expected) => {
			const started = performance.now();
			const encoded = escapeCsvField(value);
			const elapsed = performance.now() - started;

			expect(encoded === expected).toBe(true);
			expect(elapsed).toBeLessThan(1_000);
		});

		// After a boundary too, only a short head is normalized. Normalizing the rest of this
		// value would need a string longer than V8 allows.
		it("normalizes only a short head after a boundary in a large value", () => {
			const tail = "\ufdfa".repeat(30_000_000);

			expect(escapeCsvField(`x,\ufe66=1,${tail}`) === `"x,'\ufe66=1,${tail}"`).toBe(true);
		});

		it("removes NUL, which no CSV reader accepts", () => {
			expect(escapeCsvField(`a${NUL}b`)).toBe("ab");
		});

		it.each([
			[null, ""],
			[undefined, ""],
			["", ""],
		])("returns an empty string for %o", (input, expected) => {
			expect(escapeCsvField(input)).toBe(expected);
		});
	});

	describe("encodeJsonForScript", () => {
		const BREAKOUT = { user: "</script><script>window.PWNED=1</script>" };

		it("escapes the sequence that closes a script element from inside a string", () => {
			expect(encodeJsonForScript(BREAKOUT)).not.toContain("</script>");
			expect(encodeJsonForScript(BREAKOUT)).toContain("\\u003c");
		});

		it.each([
			{ a: 1 },
			[],
			"plain string",
			0,
			null,
			true,
			{ nested: { deep: ["x", "</script>"] } },
			{ emoji: "\u{1f389}" },
			{ cjk: "\u4e16\u754c" },
			{ separators: "a\u2028b\u2029c" },
			{ amp: "a&b", lt: "a<b", gt: "a>b" },
			{ quote: 'he said "hi"', backslash: "C:\\x" },
		])("round-trips %o through JSON.parse", (value) => {
			expect(JSON.parse(encodeJsonForScript(value))).toEqual(value);
		});

		it.each([{ a: "<" }, { a: ">" }, { a: "&" }, { a: "\u2028" }, { a: "\u2029" }])(
			"leaves no raw breakout character for %o",
			(value) => {
				expect(encodeJsonForScript(value)).not.toMatch(/[<>&\u2028\u2029]/);
			},
		);

		// A sentinel string would emit a syntax error into the page, which is worse than
		// an error the caller can see.
		it.each([
			["undefined", undefined],
			["a function", () => 1],
			["a symbol", Symbol("x")],
			["a bigint", 10n],
		])("throws on %s rather than returning a non-string", (_label, value) => {
			expect(() => encodeJsonForScript(value)).toThrow(TypeError);
		});

		it("throws on a circular structure", () => {
			const circular: Record<string, unknown> = {};
			circular.self = circular;
			expect(() => encodeJsonForScript(circular)).toThrow(TypeError);
		});
	});
});
