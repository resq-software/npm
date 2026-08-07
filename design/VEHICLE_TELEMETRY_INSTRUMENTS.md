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

# Vehicle Telemetry Instruments — Architecture

Status: **accepted**, 2026-08-06
Applies to: `@resq-systems/ui`, `@resq-systems/telemetry`, `@resq-systems/map`

## 1. Context

`@resq-systems/ui` currently ships six clean-room **flight** instruments — attitude,
heading, airspeed, altimeter, vertical-speed, turn-coordinator. They exist because the
first telemetry consumer was an aerial fleet.

Aviation is the wrong vocabulary for the other two vehicle classes ResQ operates:

- **Ground** — UGVs, rovers, AMRs. The operator cares about *rollover margin, wheel slip,
  obstacle proximity, map coverage, and commanded velocity* — not airspeed or VSI.
- **Sea** — ROVs, USVs, and surface-vessel awareness. The operator cares about *depth and
  seabed clearance, heading-vs-course divergence under current, thruster saturation, and
  nearby contacts* — again, not the six-pack.

Reusing an artificial horizon for a rover's tilt readout is not just cosmetically wrong;
it hides the one number that matters (distance to the static stability limit).

This document fixes the component inventory, the prop-level data contracts those
components accept, and which package each piece belongs in.

## 2. Package placement

The rule is **transport → normalize → present**, and nothing skips a layer.

| Layer | Package | Owns | Never contains |
|-------|---------|------|----------------|
| Transport | `@resq-systems/telemetry` | `TelemetrySocket`, backoff, channel fan-out, React bindings | Any vehicle-domain schema; any rendering |
| Geospatial | `@resq-systems/map` | MapLibre shell, `AssetMarker`, `TrackLayer`, `useAssetPositions` | Non-geographic plots; instrument chrome |
| Presentation | `@resq-systems/ui` | Stateless SVG instruments driven by plain numeric props | WebSockets, ROS/MAVLink/AIS decoding, `maplibre-gl` |

Three consequences worth stating explicitly, because each one has an obvious-looking
wrong answer:

1. **No instrument decodes a wire format.** `LidarScan` takes `ranges: number[]` plus
   `angleMin` / `angleIncrement` — the same three fields as `sensor_msgs/LaserScan`, but
   as numbers, not as a ROS message type. The package never imports `roslibjs`. Adapters
   live in the consuming app (or, later, an opt-in `@resq-systems/ui/adapters` subpath).
2. **Anything with a latitude belongs to `map`.** An AIS overlay on a basemap is a `map`
   concern. But a **relative-bearing scope** — contacts plotted by range and bearing from
   own-vehicle, with no projection and no basemap — is a plot, not a map, so `ContactScope`
   lives in `ui` and pulls in zero map dependencies.
3. **`ui` stays framework-light.** No new runtime dependencies were added for any component
   in this document. Everything is hand-drawn SVG over the existing
   `src/lib/instrument-dial.ts` geometry helpers.

## 3. Inherited constraints

Every component here is enforced by the existing guard suites
(`src/lib/perf-guards.test.ts`, `src/lib/quality-guards.test.ts`). These are not style
preferences — they fail CI:

- **Zero inline `style` props.** Motion is expressed through SVG `transform` *attributes*.
  (`inline-style-budget`, budget 0.)
- **No forced-reflow reads** — `getBoundingClientRect`, `offsetWidth`, `getComputedStyle`
  and friends are banned in component sources. Interactive components that need their own
  size use `ResizeObserver` inside `useEffect`. (`no-forced-reflow-reads`.)
- **Design tokens only.** Colors are `var(--foreground)`, `var(--warning)`,
  `var(--destructive)`, `var(--success)`, `var(--info)`, `var(--hint)` — never hex, so
  light/dark both track. (`no-raw-hex-in-classnames`.)
- **`role="img"` + `data-slot` + an auto-generated `aria-label`** on every root, with a
  `label` prop to override. The `data-slot` is the Element Timing hook.
  (`missing-data-slot`.)
- **`cn(base, className)`** so consumers can resize/override. (`className-merging`.)
- **No generic radii** (`rounded-xl`/`2xl`/`3xl`); explicit pixel radii per the style guide.
- Stateless and hook-free wherever possible, so instruments server-render. `TeleopPad` is
  the single deliberate exception — it is an input device.

## 4. Data-shape contracts

Props are normalized SI-ish scalars. This table is the mapping an adapter must implement;
it is the contract this design is accountable to.

### Ground (ROS 2)

| Component | Source message | Prop mapping |
|-----------|----------------|--------------|
| `TiltIndicator` | `sensor_msgs/Imu` → RPY | `pitch`, `roll` (deg), `limit` (deg, static stability limit) |
| `WheelOdometer` | `sensor_msgs/JointState` / custom drive status | `wheels: { label, velocity, commanded?, slip? }[]`, `maxVelocity` (m/s) |
| `LidarScan` | `sensor_msgs/LaserScan` | `ranges: number[]`, `angleMin`, `angleIncrement` (rad), `rangeMax` (m), `warnRange` |
| `OccupancyGrid` | `nav_msgs/OccupancyGrid` + `nav_msgs/Path` | `cells: ArrayLike<number>` (−1 unknown, 0–100 occupancy), `width`, `height`, `resolution`, `pose`, `path` |
| `BatteryGauge` | `sensor_msgs/BatteryState` | `percentage` (0–1 → shown 0–100), `voltage`, `current`, `cellVoltages[]`, `temperature` |
| `TeleopPad` | publishes `geometry_msgs/Twist` | emits `{ linear, angular }` normalized to ±1; caller scales to `cmd_vel` |

### Sea (MAVLink / NMEA / AIS)

| Component | Source | Prop mapping |
|-----------|--------|--------------|
| `DepthGauge` | `SCALED_PRESSURE2` / NMEA `DBT` | `depth` (m below surface), `seabed` (m, total water column), `target` (depth-hold bug) |
| `CompassRose` | `VFR_HUD` + NMEA `RMC`/`VTG` | `heading` (deg true), `course` (COG, deg), `speed` (SOG, kn) |
| `ThrusterRing` | `ACTUATOR_OUTPUT_STATUS` / ArduSub motor mix | `thrusters: { label, output, angle }[]` with `output` in ±1 |
| `ContactScope` | AIS position reports (AISStream / AIS-catcher) | `contacts: { id, bearing, range, course?, speed?, cpa?, tcpa? }[]`, `rangeMax`, `heading` |

Bearing convention across the whole set: **degrees clockwise from north (or from
vehicle nose for relative bearings)**, matching the existing `polar()` helper, which
measures clockwise from 12 o'clock.

## 5. Inventory

| Domain | Component | Subpath | Shape |
|--------|-----------|---------|-------|
| Air (shipped) | `AttitudeIndicator` | `./attitude-indicator` | round |
| Air (shipped) | `HeadingIndicator` | `./heading-indicator` | round |
| Air (shipped) | `AirspeedIndicator` | `./airspeed-indicator` | round |
| Air (shipped) | `Altimeter` | `./altimeter` | round |
| Air (shipped) | `VerticalSpeedIndicator` | `./vertical-speed-indicator` | round |
| Air (shipped) | `TurnCoordinator` | `./turn-coordinator` | round |
| Ground | `TiltIndicator` | `./tilt-indicator` | dual-axis silhouette |
| Ground | `WheelOdometer` | `./wheel-odometer` | bar array |
| Ground | `LidarScan` | `./lidar-scan` | polar ring |
| Ground | `OccupancyGrid` | `./occupancy-grid` | raster mini-map |
| Ground + Sea | `BatteryGauge` | `./battery-gauge` | pack + cell panel |
| Ground + Sea | `TeleopPad` | `./teleop-pad` | interactive pad |
| Sea | `DepthGauge` | `./depth-gauge` | vertical tape |
| Sea | `CompassRose` | `./compass-rose` | marine rose |
| Sea | `ThrusterRing` | `./thruster-ring` | radial mix |
| Sea | `ContactScope` | `./contact-scope` | PPI scope |

Deliberate shape diversity: an operator console that is ten identical round dials is
unreadable under stress. Round dials are reserved for continuously-varying scalars with a
familiar mental model; arrays get bars, fields get rasters, spatial data gets polar plots.

## 6. Licensing

All instruments are **clean-room**: geometry follows published display conventions
(the aviation six-pack, IHO depth presentation, radar PPI layout), with no third-party
instrument source consulted. This is deliberate — the well-known React flight-instrument
and marine-gauge libraries are GPL-family licensed and would contaminate an Apache-2.0
package. Every component file carries the Apache-2.0 header and repeats the clean-room
note in its `@fileoverview`.

## 7. Prior art surveyed

Reference implementations reviewed for *behavior and field vocabulary only* — no code was
copied from any of them:

- Blue Robotics **Cockpit** — ROV/USV ground control, MAVLink/ArduSub joystick + telemetry model
- **Raph Rover Web UI** (Fictionlab) — React + rosbridge rover operator console
- **MR2** (URC/KAIST) — ROS 2 rover stack with `rosbridge_server` + `web_video_server` dashboard
- `RobotWebTools/ros2-web-bridge`, `roslibjs` — browser↔ROS 2 transport shape
- **Thalweg** — deck.gl maritime rendering at 40k+ live vessels (typed arrays, not React state)
- **SIST**, **Maritime Vessel Tracking** — AIS anomaly/congestion dashboards
- **AIS-catcher**, **AISdb**, `ros_ais` — AIS ingest, storage, and ROS bridging

The Thalweg finding drives one rule here: `OccupancyGrid` and `ContactScope` accept
`ArrayLike<number>` and plain arrays respectively, and never lift per-cell or per-contact
data into React state.

## 8. Non-goals

- No ROS/MAVLink/AIS **decoding** in `ui`. Adapters are a later, opt-in subpath.
- No video. Camera feeds (`web_video_server`, WebRTC) are an app concern.
- No 3D. Point clouds and mesh SLAM output are out of scope for an SVG instrument set.
- No basemap in `ui`. Geographic rendering stays in `@resq-systems/map`.

## 9. Follow-on work

1. `@resq-systems/ui/adapters` — pure `ros2` / `mavlink` / `ais` message → prop mappers,
   unit-tested against recorded frames.
2. `AisLayer` in `@resq-systems/map` — the geographic half of `ContactScope`.
3. A `<VehicleConsole>` composite (telemetry provider + instrument grid) once the ground
   and sea sets have been exercised by a real consumer.
