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

# Doctests — writing `@example` blocks that cannot rot

[`scripts/extract-doctests.ts`](extract-doctests.ts) lifts documentation
examples out of JSDoc and emits them as real Vitest files, so an example that
stops compiling — or stops being true — fails the build. It adds no dependency:
Bun runs it, and the assertions land on the `vitest` and `typescript` already
present.

## The fence marker

Only a fence whose info string is exactly `ts doctest` is extracted:

````ts
/**
 * Disjunction: passes when either guard passes, and the proofs union.
 *
 * **Example** (Naming a reusable scalar guard)
 *
 * ```ts doctest
 * import { or } from "@resq-systems/types/predicate";
 * import { isNumber, isString } from "@resq-systems/types/guards";
 *
 * const isScalar = or(isString, isNumber);
 *
 * isScalar("x"); // => true
 * isScalar(true); // => false
 * ```
 */
````

A plain ` ```ts ` fence is **never** extracted. That is the escape hatch for
illustrative snippets that reference bindings they never declare — the thing
most file overviews need.

The extractor keys on the fence info string alone, never on the surrounding tag,
so `@example` stays an ordinary TSDoc tag and TypeDoc keeps rendering it. Every
label style resolves to the test name:

| Documentation line            | Test name                |
| ----------------------------- | ------------------------ |
| `**Example** (Doing a thing)` | `symbol — Doing a thing` |
| `**Doing a thing**`           | `symbol — Doing a thing` |
| `@example Doing a thing`      | `symbol — Doing a thing` |
| `@example` alone              | `symbol — Example`       |

`symbol` is the exported declaration that follows the JSDoc block, qualified by
its namespace where it has one (`Refinement.In`), or `Module` for a file
overview.

## The import convention (enforced)

Every fence **must** open with imports and nothing else, and every specifier
**must** be a public workspace specifier (`@resq-systems/<pkg>` or
`@resq-systems/<pkg>/<subpath>`) or a `node:` builtin. Each rule below is a hard
error naming `file:line` and the documented symbol.

1. **Imports first.** No code above them. Blank lines are fine.
2. **No relative specifiers.** A relative path is correct where the JSDoc lives
   and wrong where the generated file lives, and it rots silently on a move.
3. **The subpath must exist in the target package's `exports` map.** Every
   example therefore doubles as a check that the symbol is genuinely reachable
   by a consumer — a class of bug nothing else in this repo covers.
4. **Own-module symbols come from the module's own subpath, never the barrel.**
   A fence in `predicate.ts` writes `@resq-systems/types/predicate`; in
   `guards.ts`, `@resq-systems/types/guards`; likewise `/logic`, `/narrow`,
   `/union`. Only fences in `index.ts` may use the bare `@resq-systems/types`.
5. **Cross-package specifiers only for declared dependencies.** Allowed only if
   the documenting package lists that package in `dependencies` or
   `peerDependencies`. `@resq-systems/types` has neither, so its fences may
   import only `@resq-systems/types/*` and `node:*`.
6. **Self-contained.** Every binding used must be imported or declared inside
   the fence — never borrowed from the surrounding module scope.

On emit, own-package specifiers are rewritten to relative `src` paths with
explicit `.js` extensions (`@resq-systems/types/predicate` →
`../../predicate.js`), so generated tests exercise the sources directly: no
build step, no self-dependency in the workspace graph, and `tsc` covers them for
free. Cross-package specifiers are left verbatim. The example you *wrote* stays
copy-pasteable by a real consumer, which is the whole point of rule 2.

Imports are hoisted and deduped per generated file, so one local name cannot
mean two things across a module's examples — that is an error naming both sites.
`describe`, `it`, and `expect` are reserved; rename with `as` if an example
needs those names.

## Assertions

`expr // => literal` becomes `expect(expr).toStrictEqual(literal)`. A
declaration keeps its binding and asserts on the next line:

| In the fence                                     | Emitted                                                   |
| ------------------------------------------------ | --------------------------------------------------------- |
| `isScalar("x"); // => true`                      | `expect(isScalar("x")).toStrictEqual(true);`              |
| `const n = size(xs); // => 3`                    | `const n = size(xs);` then `expect(n).toStrictEqual(3);`  |
| `matchTag(s, "kind", h); // => the arm's result` | left alone — the annotation is prose, not a literal       |

The rewrite fires **only** when the annotation parses as a literal (`true`,
`false`, `null`, `undefined`, `NaN`, `Infinity`, a number, a bigint, a string,
an array, or an object literal). Anything else stays a comment, so explanatory
`// =>` notes and type annotations are safe. `// →` is accepted as a synonym.

A fence producing at least one assertion gets `expect.hasAssertions()`
prepended, so an example that quietly stopped asserting fails instead of
passing. A fence producing none still emits a real `it()` — it still guarantees
compile-and-execute-without-throwing, which kills the two ways examples rot: a
renamed export and a changed signature. `--report` prints the per-module
zero-assertion count so the ratio stays visible.

## Type-level examples

For a purely type-level operator, bind a witness — a wrong type is then a
compile error even with nothing to run:

````ts
/**
 * **Example** (Inverting a condition)
 *
 * ```ts doctest
 * import type { Not } from "@resq-systems/types/logic";
 *
 * const negated: Not<true> = false;
 * const restored: Not<false> = true;
 * ```
 */
````

`declare const x: T;` is accepted and emitted as
`const x = undefined as unknown as T;` — a modifier cannot appear inside a
function body, and every fence body becomes an `it` callback. The type is
preserved exactly; the runtime value is `undefined`, so an example that *calls*
the stub fails loudly rather than pretending to have run. `declare function` and
`declare class` are rejected: write `declare const fn: (value: A) => B;`.

Where the assertion is genuinely type-level, prefer routing it into the existing
`*.test-d.ts` files via `Expect<Equal<…>>` and keeping the fence illustrative —
that machinery already exists and is stronger than a witness binding.

## Opting out

| Situation                                      | Marker                                           |
| ---------------------------------------------- | ------------------------------------------------ |
| Illustrative snippet with undeclared bindings  | plain ` ```ts ` fence — never extracted          |
| A real doctest that must be skipped for now    | ` ```ts doctest ignore ` — counted in `--report` |
| One line that is *supposed* to fail to compile | `// @ts-expect-error <reason>` above the line    |

`@ts-expect-error` is the right tool for demonstrating a compile error: it is
itself checked, so the line has to actually fail, and the example stops passing
the day the error goes away.

## Running it

```sh
bun --filter @resq-systems/types doctest            # regenerate + report
bun --filter @resq-systems/types doctest:check      # fail on drift (non-mutating)
bun --filter @resq-systems/types doctest:typecheck  # drift + tsc, remapped to source
bun --filter @resq-systems/types test               # both gates, then vitest run
```

Three independent gates, no CI workflow change needed:

1. `doctest:check` regenerates in memory and diffs against disk, exiting 1 with
   the offending path and the fix command — so `test` stays non-mutating and CI
   catches stale output.
2. `doctest:typecheck` runs `tsc --noEmit` and rewrites every diagnostic inside
   a generated file back to the documenting module, symbol, and example label:

   ```text
   packages/types/src/predicate.ts:368 — example "Reading a guard's domain back out" for `Refinement.In`
       error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
       (generated: packages/types/src/__generated__/doctests/predicate.doctest.ts:107)
   ```

3. The existing CI `typecheck` job (`bunx tsc --noEmit` in `packages/types`)
   already covers the committed generated files, because `.doctest.ts` matches
   neither `exclude` pattern in `tsconfig.json`. A `*.test.ts` name would have
   been skipped by both `tsc` passes and only transpiled by Vitest — silently
   discarding the compile-time half of the guarantee. That is why the extension
   is `.doctest.ts`.

## Generated output

One file per module at
`packages/<pkg>/src/__generated__/doctests/<module>.doctest.ts`, carrying the
licence header, a `// @generated` banner, and file-level `biome-ignore-all`
suppressions (CODE_STYLE §10: generated code sits outside the style pass). It is
committed, marked `linguist-generated` in `.gitattributes`, kept out of the
published build by `tsdown.config.ts`, and **never hand-edited** — change the
example and regenerate.

The harness's own tests live in
[`packages/types/src/doctest-harness.test.ts`](../packages/types/src/doctest-harness.test.ts),
including a fixture whose example carries a deliberate type error, asserting
that the failure names its source file, symbol, and example label.
