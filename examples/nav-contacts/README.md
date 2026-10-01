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

# Example: Contact Assessment

A console readout for a USV in a harbour approach, built with `@resq-systems/nav`.

The example is really about one thing: **nav refuses to guess**, and a console that
renders those refusals as `0` throws away most of the package's value. Eleven refusals
are produced on a normal run, and the program tallies them at the end.

## The four shapes of a refusal

| Shape | Where | Example in this file |
| --- | --- | --- |
| `null` | `closestApproach` | a radar paint with no motion solution gets no CPA |
| `undefined` | everything in `/derived`, `optional`, `readingAge` | compass failure ⇒ no crab angle |
| an absent field | `observedCurrent` | at slack water `drift: 0` and `setDeg` is **omitted** |
| a pessimistic answer | `isStale`, `compareByRisk` | no timestamp ⇒ `true`; no CPA ⇒ ranked by range, not assumed safe |

## What it shows

- **Geometry** — `distanceNm`, `bearingDeg`, `toLocalNm`, `courseToVelocity`.
- **Collision** — `closestApproach`, including the `null` branch and the `model` field
  that records the constant-velocity assumption the answer rests on.
- **Ranking** — `compareByRisk`, `nearestByRange`, `worstApproach`, `isUsableCpa`, and
  `formatBearing` for three-digit marine bearings (`007`, not `7`).
- **Derived, afloat** — `crabAngleDeg`, `observedCurrent`, `crossTrackNm`.
- **Derived, ashore** — `stoppingDistanceM`, `slipRatio`, `turnRadiusM`,
  `rateOfTurnDegPerSec`, `differentialDriveMotion`, `enduranceHours`.
- **Freshness** — `isStale`, `readingAge`, `DEFAULT_MAX_AGE_MS`.
- **Units and numerics** — `knotsToMs`, `nauticalMilesToMetres`, `metresToFeet`,
  `optional`, `clamp`.

## What nav is not

Not a navigation aid. `distanceNm` / `bearingDeg` are haversine (~0.5% off WGS-84),
`toLocalNm` is equirectangular and only meaningful over tens of nautical miles, and
`closestApproach` is a constant-velocity *projection* rather than a prediction.

## Running

```bash
# From the workspace root
bun install
bun --filter example-nav-contacts start

# Or from this directory
cd examples/nav-contacts
bun run start
```
