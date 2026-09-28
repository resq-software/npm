---
"@resq-systems/analytics": major
---

Analytics is now opt-in. `initAnalytics()` and `<AnalyticsProvider>` record the config and load nothing — no gtag.js script, no `posthog-js` import, no request — until the visitor accepts through `grantConsent()`, or an acceptance from an earlier visit is stored. `track`, `identify` and `pageview` are no-ops until then.

New exports: `grantConsent`, `denyConsent`, `getConsent`, `onConsentChange`, `CONSENT_STORAGE_KEY`, `localStorageConsentStore` and the `ConsentState` / `ConsentDecision` / `ConsentStore` types; from `@resq-systems/analytics/react`, the headless `useConsent`, `useConsentBanner` and `openPrivacySettings`. Withdrawing consent opts PostHog out, disables the GA4 stream and deletes its `_ga` cookies. GA4 now boots with Consent Mode's advertising signals set to `denied`.

Migration: render an Accept/Decline banner that calls `grantConsent()` / `denyConsent()` (see the README's Consent section) and link your privacy notice from it. Without a banner, no analytics is sent.
