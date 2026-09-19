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

# Derived Navigation Math — Architecture

Status: **accepted**, 2026-09-19
Applies to: `@resq-systems/ui`, `@resq-systems/map`, `@resq-systems/math`,
and a proposed `@resq-systems/nav`

Companion to [Vehicle Telemetry Instruments](VEHICLE_TELEMETRY_INSTRUMENTS.md),
which covers the gauges, and [Vehicle Operator Dashboards](VEHICLE_DASHBOARDS.md),
which covers the console. This covers the arithmetic underneath both: the quantities
an operator needs that no vehicle actually transmits.

## 1. Context

A vehicle transmits measurements. An operator needs *relationships between* measurements.
AIS gives position, COG and SOG for a contact; what the watchstander wants is closest
point of approach. Signal K gives heading true and course over ground; what matters is the
divergence between them, because that divergence *is* the current. A rover reports wheel
odometry and GNSS ground velocity; the useful number is the disagreement, because that is
wheel slip.

These derived quantities are not presentation and they are not decoding. The instruments
doc fixes a four-layer model — "transport → normalize → present, and nothing skips a
layer" — and derived math sits awkwardly across `normalize` and `present` without being
named in either. That omission has already cost us something concrete, documented in §3.

This document fixes three things: where derived math lives, which formulas we are willing
to ship, and the test that decides the next one.

## 2. What exists today

Verified against `origin/master`. Everything below is real code, cited by path and line.

**Navigation math that exists, inside the React design system:**

| Export | Location | Computes |
|---|---|---|
| `computeApproach` | `packages/ui/src/adapters/ais.ts` | CPA (NM) and TCPA (minutes) |
| `distanceNm` | `packages/ui/src/adapters/geo.ts` | Haversine great-circle distance |
| `bearingDeg` | `packages/ui/src/adapters/geo.ts` | Initial great-circle bearing, true |
| `toLocalNm` | `packages/ui/src/adapters/geo.ts` | Equirectangular ENU frame about the observer |
| `courseToVelocity` | `packages/ui/src/adapters/geo.ts` | Course + speed → east/north velocity |
| `normalizeBearing` | `packages/ui/src/adapters/geo.ts` | Wrap into `[0, 360)` |
| `isPosition` | `packages/ui/src/adapters/geo.ts` | Lat/lon range guard |
| `longitudeDelta` | `packages/ui/src/adapters/geo.ts` (**private**) | Antimeridian-safe signed longitude difference |

`geo.ts` has **zero import statements**. Nothing about it requires React; it is headless
code that happens to live in a package that ships Radix and Tailwind.

**ARPA risk policy, private inside a component:**

`contact-scope.tsx` holds `normalizeBearing` (:123), `compareByRisk` (:164) and
`worstApproach` (:182) at module scope. `compareByRisk` is not rendering — it encodes the
rule that a contact with no usable CPA sorts last and is *never assumed safe*. That is a
safety policy currently unreachable by anything but one component's render path.

**Duplication already underway:**

- `normalizeBearing` is defined three times — `geo.ts:68` (exported),
  `compass-rose.tsx:85`, `contact-scope.tsx:123` — and `mavlink.ts:43` and `ros2.ts:41`
  each declare their own `FULL_TURN = 360` and wrap inline. Five places, one identity.
- `clamp` is defined three times — `numeric.ts:42`, `instrument-dial.ts:29`,
  `attitude-indicator.tsx:94`. At least one of those is *deliberate*: the `numeric.ts`
  header explains that importing the lib version would drag component-layer code into the
  `./adapters` bundle. That is the smell, not the bug.
- `packages/dsa/src/distance.ts` independently offers haversine **and** vincenty over a
  `{lat, lng}` shape, while `geo.ts` offers haversine over `{latitude, longitude}` with a
  different Earth radius and different units. Two great-circle implementations, two
  coordinate shapes, two packages, no shared tests.

## 3. Three consequences

**`map` cannot reach any of it, and is measurably worse for it.** `packages/map` has no
navigation math — not duplicated, *missing*. `toTrackGeoJSON` in `src/track.ts` has no
antimeridian handling, so a track crossing 180° renders as a line across the globe.
`parseAssetFrame` in `src/asset.ts` takes `heading` raw with `?? 0` and never normalizes
it. Neither bounds latitude to ±90 or longitude to ±180. The fix for all three already
exists in `geo.ts` — including `longitudeDelta`, which is precisely the antimeridian
guard — behind a package boundary `map` cannot cross without taking a runtime dependency
on the design system.

This is not hypothetical debt. `VEHICLE_DASHBOARDS.md` §3 plans `AisLayer`,
`GeofenceLayer` and `MissionPathLayer`, and every one of them needs `distanceNm`,
`bearingDeg` and `computeApproach`. Built today, they force `map → ui`: a MapLibre
package depending on Radix and Tailwind to draw a range ring.

**Nothing headless can reach it either.** A server-side alert fan-out, a replay or
incident-reconstruction tool, or a worker would each have to import the design system to
ask whether two vessels are converging.

**The one piece of genuine safety policy we have written is the least reachable.**
`compareByRisk` is module-private. Until it is exported, every alert list and map overlay
must re-derive "absent CPA is never assumed safe" — and that is exactly the invariant a
reimplementation gets wrong.

## 4. `@resq-systems/math`: what it can and cannot do

The obvious instinct is that derived math belongs in the package named `math`. It does
not, and the reasons are structural rather than stylistic.

**It cannot host the formulas.** There is no trigonometry anywhere in `packages/math/src`
— no `sin`, `cos`, `atan2`, `hypot` or `PI`. Haversine, bearing, crab angle and any
rotation are not merely awkward to express; they are inexpressible. Nor can the gap be
closed by extension: `registerBinary`/`registerUnary`/`registerRelation`/`registerLogic`
only *overload existing operator symbols* against a closed set of five sorts. They cannot
introduce a named function. The README's own `registerBinary("modpow:num:num", …)`
example throws `MathError INVALID_OP`.

Adding `cpa()` and `haversine()` as plain exports beside a Pratt parser would move
collision math from one wrong home to another, with zero integration to show for it.

**It can host the layer above.** Compute nav values in TypeScript and inject them per tick
as a `record` free variable, and the engine evaluates operator-authored predicates over
them. Both of these parse, sort-check and evaluate **today, with no engine changes**:

```text
contact.cpa < 500 && contact.tcpa < 120
sog * 1.94384
```

That is runtime-authored alert thresholds and derived telemetry channels without a
redeploy — a real job for an expression engine in a telemetry product, and `math`
currently has no consumers anywhere in `packages/`.

It is deliberately **not** in the build order below. An operator-authored predicate over a
collision channel becomes a de-facto safety barrier the moment one person relies on it,
and it should not be built before the pure functions underneath it have landed and been
proven. Two constraints to carry forward when it is: quantifiers cannot range over a
contact list, and `register*` mutates process-global tables that `check.ts` never
reconciles with — so the registration API is out of bounds for this purpose permanently.

## 5. Package placement

**Proposal: a zero-runtime-dependency leaf, `@resq-systems/nav`,** holding Earth and
vehicle geometry plus derived quantities, consumed by `ui` and `map`. It joins the
existing zero-dep category (`dsa`, `logger`, `decorators`, `constants`, `types`). Because
`geo.ts` imports nothing, the extraction is effectively a `git mv`.

Placements considered and rejected:

- **`dsa`** — its charter is data structures and algorithms (graph, heap, trie, bloom,
  LRU, count-min). "Distance math" scopes a metric function, not set and drift. Putting
  marine navigation there converts a DS&A package into a domain library, and makes `ui` a
  dependent of an actively developed package with external consumers.
- **`types`** — a TypeScript type toolkit. `msToKnots` is domain arithmetic, not a type.
  It is also the worst CI placement available: `types` has six dependents, so a
  unit-conversion tweak rebuilds analytics, helpers, http, rate-limiting, security and ui.
- **`telemetry`** — ruled out by its own source: "vehicle-domain schemas never enter this
  package" (`mqtt.ts`). That rule is correct and should hold.
- **Leaving it in `ui/adapters` behind subpaths** — the honest alternative, and the one
  that wins if §9's open question comes back "no". `ui/adapters` is already defined as
  "pure message → prop mappers… never contains React, DOM, transport, protocol libraries";
  math is not on that exclusion list, so derived math arguably has a documented home
  already. The cost of this choice is that `map` and any headless consumer stay locked
  out, and `map → ui` eventually happens anyway.

Note that `VEHICLE_DASHBOARDS.md` states the split criterion as **statefulness** — "`ui`
stays stateless… a shell does not fit that rule". Pure math passes that test, so this
proposal is asking to add a second criterion: **reachability**. A function that `map`,
a worker and a server all need should not sit behind a design system. If that amendment
is not accepted, the subpath option above is the correct outcome and this document should
be closed rather than half-implemented.

## 6. What ships, and the test that decides

Ship a formula only if all three hold:

1. **Every input is a quantity the telemetry actually carries, or a parameter the caller
   explicitly declares.**
2. **The output is a description, not a command.**
3. **The function can honestly refuse when an input is missing.**

This is not a new rule; it is the house style already written into the adapters.
`computeApproach` returns `null` rather than a CPA from a guessed course. `isStale`
returns `true` for an unknown timestamp. `optional` returns `undefined` rather than `0`.
`aisToContact` drops unplottable reports, because a contact at the wrong place is worse
than a contact that is missing. **Refusal over guessing.**

**Ships:** unit conversions (knots ↔ m/s, NM, fathoms, feet, degrees/radians/mils);
heading vs COG vs SOG vs STW as four distinct modelled channels; crab angle; observed set
and drift; CPA/TCPA; cross-track error against a declared leg; rate of turn and turn
radius; differential-drive forward kinematics; wheel slip ratio; stopping distance as an
explicit reaction + braking + margin decomposition; endurance from measured average power
against a caller-declared usable fraction.

**Does not ship, with reasons:**

| Formula | Fails | Why |
|---|---|---|
| Rollover speed ceiling `v ≲ √(Rg·min(μ, W/2h))` | (1) | μ and CG height are not telemetry |
| LOS guidance `χ_d = γ_p − atan(e_y/Δ)` | (2) | Emits a command |
| Differential-drive *inverse* | (2) | Emits wheel commands |
| Skid-steer `B_eff` | (1) | Varies with surface, payload, tyre pressure, speed |
| Hull resistance, propeller `K_T`/`K_Q` | (1) | Needs coefficients no console has |
| `GM = KB + I_wp/∇ − KG`, righting moment | (1) | Every input is a hydrostatic-table or loading-condition guess; (3) would fire on every call |
| EKF, PID cascades, motor mixing, thrust allocation | all | Vehicle-side, real-time, 50–400 Hz, ArduPilot's job |
| COLREG give-way determination | (2) | A legal determination, not arithmetic |

On the last two rows specifically: CPA/TCPA thresholds are **engineering policy, not
COLREG rules**, and AIS must never be the sole basis for collision avoidance. The API must
not let a caller forget that. `Approach` is today a bare `{ cpa, tcpa }`; it should carry
`source`, `model: "constant-velocity"`, `observedAt` and `opening`, so that the caveats
the code already knows survive the type boundary. `opening` in particular is information
`computeApproach` computes and then discards — today a past CPA is flattened to
`{ cpa: range, tcpa: 0 }`, indistinguishable from "closest approach is right now".

## 7. Public API

*Updated 2026-09-19 to match what shipped.*

```ts
// @resq-systems/nav — zero runtime dependencies

export interface LatLon { readonly latitude: number; readonly longitude: number }
export interface LocalOffset { readonly east: number; readonly north: number }

// Geometry (moved byte-for-byte from ui/adapters/geo.ts)
export function distanceNm(from: LatLon, to: LatLon): number;
export function bearingDeg(from: LatLon, to: LatLon): number;
export function toLocalNm(origin: LatLon, point: LatLon): LocalOffset;
export function courseToVelocity(courseDeg: number, speedKn: number): LocalOffset;
export function normalizeBearing(value: number): number;
export function isPosition(value: LatLon | undefined): value is LatLon;

// Collision geometry, decoupled from AIS message shape
export interface ApproachGeometry {
  readonly cpa: number;            // nautical miles
  readonly tcpa: number;           // minutes
  readonly opening: boolean;       // closest approach already PASSED, not merely reached
  readonly model: "constant-velocity";
}
export interface Approach extends ApproachGeometry {
  readonly source?: "ais" | "radar" | "fused";
  readonly observedAt?: number;    // epoch ms of the contact report
}
export function closestApproach(
  offset: LocalOffset,
  relativeVelocity: LocalOffset,
): ApproachGeometry | null;

// ARPA policy, promoted out of contact-scope.tsx
export interface RankableContact { range: number; cpa?: number | undefined }
export function isUsableCpa(cpa: number | undefined): cpa is number;
export function compareByRisk(left: RankableContact, right: RankableContact): number;
export function nearestByRange<T extends RankableContact>(contacts: readonly T[]): T | null;
export function worstApproach<T extends RankableContact>(contacts: readonly T[]): T | null;
export function formatBearing(value: number): string;

// Derived quantities — each returns undefined rather than guessing
export interface Current {
  readonly setDeg?: number;        // absent when drift is zero: no vector, no direction
  readonly drift: number;          // input speed unit; deliberately not named for one
}
export function crabAngleDeg(headingTrueDeg?: number, courseOverGroundDeg?: number): number | undefined;
export function observedCurrent(ground: LocalOffset, water: LocalOffset): Current | undefined;
export function slipRatio(groundSpeedMs?: number, wheelSpeedMs?: number): number | undefined;
export function stoppingDistanceM(input: StoppingDistanceInput): number | undefined;
export function enduranceHours(usableWh?: number, averageW?: number): number | undefined;
export function turnRadiusM(speedMs?: number, rateOfTurnDegPerSec?: number): number | undefined;
export function rateOfTurnDegPerSec(from?: number, to?: number, elapsedS?: number): number | undefined;
export function crossTrackNm(legStart: LatLon, legEnd: LatLon, position: LatLon): number | undefined;
export function differentialDriveMotion(
  leftRadPerSec?: number, rightRadPerSec?: number,
  wheelRadiusM?: number, trackWidthM?: number,
): DifferentialDriveMotion | undefined;

// Units — the only group with zero embedded judgment
export function knotsToMs(knots: number): number;
export function msToKnots(ms: number): number;
// plus nautical miles, feet, fathoms, degrees/radians and NATO mils, both directions
```

`ui` keeps everything presentational: `instrument-dial.ts` sweep geometry, colour ramps,
and the protocol adapters (`mavlink`, `ros2`, `signalk`, `vda5050`), which each type-import
a component prop type and therefore stay put.

## 8. Build order

0. **Promote the ARPA functions out of `contact-scope.tsx`** into an exported
   `ui/adapters/arpa.ts` — `compareByRisk`, `worstApproach`, and the bearing helpers.
   Purely additive, a `minor` on `ui`, no package decision required. **Ship this first
   regardless of how §9 resolves.** It is the cheapest real safety win available.
1. Enrich `Approach` with `opening`, `model`, `source`, `observedAt`. Also a `minor` on
   `ui`, also independent of the package question.
2. Resolve §9. If "no", stop here and expose the above via subpaths.
3. Scaffold `nav` as a zero-dep leaf.
4. Move `geo.ts`, `numeric.ts`, `staleness.ts` and the CPA core **byte-for-byte**, in PRs
   that change no behaviour, with their existing test files. No new math in these PRs.
5. Re-export from `ui/adapters` so no consumer breaks; `ui` takes a concrete caret range.
6. Point `map` at `nav` and fix the three latent defects in §3.
7. Reconcile `dsa`'s `Distance` with `nav` — one great-circle implementation, one test
   suite, one coordinate shape.
8. Add the new derived quantities from §6, each with a refusal test.
9. Only then consider the `math` predicate layer from §4.

Steps 4 and 8 must not share a PR. Moving `computeApproach` and `compareByRisk` across a
package boundary is the single most likely way this initiative produces a worse outcome
than doing nothing; a byte-for-byte rule is what stops a well-meaning refactor from
inverting a safety invariant inside a diff that also adds rhumb lines.

## 9. Non-goals and open questions

**Non-goals.** Anything in the "does not ship" table of §6. Any claim of navigational or
engineering authority: haversine carries roughly 0.5% error against WGS-84, `toLocalNm` is
an equirectangular approximation valid only at collision-assessment ranges, and CPA is a
constant-velocity projection, not a prediction. The README must say so plainly.

**Resolved, 2026-09-19.** The headless-consumer question was answered yes, and the
reachability amendment to `VEHICLE_DASHBOARDS.md` accepted, so §5's leaf package was
built: `@resq-systems/nav`, zero runtime dependencies, consumed by `ui` and `map`. Steps
0 through 8 are implemented. The name kept its disclaimer rather than dodging it — the
README opens by stating what the package is not, which is the honest version of what
`geo.ts`'s "not for navigation" comment was already saying.

**Two questions deliberately left open.**

*Step 7, `dsa` reconciliation, was not done.* `packages/dsa/src/distance.ts` still carries
its own haversine and vincenty over a `{lat, lng}` shape, separate from `nav`'s
`distanceNm`. The three ways to close it are all unattractive: having `dsa` delegate would
give a zero-runtime-dep package a runtime dependency, which the repo's own rules forbid;
deprecating `dsa`'s implementation breaks external consumers of a published 2.x package;
and moving `nav`'s into `dsa` puts marine geometry in a data-structures library. Leaving
two great-circle implementations documented is the least-bad option until someone has a
reason to force it.

*`Asset.heading` still defaults to `0` when a frame omits it.* That is a fabricated
reading of the kind §6 argues against, but the field is typed as required and documented
as "0 when unknown" on a published 3.x package, so changing it is a deliberate breaking
change rather than a defect fix. The heading is now normalised when present, which was the
actual bug. Making the field optional — and having the marker draw a non-directional dot
when it is absent — is the right follow-up, in its own major.
