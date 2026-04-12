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

import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

/** AES-256-GCM encryption algorithm */
const ALGORITHM = 'aes-256-gcm';
/** Initialization vector length in bytes */
const IV_LENGTH = 16;
/** Authentication tag length in bytes */
const AUTH_TAG_LENGTH = 16;
/** Salt length for key derivation */
const SALT_LENGTH = 32;
/** Derived key length (256 bits for AES-256) */
const KEY_LENGTH = 32;

/**
 * Derives an encryption key from a password using scrypt
 */
async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
}

/**
 * Encrypts sensitive data using AES-256-GCM
 *
 * @param plaintext - Data to encrypt
 * @param encryptionKey - Encryption key/password
 * @returns Base64-encoded encrypted data (salt:iv:authTag:ciphertext)
 * @compliance NIST 800-53 SC-28 (Protection of Information at Rest)
 */
export async function encryptData(plaintext: string, encryptionKey: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await deriveKey(encryptionKey, salt);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypts data encrypted with encryptData
 */
export async function decryptData(encryptedData: string, encryptionKey: string): Promise<string> {
  const combined = Buffer.from(encryptedData, 'base64');

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
  return decrypted.toString('utf8');
}

/**
 * Hash data using SHA-256 (for non-reversible hashing)
 */
export function hashData(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Mask PII for logging (shows first 2 and last 2 characters)
 */
export function maskPII(data: string): string {
  if (data.length <= 4) {
    return '****';
  }
  return `${data.slice(0, 2)}${'*'.repeat(data.length - 4)}${data.slice(-2)}`;
}

/**
 * Mask email for logging
 */
export function maskEmail(email: string): string {
  const parts = email.split('@');
  const local = parts[0];
  const domain = parts[1];
  if (!domain || !local) return maskPII(email);
  const maskedLocal =
    local.length > 2
      ? `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}`
      : '**';
  return `${maskedLocal}@${domain}`;
}

/**
 * Sanitize object for logging (removes sensitive fields)
 */
export function sanitizeForLogging<T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: string[] = [
    'password',
    'passwordHash',
    'token',
    'secret',
    'twoFactorSecret',
    'apiKey',
  ],
): Partial<T> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (key.toLowerCase().includes('email') && typeof value === 'string') {
      sanitized[key] = maskEmail(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value as Record<string, unknown>, sensitiveFields);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as Partial<T>;
}
