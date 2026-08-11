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
"@resq-systems/helpers": minor
---

Harden `browser/` against malformed and mislabelled input: fix a PNG parser hang, byte-sniff animation detection, and validate contact-link construction

Bumped `minor` rather than `patch`. No signature changes, so this is not `major` under the repo's rules, but three behaviours observably move: `obfuscateLink` now throws on input it previously accepted, `computeBox` reports `false` where it reported `true`, and `MediaHelpers.isAnimated` returns different answers for the same file. Each is a correction, but a consumer can notice.

---

**Fix an unbounded loop in `PngHelpers.readChunks` that hung the calling thread on a malformed PNG.**

`readChunks` read the chunk length with `getInt32`, so a declared length of `0xFFFFFFF4` decoded to `-12`. The cursor then advanced by `len + LEN_SIZE + CRC_SIZE` — that is, `-12 + 4 + 4 = -4` — exactly cancelling the `+4` that preceded it. Offset 8 was a fixed point, and the loop repeated identically forever.

A **70-byte structurally-valid PNG** reaches it: the file passes `isPng`, and `MediaHelpers.getImageSize` then calls `findChunk(view, "pHYs")`, which never returns. The `try/catch` around that call cannot catch a hang, so the documented promise that the PNG-metadata step "never rejects" held only in the sense that it also never returns. In a browser this pins the main thread on an attacker-supplied image.

The fix reads the length as unsigned, rejects lengths above the specification's `2^31-1` cap and any chunk that would run past the end of the data, and anchors every cursor update to the chunk's own start so each iteration makes structural forward progress regardless of what the file declares. It also bounds the walk by `view.byteLength` rather than `view.buffer.byteLength`, since a `DataView` can be a window onto a larger buffer.

Signed and unsigned readings agree on every specification-valid PNG, so parsing of well-formed files is byte-identical — verified against a golden fixture (`IHDR{8,16,13} pHYs{33,41,9} IDAT{54,62,18}`, with `parsePhys` unchanged).

Adds `tests/browser/media/png.test.ts`, the first coverage this module has had — which is why the defect shipped. It pins the hostile lengths, truncated tails, `DataView` windowing, IDAT-first ordering, and the golden parse.

---

**`MediaHelpers.isAnimated` now identifies the format from the buffer's magic bytes rather than `Blob.type`.**

The old dispatch was four equality checks against a caller-supplied label, and it was wrong in both directions. APNG is stored and served as `image/png` — `image/apng` exists but is not what a file picker reports, because browsers derive `File.type` from the `.png` extension — so the ordinary APNG case answered `false`. In the other direction, an animated GIF renamed to `.webp` reached the WebP parser, which rejected the signature and also answered `false`; any rule built on this, such as an upload check refusing animation, was bypassed by renaming the file.

Each format parser already re-validates its own signature, so the sniff only routes: a wrong guess degrades to `false` rather than to a misparse. Measured against the previous dispatch over sixteen cases, five answers change and all five were previously wrong; none of the eleven correct answers moved. `isAnimated` is now covered — it had been excluded on the grounds that it "delegates to format-specific functions already tested elsewhere", but the delegation *choice* was the defect and no parser test could reach it.

**It also reads a bounded prefix rather than the whole file.**

Every parser here answers from a header — 12 bytes for AVIF, 21 for WebP, 26 for GIF, 53 for a typical APNG — so materializing the blob was an `O(n)` read and an `O(n)` allocation for an `O(1)` question, on the main thread, once per upload. The first version of this fix made that strictly worse than what it replaced: the old MIME-label dispatch read **zero** bytes for anything outside its four types, while sniffing bytes required the buffer up front, so an 8 MB MP4 went from 0 B / 0.07 ms to 8 388 608 B / 2.7 ms, and a 32 MB one to 33 554 432 B.

It now reads 64 KB and escalates only when it must. A *positive* answer from a prefix is always conclusive — `acTL`, the VP8X animation bit, an `avis` brand and a second GIF image descriptor are present-or-absent markers that no later byte retracts. A *negative* may instead mean the prefix ran out, so it escalates to a full read, except where the parser provably saw everything it could consult: `isWebpAnimated` reads nothing past byte 20, and `isAvifAnimated` scans only to the end of the `ftyp` box whose size is declared in its first four bytes.

Verified against a full-read reference over sixteen cases spanning both branches — including an APNG whose `acTL` hides behind a 200 KB colour profile and an animated GIF whose first frame is 1 MB, which are exactly the cases that escalate: **zero answer mismatches**. Conclusive-from-prefix cases read 0.8% of the file; escalating cases pay one extra 64 KB (101–105%). The new tests assert the byte count, not just the answer, because a regression there is invisible to every other assertion in the file.

**`isApngAnimated` walks the chunk stream instead of scanning the decoded bytes as text.**

The previous implementation decoded the buffer with a streaming `TextDecoder` and accumulated UTF-16 code-unit counts, then compared them against byte offsets. Two silent defects followed, both confirmed against the shipped code:

- Multi-byte data ahead of `acTL` shrank the index. Past roughly 40 bytes of it the computed `IDAT` offset landed before `acTL`'s real position, closing the search window over the chunk — so a genuine APNG carrying a compressed ICC profile reported static.
- The scan matched the literal text `acTL` anywhere, including inside chunk *data*, so a static PNG whose `tEXt` comment read "Made with acTL Studio" reported animated.

Matching the four-byte type field at a known offset fixes both directions and bounds the walk: lengths above the specification's `2^31-1` cap and chunks running past the end now stop it, and `IEND` terminates it. The test file is rebuilt around valid chunk streams — three of its six previous vectors were zero-filled buffers with type strings poked in at arbitrary offsets, which no structural parser can accept.

**`obfuscateLink` validates `scheme` and `address`.**

The `scheme: "mailto" | "tel"` union guarded the ordinary case at compile time but not the ones that matter: `obfuscateLink({ ...JSON.parse(config) })` type-checks clean because `JSON.parse` returns `any`, and this package is published, so plain-JS consumers got no enforcement at all. `scheme: "javascript"` returned `href: "javascript:alert(1)"`, which every documented usage places straight into an anchor.

`address` was interpolated raw while `params` were percent-encoded, so `x@y.com" onmouseover="alert(1)` survived verbatim into a value the docs describe as ready for an `href`. It is now checked against an allowlist admitting the RFC 5322 atext set, the characters a phone number needs, and internationalized domains via `\p{L}\p{M}\p{N}` — excluding the four that matter: quotes break out of the attribute, angle brackets open a tag, and CR/LF inject headers into a compose window. Both rejections throw `TypeError`, matching the documented `@throws`. The empty address is still accepted, since `mailto:` is useless but not dangerous and was existing tested behaviour.

**Three lower-severity fixes in `browser/`.**

- `getElementComputedStyle` kept three fixed cache buckets — no-pseudo, `::before`, `::after` — so a lookup for any other pseudo (`::marker`, `::placeholder`, `::selection`) fell through to the **no-pseudo** bucket and stored the pseudo's style under the element itself. One such call inside a `beginDOMCaches` scope then corrupted `isElementVisible` and `computeBox` for that element, in either direction depending on call order. Buckets are now keyed by selector.
- `isElementStyleVisibilityVisible` and `computeBox` returned `visible: true` when there was no computed style. That means no browsing context — a document from `DOMParser`, `createHTMLDocument`, or `<template>.content`, none of which is ever rendered — so the answer was unconditionally wrong for the whole class. They now return `false`, which adds no false negatives: an element inside an attached iframe has a non-null `defaultView` and never reaches that branch.
- `fetch` spread `init` over the default `referrerPolicy`, and `{ default, ...init }` copies the key even when its value is `undefined`. So `fetch(url, { method: "POST", referrerPolicy: undefined })` silently deleted the pin — against undici the resulting policy is `""`, indistinguishable from never pinning it, and an empty request policy falls back to the document's own. Destructuring with a default fixes it while still letting an explicit policy override.
