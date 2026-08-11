# AGENTS.md — @resq-systems/types

Zero-dependency advanced TypeScript type toolkit: nominal brands, runtime type guards and the combinator algebra over them, narrowing and structured assertions, discriminated-union dispatch, type-level boolean logic, deep object/collection/string utilities, and a type-level test kit. Part of the [ResQ Systems npm workspace](../../AGENTS.md).

## Commands

```bash
bun install                                   # from repo root
bun --filter @resq-systems/types build
bun --filter @resq-systems/types test         # doctest drift check → doctest typecheck → vitest
bun --filter @resq-systems/types typecheck    # tsc --noEmit
bun --filter @resq-systems/types doctest      # regenerate src/__generated__/doctests/ + report
```

`test` never regenerates anything. It **fails on stale generated doctests**,
naming the file and the fix command — so after editing any `ts doctest` fence you
must run `doctest` and commit the regenerated output.

## What's here

- `brand.ts` — nominal brand types (entry `./brand`).
- `brand-parse.ts` — accumulating brand validation: N labelled constraints, every failure reported (entry `./brand-parse`). Separate from `brand.ts` on purpose — it needs `NarrowError` at runtime, and `./brand` must stay a runtime leaf.
- `guards.ts` — leaf runtime type guards; value in, proof out (entry `./guards`).
- `predicate.ts` — the guard algebra: combinators that take guards and return guards (entry `./predicate`).
- `narrow.ts` — narrowing, assertion signatures, and the structured `NarrowError` (entry `./narrow`).
- `union.ts` — discriminated-union tags, tag guards, and exhaustive `matchTag` dispatch (entry `./union`).
- `logic.ts` — type-level boolean logic and shape probes; type-only, but reachable both through the barrel and its own `./logic` entry.
- `equivalence.ts` — binary equivalence relations and the combinator algebra over them (entry `./equivalence`, **subpath-only**).
- `order.ts` — total orders, `Ordering`, and the bridge from ordering into the guard algebra (entry `./order`, **subpath-only**).
- `filter.ts` — the typed case split: a composable narrowing function whose rejection branch carries a type (entry `./filter`, **subpath-only**).
- `object.ts`, `collection.ts`, `string.ts`, `numeric.ts` — deep type utilities.
- `assert.ts` — exhaustiveness / runtime assert helpers.
- `testing.ts` — type-level test kit (entry `./testing`).
- `*.test-d.ts` — type-level tests; core barrel is entry `.`.

**`equivalence.ts`, `order.ts`, and `filter.ts` must never be re-exported from
`index.ts`** — not even their types. All three export `make`, and between them
they export `mapInput`, `tupleOf`, `arrayOf`, `structOf`, `recordOf`, `or`, and
`compose`, every one of which the barrel already carries from `predicate.ts`
with a different meaning. That is not a naming bug to fix by renaming: one name
per concept is the rule, and `mapInput` genuinely *is* the same concept at three
types. The resolution is the entry point, not the identifier. Reaching them
through their own subpath is also what keeps `order.ts` and `filter.ts` free of
runtime imports. `brand-parse.ts` has no such collision and **is** barreled.

**Three `@deprecated` migration shims are also kept off `index.ts`**: `assert`
and `assertExists` (`narrow.ts`) and `hasOwnProperty` (`guards.ts`). They exist
only so `@resq-systems/helpers` can re-export its historical names unchanged, and
helpers reaches them through the `./narrow` and `./guards` subpaths — never the
barrel. Each is the odd one out in its own family: the two assertions throw a
plain `Error` instead of a `NarrowError`, so `isNarrowError` returns `false` and
a structured `catch` branch silently never runs; `hasOwnProperty` is the only
export in `guards.ts` returning plain `boolean` rather than narrowing. Barreled,
`assert` would sort first in the `assert*` autocomplete list ahead of the correct
`invariant`. Do not "fix" their absence by adding them back. If you add another
compat shim, mark it `@deprecated`, name its replacement, and leave it off the
barrel.

New `src/*.ts` files are auto-discovered by tsdown (`entry: ["src/**/*.ts"]` plus
`unbundle: true`), so adding a module needs no build-config change — but a new
public subpath does need an `exports` entry in `package.json`.

## Dependencies

- **Runtime:** none.
- **Peers:** none.

## Adding an export

Everything in `guards.ts`, `predicate.ts`, `narrow.ts`, `union.ts`, `logic.ts`,
`equivalence.ts`, `order.ts`, `filter.ts`, and `brand-parse.ts` follows this.
Match it or the build fails.

**1. Doc skeleton.** A one-line summary, then:

- `**When to use**` — required on every export, and it opens with the word "Use".
- `**Details**` — only when the signature does not tell the whole story.
- `**Gotchas**` — only for behavior that will actively surprise. Not a dumping
  ground.

Then the tags, in this order: `@typeParam` → `@param` → `@returns` → `@throws` →
examples → `@see` → `@category` → `@since`. Use `@typeParam`, never `@template`.

**2. `@since` is `0.2.0`** for anything in those modules — that is when they
first became reachable from npm (`0.1.0` published only `.`, `./brand`,
`./testing`). Use the next unreleased version for genuinely new exports.

**3. `@category` comes from a closed vocabulary.** Do not invent one: `models`,
`utility types`, `guards`, `predicates`, `combinators`, `combining`,
`constructors`, `constants`, `pattern matching`, `refinements`, `assertions`,
`errors`. Guards vs. predicates is decided purely by the return type — `value is T`
is a `guard`, plain `boolean` is a `predicate`.

**4. Every example is a test.** Tag the fence ```` ```ts doctest ```` and it gets
extracted into `src/__generated__/doctests/` and executed by Vitest. Rules the
extractor enforces, each a hard error naming file:line:

- Imports first, nothing above them.
- **Public specifiers only** — `@resq-systems/types/predicate`, never a relative
  path — and the subpath must exist in `package.json#exports`. This is what makes
  every example double as proof the symbol is reachable by a consumer.
- A symbol from the module you are documenting is imported from **that module's
  own subpath**, never the barrel. Only fences in `index.ts` use bare
  `@resq-systems/types`.
- Self-contained: every binding is imported or declared inside the fence.
- `// => literal` becomes `expect(...).toStrictEqual(literal)`.

A plain ```` ```ts ```` fence is the escape hatch — not extracted, not checked —
for snippets that deliberately reference undeclared bindings. Use it sparingly.

**5. Adding a new public subpath** needs an `exports` entry in `package.json`.
tsdown auto-discovers `src/**/*.ts`, so the build itself needs no change, but the
doctest extractor rejects a fence importing a subpath that `exports` does not list.

**6. Type-level behavior gets a `*.test-d.ts` assertion.** A type predicate is
unchecked by the compiler, so `Expect<Equal<...>>` is the only thing standing
between a composed guard and a silent lie.

**7. A new `Equivalence` or `Order` export must ship law tests. No exceptions.**
`Equivalence<A>` and `Order<A>` are *promises*, and the compiler checks none of
them: any `(a, b) => boolean` is assignable to the first and any
`(a, b) => Ordering` to the second, so a relation that is neither symmetric nor
transitive typechecks perfectly and only misbehaves in production.

- Every new export in `equivalence.ts` gets `expectLawful` over a sample matrix
  (`equivalence.test.ts`) — reflexivity, symmetry, transitivity across **every
  pair and triple** in the matrix, not a couple of hand-picked cases.
- Every new export in `order.ts` gets `assertOrderLaws` (`order.test.ts`) —
  totality, reflexivity, antisymmetry, transitivity, plus
  `assertSortsConsistently`, because a non-transitive comparator produces a sort
  whose result depends on the engine's algorithm and on input order.
- A combinator (`combine`, `mapInput`, `structOf`, `recordOf`, …) must be shown
  to **preserve** the laws, not merely to hold them on one example. Feed it
  lawful leaves and run the full matrix on the result.
- The sample matrix is where the bugs actually live, so it must include the
  adversarial values, not just the pretty ones: `NaN`, `-0`, empty
  collections, equal-but-not-identical objects, and — the one that has already
  bitten `recordOf` — **a non-enumerable own property**, which `Object.hasOwn`
  sees and `Object.keys` does not. Counting keys with one and testing membership
  with the other is exactly how symmetry breaks.
- When an export deliberately **violates** a law, that violation gets its own
  named test pinning it (see `eqStrict`'s "VIOLATES reflexivity at NaN") and a
  `**Gotchas**` block. An undocumented violation is a bug; a pinned one is a
  contract.

## Rules

- **Zero runtime deps** and mostly type-only.
- **Dual (data-first + data-last) call forms are restricted to six combinators**:
  `and`, `or`, `nand`, `eqv`, `implies`, `compose`. A combinator is eligible only
  when all three hold — fixed arity exactly 2 (no rest, optional, or defaulted
  params); both parameters are a `Predicate`/`Refinement`; and the return is never
  a function. Do not dualize anything in `guards.ts`, `narrow.ts`, or `union.ts`:
  their first parameter is the value under test, so a data-last form handed to
  `Array.prototype.filter`/`map` (three arguments) silently takes the data-first
  branch with the array index as the key — and typechecks, because
  `number extends PropertyKey`. `mapInput` is excluded too: its second parameter
  is an arbitrary function that every `Predicate` structurally satisfies.
- The data-last overloads are a **hand-written assertion `dualBinary` cannot
  check**. Every one is pinned by `Equal<dataFirst, dataLast>` in
  `predicate.test-d.ts`, including mismatched-domain pairs. Never add a dual
  signature without its dual-law assertion.
- Curried signatures must take the shared domain from **`self`**, not from the
  closed-over argument — `<A>(that: Predicate<A>): <S extends A>(self: Predicate<S>) => Predicate<S>`.
  Pinning `A` on `that` alone breaks every pipeline that pairs a domain-specific
  rule with a `/guards` guard, since those are all written over `unknown`.
- Foundational package — many workspace packages depend on it, so treat the exported types as a public API. Breaking a type is a `major` bump.
- Type-level tests (`*.test-d.ts`) are checked by `tsc`; a clean `tsc` is part of the contract.

## Changesets

Behavior changes need a `.changeset/*.md` bumping `@resq-systems/types`. See the [root guide](../../AGENTS.md#commits--changesets).

## References

- [Package README](README.md)
- [Workspace guide](../../AGENTS.md)
