<h1 align="center">@resq-sw/ui</h1>

<p align="center">
  shadcn-based shared component library for the ResQ platform — tree-shakeable, strictly typed, React 19 ready.
</p>

<p align="center">
  <a href="https://github.com/resq-software/ui/actions/workflows/ci.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/resq-software/ui/ci.yml?branch=master&label=ci&style=flat-square" alt="CI" />
  </a>
  <a href="https://www.npmjs.com/package/@resq-sw/ui">
    <img src="https://img.shields.io/npm/v/@resq-sw/ui?style=flat-square&label=npm" alt="npm version" />
  </a>
  <a href="https://master--69b2711843dac80a70e4ca83.chromatic.com">
    <img src="https://img.shields.io/badge/storybook-chromatic-FF4785?logo=storybook&logoColor=white&style=flat-square" alt="Storybook" />
  </a>
  <a href="https://codecov.io/gh/resq-software/ui">
    <img src="https://codecov.io/gh/resq-software/ui/graph/badge.svg" alt="Coverage" />
  </a>
  <a href="./LICENSE.md">
    <img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg?style=flat-square" alt="License: Apache-2.0" />
  </a>
  <img src="https://img.shields.io/badge/typescript-strict-21bb42.svg?logo=typescript&logoColor=white&style=flat-square" alt="TypeScript: Strict" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Install](#install)
- [Quick Start](#quick-start)
- [Components](#components)
- [Storybook](#storybook)
- [Contributing](#contributing)
- [Contributors](#contributors)
- [Changelog](#changelog)
- [License](#license)

---

## Overview

`@resq-sw/ui` is a shared React component library built on [shadcn/ui](https://ui.shadcn.com) primitives with [Radix UI](https://www.radix-ui.com), styled via [Tailwind CSS v4](https://tailwindcss.com), and distributed as a fully tree-shakeable ESM package. It is the canonical component system used across all ResQ front-ends.

- **55 components** — accordion, alert, avatar, badge, button, calendar, card, chart, combobox, dialog, drawer, dropdown, input, select, sidebar, table, tabs, tooltip, and more
- **Subpath exports** — `import { Button } from "@resq-sw/ui/button"` — bundle only what you use
- **Strict TypeScript** — full `.d.ts` definitions shipped with every export
- **Storybook** — every component has stories; visual regression tested via Chromatic on each PR

**Related projects:**

| Repo | Description |
|------|-------------|
| [resq-software/resQ](https://github.com/resq-software/resQ) | Core platform monorepo |
| [resq-software/landing](https://github.com/resq-software/landing) | resq.software marketing site |

---

## Install

```sh
bun add @resq-sw/ui
# or: npm install @resq-sw/ui
```

**Peer dependencies:**

```sh
bun add react@^19 react-dom@^19 tailwindcss@^4
```

---

## Quick Start

Import components via subpath exports:

```tsx
import { Button } from "@resq-sw/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@resq-sw/ui/card";
import { Input } from "@resq-sw/ui/input";
```

Include the global stylesheet once in your app entry point:

```tsx
import "@resq-sw/ui/styles/globals.css";
```

Use the `cn` utility for conditional class merging:

```tsx
import { cn } from "@resq-sw/ui/lib/utils";

<div className={cn("p-4", isActive && "bg-primary")} />
```

---

## Components

| Component | Import |
|-----------|--------|
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

---

## Storybook

Browse and interact with all components:

- **Latest (master):** [master--69b2711843dac80a70e4ca83.chromatic.com](https://master--69b2711843dac80a70e4ca83.chromatic.com)
- **Library view:** [chromatic.com/library?appId=69b2711843dac80a70e4ca83&branch=master](https://www.chromatic.com/library?appId=69b2711843dac80a70e4ca83&branch=master)

PR branches are published automatically — swap `master` for any branch name in the URLs above.

### Docker (self-hosted Storybook)

```sh
docker build -t resq-ui-storybook .
docker run -p 8080:80 resq-ui-storybook
# open http://localhost:8080
```

---

## Contributing

We welcome contributions. Please read [`.github/CONTRIBUTING.md`](./.github/CONTRIBUTING.md) and [`.github/DEVELOPMENT.md`](./.github/DEVELOPMENT.md) before opening a PR.

**Local setup:**

```sh
git clone https://github.com/resq-software/ui.git
cd ui
nix develop        # Node 22, Bun
# or:
./scripts/setup.sh # installs Nix + Docker; runs bun install (also sets up Husky hooks)
```

**Common commands:**

```sh
bun storybook       # local Storybook at :6006
bun dev             # watch-mode library build → lib/
bun build           # production build
bun test            # Vitest
bun tsc             # type-check only
bun lint            # Biome
bun lint:knip       # detect unused exports
```

**Commit convention:** This project uses [Conventional Commits](https://www.conventionalcommits.org/).
All PRs must follow the `type(scope): subject` format — see the table below.

| Prefix | Effect on version |
|--------|------------------|
| `feat:` | Minor bump (`0.x.0`) |
| `fix:` / `perf:` | Patch bump (`0.0.x`) |
| `BREAKING CHANGE` footer or `!` suffix | Major bump (`x.0.0`) |
| `docs:` `style:` `refactor:` `test:` `chore:` | No version bump |

Releases are automated via [release-it](https://github.com/release-it/release-it) + [`@release-it/conventional-changelog`](https://github.com/release-it/conventional-changelog) on merge to `master`.

---

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

[![Star History Chart](https://api.star-history.com/svg?repos=resq-software/ui&type=Date)](https://star-history.com/#resq-software/ui&Date)

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the full release history.

---

## License

Copyright 2026 ResQ

Licensed under the [Apache License, Version 2.0](./LICENSE.md).
