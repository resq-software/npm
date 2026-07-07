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
