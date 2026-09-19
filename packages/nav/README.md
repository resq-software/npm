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

# @resq-systems/nav

Earth and vehicle geometry, collision geometry, and derived navigation quantities for
telemetry consoles. Zero runtime dependencies.

A vehicle transmits measurements. An operator needs the relationships between them — the
divergence between heading and course that *is* the current, the disagreement between wheel
odometry and ground velocity that *is* wheel slip, the closest point of approach that no
contact ever reports. This package computes those, and nothing else.

## Not a navigation aid

**This library is for display and situational awareness. It is not a navigation aid, not a
collision-avoidance system, and not an engineering tool.** Specifically:

- `distanceNm` and `bearingDeg` are spherical (haversine) and carry roughly **0.5% error**
  against WGS-84.
- `toLocalNm` is an equirectangular approximation about the observer, valid only over
  collision-assessment ranges — a few tens of nautical miles, not ocean crossings.
- `closestApproach` is a **constant-velocity projection, not a prediction**. It assumes
  both vessels hold course and speed, which is exactly what they do not do in an encounter.
- CPA and TCPA thresholds are **engineering policy, not COLREG rules**. Nothing here
  determines stand-on or give-way status; that is a legal determination this package does
  not make.
- AIS is self-reported, unencrypted, spoofable, and blind to non-transmitting traffic. It
  must never be the sole basis for collision avoidance.

## Install

```bash
bun add @resq-systems/nav
```

## Refusal over guessing

Every function that can be given an unanswerable input refuses rather than inventing a
number. `closestApproach` returns `null` when either party's motion is unknown.
`crabAngleDeg` returns `undefined` when either heading or course is missing. `optional`
returns `undefined` rather than `0`.

This is deliberate and load-bearing: a plausible number with no basis is worse than a
visibly absent one, because only the absent one prompts the operator to look elsewhere.
Do not "fix" a refusal by substituting a default.

```ts
import { closestApproach, toLocalNm, courseToVelocity } from "@resq-systems/nav";

const offset = toLocalNm(own, target);
const relative = {
  east: targetVel.east - ownVel.east,
  north: targetVel.north - ownVel.north,
};

const approach = closestApproach(offset, relative);
if (approach === null) {
  // One of them is not reporting motion. Show "—", not zero.
}
```

## Subpath exports

Every module is independently importable, so a console that only needs unit conversions
does not pull in collision geometry.

| Import | Contents |
|---|---|
| `@resq-systems/nav` | Everything below |
| `@resq-systems/nav/geo` | `distanceNm`, `bearingDeg`, `toLocalNm`, `courseToVelocity`, `normalizeBearing`, `isPosition` |
| `@resq-systems/nav/approach` | `closestApproach`, the `Approach` shape |
| `@resq-systems/nav/arpa` | `compareByRisk`, `worstApproach` — contact risk ordering |
| `@resq-systems/nav/derived` | Crab angle, set and drift, slip ratio, stopping distance, endurance |
| `@resq-systems/nav/units` | Knots, metres per second, nautical miles, degrees, radians |
| `@resq-systems/nav/numeric` | `optional`, `clamp` |
| `@resq-systems/nav/staleness` | `isStale` and its thresholds |

## What this package will not accept

Formulas are admitted only if all three hold:

1. Every input is a quantity the telemetry actually carries, or a parameter the caller
   explicitly declares.
2. The output is a description, not a command.
3. The function can honestly refuse when an input is missing.

That rules out, permanently: rollover speed ceilings and skid-steer effective track width
(inputs are not telemetry), line-of-sight guidance laws and differential-drive inverse
kinematics (they emit commands), hull resistance and propeller coefficients (no console
has them), hydrostatic stability `GM` and righting moments (every input is a guess), and
anything resembling state estimation, control loops, motor mixing or thrust allocation —
that is vehicle-side real-time work and belongs in the autopilot, not in a browser.

See [design/VEHICLE_NAVIGATION_MATH.md](../../design/VEHICLE_NAVIGATION_MATH.md) for the
full rationale.

## License

Apache-2.0
