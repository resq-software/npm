<!--
  Copyright 2026 ResQ Systems, Inc.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->

# @resq-systems/security

[![npm](https://img.shields.io/npm/v/%40resq-systems%2Fsecurity?style=flat-square)](https://www.npmjs.com/package/@resq-systems/security)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)](../../LICENSE.md)

> Encryption, threat detection, input validation, PII sanitization, and Effect Schema validators.

## Installation

```bash
bun add @resq-systems/security effect
```

Peer dependency: `effect`. Uses Node.js `crypto` module for encryption.

## Quick Start

```ts
import { encryptData, decryptData, toEncryptionKey, isSafeInput, escapeHtml, redactPII } from "@resq-systems/security";

// Encrypt/decrypt — the key is a branded `EncryptionKey`; mint it once at the boundary.
const key = toEncryptionKey(process.env.ENCRYPTION_KEY ?? "my-secret-key");
const encrypted = await encryptData("sensitive", key); // Ciphertext (branded)
const decrypted = await decryptData(encrypted, key);

// Validate input
if (!isSafeInput(userInput)) {
  return new Response("Invalid input", { status: 400 });
}

// Sanitize for display
const safe = escapeHtml('<script>alert("xss")</script>');

// Redact PII for logging
const clean = redactPII("Email: john@example.com, SSN: 123-45-6789");
// "Email: [EMAIL], SSN: [SSN]"
```

## API Reference

### Encryption (`crypto.ts`)

#### `encryptData(plaintext, encryptionKey): Promise<Ciphertext>`

Encrypts data using AES-256-GCM with scrypt key derivation.

- **plaintext** (`string`) -- data to encrypt.
- **encryptionKey** (`EncryptionKey`) -- branded secret; mint with `toEncryptionKey`.
- Returns a branded `Ciphertext`: a base64 `salt | iv | authTag | ciphertext` envelope.

#### `decryptData(encryptedData, encryptionKey): Promise<string>`

Decrypts data produced by `encryptData`. Verifies the GCM auth tag before returning -- tampered or wrong-key input throws.

- **encryptedData** (`Ciphertext`) -- the branded envelope from `encryptData` (read one back from storage via `toCiphertext`).
- **encryptionKey** (`EncryptionKey`) -- same key used for encryption.
- Returns the original plaintext string.

#### `hashData(data): Sha256Hex`

Hashes data using SHA-256. Non-reversible. Returns a branded 64-char lowercase hex digest. Not for password storage -- use a slow KDF (bcrypt/argon2/scrypt) for password-equivalent material.

#### `generateSecureToken(length?): SecureToken`

Generates a cryptographically secure random token.

- **length** (`PositiveInt`, default `toPositiveInt(32)`) -- byte length. Build non-default lengths with `toPositiveInt` from `@resq-systems/types`.
- Returns a branded `SecureToken`: hex string (2x the byte length).

#### `maskPII(data): Masked`

Masks a string, showing first 2 and last 2 characters (e.g. `"Al****ce"`). Returns `"****"` for strings <= 4 chars. Result is a branded `Masked` string.

#### `maskEmail(email): Masked`

Masks the email local part while preserving the domain (e.g. `"j***n@example.com"`). Falls back to `maskPII` when the input is not a `local@domain` shape.

#### `sanitizeForLogging(obj, sensitiveFields?): Partial<T>`

Recursively redacts sensitive fields from an object for safe logging.

- **sensitiveFields** (`string[]`, default: `["password", "passwordHash", "token", "secret", "twoFactorSecret", "apiKey"]`)
- Email fields are automatically masked.

```ts
sanitizeForLogging({ password: "secret", email: "john@example.com", name: "John" });
// { password: "[REDACTED]", email: "j***n@example.com", name: "John" }
```

#### Branded Crypto Types

The crypto surface uses nominal (branded) types so a plain `string` cannot be passed where a validated secret or ciphertext is expected. Exported brands: `Ciphertext`, `EncryptionKey`, `SecureToken`, `Sha256Hex`, `Masked`.

`EncryptionKey` and `Ciphertext` ship smart constructors (backed by `@resq-systems/types`):

| Function | Brand | Behavior |
|----------|-------|----------|
| `toEncryptionKey(value)` | `EncryptionKey` | Assert non-empty, brand, or throw |
| `coerceEncryptionKey(value)` | `EncryptionKey \| null` | Brand, or `null` when empty |
| `isEncryptionKey(value)` | type guard | `true` when `value` is a usable key |
| `unsafeEncryptionKey(value)` | `EncryptionKey` | Brand without checking |
| `toCiphertext(value)` | `Ciphertext` | Assert well-formed base64 envelope, or throw |
| `coerceCiphertext(value)` | `Ciphertext \| null` | Brand, or `null` when malformed |
| `isCiphertext(value)` | type guard | `true` for a well-formed envelope |
| `unsafeCiphertext(value)` | `Ciphertext` | Brand without checking |

### Threat Detection (`validators.ts`)

#### `detectThreatPatterns(input, config?): ThreatDetectionResult`

Runs all configured detectors on input.

- Returns `{ isSafe: boolean, threats: ThreatFinding[] }`.

| Config Option | Type | Default | Description |
|---------------|------|---------|-------------|
| `checkXSS` | `boolean` | `true` | Detect script injection, event handlers |
| `checkSQLInjection` | `boolean` | `true` | Detect UNION, DROP, stacked queries |
| `checkNoSQLInjection` | `boolean` | `true` | Detect MongoDB operators |
| `checkCommandInjection` | `boolean` | `false` | Detect shell commands (can cause false positives) |
| `checkPathTraversal` | `boolean` | `true` | Detect `../`, `%2e%2e`, null bytes |
| `checkHomoglyphs` | `boolean` | `true` | Detect Unicode lookalike characters |

#### `isSafeInput(input, config?): boolean`

Quick check returning `true` if no threats are detected.

#### Individual Detectors

Each returns `ThreatFinding[]`:

| Function | Detects |
|----------|---------|
| `containsXSSPatterns(input)` | Script tags, event handlers, `javascript:` URIs, `eval()` |
| `containsSQLInjection(input)` | UNION SELECT, DROP TABLE, `1=1`, SLEEP, stacked queries |
| `containsNoSQLInjection(input)` | MongoDB operators (`$gt`, `$where`, `$function`) |
| `containsCommandInjection(input)` | Command substitution, piped shells |
| `containsPathTraversal(input)` | Directory traversal, null bytes, sensitive paths |
| `containsHomoglyphs(input)` | Cyrillic/Greek lookalike characters |

#### `sanitizeForDisplay(input): string`

Escapes HTML entities (`<`, `>`, `&`, `"`, `'`, `/`) for safe rendering.

#### `normalizeUnicode(input): string`

Normalizes to NFC form and replaces known homoglyphs with ASCII equivalents.

#### `validateSafeText(input): boolean`

Validates text is safe from all attack patterns. For use as a schema refinement.

#### `validateSafeName(input): boolean`

Validates a name field -- allows international characters but blocks injection patterns.

#### `validateSafeEmail(input): boolean`

Validates email format and checks for injection patterns.

#### `getThreatErrorMessage(result): string`

Returns a human-readable error message for a threat detection result.

### Sanitization (`sanitize.ts`)

#### `escapeHtml(text): string`

Escapes `&`, `<`, `>`, `"`, `'` to HTML entities.

```ts
escapeHtml('<img onerror="alert(1)">'); // "&lt;img onerror=&quot;alert(1)&quot;&gt;"
```

#### `sanitizeHtml(html, options?): string`

Sanitizes HTML to prevent XSS using DOMPurify. Accepts an optional DOMPurify `Config`. When no DOM is available (server-side without `jsdom`), it falls back to escaping all HTML characters. `jsdom` is an optional peer dependency required only for server-side HTML sanitization.

#### `sanitizeUrl(url, allowedProtocols?): string`

Validates and returns a safe URL; returns empty string if unsafe.

- **allowedProtocols** (`string[]`, default: `["http:", "https:", "mailto:"]`).
- Blocks `javascript:`, `data:` URIs.

#### `sanitizeUrlEffect(url, allowedProtocols?): Exit<string, unknown>`

Effect-based version returning an `Exit`.

#### `validateUserInput(input, maxLength?, allowHtml?): string`

Strips HTML tags, normalizes whitespace, removes dangerous patterns, and truncates.

- **maxLength** (`number`, default `500`).
- **allowHtml** (`boolean`, default `false`).

#### `validateUserInputEffect(input, options?): Exit<string, unknown>`

Effect-based version with full options.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxLength` | `number` | `500` | Max output length |
| `allowHtml` | `boolean` | `false` | Preserve HTML tags |
| `allowNewlines` | `boolean` | `false` | Preserve newlines |
| `trimWhitespace` | `boolean` | `true` | Trim leading/trailing whitespace |

#### `sanitizeJson<T>(jsonString): T | null`

Safely parses JSON with prototype pollution protection. Removes `__proto__`, `constructor`, `prototype` keys.

#### `parseJsonWithSchema<A>(jsonString, schema): Option<A>`

Parses JSON with Effect Schema validation and prototype pollution protection. Returns `Option.some(value)` or `Option.none()`.

```ts
const UserSchema = Schema.Struct({ name: Schema.String, age: Schema.Number });
const user = parseJsonWithSchema('{"name":"John","age":30}', UserSchema);
// Option.some({ name: "John", age: 30 })
```

#### `stripAnsi(text): string`

Removes ANSI escape codes from strings.

#### `redactPII(text, options?): string`

Replaces PII patterns with redaction markers.

| Option | Type | Default | Marker |
|--------|------|---------|--------|
| `redactEmails` | `boolean` | `true` | `[EMAIL]` |
| `redactPhones` | `boolean` | `true` | `[PHONE]` |
| `redactSSN` | `boolean` | `true` | `[SSN]` |
| `redactCreditCards` | `boolean` | `true` | `[CREDIT_CARD]` |
| `redactIPs` | `boolean` | `true` | `[IP_ADDRESS]` (IPv4 and IPv6) |
| `redactDates` | `boolean` | `false` | `[DATE]` |
| `customPatterns` | `Array<{ pattern, replacement }>` | `[]` | custom |

#### `redactPIIEffect(text, options?): Exit<string, SchemaError>`

Effect-based variant of `redactPII` that validates the options against `PIIRedactionOptionsSchema` and returns an `Exit`. Does not apply `customPatterns`.

#### `safeStringify(obj, sensitiveKeys?, indent?): string`

JSON.stringify with automatic redaction of sensitive keys.

- **sensitiveKeys** (`string[]`, default: `["password", "token", "apiKey", "secret", "authorization", "cookie", "ssn", "creditCard"]`).

### Validation Helpers

Each is a type guard that narrows its input to the matching brand on success.

| Function | Narrows to | Description |
|----------|------------|-------------|
| `isValidEmail(email)` | `Email` | Validates email format; accepts alphabetic and Punycode/IDN (`xn--…`) TLDs |
| `isValidPhone(phone)` | `PhoneNumber` | Validates US phone format |
| `isValidSSN(ssn)` | `SSN` | Validates US SSN format |
| `isValidUrl(url)` | `SafeUrl` | Validates safe URL |

### Effect Schemas

Exported for runtime validation: `SafeUrlSchema`, `EmailSchema`, `PhoneNumberSchema`, `SSNSchema`, `CreditCardSchema`, `IPv4Schema`, `SanitizedStringSchema`, `UrlProtocolSchema`, `PIIRedactionOptionsSchema`, `UserInputOptionsSchema`.

`EmailSchema` accepts a 2+ character alphabetic TLD **or** a Punycode/IDN `xn--…` TLD (e.g. `.xn--p1ai` for `.рф`), so internationalized domains are not rejected. It is kept in sync with the `EmailAddress` brand in `@resq-systems/email-templates`.

### Types

Exported types: `ThreatDetectionResult`, `ThreatFinding`, `ThreatType`, `ThreatDetectionConfig`, `PIIRedactionOptions`, `UserInputOptions`, `SanitizedString`, `SafeUrl`, `Email`, `PhoneNumber`, `SSN`, `CreditCard`, `IPv4`, `UrlProtocol`. Crypto brands: `Ciphertext`, `EncryptionKey`, `SecureToken`, `Sha256Hex`, `Masked`.

## Prerequisites

- **Runtime**: Bun 1.1+ or Node.js 20+
- **Peer Dependencies**: `effect` (v4.0.0-beta.93+)

## Configuration

- **Crypto Key**: Ensure `ENCRYPTION_KEY` is set for cryptographic modules. Any non-empty secret works -- scrypt stretches it into a 256-bit AES key -- but a high-entropy value (>= 32 bytes) is strongly preferred. Brand it once with `toEncryptionKey` before passing it to `encryptData`/`decryptData`.

## Testing

```sh
bun --filter @resq-systems/security test
```

## Troubleshooting

- **Strict JSON parsing error**: Stricter `ts-reset` settings type `JSON.parse` as `unknown`. Use the provided `sanitizeJson` / `parseJsonWithSchema` wrapper helpers to cast to safe formats.


## License

Apache-2.0
