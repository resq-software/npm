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

Add ResQ-specific helpers shared across the three TS surfaces (`landing`,
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
