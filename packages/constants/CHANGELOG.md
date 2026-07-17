<!--

## 0.4.0
### Minor Changes



- [#203](https://github.com/resq-software/npm/pull/203) [`848e667`](https://github.com/resq-software/npm/commit/848e667e0467e4663a6684fad00244070b11b01c) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Add a `./tokens.css` export — the design tokens (`oklch` color roles, `--resq-chart-1..5` palette, `--resq-radius-*`, `--resq-font-*` stacks) as CSS custom properties on `:root`, importable via `@import "@resq-systems/constants/tokens.css"`; a test keeps it in sync with `./tokens`


### Patch Changes



- [#195](https://github.com/resq-software/npm/pull/195) [`2860be7`](https://github.com/resq-software/npm/commit/2860be7c0f4a16c3f61952668450553b2e959998) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Align radii/fonts/oklch-surface tokens and add chart palette to match the shipped @resq-systems/ui values
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

## 0.3.1
### Patch Changes



- [#171](https://github.com/resq-software/npm/pull/171) [`1f28d41`](https://github.com/resq-software/npm/commit/1f28d4141dbaf389f0096cb93fde02e2a553e3ca) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Type color token maps with template-literal formats via satisfies so malformed hex/oklch literals fail at compile time

## 0.3.0
### Minor Changes



- [#168](https://github.com/resq-software/npm/pull/168) [`1d0f73c`](https://github.com/resq-software/npm/commit/1d0f73c6b8dbb5a09e3260ad78ab1fd7ac5c4636) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Brand GA4 measurement IDs, tighten the event registry and track() payloads, and split color-token roles into canonical ColorRole/StatusRole types



- [#167](https://github.com/resq-software/npm/pull/167) [`c80c8b8`](https://github.com/resq-software/npm/commit/c80c8b8f0eecd3e12af3e74cdd26aac98337675b) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Rebrand to ResQ Systems: rename npm scope `@resq-sw/*` → `@resq-systems/*`

  **BREAKING (npm scope rename):** every package is republished under the new
  `@resq-systems` scope. Consumers must update imports and dependencies from
  `@resq-sw/<pkg>` to `@resq-systems/<pkg>`; the old `@resq-sw/*` packages will be
  deprecated on npm. Also updates the short brand name to "ResQ Systems", email
  copy and From-name to "ResQ Systems", and standardizes copyright/author metadata
  to "ResQ Systems, Inc." Domains (`resq.software`) and the product name
  ("ResQ Tactical OS") are unchanged.

## 0.2.0
### Minor Changes



- [#158](https://github.com/resq-software/npm/pull/158) [`4cdfb89`](https://github.com/resq-software/npm/commit/4cdfb89871ca5fa0b74314813083eed0e8cfda1a) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Add brand-sourced org identity, legal footer, and compliance category to email templates

  - `@resq-sw/constants`: add `brand.legal` with `termsUrl` and `privacyUrl`.
  - `@resq-sw/email-templates`: add `Email.Header`, `Email.Signature`, `Email.LegalFooter`, and `Email.FallbackLink` primitives; thread org identity (name, registered address, legal URLs, logo) from `@resq-sw/constants` through `theme.org`; add a per-send `category` (`transactional` | `marketing`) and `unsubscribeUrl` to the mailer envelope so the legal footer renders an unsubscribe affordance only for marketing sends; `Email.CTA` now renders a copy-pasteable fallback link. All five built-in templates render the compliant header/footer.
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

# @resq-sw/constants

## 0.1.0

### Minor Changes

- [#140](https://github.com/resq-software/npm/pull/140) [`e4cae25`](https://github.com/resq-software/npm/commit/e4cae257eed4c6c85444fd670e3012e5781e8e23) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Add @resq-sw/constants: shared zero-dependency design tokens (oklch + email-safe hex, fonts, radii) and brand identity for reuse across apps

### Patch Changes

- [#145](https://github.com/resq-software/npm/pull/145) [`c6982a6`](https://github.com/resq-software/npm/commit/c6982a6474860ddc400c622c7b9d3e2dfafe58d8) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Add @total-typescript/ts-reset devDependency and reset.d.ts to improve global typing defaults during development, keeping it out of the published library output.

- [#145](https://github.com/resq-software/npm/pull/145) [`c6982a6`](https://github.com/resq-software/npm/commit/c6982a6474860ddc400c622c7b9d3e2dfafe58d8) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Update TypeScript to 7.0.2 across all packages
