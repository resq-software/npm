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

<!--

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

<!--

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

# @resq-sw/helpers

## 0.1.1

### Patch Changes

- [`43626e2`](https://github.com/resq-software/npm/commit/43626e2616195cf50df5b932054320e2db6c3373) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Initial release with tsdown builds, comprehensive tests, and package READMEs

- Updated dependencies [[`43626e2`](https://github.com/resq-software/npm/commit/43626e2616195cf50df5b932054320e2db6c3373)]:
  - @resq-sw/logger@0.1.1
