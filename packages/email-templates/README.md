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

# @resq-sw/email-templates

Type-safe transactional email templates for React apps and backend pipelines.

- **One contract.** Every email is a validated `{ name, to, data }` payload, described by an [Effect Schema](https://effect.website) discriminated union. Nothing else can be enqueued or rendered.
- **React Email components.** Templates are React components built on [React Email](https://react.email) with a `<Tailwind>` theme mapped to the dark-first ResQ brand — red primary, Syne/DM Sans/DM Mono — with oklch tokens converted to email-safe hex.
- **Headless render.** `renderEmail(payload)` returns `{ to, subject, html, text }` with no DOM — safe to call from queue workers, cron jobs, and other pipelines.
- **Pluggable sending.** A provider-agnostic `EmailSender` port with an optional Resend adapter under `@resq-sw/email-templates/send`.

## Install

```sh
bun add @resq-sw/email-templates effect react react-dom
# only if you use the ./send Resend adapter:
bun add resend
```

`effect`, `react`, and `react-dom` are peer dependencies; `resend` is an optional peer needed only for `./send`.

## Subpaths

| Import | Contents | Runtime |
| --- | --- | --- |
| `@resq-sw/email-templates` | `EmailPayload` schema, types, `decodeEmailPayload`, `registry`, `renderEmail` | browser + server |
| `@resq-sw/email-templates/emails` | `Email` primitives, `emailColors`, and the template components | browser + server |
| `@resq-sw/email-templates/send` | `EmailSender` port, `createResendSender`, `sendEmail` | **server only** |

## Pipeline / worker usage

Validate an untrusted payload, render it, and send it:

```ts
import { renderEmail } from "@resq-sw/email-templates";
import { createResendSender, sendEmail } from "@resq-sw/email-templates/send";

const sender = createResendSender(); // reads RESEND_API_KEY

// One-shot: render + send
const result = await sendEmail(
	sender,
	{ name: "otp", to: "user@example.com", data: { code: "123456", firstName: "Ada" } },
	{ from: "ResQ <noreply@resq.example>" },
);

if (!result.ok) {
	// result.error = { name, message }
}
```

Or render now and hand the HTML to any transport:

```ts
import { renderEmail } from "@resq-sw/email-templates";

const { subject, html, text } = await renderEmail({
	name: "password-reset",
	to: "user@example.com",
	data: { firstName: "Ada", resetUrl: "https://app.resq.example/reset?token=…" },
});
// pass subject/html/text to SES, Postmark, Nodemailer, etc.
```

The payload is validated at the boundary — an unknown `name` or missing required `data` throws `EmailValidationError`.

## React app usage

Import a template component directly (for in-app previews or your own rendering):

```tsx
import { WelcomeEmail } from "@resq-sw/email-templates/emails";

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

## Theming

Templates render in the dark-first ResQ brand by default, sourced from
[`@resq-sw/constants`](../constants)`/tokens`. Rebrand any render without forking:

```ts
const { html } = await renderEmail(payload, {
	theme: { colors: { primary: "#0ea5e9" }, fontsHref: null },
});
```

Or wrap React usage in a provider:

```tsx
import { EmailThemeContext, mergeEmailTheme } from "@resq-sw/email-templates";

<EmailThemeContext.Provider value={mergeEmailTheme({ colors: { primary: "#0ea5e9" } })}>
	<WelcomeEmail firstName="Ada" />
</EmailThemeContext.Provider>;
```

`colors` map to Tailwind `theme.extend.colors`; unset keys fall back to the ResQ
defaults. Change the brand for every app at once by editing `@resq-sw/constants`.

## Custom template suites

Compose your own typed `{ name, to, data }` contract — spread the built-in
`resqEmailTemplates` and add your own, or start fresh:

```tsx
import { createMailer, defineEmailTemplate, Email, resqEmailTemplates } from "@resq-sw/email-templates";
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
typed over your template set — unknown names and bad `data` are rejected at decode.

## Adding a built-in template

1. Add the `data` schema (and its inferred type) in [`src/schemas.ts`](src/schemas.ts).
2. Create the component in `src/emails/<name>.tsx` from `Email.*` primitives.
3. Register it in [`src/templates.tsx`](src/templates.tsx) via `defineEmailTemplate`, then add it to `resqEmailTemplates`.
4. Export the component from `src/emails/index.ts` and add a preview in `emails/<name>.tsx`.

## Custom sender

Implement the `EmailSender` port to use any provider:

```ts
import type { EmailSender } from "@resq-sw/email-templates/send";

export const sesSender: EmailSender = {
	async send({ from, to, subject, html, text }) {
		// call your provider, then:
		return { ok: true, id: "…" };
	},
};
```

## Preview

```sh
bun --filter @resq-sw/email-templates email:dev   # http://localhost:3000
```

## Runtime support

`renderEmail()` runs in **Node and Bun** (it uses `react-dom/server`). It does **not** run on Cloudflare Workers / `workerd` — `@react-email/render` resolves to its Node build there and throws at runtime (OpenNext #1205). For edge/Workers delivery, pre-render at build time (`bun --filter @resq-sw/email-templates email:export`) or render in a Node/Bun pipeline and ship the resulting HTML/text.

Sender config follows the ResQ convention: `RESEND_API_KEY` (required) and `RESEND_FROM` (verified sender, e.g. `ResQ <updates@send.resq.software>`).

## Email-client safety

Email clients drop `oklch()`, `color-mix()`, and CSS custom properties, and many ignore `rem` and flex/grid. Templates therefore:

- use the hex `emailColors` snapshot (keep it in sync with the oklch design tokens);
- pass `pixelBasedPreset` to `<Tailwind>` so utilities emit `px`;
- avoid responsive prefixes and flex/grid — use `Section` for layout.
