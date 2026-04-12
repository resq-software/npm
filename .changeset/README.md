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
