<!--
  Copyright 2026 ResQ

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

# ASVS conformance

What this package provides toward the [OWASP Application Security Verification
Standard](https://github.com/OWASP/ASVS) 5.0, and — more usefully — what it does not.

Pinned to OWASP/ASVS commit `cdc8a0f68ac2a9f9e3739266acdac0e4a98badee`. Requirement IDs
churned substantially between 4.0 and 5.0, so a map without a pinned source is
unverifiable.

## Read this first

**OWASP "does not certify any vendors, verifiers, or software."** Nothing here is a
certification, and nothing here makes an application conformant.

ASVS scopes itself to *the software product being developed*. A library is not that
product. Requirement 1.2.4 asks that database queries be parameterized — this package
cannot parameterize your queries, and no export it ships changes whether you did. What a
library can do is supply a control the application uses to satisfy a requirement, and
that is the only claim made below.

The standard asks that scope be stated "from the perspective of what was included rather
than what was not included", with "an opinion on the rationale of excluding the
requirements which haven't been implemented". Sections 2 and 3 are that rationale.

**Scope of this map.** Chapters V1 (Encoding and Sanitization), V11 (Cryptography) and
V16 (Security Logging and Error Handling), because that is where this package's exports
live. Chapters covering authentication, session management, authorization, OAuth,
configuration and secure communication are out of scope: they describe application and
infrastructure behaviour, and this package exports nothing that participates in them.
See [WSTG-COVERAGE.md](WSTG-COVERAGE.md) for the detection surface, which is indexed
differently and covers different ground.

## 1. Supported by an export

Each row names a control an application can use, and the test proving that control exists
and behaves. Satisfying the requirement remains the application's job.

| Requirement | Level | What it asks | Exports | Proving test |
|---|---|---|---|---|
| 1.2.1 | 1 | Context-relevant output encoding for HTML element and attribute contexts | `escapeHtmlText`, `escapeHtmlAttribute`, `escapeHtml` | `tests/encoder-conformance.test.ts` |
| 1.2.2 | 1 | Encode untrusted data in URLs; permit only safe protocols | `sanitizeUrl`, `resolveRedirectTarget` | `tests/controls.test.ts` |
| 1.2.3 | 1 | Encode when dynamically building JavaScript or JSON content | `encodeJsonForScript` | `tests/validators.test.ts` |
| 1.2.10 | 3 | RFC 4180 escaping, and a leading quote on formula-trigger characters | `escapeCsvField`, `toCsvRow` | `tests/validators.test.ts` |
| 1.3.1 | 1 | Sanitize untrusted HTML with a well-known library | `sanitizeHtml` | `tests/sanitize.test.ts` |
| 1.3.6 | 2 | Validate against an allowlist of protocols, domains, paths and ports before calling another service | `assertOutboundUrl`, `classifyAddress`, `isPubliclyRoutableAddress` | `tests/controls.test.ts` |
| 1.3.12 | 3 | Regular expressions free from exponential backtracking | `THREAT_RULES` | `tests/regex-safety.test.ts` |
| 11.2.4 | 3 | Constant-time comparison, no short-circuit returns | `verifyCsrfToken` | `tests/controls.test.ts` |
| 11.3.2 | 1 | Only approved ciphers and modes, such as AES with GCM | `encryptData`, `decryptData` | `tests/crypto.test.ts` |
| 11.3.3 | 2 | Encrypted data protected against modification by authenticated encryption | `encryptData`, `decryptData` | `tests/crypto.test.ts` |
| 11.4.1 | 1 | Only approved hash functions; MD5 must not be used | `hashData` | `tests/crypto.test.ts` |
| 11.5.1 | 2 | Non-guessable values from a CSPRNG with at least 128 bits of entropy | `generateSecureToken` | `tests/crypto.test.ts` |
| 16.2.5 | 2 | Enforce logging by protection level; mask or hash sensitive fields | `redactPII`, `maskPII`, `maskEmail`, `sanitizeForLogging` | `tests/sanitize.test.ts` |
| 16.4.1 | 2 | Logging components encode data to prevent log injection | `encodeLogValue`, `stripAnsi` | `tests/validators.test.ts` |
| 16.5.1 | 2 | A generic message on error, exposing no internal detail | `getThreatErrorMessage` | `tests/validators.test.ts` |

`generateSecureToken` defaults to 32 bytes — 256 bits, comfortably above 11.5.1's
128-bit floor.

**1.2.1 covers the element and attribute contexts only.** The requirement also names HTTP
header fields, and nothing here satisfies that half. `escapeHtml` and `escapeHtmlText`
pass CR and LF through unchanged, so neither prevents header splitting.
`escapeHtmlAttribute` does neutralize them, but into `&#x0D;&#x0A;` — right inside a
quoted attribute, and a corrupted value in a header, whose grammar has never heard of an
HTML entity. The `HEADER-*` rules report a line break in a value, which is detection, not
a control. The control is the HTTP layer refusing the value — undici's `Headers` and
Node's `ServerResponse.setHeader` both reject CR/LF — and this package deliberately does
not add a fourth encoder to duplicate it. `tests/encoder-conformance.test.ts` pins all of
this, so the paragraph fails a test rather than merely aging.

## 2. Detected but not controlled

The package raises a finding for these. It does not satisfy the requirement, and claiming
otherwise would present a signature as a control — the failure mode this package exists
to avoid.

| Requirement | Level | Why detection is not the control |
|---|---|---|
| 1.2.4 | 1 | The requirement is parameterized queries. `SQL-*` and `NOSQL-*` rules report that a value *looks* like SQL; only the caller can bind it as a parameter. |
| 1.2.5 | 1 | The requirement is parameterized OS calls. `CMD-*` rules are telemetry; the control is spawning with an argv array and no shell. |
| 1.2.6 | 2 | LDAP rules escape nothing. The control is RFC 4515 and 4514 escaping at the directory client. |
| 1.2.7 | 2 | XPath rules detect axis and function abuse; the control is a precompiled, parameterized query. |
| 1.3.7 | 2 | `SSTI-*` rules detect template syntax. The control is not building templates from untrusted input at all. |
| 1.5.1 | 1 | `XML-*` rules detect doctype and entity declarations. The control is parser configuration, which lives in the application. |

## 3. Not covered, and why

| Requirement | Level | Reason |
|---|---|---|
| 1.1.1 | 2 | Decode-once is a property of the application's pipeline. The scanner builds canonicalization variants to *match* against; it does not decode on the application's behalf, and the double-encoding rules exist precisely because the application may decode twice. |
| 1.1.2 | 2 | Whether encoding happens as the final step before the interpreter is a property of the call site, not of the encoder. |
| 1.2.8 | 2 | LaTeX processor configuration. No export here participates. |
| 1.2.9 | 2 | Escaping metacharacters in caller-supplied regular expressions. No export here participates. |
| 1.3.4 | 2 | SVG sanitization is already handled by `sanitizeHtml`'s DOMPurify defaults; a separate SVG sanitizer was evaluated and rejected as duplicate. |
| 1.4.1 | 2 | Memory safety. Not applicable to TypeScript. |
| 1.5.2 | 2 | Deserialization safety belongs to the parser the application chooses. `parseJsonWithSchema` narrows a parsed value; it does not make deserialization safe. |
| 1.5.3 | 3 | Parser differentials across components. This package exposes one parser's view; reconciling several is an application-architecture concern. |
| 11.1.1 | 2 | Key management policy and lifecycle are organizational, not library, concerns. |
| 11.4.2 | 2 | Password storage. Deliberately absent — this package ships none, and a half-built password hash is worse than none at all. |
| 11.4.4 | 2 | Key derivation from passwords, for the same reason. |
| 16.2.1 | 2 | Log metadata is a property of the logging pipeline. |
| 16.4.2 | 2 | Log storage protection is infrastructure. |
| 16.4.3 | 2 | Log transport to a separate system is infrastructure. |
| 16.5.3 | 2 | Failing securely is application structure, not a control a dependency supplies. |

## 4. What is actually claimed

Seven Level 1 requirements have an export behind them, each with a proving test. That is
the whole claim.

No Level 2 or Level 3 *application* conformance is claimed anywhere. The Level 2 and
Level 3 rows in section 1 mean only that a control exists — not that an application using
it conforms. An application achieves an ASVS level; a dependency does not confer one.

`tests/asvs-conformance.test.ts` parses this file and fails when a named export stops
resolving, a named test file disappears, or a requirement ID appears in more than one
section. Without it, this document would rot into a claim nobody re-checks.
