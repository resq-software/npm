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

# OWASP WSTG coverage

What `@resq-systems/security` detects, what it deliberately does not, and why.

Audited against the [OWASP Web Security Testing Guide](https://github.com/OWASP/www-project-web-security-testing-guide)
v4.2 across 104 tests in INPV, CLNT, CONF, IDNT, ATHZ, SESS, ERRH, CRYP, BUSL, and APIT.

**Section 2 is the important one.** A coverage list that enumerates only strengths
invites the reader to assume the gaps are covered too. Everything recorded there is a
weakness WSTG tests for where a signature would report a clean verdict on a genuinely
vulnerable request — so a regex is not merely unhelpful there, it is actively
misleading.

---

## 1. Covered

132 rules across 22 categories. `THREAT_RULES` is the authoritative list; this table
maps WSTG tests onto it.

> **On the audit's own limits.** The audit examined 104 tests but adversarially verified
> only 12 — 92 were capped out. Five of those leads were later re-measured, and **all
> five reproduced as open**; none had been closed incidentally. They were: double
> encoding beyond traversal, Unicode and overlong-UTF-8 line breaks, XSS rules missing
> the `xml` context, engine-specific SQL file and out-of-band primitives, and LDAP DN
> injection. All five are now closed. Treat the remaining unverified candidates the same
> way — as leads to measure, never as covered ground.

| WSTG | Test | Rule family |
|---|---|---|
| INPV-01/02, CLNT-01/02/03 | XSS (reflected, stored, DOM), HTML injection | `XSS-*` (18) |
| INPV-04 | HTTP parameter pollution — injected-parameter half | `PARAM-POLLUTION-*` (2) |
| INPV-05 | SQL and NoSQL injection | `SQL-*` (15), `NOSQL-*` (4) |
| INPV-06 | LDAP injection | `LDAP-*` (3) |
| INPV-07 | XML injection, XXE | `XML-*` (5) |
| INPV-08 | SSI injection | `SSI-DIRECTIVE-001` |
| INPV-09 | XPath injection | `XPATH-*` (4) |
| INPV-10, INPV-15, INPV-17 | IMAP/SMTP injection, response splitting, host header | `HEADER-*` (3) |
| INPV-11, ATHZ-01 | Local and remote file inclusion | `LFI-*`, `RFI-*` (5) |
| INPV-12 | Command injection | `CMD-*` (7) |
| INPV-18 | Server-side template injection | `SSTI-*` (12) |
| INPV-19 | SSRF | `SSRF-*` (13) |
| ATHZ-01 | Path traversal | `PATH-*` (11), `resolveContainedPath` |
| ATHZ-03 | Prototype pollution | `PROTO-POLLUTION-*` (3) |
| IDNT-02/05 | Username spoofing, confusable collision | `UNICODE-*`, `analyzeIdentifier` |
| SESS-04, CRYP-03 | Credential exposure in URLs and logs | `CRED-*` (4) |
| SESS-10 | Unsecured JWT (`alg:none`) | `JWT-*` (2) |
| BUSL-08 (partial) | Spreadsheet formula injection | `CSV-*` (2) |
| — | Log forging, prompt injection, resource abuse | `LOG-*`, `PROMPT-*`, `RESOURCE-*` |

Prevention helpers, which are the actual controls: `resolveContainedPath`,
`sanitizeFilename`, `escapeHtmlText`, `escapeHtmlAttribute`, `sanitizeHtml`
(DOMPurify), `sanitizeUrl`, `redactPII`, `safeStringify`, `validatePersonName`,
`analyzeIdentifier`.

---

## 2. Honest non-coverage

### Request metadata the engine never receives

`scanForThreats` takes **one value**. It has no view of the request line, the route
table, the parameter map, or any other field.

- **INPV-03, CONF-06 — HTTP verb tampering.** The weakness lives in method-scoped
  authorization config. `X-HTTP-Method-Override: DELETE` is a legitimate framework
  idiom; a pattern would match correct usage as often as abuse.
  *Control: allowlist method override per route; align constrained verbs with served
  verbs.*
- **INPV-04 — duplicate-key pollution.** The exploit is parser disagreement between
  tiers, not string content. Duplicate keys are legal and routine (`?tag=a&tag=b`).
  *Control: `URLSearchParams.getAll(key)`, reject `length > 1`.*
- **INPV-16 — HTTP incoming requests.** An observation activity, not a weakness class.
  The relationship runs the other way: findings and anomaly scores *are* the telemetry
  such a setup consumes.

### Response and configuration properties

- **INPV-15 — request smuggling (CL.TE / TE.CL / TE.TE).** A disagreement between two
  parsers about where one request ends, expressed across several headers. A
  value-level `chunked` rule fires on ordinary traffic and misses every real vector.
  *The splitting half is covered by `HEADER-CRLF-001`.*
  *Control: a front end that normalizes or rejects ambiguous framing; HTTP/2 end to end.*
- **CLNT-07 — CORS.** ACAO reflection, `*` with credentials, `null` origin, and prefix
  matching are response-policy properties. `Origin: https://evil.example` correctly
  scores 0 — it is not distinguishable by inspection.
- **CLNT-09 — Clickjacking.** A *missing response header* has no input surface.
  `XSS-DANGEROUS-TAG-001` covers injected framing markup only; do not mistake it for
  clickjacking defence.
  *Control: `X-Frame-Options: DENY` or CSP `frame-ancestors 'none'`.*
- **CONF-01/02/05/07/08/09/10/11/12, SESS-02, CRYP-01/04.** Port exposure, deployment
  review, admin-route auth, HSTS/CSP/cookie attributes, file modes, provider
  fingerprinting, bucket ACLs, cipher negotiation. All observed by `stat`, a handshake,
  a DNS query, or a header parse. CONF-05 would be worse than useless: `/admin` is a
  legitimate path on any product with an admin console.

### Authorization and identity decisions

- **ATHZ-02 bypass, ATHZ-04 IDOR, INPV-20 mass assignment, BUSL-02 forged requests.**
  An object identifier is byte-identical in the attack and the normal case, and the
  *same* key is benign on an admin route and escalating on a self-service one. A
  privileged-key-name regex would fire constantly on admin traffic and still miss the
  app-specific field.
  *Control: per-endpoint key allowlists, Effect Schema `onExcessProperty: "error"`,
  server-side entitlement checks.*
- **IDNT-04 — account enumeration.** The signal is a *difference between two responses*.
  A stateless single-value scanner has no notion of a response, let alone two.

### Stateful and temporal properties

- **SESS-01 entropy, SESS-05 CSRF, SESS-06/07 logout and timeout, CRYP-02 padding
  oracle, BUSL-04 timing, BUSL-05 usage limits, BUSL-06 workflow circumvention.** A
  forged CSRF request is byte-identical to a genuine one — that *is* the weakness.
  Entropy is a property of the generator, not of one sample. Padding oracles require
  many mutated ciphertexts compared across responses.
  *Control: `crypto.ts` for randomness and key derivation; `@resq-systems/rate-limiting`
  for BUSL-05; server-side workflow state.*

### The context model's own consequence

- **INPV-14 — incubated / second-order.** No signature detects "this value will be
  dangerous later, in a different context". `<script>alert(1)</script>` scores 0 in
  `general_text` and 6 in `html`; `o'brien'--` scores 0 in `general_text` and fires in
  `sql`. A team that scans once at the write boundary and never again at the sink has
  exactly this vulnerability. **Scanning at the trust boundary is not a substitute for
  encoding at each sink** — it never was, and the context model makes that explicit
  rather than hiding it.

### Refused deliberately

- **A base64-decode variant.** It would manufacture arbitrary bytes from JWTs, session
  tokens, image data URIs, and content hashes, then evaluate every rule against that
  noise — a direct violation of the zero-false-positive requirement. Scan at the point
  where the application decodes, using the sink's real context.

---

## 3. The prevention surface

Detection was never the shortfall for these. Each is a decision function that fails
closed, shipped under `@resq-systems/security/controls`.

| WSTG | Control | Shape |
|---|---|---|
| CLNT-07 | `isAllowedOrigin` / `normalizeOrigin` / `checkCorsResponsePolicy` | Exact comparison after canonicalization. No prefix, suffix, or substring path exists through it; `null` and `*` are refused; subdomain matching is opt-in and anchored on label boundaries. |
| SESS-05 | `createCsrfToken` / `verifyCsrfToken` | Signed double-submit. HMAC-SHA256 over length-prefixed fields, constant-time and length-blind comparison, signed expiry, optional session binding. |
| BUSL-08/09 | `assertUploadType` / `detectFileSignature` | Requires the declared `Content-Type`, the filename extension, and the magic bytes to agree on one allowlisted type. |
| CLNT-13 | `validateJsonpCallback` | Identifier allowlist — a JSONP callback name is concatenated into executable JavaScript, so escaping is not an option. |
| APIT-01 | `analyzeQueryComplexity` | Computed depth/alias/field bound, string- and comment-aware. |
| CLNT-14 | `sanitizeHtml` hook | DOMPurify `afterSanitizeAttributes` adding `rel="noopener noreferrer"` to non-self `target` links. |

**What these do not cover.** They are single-value decisions, so the stateful half of
each weakness stays with the caller: CSRF still needs `SameSite` cookies and origin
validation alongside the token; `assertUploadType` reads only the head, so a polyglot
with a valid header and its payload in the tail passes; `analyzeQueryComplexity` is a
bound, not a cost model, and a production GraphQL server should still run cost analysis.

### Still not shipped

| Gap | Why it is hard |
|---|---|
| Signed round-trip values (BUSL-03) | Integrity of a client-held value needs the server's own copy, or an HMAC envelope with a defined replay window. |
| Decompression-bomb limits (BUSL-09) | Requires archive introspection and a computed expansion ratio, not a head read. |

### Review record

These controls were adversarially reviewed by five independent attackers before
release: 40 breaks claimed, 4 confirmed and fixed. The confirmed ones are recorded here
because each was a *fail-open* — the failure mode that makes a control worse than none,
since the caller's own round-trip test still passes and reinforces false confidence.

1. **Non-string `sessionId` collapsed CSRF binding** (high). Template-stringifying an
   object yields `"[object Object]"` for every session, so one attacker-minted token
   verified `{valid: true}` against arbitrary victim sessions. Now rejected at both mint
   and verify.
2. **Unpaired surrogates broke signature injectivity** (low). `createHmac().update()`
   encodes UTF-8 and maps every lone surrogate to the same replacement bytes, while
   `String.length` counts UTF-16 code units — so `"tenant-\uD800"` and its replacement
   form signed identically. Now rejected as ill-formed.
3. **`mp4` matched four bytes at offset 4 with offset 0 unconstrained** (medium).
   `<!--ftyp--><script>alert(1)</script>` was detected as video and accepted as
   `clip.mp4`. Now requires an ISO-BMFF brand at offset 8 and sits below every
   offset-0 signature so it can never shadow one.
4. **Fractional `ttlMs` injected the field separator** (low; failed closed). Produced a
   four-part token the module's own verifier rejected. Now requires an integer.

---

## 4. Deferred: `unsafe_upload` (BUSL-08, BUSL-09)

Specified and verified but **not implemented**, because it needs a design decision
first.

Verified absent today: `shell.php.jpg`, `avatar.jpg.php`, `.htaccess`, `web.config`,
`shell.phtml`, `shell.php::$DATA`, `evil.pHp5`, `shell.php.`, and
`AddType application/x-httpd-php .jpg` all score 0/allow in every context.
`sanitizeFilename` is hygiene only: `.htaccess` becomes `htaccess` and `shell.php.`
becomes `shell.php` — both outputs still dangerous.

The shape is a new `unsafe_upload` type (CWE-434), new `upload_filename` and
`file_content` contexts, six filename rules, and five body rules.

> **Blocking engine constraint.** `file_content` must **not** join
> `ALL_THREAT_CONTEXTS`. `CONTROL-CHAR-001` and `UNICODE-BIDI-OVERRIDE-001` use that
> list, and `CONTROL-CHAR-001` fires on the raw headers of PNG, JPEG, ZIP, and GIF.
> Because `isSafe` is documented as strictly stronger than `verdict === "allow"`, any
> caller gating on `isSafe` would then reject **every binary upload**. Either list the
> new contexts per-rule and exclude them from the universal set, or extend the
> `INVISIBLE_CONTEXTS` opt-in pattern.
>
> Adding `upload_filename` to the universal set *is* desirable — it extends
> `UNICODE-BIDI-OVERRIDE-001` to the `invoice<U+202E>gnp.exe` trick already sitting in
> the evasion corpus.
>
> Second constraint: `MAX_SCAN_LENGTH` is 100 000, so a shell appended after 100 KB of
> image data is missed. `truncated: true` is returned; document "scan head **and**
> tail, or raise `maxLength` for this context".

Any `primaryControl` written for these rules must state that the extension denylist is
telemetry and is bypassed by any extension not listed. The real controls are a
server-side allowlist, a generated stored filename, storage outside the webroot, and
serving uploads from a separate origin with a fixed `Content-Type` and
`Content-Disposition: attachment`.
