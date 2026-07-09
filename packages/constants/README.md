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

# @resq-sw/constants

Shared, **zero-dependency** constants for ResQ apps — one source of truth reused
across the marketing site, dashboard, and transactional email.

## Install

```sh
bun add @resq-sw/constants
```

## Subpaths

| Import | Contents |
| --- | --- |
| `@resq-sw/constants` | everything below |
| `@resq-sw/constants/tokens` | `colors` (oklch source + email-safe hex), `fonts` (stacks + webfont href), `radii`, `themeColor` (light/dark PWA + viewport `theme-color`) |
| `@resq-sw/constants/brand` | `brand` — name, legal name, tagline, domains, email addresses, postal address |

Everything is `as const`, so values are literal-typed and tree-shakeable.

## Usage

```ts
import { colors, fonts } from "@resq-sw/constants/tokens";
import { brand } from "@resq-sw/constants/brand";

element.style.background = colors.hex.background; // "#0A0E1A"
const from = brand.email.from; // "ResQ <updates@send.resq.software>"
```

`@resq-sw/email-templates` sources its default theme colors and fonts from
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
- **Format support**: CSS variable extraction, ESM modules, and JSON structures.

## Configuration

- **Tailwind/Vite**: Import styles directly in your entry point: `import "@resq-sw/constants/tokens.css";`.

## Testing

```sh
bun test packages/constants
# or
bun --filter @resq-sw/constants test
```

## Troubleshooting

- **Missing CSS Variables**: Ensure `@resq-sw/constants/tokens.css` is imported at the very top of your global CSS sheet.

