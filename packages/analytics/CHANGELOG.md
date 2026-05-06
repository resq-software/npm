# @resq-sw/analytics

## 0.2.0

### Minor Changes

- [#60](https://github.com/resq-software/npm/pull/60) [`98dce28`](https://github.com/resq-software/npm/commit/98dce2837308609e95bf2a55b8c8f6916c8f2026) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Add `@resq-sw/analytics` — unified PostHog + GA4 client for the ResQ platform.

  - Cross-subdomain identity (`resq.software`, `research.resq.software`, `viz.resq.software`) via shared cookie domain and GA4 linker.
  - Lazy-loaded `posthog-js` via dynamic import — zero impact on initial bundle.
  - Subpath exports: `@resq-sw/analytics`, `@resq-sw/analytics/react`, `@resq-sw/analytics/next`.
  - Augmentable `AnalyticsEvents` interface for type-safe `track()` calls.
  - `withAnalyticsRewrites()` Next.js helper for the PostHog reverse-proxy pattern (survives ad-blockers, keeps cookies first-party).
