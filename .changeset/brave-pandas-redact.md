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
"@resq-systems/security": patch
---

Fix redactPII leaking email addresses with Punycode/IDN TLDs

`PII_PATTERNS.email` was not updated when `EmailSchema` gained Punycode/IDN TLD support, so `redactPII` silently failed to redact addresses like `user@example.xn--p1ai`. The redaction pattern now mirrors `EmailSchema`'s TLD alternation (and drops a stray `|` from the former `[A-Z|a-z]` character class).
