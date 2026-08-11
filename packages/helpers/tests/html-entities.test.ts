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

import { describe, expect, test } from "vitest";
import { obfuscateLink } from "../src/browser/html-entities.js";

describe("obfuscateLink", () => {
	describe("mailto scheme", () => {
		test("returns encoded text matching the address when no text is provided", () => {
			const result = obfuscateLink({ scheme: "mailto", address: "a@b.c" });
			expect(result.encodedText).toBe("&#97;&#64;&#98;&#46;&#99;");
		});

		test("builds a mailto href without params", () => {
			const result = obfuscateLink({ scheme: "mailto", address: "jane@example.com" });
			expect(result.href).toBe("mailto:jane@example.com");
		});

		test("appends query params to the mailto href", () => {
			const result = obfuscateLink({
				scheme: "mailto",
				address: "jane@example.com",
				params: { subject: "Hello World", body: "Hi there" },
			});
			expect(result.href).toBe("mailto:jane@example.com?subject=Hello%20World&body=Hi%20there");
		});

		test("uses custom text when provided", () => {
			const result = obfuscateLink({
				scheme: "mailto",
				address: "jane@example.com",
				text: "Contact",
			});
			// "Contact" => &#67;&#111;&#110;&#116;&#97;&#99;&#116;
			expect(result.encodedText).toBe("&#67;&#111;&#110;&#116;&#97;&#99;&#116;");
		});

		test("ignores empty params object", () => {
			const result = obfuscateLink({
				scheme: "mailto",
				address: "x@y.z",
				params: {},
			});
			expect(result.href).toBe("mailto:x@y.z");
		});
	});

	describe("tel scheme", () => {
		test("builds a tel href", () => {
			const result = obfuscateLink({ scheme: "tel", address: "+15551234567" });
			expect(result.href).toBe("tel:+15551234567");
		});

		test("encodes the phone number as entities when no text is provided", () => {
			const result = obfuscateLink({ scheme: "tel", address: "123" });
			expect(result.encodedText).toBe("&#49;&#50;&#51;");
		});

		test("uses custom display text for tel links", () => {
			const result = obfuscateLink({
				scheme: "tel",
				address: "+15551234567",
				text: "Call us",
			});
			expect(result.encodedText).toContain("&#67;"); // 'C'
			expect(result.href).toBe("tel:+15551234567");
		});
	});

	describe("edge cases", () => {
		test("handles empty address", () => {
			const result = obfuscateLink({ scheme: "mailto", address: "" });
			expect(result.href).toBe("mailto:");
			expect(result.encodedText).toBe("");
		});

		test("handles special characters in params", () => {
			const result = obfuscateLink({
				scheme: "mailto",
				address: "a@b.c",
				params: { subject: "a&b=c" },
			});
			expect(result.href).toContain("subject=a%26b%3Dc");
		});

		test("encodes unicode text to decimal entities", () => {
			const result = obfuscateLink({
				scheme: "mailto",
				address: "test@test.com",
				text: "\u00e9", // é
			});
			expect(result.encodedText).toBe("&#233;");
		});

		test("handles single-character address", () => {
			const result = obfuscateLink({ scheme: "mailto", address: "x" });
			expect(result.encodedText).toBe("&#120;");
			expect(result.href).toBe("mailto:x");
		});

		test("handles multiple params", () => {
			const result = obfuscateLink({
				scheme: "mailto",
				address: "a@b.c",
				params: { cc: "d@e.f", bcc: "g@h.i" },
			});
			expect(result.href).toContain("cc=d%40e.f");
			expect(result.href).toContain("bcc=g%40h.i");
			expect(result.href).toContain("&");
		});
	});

	describe("raw href vs encoded text distinction", () => {
		test("href is a raw URI while encodedText is entity-encoded", () => {
			const result = obfuscateLink({
				scheme: "mailto",
				address: "jane@example.com",
			});
			// href must be the literal, un-encoded URI the browser needs.
			expect(result.href).toBe("mailto:jane@example.com");
			expect(result.href).not.toContain("&#");
			// encodedText must be fully entity-encoded (no literal '@').
			expect(result.encodedText).toContain("&#");
			expect(result.encodedText).not.toContain("@");
		});

		test("encodedText remains a plain string at runtime (brand is compile-time only)", () => {
			const result = obfuscateLink({ scheme: "tel", address: "5" });
			expect(typeof result.encodedText).toBe("string");
			expect(result.encodedText).toBe("&#53;");
		});
	});

	// The `scheme: "mailto" | "tel"` union guards the ordinary case at compile time
	// but not the ones that matter: `obfuscateLink({ ...JSON.parse(config) })` type-
	// checks clean because `JSON.parse` returns `any`, and this package is published,
	// so plain-JS consumers get no enforcement at all. Every documented usage puts
	// the returned `href` straight into an anchor.
	describe("input validation", () => {
		const call = (opts: unknown) => () =>
			// biome-ignore lint/suspicious/noExplicitAny: reproduces what an untyped caller reaches this with.
			obfuscateLink(opts as any);

		test.each(["javascript", "data", "vbscript", "file", "http", "JAVASCRIPT", ""])(
			"rejects the %o scheme",
			(scheme) => {
				expect(call({ scheme, address: "alert(1)" })).toThrow(TypeError);
			},
		);

		test.each([null, undefined, 0, {}])("rejects a %o scheme", (scheme) => {
			expect(call({ scheme, address: "a@b.c" })).toThrow(TypeError);
		});

		test.each([
			["a double quote, which closes the href attribute", 'x@y.com" onmouseover="alert(1)'],
			["a single quote, which closes a single-quoted href", "x@y.com' onfocus='alert(1)"],
			["an angle bracket, which opens a tag", "x@y.com<script>"],
			["a carriage return, which injects a mailto header", "x@y.com\r\nBcc: victim@example.com"],
			["a bare newline", "x@y.com\nSubject: spam"],
			["a NUL byte", "x@y.com\0evil"],
			["a backslash", "x@y.com\\"],
			["a semicolon", "x@y.com;evil"],
		])("rejects an address containing %s", (_label, address) => {
			expect(call({ scheme: "mailto", address })).toThrow(TypeError);
		});

		test.each([null, undefined, 42, {}, ["a@b.c"]])(
			"rejects a non-string address (%o)",
			(address) => {
				expect(call({ scheme: "mailto", address })).toThrow(TypeError);
			},
		);

		test("rejects an address beyond the 320-character ceiling", () => {
			const local = "a".repeat(310);
			expect(call({ scheme: "mailto", address: `${local}@example.com` })).toThrow(TypeError);
		});

		test.each([
			["a plain mailbox", "mailto", "jane.doe@example.com"],
			["a tagged mailbox", "mailto", "jane+tag@example.co.uk"],
			["an internationalized mailbox", "mailto", "josé@münchen.example"],
			["a formatted phone number", "tel", "+1 (555) 010-4477"],
			["a bare extension", "tel", "4477"],
		])("still accepts %s", (_label, scheme, address) => {
			expect(call({ scheme, address })).not.toThrow();
		});
	});
});
