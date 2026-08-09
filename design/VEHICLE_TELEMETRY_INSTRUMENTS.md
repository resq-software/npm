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
| Transport | `@resq-systems/telemetry` | `TelemetrySocket` (WebSocket), `MqttTelemetrySource` (MQTT topics), backoff, channel fan-out, React bindings | Any vehicle-domain schema; any rendering |
| Geospatial | `@resq-systems/map` | MapLibre shell, `AssetMarker`, `TrackLayer`, `useAssetPositions` | Non-geographic plots; instrument chrome |
| Decoding | `@resq-systems/ui/adapters` | Pure message → prop mappers for ROS 2, MAVLink, AIS, Signal K, VDA5050 | React, DOM, transport, protocol libraries |
| Presentation | `@resq-systems/ui` | Stateless SVG instruments driven by plain numeric props | WebSockets, ROS/MAVLink/AIS decoding, `maplibre-gl` |

Three consequences worth stating explicitly, because each one has an obvious-looking
wrong answer:

1. **No instrument decodes a wire format.** `LidarScan` takes `ranges: number[]` plus
   `angleMin` / `angleIncrement` — the same three fields as `sensor_msgs/LaserScan`, but
   as numbers, not as a ROS message type. The package never imports `roslibjs`. Decoding
   lives in the opt-in `@resq-systems/ui/adapters` subpath: pure functions, no React, no
   protocol libraries, so importing an instrument never drags a transport in behind it.
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

## 3a. Freshness

Every reading instrument — all fifteen, air as well as ground and sea — takes
`stale?: boolean`. When set it dims the figure, shows a STALE badge, sets
`data-stale` for consumer styling, and **leads** the
accessible label with `Stale,` — before the numbers, so an operator knows to
distrust them rather than learning so afterwards. It applies even to a
caller-supplied `label`, because a custom name does not make a frozen reading
fresh.

The instruments exist to prevent a specific failure, and it is not a wrong
number: it is a **frozen** one that still looks live. A confident `12.4 m` that
stopped updating forty seconds ago is worse than a blank, because it invites a
decision.

`stale` is a boolean and not a `timestamp` + `maxAge` pair. That looks like the
richer API, but these components are pure and hold no timer, so one given a
timestamp could not notice itself ageing — it would only re-evaluate when some
*other* prop changed, which is precisely when the reading is still moving. The
clock belongs to the application's render loop, which is also the thing that can
get a change onto the screen. `@resq-systems/ui/adapters` supplies `isStale`
and `readingAge` so there is one obvious way to compute it:

```tsx
<DepthGauge {...depth} stale={isStale(frame.receivedAt, now)} />
```

`isStale` treats an unknown timestamp as stale rather than fresh — an unknown
age is not a young one. Future timestamps are bounded in the same spirit:
modest skew is tolerated, but beyond `DEFAULT_MAX_SKEW_MS` the timestamp is
disbelieved, because an unbounded allowance would let a badly-set vehicle clock
keep frozen data looking fresh indefinitely.
`latestTimestamp` extracts the observation time from a Signal K delta, so §4's
rule that the adapters never fold a timestamp into a prop no longer leaves the
caller without a supported way to read one.

`TeleopPad` has no `stale` prop: it produces commands rather than displaying a
reading, so it has nothing that can go stale.

The contract is asserted for all fifteen instruments at once in
`src/lib/instrument-staleness.test.tsx`, rather than once per component, so the
next instrument that forgets it fails rather than shipping quietly. The first
revision of that suite asserted nine and quietly omitted the six aviation
instruments — which is precisely the failure mode the suite exists to catch.

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
| `BatteryGauge` | `sensor_msgs/BatteryState` | `percentage` is **0–100**; ROS sends a 0–1 fraction, so the adapter multiplies by 100. Plus `voltage`, `current`, `cellVoltages[]`, `temperature` |
| `TeleopPad` | publishes `geometry_msgs/Twist` | emits `{ linear, angular }` normalized to ±1; caller scales to `cmd_vel` |

### Sea (MAVLink / NMEA / AIS)

| Component | Source | Prop mapping |
|-----------|--------|--------------|
| `DepthGauge` | `SCALED_PRESSURE2` / NMEA `DBT` | `depth` (m below surface), `seabed` (m, total water column), `target` (depth-hold bug) |
| `CompassRose` | `VFR_HUD` + NMEA `RMC`/`VTG` | `heading` (deg true), `course` (COG, deg), `speed` (SOG, kn) |
| `ThrusterRing` | `ACTUATOR_OUTPUT_STATUS` / ArduSub motor mix | `thrusters: { label, output, angle }[]` with `output` in ±1 |
| `ContactScope` | AIS position reports (AISStream / AIS-catcher) | `contacts: { id, bearing, range, course?, speed?, cpa?, tcpa? }[]`, `rangeMax`, `heading` |

### Ground fleets (VDA5050 over MQTT)

VDA5050 is the open standard for AGV fleet ↔ master-control messaging, and it is where
the "no wire formats in `ui`" rule earns its keep twice over: one `State` message feeds
three different instruments.

| Component | VDA5050 `State` field | Prop mapping |
|-----------|-----------------------|--------------|
| `OccupancyGrid` (pose) | `agvPosition.{x,y,theta}` | `pose` — `theta` is already radians |
| `BatteryGauge` | `batteryState.{batteryCharge,batteryVoltage,charging}` | `percentage` (already 0–100), `voltage`; VDA5050 reports **no current**, so the amps readout stays blank |
| `TeleopPad` (readback) | `velocity.{vx,vy,omega}` | normalized against caller-supplied full-scale |

The fleet dimension lives in the **topic**, not the payload —
`<interface>/v<major>/<manufacturer>/<serial>/<topic>` — which is why the MQTT transport
exposes topic filters rather than one undifferentiated frame stream.

### Marine data (Signal K)

Signal K deltas are SI throughout — radians, m/s, metres — so every adapter here is path
lookup plus unit conversion. Deltas carry an ISO-8601 `timestamp`. It is never folded
into a prop — unit conversion stays the adapters' job and staleness policy stays the
caller's — but `latestTimestamp` exposes it, so the caller can drive `stale` (§3a)
rather than having no supported way to read it at all.

| Component | Signal K path | Prop mapping |
|-----------|---------------|--------------|
| `CompassRose` | `navigation.headingTrue`, `navigation.courseOverGroundTrue` | radians → degrees |
| `CompassRose` | `navigation.speedOverGround` | m/s → knots (÷ 0.514444) |
| `DepthGauge` | `environment.depth.belowSurface` | `seabed` |
| `DepthGauge` | `environment.depth.{surfaceToTransducer,transducerToKeel}` | `depth` — keel below surface |
| `DepthGauge` | `environment.depth.belowKeel` | cross-check for the derived altitude |

That last group is why `DepthGauge` earns its place on a surface vessel and not only on an
ROV: feed it keel depth as `depth` and sounded depth as `seabed`, and its altitude readout
*is* under-keel clearance — the number a skipper actually watches.

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
| Sea | `ContactScope` | `./contact-scope` | PPI scope (cap ranks by CPA risk, not range) |

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

A second sweep turned up more operator consoles but confirmed the shape of the gap:
almost every result is a *whole application* — a console, a fleet dashboard, a protocol
bridge — and almost none is a reusable component library. That is the space this package
occupies, so these are mined for behaviour and field vocabulary, never for code:

- **Open-RMF** (`rmf-web`, `free_fleet`, `rmf_visualization`) — multi-fleet indoor robot
  dashboards; the reference for what fleet state actually needs to be shown
- **Waverley `robo-perception`**, **`ROS2-ReactJS-App`**, **FKIE `field_test_tool`** —
  React + `roslibjs` + rosbridge teleop consoles
- **Transitive Robotics `transact`**, **NVIDIA Isaac Mission Control / Cloud Control** —
  cloud fleet management and VDA5050 dispatch
- **VDA5050** and the **VDA5050 Visualizer** — the AGV fleet standard itself, and an
  MQTT-over-WebSocket visualiser for it
- **Signal K Server**, **KIP**, **Freeboard-SK**, **OpenPlotter** — the marine data
  standard and the mature dashboards built on it
- **Serial Studio** — a cross-protocol telemetry dashboard (MAVLink, NMEA 0183/2000, UBX)
- **VRX** — Gazebo/ROS 2 USV autonomy simulation, useful for generating test fixtures

Two of those are **standards, not applications**, and they are the reason §4 grew: VDA5050
fixes the ground-fleet contract, Signal K fixes the marine one. Both are now first-class
adapter targets.

The Thalweg finding drives one rule here: `OccupancyGrid` and `ContactScope` accept
`ArrayLike<number>` and plain arrays respectively, and never lift per-cell or per-contact
data into React state.

## 8. Non-goals

- No ROS/MAVLink/AIS **decoding** in the instrument components. It lives one layer out, in
  the opt-in `./adapters` subpath, which imports no React and no protocol library.
- No video. Camera feeds (`web_video_server`, WebRTC) are an app concern.
- No 3D. Point clouds and mesh SLAM output are out of scope for an SVG instrument set.
- No basemap in `ui`. Geographic rendering stays in `@resq-systems/map`.

## 9. Follow-on work

These are known gaps, recorded rather than quietly carried:

1. **Announcement rate.** Each instrument packs its whole state into one
   `aria-label`. At a 10 Hz feed a screen reader would re-read the entire
   sentence every frame, which is unusable. Wants a throttled `aria-live`
   summary region, or `role="meter"` where the shape fits.
2. **Colour is the only severity channel** on the tilt dot, wheel bars,
   thruster bars and cell bars. That fails colour-blind operators and bright
   sunlight — both ordinary field-robotics conditions. Severity reaches the
   accessible label, but a sighted colour-blind operator gets nothing.
3. **No damping.** Values jump discretely, so a raw feed will jitter the lidar
   outline and the tilt dot. Real instruments damp needle motion.
4. **Fixed 200×200 viewBox.** Labels are illegible below roughly `size-32` and
   undersized above `size-64`; there is no compact/detailed variant.
5. **No visual verification.** Chromatic has never run against these
   components, so all sixty-nine stories are unbaselined. Confidence currently
   rests on unit tests that assert strings and element counts, not appearance.
6. `AisLayer` in `@resq-systems/map` — the geographic half of `ContactScope`.
7. A `<VehicleConsole>` composite (telemetry provider + instrument grid) once the ground
   and sea sets have been exercised by a real consumer.
8. VDA5050 `Order` / `InstantActions` **publishing** helpers. The adapters currently read
   `State` only; commanding a fleet is a bigger safety surface and wants its own design.
9. Recorded-frame fixtures (rosbag, VRX, AIS-catcher captures) to replace the synthetic
   messages the adapter tests use today.
