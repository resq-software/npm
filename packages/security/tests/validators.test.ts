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
		/** RFC 4180 reader, so these assert a round trip rather than a golden string. */
		const parseCsvRow = (row: string, delimiter = ","): string[] => {
			const out: string[] = [];
			let field = "";
			let index = 0;
			let quoted = false;
			while (index < row.length) {
				const char = row[index];
				if (quoted) {
					if (char === '"') {
						if (row[index + 1] === '"') {
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
					out.push(field);
					field = "";
					index++;
					continue;
				}
				field += char;
				index++;
			}
			out.push(field);
			return out;
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
			expect(inner).not.toMatch(/^[=+\-@\t\r]/);
		});

		// A leading apostrophe and a position-independent DDE rule mean the encoded value
		// still scans dirty. That is correct: the rules describe the value, the encoder
		// protects the file. Asserting a clean scan would force both rules to be weakened.
		it("still scans as a finding, because the rules describe the value not the file", () => {
			const encoded = escapeCsvField("=SUM(1)");
			const result = scanForThreats(encoded, { contexts: ["spreadsheet"] });
			expect(result.findings.length).toBeGreaterThan(0);
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
		])("quotes and recovers a field containing %s", (_label, value) => {
			expect(parseCsvRow(escapeCsvField(value))[0]).toBe(value);
		});

		// Numbers come from the application's own types and cannot carry a formula, so
		// prefixing them would turn every negative value in a sheet into text.
		it("prefixes a numeric string but not a number", () => {
			expect(escapeCsvField(-1234)).toBe("-1234");
			expect(escapeCsvField("-1234")).toBe("'-1234");
		});

		it("quotes on the configured delimiter, not on a comma", () => {
			expect(toCsvRow(["a;b"], { delimiter: ";" })).toBe('"a;b"');
			expect(toCsvRow(["a,b"], { delimiter: ";" })).toBe("a,b");
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
