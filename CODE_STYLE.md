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

# Code Style

The canonical **code-level** conventions for every TypeScript source file in this
workspace: file structure, JSDoc/TSDoc, comments, and `#region` markers. For the
**visual** design system (colors, typography, components) see
[`design/STYLE_GUIDE.md`](design/STYLE_GUIDE.md).

Formatting (indentation, quotes, semicolons, import order, line width) is owned by
**Biome** — never hand-format against it; run `bunx biome check --write`. This
document covers only what a formatter cannot: documentation and structure.

> **Golden rule:** standardizing style must never change behavior. Touch
> comments, JSDoc, headers, and `#region` markers only — never logic, control
> flow, signatures, or exports.

## 1. File anatomy

Every source `.ts` file, top to bottom:

1. **License header** — the Apache-2.0 block (enforced by the pre-commit hook; do
   not remove or reorder).
2. **Attribution block** (only if adapted from third-party code) — the
   `/*! Adapted from … */` block, immediately after the license header. See
   [`packages/helpers/src/browser/dom-utils.ts`](packages/helpers/src/browser/dom-utils.ts).
3. **File overview** — a `@fileoverview` + `@module` JSDoc block (§2).
4. **Imports** — grouped and ordered by Biome. Type-only imports use
   `import type`.
5. **Body** — types, constants, public API, internals (§5 for ordering/regions).

Keep files focused: **200–400 lines typical, 800 max.** Extract when a file grows
past that or mixes unrelated concerns.

## 2. File overview header

Immediately below the license (and attribution, if any), every source file gets a
one-block overview:

```ts
/**
 * @fileoverview Token-bucket rate limiter — refills at a fixed rate and admits a
 * request when a whole token is available. Backed by an in-memory or Redis store.
 *
 * @module @resq-systems/rate-limiting/token-bucket
 */
```

Rules:

- `@fileoverview` — one or two sentences on **what the file provides and why it
  exists**, not a restatement of the filename. Present tense, ends with a period.
- `@module` — the package-qualified path: `@resq-systems/<pkg>/<path-from-src>`
  without the extension (e.g. `@resq-systems/dsa/graph`,
  `@resq-systems/helpers/browser/storage`). The barrel/entry file uses the bare
  package specifier (`@resq-systems/dsa`).
- Do **not** use `@file`, `@packageDocumentation`, `@license`, `@copyright`, or
  `@author` in the overview — the license header already carries legal metadata,
  and we standardize on `@fileoverview` + `@module`. Migrate any existing `@file`
  / lone-`@module` / headerless files to this shape.
- Test files (`*.test.ts`) do not need a `@fileoverview`; a plain one-line comment
  describing the suite is enough.

## 3. JSDoc / TSDoc

Document the **why and the contract**, not the obvious mechanics.

### When it is required

- **Every exported** symbol (function, class, interface, type, const, enum).
- **Public class members** (methods, accessors, non-private fields).
- Non-obvious internal helpers benefit from a short block; trivial ones do not.

### Tags — canonical order

Description first (a sentence or two), a blank `*` line, then tags in this order.
Omit any that do not apply.

```ts
/**
 * Resolve the shortest path between two vertices with Dijkstra's algorithm.
 *
 * Ignores unreachable vertices and returns an empty path rather than throwing, so
 * callers can branch on `path.length` instead of a try/catch.
 *
 * @template T - The vertex-id type.
 * @param source - Start vertex.
 * @param target - Destination vertex.
 * @returns The path (inclusive of `source` and `target`) and its total weight.
 * @throws {RangeError} If either vertex is unknown to the graph.
 * @example
 * ```ts
 * const g = new Graph<string>({ directed: true });
 * g.addEdge("a", "b", 5);
 * g.findShortestPath("a", "b"); // → { path: ["a", "b"], weight: 5 }
 * ```
 * @see {@link Graph.addEdge}
 * @deprecated Use {@link Graph.shortestPath} — removed in the next major.
 * @internal
 */
```

Order: **description → `@template` → `@param` → `@returns` → `@throws` →
`@example` → `@see` → `@deprecated` → `@internal`/`@public`.**

### Formatting

- Sentence case, end each description with a period.
- `@param name - Description` — a hyphen-space separates name and text; no type in
  the tag (TypeScript owns the type). Document every parameter, in signature order.
- `@returns Description` — omit for `void`/`Promise<void>`.
- Reference code with backticks and cross-link symbols with `{@link Symbol}`.
- `@example` blocks are fenced ```ts and must be **valid, runnable** snippets that
  show the resolved value in a `// →` comment where useful.
- `@deprecated` **must** state the replacement and the removal horizon.
- Visibility: `@internal` for members excluded from the public API surface;
  `@public` only where it clarifies an otherwise-ambiguous export. Do not mark
  both.

## 4. Comments

- **Explain _why_, not _what_.** The code already says what; a comment earns its
  place by capturing intent, a non-obvious constraint, a workaround, or a link.
- Full sentences, sentence case, terminal punctuation. `// Refill happens lazily
  so an idle bucket costs nothing.`
- **No commented-out code.** Delete it — git remembers. No "dead" blocks left "just
  in case."
- **No redundant narration** (`// increment i`, `// return the result`).
- Task markers: `// TODO(owner): …` and `// FIXME(owner): …` — always attributed,
  ideally with an issue link. A bare `TODO` is not allowed.
- Workaround comments cite the reason/source: `// WebKit lacks checkVisibility —
  https://bugs.webkit.org/show_bug.cgi?id=264733`.
- Prefer a block comment above a logical section over many scattered inline
  comments.

## 5. `#region` / `#endregion`

Use region markers to make **larger files** navigable. They fold in editors and
signpost structure without changing behavior.

### Syntax

```ts
//#region Public API
export function encrypt(plaintext: string): string { /* … */ }
export function decrypt(ciphertext: string): string { /* … */ }
//#endregion

//#region Internal
function deriveKey(secret: string): Buffer { /* … */ }
//#endregion
```

- Exactly `//#region <Name>` and `//#endregion` — no space after `//`, capitalized
  Title Case name on the opener, nothing on the closer.
- Regions **must** be balanced and **must not** overlap; they may nest one level
  where it genuinely helps.

### When to use

- Apply when a file has **3+ distinct logical sections** or is **~150+ lines**.
- **Skip** small, single-purpose files — a lone region adds noise.
- Never wrap the license header, `@fileoverview`, or imports in a region.

### Canonical section names & order

Use these names, in this order, for the sections a file actually has:

`Types` → `Constants` → `Schemas` → `Public API` → `Internal` → `Helpers`

A package-specific section may use a descriptive name (e.g. `Traversal`,
`Serialization`) when the canonical set does not fit — keep it Title Case.

## 6. Naming, imports, exports

Follow [the workspace coding-style rules](AGENTS.md): `camelCase` values,
`PascalCase` types/components, `UPPER_SNAKE_CASE` constants, `is/has/should/can`
booleans, `use`-prefixed hooks. Prefer named exports and subpath-level barrels;
keep modules tree-shakeable. `import type` for type-only imports.

## 7. Non-goals of a style pass

When standardizing an existing file, **do not**:

- Change runtime behavior, signatures, return types, or exports.
- Rename symbols or move code between files.
- "Improve" logic, refactor, or fix unrelated bugs (raise those separately).
- Add dependencies.
- Reformat by hand — let Biome do it.

A pure style pass should leave a diff that is **only** headers, JSDoc, comments,
and `#region` markers.
