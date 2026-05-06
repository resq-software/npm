<!--
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

---
"@resq-sw/analytics": minor
---

Add `@resq-sw/analytics` — unified PostHog + GA4 client for the ResQ platform.

- Cross-subdomain identity (`resq.software`, `research.resq.software`, `viz.resq.software`) via shared cookie domain and GA4 linker.
- Lazy-loaded `posthog-js` via dynamic import — zero impact on initial bundle.
- Subpath exports: `@resq-sw/analytics`, `@resq-sw/analytics/react`, `@resq-sw/analytics/next`.
- Augmentable `AnalyticsEvents` interface for type-safe `track()` calls.
- `withAnalyticsRewrites()` Next.js helper for the PostHog reverse-proxy pattern (survives ad-blockers, keeps cookies first-party).
