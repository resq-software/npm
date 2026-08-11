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

### Threat Detection (`threats/`)

> **Detection is not the control.** Every rule carries a `primaryControl` string naming
> what actually prevents the weakness. Parameterized queries stop SQL injection;
> context-correct output encoding and DOMPurify stop XSS; `resolveContainedPath` stops
> traversal; spawning with an argv array stops command injection. Use findings for
> telemetry, risk scoring, rate limiting, and review — never as the only barrier.

#### `scanForThreats(input, options?): ThreatScanResult`

Evaluates only the rules that apply to the **sink the value is bound for**. Declaring
the context is the package's primary false-positive control: a biography containing
`C:\Windows`, a ticket containing `1=1`, and a question containing `eval(` are all
ordinary text, and only become evidence when the value reaches a filesystem, SQL, or
HTML sink.

```ts
import { scanForThreats } from "@resq-systems/security/threats";

const result = scanForThreats(req.query.file ?? "", { contexts: ["filesystem"] });

if (result.verdict === "block") {
  // Log an allowlist, never the findings themselves: `matchedPattern` carries an
  // excerpt of the input, which for a `credential_exposure` hit is the credential.
  logger.warn("traversal attempt", {
    rules: result.findings.map(({ ruleId, type, severity, cwe }) => ({
      ruleId,
      type,
      severity,
      cwe,
    })),
  });
  return new Response("Bad request", { status: 400 });
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `contexts` | `ThreatContext[]` | `["general_text"]` | Sinks the value reaches. The default enables only universal rules (bidi, invisible, control chars) |
| `maxLength` | `number` | `100_000` | Truncation bound |
| `scanVariants` | `boolean` | `true` | Also scan NFC, percent-decoded, and HTML-decoded forms |
| `minSeverity` | `ThreatSeverity` | `"low"` | Drop findings below this severity |
| `excludeRuleIds` | `string[]` | — | Silence individual rules. Prefer this to disabling a category |
| `policy` | `ThreatPolicy` | `{ reviewAt: 4, blockAt: 8 }` | Score thresholds |

Returns `{ isSafe, score, verdict, findings, types, truncated }`. Each finding carries
`ruleId`, `type`, `severity`, `confidence`, `cwe`, `primaryControl`, `variant`,
`matchedPattern`, `start`, and `end`.

**Contexts:** `general_text`, `html`, `sql`, `nosql`, `shell`, `filesystem`, `url`,
`url_parameter`, `http_header`, `jwt`, `identifier`, `object_merge`, `template`, `xml`,
`ldap`, `xpath`, `spreadsheet`, `log`, `llm_prompt`.

Two draw deliberately fine distinctions. `url_parameter` is a *single value* about to be
concatenated into a query string, where `&role=` is an injected parameter — as opposed
to `url`, where it is ordinary grammar. `jwt` is scoped to the token itself; to check a
`kid` or `jku` claim, extract it and declare *its* real sink (`filesystem`, `sql`,
`url`), which the existing rules already cover.

**Categories:** `xss`, `sql_injection`, `nosql_injection`, `command_injection`,
`path_traversal`, `prototype_pollution`, `homoglyph`, `header_injection`,
`ldap_injection`, `xpath_injection`, `xml_injection`, `template_injection`,
`file_inclusion`, `ssrf`, `formula_injection`, `log_injection`, `prompt_injection`,
`parameter_pollution`, `credential_exposure`, `jwt_tampering`, `resource_abuse`.

`credential_exposure` runs the opposite way to every other category: it detects the
application's own secret *leaving* — in a URL it is about to fetch, or a line it is
about to log — so a finding usually means your code is at fault, not the submitter's.

**Canonicalization.** Each scan evaluates the raw string plus whichever of `nfc`,
`nfkc`, `percent_decoded`, and `html_decoded` differ from it, and the finding records
which one matched. `nfkc` matters more than it sounds: NFC is a documented no-op on
compatibility characters, so before it was added, fullwidth `．．／．．／etc／passwd` and
`＜script＞` bypassed every signature in the catalog.

#### Scoring

Any individual signature produces false positives, so a single low-confidence hit
raises a signal rather than rejecting a submission. Score is
`severityWeight x confidenceMultiplier`, counted once per rule:

| Severity | Weight | Confidence | Multiplier |
|----------|--------|------------|------------|
| `low` | 1 | `low` | 0.5 |
| `medium` | 2 | `medium` | 1 |
| `high` | 4 | `high` | 1.5 |
| `critical` | 8 | | |

`score < 4` is `allow`, `< 8` is `review`, `>= 8` is `block`.

Helpers: `calculateThreatScore`, `verdictForScore`, `scoreForFinding`,
`summarizeByType`, `THREAT_RULES`, `getRulesForContexts`, `buildInputVariants`.

#### Individual Detectors

Thin wrappers that scan one context and return at most one `ThreatFinding`:

| Function | Context | Detects |
|----------|---------|---------|
| `containsXSSPatterns(input)` | `html` | Script tags, event handlers, `javascript:` URIs, `eval()` |
| `containsPrototypePollution(input)` | `object_merge` | `__proto__`, `constructor.prototype` as property paths |
| `containsSQLInjection(input)` | `sql` | UNION SELECT, DROP TABLE, quoted tautologies, SLEEP, stacked queries |
| `containsNoSQLInjection(input)` | `nosql` | MongoDB operators (`$gt`, `$where`, `$function`) |
| `containsCommandInjection(input)` | `shell` | Command substitution, piped shells, chained commands |
| `containsPathTraversal(input)` | `filesystem` | Directory traversal, NUL bytes, sensitive paths |
| `containsHomoglyphs(input)` | `identifier` | UTS #39 mixed-script and bidirectional spoofing |

### Unicode Identifier Security (`unicode/`)

Scope these to **protected identifiers** — usernames, domains, org names, package
names. UTS #39 warns that broad confusable detection flags many legitimate strings, so
do not run them on prose or on people's names. `containsBidiControls` is the exception
and is safe anywhere.

```ts
import { analyzeIdentifier } from "@resq-systems/security/unicode";

const candidate = analyzeIdentifier(requestedUsername);
if (await skeletonIndex.has(candidate.skeleton)) {
  return { error: "That name is too similar to an existing account" };
}
// Store `candidate.original` for display, index `candidate.skeleton`.
```

| Function | Purpose |
|----------|---------|
| `analyzeIdentifier(input)` | `{ original, normalized, skeleton, scripts, isMixedScript, restrictionLevel, hasInvisibleCharacters, hasBidiControls }` |
| `getSkeleton(input)` | Opaque confusable comparison key. Compare it, never display it |
| `areConfusable(a, b)` | Whether two distinct strings share a skeleton |
| `getScripts(input)` | Scripts present, script-neutral characters excluded |
| `getRestrictionLevel(input)` | `ascii_only`, `single_script`, `highly_restrictive`, `moderately_restrictive`, `minimally_restrictive`, `unrestricted` |
| `isSafeIdentifier(input, max?)` | Policy check, default max `moderately_restrictive` |
| `containsBidiControls(input)` | Trojan Source (CVE-2021-42574). Hostile in any field |
| `stripInvisibleCharacters(input)` | Remove zero-width and bidi code points |

`Ольга Иванова`, `東京タワー`, and `서울-Seoul` pass. `pаypal` (with a Cyrillic `а`) and
a filename carrying U+202E do not.

### Path Containment (`paths.ts`) — Node only

The prevention half of CWE-22. Not exported from the package root, since it imports
`node:path`.

```ts
import { resolveContainedPath } from "@resq-systems/security/paths";

const target = resolveContainedPath("/srv/uploads", req.body.filename);
if (target === null) return new Response("Bad request", { status: 400 });
```

| Function | Purpose |
|----------|---------|
| `resolveContainedPath(base, untrusted, opts?)` | Resolved absolute path, or `null` when it escapes the base |
| `isPathContained(base, candidate, opts?)` | Boolean form |
| `sanitizeFilename(name, fallback?)` | Reduce to one safe path segment. Hygiene, not the control |

Performs **no** filesystem I/O, so it cannot see symlinks. When the target may exist and
may be a link, `realpath` both sides and re-check.

### Preventive Controls (`controls/`) — Node only

Some weaknesses cannot be detected, only prevented. A forged CSRF request is
byte-identical to a genuine one; `Origin: https://evil.example` is shaped exactly like a
legitimate origin; an upload's danger lies in three values *disagreeing*. Each of these
is a decision function that fails closed.

```ts
import {
  assertUploadType,
  isAllowedOrigin,
  verifyCsrfToken,
} from "@resq-systems/security/controls";

if (!isAllowedOrigin(req.headers.origin ?? "", ALLOWED_ORIGINS)) return forbid();

const csrf = verifyCsrfToken(req.headers["x-csrf-token"], SECRET, {
  sessionId: session.id,
});
if (!csrf.valid) return forbid();
```

| Function | Prevents |
|----------|----------|
| `isAllowedOrigin(origin, allowlist, opts?)` | CORS misconfiguration. Exact match only — no prefix, suffix, or substring path exists through it. `null` and `*` refused; subdomain matching is opt-in and label-boundary anchored |
| `normalizeOrigin(origin)` | Returns the canonical origin, or `null` when the value carries a path, query, or userinfo |
| `checkCorsResponsePolicy(policy)` | The credentialed-wildcard mistake (`ACAO: *` with `ACAC: true`) |
| `createCsrfToken(secret, opts?)` / `verifyCsrfToken(token, secret, opts?)` | CSRF. Signed double-submit: HMAC-SHA256 over length-prefixed fields, constant-time length-blind comparison, signed expiry, optional session binding |
| `assertUploadType(candidate)` | Unrestricted upload. Requires the declared `Content-Type`, the filename extension, and the magic bytes to agree on one allowlisted type |
| `detectFileSignature(headBytes)` | Identifies a file from its leading bytes |
| `validateJsonpCallback(name)` | XSSI. A JSONP callback name is concatenated into executable JavaScript, so an allowlist is the only safe validation |
| `analyzeQueryComplexity(query, limits?)` | Query-depth denial of service. Computed depth/alias/field bound, string- and comment-aware |
| `analyzeGraphQLRequest(body, limits?)` | Batched-request denial of service (API4). `analyzeQueryComplexity` measures one document; on an array batch the documented `req.body.query` call reads `undefined` and passes 250 operations. Counts top-level operations across the batch |
| `resolveRedirectTarget(target, opts?)` | Open redirect (CWE-601). Allowlist: a same-site path, or an absolute URL whose host you named. Tests for control characters *before* testing for an authority, because tab/LF/CR escape the origin and the authority test cannot see them |
| `classifyAddress(host)` / `isPubliclyRoutableAddress(host)` | Classifies an IP literal against the IANA special-purpose registries, unwrapping IPv4-mapped IPv6. Returns `null` for a name — *unknown*, not safe |
| `assertOutboundUrl(url, policy?)` | SSRF. Default-deny: with no allowlist and `allowPublicHosts` off, even a hostname is refused, because nothing here can know what DNS will answer. A pre-connection check — redirects need re-validation per hop and egress control remains the durable fix |
| `checkJsonPayloadLimits(text, limits?)` | Unrestricted resource consumption (API4). One linear pass over the JSON *text* — depth, container sizes, string lengths — before `JSON.parse` allocates the graph. Reports rather than enforces |

`sanitizeHtml` also registers a DOMPurify hook adding `rel="noopener noreferrer"` to
links with a non-self `target`, preventing reverse tabnabbing. It is a no-op under
DOMPurify's default config, which strips `target` — it matters when you opt back in with
`ADD_ATTR: ["target"]`.

**Each of these is one layer.** CSRF tokens need `SameSite` cookies and origin validation
beside them; `assertUploadType` reads only the head, so store uploads outside the webroot
and serve them from a separate origin with `Content-Disposition: attachment`. See
[WSTG-COVERAGE.md](WSTG-COVERAGE.md) §3 for what each one does *not* cover.

### Output Encoding and Field Validators (`validators.ts`)

Output encoding is context-dependent — HTML text, attributes, URLs, JS strings, and CSS
each have different rules, and no single function is correct for all of them.

| Function | Use for |
|----------|---------|
| `escapeHtmlText(input)` | Element text and fully quoted attribute values |
| `escapeHtmlAttribute(input)` | Attribute values, including unquoted ones |
| `sanitizeUrl(url)` | URLs (see Sanitization below) |
| `sanitizeHtml(html)` | Values meant to *be* markup — DOMPurify |

There is deliberately no JavaScript- or CSS-context escaper: hand-rolled versions are
reliably wrong, and the fix is to stop interpolating untrusted values into script and
style source.

#### `validatePersonName(input): boolean`

Allowlist of what a name is made of — letters in any script, combining marks,
apostrophes, hyphens, periods, spaces — plus a length bound and a bidi check. It does
**not** run SQL, path-traversal, or confusable detectors: a name is not a query, a path,
or a protected identifier. Encode the value at whatever sink it reaches.

#### `validateSafeText(input): boolean`

Schema-refinement helper over `isSafeInput` with default config.

#### `validateSafeEmail(input): boolean`

RFC-shaped format check plus UTS #39 analysis of the **domain**, where a mixed-script
host is the IDN homograph attack.

#### `getThreatErrorMessage(result): string`

User-facing message for the first finding only — enumerating every category that fired
leaks the rule set to whoever is probing it. Server-side, log an allowlist of each
finding's `ruleId`, `type`, `severity` and `cwe` — enough to investigate with. Do not log
the `ThreatFinding` itself: `matchedPattern` is an excerpt of the input, so for a
`credential_exposure` or `pii_exposure` hit the log line becomes the leak.

#### Deprecated

| Deprecated | Replacement |
|------------|-------------|
| `detectThreatPatterns(input, config)` | `scanForThreats(input, { contexts })` |
| `ThreatDetectionConfig` | `ThreatScanOptions.contexts` |
| `sanitizeForDisplay(input)` | `escapeHtmlText(input)` |
| `normalizeUnicode(input)` | `getSkeleton` / `analyzeIdentifier` |
| `validateSafeName(input)` | `validatePersonName(input)` |

`isSafeInput` and the legacy toggles still work; each flag maps onto a context
(`checkXSS` to `html`, `checkSQLInjection` to `sql`, `checkNoSQLInjection` to `nosql`,
`checkCommandInjection` to `shell`, `checkPathTraversal` to `filesystem`).

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
