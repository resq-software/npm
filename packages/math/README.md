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

# @resq-systems/math

Type-safe mathematical expression engine with sort-based dispatch, static validation, and a Pratt parser.

## Install

```bash
bun add @resq-systems/math
```

## Quick Start

```ts
import { N, S, add, mul, sum, v, evaluate, showValue } from "@resq-systems/math";

// (2 + 3) × 4 = 20
const expr = mul(add(N(2), N(3)), N(4));
console.log(showValue(evaluate(expr))); // "20"

// ∑_{i ∈ {1,2,3}} i × i = 14
const sigma = sum("i", S(1, 2, 3), mul(v("i"), v("i")));
console.log(showValue(evaluate(sigma))); // "14"
```

### Parse from String

```ts
import { parse, evaluate, showValue } from "@resq-systems/math";

const expr = parse("(2 + 3) * 4");
console.log(showValue(evaluate(expr))); // "20"

// Unicode operators work too
const sets = parse("{1, 2, 3} ∪ {3, 4}");
console.log(showValue(evaluate(sets))); // "{1, 2, 3, 4}"

// Binders
const sigma = parse("sum(i in {1, 2, 3}, i * i)");
console.log(showValue(evaluate(sigma))); // "14"
```

### Static Validation

```ts
import { checkExpr, add, N, B } from "@resq-systems/math";

// Check before evaluating — catches sort mismatches without side effects
const result = checkExpr(add(N(1), B(true)));
if (!result.ok) {
  console.log(result.errors); // [SortError: + is not defined on num × bool]
}
```

### Pretty Printing

```ts
import { print, mul, add, N } from "@resq-systems/math";

const expr = mul(add(N(2), N(3)), N(4));
console.log(print(expr));                    // "(2 + 3) × 4"
console.log(print(expr, { ascii: true }));   // "(2 + 3) * 4"
```

## Architecture

This library uses a compiler-style three-phase pipeline:

1. **Parse** — Pratt parser converts strings to an AST (or build ASTs programmatically).
2. **Check** — Static sort inference validates operator/domain compatibility.
3. **Evaluate** — Tree-walking evaluator computes concrete values.

### Why Not a Flat Dispatch Table?

A `Record<Operator, (...args: number[]) => number>` breaks down because:
- **Sorts vary** — set ops return sets, relations return booleans.
- **Arity varies** — unary (¬, √), binary (+, ∈), binders (∑, ∀) with scoped variables.
- **Overloading** — `+` means addition on numbers, disjoint union on sets.

Instead, operators are dispatched via **sort-keyed instance tables** — the type-class pattern.

## Operator Reference

### Arithmetic (num × num → num)
`+`, `-`, `×` (`*`), `÷` (`/`), `mod`, `pow` (`^`)

### Unary (num → num)
`neg` (`-`), `sqrt`, `abs`, `floor`, `ceil`, `factorial` (`!`)

### Set Operations (set × set → set)
`∪` (`union`), `∩` (`intersect`), `∖` (`diff`), `△` (`symdiff`), `+` (disjoint union)

### Set → Num
`card` (`#`) — cardinality

### Relations (→ bool)
`=`, `≠` (`!=`), `<`, `>`, `≤` (`<=`), `≥` (`>=`), `∈` (`in`), `∉`, `⊂` (`subset`), `⊆` (`subseteq`)

### Logic (bool × bool → bool)
`∧` (`and`, `&&`), `∨` (`or`, `||`), `⊻` (`xor`), `⇒` (`=>`), `⇔` (`<=>`)

### Binders
`∑` (`sum`), `∏` (`prod`), `∀` (`forall`), `∃` (`exists`)

### Control Flow
`cond` / `if ... then ... else ...`

## Extensibility

Register custom operator instances at runtime:

```ts
import { registerBinary, num, asNum } from "@resq-systems/math";

// Add modular exponentiation: "modpow:num:num"
registerBinary("modpow:num:num", (a, b) => num(asNum(a) ** asNum(b) % 1000000007));
```

## License

Apache-2.0
