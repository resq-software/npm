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
	decryptData,
	encryptData,
	generateSecureToken,
	hashData,
	maskEmail,
	maskPII,
	sanitizeForLogging,
} from "../src/crypto.js";

describe("encryptData / decryptData", () => {
	it("should roundtrip a simple string", async () => {
		const plaintext = "hello world";
		const key = "my-secret-key";
		const encrypted = await encryptData(plaintext, key);
		const decrypted = await decryptData(encrypted, key);
		expect(decrypted).toBe(plaintext);
	});

	it("should produce different ciphertext on each call (random IV/salt)", async () => {
		const plaintext = "deterministic?";
		const key = "key123";
		const a = await encryptData(plaintext, key);
		const b = await encryptData(plaintext, key);
		expect(a).not.toBe(b);
	});

	it("should fail to decrypt with wrong key", async () => {
		const encrypted = await encryptData("secret", "correct-key");
		await expect(decryptData(encrypted, "wrong-key")).rejects.toThrow();
	});

	it("should roundtrip an empty string", async () => {
		const key = "key";
		const encrypted = await encryptData("", key);
		const decrypted = await decryptData(encrypted, key);
		expect(decrypted).toBe("");
	});

	it("should roundtrip unicode content", async () => {
		const plaintext = "Hello \u{1F600} \u00E9\u00E8\u00EA \u4F60\u597D";
		const key = "unicode-key";
		const encrypted = await encryptData(plaintext, key);
		const decrypted = await decryptData(encrypted, key);
		expect(decrypted).toBe(plaintext);
	});

	it("should roundtrip special characters", async () => {
		const plaintext = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./~`';
		const key = "special-chars";
		const encrypted = await encryptData(plaintext, key);
		const decrypted = await decryptData(encrypted, key);
		expect(decrypted).toBe(plaintext);
	});

	it("should roundtrip a long string", async () => {
		const plaintext = "x".repeat(10000);
		const key = "long-key";
		const encrypted = await encryptData(plaintext, key);
		const decrypted = await decryptData(encrypted, key);
		expect(decrypted).toBe(plaintext);
	});

	it("should produce base64-encoded output", async () => {
		const encrypted = await encryptData("test", "key");
		expect(() => Buffer.from(encrypted, "base64")).not.toThrow();
		// Re-encoding to base64 should match the original
		expect(Buffer.from(encrypted, "base64").toString("base64")).toBe(encrypted);
	});
});

describe("hashData", () => {
	it("should produce a consistent hash for the same input", () => {
		const hash1 = hashData("hello");
		const hash2 = hashData("hello");
		expect(hash1).toBe(hash2);
	});

	it("should produce different hashes for different inputs", () => {
		const hash1 = hashData("hello");
		const hash2 = hashData("world");
		expect(hash1).not.toBe(hash2);
	});

	it("should return a 64-character hex string (SHA-256)", () => {
		const hash = hashData("test");
		expect(hash).toMatch(/^[0-9a-f]{64}$/);
	});

	it("should hash an empty string", () => {
		const hash = hashData("");
		expect(hash).toMatch(/^[0-9a-f]{64}$/);
	});

	it("should produce different hashes for similar inputs", () => {
		const hash1 = hashData("abc");
		const hash2 = hashData("abd");
		expect(hash1).not.toBe(hash2);
	});
});

describe("generateSecureToken", () => {
	it("should generate a hex token of default length (64 hex chars for 32 bytes)", () => {
		const token = generateSecureToken();
		expect(token).toMatch(/^[0-9a-f]{64}$/);
	});

	it("should generate a token with custom length", () => {
		const token = generateSecureToken(16);
		expect(token).toMatch(/^[0-9a-f]{32}$/);
	});

	it("should produce unique tokens across calls", () => {
		const tokens = new Set(Array.from({ length: 10 }, () => generateSecureToken()));
		expect(tokens.size).toBe(10);
	});

	it("should handle length of 1", () => {
		const token = generateSecureToken(1);
		expect(token).toMatch(/^[0-9a-f]{2}$/);
	});
});

describe("maskPII", () => {
	it("should mask a normal string showing first 2 and last 2 chars", () => {
		expect(maskPII("abcdefgh")).toBe("ab****gh");
	});

	it("should mask a 5-character string", () => {
		expect(maskPII("abcde")).toBe("ab*de");
	});

	it("should return **** for strings of 4 or fewer characters", () => {
		expect(maskPII("abcd")).toBe("****");
		expect(maskPII("abc")).toBe("****");
		expect(maskPII("ab")).toBe("****");
		expect(maskPII("a")).toBe("****");
	});

	it("should return **** for empty string", () => {
		expect(maskPII("")).toBe("****");
	});
});

describe("maskEmail", () => {
	it("should mask the local part of an email", () => {
		expect(maskEmail("john@example.com")).toBe("j**n@example.com");
	});

	it("should mask a longer local part", () => {
		expect(maskEmail("johndoe@example.com")).toBe("j*****e@example.com");
	});

	it("should return ** for short local parts", () => {
		expect(maskEmail("ab@example.com")).toBe("**@example.com");
	});

	it("should fall back to maskPII for invalid email (no @)", () => {
		expect(maskEmail("notanemail")).toBe("no******il");
	});

	it("should handle single char local part", () => {
		expect(maskEmail("a@example.com")).toBe("**@example.com");
	});
});

describe("sanitizeForLogging", () => {
	it("should redact default sensitive fields", () => {
		const obj = { username: "john", password: "secret123", token: "abc" };
		const result = sanitizeForLogging(obj);
		expect(result.username).toBe("john");
		expect(result.password).toBe("[REDACTED]");
		expect(result.token).toBe("[REDACTED]");
	});

	it("should mask email fields", () => {
		const obj = { userEmail: "john@example.com", name: "John" };
		const result = sanitizeForLogging(obj);
		expect(result.userEmail).toBe("j**n@example.com");
		expect(result.name).toBe("John");
	});

	it("should handle nested objects", () => {
		const obj = { user: { password: "secret", name: "John" } };
		const result = sanitizeForLogging(obj) as Record<string, unknown>;
		const nested = result.user as Record<string, unknown>;
		expect(nested.password).toBe("[REDACTED]");
		expect(nested.name).toBe("John");
	});

	it("should use custom sensitive fields list", () => {
		const obj = { customField: "value", safe: "ok" };
		const result = sanitizeForLogging(obj, ["customField"]);
		expect(result.customField).toBe("[REDACTED]");
		expect(result.safe).toBe("ok");
	});

	it("should match sensitive fields case-insensitively", () => {
		const obj = { PASSWORD: "secret", ApiKey: "key123" };
		const result = sanitizeForLogging(obj);
		expect(result.PASSWORD).toBe("[REDACTED]");
		expect(result.ApiKey).toBe("[REDACTED]");
	});

	it("should preserve non-sensitive primitive values", () => {
		const obj = { count: 42, active: true, label: "safe" };
		const result = sanitizeForLogging(obj);
		expect(result.count).toBe(42);
		expect(result.active).toBe(true);
		expect(result.label).toBe("safe");
	});

	it("should handle an empty object", () => {
		const result = sanitizeForLogging({});
		expect(result).toEqual({});
	});
});
