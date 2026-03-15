---
name: scaffold
description: Scaffold a new component following the @resq-sw/ui conventions.
---

# /scaffold

Create a new component in the `@resq-sw/ui` library.

## Usage

```
/scaffold <ComponentName>
```

## Steps

1. Create `src/components/<name>/<name>.tsx` with:
   - Apache-2.0 license header
   - `cva` variants definition (exported as `<name>Variants`)
   - `function <ComponentName>` declaration
   - `data-slot="<name>"` on root element
   - `cn()` for className merging
2. Create `src/components/<name>/index.ts` re-exporting everything.
3. Create `src/components/<name>/<name>.stories.tsx` with Default, all variants, and Disabled stories.
4. Create `src/components/<name>/<name>.test.tsx` with a render test and an accessibility test.
5. Add the component to `src/index.ts` barrel.
6. Add the export entry to `package.json` `exports` map.
7. Add the component to the README.md components table.

## Example

```
/scaffold Chip
```

Creates: `src/components/chip/chip.tsx`, `src/components/chip/index.ts`, stories, test.
