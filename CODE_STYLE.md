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
workspace: file structure, JSDoc/TSDoc, type and contract documentation, comments,
`#region` markers, deprecation, and the public-API surface. For the **visual**
design system (colors, typography, components) see
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
5. **Body** — types, constants, public API, internals (§9 for ordering/regions).

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
  show the resolved value in a `// →` comment where useful (§6).
- `@deprecated` **must** state the replacement and the removal horizon (§7).
- Visibility: `@internal` for members excluded from the public API surface;
  `@public` only where it clarifies an otherwise-ambiguous export. Do not mark
  both.

## 4. Documenting types

§3 is function-shaped, but a `type`, `interface`, or `enum` is also a contract.
Document the shape's **intent and invariants** — the constraints the type system
can't express — not the field names it already shows.

### When it is required

- **Every exported** `type`, `interface`, and `enum` gets a block: one or two
  sentences on what it models, plus any invariant the type cannot enforce (units,
  ranges, "exactly one of X/Y is set", ordering, ownership).
- **Non-obvious properties** get inline member JSDoc. Skip self-evident ones — a
  property doc earns its place by stating units, what `null`/absence *means*, or a
  cross-field constraint, never by restating the name.

### Rules

- **Discriminated unions:** document the discriminant field and what each variant
  means; point readers at the tag with `{@link}`.
- **Generics:** every `@template` gets a description of what the parameter stands
  for and the intent behind any `extends` bound — not just its letter.
- **Branded / opaque types:** state how to *mint* a valid value and what invariant
  the brand guarantees, since the constructor is hidden from callers.
- Document the type once at its declaration; do not repeat it at every use site.

```ts
/**
 * A single vehicle's contribution to the shared position consensus.
 *
 * `confidence` is the estimator's own trust in `position`, not a network-wide
 * agreement score — the coordination engine derives the latter. Exactly one of
 * `gps` or `deadReckoned` semantics applies, keyed by {@link source}.
 */
export interface PositionVote {
  /** Emitting vehicle. Stable for the lifetime of a mission. */
  readonly vehicleId: VehicleId;
  /** Which estimator produced {@link position}; selects the interpretation. */
  readonly source: "gps" | "deadReckoned";
  /** WGS-84, metres. Altitude is height above the launch point, not MSL. */
  readonly position: Vec3;
  /** Estimator self-trust in `[0, 1]`; `0` means "ignore this vote". */
  readonly confidence: number;
}
```

## 5. Documenting the runtime contract

A signature shows the types; the doc owes callers the parts the types can't — how
a call **fails**, what it **touches**, and how it behaves under **concurrency**.

### Failure modes

- Document **every** distinct way a call can fail. One `@throws {ErrorType}` per
  error type, each stating the triggering condition.
- When a function signals failure by *return value* instead of throwing (an empty
  result, `null`, a `Result`/discriminated union), say so in `@returns` and name
  the sentinel — the Dijkstra block in §3 is the model.
- Don't document failures the type already makes impossible; do document the ones
  it can't — I/O, resource exhaustion, invariant violations, parse failures.

### Effects

- Note when a function mutates its arguments, module or global state, the
  filesystem, the network, or the clock. Pure functions need no note; effectful
  ones **must** be explicit — e.g. a description ending "Mutates `buffer` in
  place." Flag idempotency where a caller might reasonably retry.

### Async & concurrency

- For async APIs, document cancellation (does it honour an `AbortSignal`?),
  whether concurrent calls against the same instance are safe, and any ordering
  guarantee callers may rely on.
- State whether failure is encoded as a rejected `Promise` or a resolved
  error-shaped value — never leave a rejection path undocumented.

## 6. Examples that stay runnable

`@example` is code, not decoration, so it must compile against the *current*
public API. A rotted example is worse than none.

- Prefer one **realistic** example over several toy ones; show the resolved value
  with a `// →` comment where it clarifies the result.
- Reference only real exported symbols — never invent helpers that don't exist.
- Keep the shown value **deterministic**: no `Date.now()`, randomness, or network
  in the part you annotate with `// →`.
- Multi-step examples stick to the happy path; describe edge cases in prose above
  the block, not inside it.
- Recommended: wire doctest extraction (type-check `@example` blocks in CI) so
  examples can't silently drift from the API they document.

## 7. Deprecation & removal

`@deprecated` is a promise about a lifecycle, not just a label.

- The block **must** carry three things: the replacement via `{@link}`, the
  removal horizon as a semver target ("removed in v3"), and — ideally — a tracking
  issue link.
- Deprecate at **every** surface: the symbol itself, its barrel re-export (§11),
  and any prose that points at it.
- A deprecated symbol keeps working until the named major. Deprecation announces a
  removal; it doesn't perform one.
- When the replacement isn't a drop-in, include a one-line migration note (or link
  a codemod) in the block.
- On the named major, actually delete it — don't let deprecations accumulate into
  permanent debt.

> **A `@deprecated` with no replacement and no horizon is just a complaint.**

## 8. Comments

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

## 9. `#region` / `#endregion`

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

## 10. Generated & vendored code

Machine-authored and upstream-authored files are **exempt** from this guide — their
producer owns their shape, and restyling them destroys diffs.

- Codegen output (protobuf/gRPC stubs, OpenAPI clients, route trees) is **not**
  hand-styled. Exclude it from style passes and from Biome's write scope; the
  generator owns the format.
- Mark generated files unmistakably — a top-of-file `// @generated` banner (or the
  generator's own) — and keep them under a globbable path (`*.gen.ts`,
  `**/generated/**`) so tooling can ignore them wholesale.
- **Never hand-edit generated files.** Change the source (`.proto`, spec) or the
  generator template and re-run; a manual edit is lost on the next build.
- To adapt generated output, write a **separate** hand-authored wrapper module that
  imports it. The wrapper follows this guide in full.
- Vendored third-party code keeps its upstream license and the §1 attribution
  block, and is likewise not restyled — reformatting it makes upstream diffs
  unreadable.

## 11. Barrels & the public API surface

A package's **public API is exactly what its barrels re-export.** Everything else
is internal, even when technically reachable — this is a structural contract, so
it lives here rather than in AGENTS.md.

- The barrel/entry file (`index.ts` or a subpath entry) carries the bare-package
  `@module` (`@resq-systems/dsa`, §2) and a `@fileoverview` describing the
  **package**, not each re-export.
- Re-export **explicitly** — `export { Graph } from "./graph"` — over `export *`.
  Star exports leak internals and erase the intent of what is public.
- Keep barrels **thin**: re-exports and the overview only. Logic in a barrel is a
  structural smell; move it into a real module and re-export.
- `@internal` marks symbols exported for cross-module use but kept out of the
  published surface (and generated docs). An `@internal` symbol **must not** be
  re-exported from a barrel.
- Document at the definition; re-export at the barrel. Never duplicate the JSDoc
  onto the re-export.

## 12. Type safety

Types are the cheapest test we have — lean on them instead of runtime checks.

- **Zero `any`.** The workspace runs `strict` with no implicit `any`, and it stays
  that way. Use `unknown` for untrusted input and narrow before use; use generics
  when a value's type depends on the caller.
- Prefer **`satisfies`** over a cast when you want a shape checked but inference
  kept: `const config = { … } satisfies Config`.
- Type assertions (`as`) and non-null (`!`) are escape hatches — each needs a
  comment justifying why the compiler can't see what you can. Never `as any`;
  never `!` to paper over a real nullability — narrow instead.
- Model closed choice with **string-literal unions**, not `enum`, unless an `enum`
  is required for interop. Discriminate a union on a literal `kind`/`type` field
  (§4).
- Make **illegal states unrepresentable** — encode invariants in the type (branded
  ids, `readonly`, required-vs-optional, a union that can't hold two variants at
  once) rather than asserting them at runtime.
- Annotate the **public API** explicitly (params, returns, exported shapes); let
  inference handle obvious locals — don't restate what TypeScript already knows.

## 13. Immutability & state

- **Default to `readonly`** — `readonly` fields, `ReadonlyArray<T>`, `readonly`
  tuples, `as const` for literal tables. Mutability is opt-in and local.
- **Never mutate a parameter, or shared / module / global state, as a side
  effect.** Return a new value (spread or structured copy). A function that
  legitimately mutates in place says so in its name and doc (§5 Effects) — the
  exception, made loud.
- Prefer **pure functions**; push the effectful edge (I/O, caches, the clock)
  behind a small, named surface so the rest stays referentially transparent.
- `as const` / freeze exported constant tables where an accidental write would be a
  bug.

## 14. Error handling

A signature can't show how a call fails; the code and its docs must (§5).

- **Throw `Error`** — or a domain subclass with a stable `name` — never a string or
  bare object. One error type per failure mode, each documented with `@throws`.
- In `catch (error: unknown)`, **narrow before use** (`error instanceof Error`);
  never assume `.message`. Always have a fallback.
- **Never silently swallow.** An empty `catch` is acceptable only as
  `catch { noop() }` with a comment stating why the failure is safe to drop.
- Pick **one** failure channel per API and document it — throw, a
  `Result` / discriminated union, or a named sentinel return — and don't mix them.
- **Validate untrusted input at the boundary** (schema or type guard) and fail fast
  with a clear message; trust it internally afterwards.
- User-facing surfaces get friendly messages; logs get the full context. Never leak
  internals — stack traces, secrets, queries — to a user.

## 15. Functions & control flow

- **Small and single-purpose** — aim under **50 lines**; extract when a function
  does two things or nests past **four levels**.
- **Guard clauses over nesting** — handle the edge cases and `return` / `throw`
  early, then let the happy path run unindented.
- More than ~3 positional parameters, or any boolean flag, → take a named **options
  object**. `resize({ width, height, animate: true })` beats `resize(w, h, true)`.
- A `switch` over a union is **exhaustive**: a `default` that calls `assertNever(x)`
  turns a newly-added variant into a compile error. No implicit fallthrough.
- **No magic numbers or strings** — hoist them to named `UPPER_SNAKE_CASE`
  constants with a comment on what the threshold means.

## 16. Classes

- Reach for a class only when **identity, state, and behavior travel together**; a
  module of functions is usually lighter and more tree-shakeable.
- Member order: `static` members → instance fields → constructor → public methods →
  protected → private. Use `#private` for hard runtime privacy.
- **`readonly`** every field not reassigned after construction.
- Keep constructors cheap — assign and validate, no I/O or awaiting. Anything that
  can fail or must await belongs in a **static factory** (`static async create()`).

## 17. Testing conventions

Tests are documentation that runs. Follow [the workspace testing rules](AGENTS.md).

- **Vitest.** Match the package's existing layout — `*.test.ts` beside the unit, or
  under `tests/` — don't introduce a second convention within a package.
- **Arrange–Act–Assert**, one behavior per test, a blank line between the phases.
- Name the **behavior**, not the method: `it("returns an empty array when no
  vertices match")`, never `it("get")`.
- Assert on **observable outcomes**, not internals. Cover the failure and edge
  paths, not only the happy one.
- **Deterministic** — fake the clock, randomness, and network; no real time or live
  calls.
- No `console.*` in tests (`console-fail-test` fails them in `ui`). No committed
  `.only`; a committed `.skip` needs a `TODO(owner)` saying why.

## 18. Naming, files & imports

Follow [the workspace coding-style rules](AGENTS.md):

- **Symbols:** `camelCase` values, `PascalCase` types/components,
  `UPPER_SNAKE_CASE` constants, `is`/`has`/`should`/`can` boolean prefixes,
  `use`-prefixed hooks.
- **Files:** **kebab-case** (`rate-limit.ts`, `manual-promise.ts`), one primary
  concern per file, the name echoing the main export. Co-locate a unit's types
  (`*.types.ts`) and function form (`*.fn.ts`) with it; group by feature, not by
  type. A leading `_` marks a shared internal (`_utils.ts`) never re-exported from a
  barrel (§11).
- **Exports:** **named exports only** — a framework-mandated `default` (e.g. a Next
  route) is the sole exception. Named exports keep renames greppable and barrels
  explicit (§11).
- **Imports:** `import type` for type-only; explicit `.js` extensions on
  intra-package paths (ESM); reach other packages through their public entry, never
  a deep `src/…` path.

## 19. Non-goals of a style pass

When standardizing an existing file, **do not**:

- Change runtime behavior, signatures, return types, or exports.
- Rename symbols or move code between files.
- "Improve" logic, refactor, or fix unrelated bugs (raise those separately).
- Add dependencies.
- Restyle generated or vendored code (§10) — leave the banners and paths alone.
- Reformat by hand — let Biome do it.

A pure style pass should leave a diff that is **only** headers, JSDoc, comments,
and `#region` markers.

> §§12–18 describe how new and refactored code should be **written**. A
> *documentation* style pass (the golden rule) never rewrites existing logic to
> satisfy them — bringing old code up to these is a separate, reviewed change.