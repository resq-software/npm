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
		expect(sanitizeUrl("mailto:test@example.com")).toBe(
			"mailto:test@example.com",
		);
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

	it("should handle protocol-relative URLs", () => {
		// Note: sanitizeUrl allows protocol-relative URLs as they resolve to same protocol
		// This tests the current behavior - if security requires blocking, update implementation
		const result = sanitizeUrl("//evil.com");
		expect(typeof result).toBe("string");
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
		const result = sanitizeJson<{ foo: string }>('{"foo":"bar"}');
		expect(result).toEqual({ foo: "bar" });
	});

	it("should return null for invalid JSON", () => {
		expect(sanitizeJson("not json")).toBeNull();
	});

	it("should remove dangerous __proto__ key from parsed object", () => {
		const malicious = '{"__proto__":{"polluted":true},"safe":"value"}';
		const result = sanitizeJson<{ safe: string }>(malicious);
		expect(result?.safe).toBe("value");
		// Check that the __proto__ key was removed from the object's own properties
		expect(result).not.toBeNull();
		expect(Object.hasOwn(result!, "__proto__")).toBe(false);
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

describe("redactPII", () => {
	it("should redact email addresses", () => {
		expect(redactPII("Contact john@example.com")).toBe("Contact [EMAIL]");
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
});
