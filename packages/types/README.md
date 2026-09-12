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
packages. Nominal **brands**, runtime **type guards** and the algebra that
composes them, **narrowing** and structured assertions, **discriminated-union**
dispatch, **type-level boolean logic**, deep **object/collection/string**
utilities, and a **type-level test kit** — inspired by
[type-challenges](https://github.com/type-challenges/type-challenges), curated to
the handful of patterns that earn their keep in a strict, tree-shakeable,
zero-`any` library.

```bash
bun add @resq-systems/types
```

Everything type-only is erased at build time; the runtime helpers (guards, guard
combinators, narrowing, tag dispatch, `brandRefiner`, `assertNever`, numeric
constructors) are small and pure. The package has **no runtime dependencies**.

Each capability group is also published on its own subpath, so a consumer that
wants one leaf guard does not pay for the whole barrel:

| Subpath | What it holds |
| --- | --- |
| `@resq-systems/types` | everything, flat |
| `@resq-systems/types/guards` | leaf runtime guards — value in, proof out |
| `@resq-systems/types/predicate` | the guard algebra — guards in, guards out |
| `@resq-systems/types/narrow` | narrowing, assertions, `NarrowError` |
| `@resq-systems/types/union` | discriminated-union tags and exhaustive dispatch |
| `@resq-systems/types/logic` | type-level boolean algebra and shape probes |
| `@resq-systems/types/brand` | nominal brands |
| `@resq-systems/types/brand-parse` | brand validation that reports **every** failure |
| `@resq-systems/types/equivalence` | binary equivalence relations and their algebra |
| `@resq-systems/types/order` | total orders, and the bridge back into guards |
| `@resq-systems/types/filter` | the typed case split — rejection carries a type |
| `@resq-systems/types/testing` | the type-level test kit |

`equivalence`, `order`, and `filter` are reachable **only** on their own subpath —
they are deliberately absent from the flat barrel. Each exports a `make`, and
between them they export `mapInput`, `tupleOf`, `arrayOf`, `structOf`, `recordOf`,
`or`, and `compose`: names the barrel already carries from `predicate` with a
different meaning. One name per concept is the rule, so the entry point does the
disambiguating rather than a rename.

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

## Runtime type guards

The leaf guards: value in, proof out. Fifty-odd of them at
`@resq-systems/types/guards`, covering primitives, containers, built-in
instances, binary views, JSON, and structural probes.

```ts
import { isFiniteNumber, isJsonObject, isValidDate } from "@resq-systems/types/guards";

const body: unknown = JSON.parse(raw);
if (!isJsonObject(body)) throw new Error("expected an object");
if (!isFiniteNumber(body.amount)) throw new Error("amount must be a number");
```

Three things the obvious hand-written versions get wrong:

- **`NaN` is a `number`.** `isNumber(NaN)` is `true` — that is what `typeof`
  says, and what `@resq-systems/helpers` has always shipped. Before you do
  arithmetic, compare, index, or serialize, reach for `isFiniteNumber`, which
  rejects `NaN` and both infinities.
- **`instanceof` does not survive a realm boundary.** A `Date` from
  `structuredClone`, a worker, or a `vm` context fails `instanceof Date`.
  `isDate`, `isMap`, `isSet`, `isRegExp`, `isURL`, `isError`, `isUint8Array`, and
  `isArrayBuffer` read the species tag instead — and then confirm it with an
  internal-slot probe, so a `{ [Symbol.toStringTag]: "Date" }` decoy does *not*
  slip through.
- **`isTypedArray` excludes `DataView`,** matching `node:util.types.isTypedArray`
  and lodash. Use `isArrayBufferView` when you genuinely want both.

`isValidDate` is the one everybody forgets: `new Date("garbage")` **is** a
`Date` — one whose `toISOString()` throws three screens later.

## The guard algebra

If it takes a guard as input, it lives in `@resq-systems/types/predicate`. A type
predicate is a promise the compiler never checks, so the fix is to stop writing
them by hand: build the complicated guard out of obvious small ones and let the
combinators do the type arithmetic.

```ts
import { arrayOf, optionalOf, structOf } from "@resq-systems/types/predicate";
import { isBoolean, isFiniteNumber, isString } from "@resq-systems/types/guards";

const isDevice = structOf({
  id: isString,
  channels: arrayOf(isString),
  lastSeen: optionalOf(isFiniteNumber),
  active: isBoolean,
});

if (isDevice(payload)) {
  payload.channels.map((c) => c.toUpperCase()); // ✓ readonly string[]
}
```

The answer to "do I need a schema library for this?" when the shape is merely a
shape. Alongside `structOf`: `arrayOf`, `recordOf`, `tupleOf`, `optionalOf`,
`nullableOf`, `nullishOf`; the boolean algebra `and` / `or` / `not` / `nand` /
`eqv` / `implies` / `allOf` / `anyOf` / `noneOf` / `exactlyOne` / `everyOf` /
`someOf`; and the plumbing `compose`, `mapInput`, `refineOn`, `lazy`,
`alwaysTrue`, `alwaysFalse`.

`allOf` / `anyOf` / `noneOf` are variadic and narrow; `everyOf` / `someOf` fold a
runtime-built `Iterable` of predicates and therefore cannot narrow, because the
member count is not statically known.

Six of them — `and`, `or`, `nand`, `eqv`, `implies`, `compose` — accept **both**
call forms, so they drop straight into a `pipe` without a wrapper:

```ts
import { pipe } from "effect";
import { and, or } from "@resq-systems/types/predicate";
import { isFiniteNumber, isInteger } from "@resq-systems/types/guards";

const isCount = and(isInteger, isFiniteNumber);        // data-first
const alsoIsCount = pipe(isInteger, and(isFiniteNumber)); // data-last
```

Only those six. A combinator is eligible when it has fixed arity 2, both
parameters are a `Predicate`/`Refinement`, and its return is never a function —
so a forgotten argument is rejected at the first annotated slot. Nothing in
`/guards`, `/narrow`, or `/union` qualifies: their first parameter is the value
under test, and a data-last form handed to `Array.prototype.filter` (three
arguments) would silently take the data-first branch with the array index as the
key.

Shape constructors take guards whose domain is genuinely `unknown` — they are
handed values read out of an `unknown`, so a narrower guard would be called with
input it never agreed to accept. A brand guard needs one adapter:

```ts
const isUser = structOf({ id: compose(isString, Email.is) }); // ✓
const isUser = structOf({ id: Email.is });                    // ✗ compile error
```

`and` and `compose` accept brand guards directly — both already feed them a value
proven to be the carrier type.

### Naming what a guard proves

`Predicate` and `Refinement` carry their type-level helpers as merged namespaces,
so they read as members instead of as top-level aliases wearing a prefix. They
reach through the barrel as well as through `/predicate`:

```ts
import type { Predicate, Refinement, TypeGuard } from "@resq-systems/types/predicate";

type Domain = Predicate.In<Predicate<string>>;           // string
type Proved = Refinement.Out<TypeGuard<Date>>;           // Date
type Accepts = Refinement.In<Refinement<Animal, "cat">>; // Animal

// Both distribute over a union of guards — which is exactly what `allOf` and
// `anyOf` use to compute their own output types.
type Either = Refinement.OutUnion<[TypeGuard<string>, TypeGuard<number>]>; // string | number
type Both = Refinement.OutIntersection<[TypeGuard<A>, TypeGuard<B>]>;      // A & B
```

`Predicate.Any` and `Refinement.Any` are the constraint slots for "some guard,
input type unimportant". Bound a type parameter with them; do not use them as a
value's type. Because they are constrained, handing one a non-guard is now a
compile error rather than a silent `never`.

## Narrowing and structured failure

`@resq-systems/types/narrow` covers the four things you do with a guard once you
have one: return-or-throw, return-or-`Result`, return-or-`undefined`, and assert.

```ts
import { ensure, parse, tryNarrow } from "@resq-systems/types/narrow";

const port = ensure(process.env.PORT, isNumericString, "PORT must be numeric");

const result = parse(body, isDevice, undefined, "Device");
if (!result.ok) return reply.code(400).send({ error: result.error.message });
handle(result.value); // ^? Device

const theme = tryNarrow(localStorage.getItem("theme"), isTheme) ?? "dark";
```

Every thrower raises a `NarrowError` carrying `.value`, `.expected`, and `.path`.
Default messages **never** interpolate the offending value — these run at trust
boundaries, where the value is exactly the thing you must not log. Read
`.value` when you actually want it.

`ensure` and `parse` are the throwing and non-throwing halves of one API and take
the same parameters in the same order: `(value, guard, message?, expected?)`.
Swapping one for the other changes nothing but the control flow.

Assertion signatures are here too — `assertGuard`, `assertBy`, `assertDefined`,
`assertNonNullish`, `invariant` — all declared as `function`, never an arrow
`const`, so the definition side can never be what loses the predicate. Annotate
the call target with `Assertion<A, B>` when you store one in a `const`, or the
call raises TS2775 in *consumer* code and narrows nothing.

`isNarrowError` recognizes one across realms and across duplicated copies of the
package, so a single `catch` clause covers everything the module throws.

## Filters: the typed case split

A guard answers yes or no. A **filter** answers yes-with-a-value or
no-with-a-reason, and the reason has a type. `@resq-systems/types/filter` is that
shape — `Filter<Input, Pass, Fail>` — and it reuses `NarrowResult` rather than
introducing a second `ok`/`error` envelope. The module has **zero runtime
imports**.

```ts
import { compose, fromMaybe, fromPredicate, toUndefined } from "@resq-systems/types/filter";
import { isString } from "@resq-systems/types/guards";

const asPort = compose(
  fromPredicate(isString),
  fromMaybe((raw: string) => {
    const port = Number.parseInt(raw, 10);
    return Number.isInteger(port) && port > 0 && port < 65536 ? port : undefined;
  }),
);

const read = toUndefined(asPort);
const port = read("8080") ?? 443; // 8080
const fallback = read("nope") ?? 443; // 443
```

`fromPredicate` is the bridge from the guard algebra: the failure branch it
produces is the **set-theoretic complement** of what the refinement proved, so
rejecting an `unknown` with `isString` hands the caller the original `unknown`
rather than a widened `never`. `mapFail` re-points that raw payload at a
structured error, `mapPass` transforms the accept branch, `or` supplies a
fallback filter, and `toPredicate` collapses the whole thing back to a guard when
a caller only needs the yes/no.

## Equivalence relations

`@resq-systems/types/equivalence` is a binary relation `(a, b) => boolean` that is
reflexive, symmetric, and transitive — and an algebra for building one.

```ts
import { eqNumber, eqString, structOf } from "@resq-systems/types/equivalence";

const sameUser = structOf({ id: eqString, revision: eqNumber });

sameUser({ id: "u1", revision: 2 }, { id: "u1", revision: 2 }); // true
```

`make` short-circuits on `===`, which forces reflexivity everywhere `===` is
reflexive; the one hole is `NaN`, and it is documented. The leaves are
`eqStrict`, `eqSameValue`, `eqString`, `eqNumber`, `eqBoolean`, `eqBigInt`, and
`eqDate`; `combine`, `combineAll`, `mapInput`, `tupleOf`, `arrayOf`, `structOf`,
and `recordOf` build on them.

`eqStrict`, `eqSameValue`, and `eqNumber` differ on exactly two inputs:

| Inputs | `eqStrict` | `eqSameValue` | `eqNumber` |
| --- | --- | --- | --- |
| `NaN`, `NaN` | `false` | `true` | `true` |
| `0`, `-0` | `true` | `false` | `true` |

There is deliberately **no** `or` / `anyOf` here. The union of two equivalence
relations is not transitive, so the combinator cannot exist without breaking the
one promise the type makes.

## Total orders

`@resq-systems/types/order` is `Order<A>` — `(a, b) => Ordering`, where
`Ordering` is the narrow `-1 | 0 | 1`. That narrowness is the point: it makes the
compiler reject `(a, b) => a.age - b.age`, the subtraction comparator that
overflows and returns `NaN` on the inputs nobody tested.

```ts
import { combine, mapInput, orderNumber, orderString, reverse } from "@resq-systems/types/order";

type Task = { readonly priority: number; readonly title: string };

const byPriority = mapInput(orderNumber, (task: Task) => task.priority);
const byTitle = mapInput(orderString, (task: Task) => task.title);

const ranked = combine(reverse(byPriority), byTitle);
tasks.toSorted(ranked);
```

Every comparison inside the module is **sign-based**, never `=== -1` or `=== 1`,
so a hand-written comparator that returns `-5` behaves identically to one that
returns `-1` throughout. `fromCompare` is the documented door for exactly that
case, normalizing any `number`-returning comparator into an `Ordering`.

### The comparison bridge into predicates

Comparisons are where an order re-enters the guard algebra. `isLessThan`,
`isGreaterThan`, `isLessThanOrEqualTo`, `isGreaterThanOrEqualTo`, and `isBetween`
each return a real `Predicate<A>`, so they compose with `and`, `allOf`, and the
rest without an adapter — and the composition keeps the proof:

```ts
import { and } from "@resq-systems/types/predicate";
import { isFiniteNumber } from "@resq-systems/types/guards";
import { isLessThan, orderNumber } from "@resq-systems/types/order";

const isSmall = and(isFiniteNumber, isLessThan(orderNumber)(10));
// Predicate input is `unknown`; what survives is still proven `number`.
```

`min`, `max`, and `clamp` are curried only. A data-first form would put the value
under test in argument position one, which is exactly the shape
`Array.prototype.filter` silently breaks by passing the index as argument two.

`toEquivalence` turns an order into the equivalence relation induced by its
equality kernel, which is the honest way to get "equal according to this sort".

### Interop with `@resq-systems/dsa`

An `Order<T>` is assignable to `@resq-systems/dsa`'s
`CompareFn<T> = (a: T, b: T) => number` for free, because `-1 | 0 | 1` widens to
`number`. That interop is **structural** — there is no adapter, and no dependency
edge in either direction. `dsa` stays zero-runtime-dependency and never imports
this package, not even type-only, since a type-only import would still leak into
its emitted declarations.

```ts
import { mapInput, orderNumber } from "@resq-systems/types/order";
import { PriorityQueue } from "@resq-systems/dsa";

const byCost = mapInput(orderNumber, (job: Job) => job.cost);
const queue = new PriorityQueue<Job>([], byCost); // accepted as CompareFn<Job>
```

Assignability is not lawfulness. `Order<A>` documents reflexivity, antisymmetry,
and transitivity as **laws**, and `min`, `max`, `clamp`, `isBetween`, and
`toEquivalence` all assume they hold. A comparator that returns `0` for
incomparable inputs — `NaN`, or mixed `string`/`number` under relational coercion
— type-checks as an `Order` and is still not one. Build orders out of the typed
leaves rather than hand-writing the relation, and every combinator in the module
preserves the laws for you.

## Accumulating brand validation

`brandRefiner` takes one predicate and reports nothing about *why* a value
failed. `@resq-systems/types/brand-parse` takes N labelled constraints and reports
**every** one that failed, never short-circuiting.

```ts
import type { Brand } from "@resq-systems/types/brand";
import { brandParser } from "@resq-systems/types/brand-parse";

type Slug = Brand<string, "Slug">;

const Slug = brandParser<string, "Slug">(
  [
    ["lowercase", (s) => s === s.toLowerCase()],
    ["no spaces", (s) => !s.includes(" ")],
  ],
  "Slug",
);

Slug.failures("Hello World"); // ["lowercase", "no spaces"]
const parsed = Slug.parse("hello-world"); // NarrowResult<Slug, BrandError>
```

A `BrandParser<T, B>` **extends** `BrandRefiner<T, B>`, so `.is`, `.from`, and
`.coerce` all still work and an existing consumer needs no change. `BrandError`
extends `NarrowError`, so `isNarrowError` recognizes it, cross-realm included,
and the default message never interpolates the offending value.

`brand` itself gains `refineAll`, which composes N refiners over the public `.is`
and yields one refiner carrying the **union** of their brand keys, plus
`BrandsOf`, `Unbrand`, and `HasBrand` to take a branded type apart again.

```ts
import { brandRefiner, refineAll } from "@resq-systems/types/brand";

const NonEmpty = brandRefiner<string, "NonEmpty">((s) => s.length > 0, "non-empty");
const Trimmed = brandRefiner<string, "Trimmed">((s) => s === s.trim(), "trimmed");

const Slug = refineAll(NonEmpty, Trimmed);
Slug.is(" hello "); // false — the value satisfies each brand independently
```

## Discriminated unions

`@resq-systems/types/union` supplies the four things you otherwise hand-write per
union: a guard per variant, an exhaustive dispatch, a tag→member lookup, and a
name for the narrowed member.

```ts
import { matchTag, type TaggedUnionOf } from "@resq-systems/types/union";

type Shape = TaggedUnionOf<"kind", {
  circle: { radius: number };
  square: { side: number };
  rect: { w: number; h: number };
}>;

const area = (s: Shape): number =>
  matchTag(s, "kind", {
    circle: (c) => Math.PI * c.radius ** 2, // c is the circle member
    square: (q) => q.side ** 2,
    rect: (r) => r.w * r.h,
  }); // ✗ compile error the moment Shape gains a member
```

No `default` arm means no place for a newly-added member to fall through, and the
return type is computed from the handlers — uniform arms give you that type,
mixed arms give you the honest union. `matchTagPartial` is the escape valve for
unions you do not own. Handler lookup is own-properties-only, so a payload tagged
`"toString"` throws instead of dispatching into `Object.prototype`.

The guards are curried so they are reusable values that drop into `filter`:

```ts
import { byTag, hasTag, isTagged } from "@resq-systems/types/union";

const isRect = byTag("kind")("rect");
shapes.filter(isRect).map((r) => r.w * r.h); // ^? Rect[]

const timeouts = failures.filter(isTagged("TimeoutError"));
//    ^? the TimeoutError member, payload included — not a bare { _tag }

const raw: unknown = JSON.parse(body);
if (hasTag(raw, "kind")) dispatch(raw); // raw carries a usable tag
```

`isTagged` is the Effect `_tag` convention (`Data.TaggedError`,
`Schema.TaggedStruct`); `isTaggedWith(key, tag)` is the general form. Types:
`DiscriminantKeys`, `TagValueOf`, `MemberByTag`, `TagMapOf`,
`ExhaustiveHandlers`, `PartialHandlers`. A tag with no handler throws
`UnhandledTagError` naming the offending tag, which is a deploy-skew signal worth
a metric — `isUnhandledTagError` separates it from ordinary validation failure.

## Type-level boolean logic

The predicates you need to *write* conditional types, at
`@resq-systems/types/logic` — or through the barrel, which costs nothing either
way because the module is type-only and compiles to an empty file.

```ts
import type { And, If, IsEqual, IsLiteral, IsTuple, Not } from "@resq-systems/types/logic";

/** Tag a type by whether it survived inference as a literal — `42` yes, `number` no. */
type Inferred<T> = If<IsLiteral<T>, "literal", "widened">;

/** A fixed-arity list with at least one slot — excludes both `string[]` and `[]`. */
type NonEmptyTuple<T> = And<IsTuple<T>, Not<IsEqual<T, []>>>;
```

- **Connectives** — `And`, `Or`, `Not`, `Nand`, `Nor`, `BoolXor`, `BoolEqv`,
  `Implies`, `AllTrue`, `AnyTrue`, `If`.
- **Shape probes** — `IsTuple`, `IsLiteral`, `IsStringLiteral`,
  `IsNumericLiteral`, `IsBooleanLiteral`, `IsEmptyObject`, `IsPlainObject`,
  `IsNullable`, `IsUndefinable`, `IsOptionalKey`, `IsReadonlyKey`.
- **Assignability relations** — `Extends`, `ExtendsDistributive`, `IsSubtypeOf`,
  `IsSupertypeOf`, `IsMutuallyAssignable`, `IsEqual`.

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

## Conventions

Every export in `guards`, `predicate`, `narrow`, `union`, `logic`, `equivalence`,
`order`, `filter`, and `brand-parse` carries `@category` and `@since`.

`@category` is what groups the generated TypeDoc reference, and it is drawn from a
closed vocabulary rather than invented per export: `models`, `utility types`,
`guards`, `predicates`, `combinators`, `combining`, `constructors`, `constants`,
`pattern matching`, `refinements`, `assertions`, `errors`. The line between
`guards` and `predicates` is only the return type — `value is T` is a guard, a
plain `boolean` is a predicate.

`@since` records the version an export first became reachable from npm, not the
version it was written. Every module above is `0.2.0`: `0.1.0` published only
`.`, `./brand`, and `./testing`, so nothing in them ever shipped earlier.

Three exports carry `@deprecated` on arrival — `assert` and `assertExists` on
`./narrow`, `hasOwnProperty` on `./guards`. They exist only so
`@resq-systems/helpers` can re-export its historical names unchanged, and each is
the odd one out in its own family: the two assertions throw a plain `Error`
rather than a `NarrowError`, so `isNarrowError` returns `false` for them, and
`hasOwnProperty` is the only export in `./guards` that returns plain `boolean`
instead of narrowing. Reach for `invariant`, `ensureDefined`, and `hasOwn`
instead. All three are deliberately kept **off** the barrel, so they never sort
first in autocomplete next to the export you actually wanted.

Doc blocks follow a fixed skeleton — a one-line summary, then **When to use**
(on every export), **Details** (only when the signature does not tell the whole
story), and **Gotchas** (only for behavior that will actively surprise).

### The examples are tests

A fenced block tagged `ts doctest` is not illustration — it is extracted into a
real Vitest file and executed:

````md
```ts doctest
import { isFiniteNumber } from "@resq-systems/types/guards";

isFiniteNumber(1);        // => true
isFiniteNumber(Number.NaN); // => false
```
````

Each `// => literal` becomes an `expect(...).toStrictEqual(literal)`, so an
example that drifts from the behavior it documents fails the build the same way a
broken test does. A plain `ts` fence is the deliberate escape hatch: it is
type-checked by nobody and extracted by nothing, which is what makes it the right
choice for a snippet that references bindings it never declares.

Two rules keep the extracted files honest. Imports come first and use **public**
specifiers only — a fence in `predicate.ts` writes
`@resq-systems/types/predicate`, never a relative path — and the subpath must
exist in `package.json#exports`, so every example doubles as proof that the
symbol it demonstrates is genuinely reachable by a consumer. The extractor
rewrites those specifiers to relative paths on the way out, so the generated
tests run against `src` with no build step.

```bash
bun --filter @resq-systems/types doctest   # regenerate + print the per-module report
bun --filter @resq-systems/types test      # drift check, then typecheck, then run them
```

`test` never regenerates. It fails if the committed output under
`src/__generated__/doctests/` is stale, naming the file and the command that
fixes it, so a doc edit cannot land without its extracted test. That output is
committed rather than ignored, which keeps it inside the ordinary `tsc` and
`biome` passes and makes drift a reviewable diff.

**231 fenced examples carrying 412 assertions** run on every `bun test` today.

36 of those fences carry no `// =>` assertion and are executed for their
compilation alone: all 29 in `logic.ts`, which is type-only and has nothing to
evaluate at runtime, and 7 in `predicate.ts` that demonstrate a type rather than
a value. They still fail the build if they stop compiling.

## License

Apache-2.0
