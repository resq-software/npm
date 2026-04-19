<!--
  Copyright 2026 ResQ Systems, Inc.

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

# Changesets

This directory is used by [Changesets](https://github.com/changesets/changesets) to manage versioning and changelogs.

## Adding a changeset

```bash
bun changeset
```

Follow the prompts to select the affected packages and describe the change.

## Changeset format

Changeset files are markdown with YAML frontmatter specifying affected packages and bump types:

```md
---
"@resq-sw/dsa": minor
"@resq-sw/helpers": patch
---

**feat:** add LRU cache data structure with configurable capacity
```

- `patch` — bug fix
- `minor` — new feature
- `major` — breaking change

When a dependency changes, include its dependents with a `patch` bump.
