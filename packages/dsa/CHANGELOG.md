# Changelog

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

## 2.1.0
### Minor Changes

- [#202](https://github.com/resq-software/npm/pull/202) [`f2af02b`](https://github.com/resq-software/npm/commit/f2af02b534e9cf86a940fad487032d5453a789ce) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Add `MultiMap` to `@resq-systems/dsa` and `ManualPromise`/`signalToPromise`/`Semaphore` async primitives to `@resq-systems/helpers`, adapted from Microsoft Playwright with attribution

### Patch Changes

- [#195](https://github.com/resq-software/npm/pull/195) [`2860be7`](https://github.com/resq-software/npm/commit/2860be7c0f4a16c3f61952668450553b2e959998) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Replace `globalThis as any` process access in reordering with a typed narrow (zero `any`)

## 2.0.0
### Major Changes

- [#171](https://github.com/resq-software/npm/pull/171) [`1f28d41`](https://github.com/resq-software/npm/commit/1f28d4141dbaf389f0096cb93fde02e2a553e3ca) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Add branded Probability/Latitude/Longitude domains at numeric boundaries and a typed Graph<T, M> metadata parameter

## 1.0.0
### Major Changes

- [#168](https://github.com/resq-software/npm/pull/168) [`1d0f73c`](https://github.com/resq-software/npm/commit/1d0f73c6b8dbb5a09e3260ad78ab1fd7ac5c4636) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Tighten Distance.calculate to derive point shape from the formula and require compareFn for non-comparable PriorityQueue element types

### Minor Changes

- [#167](https://github.com/resq-software/npm/pull/167) [`c80c8b8`](https://github.com/resq-software/npm/commit/c80c8b8f0eecd3e12af3e74cdd26aac98337675b) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Rebrand to ResQ Systems: rename npm scope `@resq-sw/*` → `@resq-systems/*`

  **BREAKING (npm scope rename):** every package is republished under the new
  `@resq-systems` scope. Consumers must update imports and dependencies from
  `@resq-sw/<pkg>` to `@resq-systems/<pkg>`; the old `@resq-sw/*` packages will be
  deprecated on npm. Also updates the short brand name to "ResQ Systems", email
  copy and From-name to "ResQ Systems", and standardizes copyright/author metadata
  to "ResQ Systems, Inc." Domains (`resq.software`) and the product name
  ("ResQ Tactical OS") are unchanged.

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

## 0.1.1
### Patch Changes

- [#141](https://github.com/resq-software/npm/pull/141) [`2a3c926`](https://github.com/resq-software/npm/commit/2a3c926fc6fb88cae74984f637f99cf37de5da71) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Adopt effect 4.0.0-beta.93: bump the pinned dev version and the root effect override from beta.50, validated against the full build and test suite

- [#145](https://github.com/resq-software/npm/pull/145) [`c6982a6`](https://github.com/resq-software/npm/commit/c6982a6474860ddc400c622c7b9d3e2dfafe58d8) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Add @total-typescript/ts-reset devDependency and reset.d.ts to improve global typing defaults during development, keeping it out of the published library output.

- [#145](https://github.com/resq-software/npm/pull/145) [`c6982a6`](https://github.com/resq-software/npm/commit/c6982a6474860ddc400c622c7b9d3e2dfafe58d8) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Update TypeScript to 7.0.2 across all packages
