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

# @resq-systems/ui

[![npm](https://img.shields.io/npm/v/%40resq-systems%2Fui?style=flat-square)](https://www.npmjs.com/package/@resq-systems/ui)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)](../../LICENSE.md)
[![Storybook](https://img.shields.io/badge/storybook-design.resq.software-FF4785?style=flat-square)](https://design.resq.software)

ResQ Systems's shared React component library — **63 components** built on Radix UI primitives and Tailwind CSS v4 with a dark-first oklch color system, including a set of clean-room SVG **flight instruments** for fleet telemetry. Tree-shakeable subpath exports, WCAG AA contrast, full keyboard support.

## Install

```sh
bun add @resq-systems/ui react react-dom tailwindcss
# or
npm install @resq-systems/ui react react-dom tailwindcss
```

`react`, `react-dom`, and `tailwindcss` are peer dependencies — bring your own.

## Tailwind setup

Add the package to your Tailwind v4 sources:

```css
/* app.css */
@import "tailwindcss";
@source "../node_modules/@resq-systems/ui/lib";

@import "@resq-systems/ui/styles/globals.css";
```

The `globals.css` sheet exposes the oklch palette as CSS custom properties and wires Tailwind's `bg-background`, `text-foreground`, etc. to those tokens.

## Subpath imports

Every component ships its own subpath export to keep bundles small:

```tsx
import { Button } from "@resq-systems/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@resq-systems/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@resq-systems/ui/tabs";
import { Combobox } from "@resq-systems/ui/combobox";
```

The default export (`@resq-systems/ui`) re-exports everything for convenience but pulls the full surface — prefer subpaths in production code.

## Component catalog

63 components grouped by intent:

| Group | Components |
| :--- | :--- |
| Layout | `aspect-ratio`, `card`, `resizable`, `scroll-area`, `separator`, `sidebar`, `sheet` |
| Surfaces | `accordion`, `alert`, `alert-dialog`, `collapsible`, `dialog`, `drawer`, `empty`, `hover-card`, `popover`, `tooltip` |
| Forms | `button`, `button-group`, `checkbox`, `combobox`, `field`, `input`, `input-group`, `input-otp`, `label`, `native-select`, `radio-group`, `select`, `slider`, `switch`, `textarea`, `toggle`, `toggle-group` |
| Navigation | `breadcrumb`, `command`, `context-menu`, `dropdown-menu`, `menubar`, `navigation-menu`, `pagination`, `tabs` |
| Feedback | `badge`, `progress`, `skeleton`, `sonner` (toasts), `spinner` |
| Data | `calendar`, `carousel`, `chart`, `table` |
| Misc | `avatar`, `direction`, `icons`, `item`, `kbd`, `picture` |
| Instruments | `attitude-indicator`, `heading-indicator`, `airspeed-indicator`, `altimeter`, `vertical-speed-indicator`, `turn-coordinator` — clean-room SVG flight instruments (server-renderable, theme-aware, `aria-label`led) |

Browse all components and variants at [design.resq.software](https://design.resq.software).

## Utilities

Beyond components, the barrel exports a few helpers:

| Export | Import from | Description |
| :--- | :--- | :--- |
| `cn` | `@resq-systems/ui/lib/utils` | `clsx` + `tailwind-merge` class-name combiner. |
| `useIsMobile` | `@resq-systems/ui` | Subscribes to a `(max-width: 767px)` `matchMedia` query; returns `true` below the mobile breakpoint (SSR-safe). |
| `getContrastingColor` | `@resq-systems/ui` | Picks `#000000` or `#ffffff` for maximum contrast against any CSS color. Browser-only — returns `undefined` on the server. |

```tsx
import { cn } from "@resq-systems/ui/lib/utils";
import { getContrastingColor, useIsMobile } from "@resq-systems/ui";
```

### Color types

`getContrastingColor` is backed by nominal, branded color types (from [`@resq-systems/types`](../types)) re-exported from the barrel:

| Type | Shape | Notes |
| :--- | :--- | :--- |
| `Channel` | `NumberRange<0, 255>` | A single 8-bit color channel; out-of-gamut literals (e.g. `256`) are a compile error. |
| `Rgb` | readonly `r` / `g` / `b`, each a `Channel` | A parsed, always-valid RGB triple. |
| `RGB` | `Rgb \| null` | **Deprecated** alias — prefer `Rgb` and express parse failure as `Rgb \| null` at each boundary. |

```ts
import type { Channel, Rgb, RGB } from "@resq-systems/ui";
```

## Quick start

```tsx
import { Button } from "@resq-systems/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@resq-systems/ui/card";

export const MissionCard = () => (
  <Card>
    <CardHeader>
      <CardTitle>Drone 04 — Sector 7</CardTitle>
      <CardDescription>Survey complete · 14 victims geotagged</CardDescription>
    </CardHeader>
    <CardContent>
      <Button variant="default">Dispatch ground team</Button>
    </CardContent>
  </Card>
);
```

## Design system

- **Color** — dark-first `oklch()` palette with semantic tokens (`background`, `foreground`, `muted`, `accent`, `destructive`). Light theme is opt-in via `data-theme="light"`.
- **Spacing** — Tailwind v4 default scale, with semantic tokens for layout (`--space-section`, `--space-stack`).
- **Typography** — clamp-based fluid scale (`--text-base`, `--text-hero`); two-family pairing (humanist sans + monospace).
- **Motion** — compositor-friendly only (`transform`, `opacity`); reduced-motion respected.
- **Accessibility** — WCAG AA contrast, full keyboard support, focus-visible states on every interactive element. `console-fail-test` is wired into the test suite, so any rogue `console.warn` from a missing aria attribute fails CI.

See [`design/STYLE_GUIDE.md`](../../design/STYLE_GUIDE.md) for tokens, typography rules, and component conventions.

## Development

```sh
bun --filter @resq-systems/ui storybook        # Storybook dev server
bun --filter @resq-systems/ui test             # vitest + @testing-library/react
bun --filter @resq-systems/ui build            # tsdown → lib/
bun --filter @resq-systems/ui lint             # Biome
bun --filter @resq-systems/ui chromatic        # publish visual baseline
```

## Stack

| Layer | Tool |
| :--- | :--- |
| Primitives | Radix UI |
| Styling | Tailwind CSS v4 (oklch tokens) |
| Composition | `class-variance-authority`, `tailwind-merge` |
| Testing | Vitest, @testing-library/react, `console-fail-test` |
| Visual regression | Chromatic |
| Build | tsdown |

## Prerequisites

- **Runtime**: Bun 1.1+ or Node.js 20+
- **Peer Dependencies**: `react` (v19+), `react-dom` (v19+), `tailwindcss` (v4+), `@radix-ui/*` primitives

## Configuration

- **Tailwind CSS**: Requires Tailwind v4 config inclusion. Import root styles: `@import "@resq-systems/ui/styles/globals.css";`.

## Testing

```sh
bun --filter @resq-systems/ui test
```

## Troubleshooting

- **Contrast Failures**: The package utilizes dark-first oklch colors. If custom background utilities fail accessibility tests, verify they meet the minimum WCAG AA contrast thresholds using the built-in audit utility.


## License

Apache-2.0 — see [LICENSE.md](../../LICENSE.md).
