---
name: typescript-strict
description: TypeScript strictness rules for the @resq-sw/ui component library.
---

# TypeScript Strict Rules

## Configuration

- `tsconfig.json` uses `"strict": true` — all strict checks are enabled.
- No `// @ts-ignore` or `// @ts-expect-error` without a comment explaining the suppression and a linked issue.
- No `any` types in component props or public-facing exports.

## Props Typing

- Component props extend `React.ComponentProps<"element">` for the root element type.
- Variant props use the inferred type from the `cva` call: `VariantProps<typeof myVariants>`.
- Optional props have defaults via destructuring defaults.

```tsx
// Correct
function Button({
  variant = "default",
  size = "md",
  className,
  ...props
}: ButtonProps) { ... }
```

## Exports

- All types exported from `index.ts` must be explicitly typed — no inferred exports from complex expressions.
- Re-export types with `export type { ... }` to keep the module's runtime exports clean.

## Build

- `bun tsc` must pass with zero errors before any PR merges.
- `bun lint:knip` must pass — no unused exports.
