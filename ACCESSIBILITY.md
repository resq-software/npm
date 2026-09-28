<!--
  Copyright 2026 ResQ Systems, Inc.
  SPDX-License-Identifier: Apache-2.0
-->

# Accessibility

This statement covers the `@resq-systems/ui` components, their Storybook, and the example apps in [`examples/`](examples/).

## Target

[WCAG 2.2](https://www.w3.org/TR/WCAG22/) Level AA.

## Status

Not yet formally audited. No manual or third-party accessibility audit has been done. What we check today is automated:

- **axe-core over every story.** [`packages/ui/src/lib/a11y-audit.test.ts`](packages/ui/src/lib/a11y-audit.test.ts) renders each Storybook story and runs axe-core on it. Any violation fails the test run.
- **Colour contrast of the design tokens.** [`packages/ui/src/lib/contrast-audit.test.ts`](packages/ui/src/lib/contrast-audit.test.ts) checks the shipped oklch token pairs against the WCAG contrast minimums.
- **Interactive primitives.** Dialogs, menus, popovers and similar components are built on Radix UI primitives, which implement the WAI-ARIA keyboard and focus patterns.

## Known issues

None recorded. These are the limits of the checks above:

- The axe run uses a DOM without layout or styles, so its colour-contrast rules are switched off. Contrast is checked for the token pairs, not for every combination a consuming app renders.
- Keyboard flows, focus order and screen-reader announcements are not tested end to end in a real browser.
- Automated tools find only part of what WCAG covers.

## Report a barrier

[Open an issue](https://github.com/resq-software/npm/issues/new/choose) describing the component or page, what you tried to do, and the browser and assistive technology you used. If you would rather not post publicly, email **contact@resq.software**.
