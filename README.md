<h1 align="center">@resq-sw/ui</h1>

<p align="center">
  shadcn-based design system for the ResQ platform
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@resq-sw/ui" target="_blank"><img alt="📦 npm version" src="https://img.shields.io/npm/v/@resq-sw/ui?color=21bb42&label=%F0%9F%93%A6%20npm" /></a>
  <a href="https://master--69b2711843dac80a70e4ca83.chromatic.com" target="_blank"><img alt="Storybook" src="https://img.shields.io/badge/storybook-chromatic-FF4785?logo=storybook&logoColor=white" /></a>
  <a href="https://github.com/resq-software/ui/blob/master/LICENSE" target="_blank"><img alt="📝 License: Apache-2.0" src="https://img.shields.io/badge/license-Apache--2.0-21bb42.svg" /></a>
  <img alt="💪 TypeScript: Strict" src="https://img.shields.io/badge/typescript-strict-21bb42.svg?logo=typescript&logoColor=white" />
</p>

## Overview

`@resq-sw/ui` is a shared React component library built on [shadcn/ui](https://ui.shadcn.com) primitives with [Radix UI](https://www.radix-ui.com), styled via [Tailwind CSS v4](https://tailwindcss.com), and distributed as a fully tree-shakeable ESM package.

- **55 components** — accordion, alert, avatar, badge, button, calendar, card, chart, combobox, dialog, drawer, dropdown, input, select, sidebar, table, tabs, tooltip, and more
- **Tree-shakeable subpath exports** — import only what you use
- **Strict TypeScript** — full type definitions included
- **Storybook** — visual testing via Chromatic on every PR

## Install

```sh
bun add @resq-sw/ui
```

Peer dependencies:

```sh
bun add react@^19 react-dom@^19 tailwindcss@^4
```

## Usage

Import components via subpath exports:

```tsx
import { Button } from "@resq-sw/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@resq-sw/ui/card";
import { Input } from "@resq-sw/ui/input";
```

Include the global stylesheet in your app entry point:

```tsx
import "@resq-sw/ui/styles/globals.css";
```

Or use the `cn` utility directly:

```tsx
import { cn } from "@resq-sw/ui/lib/utils";
```

## Components

| Component | Import |
|---|---|
| Accordion | `@resq-sw/ui/accordion` |
| Alert | `@resq-sw/ui/alert` |
| Alert Dialog | `@resq-sw/ui/alert-dialog` |
| Avatar | `@resq-sw/ui/avatar` |
| Badge | `@resq-sw/ui/badge` |
| Breadcrumb | `@resq-sw/ui/breadcrumb` |
| Button | `@resq-sw/ui/button` |
| Button Group | `@resq-sw/ui/button-group` |
| Calendar | `@resq-sw/ui/calendar` |
| Card | `@resq-sw/ui/card` |
| Carousel | `@resq-sw/ui/carousel` |
| Chart | `@resq-sw/ui/chart` |
| Checkbox | `@resq-sw/ui/checkbox` |
| Collapsible | `@resq-sw/ui/collapsible` |
| Combobox | `@resq-sw/ui/combobox` |
| Command | `@resq-sw/ui/command` |
| Context Menu | `@resq-sw/ui/context-menu` |
| Dialog | `@resq-sw/ui/dialog` |
| Drawer | `@resq-sw/ui/drawer` |
| Dropdown Menu | `@resq-sw/ui/dropdown-menu` |
| Empty | `@resq-sw/ui/empty` |
| Field | `@resq-sw/ui/field` |
| Hover Card | `@resq-sw/ui/hover-card` |
| Input | `@resq-sw/ui/input` |
| Input Group | `@resq-sw/ui/input-group` |
| Input OTP | `@resq-sw/ui/input-otp` |
| Item | `@resq-sw/ui/item` |
| Kbd | `@resq-sw/ui/kbd` |
| Label | `@resq-sw/ui/label` |
| Menubar | `@resq-sw/ui/menubar` |
| Native Select | `@resq-sw/ui/native-select` |
| Navigation Menu | `@resq-sw/ui/navigation-menu` |
| Pagination | `@resq-sw/ui/pagination` |
| Popover | `@resq-sw/ui/popover` |
| Progress | `@resq-sw/ui/progress` |
| Radio Group | `@resq-sw/ui/radio-group` |
| Resizable | `@resq-sw/ui/resizable` |
| Scroll Area | `@resq-sw/ui/scroll-area` |
| Select | `@resq-sw/ui/select` |
| Separator | `@resq-sw/ui/separator` |
| Sheet | `@resq-sw/ui/sheet` |
| Sidebar | `@resq-sw/ui/sidebar` |
| Skeleton | `@resq-sw/ui/skeleton` |
| Slider | `@resq-sw/ui/slider` |
| Sonner (Toast) | `@resq-sw/ui/sonner` |
| Spinner | `@resq-sw/ui/spinner` |
| Switch | `@resq-sw/ui/switch` |
| Table | `@resq-sw/ui/table` |
| Tabs | `@resq-sw/ui/tabs` |
| Textarea | `@resq-sw/ui/textarea` |
| Toggle | `@resq-sw/ui/toggle` |
| Toggle Group | `@resq-sw/ui/toggle-group` |
| Tooltip | `@resq-sw/ui/tooltip` |

## Storybook

Browse and interact with all components:

- **Latest (master):** [master--69b2711843dac80a70e4ca83.chromatic.com](https://master--69b2711843dac80a70e4ca83.chromatic.com)
- **Component library:** [chromatic.com/library?appId=69b2711843dac80a70e4ca83&branch=master](https://www.chromatic.com/library?appId=69b2711843dac80a70e4ca83&branch=master)

PR branches are published automatically — swap `master` for any branch name in the URLs above.

## Development

See [`.github/CONTRIBUTING.md`](./.github/CONTRIBUTING.md) and [`.github/DEVELOPMENT.md`](./.github/DEVELOPMENT.md).

```sh
bun install
bun run dev          # watch mode build
bun run storybook    # local storybook at :6006
bun run test         # vitest
bun run build        # production build → lib/
```

## Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center"><a href="https://linktr.ee/mikeodnis"><img src="https://avatars.githubusercontent.com/u/95197809?v=4?s=100" width="100px;" alt="Mike Odnis"/><br /><sub><b>Mike Odnis</b></sub></a><br /><a href="https://github.com/resq-software/ui/commits?author=WomB0ComB0" title="Code">💻</a> <a href="#content-WomB0ComB0" title="Content">🖋</a> <a href="https://github.com/resq-software/ui/commits?author=WomB0ComB0" title="Documentation">📖</a> <a href="#ideas-WomB0ComB0" title="Ideas, Planning, & Feedback">🤔</a> <a href="#infra-WomB0ComB0" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#maintenance-WomB0ComB0" title="Maintenance">🚧</a> <a href="#projectManagement-WomB0ComB0" title="Project Management">📆</a> <a href="#tool-WomB0ComB0" title="Tools">🔧</a></td>
    </tr>
  </tbody>
</table>
<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=resq-software/ui&type=Date)](https://star-history.com/#resq-software/ui&Date)

## License

[Apache-2.0](./LICENSE)
