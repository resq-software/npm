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

# @resq-systems/types

Zero-dependency advanced TypeScript toolkit shared across the ResQ Systems
packages. Nominal **brands**, **exhaustiveness** helpers, deep
**object/collection/string** utilities, and a **type-level test kit** — inspired
by [type-challenges](https://github.com/type-challenges/type-challenges), curated
to the handful of patterns that earn their keep in a strict, tree-shakeable,
zero-`any` library.

```bash
bun add @resq-systems/types
```

Everything type-only is erased at build time; the few runtime helpers
(`brandRefiner`, `assertNever`, numeric constructors) are tiny and pure. The
package has **no runtime dependencies**.

## Nominal (branded) types

TypeScript is structural: every `string` is interchangeable with every other
`string`. Branding attaches a compile-time-only phantom tag so "a sanitized
string", "a validated email", and "a raw attacker-controlled header" become
distinct types — making illegal states unrepresentable at **zero runtime cost**.

```ts
import { type Brand, brandRefiner } from "@resq-systems/types";

export type Email = Brand<string, "Email">;

const Email = brandRefiner<string, "Email">(
  (s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s),
  "email",
);
export const isEmail = Email.is;   // (s: string) => s is Email
export const toEmail = Email.from; // (s: string) => Email  (throws if invalid)

declare function sendMail(to: Email): void;

sendMail(userInput);          // ✗ compile error — a raw string is not an Email
if (isEmail(userInput)) sendMail(userInput); // ✓ narrowed to Email in the block
```

Brands **compose** — `Brand<Brand<string, "Sanitized">, "Trimmed">` is both a
`Sanitized` and a `Trimmed` — and a branded value is always assignable back to
its carrier type, so reading it needs no unwrapping.

`Opaque<T, B>` is a semantic alias of `Brand<T, B>` — reach for it when "opaque
handle" reads better at the call site than "brand". `unsafeBrand<B>(value)` is
the unchecked escape hatch: it casts to the brand **without** running a
predicate, for the rare case where validation already happened upstream. The
brand toolkit is also published on its own at `@resq-systems/types/brand`.

### Branded numerics

```ts
import { type PositiveInt, toPositiveInt, isUnitInterval } from "@resq-systems/types";

declare function retry(times: PositiveInt): void;
retry(0);                  // ✗ — 0 is not a PositiveInt
retry(toPositiveInt(3));   // ✓ — throws at the boundary if not an integer > 0
```

`PositiveInt`, `NonNegativeInt`, `PositiveMillis`, `PositiveNumber` (fractional
rates), and `UnitInterval` each ship `is*` (guard), `to*` (asserting
constructor), and `coerce*` (nullable constructor).

## Exhaustiveness

```ts
import { assertNever } from "@resq-systems/types";

function label(t: "xss" | "sqli"): string {
  switch (t) {
    case "xss": return "script content";
    case "sqli": return "database commands";
    default: return assertNever(t); // ✗ build error if a new member is added
  }
}
```

`assertUnreachable` is an exported alias of `assertNever` — identical behavior,
for call sites where that phrasing reads better.

## Utility types

- **Object** — `DeepReadonly`, `DeepPartial`, `DeepRequired`, `DeepMutable`,
  `DeepNonNullable`, `Mutable`, `Simplify`, `ValueOf`, `Entries`, `Merge`,
  `PickByType`, `OmitByType`, `RemoveIndexSignature`, `Without`, `XOR`,
  `RequireAtLeastOne`, `RequireExactlyOne`.
- **Collection** — `Head`, `Tail`, `Last`, `Length`, `Reverse`, `Push`,
  `Unshift`, `Concat`, `IsEmpty`, `Includes`, `TupleToUnion`,
  `UnionToIntersection`, `UnionToTuple`, `IsUnion`, `LastInUnion`,
  `NonEmptyArray`, `ReadonlyNonEmptyArray`, `Flatten`, `Zip`, `Enumerate`,
  `NumberRange` (inclusive integer range → literal union).
- **String** — `TrimLeft`, `TrimRight`, `Trim`, `Split`, `Join`, `Replace`,
  `ReplaceAll`, `StartsWith`, `EndsWith`, `ParseInt`, `LiteralUnion`.

## Type-level test kit

The same primitives type-challenges uses, so you can lock your own types against
regressions in a `*.test-d.ts` file. Also available at
`@resq-systems/types/testing`.

```ts
import type { Equal, Expect } from "@resq-systems/types/testing";

type _cases = [
  Expect<Equal<Awaited<Promise<number>>, number>>,
  Expect<Equal<ReturnType<() => string>, string>>,
];
```

A failing assertion is a compile error on the `Expect<...>` line.

The kit exports `Equal` / `NotEqual`, the `Expect` / `ExpectTrue` / `ExpectFalse`
assertions, `Verify<T, U>` (assert `U` is assignable to `T`), and the `IsAny` /
`IsNever` / `IsUnknown` probes.

## License

Apache-2.0
