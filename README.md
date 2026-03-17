# @resq-sw/ui

A production-ready, high-performance React component library built with Radix UI primitives, Tailwind CSS v4, and strict TypeScript safety.

[![Version](https://img.shields.io/badge/version-0.6.2-blue)](https://www.npmjs.com/package/@resq-sw/ui)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](./LICENSE.md)

## Overview

`@resq-sw/ui` is a centralized, high-performance UI library designed for ResQ-ecosystem front-end applications. By leveraging **Radix UI** primitives and **Tailwind CSS v4** styling, we provide a robust, accessible foundation for enterprise-grade interfaces.

## Features

- **Dark-First Design:** Dark theme by default, light mode as explicit opt-in via `.light` class.
- **oklch Color System:** Perceptually uniform colors for vibrant, consistent theming across dark and light modes.
- **Tree-Shakeable:** Modular architecture with per-component subpath exports for minimal bundle sizes.
- **Strictly Typed:** Full TypeScript support with explicit `.d.ts` definitions.
- **Accessibility First:** Built on Radix UI primitives to ensure WCAG 2.1 AA compliance.
- **Performance-Tested:** 687+ regression tests covering frame timing, layout stability, DOM budgets, and GPU-friendly transitions.
- **Developer-Focused:** Includes custom scaffolding scripts, AI-assisted development agents, and a reproducible Nix-based environment.
- **Rigorous Quality:** Verified via Chromatic visual regression and automated CI/CD pipelines.

## Architecture

```mermaid
C4Context
    title Component Consumption Model
    Person(user, "Developer")
    System_Boundary(resq, "resq_sw_ui") {
        Component(subpath, "Subpath Exports")
        Component(radix, "Radix UI Primitives")
        Component(tw, "Tailwind CSS v4")
        Component(utils, "Internal Hooks/Utils")
    }
    System(app, "App Implementation")
    System_Ext(ci, "Chromatic / Storybook")

    Rel(user, app, "Develops")
    Rel(app, subpath, "Imports components")
    Rel(subpath, radix, "Uses")
    Rel(subpath, tw, "Styles")
    Rel(subpath, utils, "Integrates")
    Rel(ci, subpath, "Visual Testing")
```

## Installation

```bash
bun add @resq-sw/ui
# Required peer dependencies
bun add react@^19 react-dom@^19 tailwindcss@^4
```

## Quick Start

1. **Global Setup**: Include global styles in your root entry file:
    ```tsx
    import "@resq-sw/ui/styles/globals.css";
    ```

2. **Basic Usage**:
    ```tsx
    import { Button } from "@resq-sw/ui/button";
    import { Card } from "@resq-sw/ui/card";

    export const App = () => (
      <Card>
        <Button onClick={() => alert("Ready!")}>Click Me</Button>
      </Card>
    );
    ```

## Theming

### Dark-first approach

The library renders in dark mode by default. To enable light mode, add the `.light` class to a parent element:

```tsx
<div className="light">
  {/* All children render in light mode */}
</div>
```

### Customizing tokens

All design tokens are CSS custom properties using the `oklch` color space. Override them in your `globals.css`:

```css
:root {
  --primary: oklch(62% 0.19 25);
  --background: oklch(16% 0.02 270);
}
```

### Typography

| Font | Role | CSS class |
| :--- | :--- | :--- |
| **Syne** | Display headings, card titles, stat values | `font-display` |
| **DM Sans** | Body copy, UI text, descriptions | `font-sans` (default) |
| **DM Mono** | Labels, buttons, badges, data, code | `font-mono` |

## API Reference

The library exposes components via subpath exports. Key categories include:

| Category | Key Components |
| :--- | :--- |
| **Input** | `Button`, `Input`, `Select`, `Checkbox`, `Combobox` |
| **Layout** | `Card`, `Accordion`, `Sidebar`, `Separator`, `Resizable` |
| **Feedback** | `Alert`, `Spinner`, `Progress`, `Skeleton`, `Sonner` |
| **Overlay** | `Dialog`, `Drawer`, `Popover`, `Tooltip`, `ContextMenu` |

Full documentation available in the `src/components/[name]/index.ts` files.

## Configuration

- **Tailwind:** Ensure your `tailwind.config.ts` points to the `@resq-sw/ui` globals.
- **TypeScript:** Set `moduleResolution` to `bundler` or `node16` for optimal subpath resolution.

## Development

We use **Nix** for a reproducible development environment:

```bash
git clone https://github.com/resq-software/ui.git
cd ui
nix develop
```

- **Preview:** `bun storybook`
- **Test:** `bun test`
- **Lint:** `bun lint` (Biome)
- **Build:** `bun build`
- **Type-check:** `bun tsc`

## Contributing

1. **Commit Convention**: We follow Conventional Commits (e.g., `feat: ...`, `fix: ...`).
2. **Issues**: Use the provided templates for bug reports or feature requests.
3. **Hooks**: Pre-commit hooks via Husky/Biome ensure formatting parity.

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) and [DEVELOPMENT.md](.github/DEVELOPMENT.md) for full details.

## License

This project is licensed under the Apache-2.0 License. See [LICENSE.md](./LICENSE.md) for details.
