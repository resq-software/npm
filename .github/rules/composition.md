---
name: composition
description: Component composition and API rules for the @resq-sw/ui library.
---

# Composition Rules

## Component API

- Accept `React.ComponentProps<"element">` spread — all standard HTML attributes must be passable.
- Use `asChild` (via `@radix-ui/react-slot`) when consumers need to change the rendered element.
- Never hard-code event handlers — pass them through via spread or explicit typed props.
- Do not enforce visual structure via required children — let consumers decide content.

## Variants

- Define variants with `cva`. Export the `variants` object so consumers can extend or reference variant keys.
- Do not add props that duplicate CSS utilities (e.g., a `rounded` boolean prop when Tailwind `rounded-*` classes exist).
- Variant default values must represent the most common use case.

## Styling

- Use `cn()` from `src/lib/utils.ts` for all className merging.
- Never use `style={{}}` for values expressible in Tailwind.
- Design tokens live in `src/styles/globals.css` — never hardcode `oklch()` colour values in component files.
- Dark mode via `.dark` class: `@custom-variant dark (&:is(.dark *))`.

## Radix Primitives

- Use Radix UI primitives for interactive components (Dialog, Dropdown, Select, etc.) — do not implement ARIA patterns manually.
- Expose all relevant Radix sub-components (`Root`, `Trigger`, `Content`, etc.) from the component's `index.ts`.

## No Side Effects at Import

- Component files must not execute code at module load time (no `fetch`, no DOM manipulation, no `localStorage` access).
- Only static `cva` definitions and React component functions at the top level.
