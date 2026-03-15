---
name: test
description: Run Vitest tests for the component library.
---

# /test

Run tests for `@resq-sw/ui`.

## Usage

```
/test [file]
```

## Steps

1. Run `bun test` (all tests) or `bun test <file>` for a single file.
2. Report failures with component name, test description, and error.
3. Note: `console-fail-test` is active — any `console.error/warn/log` in test code causes failure. Fix the root cause.
4. Run with `--coverage` to get a coverage report.
