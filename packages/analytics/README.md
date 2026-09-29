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
[![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)](../../LICENSE)

Unified PostHog + GA4 analytics client for the ResQ Systems platform. Built for cross-subdomain identity (`resq.software` ↔ `research.resq.software` ↔ `viz.resq.software`), lazy-loaded so it never sits on the LCP critical path, and typed events you can extend per-app.

**Analytics is opt-in.** Nothing loads — no gtag.js script, no `posthog-js` import, no request — until the visitor accepts. See [Consent](#consent).

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
import { ConsentBanner } from "./consent-banner"; // your banner — see Consent below

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
  <AnalyticsProvider config={config}>
    {children}
    <ConsentBanner />
  </AnalyticsProvider>
);
```

`AnalyticsProvider` only records the config. The providers boot when the visitor accepts in your consent banner (below), or straight away on later visits once an acceptance is stored.

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

## Consent

Every provider is gated on the visitor's decision:

| State | What happens |
|---|---|
| `"unset"` (no decision yet) | `init()` records the config and loads nothing. `track` / `identify` / `pageview` are no-ops. |
| `"granted"` | Providers boot: `posthog-js` is imported and initialised, gtag.js is injected with Consent Mode's ad signals denied, and `window.gtag` is defined as in Google's snippet unless the page already has one. |
| `"denied"` | Nothing loads. If providers had already loaded on this page, PostHog is opted out (clearing its identifiers), GA4 is disabled for the stream and its `_ga` cookies are deleted. |

The decision is stored in `localStorage` under `resq-analytics-consent` (`"granted"` / `"denied"`). Pass `new Analytics({ consentStore })` to keep it elsewhere.

The React adapter is headless, so the banner uses your own components. Give Accept and Decline equal prominence, link your privacy notice, and keep a visible way to reopen the choice:

```tsx
"use client";

import { openPrivacySettings, useConsentBanner } from "@resq-systems/analytics/react";

export const ConsentBanner = () => {
  const { open, accept, decline } = useConsentBanner();
  if (!open) return null;
  return (
    <section aria-labelledby="consent-title">
      <h2 id="consent-title">Analytics</h2>
      <p>
        May we use Google Analytics 4 and PostHog to see how the site is used? Nothing loads
        unless you accept. <a href="/privacy">Privacy notice</a>
      </p>
      <button onClick={decline}>Decline</button>
      <button onClick={accept}>Accept</button>
    </section>
  );
};

// In your footer or settings:
<button onClick={openPrivacySettings}>Privacy settings</button>;
```

Without React, call `grantConsent()` / `denyConsent()` from your own banner and read `getConsent()`.

Your site needs a privacy notice that names these processors. [PRIVACY.md](../../PRIVACY.md#resq-systemsanalytics) lists what the package sends when a visitor accepts.

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
| `initAnalytics(config)` | Record the config; boots providers only once the visitor has accepted. Idempotent. |
| `grantConsent()` | The visitor accepted: store it and boot the providers. |
| `denyConsent()` | The visitor declined or withdrew: store it and switch providers off. |
| `getConsent()` | `"granted"`, `"denied"`, or `"unset"`. |
| `onConsentChange(listener)` | Subscribe to decisions; returns an unsubscribe function. |
| `CONSENT_STORAGE_KEY` / `localStorageConsentStore` | Where the default store keeps the decision. |
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
| `ConsentState` / `ConsentDecision` / `ConsentStore` | The visitor's decision and where it is kept. |
| `AnalyticsEvents` | Augmentable event registry (see [Typed events](#typed-events)). |
| `EventName` / `TrackArgs<E>` | Derived from `AnalyticsEvents` to type `track()` names and payload arity. |
| `PostHogProviderConfig` / `GA4ProviderConfig` | Per-provider config shapes. `GA4ProviderConfig.configParams` adds GA4 fields to every `gtag("config", …)` command, e.g. `{ allow_google_signals: false, allow_ad_personalization_signals: false }`. |
| `CookieDomain` | Branded leading-dot cookie domain (e.g. `.resq.software`). Mint via `toCookieDomain` / `inferCookieDomain` / `resolveResqCookieDomain`. |
| `Ga4MeasurementId` | Branded, validated GA4 Measurement ID — minted only by `sanitizeGa4Id`. |
| `ResqSubdomain` | Union of `RESQ_SUBDOMAIN_ALLOWLIST` members. |
| `GtagCommand` | Discriminated union of the `gtag(...)` command tuples emitted here (`js` / `config` / `event` / `set` / `consent`). |
| `GtagConfigParams` / `GtagEventParams` | Flat, primitive-only parameter bags for gtag `config` / `event` calls. |

### React (`@resq-systems/analytics/react`)

| Export | Purpose |
|---|---|
| `<AnalyticsProvider config deferUntilIdle?>` | Records the config on mount; providers boot after consent. `deferUntilIdle` (default `true`) waits for `requestIdleCallback`. |
| `useAnalytics()` | Returns `{ track, identify, reset, pageview, analytics }`. |
| `useConsent()` | Returns `{ consent, accept, decline }`, kept in sync with the singleton. |
| `useConsentBanner()` | Headless banner state: `{ open, consent, accept, decline, close }`. `open` is true until the visitor chooses, or after `openPrivacySettings()`. |
| `openPrivacySettings()` | Reopen the banner so the visitor can change their choice. |

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

- The only runtime dependency is `@resq-systems/types` (tiny brand helpers); `posthog-js` is loaded via dynamic `import()` only after the visitor accepts.
- `<AnalyticsProvider deferUntilIdle>` waits for `requestIdleCallback` before booting.
- `person_profiles: "identified_only"` is set by default, so anonymous traffic doesn't burn PostHog units.

## Prerequisites

- **Runtime**: Bun 1.1+ or Node.js 20+
- **Peer Dependencies**: `posthog-js`, `react` (optional, for React/Next.js integrations)

## Configuration

- **PostHog Integration**: Requires `NEXT_PUBLIC_POSTHOG_KEY` and host rewrites using `withAnalyticsRewrites`.
- **GA4 Linker**: Cross-subdomain linker domains config option (`domains`).
- **GA4 config fields**: `configParams` on the GA4 provider config, sent with every `gtag("config", …)` command after consent:

  ```ts
  ga4: {
    measurementId: ga4Id,
    configParams: { allow_google_signals: false, allow_ad_personalization_signals: false },
  }
  ```

## Testing

```sh
bun --filter @resq-systems/analytics test
```

## Troubleshooting

- **Cross-Subdomain Linker Issues**: Ensure cookie domains match (e.g., `.resq.software`). Linker domain checks fail on exact host mismatches.
- **Ad-Blockers**: Reverse proxies (/ingest/*) can sometimes be blocked by custom DNS-level filters. Ensure proxy rewrites are active.


## License

Apache-2.0
