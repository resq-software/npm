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

# Changelog

## 2.1.0

### Minor Changes

- [#269](https://github.com/resq-software/npm/pull/269) [`2f8d7e8`](https://github.com/resq-software/npm/commit/2f8d7e8ae085bb16390a079cc998840629acc74d) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Fail closed in `analyzeGraphQLRequest` when the request body cannot be fully read

  `analyzeGraphQLRequest` measured whatever `documentsFrom` managed to extract and reported `withinLimits` from that alone. Both ways extraction can stop early returned a short list indistinguishable from a small request, so a body the analyzer could not read was reported as a body with nothing to limit.

  Reproduced against 2.0.0, with the default limits of 10 documents and 10 operations:

  | Body                                     | documents | operations | withinLimits      |
  | ---------------------------------------- | --------- | ---------- | ----------------- |
  | 150-operation batch                      | 150       | 150        | `false` — blocked |
  | the same 150, wrapped ten arrays deep    | 0         | 0          | **`true`**        |
  | the same, handed over as raw JSON text   | 0         | 0          | **`true`**        |
  | `"[".repeat(2500)` prefixed to the batch | 1         | 1          | **`true`**        |

  The first two stop at `MAX_BODY_DEPTH`, which was added to keep the "never throws" contract honest and, in doing so, turned a `RangeError` into a silent pass. The third is different: `JSON.parse` rejects the text, and the `catch` fell through to treating the whole remainder as one bare document — undercounting 150 operations to 1, by whatever margin the client chooses.

  `documentsFrom` now reports whether the walk completed, and `analyzeGraphQLRequest` fails closed when it did not, naming the reason in `exceeded`:

  - `bodyDepth` — nesting exceeded the internal walk limit, so documents past it were never seen.
  - `malformedBody` — a `[`-prefixed string was not valid JSON, so a batch could not be read at all.

  A `{`-prefixed string that fails to parse is still treated as a document: that is ordinary anonymous-shorthand GraphQL (`{ user { id } }`), and no GraphQL document starts with `[`, which is what makes the two cases separable.

  Bumped `minor` rather than `patch`. No signature changed and `exceeded` was already `readonly string[]`, so this is not `major` under the repo's rules — but a request that previously passed can now be rejected, and a caller branching on `withinLimits` will notice. Callers matching on specific `exceeded` values should expect the two new entries.

  One existing test asserted the old behaviour (`{ documents: 0, withinLimits: true }` for a 50,000-deep body). Its stated purpose — that the call never throws — is unchanged and still asserted; only the incidental claim that such a body is within limits was corrected.

## 2.0.0

### Major Changes

- [#257](https://github.com/resq-software/npm/pull/257) [`36eb35f`](https://github.com/resq-software/npm/commit/36eb35f4523c355975ae5a86a1eca665aa29334b) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Replace the flat threat-pattern arrays with a context-aware rule engine, UTS [#39](https://github.com/resq-software/npm/issues/39) identifier analysis, and CWE-22 path containment

  **New surface**

  - `@resq-systems/security/threats` — `scanForThreats(input, { contexts })` evaluates only the rules matching the sink a value is bound for, and returns graded findings (rule ID, severity, confidence, CWE, `primaryControl`, match offsets, matched variant) plus an anomaly score and an `allow`/`review`/`block` verdict. 132 rules across 22 weakness categories, following the OWASP Web Security Testing Guide's taxonomy. Adds LDAP, XPath, XML/XXE, SSTI, SSI, file inclusion, SSRF, CRLF/header, CSV formula, log forging, prompt injection, prototype pollution, HTTP parameter pollution, credential exposure, JWT tampering, and double encoding.
  - `@resq-systems/security/unicode` — `getSkeleton`, `areConfusable`, `getScripts`, `getRestrictionLevel`, `analyzeIdentifier`, `isSafeIdentifier`, `containsBidiControls`, `stripInvisibleCharacters`.
  - `@resq-systems/security/paths` (Node only) — `resolveContainedPath`, `isPathContained`, `sanitizeFilename`.
  - `@resq-systems/security/controls` (Node only) — preventive controls for weaknesses no signature can detect, each a decision function that fails closed:
    - `isAllowedOrigin` / `normalizeOrigin` / `checkCorsResponsePolicy` (CLNT-07) — exact-match CORS validation. No prefix, suffix, or substring path exists through it; `null` and `*` are refused; subdomain matching is opt-in and anchored on label boundaries.
    - `createCsrfToken` / `verifyCsrfToken` (SESS-05) — signed double-submit tokens. HMAC-SHA256 over length-prefixed fields, constant-time and length-blind comparison, signed expiry, optional session binding.
    - `assertUploadType` / `detectFileSignature` (BUSL-08/09) — requires the declared `Content-Type`, the filename extension, and the actual magic bytes to agree on one allowlisted type. This is precisely why it cannot be a rule: the weakness is three values _disagreeing_.
    - `validateJsonpCallback` (CLNT-13) — identifier allowlist, because a JSONP callback name is concatenated into executable JavaScript.
    - `analyzeQueryComplexity` (APIT-01) — computed depth/alias/field bound, string- and comment-aware.
  - `sanitizeHtml` now registers a DOMPurify `afterSanitizeAttributes` hook adding `rel="noopener noreferrer"` to links with a non-self `target` (CLNT-14). It is a no-op under DOMPurify's default config, which strips `target` outright — it matters for callers who opt back in with `ADD_ATTR: ["target"]`, which is exactly the configuration that reintroduces the risk.
  - `escapeHtmlText`, `escapeHtmlAttribute`, `validatePersonName`, `containsPrototypePollution`.

  **Fixes**

  - `/%2e%2e[%2f%5c]/` matched a single character from `{%,2,f,5,c}` rather than `%2f` or `%5c`. Now `/%2e%2e(?:%2f|%5c|\/|\\)/`, with rules added for double-encoded, mixed, and overlong-UTF-8 traversal.
  - `/0x[0-9a-f]+/` matched every CSS colour; bounded to 8+ digits.
  - `/1\s*=\s*1/` matched ordinary arithmetic; tautology rules now require an adjacent quote or paren.
  - `/C:\\Windows/` matched any prose mentioning the folder; now requires a system subdirectory.
  - The trailing-comment rule matched `#ff00aa` and `[#123](https://github.com/resq-software/npm/issues/123)`; now requires a preceding quote, paren, or digit.
  - The homoglyph map contained a duplicate Cyrillic `а` and covered only 14 letters.

  **Breaking**

  - Findings are a richer record. Reading `.type` / `.description` / `.matchedPattern` is unaffected; code that _constructs_ a `ThreatFinding` literal must add `ruleId`, `severity`, `confidence`, `primaryControl`, and `variant`.
  - `containsXSSPatterns` no longer reports `__proto__` / `constructor[`. Prototype pollution is its own `prototype_pollution` category — use `containsPrototypePollution`, or `scanForThreats(input, { contexts: ["object_merge"] })`.
  - Homoglyph detection is UTS [#39](https://github.com/resq-software/npm/issues/39) mixed-script analysis instead of a lookalike table. Single-script values no longer fire, so `Ольга Иванова` and `東京タワー` pass where they previously failed; Latin/Cyrillic spoofs such as `pаypal` still fail.
  - `validateSafeName` (now `validatePersonName`) no longer runs SQL, path-traversal, or homoglyph detectors against human names. It applies a letters/marks/apostrophes/hyphens allowlist plus a bidirectional-control check, which accepts most Russian, Ukrainian, Bulgarian, Serbian, and Greek names that the previous implementation rejected.
  - `detectThreatPatterns` and `ThreatDetectionConfig` are deprecated in favour of `scanForThreats` with explicit `contexts`. The legacy toggles map onto contexts and behave as before.
  - `sanitizeForDisplay` and `normalizeUnicode` are deprecated aliases of `escapeHtmlText` and `foldConfusables`; behaviour is unchanged.

  **OWASP WSTG coverage audit**

  The catalog was audited against the WSTG v4.2 test taxonomy (104 tests across INPV, CLNT, CONF, IDNT, ATHZ, SESS, ERRH, CRYP, BUSL, APIT). Six verified bypasses of coverage the package already claimed are now closed — each scored `allow` before:

  - `http://good.example.com@169.254.169.254/latest/meta-data/` scored 2.0. `SSRF-LOOPBACK-001` and `SSRF-METADATA-001` both anchor on `//` immediately before the address, so a userinfo segment walked past them. Adds `SSRF-USERINFO-INTERNAL-HOST-001` plus IPv6, IPv4-mapped, abbreviated/octal, wildcard-DNS, and Alibaba/Oracle metadata rules.
  - Fullwidth forms bypassed **every** signature — `．．／．．／etc／passwd` and `＜script＞` both scanned clean, because NFC is a no-op on compatibility characters. Adds an `nfkc` canonicalization variant.
  - `....//` and `..;/` bypassed `PATH-TRAVERSAL-001`, which requires exactly two dots between boundaries.
  - `jav&#x09;ascript:alert(1)` bypassed `XSS-URI-SCHEME-001`, which allows whitespace only between the token and the colon — yet it executes, because the WHATWG URL parser strips tab/CR/LF from a scheme.
  - `" onmouseover=alert(1) x="` bypassed both event-handler rules; its quoted twin scored 2, so the pair was inconsistent precisely on the harder case.
  - `http://evil.example/shell.txt` and `<%= system('id') %>` scanned clean in `filesystem` and `template` respectively.

  A second pass then verified the audit's unverified backlog — 92 of its 104 examined tests had been capped out of adversarial verification. Five leads were re-measured against the catalog and **all five reproduced as open**, none having been closed incidentally:

  - `%253Cscript%253E` scored 0. The scanner decodes once, so a doubly-encoded payload was invisible to every signature; only traversal had an explicit `%252e%252e%252f` rule. Adds the `double_encoding` category (CWE-177).
  - U+2028, U+2029, and U+0085 all scored 0 in `http_header`. None is matched by `[\r\n]`, yet each terminates a line in JS string literals, several log processors, and some header parsers. `%e5%98%8a` — whose low byte is `0x0A` after a UTF-16-to-byte narrowing — likewise bypassed the `%0a` filter.
  - No XSS rule declared the `xml` context, so `<svg><script>alert(1)</script></svg>` scored 10/block under `html` and **0/allow under `xml`**.
  - Oracle `UTL_HTTP`/`UTL_INADDR`/`DBMS_PIPE`, Postgres `pg_read_file`/`dblink_connect`/`lo_import`, MSSQL `OPENROWSET`, and SQLite `ATTACH DATABASE` all scored 0. Their apparent coverage came only from `SQL-STACKED-001` firing on an incidental `;` — remove the semicolon and every one was open.
  - LDAP DN injection was entirely uncovered: the existing rules escape RFC 4515 _filter_ metacharacters, while a DN uses RFC 4514, where `,` and `+` separate relative distinguished names. `admin,ou=admins,dc=example,dc=com` re-parents the entry and scored 0.

  **Test-harness defect fixed.** The `EVASIONS` assertion checked only that the finding carried the expected category, not that the verdict left the `allow` band. Two evasion fixtures were passing CI while the evasion still worked in practice. The assertion now requires `verdict !== "allow"`, and both entries are closed by new rules (`SQL-COMMENT-SPLIT-KEYWORD-001`, `UNICODE-INVISIBLE-IDENTIFIER-001`).

  **Testing**

  Adds malicious, evasion, benign, and performance corpora (84 attack cases, 94 benign cases), catalog invariant checks, and a ReDoS suite that benchmarks every rule against adversarial input and rejects unbounded quantifiers and backreferences. The benign corpus covers natural language, source-code discussion, international names, filesystem documentation, SQL prose, CJK fullwidth typography, and the `template`/`xml`/`ldap`/`xpath`/`shell`/`http_header`/`url_parameter`/`jwt` contexts — all of which previously had zero or one fixture, making their zero-false-positive claims vacuous. The suite asserts zero false positives and zero false negatives across both. 970 tests total.

  **Performance**

  Three hot-path costs found by measurement after the catalog was complete, each verified against the same 1101-test suite:

  - `containsHomoglyphs` was unbounded. `detectThreatPatterns` truncates to `MAX_SCAN_LENGTH` before the 132-rule scan, then passed the **full** untruncated string to this sibling path — so the bound that protects the expensive half left the other half open, at roughly 0.15 µs per character with no early exit. The cap now lives inside `containsHomoglyphs` itself, since it is a public export and direct callers deserve the same protection. Mixed-script evidence in the first 100 000 characters is exactly as conclusive as evidence in the first 10 MB, so no detection is lost. A 10 M-character input drops from ~1 500 ms to 7.3 ms.
  - `foldCodePoint` scanned all 37 algorithmic ranges linearly before reaching the `O(1)` confusables map, so every ordinary character — ASCII, Cyrillic, Greek, Arabic, CJK — paid 37 comparisons; a 128 KB ASCII input performed 4 972 800 of them. The ranges are now bisected through start-sorted typed arrays behind a single window check, making the common case one comparison. `ALGORITHMIC_RANGES` stays the reviewable source of truth and the sorted copy is derived at module load. Output is identical: all 976 range-claimed code points verified exhaustively, and the ranges are confirmed non-overlapping, which is what makes the bisection exact.
  - `analyzeIdentifier` always computed `skeleton` — an NFD normalize, two regex passes, a per-code-point fold, then an NFC normalize — even though the callers that dominate volume never read it. `containsHomoglyphs`, reached by default from `detectThreatPatterns`/`isSafeInput`, uses only `isMixedScript`, `hasBidiControls` and `scripts`. It is now a memoized lazy getter, so the registration-time collision check that does read it still pays exactly once, and the property stays own-and-enumerable for spread and `JSON.stringify`.

  `getRulesForContexts` also memoizes multi-context lookups, which were rebuilding the same array on every scan: ~214 `Set` insertions plus a 132-element filter allocation, a third of total scan time on short inputs. 1.65 µs → 0.36 µs. The cache key is deduplicated, sorted, and **filtered to contexts the catalog knows** — the function is publicly exported, so keying on unfiltered caller input would let any JavaScript caller grow the map without limit. An unknown context contributes no rules, so dropping it cannot change the answer; keys are subsets of a 19-member set by construction. 50 000 calls with distinct junk contexts grow the heap by 0.07 MB.

  **Two defects found while auditing the catalog against other OWASP projects**

  - **Prototype-pollution keys survived past 50 levels of nesting.** `sanitizeObject`, which backs `sanitizeJson` and `parseJsonWithSchema`, recursed with a depth cap of 50 and returned early past it — so wrapping `{"__proto__":{"isAdmin":true}}` in 51 layers carried the key through the function whose entire purpose is to remove it. Confirmed exploitable rather than cosmetic: feeding the resulting leaf to an ordinary recursive deep-merge sets `Object.prototype.isAdmin`. The cutover was exactly at the documented boundary — clean at 50, polluting at 51. The cap was never cycle protection, because both callers `JSON.parse` first and JSON cannot express a cycle; it only kept the recursion off the call stack. Replaced with an iterative explicit-stack walk, which removes the reason for the cap, so every node is now visited: verified clean at depths 0, 10, 49, 50, 51, 60, 500 and 200 000, the last in 53 ms with no overflow.
  - **`stripAnsi` stripped only colour.** Its pattern was `/\x1b\[[0-9;]*m/` — SGR sequences — while `LOG-ANSI-ESCAPE-001` names it as the control for terminal-escape injection into logs. Measured: `ESC[2J` (erase display), `ESC[?1049h` (alternate screen buffer), `ESC[5A` (cursor up, which overwrites audit lines already written) and `ESC]0;…` (set window title) all survived it. Colour was the one case handled and the only one that is merely cosmetic. Widened to the ECMA-48 grammar — CSI, OSC with both BEL and ST terminators, the general escape form including Fs sequences such as `ESC c`, and a trailing bare ESC. Every quantifier is bounded and none nested, so there is nothing to backtrack over: 1 000 000 characters of adversarial input in 0.33 ms. The JSDoc now states that removal is destructive, so callers who need the record rather than the rendering escape instead of stripping.

  Both are covered by regression tests that bracket the former cutover (50 and 51) and pin each escape class by name.

  **Four output encoders, each the control a rule already named**

  Mining OWASP's Cheat Sheet Series, ASVS and the Java Encoder against the catalog turned up the same shape repeatedly: a rule naming a `primaryControl` the package never shipped. Detection without the control is the failure mode the package's own design rules warn about, so these close it.

  - **`encodeLogValue`** — `LOG_CONTROL` promised "encode newlines and control chars in field values" and pointed two rules at a function that did not exist. Escapes C0/C1, the zero-width and bidirectional formatting ranges, and the byte-order mark, rendering CR/LF/HT readably. No separate ANSI sequence matching: ESC sits inside C0, so escaping the introducer neutralises every terminal sequence _losslessly_, where deleting sequences would discard the payload an investigator needs. Measured against all three log rules plus bidi, zero-width, NUL, BOM and U+2028: **10 of 10 payloads go from firing to clean**, with benign values byte-identical. Truncation is announced in the output rather than applied silently, because a silently shortened audit record is its own problem.
  - **`escapeCsvField` / `toCsvRow`** — `FORMULA_CONTROL` was prose with no export behind it. Neutralises the formula trigger, then applies RFC 4180 quoting. Only _strings_ are prefixed: a `number` came from the application's own types and cannot carry a formula, so `-1234` stays a number while `"-1234"` becomes text — without that split, every negative value in an export turns into a string. Verified by decoding through an RFC 4180 reader rather than against golden strings. The encoded output still scans as a finding, deliberately: `CSV-FORMULA-LEAD-001` sees through a leading apostrophe and `CSV-DDE-001` is position-independent. The rules describe the value; the function protects the file. Asserting a clean scan would have forced two correct rules to be weakened.
  - **`encodeJsonForScript`** — escapes the five characters that can close a `<script>` element from inside a JSON string literal. None is a JSON structural character, so each can only occur inside a string, where a unicode escape is exact. Measured in jsdom: `JSON.stringify` of a breakout payload yields **2 script elements and an executed `window.PWNED`**; the encoder yields **1 element, no execution**, and data that deep-equals the input across 14 round-trips including astral emoji and a lone surrogate. It throws rather than returning a non-string for `undefined`, functions, symbols, BigInt and circular structures — `JSON.stringify` returns `undefined` there, and a sentinel would emit a syntax error into the page.
  - **`escapeHtmlAttribute` now escapes U+000C.** It escaped CR — which the HTML input-stream preprocessor normalises to LF before the tokenizer runs — and missed form feed, which actually ends an unquoted attribute value. Three of the four real terminators, plus the one that cannot matter. Measured in jsdom, the raw payload injects a second attribute (`autofocus`, `disabled`) where the escaped one does not. The ceiling is valueless boolean attributes, **not** XSS: an injected `onmouseover=` arrives with its `=` already escaped and binds no handler. Output for the three previously-escaped characters is byte-identical.

  Both `escapeHtmlText` and `escapeHtmlAttribute` had **zero** tests before this.

  **Fixture coverage is now enforced, not just documented**

  `AGENTS.md` requires benign fixtures with every rule. Nothing checked it, and the measurement is why that mattered: **34 of 132 rules were reachable by no fixture at a sink they declare**, and **3 of 19 declared contexts had no benign fixture at all** — so the zero-false-positive promise had never actually been measured for NoSQL, object merge or prompt injection.

  Two assertions in a file CI already runs, plus the backfill that makes them pass. Coverage is measured _in-context_, not by pattern alone: a fixture bound to a sink the rule does not declare never reaches that rule through the engine, so it proves nothing.

  The 34 new fixtures live in a separate `COVERAGE` corpus rather than in `MALICIOUS`, because that corpus asserts every payload scores above the allow band and **8 of the 34 do not** — `XPATH-FUNCTION-001` scores 0.5, `CMD-ENV-EXPANSION-001` scores 1. A low-confidence signal is meant to contribute to a score, not carry a verdict alone; forcing them in would have meant inflating severities to satisfy a test.

  The benign backfill follows one rule: **a benign fixture is a value bound to the sink, never prose about the sink.** MongoDB documentation legitimately trips `NOSQL-OPERATOR-001`, so using it as a benign fixture would only pressure someone into weakening a correct rule.

  Both halves of the gate were verified by sabotage — deleting the sole fixture reaching `LOG-ANSI-ESCAPE-001` fails the rule assertion, and deleting the `object_merge` benign fixtures fails the context assertion. An always-green gate enforces nothing.

  **Rule IDs are now enforced as public API**

  Both `AGENTS.md` and `types.ts` promise rule IDs are never reused. Nothing checked it, on a namespace consumers pin in `excludeRuleIds`. Both directions of drift are silent _for that consumer_: a reused ID re-points their suppression at an unrelated rule, and a **removed** ID turns their suppression into a no-op, so a rule they had accepted starts firing again — neither shows up in a diff of their own code.

  Adds `RETIRED_RULE_IDS` plus a committed snapshot of all 134 emitted IDs. The snapshot is the load-bearing half, not the ledger, because a ledger only catches an ID someone remembered to record. It includes the two IDs raised **outside** `THREAT_RULES` — `RESOURCE-REPETITION-001` from the engine, which the suppression API explicitly honours, and `UNICODE-MIXED-SCRIPT-001` from the validators — since a snapshot built from the catalog alone would let a rename of either pass silently.

  Deliberately not in `assertRuleCatalogIsValid`: that runs at module load in every consumer's process, and its existing checks are fatal because they are runtime-correctness failures (a `/g` pattern makes matching stateful; a duplicate ID makes findings ambiguous). ID reuse is neither — the catalog still scans correctly — so it belongs in the maintainer's CI. Verified by renaming a rule and watching both assertions fail with a readable diff.

  **Two preventive controls for weaknesses the catalog could only describe**

  - **`resolveRedirectTarget`** (CWE-601) closes a measured hole. `sanitizeUrl` and `isValidUrl` returned **six of ten** origin-escaping targets as safe, including `/<TAB>/evil.example` and `https://example.com@evil.tld/`, and `normalizeOrigin` could not substitute — it returns `null` for any pathname other than `/`. The new control allows exactly two things: a same-site path, or an absolute `http`/`https` URL whose host is allowlisted. Verified at **0 leaks across 12 escaping targets and 0 false refusals across 9 ordinary destinations**.

    The check order is load-bearing and is pinned by a named test. Sweeping U+0000–U+3000 for targets shaped `/<cp>/host` finds five code points that escape the origin; the authority test catches two of them and _none_ of the other three, which are tab, LF and CR — control characters the URL parser strips before resolving. Running the authority test first leaves all three **allowed**, measured. Percent-encoded control bytes are accepted deliberately: `%0d%0a` stays literal in a `Location` value and splits no header, so refusing it would reject ordinary URLs. The authority regex is inlined rather than imported from `sanitize.ts`, which statically imports the optional peer `effect` and would make the whole `./controls` subpath unloadable for consumers who never installed it.

  - **`analyzeGraphQLRequest`** closes the API4 batching fail-open, which was worse than it looked. `analyzeQueryComplexity` measures one document, and the **documented** call — `analyzeQueryComplexity(req.body.query, …)` — reads `undefined` when a client posts an array batch, so a 250-operation request measured `{ depth: 0, fields: 0, withinLimits: true }`: a total pass that did not even trip the length bound. Passing the raw body instead did not help, because the scanner skips everything between JSON quotes, giving `fields: 0` for the same batch.

    The new function accepts a parsed body or the raw JSON, counts top-level operations per document, and delegates per-document measurement to the existing function, so current callers and limits keep their meaning. Operation counting ignores keywords inside strings, `#` comments and nested selection sets, and handles `"""` block strings explicitly — treating them as three single quotes flips the in-string state an odd number of times and desynchronises the rest of the scan.

    One correction in the package's favour, now pinned by a test: alias batching _inside_ a single document was **already** bounded — 300 aliased selections report `exceeded: ["aliases", "fields"]`.

  **`classifyAddress` / `assertOutboundUrl` — the SSRF control fifteen rules named**

  `SSRF_CONTROL` described this function in prose and pointed **15 rule declarations** at it, while the comment above them conceded the gap outright: "a hostname whose DNS record resolves to `169.254.169.254` passes every rule here." Signatures match literal addresses in a string; nothing decided whether the request should be made.

  `classifyAddress` resolves a host against the IANA special-purpose registries — **43 of 43 fixtures correct**, including the boundaries these tables usually get wrong: `172.31.255.255` private but `172.32.0.1` public, `127.255.255.254` loopback but `128.0.0.1` public, `100.64/10` carrier-NAT but `100.128.0.1` public. Teredo (`2001::/32`) is present; it was missing from the source proposal's table and classified public. IPv4-mapped addresses are unwrapped and classified by what they carry, in both spellings — the one that matters is `[::ffff:a9fe:a9fe]`, which is what `new URL("https://[::ffff:169.254.169.254]/").hostname` actually returns.

  **The proposal's fail-open is closed, and it was the whole risk.** `classifyAddress` returns `null` for every domain name, so a policy shaped "reject non-public _literals_" silently permits every hostname. `assertOutboundUrl` is exhaustively default-deny instead: with no `allowedHosts` and `allowPublicHosts` off, a name is **refused**. Range also beats allowlist — naming `127.0.0.1` in `allowedHosts` still refuses it, since an allowlist entry must not open a route back into the host making the request.

  Two claims from the source proposal were dropped as false. Strict IP parsing does **not** earn its keep inside `assertOutboundUrl`: `new URL` already canonicalises `0177.0.0.1` and `2130706433` to `127.0.0.1`, both verified refused. Strictness matters only at the standalone `classifyAddress` entry point, and the docs say so rather than teaching a false model.

  The honesty clause is non-optional and is in the JSDoc: this is a **pre-connection** check. The name is resolved by the network stack after it returns, so DNS may answer differently (rebinding); redirects need the same check per hop; neither is closable by a synchronous function. Network-layer egress control remains the durable fix.

  Declining the npm `ip-address` package the cheat sheet suggests is a deliberate decision: this package holds two runtime dependencies, and that library supplies parsing, not IANA classification — which is the part that was missing.

  **`checkJsonPayloadLimits` — bound the payload before parsing allocates it**

  `JSON.parse` builds the whole object graph before a caller can inspect anything, so a body designed to exhaust memory has already succeeded by the time validation runs. This is one linear pass over the _text_ — nesting depth, per-container entry counts, string-value lengths — that never constructs a value. It reports rather than enforces; schema validation remains the control for shape, and this only bounds the cost of reaching it.

  The defaults are the part that decides whether the control survives contact with production. The draft values (20/1000/200/10k/1M) rejected **four of five** ordinary bodies, so they are an order of magnitude larger here: **0 of 6 realistic payloads are rejected** — a 250-key dependency manifest, a 25-deep config tree, a 40 KB data-URI avatar, a 2000-row page — while all five pathological shapes are reported.

  The per-container counter stack is capped, because without it a payload nested 200 000 deep grows 200 000 entries of scanner state: the same unbounded allocation the function exists to prevent, moved one layer down. Measured heap delta on that input is **0.00 MB**, in 2.8 ms.

  The prototype-pollution half of this item shipped separately, above, as the `sanitizeObject` fix.

  **Evasions are now generated, not hand-written**

  Adds a mutation layer modelled on sqlmap's `--tamper` scripts and Commix's documented filter bypasses: 21 deterministic transforms applied to every applicable attack payload. A fixed evasion corpus only ever contains what somebody thought of; N payloads times M transforms explores combinations nobody enumerated. The package had 83 malicious fixtures and 14 hand-written evasions — this generates **745 mutated payloads** from the same corpus.

  These are transforms, not payloads. No third-party corpus is vendored, and nothing here reaches the blocking layer.

  The first run found four gaps, all now closed and each with a coverage fixture:

  - **MySQL versioned comments.** `/*!UNION*/` executes on MySQL and is ignored everywhere else, so wrapping each keyword hid the statement from every keyword-matching rule. `1 /*!UNION*/ /*!SELECT*/ a FROM b` scored **1/allow**; now 7/review.
  - **The fully-encoded double-percent form.** `ENCODING-DOUBLE-PERCENT-001` matches `%253C`, where only the percent sign is re-encoded. Encoding the hex digits as well gives `%25%33%63` — the same byte after two decodes, invisible to a pattern expecting those digits to follow `%25` literally. The half-encoded spelling of a script tag scored review while the fully-encoded spelling of the identical payload scored **zero**.
  - **Two Commix word-splitting bypasses.** `${IFS}` and `{,}` both expand to a word separator, so a command survived a filter looking for whitespace. `CMD-QUOTE-SPLIT-001` covers the empty-quote form (`b""ash`) too — deliberately _not_ the equivalent backslash form, which is indistinguishable from an ordinary Windows-style relative path and would be disabled by the first person it inconvenienced.
  - **A zero-width space raised no finding at all in `sql`, `shell`, `ldap`, `xpath`, `xml`, `template` or `filesystem`.** `INVISIBLE_CONTEXTS` excluded those sinks on the documented grounds that they "get the stricter `UNIVERSAL_RULES` bidi and control-character rules instead". That reasoning was wrong, and measurement showed it: the bidi rule matches only U+202A–202E and U+2066–2069, the control-character rule only C0/C1 — **neither matches U+200B**. So `1 U<ZWSP>NION SELECT` scored zero. The rule now declares every sink; the comment records why the original exclusion did not hold.

  The severity stays `medium`/`medium` rather than rising, because at the human-text sinks the same code points are orthographic in Persian and Hindi and structural in every ZWJ emoji sequence — all of which score identically to the malicious case. Separating evasion from orthography needs script analysis, not a heavier weight. The finding is raised everywhere; the verdict is left to scoring.

  Unexplained evasions went **227 → 17**, and the suite pins that as a budget. Three categories are excluded with a stated reason rather than silently: invisible characters (detected, deliberately not escalated), percent-encoding applied to sinks that never percent-decode (not an evasion), and case mutation (destroys the payload — JavaScript property names and credentials are case-sensitive). The residue is narrow SQL operator swaps and re-encodings of payloads that were already encoded.

  Zero false positives across all 113 benign fixtures throughout.

  **Encoder conformance is asserted against a real parser, exhaustively**

  Adds `tests/encoder-conformance.test.ts`: escape a code point, put it in a document, parse it with jsdom, and require the value back. A golden string only pins what the encoder does today; a parser pins what a browser will actually see.

  The sweep is exhaustive over 0x00–0xFF and the general-punctuation block, plus named astral cases — a stride through the rest of the BMP and the astral planes produced zero findings, so every difference lives below 0x0100. It carries the coverage assertion from the OWASP Java Encoder's own suite: every swept code point must classify as _either_ round-tripping _or_ a documented exception, with no third bucket, so an exception cannot quietly stop being one and a new difference cannot appear unnoticed.

  Four exceptions are documented with the tokenizer rule that causes each, all measured rather than assumed:

  - Attribute context, U+0000 → U+FFFD (the tokenizer replaces NULL).
  - Text context, U+0000 → **dropped entirely**, not replaced — the two contexts genuinely differ.
  - Text context, U+000D → U+000A, because the input-stream preprocessor normalises CR before the tokenizer runs. This is the same fact that made escaping CR in an attribute never load-bearing.
  - Attribute context, **26 C1 code points decode to Windows-1252 characters** — the numeric-character-reference end state carries a lookup table for 0x80–0x9F, so the escape emitted for U+0080 comes back as a euro sign. Lossy rather than dangerous: every replacement is an inert printable character, and leaving C1 raw is worse. The four C1 code points that map to themselves are correctly absent from the set.

  Verified by sabotage: narrowing the escape set back to its pre-fix state fails three assertions, each naming U+000C exactly. Batched to one parse per context rather than one document per code point — 10.96 s to 1.33 s, testing nothing less, since each row carries a marker attribute the encoder never emits.

  **Accuracy is measured, not asserted**

  Adds `tests/accuracy.test.ts`, modelled on the OWASP Benchmark: precision, recall, F1 and false-positive rate over true _and_ false populations, rather than a count of passing assertions. "1,422 tests pass" says nothing about whether the catalog is any good.

  The headline figure is deliberately **not** the flattering one. Precision and recall over the hand-written corpora are 100% with a 0% false-positive rate, and that is close to meaningless — those 83 malicious and 113 benign fixtures were written alongside these rules, so the corpus is a self-graded exam. It is asserted as a regression floor and described as one.

  The number worth reading is recall over **generated** evasions: 762 payloads produced by transforms nobody wrote with this catalog in mind. That figure is **97.3%**, and it is the one that moved — from roughly 73% before the mutation layer's findings were closed. Excused misses are counted separately, each carrying a written reason, and the excused population is asserted to stay smaller than the detected one so it cannot become where failures hide.

  Two definitional choices that matter. A benign fixture counts as clean only when it raises **no finding at all**, not merely when the verdict stays `allow` — a finding somebody has to triage is a cost even when the verdict is right. And the coverage corpus is scored at _rule_ level rather than verdict level, because several of those rules score below the review band alone by design; a verdict-level measure would report them as misses when the rule fired exactly as intended.

  Verified by sabotage, and the metric is sensitive: deleting **one rule out of 136** drops recall to 96.77% and fails the floor, while the coverage assertion names the missing rule.

  **ASVS conformance, scoped honestly and verified by a test**

  Adds `ASVS-CONFORMANCE.md`, pinned to OWASP/ASVS commit `cdc8a0f6` because requirement IDs churned substantially between 4.0 and 5.0 — a map without a pinned source cannot be re-checked. Requirement text and levels are transcribed from the V1, V11 and V16 chapter files rather than from memory.

  The framing matters more than the table. OWASP "does not certify any vendors, verifiers, or software", and ASVS scopes itself to _the software product being developed_ — which a library is not. Requirement 1.2.4 asks that queries be parameterized; this package cannot parameterize anyone's queries. So the only claim made is that a control exists which an application may use, and §4 says exactly that: **seven Level 1 requirements have an export behind them, each with a proving test.** No Level 2 or Level 3 application conformance is claimed anywhere.

  Scoped to V1, V11 and V16 — the chapters where this package's exports actually live, and the region `WSTG-COVERAGE.md` leaves essentially unmapped, since it indexes detection rather than cryptography and logging. Authentication, session management, authorization, OAuth and configuration are out of scope and say so.

  §2 is the section carrying the doctrine: six requirements the package _detects_ but does not control, each with the reason detection is not the control. Claiming 1.2.4 because `SQL-*` rules exist would be presenting a signature as a control, which is the failure mode this package exists to avoid. §3 gives fifteen more a written reason apiece — including password storage, deliberately absent because a half-built password hash is worse than none.

  `tests/asvs-conformance.test.ts` parses the document and fails when a named export stops resolving, a named proving test disappears, a level is invalid, or a requirement is claimed in two sections at once — the guard against a row quietly migrating from "detected" to "supported" and the claim getting stronger without anyone noticing. Verified by sabotage: renaming an export, deleting a referenced suite, and duplicating a requirement across sections each fail with the offending ID named.

### Patch Changes

- [#257](https://github.com/resq-software/npm/pull/257) [`36eb35f`](https://github.com/resq-software/npm/commit/36eb35f4523c355975ae5a86a1eca665aa29334b) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Fix confusable case folding, entity decoding through the prototype chain, unbounded recursion and cache growth, and `mailto:` delimiter injection

  **`@resq-systems/security`**

  - **Uppercase lookalikes folded to lowercase prototypes, so the spoof pair they exist to catch compared as _not_ confusable.** Twenty-two code points whose glyph is a Latin capital sat in lowercase rows of the curated confusables table: the Cyrillic, Greek and Coptic capitals (`Р` U+0420, `Ρ` U+03A1, `Ⲣ` U+2CA2, `Ѕ` U+0405, `Х` U+0425, `Χ` U+03A7, `У` U+0423, `Υ` U+03A5, `Ζ` U+0396, `Ѵ` U+0474, `Ԝ` U+051C and others), the capital Roman numerals `Ⅴ`/`Ⅹ`/`Ⅿ`, and three Cherokee letters. `getSkeleton("Ρ")` returned `"p"` while `getSkeleton("P")` returned `"P"`, so `areConfusable("РayPal", "PayPal")` was **false**. Separately, U+2174 (`ⅴ`) appeared in both the `v` and `V` rows; later-row-wins folded it to `V` while U+2164 (`Ⅴ`) folded to `v`, swapping the two Roman numeral fives. Rows are now keyed by the glyph a code point renders as, which the file header states explicitly — including the six `Lu` code points that draw as lowercase shapes (`Ƅ`, `Ь`, `Ꮟ`, `Ꮒ`, `Ꮷ`, `Ꭹ`) and correctly stay where they are, so the next general-category audit does not move them back.
  - **`decodeHtmlEntities("&constructor;")` returned `"function Object() { [native code] }"`.** The named-entity group matches `constructor`, `toString`, `valueOf`, `isPrototypeOf` and `propertyIsEnumerable`, which resolve up `Object.prototype` to a function — so `?? match` never fired and `String.prototype.replace` coerced the function to its source text. Any input carrying such a reference got a corrupted `html_decoded` variant, and the injected braces and parentheses could trip unrelated rules. Now an own-property check.
  - **`analyzeGraphQLRequest` broke its documented "never throws" contract.** `documentsFrom` recursed once per array level with no bound, so a caller passing `req.body` straight from a JSON body parser could hand over an array nested tens of thousands deep and get `RangeError: Maximum call stack size exceeded`. Bounded at eight levels — a real batch is one array of operation objects. Only the already-parsed path was exposed; the raw-text path was already protected by the `JSON.parse` catch.
  - **U+200C and U+200D are no longer treated as hostile.** ZWNJ and ZWJ are how Persian, Hindi and Arabic words and names are correctly written, and they appear in ordinary emoji sequences, but `getRestrictionLevel` demoted any string containing one to `unrestricted` — so `isSafeIdentifier` rejected a correctly spelled Persian identifier at the default level — and `PERSON_NAME_PATTERN` rejected the names outright. Both now admit the joiners. The spoofing risk they carry was already covered: `getSkeleton` strips them before comparison. `containsInvisibleCharacters` still reports them, since a caller may reasonably want to know.
  - **The ASVS 1.2.1 row claimed conformance the code does not provide.** It named HTTP header fields alongside HTML elements and attributes, but `escapeHtml` and `escapeHtmlText` pass CR and LF through unchanged and cannot prevent header splitting, while `escapeHtmlAttribute` encodes them to `&#x0D;&#x0A;` — right in an attribute, a corrupted value in a header. The claim is now scoped to the two contexts it holds for, with the header half disclaimed and its reason recorded, and `tests/encoder-conformance.test.ts` pins all three behaviours so the prose fails a test rather than merely aging.
  - **The README told callers to log `result.findings`.** `ThreatFinding.matchedPattern` is an excerpt of the input, so for a `credential_exposure` or `pii_exposure` hit the log line _is_ the leak. Both sites now show an allowlisted telemetry record — `ruleId`, `type`, `severity`, `cwe`.
  - `scripts/generate-capec.ts` skips an `<Attack_Pattern>` block with no closing tag instead of slicing to index `-1`, which kept the rest of the document and attributed every later `CWE_ID` to that one pattern — inventing links MITRE never published.

  **`@resq-systems/helpers`**

  - **`obfuscateLink` emitted caller-controlled `mailto:` header fields.** `?`, `#`, `%` and `&` are atext, so RFC 5322 makes them legal in a local part and the address allowlist admitted them — but they are also the delimiters RFC 6068 uses to separate an address from its header fields. `address: "victim@example.com?bcc=attacker@example.com"` passed validation and produced an `href` the compose window honours. They are now percent-encoded in a single pass on the way into the URI, so a literal `%3F` in an address survives as `%253F` rather than decoding into a delimiter one hop later.
  - `getElementComputedStyle` bounds its per-pseudo-selector cache at sixteen buckets. `pseudo` is an arbitrary caller string, so the map grew once per distinct value for as long as a caching scope stayed open — including values `getComputedStyle` went on to reject, which left behind buckets that never saw a second lookup. Past the ceiling the caller still gets a live computed style, just unmemoized.

- Updated dependencies [[`b43014e`](https://github.com/resq-software/npm/commit/b43014e16296172959680150ad1a31d6cf346b04)]:
  - @resq-systems/types@0.2.0

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

## 1.0.5

### Patch Changes

- [#195](https://github.com/resq-software/npm/pull/195) [`2860be7`](https://github.com/resq-software/npm/commit/2860be7c0f4a16c3f61952668450553b2e959998) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Type getHashForObject input as unknown instead of any

## 1.0.4

### Patch Changes

- [#187](https://github.com/resq-software/npm/pull/187) [`e6c5ac8`](https://github.com/resq-software/npm/commit/e6c5ac81648a5d681961d13e7faa01982b08d478) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Accept Punycode/IDN TLDs in EmailSchema / isValidEmail

  `EmailSchema` (and `isValidEmail`) previously rejected valid internationalized domains whose TLD is Punycode-encoded (e.g. `user@example.xn--p1ai` for `.рф`). The TLD pattern now also accepts an `xn--…` label. Structural rejections (no `@`, empty domain, disallowed local-part characters) are unchanged. Kept in sync with `@resq-systems/email-templates`'s `EmailAddress` brand.

## 1.0.3

### Patch Changes

- [#179](https://github.com/resq-software/npm/pull/179) [`4a8cf9a`](https://github.com/resq-software/npm/commit/4a8cf9a1d0b8d76e9c380067c446a209117032a2) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Replace `workspace:*` internal dependency ranges with concrete semver so published packages install cleanly outside the monorepo

## 1.0.2

### Patch Changes

- [#176](https://github.com/resq-software/npm/pull/176) [`189eed6`](https://github.com/resq-software/npm/commit/189eed6040a1e2422cf2f3f640b23b20035be32d) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Fix redactPII leaking email addresses with Punycode/IDN TLDs

  `PII_PATTERNS.email` was not updated when `EmailSchema` gained Punycode/IDN TLD support, so `redactPII` silently failed to redact addresses like `user@example.xn--p1ai`. The redaction pattern now mirrors `EmailSchema`'s TLD alternation (and drops a stray `|` from the former `[A-Z|a-z]` character class).

- [#175](https://github.com/resq-software/npm/pull/175) [`abc88da`](https://github.com/resq-software/npm/commit/abc88da66987f0cce47303d09108d4f1fc3b4520) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Accept Punycode/IDN TLDs in EmailSchema / isValidEmail

  `EmailSchema` (and `isValidEmail`) previously rejected valid internationalized domains whose TLD is Punycode-encoded (e.g. `user@example.xn--p1ai` for `.рф`). The TLD pattern now also accepts an `xn--…` label. Structural rejections (no `@`, empty domain, disallowed local-part characters) are unchanged. Kept in sync with `@resq-systems/email-templates`'s `EmailAddress` brand.

## 1.0.1

### Patch Changes

- [#171](https://github.com/resq-software/npm/pull/171) [`1f28d41`](https://github.com/resq-software/npm/commit/1f28d4141dbaf389f0096cb93fde02e2a553e3ca) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Republish with corrected manifests. Earlier releases via the tag-triggered
  `release-package.yml` workflow used `bunx npm publish`, which does not rewrite
  Bun's `workspace:*` protocol, so these packages shipped with unresolvable
  `workspace:*` dependencies (`@resq-systems/types`, `@resq-systems/dsa`,
  `@resq-systems/constants`) that break `bun install` / `npm install` in
  downstream consumers. The workflow now uses `bun publish`, which resolves the
  protocol to concrete versions at pack time.

  `@resq-systems/rate-limiting` additionally re-adds a `@deprecated`
  `RateLimitCheckResult` type alias for the renamed `RateLimitDecision`, restoring
  backward compatibility for consumers written before the rename.

- [#174](https://github.com/resq-software/npm/pull/174) [`59d6d6d`](https://github.com/resq-software/npm/commit/59d6d6d053e755acb28bd655a9faa44362bb680d) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Accept Punycode/IDN TLDs in EmailSchema / isValidEmail

  `EmailSchema` (and `isValidEmail`) previously rejected valid internationalized domains whose TLD is Punycode-encoded (e.g. `user@example.xn--p1ai` for `.рф`). The TLD pattern now also accepts an `xn--…` label. Structural rejections (no `@`, empty domain, disallowed local-part characters) are unchanged. Kept in sync with `@resq-systems/email-templates`'s `EmailAddress` brand.

## 1.0.0

### Major Changes

- [#168](https://github.com/resq-software/npm/pull/168) [`1d0f73c`](https://github.com/resq-software/npm/commit/1d0f73c6b8dbb5a09e3260ad78ab1fd7ac5c4636) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Brand crypto and validator outputs as nominal types and require branded EncryptionKey/Ciphertext/PositiveInt inputs

### Minor Changes

- [#167](https://github.com/resq-software/npm/pull/167) [`c80c8b8`](https://github.com/resq-software/npm/commit/c80c8b8f0eecd3e12af3e74cdd26aac98337675b) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Rebrand to ResQ Systems: rename npm scope `@resq-sw/*` → `@resq-systems/*`

  **BREAKING (npm scope rename):** every package is republished under the new
  `@resq-systems` scope. Consumers must update imports and dependencies from
  `@resq-sw/<pkg>` to `@resq-systems/<pkg>`; the old `@resq-sw/*` packages will be
  deprecated on npm. Also updates the short brand name to "ResQ Systems", email
  copy and From-name to "ResQ Systems", and standardizes copyright/author metadata
  to "ResQ Systems, Inc." Domains (`resq.software`) and the product name
  ("ResQ Tactical OS") are unchanged.

### Patch Changes

- Updated dependencies [[`1d0f73c`](https://github.com/resq-software/npm/commit/1d0f73c6b8dbb5a09e3260ad78ab1fd7ac5c4636)]:
  - @resq-systems/types@0.1.0

## 0.2.0

### Minor Changes

- [#152](https://github.com/resq-software/npm/pull/152) [`23ce8e3`](https://github.com/resq-software/npm/commit/23ce8e3f59c54a010bff42b3b2a76b6df0b2dc99) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Resolve security, algorithmic consistency, and memory leak issues:
  - @resq-sw/security: Implement recursive prototype pollution protection in `sanitizeJson` and `sanitizeObject`. Integrate DOMPurify for HTML sanitization when `allowHtml` is enabled in `validateUserInput`.
  - @resq-sw/http: Add SSRF protection with optional `allowedHosts` and `blockedHosts` in `FetcherOptions` to restrict requests to internal or untrusted networks.
  - @resq-sw/rate-limiting: Address memory leaks in memory-based rate-limit stores, `KeyedThrottle`, and `KeyedDebounce` by using the LRU cache from `@resq-sw/dsa` with configurable capacity limits.
  - @resq-sw/dsa: Add an optional `onEvict` callback to `LRUCache` to support cleanup tasks like canceling active timers during eviction, and skip expired entries when calling keys(), values(), and entries() iterators.

### Patch Changes

- [#156](https://github.com/resq-software/npm/pull/156) [`52a18eb`](https://github.com/resq-software/npm/commit/52a18eba2e89d17aa6056c802b16fff53bdbfde1) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Correct the `effect` peer ranges to the versions these packages are actually built and tested against.

  Every package here declared `effect: ">=3.0.0"` while pinning `effect@4.0.0-beta.*` in
  devDependencies, so v3 was never exercised. Checked against effect `3.21.4` (the newest v3),
  these runtime symbols do not exist:

  - `@resq-sw/http` — `Schema.Literals`, `Schema.decodeUnknownExit`, `Effect.timeoutOrElse`,
    `Schedule.both`, `Schedule.while`
  - `@resq-sw/dsa` — `Schema.isGreaterThan`, `Schema.isGreaterThanOrEqualTo`, `Schema.isMinLength`
  - `@resq-sw/email-templates` — `Schema.decodeUnknownExit`, `Schema.isPattern`, `Schema.Literals`
  - `@resq-sw/security` — `Schema.decodeUnknownExit`, `Schema.isGreaterThan`, `Schema.isPattern`,
    `Schema.Literals`, `Schema.makeFilter`

  `@resq-sw/rate-limiting` has no such gap on 3.21.4, but `Schema` only entered effect core at
  3.10, so `>=3.0.0` was wrong there too; its range now matches what CI builds against.

  All five move to `effect: ">=4.0.0-beta.78"`.

  `@resq-sw/http` additionally drops its required `@effect/platform` peer. It imports only
  `effect` and `effect/unstable/http` — `@effect/platform` appears nowhere in `src/`, is not even
  a devDependency, and has no v4 release; its v3 line imports `effect/Either` and `effect/FiberRef`,
  which effect v4 removed, so installing it alongside effect v4 yields an unimportable module.
  The optional `@effect/platform-bun` peer moves from `>=0.40.0` to `>=4.0.0-beta.78`, because the
  old range resolved to `0.90.0` — the v3 line — steering Bun consumers into the same broken pairing.

  No runtime or API change in any package: exports, behavior, and types are untouched.

## 0.1.2

### Patch Changes

- [#141](https://github.com/resq-software/npm/pull/141) [`2a3c926`](https://github.com/resq-software/npm/commit/2a3c926fc6fb88cae74984f637f99cf37de5da71) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Adopt effect 4.0.0-beta.93: bump the pinned dev version and the root effect override from beta.50, validated against the full build and test suite

- [#145](https://github.com/resq-software/npm/pull/145) [`c6982a6`](https://github.com/resq-software/npm/commit/c6982a6474860ddc400c622c7b9d3e2dfafe58d8) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Add @total-typescript/ts-reset devDependency and reset.d.ts to improve global typing defaults during development, keeping it out of the published library output.

- [#145](https://github.com/resq-software/npm/pull/145) [`c6982a6`](https://github.com/resq-software/npm/commit/c6982a6474860ddc400c622c7b9d3e2dfafe58d8) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Update TypeScript to 7.0.2 across all packages

# @resq-sw/security

## 0.1.1

### Patch Changes

- [`43626e2`](https://github.com/resq-software/npm/commit/43626e2616195cf50df5b932054320e2db6c3373) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Initial release with tsdown builds, comprehensive tests, and package READMEs
