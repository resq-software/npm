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
	analyzeGraphQLRequest,
	checkJsonPayloadLimits,
	assertOutboundUrl,
	classifyAddress,
	isPubliclyRoutableAddress,
	analyzeQueryComplexity,
	resolveRedirectTarget,
	assertUploadType,
	checkCorsResponsePolicy,
	createCsrfToken,
	detectFileSignature,
	isAllowedOrigin,
	normalizeOrigin,
	validateJsonpCallback,
	verifyCsrfToken,
} from "../src/controls/index.js";
import { sanitizeHtml } from "../src/sanitize.js";

/** Synthetic signing secret. Never a real one, even in a test. */
const SECRET = "a".repeat(32);

/** A different secret, for cross-secret forgery attempts. */
const OTHER_SECRET = "b".repeat(32);

/** Build a byte array. */
const bytes = (...values: number[]): Uint8Array => Uint8Array.from(values);

/** Encode text as UTF-8 bytes. */
const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text);

// ============================================
// CORS origin validation (WSTG-CLNT-07)
// ============================================

describe("isAllowedOrigin", () => {
	const ALLOWED = ["https://app.example.com", "https://admin.example.com"];

	it("accepts an exact match", () => {
		expect(isAllowedOrigin("https://app.example.com", ALLOWED)).toBe(true);
	});

	it("accepts case and default-port variations of a match", () => {
		expect(isAllowedOrigin("HTTPS://APP.EXAMPLE.COM", ALLOWED)).toBe(true);
		expect(isAllowedOrigin("https://app.example.com:443", ALLOWED)).toBe(true);
	});

	// The four shortcuts every real-world CORS bypass relies on.
	it("refuses a suffix attack that a prefix match would accept", () => {
		expect(isAllowedOrigin("https://app.example.com.evil.test", ALLOWED)).toBe(false);
	});

	it("refuses a substring attack that an includes() check would accept", () => {
		expect(isAllowedOrigin("https://evil-app.example.com", ALLOWED)).toBe(false);
	});

	it("refuses the null origin", () => {
		expect(isAllowedOrigin("null", ALLOWED)).toBe(false);
	});

	it("refuses a literal wildcard", () => {
		expect(isAllowedOrigin("*", ALLOWED)).toBe(false);
	});

	it("refuses a scheme downgrade", () => {
		expect(isAllowedOrigin("http://app.example.com", ALLOWED)).toBe(false);
	});

	it("refuses a different port", () => {
		expect(isAllowedOrigin("https://app.example.com:8443", ALLOWED)).toBe(false);
	});

	it("refuses userinfo disguising the host", () => {
		expect(isAllowedOrigin("https://app.example.com@evil.test", ALLOWED)).toBe(false);
	});

	it("refuses an origin carrying a path", () => {
		expect(isAllowedOrigin("https://app.example.com/../evil", ALLOWED)).toBe(false);
	});

	it("refuses everything when the allowlist is empty", () => {
		expect(isAllowedOrigin("https://app.example.com", [])).toBe(false);
	});

	it("refuses malformed and empty input", () => {
		expect(isAllowedOrigin("", ALLOWED)).toBe(false);
		expect(isAllowedOrigin("not a url", ALLOWED)).toBe(false);
		expect(isAllowedOrigin(null as unknown as string, ALLOWED)).toBe(false);
	});

	describe("with allowSubdomainsOf", () => {
		const options = { allowSubdomainsOf: ["https://example.com"] };

		it("accepts a genuine subdomain", () => {
			expect(isAllowedOrigin("https://api.example.com", [], options)).toBe(true);
			expect(isAllowedOrigin("https://a.b.example.com", [], options)).toBe(true);
		});

		it("refuses a suffix attack on the parent", () => {
			expect(isAllowedOrigin("https://example.com.evil.test", [], options)).toBe(false);
		});

		it("refuses a sibling that merely ends with the same letters", () => {
			expect(isAllowedOrigin("https://notexample.com", [], options)).toBe(false);
		});

		it("refuses a subdomain on a different scheme or port", () => {
			expect(isAllowedOrigin("http://api.example.com", [], options)).toBe(false);
			expect(isAllowedOrigin("https://api.example.com:8443", [], options)).toBe(false);
		});

		it("does not grant the parent itself — that needs an explicit allowlist entry", () => {
			expect(isAllowedOrigin("https://example.com", [], options)).toBe(false);
		});
	});
});

describe("normalizeOrigin", () => {
	it("canonicalizes scheme, host, and default port", () => {
		expect(normalizeOrigin("HTTPS://Example.COM:443")).toBe("https://example.com");
	});

	it("preserves a non-default port", () => {
		expect(normalizeOrigin("https://example.com:8443")).toBe("https://example.com:8443");
	});

	it("rejects values that are not bare origins", () => {
		expect(normalizeOrigin("https://example.com/path")).toBeNull();
		expect(normalizeOrigin("https://example.com?a=1")).toBeNull();
		expect(normalizeOrigin("https://user:pw@example.com")).toBeNull();
		expect(normalizeOrigin("javascript:alert(1)")).toBeNull();
		expect(normalizeOrigin("null")).toBeNull();
	});
});

describe("checkCorsResponsePolicy", () => {
	it("rejects wildcard with credentials", () => {
		expect(checkCorsResponsePolicy({ allowOrigin: "*", allowCredentials: true })).toContain(
			"cannot be combined",
		);
	});

	it("rejects null origin with credentials", () => {
		expect(checkCorsResponsePolicy({ allowOrigin: "null", allowCredentials: true })).toContain(
			"sandboxed",
		);
	});

	it("allows a wildcard without credentials", () => {
		expect(checkCorsResponsePolicy({ allowOrigin: "*", allowCredentials: false })).toBeNull();
	});

	it("allows a named origin with credentials", () => {
		expect(
			checkCorsResponsePolicy({
				allowOrigin: "https://app.example.com",
				allowCredentials: true,
			}),
		).toBeNull();
	});
});

// ============================================
// CSRF tokens (WSTG-SESS-05)
// ============================================

describe("createCsrfToken / verifyCsrfToken", () => {
	it("accepts a token it just minted", () => {
		const token = createCsrfToken(SECRET, { sessionId: "sess-1" });
		expect(verifyCsrfToken(token, SECRET, { sessionId: "sess-1" })).toEqual({ valid: true });
	});

	it("mints a distinct token every time", () => {
		const tokens = new Set(Array.from({ length: 200 }, () => createCsrfToken(SECRET)));
		expect(tokens.size).toBe(200);
	});

	it("rejects a token bound to a different session", () => {
		const token = createCsrfToken(SECRET, { sessionId: "sess-1" });
		expect(verifyCsrfToken(token, SECRET, { sessionId: "sess-2" })).toEqual({
			valid: false,
			reason: "signature_mismatch",
		});
	});

	it("rejects a session-bound token verified without a session", () => {
		const token = createCsrfToken(SECRET, { sessionId: "sess-1" });
		expect(verifyCsrfToken(token, SECRET).valid).toBe(false);
	});

	it("rejects a token signed with a different secret", () => {
		const token = createCsrfToken(OTHER_SECRET, { sessionId: "sess-1" });
		expect(verifyCsrfToken(token, SECRET, { sessionId: "sess-1" }).valid).toBe(false);
	});

	it("rejects a tampered signature", () => {
		const token = createCsrfToken(SECRET);
		expect(verifyCsrfToken(`${token.slice(0, -2)}XY`, SECRET).valid).toBe(false);
	});

	it("rejects an extended expiry, because the expiry is signed", () => {
		const token = createCsrfToken(SECRET);
		const [nonce, , signature] = token.split(".");
		expect(verifyCsrfToken([nonce, "zzzzzzzz", signature].join("."), SECRET)).toEqual({
			valid: false,
			reason: "signature_mismatch",
		});
	});

	it("resists a field-boundary shift, because each field is length-prefixed", () => {
		// Without length prefixing, a different (nonce, expiry, sessionId) split could
		// produce the same HMAC input.
		const token = createCsrfToken(SECRET, { sessionId: "ab" });
		expect(verifyCsrfToken(token, SECRET, { sessionId: "a" }).valid).toBe(false);
	});

	it("rejects an expired token", async () => {
		const token = createCsrfToken(SECRET, { ttlMs: 1 });
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(verifyCsrfToken(token, SECRET)).toEqual({ valid: false, reason: "expired" });
	});

	it("reports structural failures distinctly", () => {
		expect(verifyCsrfToken("", SECRET).valid).toBe(false);
		expect(verifyCsrfToken(undefined, SECRET)).toEqual({
			valid: false,
			reason: "missing_token",
		});
		expect(verifyCsrfToken("a.b", SECRET)).toEqual({ valid: false, reason: "malformed" });
		expect(verifyCsrfToken("a..c", SECRET)).toEqual({ valid: false, reason: "malformed" });
		expect(verifyCsrfToken(createCsrfToken(SECRET), "")).toEqual({
			valid: false,
			reason: "missing_secret",
		});
	});

	it("refuses to mint without a secret or with a nonsensical lifetime", () => {
		expect(() => createCsrfToken("")).toThrow(TypeError);
		expect(() => createCsrfToken(SECRET, { ttlMs: 0 })).toThrow(TypeError);
		expect(() => createCsrfToken(SECRET, { ttlMs: Number.NaN })).toThrow(TypeError);
	});

	// Regression: a fractional ttl rendered through toString(36) with a fractional
	// tail, injecting the field separator and producing a 4-part token that this
	// module's own verifier rejected as malformed.
	it("refuses a fractional lifetime, which would inject the field separator", () => {
		expect(() => createCsrfToken(SECRET, { ttlMs: 1500.5 })).toThrow(TypeError);
		expect(() => createCsrfToken(SECRET, { ttlMs: 0.5 })).toThrow(TypeError);
	});

	// Regression, and the most serious defect found in review: template-stringifying a
	// non-string collapsed every object session to the constant "[object Object]", so
	// ONE attacker-minted token verified `{valid: true}` against every victim session.
	// A silent fail-open whose round-trip test passes, which is worse than no control.
	describe("non-string and ill-formed session identifiers", () => {
		it("refuses to mint against an object, array, or Map session", () => {
			expect(() => createCsrfToken(SECRET, { sessionId: {} as never })).toThrow(TypeError);
			expect(() => createCsrfToken(SECRET, { sessionId: ["a"] as never })).toThrow(TypeError);
			expect(() => createCsrfToken(SECRET, { sessionId: new Map() as never })).toThrow(TypeError);
			expect(() => createCsrfToken(SECRET, { sessionId: 1001 as never })).toThrow(TypeError);
		});

		it("refuses to verify against a non-string session rather than accepting it", () => {
			const token = createCsrfToken(SECRET, { sessionId: "sess-1" });
			expect(verifyCsrfToken(token, SECRET, { sessionId: { sid: "victim" } as never })).toEqual({
				valid: false,
				reason: "malformed",
			});
			expect(verifyCsrfToken(token, SECRET, { sessionId: {} as never }).valid).toBe(false);
		});

		it("refuses an unpaired surrogate, which UTF-8 encoding would make non-injective", () => {
			// `"tenant-\uD800"` and `"tenant-�"` are distinct JS strings that encode
			// to identical UTF-8 bytes, so a token bound to one verified for the other.
			expect(() => createCsrfToken(SECRET, { sessionId: "tenant-\uD800" })).toThrow(TypeError);
			expect(() => createCsrfToken(SECRET, { sessionId: "\uDC00" })).toThrow(TypeError);

			const token = createCsrfToken(SECRET, { sessionId: "tenant-a" });
			expect(verifyCsrfToken(token, SECRET, { sessionId: "\uD800" })).toEqual({
				valid: false,
				reason: "malformed",
			});
		});

		it("still accepts well-formed astral characters", () => {
			const session = "tenant-\u{1F600}";
			const token = createCsrfToken(SECRET, { sessionId: session });
			expect(verifyCsrfToken(token, SECRET, { sessionId: session }).valid).toBe(true);
		});

		it("keeps null and undefined meaning unbound", () => {
			const token = createCsrfToken(SECRET);
			expect(verifyCsrfToken(token, SECRET, { sessionId: undefined }).valid).toBe(true);
			expect(verifyCsrfToken(token, SECRET, { sessionId: null as never }).valid).toBe(true);
		});
	});
});

// ============================================
// Upload type agreement (WSTG-BUSL-08 / BUSL-09)
// ============================================

const PNG_HEAD = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00);
const JPEG_HEAD = bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46);
const GIF_HEAD = bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);
const ZIP_HEAD = bytes(0x50, 0x4b, 0x03, 0x04, 0x14, 0x00);
const PDF_HEAD = bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37);

describe("detectFileSignature", () => {
	it("identifies common binary formats", () => {
		expect(detectFileSignature(PNG_HEAD)).toBe("png");
		expect(detectFileSignature(JPEG_HEAD)).toBe("jpeg");
		expect(detectFileSignature(GIF_HEAD)).toBe("gif");
		expect(detectFileSignature(ZIP_HEAD)).toBe("zip");
		expect(detectFileSignature(PDF_HEAD)).toBe("pdf");
	});

	it("identifies a WEBP container by both of its markers", () => {
		const webp = bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50);
		expect(detectFileSignature(webp)).toBe("webp");
		// RIFF without the WEBP marker is a different container entirely.
		const riffOnly = bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x41, 0x56, 0x49, 0x20);
		expect(detectFileSignature(riffOnly)).not.toBe("webp");
	});

	it("classifies SVG and plain text", () => {
		expect(detectFileSignature(utf8('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBe("svg");
		expect(detectFileSignature(utf8('<?xml version="1.0"?><svg></svg>'))).toBe("svg");
		expect(detectFileSignature(utf8("name,email\nalice,a@example.com"))).toBe("text");
	});

	it("classifies PHP source as text, never as an image", () => {
		expect(detectFileSignature(utf8("<?php system($_GET[0]); ?>"))).toBe("text");
	});

	it("returns null for unrecognized binary and empty input", () => {
		expect(detectFileSignature(bytes(0x00, 0x01, 0x02, 0x99, 0xfe))).toBeNull();
		expect(detectFileSignature(bytes())).toBeNull();
	});

	// Regression: the mp4 row matched four bytes at offset 4 and constrained nothing at
	// offset 0, so any content containing `ftyp` at that position was accepted as
	// video. Every other signature pins offset 0; this one pins the ISO-BMFF brand at
	// offset 8 instead.
	describe("ISO-BMFF brand requirement", () => {
		const mp4With = (brandCode: string, leading = [0x00, 0x00, 0x00, 0x20]): Uint8Array =>
			Uint8Array.from([
				...leading,
				0x66,
				0x74,
				0x79,
				0x70,
				...[...brandCode].map((c) => c.charCodeAt(0)),
			]);

		it("accepts genuine ISO-BMFF brands", () => {
			expect(detectFileSignature(mp4With("isom"))).toBe("mp4");
			expect(detectFileSignature(mp4With("mp42"))).toBe("mp4");
			expect(detectFileSignature(mp4With("qt  "))).toBe("mp4");
			expect(detectFileSignature(mp4With("M4A "))).toBe("mp4");
		});

		it("refuses markup and source that merely contain ftyp at offset 4", () => {
			expect(detectFileSignature(utf8("<!--ftyp--><html><script>alert(1)</script>"))).not.toBe(
				"mp4",
			);
			expect(detectFileSignature(utf8("AAAAftyp<?php system($_GET[0]); ?>"))).not.toBe("mp4");
		});

		it("refuses an unknown brand", () => {
			expect(detectFileSignature(mp4With("evil"))).not.toBe("mp4");
		});

		it("never shadows a signature anchored at offset 0", () => {
			// A ZIP whose bytes happen to contain `ftyp` at offset 4 is still a ZIP.
			expect(detectFileSignature(mp4With("isom", [0x50, 0x4b, 0x03, 0x04]))).toBe("zip");
		});

		it("refuses markup as an upload even when mp4 is allowlisted", () => {
			expect(
				assertUploadType({
					declaredType: "video/mp4",
					filename: "clip.mp4",
					headBytes: utf8("<!--ftyp--><html><script>alert(1)</script></html>"),
					allow: ["mp4"],
				}).ok,
			).toBe(false);
		});
	});
});

describe("assertUploadType", () => {
	const allow = ["png", "jpeg"] as const;

	it("accepts a genuine PNG with a matching name and declared type", () => {
		expect(
			assertUploadType({
				declaredType: "image/png",
				filename: "avatar.png",
				headBytes: PNG_HEAD,
				allow: [...allow],
			}),
		).toEqual({ ok: true, type: "png" });
	});

	it("ignores Content-Type parameters and extension casing", () => {
		expect(
			assertUploadType({
				declaredType: "image/png; charset=binary",
				filename: "avatar.PNG",
				headBytes: PNG_HEAD,
				allow: [...allow],
			}).ok,
		).toBe(true);
	});

	it("refuses a double extension whose bytes are not the claimed image", () => {
		// shell.php.jpg — the served extension says JPEG, the bytes say text.
		const verdict = assertUploadType({
			declaredType: "image/jpeg",
			filename: "shell.php.jpg",
			headBytes: utf8("<?php system($_GET[0]); ?>"),
			allow: [...allow],
		});
		expect(verdict.ok).toBe(false);
		expect(verdict).toHaveProperty("reason", "type_not_allowed");
	});

	it("refuses an executable extension on genuine image bytes", () => {
		// avatar.jpg.php — real JPEG bytes, but the served extension is .php.
		const verdict = assertUploadType({
			declaredType: "image/jpeg",
			filename: "avatar.jpg.php",
			headBytes: JPEG_HEAD,
			allow: [...allow],
		});
		expect(verdict.ok).toBe(false);
		expect(verdict).toHaveProperty("reason", "extension_mismatch");
	});

	it("refuses a mismatched declared type", () => {
		expect(
			assertUploadType({
				declaredType: "application/x-httpd-php",
				filename: "avatar.png",
				headBytes: PNG_HEAD,
				allow: [...allow],
			}),
		).toHaveProperty("reason", "declared_type_mismatch");
	});

	it("refuses a type outside the allowlist even when all three agree", () => {
		expect(
			assertUploadType({
				declaredType: "application/pdf",
				filename: "report.pdf",
				headBytes: PDF_HEAD,
				allow: [...allow],
			}),
		).toHaveProperty("reason", "type_not_allowed");
	});

	it("refuses a name with no extension", () => {
		expect(
			assertUploadType({
				declaredType: "image/png",
				filename: "avatar",
				headBytes: PNG_HEAD,
				allow: [...allow],
			}),
		).toHaveProperty("reason", "extension_missing");
	});

	it("refuses empty bytes and an empty allowlist", () => {
		expect(
			assertUploadType({
				declaredType: "image/png",
				filename: "a.png",
				headBytes: bytes(),
				allow: [...allow],
			}),
		).toHaveProperty("reason", "no_bytes");

		expect(
			assertUploadType({
				declaredType: "image/png",
				filename: "a.png",
				headBytes: PNG_HEAD,
				allow: [],
			}),
		).toHaveProperty("reason", "type_not_allowed");
	});

	it("accepts an office document as its ZIP container", () => {
		expect(
			assertUploadType({
				declaredType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				filename: "contract.docx",
				headBytes: ZIP_HEAD,
				allow: ["zip"],
			}),
		).toEqual({ ok: true, type: "zip" });
	});
});

// ============================================
// JSONP callback validation (WSTG-CLNT-13)
// ============================================

describe("validateJsonpCallback", () => {
	it("accepts plain identifiers and dotted namespaces", () => {
		expect(validateJsonpCallback("cb")).toBe(true);
		expect(validateJsonpCallback("app.render")).toBe(true);
		expect(validateJsonpCallback("$jsonp_handler2")).toBe(true);
		expect(validateJsonpCallback("window.app.handlers.onLoad")).toBe(true);
	});

	it("refuses anything that could break out of the call expression", () => {
		expect(validateJsonpCallback("alert(1);//")).toBe(false);
		expect(validateJsonpCallback("cb;alert(1)")).toBe(false);
		expect(validateJsonpCallback("cb(1)")).toBe(false);
		expect(validateJsonpCallback('cb"')).toBe(false);
		expect(validateJsonpCallback("<script>")).toBe(false);
		expect(validateJsonpCallback("cb\nalert(1)")).toBe(false);
	});

	it("refuses reserved names in any segment", () => {
		expect(validateJsonpCallback("eval")).toBe(false);
		expect(validateJsonpCallback("window.eval")).toBe(false);
		expect(validateJsonpCallback("a.constructor.b")).toBe(false);
		expect(validateJsonpCallback("__proto__")).toBe(false);
	});

	it("refuses empty, leading-digit, and over-long names", () => {
		expect(validateJsonpCallback("")).toBe(false);
		expect(validateJsonpCallback("1cb")).toBe(false);
		expect(validateJsonpCallback("a".repeat(200))).toBe(false);
		expect(validateJsonpCallback("a.b.c.d.e.f.g")).toBe(false);
	});
});

// ============================================
// Query complexity (WSTG-APIT-01)
// ============================================

describe("analyzeQueryComplexity", () => {
	it("accepts an ordinary query", () => {
		const result = analyzeQueryComplexity("{ user { id name email } }");
		expect(result.withinLimits).toBe(true);
		expect(result.depth).toBe(2);
	});

	it("measures deep nesting", () => {
		const deep = `${"{ a ".repeat(20)}${"}".repeat(20)}`;
		const result = analyzeQueryComplexity(deep);
		expect(result.depth).toBe(20);
		expect(result.withinLimits).toBe(false);
		expect(result.exceeded).toContain("depth");
	});

	it("measures mass aliasing", () => {
		const aliased = `{ ${Array.from({ length: 80 }, (_, i) => `a${i}: user { id }`).join(" ")} }`;
		expect(analyzeQueryComplexity(aliased).exceeded).toContain("aliases");
	});

	it("enforces a length bound", () => {
		expect(analyzeQueryComplexity("x".repeat(30_000)).exceeded).toContain("length");
	});

	it("honours custom limits", () => {
		expect(analyzeQueryComplexity("{ a { b { c } } }", { maxDepth: 2 }).withinLimits).toBe(false);
		expect(analyzeQueryComplexity("{ a { b { c } } }", { maxDepth: 5 }).withinLimits).toBe(true);
	});

	it("does not count braces inside string literals", () => {
		expect(analyzeQueryComplexity('{ search(term: "{{{{{{{{{{{{") { id } }').depth).toBe(2);
	});

	it("does not count braces inside comments", () => {
		expect(analyzeQueryComplexity("{ user { id } }\n# a comment with { { { {\n").depth).toBe(2);
	});

	it("handles non-string input without throwing", () => {
		expect(analyzeQueryComplexity(null as unknown as string).withinLimits).toBe(true);
	});
});

// ============================================
// Reverse tabnabbing (WSTG-CLNT-14)
// ============================================

describe("sanitizeHtml reverse-tabnabbing hook", () => {
	// DOMPurify strips `target` under its default config, so the hook matters only for
	// callers who opt back in — which is exactly the configuration that reintroduces
	// the risk.
	const withTarget = { ADD_ATTR: ["target"] };

	it("adds noopener and noreferrer to target=_blank", () => {
		const output = sanitizeHtml('<a href="https://x.example" target="_blank">go</a>', withTarget);
		expect(output).toContain('rel="noopener noreferrer"');
	});

	it("adds them to a named target, which browsers do not protect implicitly", () => {
		const output = sanitizeHtml('<a href="https://x.example" target="win1">go</a>', withTarget);
		expect(output).toContain("noopener");
		expect(output).toContain("noreferrer");
	});

	it("preserves an existing rel value", () => {
		const output = sanitizeHtml(
			'<a href="https://x.example" target="_blank" rel="nofollow">go</a>',
			withTarget,
		);
		expect(output).toContain("nofollow");
		expect(output).toContain("noopener");
	});

	it("does not duplicate tokens that are already present", () => {
		const output = sanitizeHtml(
			'<a href="https://x.example" target="_blank" rel="noopener noreferrer">go</a>',
			withTarget,
		);
		expect(output.match(/noopener/g)).toHaveLength(1);
	});

	it("leaves same-context targets alone", () => {
		const output = sanitizeHtml('<a href="https://x.example" target="_self">go</a>', withTarget);
		expect(output).not.toContain("noopener");
	});

	it("still strips script-bearing schemes and handlers", () => {
		expect(
			sanitizeHtml('<a href="javascript:alert(1)" target="_blank">x</a>', withTarget),
		).not.toContain("javascript:");
		expect(sanitizeHtml("<img src=x onerror=alert(1)>", withTarget)).not.toContain("onerror");
	});
});

// CWE-601. Before this control existed, `sanitizeUrl` and `isValidUrl` returned six of
// ten origin-escaping targets as safe, and `normalizeOrigin` could not substitute — it
// returns null for any pathname other than "/".
describe("resolveRedirectTarget", () => {
	const BASE = "https://app.example.com";
	/** Where a browser actually lands, as ground truth rather than an assumption. */
	const landsOn = (target: string): string | null => {
		try {
			return new URL(target, BASE).origin;
		} catch {
			return null;
		}
	};

	describe("refuses anything that leaves the origin", () => {
		it.each([
			["a network-path reference", "//evil.example/", "opens_authority"],
			["a backslash network path", "\\\\evil.example/x", "opens_authority"],
			["a mixed slash pair", "/\\evil.example", "opens_authority"],
			["leading whitespace before one", "  //evil.example", "opens_authority"],
			["a tab the URL parser strips", "/\t/evil.example", "control_character"],
			["a CRLF the URL parser strips", "/\r\n/evil.example", "control_character"],
			["a tab before a backslash", "/\t\\evil.example", "control_character"],
			["a scheme-relative backslash", "https:/\\evil.tld", "host_not_allowed"],
			["userinfo disguising the host", "https://example.com@evil.tld/", "host_not_allowed"],
			["a plain foreign origin", "https://evil.example/", "host_not_allowed"],
			["a javascript scheme", "javascript:alert(1)", "unsupported_scheme"],
			["a data scheme", "data:text/html,<script>alert(1)</script>", "unsupported_scheme"],
		])("refuses %s", (_label, target, reason) => {
			const verdict = resolveRedirectTarget(target);
			expect(verdict.allowed).toBe(false);
			if (!verdict.allowed) expect(verdict.reason).toBe(reason);
		});

		// The assertion that matters: no allowed target may resolve off-origin.
		it("never allows a target that resolves to another origin", () => {
			const targets = [
				"//evil.example/",
				"/\t/evil.example",
				"/\r\n/evil.example",
				"/\t\\evil.example",
				"https:/\\evil.tld",
				"https://example.com@evil.tld/",
				"\\\\evil.example/x",
				"/\\evil.example",
				"https://evil.example/",
			];
			const leaked = targets.filter((target) => {
				const origin = landsOn(target);
				return resolveRedirectTarget(target).allowed && origin !== null && origin !== BASE;
			});
			expect(leaked).toEqual([]);
		});
	});

	// Sweeping U+0000-U+3000 finds five code points that escape the origin in
	// `/<cp>/host`. The authority test catches two of them; the other three are control
	// characters it cannot see, which is why the order below is load-bearing.
	it("tests for control characters before testing for an authority", () => {
		const opensAuthority = /^[/\\\\]{2}/;
		const escaping: string[] = [];
		for (let codePoint = 0; codePoint <= 0x3000; codePoint++) {
			if (codePoint >= 0xd800 && codePoint <= 0xdfff) continue;
			const target = `/${String.fromCodePoint(codePoint)}/evil.example`;
			const origin = landsOn(target);
			if (origin !== null && origin !== BASE) escaping.push(target);
		}

		// Some escape without the authority test being able to see them at all.
		expect(escaping.filter((target) => !opensAuthority.test(target)).length).toBeGreaterThan(0);
		// And every one of them is refused regardless.
		expect(escaping.filter((target) => resolveRedirectTarget(target).allowed)).toEqual([]);
	});

	describe("allows ordinary same-site destinations", () => {
		it.each([
			"/",
			"/dashboard",
			"/dashboard?tab=recent&sort=desc",
			"/search?q=caf%C3%A9",
			"/a/b/c#section",
			"/users/josé",
			"dashboard",
		])("allows %o", (target) => {
			expect(resolveRedirectTarget(target)).toEqual({ allowed: true, target });
		});

		// Percent-encoded bytes stay literal in a Location value and split no header, so
		// refusing them would reject ordinary URLs carrying encoded data.
		it("allows percent-encoded control bytes in a path", () => {
			expect(resolveRedirectTarget("/path%0d%0aSet-Cookie:%20a=b").allowed).toBe(true);
		});
	});

	describe("absolute targets", () => {
		const policy = { allowedHosts: ["partner.example", "SSO.Example.COM"] };

		it("refuses every absolute URL when no host is allowlisted", () => {
			const verdict = resolveRedirectTarget("https://partner.example/sso");
			expect(verdict.allowed).toBe(false);
		});

		it.each([
			"https://partner.example/sso",
			"https://SSO.example.com/login",
			"http://partner.example/x",
		])("allows allowlisted host %o", (target) => {
			expect(resolveRedirectTarget(target, policy).allowed).toBe(true);
		});

		// Matched against the parsed host, so neither a suffix nor userinfo can spoof it.
		it.each(["https://partner.example.evil.tld/", "https://partner.example@evil.tld/"])(
			"refuses %o, which only looks allowlisted",
			(target) => {
				expect(resolveRedirectTarget(target, policy).allowed).toBe(false);
			},
		);

		it("allows a URL whose userinfo is irrelevant to its host", () => {
			expect(resolveRedirectTarget("https://example.com@partner.example/", policy).allowed).toBe(
				true,
			);
		});
	});

	describe("bounds and malformed input", () => {
		it.each([
			["", "malformed"],
			["   ", "malformed"],
		])("refuses %o", (target, reason) => {
			const verdict = resolveRedirectTarget(target);
			expect(verdict.allowed).toBe(false);
			if (!verdict.allowed) expect(verdict.reason).toBe(reason);
		});

		it.each([null, undefined, 42, {}])("refuses non-string %o", (target) => {
			expect(resolveRedirectTarget(target as unknown as string).allowed).toBe(false);
		});

		it("refuses a target past the length bound", () => {
			const verdict = resolveRedirectTarget(`/${"a".repeat(3000)}`);
			expect(verdict.allowed).toBe(false);
			if (!verdict.allowed) expect(verdict.reason).toBe("too_long");
		});

		it("honours an explicit maxLength", () => {
			expect(resolveRedirectTarget("/abcdef", { maxLength: 3 }).allowed).toBe(false);
		});
	});
});

// analyzeQueryComplexity measures one document; a batch is many. Both ways past it
// were measured against this package before this function existed.
describe("analyzeGraphQLRequest", () => {
	const batchOf = (count: number) =>
		Array.from({ length: count }, (_, index) => ({
			query: `query q${index} { user(id: ${index}) { id email } }`,
		}));

	describe("closes the batching fail-open", () => {
		// The documented call reads req.body.query, which is undefined for an array batch,
		// so a 250-operation request measured as all zeros with withinLimits true.
		it("counts operations across a parsed array batch", () => {
			const analysis = analyzeGraphQLRequest(batchOf(250));
			expect(analysis.documents).toBe(250);
			expect(analysis.operations).toBe(250);
			expect(analysis.withinLimits).toBe(false);
			expect(analysis.exceeded).toContain("operations");
		});

		// Passing the raw body did not help either: the scanner skips everything between
		// JSON quotes, so the same batch measured fields: 0.
		it("counts operations across a raw JSON batch", () => {
			const analysis = analyzeGraphQLRequest(JSON.stringify(batchOf(250)));
			expect(analysis.operations).toBe(250);
			expect(analysis.withinLimits).toBe(false);
		});

		it("reports too many documents separately from too many operations", () => {
			const analysis = analyzeGraphQLRequest(batchOf(50), { maxOperations: 1000 });
			expect(analysis.exceeded).toContain("documents");
			expect(analysis.exceeded).not.toContain("operations");
		});
	});

	describe("leaves ordinary requests alone", () => {
		it.each([
			["a named query", { query: "query Me { viewer { id name email } }" }],
			["anonymous shorthand", { query: "{ viewer { id } }" }],
			["a mutation", { query: "mutation Save($x: In!) { save(input: $x) { id } }" }],
			["raw JSON for a single query", JSON.stringify({ query: "query { viewer { id } }" })],
		])("allows %s", (_label, body) => {
			const analysis = analyzeGraphQLRequest(body);
			expect(analysis.withinLimits).toBe(true);
			expect(analysis.operations).toBe(1);
		});

		it("allows a small batch", () => {
			const analysis = analyzeGraphQLRequest([
				{ query: "{ a { id } }" },
				{ query: "{ b { id } }" },
				{ query: "{ c { id } }" },
			]);
			expect(analysis).toMatchObject({ documents: 3, operations: 3, withinLimits: true });
		});
	});

	// A keyword only starts an operation at depth 0. Miscounting either rejects ordinary
	// documents or lets a batch through.
	describe("counts only real top-level operations", () => {
		it.each([
			["a field named query", "{ query { id } }", 1],
			["keywords inside a string", '{ search(term: "query mutation") { id } }', 1],
			["keywords inside a comment", "# query mutation\n{ viewer { id } }", 1],
			["a block string with an odd quote", '{ note(text: """a " b query""") { id } }', 1],
			["two operations", "query A { a } query B { b }", 2],
			["a query and a mutation", "query A { a } mutation B { b }", 2],
		])("reads %s as %i operation(s)", (_label, query, expected) => {
			expect(analyzeGraphQLRequest({ query }).operations).toBe(expected);
		});
	});

	// Already bounded before this function existed — pinned so nobody removes it as dead.
	it("still bounds alias batching inside a single document", () => {
		const selections = Array.from(
			{ length: 300 },
			(_, index) => `a${index}: user(id: ${index}) { id }`,
		).join(" ");
		const analysis = analyzeGraphQLRequest({ query: `query { ${selections} }` });
		expect(analysis.withinLimits).toBe(false);
		expect(analysis.exceeded).toEqual(expect.arrayContaining(["aliases", "fields"]));
	});

	describe("malformed input", () => {
		it.each([null, undefined, 42, {}, [], { notAQuery: 1 }])("never throws on %o", (body) => {
			expect(() => analyzeGraphQLRequest(body)).not.toThrow();
		});

		it("reports an empty request as within limits", () => {
			expect(analyzeGraphQLRequest({})).toMatchObject({
				documents: 0,
				operations: 0,
				withinLimits: true,
			});
		});

		it("never throws on a deeply nested parsed body", () => {
			// What a JSON body parser hands over for `[[[[…]]]]`. An unbounded descent
			// raises RangeError inside a function documented never to throw.
			let body: unknown = [];
			for (let level = 0; level < 50_000; level++) body = [body];

			expect(() => analyzeGraphQLRequest(body)).not.toThrow();
			// Not throwing is the contract; passing is not. The walk stopped early, so the
			// zero means "nothing seen", not "nothing there".
			expect(analyzeGraphQLRequest(body)).toMatchObject({
				documents: 0,
				withinLimits: false,
				exceeded: ["bodyDepth"],
			});
		});

		it("does not let nesting hide a batch that would otherwise be blocked", () => {
			// Arrange: the exact batch the limiter catches head-on, wrapped past the walk
			// bound. Extraction finds nothing, and "nothing found" must not read as "small".
			const batch = Array.from({ length: 150 }, (_, i) => ({
				query: `query Q${i} { user { id } }`,
			}));
			let wrapped: unknown = batch;
			for (let level = 0; level < 10; level++) wrapped = [wrapped];

			// Act / Assert: blocked either way, for different stated reasons.
			const bare = analyzeGraphQLRequest(batch);
			expect(bare).toMatchObject({ operations: 150, withinLimits: false });
			expect(bare.exceeded).toEqual(expect.arrayContaining(["documents", "operations"]));

			const hidden = analyzeGraphQLRequest(wrapped);
			expect(hidden.withinLimits).toBe(false);
			expect(hidden.exceeded).toContain("bodyDepth");

			// And the same payload handed over as raw text rather than parsed.
			const asText = analyzeGraphQLRequest(JSON.stringify(wrapped));
			expect(asText.withinLimits).toBe(false);
			expect(asText.exceeded).toContain("bodyDepth");
		});

		it("rejects a bracket run prefixed to a real batch rather than counting it as one document", () => {
			// Arrange: `JSON.parse` fails on this, and treating the leftovers as a single bare
			// document reported 150 operations as 1 — undercounting by whatever the attacker
			// chose. No GraphQL document starts with `[`, so this can only be an unreadable batch.
			const batch = JSON.stringify(
				Array.from({ length: 150 }, (_, i) => ({ query: `query Q${i} { user { id } }` })),
			);

			// Act
			const analysis = analyzeGraphQLRequest("[".repeat(2500) + batch);

			// Assert
			expect(analysis.withinLimits).toBe(false);
			expect(analysis.exceeded).toContain("malformedBody");
			expect(analysis.documents).toBe(0);
		});

		it("still treats anonymous shorthand as a document, since it starts with a brace", () => {
			// The `{`-prefixed sibling of the case above: not JSON, but perfectly good GraphQL,
			// so it must keep falling through as a document rather than being called malformed.
			const analysis = analyzeGraphQLRequest("{ user { id } }");
			expect(analysis.documents).toBe(1);
			expect(analysis.operations).toBe(1);
			expect(analysis.exceeded).not.toContain("malformedBody");
		});

		it("still reads a document through ordinary batch nesting", () => {
			const analysis = analyzeGraphQLRequest([{ query: "query { user { id } }" }]);
			expect(analysis.documents).toBe(1);
		});
	});
});

// The control the SSRF rules name. Fifteen rule declarations point at it, and the
// comment above them concedes that a hostname resolving to 169.254.169.254 passes
// every signature in that file.
describe("classifyAddress", () => {
	it.each([
		["127.0.0.1", "loopback"],
		["127.255.255.254", "loopback"],
		["128.0.0.1", "public"],
		["10.0.0.1", "private"],
		["11.0.0.1", "public"],
		["172.15.255.255", "public"],
		["172.16.0.1", "private"],
		["172.31.255.255", "private"],
		["172.32.0.1", "public"],
		["192.168.0.1", "private"],
		["192.169.0.1", "public"],
		["169.254.169.254", "link_local"],
		["169.255.0.1", "public"],
		["100.64.0.1", "carrier_nat"],
		["100.128.0.1", "public"],
		["0.0.0.0", "unspecified"],
		["255.255.255.255", "broadcast"],
		["224.0.0.1", "multicast"],
		["240.0.0.1", "reserved"],
		["198.18.0.1", "benchmarking"],
		["203.0.113.1", "documentation"],
		["8.8.8.8", "public"],
		["::1", "loopback"],
		["[::1]", "loopback"],
		["::", "unspecified"],
		["fe80::1", "link_local"],
		["fc00::1", "unique_local"],
		["fd12::1", "unique_local"],
		["ff02::1", "multicast"],
		["2001:db8::1", "documentation"],
		["2001::1", "teredo"],
		["2002::1", "six_to_four"],
		["64:ff9b::1", "nat64"],
		["2606:4700:4700::1111", "public"],
	])("classifies %s as %s", (host, expected) => {
		expect(classifyAddress(host)).toBe(expected);
	});

	// The form that matters in practice: new URL(...).hostname returns the bracketed,
	// hex-compressed spelling, which a comparison against the dotted form misses.
	it.each([
		["::ffff:169.254.169.254", "link_local"],
		["[::ffff:a9fe:a9fe]", "link_local"],
		["::ffff:127.0.0.1", "loopback"],
		["::ffff:8.8.8.8", "public"],
	])("unwraps IPv4-mapped %s to %s", (host, expected) => {
		expect(classifyAddress(host)).toBe(expected);
	});

	// null means *unknown*, not safe. Conflating the two is the fail-open this module
	// exists to avoid.
	it.each(["metadata.example.com", "example.com", "localhost", "", "999.999.999.999", "1.2.3"])(
		"returns null for %o, which is not an IP literal",
		(host) => {
			expect(classifyAddress(host)).toBeNull();
		},
	);

	it("reports only routable literals as publicly routable", () => {
		expect(isPubliclyRoutableAddress("8.8.8.8")).toBe(true);
		expect(isPubliclyRoutableAddress("169.254.169.254")).toBe(false);
		// A name is not routable *as far as this function can tell*, which is the point.
		expect(isPubliclyRoutableAddress("example.com")).toBe(false);
	});
});

describe("assertOutboundUrl", () => {
	// The correction that matters: classifyAddress returns null for every name, so a
	// policy shaped "reject non-public literals" would permit every hostname.
	it("refuses a hostname when no policy names it", () => {
		const verdict = assertOutboundUrl("https://metadata.example.com/");
		expect(verdict.allowed).toBe(false);
		if (!verdict.allowed) expect(verdict.reason).toBe("host_not_allowed");
	});

	it.each([
		["loopback", "https://127.0.0.1/"],
		["link-local metadata", "https://169.254.169.254/latest/meta-data/"],
		["IPv4-mapped metadata", "https://[::ffff:169.254.169.254]/"],
		["octal loopback", "https://0177.0.0.1/"],
		["dword loopback", "https://2130706433/"],
		["private", "https://10.0.0.1/"],
		["IPv6 loopback", "https://[::1]/"],
		["unique local", "https://[fd12::1]/"],
	])("refuses %s even with allowPublicHosts", (_label, url) => {
		const verdict = assertOutboundUrl(url, { allowPublicHosts: true });
		expect(verdict.allowed).toBe(false);
		if (!verdict.allowed) expect(verdict.reason).toBe("address_not_routable");
	});

	// Range beats allowlist: naming a loopback address must not open a route back into
	// the host making the request.
	it("refuses a reserved literal even when it is allowlisted", () => {
		const verdict = assertOutboundUrl("https://127.0.0.1/", { allowedHosts: ["127.0.0.1"] });
		expect(verdict.allowed).toBe(false);
	});

	it("allows an allowlisted hostname", () => {
		const verdict = assertOutboundUrl("https://hooks.partner.example/x", {
			allowedHosts: ["hooks.partner.example"],
		});
		expect(verdict.allowed).toBe(true);
	});

	it("defaults to https only", () => {
		expect(assertOutboundUrl("http://example.com/", { allowPublicHosts: true }).allowed).toBe(
			false,
		);
		expect(assertOutboundUrl("https://example.com/", { allowPublicHosts: true }).allowed).toBe(
			true,
		);
	});

	it.each(["gopher://example.com/", "file:///etc/passwd", "dict://example.com:11211/"])(
		"refuses the %o scheme",
		(url) => {
			expect(assertOutboundUrl(url, { allowPublicHosts: true }).allowed).toBe(false);
		},
	);

	it("refuses a non-default port unless it is named", () => {
		expect(assertOutboundUrl("https://example.com:8080/", { allowPublicHosts: true }).allowed).toBe(
			false,
		);
		expect(
			assertOutboundUrl("https://example.com:8443/", {
				allowPublicHosts: true,
				allowedPorts: [8443],
			}).allowed,
		).toBe(true);
	});

	it("never throws on malformed input", () => {
		expect(assertOutboundUrl("not a url").allowed).toBe(false);
		expect(() => assertOutboundUrl(null as unknown as string)).not.toThrow();
	});
});

// JSON.parse allocates the whole graph before a caller can inspect anything, so a body
// built to exhaust memory has already succeeded by the time validation runs. This
// measures the text instead.
describe("checkJsonPayloadLimits", () => {
	const nested = (levels: number) => "[".repeat(levels) + "]".repeat(levels);

	// The draft limits for this control rejected four of five ordinary bodies. Defaults
	// that reject real traffic get raised by the first person they inconvenience, and
	// then the control is gone.
	describe("leaves realistic payloads alone", () => {
		it("accepts a 250-key dependency manifest", () => {
			const dependencies = Object.fromEntries(
				Array.from({ length: 250 }, (_, index) => [`@scope/pkg-${index}`, "^1.2.3"]),
			);
			const report = checkJsonPayloadLimits(JSON.stringify({ name: "app", dependencies }));
			expect(report.withinLimits).toBe(true);
			expect(report.objectKeys).toBe(250);
		});

		it("accepts a 25-deep configuration tree", () => {
			let config: unknown = { leaf: true };
			for (let level = 0; level < 25; level++) config = { level: config };
			expect(checkJsonPayloadLimits(JSON.stringify(config)).withinLimits).toBe(true);
		});

		it("accepts a 40KB data-URI avatar", () => {
			const avatar = `data:image/png;base64,${"A".repeat(40_000)}`;
			expect(checkJsonPayloadLimits(JSON.stringify({ avatar })).withinLimits).toBe(true);
		});

		it("accepts a 2000-row page", () => {
			const rows = Array.from({ length: 2000 }, (_, index) => ({
				id: index,
				name: `row ${index}`,
			}));
			const report = checkJsonPayloadLimits(JSON.stringify({ rows }));
			expect(report.withinLimits).toBe(true);
			expect(report.arrayLength).toBe(2000);
		});
	});

	describe("reports pathological payloads", () => {
		it("reports nesting past the depth bound", () => {
			const report = checkJsonPayloadLimits(nested(200));
			expect(report.withinLimits).toBe(false);
			expect(report.exceeded).toContain("depth");
		});

		it("reports an oversized array", () => {
			const text = JSON.stringify(Array.from({ length: 50_000 }, (_, index) => index));
			expect(checkJsonPayloadLimits(text).exceeded).toContain("arrayLength");
		});

		it("reports an oversized object", () => {
			const text = JSON.stringify(
				Object.fromEntries(Array.from({ length: 5000 }, (_, index) => [`k${index}`, 1])),
			);
			expect(checkJsonPayloadLimits(text).exceeded).toContain("objectKeys");
		});

		it("reports an oversized string value", () => {
			const text = JSON.stringify({ s: "x".repeat(2_000_000) });
			expect(checkJsonPayloadLimits(text).exceeded).toContain("stringLength");
		});
	});

	// Without a cap on the counter stack, a deeply nested payload grows one stack entry
	// per level — reintroducing the unbounded allocation this function exists to avoid.
	it("stays bounded on input nested 200000 deep", () => {
		const started = performance.now();
		const report = checkJsonPayloadLimits(nested(200_000));
		expect(report.depth).toBe(200_000);
		expect(report.exceeded).toContain("depth");
		expect(performance.now() - started).toBeLessThan(1000);
	});

	it("does not let braces inside a string inflate the depth", () => {
		const report = checkJsonPayloadLimits(JSON.stringify({ s: "{[{[{[", t: 'he said "hi"' }));
		expect(report.depth).toBe(1);
		expect(report.withinLimits).toBe(true);
	});

	it("never throws on non-string input", () => {
		expect(() => checkJsonPayloadLimits(null as unknown as string)).not.toThrow();
		expect(checkJsonPayloadLimits("").withinLimits).toBe(true);
	});
});
