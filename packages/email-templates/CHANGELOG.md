<!--

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
