<!--

## 2.0.1
### Patch Changes



- [#179](https://github.com/resq-software/npm/pull/179) [`4a8cf9a`](https://github.com/resq-software/npm/commit/4a8cf9a1d0b8d76e9c380067c446a209117032a2) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Replace `workspace:*` internal dependency ranges with concrete semver so published packages install cleanly outside the monorepo

## 2.0.0
### Major Changes



- [#171](https://github.com/resq-software/npm/pull/171) [`1f28d41`](https://github.com/resq-software/npm/commit/1f28d4141dbaf389f0096cb93fde02e2a553e3ca) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Add branded CookieDomain and a gtag command discriminated union, tightening cookieDomain and resolver return types


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

## 1.0.0
### Major Changes



- [#168](https://github.com/resq-software/npm/pull/168) [`1d0f73c`](https://github.com/resq-software/npm/commit/1d0f73c6b8dbb5a09e3260ad78ab1fd7ac5c4636) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Brand GA4 measurement IDs, tighten the event registry and track() payloads, and split color-token roles into canonical ColorRole/StatusRole types


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

## 0.4.1
### Patch Changes



- [#145](https://github.com/resq-software/npm/pull/145) [`c6982a6`](https://github.com/resq-software/npm/commit/c6982a6474860ddc400c622c7b9d3e2dfafe58d8) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Add @total-typescript/ts-reset devDependency and reset.d.ts to improve global typing defaults during development, keeping it out of the published library output.



- [#145](https://github.com/resq-software/npm/pull/145) [`c6982a6`](https://github.com/resq-software/npm/commit/c6982a6474860ddc400c622c7b9d3e2dfafe58d8) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Update TypeScript to 7.0.2 across all packages
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



- [#91](https://github.com/resq-software/npm/pull/91) [`be1d05e`](https://github.com/resq-software/npm/commit/be1d05e2b64a9e57c5498691ed6498b81bd03222) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Add ResQ-specific helpers shared across the three TS surfaces (`landing`,
  `research`, `viz`):

  - `RESQ_SUBDOMAIN_ALLOWLIST` — `readonly string[]` of `resq.software`,
    `research.resq.software`, `viz.resq.software`. Pass to
    `AnalyticsConfig.ga4.domains` for cross-domain linker setup.
  - `GA4_ID_PATTERN` / `sanitizeGa4Id(id)` — strict
    `/^G-[A-Z0-9]{6,32}$/` validator that returns the ID when valid or
    `null` otherwise. Use before interpolating an env-var-sourced GA4 ID
    into an inline `<script>` body — closes CodeQL
    `js/bad-code-sanitization` and prevents `</script>` /
    line-terminator escapes.
  - `resolveResqCookieDomain(host)` — returns `".resq.software"` only
    when `host` actually belongs to the registrable root, otherwise
    `undefined`. Use in browser code that reads
    `window.location.hostname` so preview / `localhost` deployments
    don't get their cookie rejected with a domain mismatch.

  Centralizing these means adding a fourth subdomain or tightening the
  GA4-ID format becomes a single version bump instead of three
  coordinated edits across consumer repos
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

# @resq-sw/analytics

## 0.3.0

### Minor Changes

- [#62](https://github.com/resq-software/npm/pull/62) [`14ca5d5`](https://github.com/resq-software/npm/commit/14ca5d52f247c0476100c7116a9e7a3339979829) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Add ResQ-specific helpers shared across the three TS surfaces (`landing`,
  `research`, `viz`):

  - `RESQ_SUBDOMAIN_ALLOWLIST` — `readonly string[]` of `resq.software`,
    `research.resq.software`, `viz.resq.software`. Pass to
    `AnalyticsConfig.ga4.domains` for cross-domain linker setup.
  - `GA4_ID_PATTERN` / `sanitizeGa4Id(id)` — strict
    `/^G-[A-Z0-9]{6,32}$/` validator that returns the ID when valid or
    `null` otherwise. Use before interpolating an env-var-sourced GA4 ID
    into an inline `<script>` body — closes CodeQL
    `js/bad-code-sanitization` and prevents `</script>` /
    line-terminator escapes.
  - `resolveResqCookieDomain(host)` — returns `".resq.software"` only
    when `host` actually belongs to the registrable root, otherwise
    `undefined`. Use in browser code that reads
    `window.location.hostname` so preview / `localhost` deployments
    don't get their cookie rejected with a domain mismatch.

  Centralising these means adding a fourth subdomain or tightening the
  GA4-ID format becomes a single version bump instead of three
  coordinated edits across consumer repos.

## 0.2.0

### Minor Changes

- [#60](https://github.com/resq-software/npm/pull/60) [`98dce28`](https://github.com/resq-software/npm/commit/98dce2837308609e95bf2a55b8c8f6916c8f2026) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Add `@resq-sw/analytics` — unified PostHog + GA4 client for the ResQ platform.

  - Cross-subdomain identity (`resq.software`, `research.resq.software`, `viz.resq.software`) via shared cookie domain and GA4 linker.
  - Lazy-loaded `posthog-js` via dynamic import — zero impact on initial bundle.
  - Subpath exports: `@resq-sw/analytics`, `@resq-sw/analytics/react`, `@resq-sw/analytics/next`.
  - Augmentable `AnalyticsEvents` interface for type-safe `track()` calls.
  - `withAnalyticsRewrites()` Next.js helper for the PostHog reverse-proxy pattern (survives ad-blockers, keeps cookies first-party).
