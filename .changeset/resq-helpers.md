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

Centralising these means adding a fourth subdomain or tightening the
GA4-ID format becomes a single version bump instead of three
coordinated edits across consumer repos.
