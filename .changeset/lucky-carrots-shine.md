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
"@resq-systems/analytics": patch
"@resq-systems/email-templates": patch
"@resq-systems/helpers": patch
"@resq-systems/http": patch
"@resq-systems/rate-limiting": patch
"@resq-systems/security": patch
"@resq-systems/ui": patch
---

Replace `workspace:*` internal dependency ranges with concrete semver so published packages install cleanly outside the monorepo
