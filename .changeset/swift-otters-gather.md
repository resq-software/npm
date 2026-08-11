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

---
"@resq-systems/security": patch
"@resq-systems/helpers": patch
---

Fix confusable case folding, entity decoding through the prototype chain, unbounded recursion and cache growth, and `mailto:` delimiter injection

**`@resq-systems/security`**

- **Uppercase lookalikes folded to lowercase prototypes, so the spoof pair they exist to catch compared as *not* confusable.** Twenty-two code points whose glyph is a Latin capital sat in lowercase rows of the curated confusables table: the Cyrillic, Greek and Coptic capitals (`Р` U+0420, `Ρ` U+03A1, `Ⲣ` U+2CA2, `Ѕ` U+0405, `Х` U+0425, `Χ` U+03A7, `У` U+0423, `Υ` U+03A5, `Ζ` U+0396, `Ѵ` U+0474, `Ԝ` U+051C and others), the capital Roman numerals `Ⅴ`/`Ⅹ`/`Ⅿ`, and three Cherokee letters. `getSkeleton("Ρ")` returned `"p"` while `getSkeleton("P")` returned `"P"`, so `areConfusable("РayPal", "PayPal")` was **false**. Separately, U+2174 (`ⅴ`) appeared in both the `v` and `V` rows; later-row-wins folded it to `V` while U+2164 (`Ⅴ`) folded to `v`, swapping the two Roman numeral fives. Rows are now keyed by the glyph a code point renders as, which the file header states explicitly — including the six `Lu` code points that draw as lowercase shapes (`Ƅ`, `Ь`, `Ꮟ`, `Ꮒ`, `Ꮷ`, `Ꭹ`) and correctly stay where they are, so the next general-category audit does not move them back.
- **`decodeHtmlEntities("&constructor;")` returned `"function Object() { [native code] }"`.** The named-entity group matches `constructor`, `toString`, `valueOf`, `isPrototypeOf` and `propertyIsEnumerable`, which resolve up `Object.prototype` to a function — so `?? match` never fired and `String.prototype.replace` coerced the function to its source text. Any input carrying such a reference got a corrupted `html_decoded` variant, and the injected braces and parentheses could trip unrelated rules. Now an own-property check.
- **`analyzeGraphQLRequest` broke its documented "never throws" contract.** `documentsFrom` recursed once per array level with no bound, so a caller passing `req.body` straight from a JSON body parser could hand over an array nested tens of thousands deep and get `RangeError: Maximum call stack size exceeded`. Bounded at eight levels — a real batch is one array of operation objects. Only the already-parsed path was exposed; the raw-text path was already protected by the `JSON.parse` catch.
- **U+200C and U+200D are no longer treated as hostile.** ZWNJ and ZWJ are how Persian, Hindi and Arabic words and names are correctly written, and they appear in ordinary emoji sequences, but `getRestrictionLevel` demoted any string containing one to `unrestricted` — so `isSafeIdentifier` rejected a correctly spelled Persian identifier at the default level — and `PERSON_NAME_PATTERN` rejected the names outright. Both now admit the joiners. The spoofing risk they carry was already covered: `getSkeleton` strips them before comparison. `containsInvisibleCharacters` still reports them, since a caller may reasonably want to know.
- **The ASVS 1.2.1 row claimed conformance the code does not provide.** It named HTTP header fields alongside HTML elements and attributes, but `escapeHtml` and `escapeHtmlText` pass CR and LF through unchanged and cannot prevent header splitting, while `escapeHtmlAttribute` encodes them to `&#x0D;&#x0A;` — right in an attribute, a corrupted value in a header. The claim is now scoped to the two contexts it holds for, with the header half disclaimed and its reason recorded, and `tests/encoder-conformance.test.ts` pins all three behaviours so the prose fails a test rather than merely aging.
- **The README told callers to log `result.findings`.** `ThreatFinding.matchedPattern` is an excerpt of the input, so for a `credential_exposure` or `pii_exposure` hit the log line *is* the leak. Both sites now show an allowlisted telemetry record — `ruleId`, `type`, `severity`, `cwe`.
- `scripts/generate-capec.ts` skips an `<Attack_Pattern>` block with no closing tag instead of slicing to index `-1`, which kept the rest of the document and attributed every later `CWE_ID` to that one pattern — inventing links MITRE never published.

**`@resq-systems/helpers`**

- **`obfuscateLink` emitted caller-controlled `mailto:` header fields.** `?`, `#`, `%` and `&` are atext, so RFC 5322 makes them legal in a local part and the address allowlist admitted them — but they are also the delimiters RFC 6068 uses to separate an address from its header fields. `address: "victim@example.com?bcc=attacker@example.com"` passed validation and produced an `href` the compose window honours. They are now percent-encoded in a single pass on the way into the URI, so a literal `%3F` in an address survives as `%253F` rather than decoding into a delimiter one hop later.
- `getElementComputedStyle` bounds its per-pseudo-selector cache at sixteen buckets. `pseudo` is an arbitrary caller string, so the map grew once per distinct value for as long as a caching scope stayed open — including values `getComputedStyle` went on to reject, which left behind buckets that never saw a second lookup. Past the ceiling the caller still gets a live computed style, just unmemoized.
