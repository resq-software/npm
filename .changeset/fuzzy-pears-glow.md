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

---
"@resq-systems/constants": minor
---

Add a `./tokens.css` export — the design tokens (`oklch` color roles, `--resq-chart-1..5` palette, `--resq-radius-*`, `--resq-font-*` stacks) as CSS custom properties on `:root`, importable via `@import "@resq-systems/constants/tokens.css"`; a test keeps it in sync with `./tokens`
