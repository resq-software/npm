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

# Example: Expression Engine Sketch

One file, two halves, built with `@resq-systems/math` and `@resq-systems/types`.

The first half hand-rolls a tiny two-sort expression engine — numbers, finite sets,
and relations — to show the architecture that scales past a flat `Record<Operator, fn>`.
The second half runs the *same demos* through `@resq-systems/math`, which is that
design shipped.

## What the sketch shows

- **AST, not a lookup table** — a discriminated union of node kinds, walked with
  `matchTag` from `@resq-systems/types/union`.
- **Sorts** — every value is tagged with its domain (`num | set | bool`).
- **Dispatch by type, not by symbol** — `+` resolves to a different implementation
  for `num × num` than for `set × set`. Same symbol, different instance.
- **Relations in their own table** — they return `bool`, which a single `Operation`
  signature cannot express.
- **Binders are a node kind** — `∑` holds an *unevaluated* body and evaluates it once
  per element in an extended environment. This is why `∑`/`∫`/`∀` can never be table
  entries.

## What the package adds

| Step | What it buys you |
| --- | --- |
| `parse` | a Pratt parser, so an expression can arrive as text (ASCII and Unicode operators) |
| `checkExpr` | a **static** sort pass that *returns* its errors instead of throwing, so you learn the result sort without having run anything |
| `compile` | bound variables resolved to De Bruijn indices, so `evaluate` indexes a stack instead of allocating a new environment `Map` per element |
| `evaluate` | bounded execution — it takes a `CompiledExpr`, so `evaluate(expr)` does not typecheck |

The ordering is load-bearing, and the type signatures enforce it.

## How failure surfaces

The last section runs four deliberate failures so you can see the shape of each one
rather than a stack trace:

- `PARSE_ERROR` — with the position it stopped at
- a sort error from `checkExpr` (`1 + true`, `#3`) — returned, not thrown
- `DOMAIN_ERROR` — division by zero
- `EXECUTION_LIMIT` — the step budget exhausted

## Running

```bash
# From the workspace root
bun install
bun --filter @resq-systems/example-math-sketch start

# Or from this directory
cd examples/math-sketch
bun run start
```
