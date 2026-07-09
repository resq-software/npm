<!--
  Copyright 2026 ResQ Systems, Inc.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  you may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->

---
"@resq-sw/analytics": patch
"@resq-sw/constants": patch
"@resq-sw/decorators": patch
"@resq-sw/dsa": patch
"@resq-sw/email-templates": patch
"@resq-sw/helpers": patch
"@resq-sw/http": patch
"@resq-sw/logger": patch
"@resq-sw/rate-limiting": patch
"@resq-sw/security": patch
"@resq-sw/ui": patch
---

Add @total-typescript/ts-reset devDependency and reset.d.ts to improve global typing defaults during development, keeping it out of the published library output.
