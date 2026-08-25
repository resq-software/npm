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

# @resq-systems/email-templates

Type-safe transactional and marketing email templates for React apps and backend pipelines.

- **One payload envelope.** Every email requires `{ name, to, data }` and may include `category`, `unsubscribeUrl`, and `preferencesUrl`. An [Effect Schema](https://effect.website) discriminated union validates each template variant and its branded recipient (`EmailAddress`).
- **React Email components.** Templates are React components built on [React Email](https://react.email) with a light-base, dark-enhanced ResQ Systems theme. The shared shell uses email-safe hex values and Syne/DM Sans/DM Mono font stacks.
- **Headless render.** `renderEmail(payload)` returns `{ to, subject, html, text }` with no DOM — safe to call from queue workers, cron jobs, and other pipelines.
- **Pluggable sending.** A provider-agnostic `EmailSender` port with an optional Resend adapter under `@resq-systems/email-templates/send`.

## Install

```sh
bun add @resq-systems/email-templates effect react react-dom
# only if you use the ./send Resend adapter:
bun add resend
```

`effect`, `react`, and `react-dom` are peer dependencies; `resend` is an optional peer needed only for `./send`.

## Subpaths

| Import | Contents | Runtime |
| --- | --- | --- |
| `@resq-systems/email-templates` | `EmailPayload` schema, types, `EmailAddress`, `decodeEmailPayload`, `registry`, `renderEmail` | browser + server |
| `@resq-systems/email-templates/emails` | `Email` primitives, `emailColors`, and the template components | browser + server |
| `@resq-systems/email-templates/email-contract` | Framework-neutral design contract, stable canonicalizer, and SHA-256 integrity value | browser + server |
| `@resq-systems/email-templates/send` | `EmailSender` port, `createResendSender`, `sendEmail` | **server only** |

## Email design contract

Consumers that do not use React Email can import the same identity, color
modes, font stacks, layout measurements, and presentation rules:

```ts
import {
	canonicalizeEmailContract,
	emailDesignContract,
	emailDesignContractIntegrity,
} from "@resq-systems/email-templates/email-contract";

emailDesignContract.schemaVersion; // 2
emailDesignContract.identity.descriptor; // "Autonomous Disaster Response"
emailDesignContract.identity.logoUrl; // "https://resq.software/logo.png"
emailDesignContract.identity.logoSha256; // pinned SHA-256 of the public logo bytes
emailDesignContract.presentation.header.logoSizePx; // 40
emailDesignContract.presentation.header.logoGapPx; // 12
emailDesignContract.integrity.digest === emailDesignContractIntegrity; // true
canonicalizeEmailContract(emailDesignContract); // stable JSON without the top-level integrity field
```

The `./email-contract` import graph has no React, Effect, or Resend dependency.
Its lowercase SHA-256 digest covers the canonicalized contract values and lets
another renderer verify that it consumes the same versioned data.

The public logo URL and its SHA-256 digest are part of this versioned contract.
Changing the bytes served at that URL requires a new package release, even if the
URL itself does not change.

`emailColors` takes all six light shell roles from
`emailDesignContract.modes.light`. The contract defines the email-specific light
background, surface, border, foreground, and muted values. It imports the
primary color, all six dark shell roles, font stacks, and radii from
[`@resq-systems/constants/tokens`](../constants). Identity comes from
`@resq-systems/constants/brand`. The React Email theme also imports the four
status roles (`info`, `success`, `warning`, and `danger`) from constants; those
roles are outside the framework-neutral contract.

## Pipeline / worker usage

Validate an untrusted payload, render it, and send it:

```ts
import { renderEmail } from "@resq-systems/email-templates";
import { createResendSender, sendEmail } from "@resq-systems/email-templates/send";

const sender = createResendSender(); // reads RESEND_API_KEY

// One-shot: render + send
const result = await sendEmail(
	sender,
	{ name: "otp", to: "user@example.com", data: { code: "123456", firstName: "Ada" } },
	{ from: "ResQ Systems <noreply@resq.example>" },
);

if (!result.ok) {
	// result.error = { name, message }
}
```

Or render now and hand the HTML to any transport:

```ts
import { renderEmail } from "@resq-systems/email-templates";

const { subject, html, text } = await renderEmail({
	name: "password-reset",
	to: "user@example.com",
	data: { firstName: "Ada", resetUrl: "https://app.resq.example/reset?token=…" },
});
// pass subject/html/text to SES, Postmark, Nodemailer, etc.
```

The payload is validated at the boundary — an unknown `name`, a missing required `data` field, or a malformed recipient `to` (including one carrying a CR/LF header-injection payload) throws `EmailValidationError`. The decoded `to` is a branded `EmailAddress`, so a validated recipient can't be confused with a raw string downstream.

## Marketing opt-out controls

Marketing payloads must include `category: "marketing"` and an
`unsubscribeUrl`. `preferencesUrl` is a separate optional destination:

```ts
const marketingEmail = await renderEmail({
	name: "notification",
	to: "user@example.com",
	category: "marketing",
	unsubscribeUrl: "https://app.resq.software/unsubscribe?token=abc123",
	preferencesUrl: "https://app.resq.software/preferences?token=abc123",
	data: { title: "Response update", body: "A new field report is available." },
});
```

`unsubscribeUrl` renders the **Unsubscribe** control. `preferencesUrl` renders
**Manage preferences** only when it has its own value. The package never uses
the website URL as a substitute for either destination. Transactional messages
hide both controls even when the payload supplies the fields.

This release changes validation behavior. `decodeEmailPayload()`,
`renderEmail()`, and mailers created with `createMailer()` reject marketing
payloads without `unsubscribeUrl`. Both URL fields must be real absolute
`http://` or `https://` URLs with a host. URLs containing credentials, ASCII
whitespace, or control characters are rejected with `EmailValidationError`.

## React app usage

Import a template component directly (for in-app previews or your own rendering):

```tsx
import { WelcomeEmail } from "@resq-systems/email-templates/emails";

<WelcomeEmail firstName="Ada" verifyUrl="https://app.resq.example/verify" />;
```

## Templates

| `name` | `data` |
| --- | --- |
| `otp` | `code`, `firstName?`, `expiresInMinutes?` |
| `welcome` | `firstName`, `verifyUrl?` |
| `password-reset` | `firstName?`, `resetUrl`, `expiresInMinutes?` |
| `notification` | `title`, `body`, `severity?`, `actionUrl?`, `actionLabel?` |
| `incident-alert` | `incidentId`, `title`, `severity`, `summary`, `location?`, `detectedAt?`, `dashboardUrl` |
| `password-changed` | `firstName?`, `changedAt?`, `secureAccountUrl?` |
| `new-device-login` | `firstName?`, `device?`, `location?`, `ipAddress?`, `at?`, `secureAccountUrl?` |
| `mission-approval` | `missionId`, `title`, `summary?`, `requestedBy?`, `severity?`, `approveUrl`, `expiresInMinutes?` |
| `org-invitation` | `orgName`, `inviterName?`, `orgRole?`, `acceptUrl`, `expiresInDays?` |

## Theming

Templates render a complete light theme in inline styles by default, sourced
from the public email contract. A scoped `prefers-color-scheme: dark` rule
enhances the stable shell roles in clients that support embedded media queries.
Rebrand any render without forking:

```ts
const { html } = await renderEmail(payload, {
	theme: {
		colors: { primary: "#0EA5E9" },
		darkColors: { primary: "#38BDF8" },
		fontsHref: null,
	},
});
```

Or wrap React usage in a provider:

```tsx
import { EmailThemeContext, mergeEmailTheme } from "@resq-systems/email-templates";

<EmailThemeContext.Provider
	value={mergeEmailTheme({
		colors: { primary: "#0EA5E9" },
		darkColors: { primary: "#38BDF8" },
	})}
>
	<WelcomeEmail firstName="Ada" />
</EmailThemeContext.Provider>;
```

`colors` map to Tailwind `theme.extend.colors`; `darkColors` overrides the six
shell roles independently. Unset keys fall back to the ResQ Systems defaults,
and dark-mode values must use six-digit `#RRGGBB` notation. Use theme overrides
for render-specific changes rather than copying contract values into a consumer.

Clients that ignore the media query keep the readable light inline styles.
Clients may also block the hosted webfonts, so every font family includes system
fallbacks. Exact dark-mode rendering still depends on each client's CSS and
user preference support.

## Custom template suites

Compose your own typed `{ name, to, data }` contract — spread the built-in
`resqEmailTemplates` and add your own, or start fresh:

```tsx
import { createMailer, defineEmailTemplate, Email, resqEmailTemplates } from "@resq-systems/email-templates";
import { Schema } from "effect";

const shiftReminder = defineEmailTemplate({
	name: "shift-reminder",
	data: Schema.Struct({ operator: Schema.NonEmptyString, startsAt: Schema.String }),
	subject: (d) => `Shift at ${d.startsAt}`,
	Component: (d) => (
		<Email.Shell preview="Your shift">
			<Email.Title>Hi {d.operator}</Email.Title>
			<Email.Paragraph>Your shift starts at {d.startsAt}.</Email.Paragraph>
		</Email.Shell>
	),
});

const mailer = createMailer([...resqEmailTemplates, shiftReminder]);
const { html, text } = await mailer.renderEmail({
	name: "shift-reminder",
	to: "op@resq.software",
	data: { operator: "Ada", startsAt: "18:00" },
});
```

`mailer` exposes `{ schema, registry, names, decode, renderEmail }`, each fully
typed over your template set — unknown names, malformed recipients, and bad `data`
are rejected at decode.

## Adding a built-in template

1. Add the `data` schema (and its inferred type) in [`src/schemas.ts`](src/schemas.ts).
2. Create the component in `src/emails/<name>.tsx` from `Email.*` primitives.
3. Register it in [`src/templates.tsx`](src/templates.tsx) via `defineEmailTemplate`, then add it to `resqEmailTemplates`.
4. Export the component from `src/emails/index.ts` and add a preview in `emails/<name>.tsx`.

## Custom sender

Implement the `EmailSender` port to use any provider:

```ts
import type { EmailSender } from "@resq-systems/email-templates/send";

export const sesSender: EmailSender = {
	async send({ from, to, subject, html, text }) {
		// call your provider, then:
		return { ok: true, id: "…" };
	},
};
```

## Preview

```sh
bun --filter @resq-systems/email-templates email:dev   # http://localhost:3000
```

## Runtime support

`renderEmail()` runs in **Node and Bun** (it uses `react-dom/server`). It does **not** run on Cloudflare Workers / `workerd` — `@react-email/render` resolves to its Node build there and throws at runtime (OpenNext #1205). For edge/Workers delivery, pre-render at build time (`bun --filter @resq-systems/email-templates email:export`) or render in a Node/Bun pipeline and ship the resulting HTML/text.

Sender config follows the ResQ Systems convention: `RESEND_API_KEY` (required) and `RESEND_FROM` (verified sender, e.g. `ResQ Systems <updates@send.resq.software>`).

## Email-client safety

Email clients drop `oklch()`, `color-mix()`, and CSS custom properties, and many ignore `rem` and flex/grid. Templates therefore:

- use the email-safe hex `emailColors` palette; its light shell roles come from the public email contract;
- pass `pixelBasedPreset` to `<Tailwind>` so utilities emit `px`;
- use light inline colors as the fallback when dark-mode media queries are ignored;
- keep system fonts after each preferred brand font; and
- avoid responsive prefixes and flex/grid — use `Section` for layout.

## Prerequisites

- **Runtime**: Bun 1.1+ or Node.js 20+
- **Peer Dependencies**: `react`, `react-dom` (v19+ recommended)
- **Services**: Requires a Resend API key for direct delivery.

## Configuration

- **Resend Token**: Supply `RESEND_API_KEY` to the environment.
- **SMTP Transport**: If not using Resend, implement a custom `EmailSender` (e.g., using Nodemailer or SES).

## Testing

```sh
bun --filter @resq-systems/email-templates test
```

Coverage includes behavioural tests (contract validation, subject/link presence,
theme overrides) plus **HTML/text regression snapshots** for every built-in
template in [`tests/snapshots.test.ts`](tests/snapshots.test.ts). Because
`renderEmail()` is deterministic for fixed input, the committed
`tests/__snapshots__` baseline catches unintended changes to markup, inline
styles, or the plaintext fallback. When a change is intentional, re-baseline and
review the diff:

```sh
bun --filter @resq-systems/email-templates test -u
```

Snapshots are the email-appropriate substitute for Storybook/Chromatic here:
React Email renders to client-accurate HTML (tables + inline styles), which a
browser-oriented Storybook would not represent faithfully. For a live, mail-client
preview during development, use `email:dev` (see [Preview](#preview)).

## Troubleshooting

- **Rendering Failures**: Next.js Server Components might struggle with client-side React Email components. Render mailers asynchronously on the server.
