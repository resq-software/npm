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
"@resq-sw/email-templates": minor
"@resq-sw/constants": minor
---

Add brand-sourced org identity, legal footer, and compliance category to email templates

- `@resq-sw/constants`: add `brand.legal` with `termsUrl` and `privacyUrl`.
- `@resq-sw/email-templates`: add `Email.Header`, `Email.Signature`, `Email.LegalFooter`, and `Email.FallbackLink` primitives; thread org identity (name, registered address, legal URLs, logo) from `@resq-sw/constants` through `theme.org`; add a per-send `category` (`transactional` | `marketing`) and `unsubscribeUrl` to the mailer envelope so the legal footer renders an unsubscribe affordance only for marketing sends; `Email.CTA` now renders a copy-pasteable fallback link. All five built-in templates render the compliant header/footer.
