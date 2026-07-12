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
import {
	getRequestId,
	isRequestId,
	sanitizeRequestId,
	shouldRedirectToHttps,
} from "../src/security.js";

// ------------------------------------------------------------------
// shouldRedirectToHttps
// ------------------------------------------------------------------

describe("shouldRedirectToHttps", () => {
	it("returns null in development environment", () => {
		const result = shouldRedirectToHttps("http", "http://example.com", {}, "development");
		expect(result).toBeNull();
	});

	it("returns null in test environment", () => {
		const result = shouldRedirectToHttps("http", "http://example.com", {}, "test");
		expect(result).toBeNull();
	});

	it("returns null when protocol is https in production", () => {
		const result = shouldRedirectToHttps("https", "https://example.com/path", {}, "production");
		expect(result).toBeNull();
	});

	it("returns null when x-forwarded-proto is https", () => {
		const result = shouldRedirectToHttps(
			"http",
			"http://example.com/path",
			{ "x-forwarded-proto": "https" },
			"production",
		);
		expect(result).toBeNull();
	});

	it("returns null when x-forwarded-ssl is on", () => {
		const result = shouldRedirectToHttps(
			"http",
			"http://example.com/path",
			{ "x-forwarded-ssl": "on" },
			"production",
		);
		expect(result).toBeNull();
	});

	it("returns null when URL starts with https://", () => {
		const result = shouldRedirectToHttps("http", "https://example.com/path", {}, "production");
		expect(result).toBeNull();
	});

	it("returns HTTPS URL when request is insecure in production", () => {
		const result = shouldRedirectToHttps("http", "http://example.com/path", {}, "production");
		expect(result).toBe("https://example.com/path");
	});

	it("preserves path and query string in redirect URL", () => {
		const result = shouldRedirectToHttps(
			"http",
			"http://example.com/api/data?page=1&sort=desc",
			{},
			"production",
		);
		expect(result).toBe("https://example.com/api/data?page=1&sort=desc");
	});

	it("preserves port in redirect URL when present", () => {
		const result = shouldRedirectToHttps("http", "http://example.com:8080/path", {}, "production");
		expect(result).toContain("https:");
		expect(result).toContain("/path");
	});

	it("returns redirect when x-forwarded-proto is http", () => {
		const result = shouldRedirectToHttps(
			"http",
			"http://example.com/",
			{ "x-forwarded-proto": "http" },
			"production",
		);
		expect(result).toBe("https://example.com/");
	});

	it("returns redirect when x-forwarded-ssl is off", () => {
		const result = shouldRedirectToHttps(
			"http",
			"http://example.com/",
			{ "x-forwarded-ssl": "off" },
			"production",
		);
		expect(result).toBe("https://example.com/");
	});

	it("handles undefined header values gracefully", () => {
		const result = shouldRedirectToHttps(
			"http",
			"http://example.com/",
			{ "x-forwarded-proto": undefined, "x-forwarded-ssl": undefined },
			"production",
		);
		expect(result).toBe("https://example.com/");
	});

	it("returns null in staging environment with https protocol", () => {
		const result = shouldRedirectToHttps("https", "https://staging.example.com/", {}, "staging");
		expect(result).toBeNull();
	});

	it("returns redirect in staging environment with http protocol", () => {
		const result = shouldRedirectToHttps("http", "http://staging.example.com/", {}, "staging");
		expect(result).toBe("https://staging.example.com/");
	});
});

// ------------------------------------------------------------------
// getRequestId
// ------------------------------------------------------------------

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("getRequestId", () => {
	it("returns a safe existing ID unchanged (and branded)", () => {
		const id = "req-abc-123";
		const result = getRequestId(id);
		expect(result).toBe(id);
		// The returned value is a branded RequestId: still a string at runtime.
		expect(isRequestId(result)).toBe(true);
	});

	it("strips unsafe characters from a caller-supplied ID", () => {
		// A raw header carrying CRLF/log-injection characters must be sanitized.
		const result = getRequestId("abc\r\n def<script>");
		expect(result).toBe("abcdefscript");
		expect(isRequestId(result)).toBe(true);
	});

	it("generates a UUID when no ID is provided", () => {
		const id = getRequestId();
		expect(id).toBeDefined();
		expect(typeof id).toBe("string");
		// UUID v4 format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
		expect(id).toMatch(UUID_V4);
	});

	it("generates a UUID when undefined is passed", () => {
		const id = getRequestId(undefined);
		expect(id).toMatch(UUID_V4);
	});

	it("generates unique IDs on each call", () => {
		const id1 = getRequestId();
		const id2 = getRequestId();
		expect(id1).not.toBe(id2);
	});

	it("generates a UUID when empty string is passed", () => {
		// Empty string is falsy, so a UUID should be generated
		const id = getRequestId("");
		expect(id).toMatch(UUID_V4);
	});
});

// ------------------------------------------------------------------
// sanitizeRequestId / isRequestId
// ------------------------------------------------------------------

describe("sanitizeRequestId", () => {
	it("passes through an already-safe value", () => {
		const result = sanitizeRequestId("Req_ABC-123");
		expect(result).toBe("Req_ABC-123");
		expect(isRequestId(result)).toBe(true);
	});

	it("strips characters outside [A-Za-z0-9-_]", () => {
		expect(sanitizeRequestId("a b\tc\r\nd")).toBe("abcd");
		expect(sanitizeRequestId("id;with,punct.!@#")).toBe("idwithpunct");
	});

	it("truncates to the 200-character bound", () => {
		const raw = "x".repeat(500);
		const result = sanitizeRequestId(raw);
		expect(result.length).toBe(200);
		expect(isRequestId(result)).toBe(true);
	});

	it("falls back to a UUID when no usable characters remain", () => {
		const result = sanitizeRequestId("<<< >>> !!!");
		expect(result).toMatch(UUID_V4);
	});
});

describe("isRequestId", () => {
	it("accepts safe, bounded strings", () => {
		expect(isRequestId("abc-123_XYZ")).toBe(true);
	});

	it("rejects empty strings and unsafe characters", () => {
		expect(isRequestId("")).toBe(false);
		expect(isRequestId("has space")).toBe(false);
		expect(isRequestId("bad\nid")).toBe(false);
	});

	it("rejects strings longer than the bound", () => {
		expect(isRequestId("a".repeat(201))).toBe(false);
	});
});
