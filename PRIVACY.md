<!--
  Copyright 2026 ResQ Systems, Inc.
  SPDX-License-Identifier: Apache-2.0
-->

# Privacy

This repository publishes JavaScript packages. This notice covers what those packages and this repository's own web pages collect about the people who use them.

## This repository's own pages

The Storybook for `@resq-systems/ui` and the example apps under [`examples/`](examples/) load no analytics. The React dashboard example can be built with analytics keys to demonstrate the consent flow below; without keys, the default, it collects nothing.

## `@resq-systems/analytics`

Websites use this package to measure how they are used. It loads nothing until you accept analytics on that site. If you decline, or never choose, no analytics script is loaded, no analytics SDK is started, and nothing is sent.

If you accept, the site loads:

| Processor | What it receives |
|---|---|
| **Google Analytics 4** (Google) | Pages you view and events the site defines, plus scrolls, outbound clicks, site searches and file downloads if the site has GA4's enhanced measurement switched on; browser, device and screen details; the referring page; an approximate location derived from your IP address. Google Analytics 4 does not log or store IP addresses. Identifiers are kept in first-party `_ga` cookies. Advertising signals stay off: the package sets Google Consent Mode's `ad_storage`, `ad_user_data` and `ad_personalization` to `denied`. |
| **PostHog** (PostHog, Inc.) | Pages you view, including in-app navigation; clicks and other interactions PostHog captures automatically; events the site defines; browser and device details; the referring page; an approximate location derived from your IP address. A random identifier is kept in a first-party cookie and `localStorage`. Optional PostHog features, such as session recording, run only if the site has switched them on for its project. |

A site that signs you in may link these events to your account with `identify`.

- **Purpose:** to understand how the site is used and improve it.
- **Legal basis:** your consent.
- **Retention:** as configured with each provider by the site's operator.
- **Where:** both providers may process data in the United States. The package's PostHog default is PostHog's US region.
- **Your choice is stored** in your browser's `localStorage` under `resq-analytics-consent`.

### Withdrawing consent

Use the site's **Privacy settings** link and choose **Decline**. The package then stops PostHog capture and clears its identifiers, disables Google Analytics for the site, and deletes the `_ga` cookies. Clearing the site's data in your browser also removes the stored choice, and the site asks again on your next visit.

### Operating a site that uses the package

You are responsible for your own privacy notice. It should name these processors, your retention settings and your contact details. The package's [README](packages/analytics/README.md#consent) shows how to wire the consent banner.

## Contact

For sites ResQ Systems operates, email **contact@resq.software** or [open an issue](https://github.com/resq-software/npm/issues/new/choose). For any other site, contact that site's operator.
