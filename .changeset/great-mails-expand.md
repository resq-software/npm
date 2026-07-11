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
---

Add password-changed, new-device-login, mission-approval, and org-invitation templates plus Email.SupportLine

- New transactional templates: `password-changed` and `new-device-login` (security notices), `mission-approval` (approver sign-off, maps to the HCE mission-approval routes), and `org-invitation` (team/org invite).
- New `Email.SupportLine` primitive that renders a support-contact line sourced from `theme.org.supportEmail`, so security notices always surface an actionable path.
- Documents the full template coverage roadmap in `EMAIL_CONTENT_AND_LEGAL_GUIDE.md`.
