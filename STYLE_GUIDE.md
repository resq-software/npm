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

## Color Tokens

### Dark Default

- `background`: `#0B0D14`
- `surface`: `#111520`
- `card`: `#171C2B`
- `border`: `#1E2438`
- `border-hover`: `#2E3550`
- `foreground`: `#F0F2FA`
- `hint`: `#4A5470`
- `muted-foreground`: `#6B7899`
- `mono`: `#8A9BB8`

### Semantic Accents

- `primary` / ResQ Red: `#E24B4A`
- `info` / Signal Blue: `#3B8FE8`
- `success` / Status Green: `#25C68A`
- `warning` / Warning Amber: `#F5A623`

Use each accent only for its semantic role. Do not stack multiple accent colors on one component unless the component is explicitly data-visualization oriented.

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
- This repo guide does not include logo asset rules beyond “do not add or restyle assets without explicit scope”.
