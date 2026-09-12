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

## 0.6.0

### Minor Changes

- [#257](https://github.com/resq-software/npm/pull/257) [`36eb35f`](https://github.com/resq-software/npm/commit/36eb35f4523c355975ae5a86a1eca665aa29334b) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Harden `browser/` against malformed and mislabelled input: fix a PNG parser hang, byte-sniff animation detection, and validate contact-link construction

  Bumped `minor` rather than `patch`. No signature changes, so this is not `major` under the repo's rules, but three behaviours observably move: `obfuscateLink` now throws on input it previously accepted, `computeBox` reports `false` where it reported `true`, and `MediaHelpers.isAnimated` returns different answers for the same file. Each is a correction, but a consumer can notice.

  ***

  **Fix an unbounded loop in `PngHelpers.readChunks` that hung the calling thread on a malformed PNG.**

  `readChunks` read the chunk length with `getInt32`, so a declared length of `0xFFFFFFF4` decoded to `-12`. The cursor then advanced by `len + LEN_SIZE + CRC_SIZE` — that is, `-12 + 4 + 4 = -4` — exactly cancelling the `+4` that preceded it. Offset 8 was a fixed point, and the loop repeated identically forever.

  A **70-byte structurally-valid PNG** reaches it: the file passes `isPng`, and `MediaHelpers.getImageSize` then calls `findChunk(view, "pHYs")`, which never returns. The `try/catch` around that call cannot catch a hang, so the documented promise that the PNG-metadata step "never rejects" held only in the sense that it also never returns. In a browser this pins the main thread on an attacker-supplied image.

  The fix reads the length as unsigned, rejects lengths above the specification's `2^31-1` cap and any chunk that would run past the end of the data, and anchors every cursor update to the chunk's own start so each iteration makes structural forward progress regardless of what the file declares. It also bounds the walk by `view.byteLength` rather than `view.buffer.byteLength`, since a `DataView` can be a window onto a larger buffer.

  Signed and unsigned readings agree on every specification-valid PNG, so parsing of well-formed files is byte-identical — verified against a golden fixture (`IHDR{8,16,13} pHYs{33,41,9} IDAT{54,62,18}`, with `parsePhys` unchanged).

  Adds `tests/browser/media/png.test.ts`, the first coverage this module has had — which is why the defect shipped. It pins the hostile lengths, truncated tails, `DataView` windowing, IDAT-first ordering, and the golden parse.

  ***

  **`MediaHelpers.isAnimated` now identifies the format from the buffer's magic bytes rather than `Blob.type`.**

  The old dispatch was four equality checks against a caller-supplied label, and it was wrong in both directions. APNG is stored and served as `image/png` — `image/apng` exists but is not what a file picker reports, because browsers derive `File.type` from the `.png` extension — so the ordinary APNG case answered `false`. In the other direction, an animated GIF renamed to `.webp` reached the WebP parser, which rejected the signature and also answered `false`; any rule built on this, such as an upload check refusing animation, was bypassed by renaming the file.

  Each format parser already re-validates its own signature, so the sniff only routes: a wrong guess degrades to `false` rather than to a misparse. Measured against the previous dispatch over sixteen cases, five answers change and all five were previously wrong; none of the eleven correct answers moved. `isAnimated` is now covered — it had been excluded on the grounds that it "delegates to format-specific functions already tested elsewhere", but the delegation _choice_ was the defect and no parser test could reach it.

  **It also reads a bounded prefix rather than the whole file.**

  Every parser here answers from a header — 12 bytes for AVIF, 21 for WebP, 26 for GIF, 53 for a typical APNG — so materializing the blob was an `O(n)` read and an `O(n)` allocation for an `O(1)` question, on the main thread, once per upload. The first version of this fix made that strictly worse than what it replaced: the old MIME-label dispatch read **zero** bytes for anything outside its four types, while sniffing bytes required the buffer up front, so an 8 MB MP4 went from 0 B / 0.07 ms to 8 388 608 B / 2.7 ms, and a 32 MB one to 33 554 432 B.

  It now reads 64 KB and escalates only when it must. A _positive_ answer from a prefix is always conclusive — `acTL`, the VP8X animation bit, an `avis` brand and a second GIF image descriptor are present-or-absent markers that no later byte retracts. A _negative_ may instead mean the prefix ran out, so it escalates to a full read, except where the parser provably saw everything it could consult: `isWebpAnimated` reads nothing past byte 20, and `isAvifAnimated` scans only to the end of the `ftyp` box whose size is declared in its first four bytes.

  Verified against a full-read reference over sixteen cases spanning both branches — including an APNG whose `acTL` hides behind a 200 KB colour profile and an animated GIF whose first frame is 1 MB, which are exactly the cases that escalate: **zero answer mismatches**. Conclusive-from-prefix cases read 0.8% of the file; escalating cases pay one extra 64 KB (101–105%). The new tests assert the byte count, not just the answer, because a regression there is invisible to every other assertion in the file.

  **`isApngAnimated` walks the chunk stream instead of scanning the decoded bytes as text.**

  The previous implementation decoded the buffer with a streaming `TextDecoder` and accumulated UTF-16 code-unit counts, then compared them against byte offsets. Two silent defects followed, both confirmed against the shipped code:

  - Multi-byte data ahead of `acTL` shrank the index. Past roughly 40 bytes of it the computed `IDAT` offset landed before `acTL`'s real position, closing the search window over the chunk — so a genuine APNG carrying a compressed ICC profile reported static.
  - The scan matched the literal text `acTL` anywhere, including inside chunk _data_, so a static PNG whose `tEXt` comment read "Made with acTL Studio" reported animated.

  Matching the four-byte type field at a known offset fixes both directions and bounds the walk: lengths above the specification's `2^31-1` cap and chunks running past the end now stop it, and `IEND` terminates it. The test file is rebuilt around valid chunk streams — three of its six previous vectors were zero-filled buffers with type strings poked in at arbitrary offsets, which no structural parser can accept.

  **`obfuscateLink` validates `scheme` and `address`.**

  The `scheme: "mailto" | "tel"` union guarded the ordinary case at compile time but not the ones that matter: `obfuscateLink({ ...JSON.parse(config) })` type-checks clean because `JSON.parse` returns `any`, and this package is published, so plain-JS consumers got no enforcement at all. `scheme: "javascript"` returned `href: "javascript:alert(1)"`, which every documented usage places straight into an anchor.

  `address` was interpolated raw while `params` were percent-encoded, so `x@y.com" onmouseover="alert(1)` survived verbatim into a value the docs describe as ready for an `href`. It is now checked against an allowlist admitting the RFC 5322 atext set, the characters a phone number needs, and internationalized domains via `\p{L}\p{M}\p{N}` — excluding the four that matter: quotes break out of the attribute, angle brackets open a tag, and CR/LF inject headers into a compose window. Both rejections throw `TypeError`, matching the documented `@throws`. The empty address is still accepted, since `mailto:` is useless but not dangerous and was existing tested behaviour.

  **Three lower-severity fixes in `browser/`.**

  - `getElementComputedStyle` kept three fixed cache buckets — no-pseudo, `::before`, `::after` — so a lookup for any other pseudo (`::marker`, `::placeholder`, `::selection`) fell through to the **no-pseudo** bucket and stored the pseudo's style under the element itself. One such call inside a `beginDOMCaches` scope then corrupted `isElementVisible` and `computeBox` for that element, in either direction depending on call order. Buckets are now keyed by selector.
  - `isElementStyleVisibilityVisible` and `computeBox` returned `visible: true` when there was no computed style. That means no browsing context — a document from `DOMParser`, `createHTMLDocument`, or `<template>.content`, none of which is ever rendered — so the answer was unconditionally wrong for the whole class. They now return `false`, which adds no false negatives: an element inside an attached iframe has a non-null `defaultView` and never reaches that branch.
  - `fetch` spread `init` over the default `referrerPolicy`, and `{ default, ...init }` copies the key even when its value is `undefined`. So `fetch(url, { method: "POST", referrerPolicy: undefined })` silently deleted the pin — against undici the resulting policy is `""`, indistinguishable from never pinning it, and an empty request policy falls back to the document's own. Destructuring with a default fixes it while still letting an explicit policy override.

### Patch Changes

- [#256](https://github.com/resq-software/npm/pull/256) [`b43014e`](https://github.com/resq-software/npm/commit/b43014e16296172959680150ad1a31d6cf346b04) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Add the guard algebra, leaf guards, narrowing, tagged-union dispatch, boolean type operators, equivalence relations, total orders, typed filters and accumulating brand validation, and name the helpers callbacks with them

  **New surface on `@resq-systems/types`** — 203 exports across nine new modules, each of which gets its own subpath so a plain-Node consumer can load one small file instead of the whole barrel graph.

  Five modules make up the guard stack: 147 exports across `predicate`, `guards`, `narrow`, `union` and `logic`.

  - `@resq-systems/types/predicate` — the guard algebra. `and`, `or`, `not`, `nand`, `eqv`, `allOf`, `anyOf`, `noneOf`, `exactlyOne`, `everyOf`, `someOf`, `implies`, `compose`, `mapInput`, `refineOn`, `lazy`, `alwaysTrue`, `alwaysFalse`, plus the shape constructors `arrayOf`, `recordOf`, `structOf`, `tupleOf`, `optionalOf`, `nullableOf`, `nullishOf`. A hand-written `value is T` is a promise the compiler never checks; compose one out of small obvious guards instead. `BrandRefiner<T, B>["is"]` composes directly with `and` and `compose`, which already feed it a value proven to be the carrier type. The shape constructors (`structOf`, `tupleOf`, `arrayOf`, `recordOf`) require a `TypeGuard<unknown>` and reject a brand guard at compile time — they read fields out of an `unknown`, so a narrower guard would be invoked with input it never agreed to accept, turning validation of a malformed payload into an uncaught `TypeError`. Use `compose(isString, UserId.is)` there.
  - `@resq-systems/types/guards` — 55 exports, 50 of them leaf guards, value in and proof out: `isString`, `isFiniteNumber`, `isInRange`, `isPlainObject`, `isNonEmptyArray`, `isConstructor`, `isValidDate`, `isTypedArray`, `isArrayBufferView`, `hasKey`, `isKeyOf`, `isOneOf`, `isInstanceOf`, the four `isJson*`, and the rest. The species-tag guards are cross-realm-safe and each confirms the tag with an internal-slot probe, so a `Symbol.toStringTag` decoy does not slip through. `isTypedArray` excludes `DataView`, matching `node:util.types.isTypedArray` and lodash; `isArrayBufferView` is the check that includes it.
  - `@resq-systems/types/narrow` — `ensure`, `ensureDefined`, `parse`, `tryNarrow`, `narrowAll` and `unsafeNarrow` return a value; `ensure` and `parse` are the throwing and non-throwing halves of one API and take identical parameters in the same order (`value, guard, message?, expected?`), so swapping one for the other changes only the control flow; `assertBy`, `assertDefined`, `assertNonNullish`, `invariant` and `assertGuard` assert in statement position. The returning forms are the documented primary API because an `asserts` signature stops narrowing in _consumer_ code — error TS2775, _"Assertions require every name in the call target to be declared with an explicit type annotation"_, raised on the call itself — unless every binding in the call chain is annotated. `Assertion<A, B>` is exported so consumers can annotate their own.
  - `@resq-systems/types/union` — `matchTag`, `matchTagPartial`, `byTag`, `hasTag`, `isTagged`, `isTaggedWith`, and the `TaggedUnionOf` / `ExhaustiveHandlers` / `MemberByTag` / `MemberByTagOr` / `TaggedGuard` / `TaggedMember` type family. A missing arm is a compile error. The tag guards narrow to the union **member**, payload included, so they narrow correctly through `Array.prototype.filter` — whose narrowing overload requires the proven type to be a subtype of the element type, and silently declines to narrow when it is not. Known gap: an _extra_ arm naming a nonexistent tag is not rejected and widens the return type; a misspelled tag is still caught as a missing arm.
  - `@resq-systems/types/logic` — boolean type operators, type-only and compiling to an empty file: `If`, `Not`, `And`, `Or`, `BoolXor`, `BoolEqv`, `Nand`, `Nor`, `Implies`, `AllTrue`, `AnyTrue`, `Extends`, `IsEqual`, `IsTuple`, `IsLiteral`, `IsEmptyObject` and friends. `BoolEqv<A, B>` (`Not<BoolXor<A, B>>`) completes the algebra. This module is reachable both through the barrel and on its own subpath, bringing all five to parity; being type-only, the entry costs nothing either way.

  Four more modules make up the relational stack: 56 exports across `equivalence`, `order`, `filter` and `brand-parse`. Three of the four are reachable **only** through their own subpath and are deliberately absent from the barrel: each exports `make`, and between them they export `mapInput`, `tupleOf`, `arrayOf`, `structOf`, `recordOf`, `or` and `compose` — names the barrel already carries from `predicate` with a different meaning. One name per concept is the rule, so the entry point does the disambiguating, not a rename. `brand-parse` has no such collision and **is** barreled.

  - `@resq-systems/types/equivalence` — 16 exports. `Equivalence<A>` plus the algebra over it: `make` (whose `===` short-circuit forces reflexivity everywhere `===` is reflexive — the one hole is `NaN`, and it is documented), `eqStrict`, `eqSameValue`, `eqString`, `eqNumber`, `eqBoolean`, `eqBigInt`, `eqDate`, `combine`, `combineAll`, `mapInput`, `tupleOf`, `arrayOf`, `structOf`, `recordOf`. `eqStrict`, `eqSameValue` and `eqNumber` differ on exactly two inputs, `NaN` and `-0`; the docs carry the table. There is deliberately no `or`/`anyOf`: the union of two equivalence relations is not transitive.
  - `@resq-systems/types/order` — 26 exports. `Order<A>`, the narrow `Ordering = -1 | 0 | 1` that makes the compiler reject `(a, b) => a.age - b.age`, and `make`, `fromCompare`, `alwaysEqual`, `reverse`, `combine`, `combineAll`, `mapInput`, `orderString`, `orderNumber`, `orderBoolean`, `orderBigInt`, `orderDate`, `tupleOf`, `arrayOf`, `structOf`, `toEquivalence`. Every comparison is sign-based, never `=== -1` / `=== 1`, so a comparator returning `-5` behaves identically to one returning `-1` throughout. `isLessThan`, `isGreaterThan`, `isLessThanOrEqualTo`, `isGreaterThanOrEqualTo` and `isBetween` bridge into the guard algebra by returning a real `Predicate<A>`, so `and(isFiniteNumber, isLessThan(orderNumber)(10))` keeps the `number` proof. `min`, `max` and `clamp` are curried only — a data-first form would put the value under test in position 1, which `Array.prototype.filter` silently breaks. An `Order<T>` is assignable to `@resq-systems/dsa`'s `CompareFn<T>` for free, with no adapter and no dependency edge in either direction; `dsa` stays zero-runtime-dependency and is not touched by this release.
  - `@resq-systems/types/filter` — 11 exports. `Filter<Input, Pass, Fail>`, the typed case split: rejection is in-band and carries a type. `make`, `fromPredicate` (whose failure branch is the set-theoretic complement of what the refinement proved), `fromMaybe`, `fromThrowing`, `mapPass`, `mapFail`, `or`, `compose`, `toPredicate`, `toUndefined`. Zero runtime imports — it reuses `NarrowResult` rather than introducing a second `ok`/`error` envelope.
  - `@resq-systems/types/brand-parse` — 3 exports: `brandParser`, `BrandParser<T, B>` and `BrandError`. Where `brandRefiner` takes one predicate and reports nothing about why a value failed, `brandParser` takes N labelled constraints and reports **every** one that failed, never short-circuiting and never interpolating the offending value. `BrandParser` extends `BrandRefiner`, so an existing consumer of `.is`/`.from`/`.coerce` needs no change; `BrandError` extends `NarrowError`, so `isNarrowError` recognizes it including cross-realm.

  **Additions to four existing modules — all purely additive, no existing signature edited.** `brand` gains `BrandsOf`, `Unbrand`, `HasBrand` and `refineAll`, which composes N refiners over the public `.is` and yields a single refiner carrying the union of their brand keys. `object` gains `NoExcessProperties`, `RequiredKeys` and `OptionalKeys` — the excess-property check TypeScript performs on fresh object literals evaporates the moment an options bag passes through a generic factory, and `NoExcessProperties` restores it. `union` gains `MembersWithoutTag`, the `Exclude` counterpart to the existing `MemberByTag`, parameterized on the discriminant key rather than hard-wired to `_tag`. `narrow`'s `NarrowResult<B>` gains a defaulted second parameter, `NarrowResult<B, E = NarrowError>`; the one-argument form is unchanged, pinned in `narrow.test-d.ts` by `Expect<Equal<NarrowResult<string>, _NarrowResultBeforeTheChange<string>>>` against the pre-change definition spelled out verbatim, so structural drift in either arm fails to compile. `predicate`'s `and` gains an overload pair for a refinement combined with a plain rule over what it proved, closing a gap that silently dropped the proof and collapsed the domain.

  **Three deprecated migration shims are kept off the barrel on purpose.** `assert` and `assertExists` (`./narrow`) and `hasOwnProperty` (`./guards`) exist only so `@resq-systems/helpers` can re-export its historical names unchanged. Each is the odd one out in its own family: the two assertions throw a plain `Error` rather than a `NarrowError`, so `isNarrowError` returns `false` for them and a consumer's structured `catch` branch silently never runs; `hasOwnProperty` is the only export in `./guards` returning plain `boolean` instead of narrowing, so `if (hasOwnProperty(config, "retries")) config.retries` is still a compile error. All three now carry `@deprecated` naming their replacement (`invariant`, `ensureDefined`, `hasOwn`), so editors strike them through, and all three are absent from the flat `@resq-systems/types` entry point — barreled, `assert` would sort first in the `assert*` autocomplete list ahead of the correct `invariant`. Helpers reaches them through the `./narrow` and `./guards` subpaths, so nothing in this repo changes. This costs nothing now and would cost a major bump later, since the barrel is the one module of the four that `0.1.0` actually published.

  **`@resq-systems/helpers` is a pure move — no public API change.** `isString`, `isNumber`, `isFunction`, `isPromise`, `isDefined`, `isNonNull`, `isNonNullish`, `hasOwnProperty`, `assert` and `assertExists` are now re-exported from `@resq-systems/types` instead of defined locally. Every export path and symbol name is unchanged, and the implementations were ported byte-for-byte including the quirks: `isNumber` still returns `true` for `NaN`, `isFunction` still narrows to `(...args: unknown[]) => unknown` rather than `never[]`, `isPromise` is still Promises/A+ duck-typing rather than `instanceof`, the three nullability guards keep `Exclude<T, …>` rather than `NonNullable<T>` (they differ for `unknown`), and `assert` still throws a plain `Error` with `message || "Assertion Error"` rather than a subclass that would change `err.name`.

  Two incidental improvements, neither observable as a break: `assert` is now a function declaration rather than an annotated const, which makes its narrowing robust against TS2775 downstream, and `assertExists` is a real generic again instead of one collapsed by the old `omitFromStackTrace` wrapper.

  **Also on `@resq-systems/helpers`, three type spellings — no behavior, no new runtime dependency, no implementation moved.** `dedupe`'s `equals` parameter is now named `Equivalence<T>`, `partition`'s `predicate` is named `Predicate<T>`, and `sortById` declares its return type as `Ordering` instead of inferring the identical `0 | 1 | -1`. All three are structurally what they were, so every existing call site compiles unchanged; the point is that the combinators now compose in without an adapter — `dedupe(xs, structOf({ id: eqString }))`, `partition(xs, allOf(isA, isB))`. `array.ts` and `sort.ts` import these names with `import type`, so their emitted JavaScript contains no import statement at all — every mention of `@resq-systems/types` left in `lib/utils/array.js` and `lib/utils/sort.js` sits inside a doc comment. (`helpers` does already depend on `types` at runtime, but that edge comes from the guard move described above, not from these three signatures.)

  `sortById`'s doc records what the new type does **not** claim: it is _assignable to_ `Order<T>` but is not a **lawful** one. `NaN` ids make the equality kernel non-transitive, and the declared bound permits mixed `string`/`number` ids, where relational coercion gives `"2" < 10` but `"2" > "10"` — so sorting the same multiset can depend on input order. The doc now steers callers away from `min`, `max`, `clamp`, `isBetween` and `toEquivalence`, all of which assume the laws hold, and points at `mapInput(orderString, …)` for a lawful alternative. Behavior is unchanged; only the claim is corrected.

  **One behavior fix on `@resq-systems/helpers`: `areObjectsShallowEqual` is now symmetric.** It counted keys with `Object.keys` (own **enumerable**) but tested membership with `hasOwnProperty` (own, enumerable or not). The two disagree about which keys exist, so a non-enumerable own property made the relation asymmetric: with `const r = { b: 2 }` carrying a non-enumerable own `a`, `areObjectsShallowEqual({ a: 1 }, r)` returned `true` while `areObjectsShallowEqual(r, { a: 1 })` returned `false` — two objects with disjoint enumerable key sets reported equal in one direction. Membership now uses the same notion of key as the count, so the relation is exactly "same own-enumerable key set, pairwise `Object.is` values". This is a real change in output, but only for inputs on which the previous answer was self-contradictory. `areArraysShallowEqual` and `isEqualAllowingForFloatingPointErrors` are untouched, with docs recording that the first two are genuine `Equivalence` instances whose element relation is `Object.is` — which is why `types` ships `eqSameValue` and not only `eqStrict` — and that the third stays in `helpers` permanently because it is built on a runtime dependency and its threshold comparison is not transitive.

  **Hardening applied before release, all against code that has never shipped.**

  - `isNumericString` was a polynomial ReDoS. `\d+\.?\d*` is ambiguous, so a rejecting input of _n_ digits cost O(n²) — 5.7 s for a 100 KB string, on a guard documented for `process.env`, query strings, and request bodies. Rewritten as `\d+(?:\.\d*)?` with an identical accept/reject set; the same input now takes 0.23 ms, and a timing regression test pins it.
  - `arrayOf` and `isJsonArray` proved their element type with `Array.prototype.every`, which skips holes — so every sparse array satisfied every element guard, and iterating the "proven" result handed the caller `undefined`. Both now read each index explicitly, as `tupleOf` already did.
  - `isDate` and `isError` accepted a `Symbol.toStringTag` decoy. `isDate` now confirms the tag with a `[[DateValue]]` slot probe; `isError` requires a string `message` on the tag branch, without which the documented `catch` idiom logged `undefined` in place of the cause.
  - `isUnhandledTagError`'s cross-realm fallback was gated on `value instanceof Error` — the one check that cannot hold across a realm boundary, which is what the fallback exists for. It is now structural, matching `isNarrowError`. `NarrowError` also carries a `Symbol.for` brand so subclasses (which overwrite `name`) are recognized across realms too.
  - The tag guards narrowed to `never` whenever the discriminant was not a literal union — exactly the shape `hasTag` produces — and `never` is assignable to everything, so downstream checking silently stopped. `MemberByTagOr` removes the `never` floor for the guards; `MemberByTag` keeps it, which is correct for a named alias over a closed union.
  - `equivalence`'s `recordOf` was neither symmetric nor transitive, breaking the module's central promise that every combinator preserves all three laws. It counted keys with `Object.keys` (own **enumerable**) but tested membership with `Object.hasOwn` (own, enumerable or not), and the two disagree: given `left = { a: 1 }` and `right = { b: 2 }` carrying a non-enumerable own `a`, both sides counted one key, `hasOwn` accepted `a`, and `eq(left, right)` returned `true` while `eq(right, left)` returned `false`. Membership now reads from a `Set` of `Object.keys(right)`, so the relation is exactly "same own-enumerable key set, pairwise-equivalent values" — and the second `Object.keys(right)` allocation goes away. The existing law matrix could not catch this because it held only plain object literals; a non-enumerable pair is now in it, plus a dedicated test pinning both directions.
  - `isKeyOf` gains a documented soundness caveat: it proves `keyof T` from runtime keys, which is only sound when `T` enumerates everything the value owns.
  - `recordOf` and `isJsonObject` enumerated members with `Object.values`, which sees only _enumerable_ own keys — so `Object.defineProperty(o, "x", { value: evil, enumerable: false })` installed a property the guard never tested but `o.x` still returns. Both index signatures (`Record<string, B>` and `JsonObject`) promise a value at every string key, so the omission made the proof false; both now enumerate `Object.getOwnPropertyNames`. For `isJsonObject` this deliberately diverges from `JSON.stringify`, which drops such keys — the guard's promise is about what property access hands a consumer, not about what survives serialization. Symbol keys stay ignored (no `string` index signature covers them) and inherited properties stay out of scope, both now documented: a guard cannot repair a polluted `Object.prototype`, and a test pins that pollution does not start failing every object in the realm.

  **The predicate type helpers are namespace members, not flat aliases.** `Predicate` and `Refinement` carry their type-level helpers merged onto the interfaces they describe: `Predicate.Any`, `Predicate.In`, `Refinement.Any`, `Refinement.In`, `Refinement.Out`, `Refinement.OutUnion`, `Refinement.OutIntersection`. Seven earlier flat spellings (`AnyPredicate`, `PredicateInput`, `AnyRefinement`, `GuardInput`, `GuardedType`, `GuardedUnion`, `GuardedIntersection`) were **deleted rather than deprecated** — they only ever existed on this unreleased branch and never shipped to npm, so nothing is removed from a consumer's point of view and the bump stays `minor`. The members carry the `extends` constraints the flat aliases lacked, so handing one a non-guard is a compile error instead of a silent `never`. `Refinement.In` and `Refinement.Out` are deliberately **distributive** — that is what makes `OutUnion` and `OutIntersection` work at all — and a type-level test pins both that and the fact that the merged namespace survives the package barrel.

  **Six combinators accept both call forms.** `and`, `or`, `nand`, `eqv`, `implies` and `compose` may be called data-first (`and(p, q)`) or data-last (`and(q)`, returning `(p) => …`), so they drop into an Effect `pipe` without a wrapper. Eligibility is a mechanical rule rather than a judgement call: fixed arity exactly 2, both parameters a `Predicate`/`Refinement` from this module's own vocabulary, and a return type that is never itself a function — so a forgotten argument is rejected at the first annotated slot. Everything else is excluded by construction. Variadics (`allOf`, `anyOf`, `noneOf`, `exactlyOne`, `tupleOf`) have no arity to dispatch on; `mapInput`'s second parameter is an arbitrary function that every `Predicate` structurally satisfies; and nothing in `/guards`, `/narrow` or `/union` qualifies, because their first parameter is the value under test — a data-last `hasKey` handed to `Array.prototype.filter` (three arguments) would take the data-first branch with the array **index** as the key, and would typecheck, since `number extends PropertyKey`. Calling a dualized combinator with no arguments throws a `TypeError` naming it; extra arguments are ignored, so `predicates.reduce(and)` keeps working.

  The curried signatures take the shared domain from `self`, not from the closed-over argument, so mismatched domains behave the same in both forms — `pipe(isLoud, nand(isString))` and `nand(isLoud, isString)` both yield `Predicate<Animal>`, and `and(isCat, isString)` proves `"cat"` in either form rather than collapsing to a bare `Predicate`. Every pairing matters in practice because every guard in `/guards` is written over `unknown`. `Equal<dataFirst, dataLast>` assertions pin all six, mismatched domains included; the data-last overloads are a hand-written assertion the runtime helper cannot check, and those tests are what make them a contract.

  **Also new.** `nand` and `eqv` complete the two-operand guard algebra. `everyOf` and `someOf` fold an `Iterable<Predicate<A>>` — the runtime-built counterparts to the variadic `allOf`/`anyOf` — returning a non-narrowing `Predicate<A>`, because the member count is not statically known; they materialize the collection once at construction, so a generator behaves the same on the second call as the first. `xor` and `nor` were deliberately **not** added: `exactlyOne` and `noneOf` already cover them and generalize correctly past arity 2, where parity-xor stops being the useful reading.

  **Every documented example is executed and type-checked.** All 231 examples across the nine modules are ` ```ts doctest ` fences, extracted by `scripts/extract-doctests.ts` into committed tests under `src/__generated__/doctests/`, compiled by `tsc` and run by Vitest — 412 assertions today. 36 of the fences carry no `// =>` assertion and are executed for their compilation alone: all 29 in `logic.ts`, which is type-only and has nothing to evaluate at runtime, and 7 in `predicate.ts` that demonstrate a type rather than a value. A fence must open with imports, may import only from a subpath that genuinely exists in `package.json#exports`, and must be self-contained, so every example doubles as a check that the symbol it demonstrates is actually reachable by a consumer. `bun --filter @resq-systems/types test` fails on stale generated output and names the fix. A plain ` ```ts ` fence stays illustrative and is not extracted.

  **A new `Equivalence` or `Order` export must ship law tests.** That rule is now recorded in `packages/types/AGENTS.md` rather than left as folklore, because the compiler enforces none of it: any `(a, b) => boolean` is assignable to `Equivalence<A>` and any `(a, b) => Ordering` to `Order<A>`, so a relation that is neither symmetric nor transitive typechecks perfectly. `equivalence.test.ts` runs `expectLawful` — reflexivity, symmetry and transitivity over every pair and triple of a sample matrix — and `order.test.ts` runs `assertOrderLaws` plus `assertSortsConsistently`. Combinators must be shown to _preserve_ the laws, not merely to hold them on one example, and the matrix must include the adversarial values: `NaN`, `-0`, empty collections, and non-enumerable own properties, which is the case that `recordOf` got wrong. A deliberate violation gets a named test pinning it and a **Gotchas** block; `eqStrict`'s reflexivity break at `NaN` is the model.

  **Documentation conventions.** Every export carries `@category` — drawn from a closed twelve-value vocabulary, where the guards/predicates split is decided purely by whether the return type is `value is T` or plain `boolean` — and `@since 0.2.0`, the version at which these modules first become reachable from npm. Each doc block opens with a one-line summary and a mandatory **When to use**, adding **Details** only where the signature does not tell the whole story and **Gotchas** only where behavior will actively surprise.

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

## 0.5.0

### Minor Changes

- [#225](https://github.com/resq-software/npm/pull/225) [`13e2e2f`](https://github.com/resq-software/npm/commit/13e2e2fceb6547529d428d1656f01cb618a972f9) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Add supported-media MIME literal unions and replace `any` with precise types across helpers

  `MediaHelpers.isImageType`, `isAnimatedImageType`, `isStaticImageType`, and `isVectorImageType` now
  return type predicates over the new `SupportedImageType` / `SupportedAnimatedImageType` /
  `SupportedStaticImageType` / `SupportedVectorImageType` unions (`SupportedVideoType` and
  `SupportedMediaType` are exported too). `measureCbDuration` is now generic and returns the
  callback's own type instead of `any`. Tightened types on `dedupe`, `compact`, `sortById`,
  `getFirstFromIterable`, `promiseWithResolve`, and `Timers`. `parseCodePath` and
  `parseCodePathDetailed` now accept `null`/`undefined` for `entity`, matching the
  `"UnknownEntity"` fallback they already implemented.

  Type-only breaking changes: `sortById` now requires `id` to be a `string` or `number`, and
  `dedupe`'s `equals` callback is typed `(a: T, b: T)`. Runtime behavior is unchanged.

## 0.4.0

### Minor Changes

- [#202](https://github.com/resq-software/npm/pull/202) [`f2af02b`](https://github.com/resq-software/npm/commit/f2af02b534e9cf86a940fad487032d5453a789ce) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Add `MultiMap` to `@resq-systems/dsa` and `ManualPromise`/`signalToPromise`/`Semaphore` async primitives to `@resq-systems/helpers`, adapted from Microsoft Playwright with attribution

- [#200](https://github.com/resq-software/npm/pull/200) [`1eca8c1`](https://github.com/resq-software/npm/commit/1eca8c187e6a5736d1044390c38a7a0299a91602) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Add DOM element utilities (`@resq-systems/helpers/browser` — shadow-DOM-aware traversal, visibility, computed-style caching, box computation) and general string helpers (`escapeHTML`/`escapeHTMLAttribute`/`escapeRegExp`/`normalizeWhiteSpace`/`toSnakeCase`/`trim*`/`truncateDataUrl`/…), adapted from Microsoft Playwright with attribution

### Patch Changes

- [#195](https://github.com/resq-software/npm/pull/195) [`2860be7`](https://github.com/resq-software/npm/commit/2860be7c0f4a16c3f61952668450553b2e959998) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Remove internal any casts in object/value/id/debounce utils

- [#199](https://github.com/resq-software/npm/pull/199) [`72dc32c`](https://github.com/resq-software/npm/commit/72dc32c2e49df3590f67439a7c593850df94a983) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Rename internal utils modules to kebab-case (`ExecutionQueue` → `execution-queue`, `PerformanceTracker` → `performance-tracker`); exports unchanged

- [#197](https://github.com/resq-software/npm/pull/197) [`7269bda`](https://github.com/resq-software/npm/commit/7269bdad52363247477163490a8d8af9b1672316) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Use @resq-systems/dsa priority queue in task-exec instead of the external tinyqueue dependency

- [#195](https://github.com/resq-software/npm/pull/195) [`2860be7`](https://github.com/resq-software/npm/commit/2860be7c0f4a16c3f61952668450553b2e959998) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Deduplicate exhaustiveSwitchError to delegate to @resq-systems/types assertNever

- [#196](https://github.com/resq-software/npm/pull/196) [`f0df2f8`](https://github.com/resq-software/npm/commit/f0df2f8d197b1519e02959a9a7540aaab0f2d76b) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Type `Result.all` generically (`Result<T, E>` instead of `any`) and short-circuit on the first error; deprecate the unused `control.ts` `Result`/`OkResult`/`ErrorResult` in favor of `success`/`failure`

- Updated dependencies [[`f2af02b`](https://github.com/resq-software/npm/commit/f2af02b534e9cf86a940fad487032d5453a789ce), [`2860be7`](https://github.com/resq-software/npm/commit/2860be7c0f4a16c3f61952668450553b2e959998)]:
  - @resq-systems/dsa@2.1.0

## 0.3.1

### Patch Changes

- [#179](https://github.com/resq-software/npm/pull/179) [`4a8cf9a`](https://github.com/resq-software/npm/commit/4a8cf9a1d0b8d76e9c380067c446a209117032a2) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Replace `workspace:*` internal dependency ranges with concrete semver so published packages install cleanly outside the monorepo

## 0.3.0

### Minor Changes

- [#171](https://github.com/resq-software/npm/pull/171) [`1f28d41`](https://github.com/resq-software/npm/commit/1f28d4141dbaf389f0096cb93fde02e2a553e3ca) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Tighten parseCodePath/parseCodePathDetailed inputs (drop vacuous generics) and narrow isFunction to a real call signature instead of the banned Function type

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

- Updated dependencies [[`1f28d41`](https://github.com/resq-software/npm/commit/1f28d4141dbaf389f0096cb93fde02e2a553e3ca), [`1f28d41`](https://github.com/resq-software/npm/commit/1f28d4141dbaf389f0096cb93fde02e2a553e3ca)]:
  - @resq-systems/logger@0.3.0

## 0.2.0

### Minor Changes

- [#167](https://github.com/resq-software/npm/pull/167) [`c80c8b8`](https://github.com/resq-software/npm/commit/c80c8b8f0eecd3e12af3e74cdd26aac98337675b) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Rebrand to ResQ Systems: rename npm scope `@resq-sw/*` → `@resq-systems/*`

  **BREAKING (npm scope rename):** every package is republished under the new
  `@resq-systems` scope. Consumers must update imports and dependencies from
  `@resq-sw/<pkg>` to `@resq-systems/<pkg>`; the old `@resq-sw/*` packages will be
  deprecated on npm. Also updates the short brand name to "ResQ Systems", email
  copy and From-name to "ResQ Systems", and standardizes copyright/author metadata
  to "ResQ Systems, Inc." Domains (`resq.software`) and the product name
  ("ResQ Tactical OS") are unchanged.

- [#168](https://github.com/resq-software/npm/pull/168) [`1d0f73c`](https://github.com/resq-software/npm/commit/1d0f73c6b8dbb5a09e3260ad78ab1fd7ac5c4636) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Tighten helper types: fix catchError variadic argument inference, return literal unions from getBrowser/getPlatform, brand entity-encoded text in obfuscateLink, guard and clamp formatBytes, and thunk-type TaskExec callbacks

### Patch Changes

- Updated dependencies [[`1d0f73c`](https://github.com/resq-software/npm/commit/1d0f73c6b8dbb5a09e3260ad78ab1fd7ac5c4636), [`c80c8b8`](https://github.com/resq-software/npm/commit/c80c8b8f0eecd3e12af3e74cdd26aac98337675b)]:
  - @resq-systems/types@0.1.0
  - @resq-systems/logger@0.2.0

## 0.1.3

### Patch Changes

- [#145](https://github.com/resq-software/npm/pull/145) [`c6982a6`](https://github.com/resq-software/npm/commit/c6982a6474860ddc400c622c7b9d3e2dfafe58d8) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Add @total-typescript/ts-reset devDependency and reset.d.ts to improve global typing defaults during development, keeping it out of the published library output.

- [#145](https://github.com/resq-software/npm/pull/145) [`c6982a6`](https://github.com/resq-software/npm/commit/c6982a6474860ddc400c622c7b9d3e2dfafe58d8) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Update TypeScript to 7.0.2 across all packages

- Updated dependencies [[`c6982a6`](https://github.com/resq-software/npm/commit/c6982a6474860ddc400c622c7b9d3e2dfafe58d8), [`c6982a6`](https://github.com/resq-software/npm/commit/c6982a6474860ddc400c622c7b9d3e2dfafe58d8)]:
  - @resq-sw/logger@0.1.2

# @resq-sw/helpers

## 0.1.1

### Patch Changes

- [`43626e2`](https://github.com/resq-software/npm/commit/43626e2616195cf50df5b932054320e2db6c3373) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Initial release with tsdown builds, comprehensive tests, and package READMEs

- Updated dependencies [[`43626e2`](https://github.com/resq-software/npm/commit/43626e2616195cf50df5b932054320e2db6c3373)]:
  - @resq-sw/logger@0.1.1
