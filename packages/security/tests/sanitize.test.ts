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

import { afterEach, describe, expect, it } from "vitest";
import {
	escapeHtml,
	isValidEmail,
	isValidPhone,
	isValidSSN,
	isValidUrl,
	redactPII,
	safeStringify,
	sanitizeJson,
	sanitizeUrl,
	stripAnsi,
	validateUserInput,
	sanitizeHtml,
} from "../src/sanitize.js";

describe("escapeHtml", () => {
	it("should escape HTML special characters", () => {
		const result = escapeHtml('<script>alert("xss")</script>');
		expect(result).toBe("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;");
	});

	it("should escape ampersands", () => {
		expect(escapeHtml("foo & bar")).toBe("foo &amp; bar");
	});

	it("should escape single quotes", () => {
		expect(escapeHtml("it's")).toBe("it&#039;s");
	});

	it("should return empty string for null/undefined", () => {
		expect(escapeHtml(null as unknown as string)).toBe("");
		expect(escapeHtml(undefined as unknown as string)).toBe("");
	});

	it("should return empty string for non-string input", () => {
		expect(escapeHtml(123 as unknown as string)).toBe("");
	});

	it("should handle empty string", () => {
		expect(escapeHtml("")).toBe("");
	});
});

describe("sanitizeUrl", () => {
	it("should allow valid https URLs", () => {
		expect(sanitizeUrl("https://example.com")).toBe("https://example.com");
	});

	it("should allow valid http URLs", () => {
		expect(sanitizeUrl("http://example.com")).toBe("http://example.com");
	});

	it("should allow mailto URLs", () => {
		expect(sanitizeUrl("mailto:test@example.com")).toBe("mailto:test@example.com");
	});

	it("should reject javascript: URLs", () => {
		expect(sanitizeUrl("javascript:alert(1)")).toBe("");
	});

	it("should reject data: URLs", () => {
		expect(sanitizeUrl("data:text/html,<script>alert(1)</script>")).toBe("");
	});

	it("should allow relative URLs", () => {
		expect(sanitizeUrl("/path/to/page")).toBe("/path/to/page");
	});

	// Regression: this assertion previously checked only `typeof result === "string"`,
	// which is vacuously true whether the URL is rejected or passed straight through.
	// It passed while `sanitizeUrl("//evil.com")` returned the value unchanged — and
	// `//evil.com` resolved against a trusted base yields host `evil.com`.
	it("should reject protocol-relative URLs, which name a different host", () => {
		expect(sanitizeUrl("//evil.example")).toBe("");
		expect(sanitizeUrl("///evil.example")).toBe("");
		expect(sanitizeUrl("//evil.example/path?a=1")).toBe("");
	});

	it("should reject backslash forms, which the URL parser treats as slashes", () => {
		expect(sanitizeUrl("/\\evil.example")).toBe("");
		expect(sanitizeUrl("\\\\evil.example")).toBe("");
	});

	it("should not let an authority-opening reference bypass the protocol allowlist", () => {
		// The allowlist rejects a legitimate https URL here, so accepting `//evil` would
		// be strictly worse than the explicit case it exists to gate.
		expect(sanitizeUrl("//evil.example", ["mailto:"])).toBe("");
		expect(sanitizeUrl("https://ok.example", ["mailto:"])).toBe("");
	});

	it("should still accept ordinary root-relative and absolute URLs", () => {
		expect(sanitizeUrl("/foo")).toBe("/foo");
		expect(sanitizeUrl("/a/b?c=1")).toBe("/a/b?c=1");
		expect(sanitizeUrl("https://ok.example")).toBe("https://ok.example");
		expect(sanitizeUrl("mailto:a@b.example")).toBe("mailto:a@b.example");
	});
});

describe("validateUserInput", () => {
	it("should trim whitespace by default", () => {
		expect(validateUserInput("  hello  ")).toBe("hello");
	});

	it("should strip HTML tags by default", () => {
		expect(validateUserInput("<p>Hello</p>")).toBe("Hello");
	});

	it("should strip HTML tags including script tags", () => {
		// Note: validateUserInput strips tags but keeps text content
		const result = validateUserInput("<script>alert(1)</script>test");
		expect(result).toBe("alert(1)test");
	});

	it("should truncate to max length", () => {
		const result = validateUserInput("hello world", 5);
		expect(result).toBe("hello");
	});

	it("should remove javascript: patterns", () => {
		expect(validateUserInput("javascript:alert(1)")).toBe("alert(1)");
	});

	it("should normalize whitespace", () => {
		expect(validateUserInput("hello     world")).toBe("hello world");
	});

	it("should return empty string for null/undefined", () => {
		expect(validateUserInput(null as unknown as string)).toBe("");
		expect(validateUserInput(undefined as unknown as string)).toBe("");
	});
});

describe("sanitizeJson", () => {
	it("should parse valid JSON", () => {
		const result = sanitizeJson('{"foo":"bar"}');
		expect(result).toEqual({ foo: "bar" });
	});

	it("should return null for invalid JSON", () => {
		expect(sanitizeJson("not json")).toBeNull();
	});

	it("should remove dangerous __proto__ key from parsed object", () => {
		const malicious = '{"__proto__":{"polluted":true},"safe":"value"}';
		const result = sanitizeJson(malicious) as { safe: string } | null;
		expect(result?.safe).toBe("value");
		// Check that the __proto__ key was removed from the object's own properties
		expect(result).not.toBeNull();
		expect(Object.hasOwn(result!, "__proto__")).toBe(false);
	});

	it("should recursively remove dangerous prototype pollution keys", () => {
		const malicious =
			'{"nested":{"__proto__":{"polluted":true},"constructor":{"prototype":{"foo":"bar"}},"safe":"value"},"array":[{"__proto__":{"a":1}}]}';
		const result = sanitizeJson(malicious) as {
			nested: { safe: string };
			array: Array<Record<string, unknown>>;
		} | null;
		expect(result).not.toBeNull();
		expect(result!.nested.safe).toBe("value");
		expect(Object.hasOwn(result!.nested, "__proto__")).toBe(false);
		expect(Object.hasOwn(result!.nested, "constructor")).toBe(false);
		expect(Object.hasOwn(result!.array[0], "__proto__")).toBe(false);
	});

	it("should return null for empty input", () => {
		expect(sanitizeJson("")).toBeNull();
		expect(sanitizeJson(null as unknown as string)).toBeNull();
	});
});

describe("stripAnsi", () => {
	it("should remove ANSI color codes", () => {
		expect(stripAnsi("\x1b[31mRed text\x1b[0m")).toBe("Red text");
	});

	it("should handle text without ANSI codes", () => {
		expect(stripAnsi("plain text")).toBe("plain text");
	});

	it("should return empty string for null/undefined", () => {
		expect(stripAnsi(null as unknown as string)).toBe("");
		expect(stripAnsi(undefined as unknown as string)).toBe("");
	});
});

describe("sanitizeJson prototype-pollution depth", () => {
	/** `{"a":{"a":...{"__proto__":{"isAdmin":true}}...}}` nested `depth` levels. */
	const nested = (depth: number): string => {
		let json = `{"__proto__":{"isAdmin":true}}`;
		for (let i = 0; i < depth; i++) json = `{"a":${json}}`;
		return json;
	};

	const deepestLeaf = (value: unknown): Record<string, unknown> => {
		let current = value;
		while (current !== null && typeof current === "object" && "a" in current) {
			current = (current as Record<string, unknown>).a;
		}
		return current as Record<string, unknown>;
	};

	afterEach(() => {
		delete (Object.prototype as Record<string, unknown>).isAdmin;
	});

	// The walk used to recurse with a depth cap of 50 and return early past it, so
	// 51 wrapper levels carried the payload through the function whose whole purpose
	// is to remove it. 50 and 51 bracket that former cutover exactly.
	it.each([0, 10, 49, 50, 51, 60, 500])("strips __proto__ nested %i levels deep", (depth) => {
		const leaf = deepestLeaf(sanitizeJson(nested(depth)));
		expect(Object.hasOwn(leaf, "__proto__")).toBe(false);
	});

	// The key surviving is only interesting because of what an application then does
	// with it: an ordinary recursive merge reaches the prototype.
	it("leaves a leaf that cannot pollute a prototype through a deep merge", () => {
		const merge = (target: Record<string, unknown>, source: Record<string, unknown>) => {
			for (const key of Object.keys(source)) {
				const value = source[key];
				if (value !== null && typeof value === "object" && !Array.isArray(value)) {
					if (typeof target[key] !== "object" || target[key] === null) target[key] = {};
					merge(target[key] as Record<string, unknown>, value as Record<string, unknown>);
				} else {
					target[key] = value;
				}
			}
		};

		merge({}, deepestLeaf(sanitizeJson(nested(60))));

		expect(({} as Record<string, unknown>).isAdmin).toBeUndefined();
	});

	// The cap existed to keep the recursion off the call stack. An explicit stack
	// removes the need for it, so depth that would once have overflowed now completes.
	it("handles nesting far beyond any call-stack limit", () => {
		expect(Object.hasOwn(deepestLeaf(sanitizeJson(nested(100_000))), "__proto__")).toBe(false);
	});
});

describe("stripAnsi beyond colour codes", () => {
	const ESC = String.fromCharCode(27);
	const BEL = String.fromCharCode(7);

	// The pattern used to be /\x1b\[[0-9;]*m/ — SGR only. Everything below survived
	// the function that LOG-ANSI-ESCAPE-001 names as its control, and cursor movement
	// and screen erasure are the sequences that actually rewrite an audit trail.
	it.each([
		["erase display", `${ESC}[2Jcleared`, "cleared"],
		["cursor up", `${ESC}[5Aoverwritten`, "overwritten"],
		["alternate screen buffer", `${ESC}[?1049h`, ""],
		["OSC window title, BEL-terminated", `${ESC}]0;pwned${BEL}tail`, "tail"],
		["OSC window title, ST-terminated", `${ESC}]0;pwned${ESC}\\tail`, "tail"],
		["Fs escape (RIS)", `${ESC}creset`, "reset"],
		["trailing bare ESC", `a${ESC}`, "a"],
		["SGR colour, the one case already handled", `${ESC}[31mred${ESC}[0m`, "red"],
	])("removes %s", (_label, input, expected) => {
		expect(stripAnsi(input)).toBe(expected);
	});

	it("leaves text with no escape sequences untouched", () => {
		expect(stripAnsi("héllo 世界 — no escapes")).toBe("héllo 世界 — no escapes");
	});

	// A bounded, non-nested pattern has nothing to backtrack over.
	it("stays linear on input built to force backtracking", () => {
		const started = performance.now();
		stripAnsi(ESC + "[".repeat(1_000_000));
		expect(performance.now() - started).toBeLessThan(1_000);
	});
});

describe("redactPII", () => {
	it("should redact email addresses", () => {
		expect(redactPII("Contact john@example.com")).toBe("Contact [EMAIL]");
	});

	it("should redact email addresses with Punycode/IDN TLDs", () => {
		expect(redactPII("Contact user@example.xn--p1ai")).toBe("Contact [EMAIL]");
	});

	it("should redact phone numbers", () => {
		expect(redactPII("Call 555-123-4567")).toBe("Call [PHONE]");
	});

	it("should redact SSNs", () => {
		expect(redactPII("SSN: 123-45-6789")).toBe("SSN: [SSN]");
	});

	it("should redact credit card numbers", () => {
		expect(redactPII("Card: 4111-1111-1111-1111")).toBe("Card: [CREDIT_CARD]");
	});

	it("should redact IP addresses", () => {
		expect(redactPII("IP: 192.168.1.1")).toBe("IP: [IP_ADDRESS]");
	});

	it("should allow selective redaction", () => {
		const result = redactPII("john@example.com 555-123-4567", {
			redactEmails: true,
			redactPhones: false,
		});
		expect(result).toContain("[EMAIL]");
		expect(result).toContain("555-123-4567");
	});

	it("should return empty string for null/undefined", () => {
		expect(redactPII(null as unknown as string)).toBe("");
	});
});

describe("safeStringify", () => {
	it("should stringify objects normally", () => {
		const result = safeStringify({ user: "john" });
		expect(result).toContain('"user"');
		expect(result).toContain('"john"');
	});

	it("should redact password fields", () => {
		const result = safeStringify({ user: "john", password: "secret" });
		expect(result).toContain('"[REDACTED]"');
		expect(result).not.toContain('"secret"');
	});

	it("should redact token fields", () => {
		const result = safeStringify({ token: "abc123" });
		expect(result).toContain('"[REDACTED]"');
	});

	it("should handle circular references gracefully", () => {
		const obj: Record<string, unknown> = { a: 1 };
		obj.self = obj;
		const result = safeStringify(obj);
		expect(result).toBe("[Unable to stringify object]");
	});
});

describe("Validation helpers", () => {
	describe("isValidEmail", () => {
		it("should validate correct emails", () => {
			expect(isValidEmail("test@example.com")).toBe(true);
			expect(isValidEmail("user.name@domain.org")).toBe(true);
		});

		it("should accept Punycode/IDN TLDs", () => {
			expect(isValidEmail("user@example.xn--p1ai")).toBe(true);
		});

		it("should reject invalid emails", () => {
			expect(isValidEmail("invalid")).toBe(false);
			expect(isValidEmail("@example.com")).toBe(false);
			expect(isValidEmail("test@")).toBe(false);
		});
	});

	describe("isValidPhone", () => {
		it("should validate US phone numbers", () => {
			expect(isValidPhone("555-123-4567")).toBe(true);
			expect(isValidPhone("(555) 123-4567")).toBe(true);
			expect(isValidPhone("+1 555-123-4567")).toBe(true);
		});

		it("should reject invalid phone numbers", () => {
			expect(isValidPhone("123")).toBe(false);
			expect(isValidPhone("not a phone")).toBe(false);
		});
	});

	describe("isValidSSN", () => {
		it("should validate SSN format", () => {
			expect(isValidSSN("123-45-6789")).toBe(true);
			expect(isValidSSN("123 45 6789")).toBe(true);
			expect(isValidSSN("123456789")).toBe(true);
		});

		it("should reject invalid SSNs", () => {
			expect(isValidSSN("123")).toBe(false);
			expect(isValidSSN("abc-de-fghi")).toBe(false);
		});
	});

	describe("isValidUrl", () => {
		it("should validate safe URLs", () => {
			expect(isValidUrl("https://example.com")).toBe(true);
			expect(isValidUrl("/relative/path")).toBe(true);
		});

		it("should reject unsafe URLs", () => {
			expect(isValidUrl("javascript:alert(1)")).toBe(false);
		});
	});

	describe("sanitizeHtml", () => {
		it("should remove XSS vectors using DOMPurify (or fallback to escaping)", () => {
			const dirty = '<script>alert("xss")</script><p>hello</p>';
			const clean = sanitizeHtml(dirty);
			expect(clean).not.toContain("<script>");
		});

		it("should preserve safe HTML if allowHtml is used in validateUserInput", () => {
			const input = "<p>hello <script>alert(1)</script>world</p>";
			const clean = validateUserInput(input, 500, true);
			expect(clean).not.toContain("<script>");
			expect(clean).toContain("hello");
			expect(clean).toContain("world");
		});
	});
});
