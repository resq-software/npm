/**
 * Copyright 2026 ResQ
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
import {
	containsCommandInjection,
	containsHomoglyphs,
	containsNoSQLInjection,
	containsPathTraversal,
	containsSQLInjection,
	containsXSSPatterns,
	detectThreatPatterns,
	getThreatErrorMessage,
	isSafeInput,
	normalizeUnicode,
	sanitizeForDisplay,
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
		const result = containsXSSPatterns('<img onerror=alert(1)>');
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

	it("should detect __proto__ pollution", () => {
		const result = containsXSSPatterns("__proto__");
		expect(result.length).toBeGreaterThan(0);
	});

	it("should return empty array for safe input", () => {
		expect(containsXSSPatterns("Hello, world!")).toEqual([]);
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
		const result = containsNoSQLInjection('{ $ne: null }');
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
		expect(validateSafeEmail('<script>@example.com')).toBe(false);
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
