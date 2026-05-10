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

/**
 * @file Security Utilities
 * @module utils/security
 * @author ResQ
 * @description Provides encryption, hashing, and security functions
 *              for compliance with SOC2, ISO 27001, NIST 800-53.
 *              Includes AES-256-GCM encryption, secure token generation,
 *              and PII masking utilities.
 * @compliance NIST 800-53 SC-28 (Protection of Information at Rest)
 * @compliance NIST 800-53 SC-13 (Cryptographic Protection)
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

/** AES-256-GCM encryption algorithm */
const ALGORITHM = "aes-256-gcm";
/** Initialization vector length in bytes */
const IV_LENGTH = 16;
/** Authentication tag length in bytes */
const AUTH_TAG_LENGTH = 16;
/** Salt length for key derivation */
const SALT_LENGTH = 32;
/** Derived key length (256 bits for AES-256) */
const KEY_LENGTH = 32;

/**
 * Derive a 32-byte (AES-256) key from a password and per-record salt
 * using scrypt with Node's default cost parameters.
 *
 * Internal helper — used inside the encrypt/decrypt round-trip because
 * the salt must travel alongside the ciphertext for decryption to
 * succeed.
 *
 * @internal
 */
async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
	return (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
}

/**
 * Encrypt a UTF-8 string with AES-256-GCM authenticated encryption.
 *
 * Each call generates a fresh random salt and IV — the same plaintext
 * encrypted twice with the same `encryptionKey` produces different
 * ciphertexts, which is the property you want for at-rest encryption.
 *
 * Output layout (base64-encoded): `salt(32) | iv(16) | authTag(16) | ciphertext(*)`.
 * The companion {@link decryptData} understands this layout.
 *
 * @param plaintext - UTF-8 string to encrypt.
 * @param encryptionKey - Caller-supplied secret. Treated as a password
 *   and stretched into a 256-bit AES key via scrypt; can be any length,
 *   though a high-entropy secret (≥ 32 bytes) is strongly preferred.
 *
 * @returns A self-contained base64 string. Store or transmit verbatim;
 *   the salt/IV are recovered on decryption.
 *
 * @throws From the underlying Node crypto primitives if `encryptionKey`
 *   is empty or scrypt fails.
 *
 * @compliance NIST 800-53 SC-28 (Protection of Information at Rest),
 *   SC-13 (Cryptographic Protection).
 *
 * @example
 * ```ts
 * const ct = await encryptData("user@example.com", process.env.PII_KEY!);
 * await db.users.update(id, { email: ct });
 * ```
 */
export async function encryptData(plaintext: string, encryptionKey: string): Promise<string> {
	const salt = randomBytes(SALT_LENGTH);
	const key = await deriveKey(encryptionKey, salt);
	const iv = randomBytes(IV_LENGTH);

	const cipher = createCipheriv(ALGORITHM, key, iv);
	const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
	const authTag = cipher.getAuthTag();

	const combined = Buffer.concat([salt, iv, authTag, encrypted]);
	return combined.toString("base64");
}

/**
 * Reverse {@link encryptData}. Verifies the GCM authentication tag
 * before returning plaintext — tampered ciphertexts throw.
 *
 * @param encryptedData - Base64 string produced by {@link encryptData}.
 * @param encryptionKey - Same key/password used to encrypt. Wrong keys
 *   throw an "Unsupported state or unable to authenticate data" error
 *   from Node — the authenticated tag failure is indistinguishable from
 *   tampering, by design.
 *
 * @returns The original UTF-8 plaintext.
 *
 * @throws Error if the tag does not verify (wrong key, modified
 *   ciphertext, truncated payload). Catch this and treat it as a
 *   security event, not a recoverable error.
 *
 * @example
 * ```ts
 * const plaintext = await decryptData(stored, process.env.PII_KEY!);
 * ```
 */
export async function decryptData(encryptedData: string, encryptionKey: string): Promise<string> {
	const combined = Buffer.from(encryptedData, "base64");

	const salt = combined.subarray(0, SALT_LENGTH);
	const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
	const authTag = combined.subarray(
		SALT_LENGTH + IV_LENGTH,
		SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
	);
	const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

	const key = await deriveKey(encryptionKey, salt);

	const decipher = createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(authTag);

	const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
	return decrypted.toString("utf8");
}

/**
 * Compute a SHA-256 digest of a UTF-8 string and return it as lowercase
 * hex.
 *
 * **Not for password storage.** SHA-256 is fast by design — use a
 * deliberately slow KDF (`bcrypt`, `argon2`, or `scrypt`) for
 * password-equivalent material. This helper is intended for
 * non-reversible identifiers, content hashes, and idempotency keys.
 *
 * @param data - UTF-8 input.
 * @returns 64-character lowercase hex digest.
 *
 * @example
 * ```ts
 * hashData("hello"); // → "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
 * ```
 */
export function hashData(data: string): string {
	return createHash("sha256").update(data).digest("hex");
}

/**
 * Generate a cryptographically random hex token suitable for session
 * IDs, password-reset tokens, CSRF tokens, and similar single-use
 * secrets.
 *
 * @param length - Number of random *bytes* to draw (the returned hex
 *   string is twice as long). Default `32` ⇒ 64-char hex / 256 bits of
 *   entropy.
 * @returns Lowercase hex string of length `length * 2`.
 *
 * @example
 * ```ts
 * generateSecureToken();    // 64-char hex (256-bit entropy)
 * generateSecureToken(16);  // 32-char hex (128-bit entropy)
 * ```
 */
export function generateSecureToken(length: number = 32): string {
	return randomBytes(length).toString("hex");
}

/**
 * Mask an arbitrary PII string for safe logging — keeps the first two
 * and last two characters and replaces everything in between with
 * asterisks. Strings of length ≤ 4 are fully masked as `"****"`.
 *
 * @param data - Raw PII string.
 * @returns Masked representation safe for logs.
 *
 * @example
 * ```ts
 * maskPII("4242424242424242"); // → "42************42"
 * maskPII("AB12");              // → "****"
 * ```
 */
export function maskPII(data: string): string {
	if (data.length <= 4) {
		return "****";
	}
	return `${data.slice(0, 2)}${"*".repeat(data.length - 4)}${data.slice(-2)}`;
}

/**
 * Mask an email address while preserving the domain — useful for
 * deduplication and support workflows where the domain is non-PII but
 * the local part identifies the user.
 *
 * @param email - Full email. Falls back to {@link maskPII} if the input
 *   does not contain a valid `local@domain` shape.
 * @returns Masked email; e.g. `"j*****e@example.com"`.
 *
 * @example
 * ```ts
 * maskEmail("jane@example.com"); // → "j**e@example.com"
 * maskEmail("ab@example.com");   // → "**@example.com"
 * maskEmail("not-an-email");     // → "no********il" (maskPII fallback)
 * ```
 */
export function maskEmail(email: string): string {
	const parts = email.split("@");
	const local = parts[0];
	const domain = parts[1];
	if (!domain || !local) return maskPII(email);
	const maskedLocal =
		local.length > 2
			? `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}`
			: "**";
	return `${maskedLocal}@${domain}`;
}

/**
 * Recursively shallow-copy an object, replacing any field whose key
 * contains a sensitive substring (case-insensitive) with `[REDACTED]`,
 * and masking string fields whose key contains `"email"` via
 * {@link maskEmail}.
 *
 * Designed for log structures — preserves shape so log queries continue
 * to work, but ensures secrets and identifiers don't leak. Use as a
 * defensive layer **before** writing structured log lines.
 *
 * @param obj - Object to sanitise. Original is not mutated.
 * @param sensitiveFields - Substring allow-list. Defaults to
 *   `["password", "passwordHash", "token", "secret",
 *   "twoFactorSecret", "apiKey"]`. Substrings match anywhere in the
 *   key, e.g. `"token"` matches `"refreshToken"` and `"id_token"`.
 *
 * @returns A new object with sensitive fields redacted and emails
 *   masked. Nested objects are recursed; arrays and primitives pass
 *   through unchanged.
 *
 * @example
 * ```ts
 * sanitizeForLogging({
 *   id: 1,
 *   email: "u@x.com",
 *   apiKey: "sk-...",
 *   nested: { token: "..." },
 * });
 * // → { id: 1, email: "u@x.com" (masked), apiKey: "[REDACTED]", nested: { token: "[REDACTED]" } }
 * ```
 */
export function sanitizeForLogging<T extends Record<string, unknown>>(
	obj: T,
	sensitiveFields: string[] = [
		"password",
		"passwordHash",
		"token",
		"secret",
		"twoFactorSecret",
		"apiKey",
	],
): Partial<T> {
	const sanitized: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(obj)) {
		if (sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
			sanitized[key] = "[REDACTED]";
		} else if (key.toLowerCase().includes("email") && typeof value === "string") {
			sanitized[key] = maskEmail(value);
		} else if (typeof value === "object" && value !== null) {
			sanitized[key] = sanitizeForLogging(value as Record<string, unknown>, sensitiveFields);
		} else {
			sanitized[key] = value;
		}
	}

	return sanitized as Partial<T>;
}
