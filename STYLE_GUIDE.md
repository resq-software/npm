<!--
Copyright 2026 ResQ Software

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

# ResQ Style Guide

This file reflects the current engineering implementation rules derived from the `ResQ-Brand-and-Style-Guide.pdf`. It is the repo-facing source of truth for styling decisions in `@resq-sw/ui`.

## Theme Policy

- Dark is the default theme for the library.
- Light is supported only as an explicit opt-in via the `.light` class.
- Do not treat dark and light as co-equal visual systems.
- Do not introduce decorative gradients, purple, teal, or pink accents.

## Color System

All color tokens use the **oklch** color space for perceptually uniform lightness, predictable chroma control, and clean gradient interpolation.

### Dark Default

| Token              | oklch                                  | Role                    |
| :----------------- | :------------------------------------- | :---------------------- |
| `background`       | `oklch(16.04% 0.0152 272.20)`         | Page background         |
| `surface`          | `oklch(19.72% 0.0231 268.80)`         | Elevated surface        |
| `card`             | `oklch(22.90% 0.0302 269.75)`         | Card background         |
| `border`           | `oklch(26.45% 0.0386 270.81)`         | Default borders         |
| `border-hover`     | `oklch(33.52% 0.0487 272.42)`         | Hovered borders         |
| `foreground`       | `oklch(96.19% 0.0109 274.89)`         | Primary text            |
| `hint`             | `oklch(61.50% 0.0478 269.20)`         | Hint/placeholder text   |
| `muted-foreground` | `oklch(64% 0.0535 266.82)`            | Secondary text (4.5:1+) |
| `mono`             | `oklch(68.62% 0.0471 261.10)`         | Tertiary/data text      |

### Semantic Accents

| Token     | oklch                                  | Role          |
| :-------- | :------------------------------------- | :------------ |
| `primary` | `oklch(58.50% 0.1877 24.72)`          | ResQ Red      |
| `info`    | `oklch(64.20% 0.1560 252.61)`         | Signal Blue   |
| `success` | `oklch(73.39% 0.1538 161.68)`         | Status Green  |
| `warning` | `oklch(78.37% 0.1587 72.99)`          | Warning Amber |

Use each accent only for its semantic role. Do not stack multiple accent colors on one component unless the component is explicitly data-visualization oriented.

### Light Mode Overrides

Light mode uses darker accent variants to maintain contrast on bright surfaces:

| Token     | oklch (light)                          | Note                      |
| :-------- | :------------------------------------- | :------------------------ |
| `info`    | `oklch(64% 0.1560 252.61)`            | Slightly darker           |
| `success` | `oklch(61.50% 0.1538 161.68)`         | Darker for 3:1 on surface |
| `warning` | `oklch(64.50% 0.1587 72.99)`          | Darker for 3:1 on surface |

### Accessibility

- All text tokens pass WCAG AA 4.5:1 contrast on `background`, `surface`, and `card` in both themes.
- Accent colors (primary, info, success, warning) pass 3:1 for UI elements on all surfaces.
- `primary-foreground` on `primary` passes 4.5:1 (button text is small — 10-12px mono).
- `hint` is used for placeholder text and data labels — it meets 4.5:1 on all surfaces.

## Typography

Three fonts, one role each:

- `Syne`
  - display headings
  - card titles
  - large stat values
- `DM Sans`
  - body copy
  - default UI text
  - descriptions
- `DM Mono`
  - labels
  - buttons
  - badges
  - data labels
  - code and keyboard tokens

## Spacing And Radius

- Use a 4px base spacing unit.
- Prefer `6px` radius for cards, inputs, buttons, and panels.
- Prefer `4px` radius for smaller controls and chips where needed.
- Prefer `3px` radius for badges and code-like tokens.
- Do not use generic Tailwind radius classes (`rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`). Always use explicit pixel values.

## Transitions And Animation

- Do not use `transition-all`. Always specify the exact properties being transitioned.
- Use `transition-colors` for background/border/text color changes.
- Use `transition-transform` for scale/translate animations.
- Animate only compositor-friendly properties (`transform`, `opacity`, color-family).
- Do not animate layout properties (`width`, `height`, `top`, `left`, `margin`, `padding`) per-frame.

## Component Rules

### Buttons

- Use `DM Mono`.
- Use uppercase styling with visible tracking.
- Primary actions use ResQ Red solid fill.
- Secondary actions use dark surface treatment.
- Outline actions use red border and red text.
- Ghost actions stay quiet and monochromatic.
- Urgent/system actions may use Signal Blue.

### Badges

- Use `DM Mono`.
- Use uppercase styling with visible tracking.
- Map badge variants to semantic status roles:
  - success/live
  - info/syncing
  - destructive/critical
  - neutral/stage

### Cards

- Use the dark card surface by default.
- Keep borders visible and non-decorative.
- Titles should feel deliberate and strong, not generic `font-medium` body text.

### Labels And Data UI

- Labels, legends, captions, and table headers should read as data labels.
- Prefer `DM Mono`, uppercase, and increased tracking for labels and section markers.
- Use the muted text tiers for secondary explanations rather than inventing new shades.

### Inputs And Selectors

- Inputs should live on the dark surface hierarchy, not on transparent/default-white controls.
- Focus indication should come from border and ring tokens, not arbitrary component-local colors.
- Keep input text readable and calm; reserve uppercase mono mostly for labels and tokens, not freeform body entry.

## Copy And Assets

- Locked copy lines in the PDF are reference-only here.
- This repo guide does not authorize rewriting locked brand copy.
- This repo guide does not include logo asset rules beyond "do not add or restyle assets without explicit scope".
