<!--
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

---
"@resq-sw/http": patch
"@resq-sw/dsa": patch
"@resq-sw/email-templates": patch
"@resq-sw/rate-limiting": patch
"@resq-sw/security": patch
---

Correct the `effect` peer ranges to the versions these packages are actually built and tested against.

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
