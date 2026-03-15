---
name: accessibility
description: Accessibility rules for components in the @resq-sw/ui library.
---

# Accessibility Rules

## WCAG AA Compliance

All components must meet [WCAG 2.2 Level AA](https://www.w3.org/TR/WCAG22/). These are the most common requirements:

- **Colour contrast:** Text ≥ 4.5:1 against background (normal text), ≥ 3:1 (large text / UI components).
- **Focus visible:** All interactive elements have a visible focus indicator. Do not use `outline: none` without a custom focus style.
- **Keyboard navigation:** All interactive components are reachable and operable via keyboard alone.
- **Screen reader:** All interactive elements have an accessible name (visible label, `aria-label`, or `aria-labelledby`).

## Interactive Components

- Use Radix UI primitives — they implement correct ARIA roles, keyboard patterns, and focus management per WAI-ARIA practices.
- Never build custom dropdowns, dialogs, tooltips, or comboboxes without a Radix primitive as the base.
- `tabindex > 0` is forbidden — use DOM order or `roving tabindex` patterns instead.

## Images and Icons

- All `<img>` elements need meaningful `alt` text. Decorative images use `alt=""`.
- Icon-only buttons need `aria-label` or a visually hidden span with descriptive text.

## Motion

- Animations must respect `prefers-reduced-motion`. Use Tailwind's `motion-safe:` / `motion-reduce:` variants.

## Testing

- All component stories run through `@axe-core/react` via the Storybook a11y addon.
- CRITICAL and SERIOUS axe violations block PR merge.
- `@testing-library/jest-dom` `toBeAccessible()` matcher used in unit tests for interactive components.
