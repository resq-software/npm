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
"@resq-systems/email-templates": minor
---

Validate and brand the recipient address at the mailer boundary

`createMailer`, `decodeEmailPayload`, `renderEmail`, and `sendEmail` now decode each payload's `to` through a branded `EmailAddress` schema (exported from the package root) instead of a bare `Schema.String`. A malformed address — or one carrying the CR/LF that underpins SMTP header injection (e.g. `"ok@example.com\r\nBcc: attacker@evil"`) — is rejected with `EmailValidationError` at the decode boundary, and the validated recipient carries the `EmailAddress` brand through to `RenderedEmail["to"]`. Also replaces the opaque `decodeUnknownExit` cast with the shared `Schema.Codec<Payload, unknown, never>` idiom used across the workspace.

BREAKING: a `to` that is not a syntactically valid email now fails validation instead of passing through; `RenderedEmail["to"]` and the decoded payload `to` narrow from `string` to the branded `EmailAddress`.
