---
"@resq-systems/helpers": patch
"@resq-systems/http": patch
"@resq-systems/rate-limiting": patch
"@resq-systems/security": patch
"@resq-systems/analytics": patch
"@resq-systems/email-templates": patch
---

Republish with corrected manifests. Earlier releases via the tag-triggered
`release-package.yml` workflow used `bunx npm publish`, which does not rewrite
Bun's `workspace:*` protocol, so these packages shipped with unresolvable
`workspace:*` dependencies (`@resq-systems/types`, `@resq-systems/dsa`,
`@resq-systems/constants`) that break `bun install` / `npm install` in
downstream consumers. The workflow now uses `bun publish`, which resolves the
protocol to concrete versions at pack time.

`@resq-systems/rate-limiting` additionally re-adds a `@deprecated`
`RateLimitCheckResult` type alias for the renamed `RateLimitDecision`, restoring
backward compatibility for consumers written before the rename.
