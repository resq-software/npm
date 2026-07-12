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

# Email Content & Legal Guide

The standards every `@resq-systems/email-templates` email follows for content, brand
identity, and legal compliance. It documents what the primitives and templates
in `src/emails/` already enforce — treat it as the contract when adding or
editing a template.

## 1. Purpose & scope

Transactional and lifecycle email is a legal surface, not just a UI surface. A
message that promises something the Terms don't, hides who sent it, or drops a
required unsubscribe control creates real liability (CAN-SPAM, GDPR/PECR,
consumer-protection law). This guide keeps that safe **by construction**: the
shared primitives render the compliant chrome, and templates only supply copy.

Applies to every template composed from `Email.*` in
[`src/emails/primitives.tsx`](src/emails/primitives.tsx).

## 2. Anatomy of an email

Every template is `Email.Shell` wrapping, in order:

| Region        | Primitive                     | Purpose |
|---------------|-------------------------------|---------|
| Header        | `Email.Header`                | Brand lockup (logo + product wordmark) from `theme.org`. |
| Body          | `Email.Title` / `Paragraph` / `Code` / `CTA` | The one job of the email. Keep it to a single primary action. |
| Sign-off      | `Email.Signature` *(optional)*| Role-based only — "— The {brand} team". Lifecycle mail (welcome), not operational alerts. |
| Legal footer  | `Email.LegalFooter`           | Reason-for-receipt, legal entity + postal address, Terms/Privacy, and a conditional unsubscribe. |

- `Email.CTA` renders a copy-pasteable `Email.FallbackLink` under the button by
  default (`fallback` prop) — deliverability plus clients that strip buttons.
- Do **not** hand-roll footers or hardcode the company name/address in a
  template. Compose `Email.LegalFooter` so identity stays single-sourced.

## 3. Organization identity (single source of truth)

Names, addresses, and legal URLs come from **one** place: the `brand` object in
[`@resq-systems/constants`](../constants/src/brand.ts). `src/emails/tokens.ts` derives
`emailOrg` from it, and the theme threads it to the chrome as `theme.org`
([`EmailOrgIdentity`](src/emails/theme.tsx)):

| `theme.org` field   | Source (`brand.*`)      | Rendered in |
|---------------------|-------------------------|-------------|
| `brandName`         | `name`                  | `Signature` default |
| `productName`       | `productName`           | `Header` wordmark + logo `alt` |
| `legalName`         | `legalName`             | (available; address line leads with it) |
| `registeredAddress` | `postalAddress`         | `LegalFooter` postal line |
| `supportEmail`      | `email.support`         | support references |
| `websiteUrl`        | `domains.marketing`     | (available; **not** used as an unsubscribe fallback) |
| `termsUrl`          | `legal.termsUrl`        | `LegalFooter` Terms link |
| `privacyUrl`        | `legal.privacyUrl`      | `LegalFooter` Privacy link |
| `logoUrl`           | `logo`                  | `Header` logo |

A consumer rebrands by passing `theme.org` overrides through
`EmailThemeOverride` — never by editing template copy.

### Per-send message policy

Compliance category and unsubscribe target travel on the **envelope**, not the
template data, and reach `Email.LegalFooter` through `EmailMessageContext`:

```ts
await mailer.renderEmail({
  name: "notification",
  to: "user@example.com",
  category: "marketing",                 // defaults to "transactional"
  unsubscribeUrl: "https://app.resq.software/unsubscribe?token=…",
  data: { title: "…", body: "…" },
});
```

`category` (`transactional` | `marketing`) is validated by
[`emailCategory`](src/schemas.ts); `unsubscribeUrl` is an `HttpUrl`.

## 4. Legal wording

- **Transactional vs marketing.** `transactional` mail (OTP, password reset,
  incident alert, account notices) relates to an existing account/action and
  renders **no** unsubscribe UI. `marketing` mail **must** carry an unsubscribe
  affordance — `Email.LegalFooter` renders it automatically for
  `category="marketing"`. Never mix a promotional ask into a transactional
  template.
- **Reason for receipt must be honest.** State the real reason the recipient got
  this specific message ("because a password reset was requested for your
  account"). Do not cite "communication preferences" on a transactional send
  that surfaces no preference control.
- **Identity + physical address (CAN-SPAM).** Every email shows the registered
  legal entity and a valid physical postal address. `registeredAddress` already
  leads with the entity name, so it is a complete postal line on its own.
- **Terms & Privacy** link to `theme.org.termsUrl` / `privacyUrl`.
- **No unverified claims.** No "most secure", "bank-grade", "guaranteed", or
  compliance-badge language unless it is independently verified and true.
- **No warranties the ToS disclaims.** Copy must not promise uptime,
  outcomes, or protections the AS-IS Terms exclude.
- **No first-person promises in the signature.** `Email.Signature` is
  role-based ("— The ResQ Systems team"), never a personal commitment from an individual.

## 5. Implementation checklist

When adding or changing a template:

- [ ] Identity/URLs come from `theme.org` — nothing hardcoded.
- [ ] `Email.Header` present at the top of the card.
- [ ] Body has a single clear purpose and (at most) one primary `Email.CTA`.
- [ ] CTAs keep the plaintext `FallbackLink` (leave `fallback` default).
- [ ] `Email.LegalFooter` present with an honest `reason`.
- [ ] Operational templates (otp, password-reset, incident-alert) hard-set
      `category="transactional"` — no unsubscribe, no marketing copy.
- [ ] Marketing-capable sends pass `category="marketing"` **and**
      `unsubscribeUrl` on the envelope.
- [ ] `Email.Signature` only where a human sign-off fits (lifecycle mail).
- [ ] Snapshot + structural tests updated (`vitest -u`); legal-footer
      assertions still pass.

## 6. Copy do / don't

**Do**
- Lead with the action; keep sentences short and literal.
- Say exactly what happens and what to do next.
- Give a clear "if you didn't request this" line for security-sensitive mail.

**Don't**
- Don't bury the purpose below marketing filler.
- Don't imply endorsements, certifications, or guarantees you can't back.
- Don't use urgency/scarcity dark patterns in transactional mail.
- Don't reference an opt-out the email doesn't actually provide.

## 7. Template coverage roadmap

The gaps worth filling, grouped by system. Everything here is `transactional`
unless flagged **marketing**. Items marked ✅ ship today; the rest are planned
and follow the exact schema-struct + `Email.*` component pattern.

**Shipped (9):** `otp` ✅ · `welcome` ✅ · `password-reset` ✅ ·
`notification` ✅ · `incident-alert` ✅ · `password-changed` ✅ ·
`new-device-login` ✅ · `mission-approval` ✅ · `org-invitation` ✅

### 1. Auth / security completeness
`password-changed` ✅ · `new-device-login` (new sign-in alert) ✅ ·
email-verification / email-change confirm (distinct from welcome) ·
MFA enabled/disabled · account-locked.

### 2. Team & access (multi-operator orgs)
`org-invitation` ✅ · invite-accepted · role/permission changed · access revoked.

### 3. Operational (product alerts & approvals)
`mission-approval` ✅ · other approval-required actions · incident **ack receipt**
and **escalation / SLA-breach** (round out `incident-alert`) · asset/device health
— offline, connectivity loss, low battery · after-action / activity summary ·
report / export ready · signed / anchored-record receipt.

### 4. Compliance / trust (runbooks already exist)
breach / security-incident notification · GDPR data-export ready ·
account-deletion completed · ToS/Privacy update notice.

### 5. Billing (only when commercial)
receipt/invoice · payment-failed / dunning · trial-ending · quota/usage.

### 6. Marketing — **NOT transactional**
feature announcements · re-engagement · promo digests. These MUST be sent with
`category: "marketing"` + an `unsubscribeUrl` so the footer renders the opt-out,
and MUST NOT reuse transactional templates.

> **Note.** Items in §3–§4 are severity/CTA-shaped, so they map cleanly onto the
> existing primitives with a typed schema — cheap to add once their domain fields
> are pinned down.
