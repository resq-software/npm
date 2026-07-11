<!--

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
