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

# @resq-sw/security

> Encryption, threat detection, input validation, PII sanitization, and Effect Schema validators.

## Installation

```bash
bun add @resq-sw/security effect
```

Peer dependency: `effect`. Uses Node.js `crypto` module for encryption.

## Quick Start

```ts
import { encryptData, decryptData, isSafeInput, escapeHtml, redactPII } from "@resq-sw/security";

// Encrypt/decrypt
const encrypted = await encryptData("sensitive", "my-secret-key");
const decrypted = await decryptData(encrypted, "my-secret-key");

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

#### `encryptData(plaintext, encryptionKey): Promise<string>`

Encrypts data using AES-256-GCM with scrypt key derivation.

- **plaintext** (`string`) -- data to encrypt.
- **encryptionKey** (`string`) -- encryption key/password.
- Returns base64 string containing `salt:iv:authTag:ciphertext`.

#### `decryptData(encryptedData, encryptionKey): Promise<string>`

Decrypts data produced by `encryptData`.

- **encryptedData** (`string`) -- base64-encoded encrypted data.
- **encryptionKey** (`string`) -- same key used for encryption.
- Returns the original plaintext string.

#### `hashData(data): string`

Hashes data using SHA-256. Non-reversible.

- Returns hex-encoded hash string.

#### `generateSecureToken(length?): string`

Generates a cryptographically secure random token.

- **length** (`number`, default `32`) -- byte length.
- Returns hex string (2x the byte length).

#### `maskPII(data): string`

Masks a string, showing first 2 and last 2 characters (e.g. `"Al****ce"`). Returns `"****"` for strings <= 4 chars.

#### `maskEmail(email): string`

Masks email local part (e.g. `"j***n@example.com"`).

#### `sanitizeForLogging(obj, sensitiveFields?): Partial<T>`

Recursively redacts sensitive fields from an object for safe logging.

- **sensitiveFields** (`string[]`, default: `["password", "passwordHash", "token", "secret", "twoFactorSecret", "apiKey"]`)
- Email fields are automatically masked.

```ts
sanitizeForLogging({ password: "secret", email: "john@example.com", name: "John" });
// { password: "[REDACTED]", email: "j***n@example.com", name: "John" }
```

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
| `redactIPs` | `boolean` | `true` | `[IP_ADDRESS]` |
| `customPatterns` | `Array<{ pattern, replacement }>` | `[]` | custom |

#### `safeStringify(obj, sensitiveKeys?, indent?): string`

JSON.stringify with automatic redaction of sensitive keys.

- **sensitiveKeys** (`string[]`, default: `["password", "token", "apiKey", "secret", "authorization", "cookie", "ssn", "creditCard"]`).

### Validation Helpers

| Function | Description |
|----------|-------------|
| `isValidEmail(email)` | Validates email format |
| `isValidPhone(phone)` | Validates US phone format |
| `isValidSSN(ssn)` | Validates US SSN format |
| `isValidUrl(url)` | Validates safe URL |

### Effect Schemas

Exported for runtime validation: `SafeUrlSchema`, `EmailSchema`, `PhoneNumberSchema`, `SSNSchema`, `CreditCardSchema`, `IPv4Schema`, `SanitizedStringSchema`, `UrlProtocolSchema`, `PIIRedactionOptionsSchema`, `UserInputOptionsSchema`.

### Types

Exported types: `ThreatDetectionResult`, `ThreatFinding`, `ThreatType`, `ThreatDetectionConfig`, `PIIRedactionOptions`, `UserInputOptions`, `SafeUrl`, `Email`, `PhoneNumber`, `SSN`, `CreditCard`, `IPv4`, `UrlProtocol`.

## License

Apache-2.0
