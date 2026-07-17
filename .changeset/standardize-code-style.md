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
---

Standardize code-level conventions across the workspace per the new `CODE_STYLE.md`: normalize file headers to `@fileoverview` + `@module`, enrich JSDoc (canonical tag order, `@param name - desc` without inline types, `{@link}` cross-refs, fenced `@example`), improve comments (why-not-what, no commented-out code, attributed `TODO(owner)`), and add `#region` markers to larger files. Documentation-only — no API, signature, or behavior change (full build + entire test suite green).
