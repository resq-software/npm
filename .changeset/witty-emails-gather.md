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
"@resq-systems/constants": minor
"@resq-systems/email-templates": patch
---

Add security, research, and engineer addresses to brand.email and repoint support to the real contact@ mailbox

`brand.email` gains `security@`, `research@`, and `engineer@resq.software` entries, and `support` now aliases the real `contact@resq.software` mailbox (there is no dedicated `support@` inbox, so the previous value bounced). Email templates that surface the support address (password-changed, new-device-login) now link to `contact@`.
