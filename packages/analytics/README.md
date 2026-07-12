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

# @resq-systems/analytics

[![npm](https://img.shields.io/npm/v/%40resq-systems%2Fanalytics?style=flat-square)](https://www.npmjs.com/package/@resq-systems/analytics)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)](../../LICENSE.md)

Unified PostHog + GA4 analytics client for the ResQ Systems platform. Built for cross-subdomain identity (`resq.software` ↔ `research.resq.software` ↔ `viz.resq.software`), lazy-loaded so it never sits on the LCP critical path, and typed events you can extend per-app.

## Install

```sh
bun add @resq-systems/analytics posthog-js
# or
npm install @resq-systems/analytics posthog-js
```

`posthog-js`, `react`, and `react-dom` are optional peer dependencies — only install what your consumer actually uses.

## Quick start (Next.js App Router)

```ts
// next.config.ts
import { withAnalyticsRewrites } from "@resq-systems/analytics/next";

export default withAnalyticsRewrites({
  // ...your existing config
});
```

```tsx
// app/providers.tsx
"use client";

import { AnalyticsProvider } from "@resq-systems/analytics/react";
import { inferCookieDomain, sanitizeGa4Id, type AnalyticsConfig } from "@resq-systems/analytics";

// GA4 ids and cookie domains are branded — mint them through their validators
// so a raw env string can never reach a gtag / cookie sink unchecked.
const ga4Id = sanitizeGa4Id(process.env.NEXT_PUBLIC_GA4_ID);

const config: AnalyticsConfig = {
  posthog: {
    key: process.env.NEXT_PUBLIC_POSTHOG_KEY!,
    host: "/ingest",
    uiHost: "https://us.posthog.com",
  },
  // Only wire GA4 once the id passes validation.
  ...(ga4Id ? { ga4: { measurementId: ga4Id } } : {}),
  cookieDomain: inferCookieDomain(["resq.software", "research.resq.software", "viz.resq.software"]),
};

export const Providers = ({ children }: { children: React.ReactNode }) => (
  <AnalyticsProvider config={config}>{children}</AnalyticsProvider>
);
```

```tsx
"use client";

import { useAnalytics } from "@resq-systems/analytics/react";

export const RequestBriefingButton = () => {
  const { track } = useAnalytics();
  return (
    <button onClick={() => track("briefing_requested", { tier: "defense" })}>
      Request a briefing
    </button>
  );
};
```

## Typed events

Extend `AnalyticsEvents` once per app to make `track()` calls type-safe:

```ts
declare module "@resq-systems/analytics" {
  interface AnalyticsEvents {
    briefing_requested: { tier: "civilian" | "defense" | "allied" };
    cta_clicked: { id: string; section: string };
    research_paper_opened: { slug: string; locale: string };
  }
}
```

After this, `track("briefing_requested", { tier: "civilian" })` type-checks; `track("briefing_requested", { tier: "wrong" })` does not.

## API

### Core (`@resq-systems/analytics`)

| Export | Purpose |
|---|---|
| `initAnalytics(config)` | Boot the singleton. Idempotent. |
| `track(event, props?)` | Fan out to PostHog + GA4. |
| `identify(userId, traits?)` | Bind an identity to the current session. |
| `pageview(url?)` | Manual SPA pageview. |
| `reset()` | Clear identity + provider state. Use on sign-out. |
| `analytics` | The singleton, if you need direct access. |
| `inferCookieDomain(domains)` | Longest shared registrable root as a branded `CookieDomain`, or `undefined`. |
| `resolveResqCookieDomain(host?)` | The branded `.resq.software` `CookieDomain` when `host` is under that root, else `undefined`. |
| `toCookieDomain(host)` | Normalize + validate any host to a leading-dot `CookieDomain`, or `null`. |
| `isCookieDomain(value)` | Type guard: is a string already a normalized `CookieDomain`? |
| `sanitizeGa4Id(id)` | Validate a GA4 Measurement ID against `GA4_ID_PATTERN`; returns a branded `Ga4MeasurementId` or `null`. |
| `GA4_ID_PATTERN` | `RegExp` for Google's `G-XXXXXX` Measurement ID format. |
| `RESQ_SUBDOMAIN_ALLOWLIST` | The three ResQ subdomains used for GA4 cross-domain linking. |

### Types (`@resq-systems/analytics`)

| Type | Purpose |
|---|---|
| `AnalyticsConfig` | Root config: `posthog`, `ga4`, `cookieDomain`, `disabled`, `debug`. |
| `AnalyticsEvents` | Augmentable event registry (see [Typed events](#typed-events)). |
| `EventName` / `TrackArgs<E>` | Derived from `AnalyticsEvents` to type `track()` names and payload arity. |
| `PostHogProviderConfig` / `GA4ProviderConfig` | Per-provider config shapes. |
| `CookieDomain` | Branded leading-dot cookie domain (e.g. `.resq.software`). Mint via `toCookieDomain` / `inferCookieDomain` / `resolveResqCookieDomain`. |
| `Ga4MeasurementId` | Branded, validated GA4 Measurement ID — minted only by `sanitizeGa4Id`. |
| `ResqSubdomain` | Union of `RESQ_SUBDOMAIN_ALLOWLIST` members. |
| `GtagCommand` | Discriminated union of the `gtag(...)` command tuples emitted here (`js` / `config` / `event` / `set` / `consent`). |
| `GtagConfigParams` / `GtagEventParams` | Flat, primitive-only parameter bags for gtag `config` / `event` calls. |

### React (`@resq-systems/analytics/react`)

| Export | Purpose |
|---|---|
| `<AnalyticsProvider config deferUntilIdle?>` | Initialises the singleton on mount. `deferUntilIdle` (default `true`) waits for `requestIdleCallback`. |
| `useAnalytics()` | Returns `{ track, identify, reset, pageview, analytics }`. |

### Next (`@resq-systems/analytics/next`)

| Export | Purpose |
|---|---|
| `withAnalyticsRewrites(config, opts?)` | Adds `/ingest/*` PostHog reverse-proxy rewrites. |
| `ga4Stream(measurementId, domains?)` | Build a `GA4ProviderConfig` with cross-subdomain linker domains. |

## Cross-subdomain identity

For ResQ Systems's three surfaces to share a single `distinct_id`:

1. **Cookie domain.** Set `cookieDomain` to a branded `CookieDomain` — mint it with `inferCookieDomain([...])`, `toCookieDomain(".resq.software")`, or `resolveResqCookieDomain(host)`.
2. **Reverse proxy.** Each subdomain's `next.config.ts` calls `withAnalyticsRewrites(...)` so events ingest at `<subdomain>/ingest/*`, not `*.posthog.com`.
3. **GA4 linker.** Pass `domains: ["resq.software", "research.resq.software", "viz.resq.software"]` so GA4 stops counting cross-subdomain navigation as referral traffic.
4. **Same Measurement ID + PostHog key** across all three apps.

## Performance posture

- The only runtime dependency is `@resq-systems/types` (tiny brand helpers); `posthog-js` is loaded via dynamic `import()` inside `init()`.
- `<AnalyticsProvider deferUntilIdle>` waits for `requestIdleCallback` before booting.
- `person_profiles: "identified_only"` is set by default, so anonymous traffic doesn't burn PostHog units.

## Prerequisites

- **Runtime**: Bun 1.1+ or Node.js 20+
- **Peer Dependencies**: `posthog-js`, `react` (optional, for React/Next.js integrations)

## Configuration

- **PostHog Integration**: Requires `NEXT_PUBLIC_POSTHOG_KEY` and host rewrites using `withAnalyticsRewrites`.
- **GA4 Linker**: Cross-subdomain linker domains config option (`domains`).

## Testing

```sh
bun --filter @resq-systems/analytics test
```

## Troubleshooting

- **Cross-Subdomain Linker Issues**: Ensure cookie domains match (e.g., `.resq.software`). Linker domain checks fail on exact host mismatches.
- **Ad-Blockers**: Reverse proxies (/ingest/*) can sometimes be blocked by custom DNS-level filters. Ensure proxy rewrites are active.


## License

Apache-2.0
