<!--

## 0.6.0
### Minor Changes



- [#187](https://github.com/resq-software/npm/pull/187) [`e6c5ac8`](https://github.com/resq-software/npm/commit/e6c5ac81648a5d681961d13e7faa01982b08d478) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Validate and brand the recipient address at the mailer boundary

  `createMailer`, `decodeEmailPayload`, `renderEmail`, and `sendEmail` now decode each payload's `to` through a branded `EmailAddress` schema (exported from the package root) instead of a bare `Schema.String`. A malformed address — or one carrying the CR/LF that underpins SMTP header injection (e.g. `"ok@example.com\r\nBcc: attacker@evil"`) — is rejected with `EmailValidationError` at the decode boundary, and the validated recipient carries the `EmailAddress` brand through to `RenderedEmail["to"]`. Also replaces the opaque `decodeUnknownExit` cast with the shared `Schema.Codec<Payload, unknown, never>` idiom used across the workspace.

  BREAKING: a `to` that is not a syntactically valid email now fails validation instead of passing through; `RenderedEmail["to"]` and the decoded payload `to` narrow from `string` to the branded `EmailAddress`.

## 0.5.1
### Patch Changes



- [#179](https://github.com/resq-software/npm/pull/179) [`4a8cf9a`](https://github.com/resq-software/npm/commit/4a8cf9a1d0b8d76e9c380067c446a209117032a2) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Replace `workspace:*` internal dependency ranges with concrete semver so published packages install cleanly outside the monorepo

## 0.5.0
### Minor Changes



- [#175](https://github.com/resq-software/npm/pull/175) [`abc88da`](https://github.com/resq-software/npm/commit/abc88da66987f0cce47303d09108d4f1fc3b4520) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Validate and brand the recipient address at the mailer boundary

  `createMailer`, `decodeEmailPayload`, `renderEmail`, and `sendEmail` now decode each payload's `to` through a branded `EmailAddress` schema (exported from the package root) instead of a bare `Schema.String`. A malformed address — or one carrying the CR/LF that underpins SMTP header injection (e.g. `"ok@example.com\r\nBcc: attacker@evil"`) — is rejected with `EmailValidationError` at the decode boundary, and the validated recipient carries the `EmailAddress` brand through to `RenderedEmail["to"]`. Also replaces the opaque `decodeUnknownExit` cast with the shared `Schema.Codec<Payload, unknown, never>` idiom used across the workspace.

  BREAKING: a `to` that is not a syntactically valid email now fails validation instead of passing through; `RenderedEmail["to"]` and the decoded payload `to` narrow from `string` to the branded `EmailAddress`.

## 0.4.0
### Minor Changes



- [#174](https://github.com/resq-software/npm/pull/174) [`59d6d6d`](https://github.com/resq-software/npm/commit/59d6d6d053e755acb28bd655a9faa44362bb680d) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Validate and brand the recipient address at the mailer boundary

  `createMailer`, `decodeEmailPayload`, `renderEmail`, and `sendEmail` now decode each payload's `to` through a branded `EmailAddress` schema (exported from the package root) instead of a bare `Schema.String`. A malformed address — or one carrying the CR/LF that underpins SMTP header injection (e.g. `"ok@example.com\r\nBcc: attacker@evil"`) — is rejected with `EmailValidationError` at the decode boundary, and the validated recipient carries the `EmailAddress` brand through to `RenderedEmail["to"]`. Also replaces the opaque `decodeUnknownExit` cast with the shared `Schema.Codec<Payload, unknown, never>` idiom used across the workspace.

  BREAKING: a `to` that is not a syntactically valid email now fails validation instead of passing through; `RenderedEmail["to"]` and the decoded payload `to` narrow from `string` to the branded `EmailAddress`.

### Patch Changes



- [#171](https://github.com/resq-software/npm/pull/171) [`1f28d41`](https://github.com/resq-software/npm/commit/1f28d4141dbaf389f0096cb93fde02e2a553e3ca) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Republish with corrected manifests. Earlier releases via the tag-triggered
  `release-package.yml` workflow used `bunx npm publish`, which does not rewrite
  Bun's `workspace:*` protocol, so these packages shipped with unresolvable
  `workspace:*` dependencies (`@resq-systems/types`, `@resq-systems/dsa`,
  `@resq-systems/constants`) that break `bun install` / `npm install` in
  downstream consumers. The workflow now uses `bun publish`, which resolves the
  protocol to concrete versions at pack time.

  `@resq-systems/rate-limiting` additionally re-adds a `@deprecated`
  `RateLimitCheckResult` type alias for the renamed `RateLimitDecision`, restoring
  backward compatibility for consumers written before the rename.
- Updated dependencies [[`1f28d41`](https://github.com/resq-software/npm/commit/1f28d4141dbaf389f0096cb93fde02e2a553e3ca)]:
  - @resq-systems/constants@0.3.1

## 0.3.0
### Minor Changes



- [#167](https://github.com/resq-software/npm/pull/167) [`c80c8b8`](https://github.com/resq-software/npm/commit/c80c8b8f0eecd3e12af3e74cdd26aac98337675b) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Rebrand to ResQ Systems: rename npm scope `@resq-sw/*` → `@resq-systems/*`

  **BREAKING (npm scope rename):** every package is republished under the new
  `@resq-systems` scope. Consumers must update imports and dependencies from
  `@resq-sw/<pkg>` to `@resq-systems/<pkg>`; the old `@resq-sw/*` packages will be
  deprecated on npm. Also updates the short brand name to "ResQ Systems", email
  copy and From-name to "ResQ Systems", and standardizes copyright/author metadata
  to "ResQ Systems, Inc." Domains (`resq.software`) and the product name
  ("ResQ Tactical OS") are unchanged.

### Patch Changes

- Updated dependencies [[`1d0f73c`](https://github.com/resq-software/npm/commit/1d0f73c6b8dbb5a09e3260ad78ab1fd7ac5c4636), [`c80c8b8`](https://github.com/resq-software/npm/commit/c80c8b8f0eecd3e12af3e74cdd26aac98337675b)]:
  - @resq-systems/constants@0.3.0
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

## 0.2.0
### Minor Changes



- [#164](https://github.com/resq-software/npm/pull/164) [`d324afe`](https://github.com/resq-software/npm/commit/d324afe582374c9573142edf2b03ce5fa890fdaf) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Add password-changed, new-device-login, mission-approval, and org-invitation templates plus Email.SupportLine

  - New transactional templates: `password-changed` and `new-device-login` (security notices), `mission-approval` (approver sign-off, maps to the HCE mission-approval routes), and `org-invitation` (team/org invite).
  - New `Email.SupportLine` primitive that renders a support-contact line sourced from `theme.org.supportEmail`, so security notices always surface an actionable path.
  - Documents the full template coverage roadmap in `EMAIL_CONTENT_AND_LEGAL_GUIDE.md`.


- [#158](https://github.com/resq-software/npm/pull/158) [`4cdfb89`](https://github.com/resq-software/npm/commit/4cdfb89871ca5fa0b74314813083eed0e8cfda1a) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Add brand-sourced org identity, legal footer, and compliance category to email templates

  - `@resq-sw/constants`: add `brand.legal` with `termsUrl` and `privacyUrl`.
  - `@resq-sw/email-templates`: add `Email.Header`, `Email.Signature`, `Email.LegalFooter`, and `Email.FallbackLink` primitives; thread org identity (name, registered address, legal URLs, logo) from `@resq-sw/constants` through `theme.org`; add a per-send `category` (`transactional` | `marketing`) and `unsubscribeUrl` to the mailer envelope so the legal footer renders an unsubscribe affordance only for marketing sends; `Email.CTA` now renders a copy-pasteable fallback link. All five built-in templates render the compliant header/footer.

### Patch Changes

- Updated dependencies [[`4cdfb89`](https://github.com/resq-software/npm/commit/4cdfb89871ca5fa0b74314813083eed0e8cfda1a)]:
  - @resq-sw/constants@0.2.0

## 0.1.1
### Patch Changes



- [#156](https://github.com/resq-software/npm/pull/156) [`52a18eb`](https://github.com/resq-software/npm/commit/52a18eba2e89d17aa6056c802b16fff53bdbfde1) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Correct the `effect` peer ranges to the versions these packages are actually built and tested against.

  Every package here declared `effect: ">=3.0.0"` while pinning `effect@4.0.0-beta.*` in
  devDependencies, so v3 was never exercised. Checked against effect `3.21.4` (the newest v3),
  these runtime symbols do not exist:

  - `@resq-sw/http` — `Schema.Literals`, `Schema.decodeUnknownExit`, `Effect.timeoutOrElse`,
    `Schedule.both`, `Schedule.while`
  - `@resq-sw/dsa` — `Schema.isGreaterThan`, `Schema.isGreaterThanOrEqualTo`, `Schema.isMinLength`
  - `@resq-sw/email-templates` — `Schema.decodeUnknownExit`, `Schema.isPattern`, `Schema.Literals`
  - `@resq-sw/security` — `Schema.decodeUnknownExit`, `Schema.isGreaterThan`, `Schema.isPattern`,
    `Schema.Literals`, `Schema.makeFilter`

  `@resq-sw/rate-limiting` has no such gap on 3.21.4, but `Schema` only entered effect core at
  3.10, so `>=3.0.0` was wrong there too; its range now matches what CI builds against.

  All five move to `effect: ">=4.0.0-beta.78"`.

  `@resq-sw/http` additionally drops its required `@effect/platform` peer. It imports only
  `effect` and `effect/unstable/http` — `@effect/platform` appears nowhere in `src/`, is not even
  a devDependency, and has no v4 release; its v3 line imports `effect/Either` and `effect/FiberRef`,
  which effect v4 removed, so installing it alongside effect v4 yields an unimportable module.
  The optional `@effect/platform-bun` peer moves from `>=0.40.0` to `>=4.0.0-beta.78`, because the
  old range resolved to `0.90.0` — the v3 line — steering Bun consumers into the same broken pairing.

  No runtime or API change in any package: exports, behavior, and types are untouched.
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

# @resq-sw/email-templates

## 0.1.0

### Minor Changes

- [#140](https://github.com/resq-software/npm/pull/140) [`e4cae25`](https://github.com/resq-software/npm/commit/e4cae257eed4c6c85444fd670e3012e5781e8e23) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Add @resq-sw/email-templates: typed transactional email templates (Effect Schema contract, React Email in the dark-first ResQ brand), a themeable renderEmail with per-render overrides, a createMailer factory for composing custom template suites, otp/welcome/password-reset/notification/incident-alert templates, and an optional Resend sender. Sources design tokens from @resq-sw/constants.

### Patch Changes

- [#145](https://github.com/resq-software/npm/pull/145) [`c6982a6`](https://github.com/resq-software/npm/commit/c6982a6474860ddc400c622c7b9d3e2dfafe58d8) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Add @total-typescript/ts-reset devDependency and reset.d.ts to improve global typing defaults during development, keeping it out of the published library output.

- [#145](https://github.com/resq-software/npm/pull/145) [`c6982a6`](https://github.com/resq-software/npm/commit/c6982a6474860ddc400c622c7b9d3e2dfafe58d8) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Update TypeScript to 7.0.2 across all packages

- Updated dependencies [[`c6982a6`](https://github.com/resq-software/npm/commit/c6982a6474860ddc400c622c7b9d3e2dfafe58d8), [`e4cae25`](https://github.com/resq-software/npm/commit/e4cae257eed4c6c85444fd670e3012e5781e8e23), [`c6982a6`](https://github.com/resq-software/npm/commit/c6982a6474860ddc400c622c7b9d3e2dfafe58d8)]:
  - @resq-sw/constants@0.1.0
