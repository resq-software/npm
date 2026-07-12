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

# @resq-systems/constants

Shared, **zero-dependency** constants for ResQ Systems apps — one source of truth reused
across the marketing site, dashboard, and transactional email.

## Install

```sh
bun add @resq-systems/constants
```

## Subpaths

| Import | Contents |
| --- | --- |
| `@resq-systems/constants` | everything below |
| `@resq-systems/constants/tokens` | `colors` (`oklch` source + email-safe `hex` snapshot, incl. `info`/`success`/`warning`/`danger` status roles), `fonts` (stacks + webfont href), `radii`, `themeColor` (light/dark PWA + viewport `theme-color`), plus the color-role types `ColorRole`, `StatusRole`, `OklchColorRole`, `ColorTokenName` |
| `@resq-systems/constants/brand` | `brand` — name, product name, legal name, tagline, description, domains, email addresses, legal URLs, socials, company info, logo, postal address |

Everything is `as const`, so values are literal-typed and tree-shakeable.

## Usage

```ts
import { colors, fonts } from "@resq-systems/constants/tokens";
import { brand } from "@resq-systems/constants/brand";

element.style.background = colors.hex.background; // "#0A0E1A"
const from = brand.email.from; // "ResQ Systems <updates@send.resq.software>"
```

`@resq-systems/email-templates` sources its default theme colors and fonts from
`./tokens`, so rebranding the palette in one place updates every email.

## Adding constants

Group by domain in its own module (`src/<domain>.ts`), export `as const`, and add
a subpath in `package.json` `exports`. Keep it curated — constants earn their
place by being reused across apps, not by being convenient to dump here.

## Rules

- **Zero runtime dependencies.** This package must stay dependency-free.
- Values are data only — no logic, no side effects (`sideEffects: false`).
- A change here ripples to every dependent; prefer additive, stable edits.

## Prerequisites

- **Runtime**: Bun 1.1+ or Node.js 20+
- **Module format**: ESM only (`"type": "module"`); every value is a plain `as const` object.

## Consuming in CSS

This package ships **TypeScript token objects, not a stylesheet** — there is no
`tokens.css` export. To expose the palette as CSS custom properties, generate them
from the tokens at build time, or reference the hex values directly:

```ts
import { colors, radii } from "@resq-systems/constants/tokens";

const rootVars = `:root {
  --color-background: ${colors.hex.background}; /* #0A0E1A */
  --radius-md: ${radii.md};                     /* 8px */
}`;
```

For Tailwind v4, map the tokens into your `@theme` block (or a generated file) so
utilities resolve against the same source of truth as the rest of the platform.

## Testing

```sh
bun --filter @resq-systems/constants test
```

## Troubleshooting

- **`Cannot find module '@resq-systems/constants/tokens.css'`**: There is no CSS export.
  Import the token objects from `@resq-systems/constants/tokens` and emit variables yourself.
- **Colors look wrong in email or older targets**: use the email-safe `colors.hex.*`
  values, not the `oklch` source — many mail clients drop `oklch()`.

