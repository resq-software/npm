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

---
"@resq-systems/analytics": minor
"@resq-systems/constants": minor
"@resq-systems/decorators": minor
"@resq-systems/dsa": minor
"@resq-systems/email-templates": minor
"@resq-systems/helpers": minor
"@resq-systems/http": minor
"@resq-systems/logger": minor
"@resq-systems/rate-limiting": minor
"@resq-systems/security": minor
"@resq-systems/ui": minor
---

Rebrand to ResQ Systems: rename npm scope `@resq-sw/*` → `@resq-systems/*`

**BREAKING (npm scope rename):** every package is republished under the new
`@resq-systems` scope. Consumers must update imports and dependencies from
`@resq-sw/<pkg>` to `@resq-systems/<pkg>`; the old `@resq-sw/*` packages will be
deprecated on npm. Also updates the short brand name to "ResQ Systems", email
copy and From-name to "ResQ Systems", and standardizes copyright/author metadata
to "ResQ Systems, Inc." Domains (`resq.software`) and the product name
("ResQ Tactical OS") are unchanged.
