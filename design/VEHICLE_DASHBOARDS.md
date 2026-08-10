# Vehicle Operator Dashboards — Architecture

Status: **proposed**, 2026-08-10
Applies to: `@resq-systems/ui`, `@resq-systems/telemetry`, `@resq-systems/map`,
and a proposed `@resq-systems/console`

Companion to [Vehicle Telemetry Instruments](VEHICLE_TELEMETRY_INSTRUMENTS.md),
which covers the gauges. This covers the console around them.

## 1. The gap, stated plainly

Sixteen instruments exist and they are not a dashboard. A dashboard is a grid of
instruments plus six things none of them provide:

| | Why an operator needs it |
|---|---|
| **Composition** | Which panels, where, resizable, remembered between sessions |
| **Health** | Is the *link* alive, is the *fix* good — separate from whether the vehicle is |
| **Alerts** | A ranked, acknowledgeable fault list, not fifteen gauges independently turning red |
| **Command** | Arm, mode, abort, E-stop — and the confirmation discipline they demand |
| **Video** | The single most-watched panel on any real operator console |
| **History** | Trends during flight, scrub-back after it |

Everything below is scoped to the three vehicle classes symmetrically. The
differences between them turn out to be smaller than they look: roughly 70% of a
UAV, UGV and USV console is the same shell, and the divergence is *which panels
mount* and *which protocol feeds them*.

## 2. What exists today

| Layer | Package | Provides | Missing for a console |
|-------|---------|----------|-----------------------|
| Presentation | `ui` | 16 instruments, full shadcn kit (`resizable`, `sidebar`, `tabs`, `chart`, `sonner`, `command`) | Panels, video, charts shaped for telemetry, alert list, link health |
| Decoding | `ui/adapters` | ros2, mavlink, ais, signalk, vda5050, geo, staleness | Health, mission, mode/arm-state mappers |
| Transport | `telemetry` | `TelemetrySocket`, `MqttTelemetrySource`, `topicMatches`, React bindings | Frame coalescing, per-vehicle multiplexing |
| Geospatial | `map` | MapLibre shell, `AssetMarker`, `TrackLayer`, `useAssetPositions` | AIS layer, geofence, mission path, costmap overlay |
| Composition | — | **nothing** | The entire shell |

The instrument work already established the layering rule — *transport →
normalize → present, nothing skips a layer* — and it holds here.

## 3. Package placement

**`ui` stays stateless.** Its rule is stateless, hook-free, server-renderable
components driven by plain props, enforced by the perf and quality guards. Every
new *panel* obeys that: it takes data and renders it.

**A shell does not fit that rule.** Layout state, persistence, vehicle
selection, an alert store, command dispatch and acknowledgement are all
stateful and browser-bound. Putting them in `ui` would either break the guards
or quietly erode them.

> **Decision: a new `@resq-systems/console` package** holds the stateful shell.
> `ui` gains presentational panels only. This is the same split that put
> transport in `telemetry` rather than in `ui`, and it keeps `ui` importable by
> anything.

| Package | Gains |
|---------|-------|
| `ui` | `CameraFeed`, `TelemetryChart`, `AlertList`, `LinkQuality`, `MissionProgress`, `CommandButton`, `TimelineScrubber`, `PanelFrame`, `StatusAnnouncer` — all stateless |
| `console` *(new)* | `ConsoleShell`, `PanelGrid`, `VehicleRoster`, `useAlertStore`, `useVehicleChannel`, `useCommand`, layout persistence |
| `telemetry` | `useCoalescedChannel` (render-rate decoupling), per-vehicle multiplexing |
| `map` | `AisLayer`, `GeofenceLayer`, `MissionPathLayer`, `CostmapLayer` |
| `ui/adapters` | `mavlinkHealth`, `ros2Diagnostics`, `missionProgress`, `armState` mappers |

## 4. The shared shell

These are needed by all three types. Build once.

### 4.1 `PanelFrame` (ui)

The chrome every panel shares: title, staleness badge, collapse, error boundary
slot, and a consistent focus ring. Instruments already carry their own `stale`;
`PanelFrame` carries it for panels that aren't instruments (video, charts,
lists) so the treatment is uniform across the console rather than only inside
gauges.

**Staleness has exactly one owner per subtree.** Both a frame and its child can
be told they are stale — an instrument is still correct on its own, outside any
frame — but only the outermost one renders the dim. `[data-stale] [data-stale]`
resets opacity in `globals.css`, because two 45% dims multiply to 0.2025, which
measures 1.84:1 and arrives precisely during the dropout when the last known
value most needs reading. Pass `stale` at both levels when both know it; do not
try to decide which level "should" carry the treatment.

### 4.2 `ConsoleShell` + `PanelGrid` (console)

Build on the existing `resizable` component rather than adding a grid library.
Requirements: named layout presets per vehicle type, drag-resize, collapse,
persistence to `localStorage` keyed by `(vehicleType, userId)`, and a reset.

Panels declare a **priority** so the responsive strategy is data-driven rather
than a pile of breakpoints — see §7.

### 4.3 `AlertList` (ui) + `useAlertStore` (console)

The most under-appreciated panel. Requirements that a naive list gets wrong:

- **Latching.** A fault that clears must stay visible until acknowledged, or a
  momentary overcurrent vanishes before anyone sees it.
- **Deduplication.** A 10 Hz feed reporting the same fault is one alert with a
  count and a first/last-seen, not six hundred rows.
- **Severity ordering**, stable within severity, so the list does not reshuffle
  under the operator's cursor.
- **Acknowledgement** is per-alert and recorded, not a global "clear all".
- Sourced from `diagnostic_msgs/DiagnosticArray` (ROS 2), `STATUSTEXT` +
  `SYS_STATUS.onboard_control_sensors_health` (MAVLink), and `State.errors`
  (VDA5050).

### 4.4 `LinkQuality` (ui)

**Link health is not vehicle health**, and conflating them is how an operator
misreads a comms dropout as a vehicle fault. Distinct panel, distinct source:

| Field | UAV | UGV | USV |
|---|---|---|---|
| Signal | `RADIO_STATUS.rssi/remrssi` | Wi-Fi/LTE RSSI | `RADIO_STATUS` or LTE |
| Loss | `RADIO_STATUS.rxerrors/fixed` | rosbridge seq gaps | as UAV |
| Latency | round-trip ping on the socket | same | same |
| Fix | `GPS_RAW_INT.fix_type/satellites_visible/eph` | `NavSatFix.status` | `GPS_RAW_INT` / NMEA `GGA` |

Reuse `isStale` for the freshness half; this panel is the *why* behind a stale
reading.

### 4.5 `TelemetryChart` (ui)

`recharts` is already a dependency, but a telemetry strip chart is not a
business chart:

- **Ring buffer over typed arrays**, never per-sample React state — the same
  lesson `OccupancyGrid` and `ContactScope` already encode.
- Fixed time window that scrolls, not an auto-fitting domain that rescales on
  every frame.
- Threshold bands drawn from the same tokens the gauges use, so a value amber on
  the gauge is amber on the trend.
- Gap rendering for stale intervals — a straight line across a dropout is a lie.

### 4.6 `CameraFeed` (ui) — the explicit former non-goal

Video was excluded from the instrument work. A console cannot exclude it.

Keep the component **transport-agnostic and presentational**: it takes a `src`
(MJPEG / HLS) or a `MediaStream` (WebRTC), and owns only aspect-ratio
stability, a no-signal state, a stale overlay, fullscreen, and an optional
crosshair/reticle. WebRTC negotiation is stateful and belongs in `console` or
the app — the same boundary that keeps the MQTT client injected rather than
bundled.

Sources: `web_video_server` (UGV, MJPEG), WebRTC via rosbridge or a media
server, RTSP→HLS for marine/fixed cameras.

### 4.7 Command surfaces (ui + console) — the part that must not be casual

`TeleopPad` is currently the only input, and it is deliberately deadman-safe.
Arm, mode change, RTL and E-stop are heavier and need their own discipline:

- **Never optimistic.** A command button shows *requested* until the vehicle
  acknowledges via state change, then *confirmed*; on timeout, *failed*. It must
  never render success because a socket write returned.
- **Guarded actions.** Destructive commands (disarm in flight, E-stop) use
  hold-to-confirm rather than a dialog — a dialog trains people to click through.
- **E-stop is always mounted, always reachable**, never behind a tab, and
  keyboard-addressable from anywhere in the shell.
- **Show link latency next to the command**, because a 900 ms RTT changes
  whether an operator should be commanding at all.
- Disable command surfaces when the link is stale, and say why.

### 4.8 `StatusAnnouncer` (ui)

The instrument doc records an open gap: each instrument packs its full state
into one `aria-label`, so at 10 Hz a screen reader re-reads it every frame. **A
dashboard makes this fifteen times worse.**

The console-level fix is one throttled `aria-live="polite"` region that
announces *changes worth hearing* — mode transitions, new alerts, link loss,
threshold crossings — while individual instruments keep their labels for
on-demand inspection but stop being live regions. This is the right layer for it
and it resolves the gap for the whole set at once.

### 4.9 `TimelineScrubber` (ui) + playback (console)

Post-mission review is a different mode, not a different app: the same panels
fed from a recorded buffer instead of a live socket. Design the channel hook so
a recorded source is substitutable for a live one — then playback is nearly free.

## 5. Per-type dashboards

### 5.1 UAV

Best-covered today; all six flight instruments exist.

| Panel | Source | Exists |
|---|---|---|
| Attitude / Heading / Airspeed / Altimeter / VSI / Turn | `ATTITUDE`, `VFR_HUD` | ✅ |
| Battery | `BATTERY_STATUS` | ✅ |
| Map + track | `GLOBAL_POSITION_INT` | ✅ |
| **Flight mode + arm state** | `HEARTBEAT.custom_mode/base_mode` | ❌ |
| **GPS fix quality** | `GPS_RAW_INT` | ❌ |
| **RC link** | `RC_CHANNELS`, `RADIO_STATUS` | ❌ |
| **Home / RTL distance** | `HOME_POSITION` + position | ❌ |
| **Geofence** | `FENCE_STATUS` + map layer | ❌ |
| **Wind estimate** | `WIND_COV` | ❌ |
| **Mission progress** | `MISSION_CURRENT`, `MISSION_ITEM_REACHED` | ❌ |
| **Camera** | WebRTC / RTSP | ❌ |

Layout: attitude + map dominant, six-pack strip, command bar pinned, alerts
right rail.

### 5.2 UGV

| Panel | Source | Exists |
|---|---|---|
| Tilt / rollover margin | `sensor_msgs/Imu` | ✅ |
| Wheel odometry + slip | `JointState` | ✅ |
| Lidar scan | `LaserScan` | ✅ |
| Occupancy grid + pose + path | `OccupancyGrid`, `Path` | ✅ |
| Teleop | → `Twist` | ✅ |
| Battery | `BatteryState` | ✅ |
| **Costmap layers** (global/local/inflation) | `nav_msgs` + map layer | ❌ |
| **Nav2 state / recovery behaviours** | action feedback | ❌ |
| **Drive mode + E-stop** | custom / VDA5050 `operatingMode` | ❌ |
| **Joint / actuator health** | `JointState.effort`, `DiagnosticArray` | ❌ |
| **Camera (multiple)** | `web_video_server` | ❌ |
| **Fleet view** | VDA5050 over MQTT | ❌ |

Video matters most here — teleoperation without it is not teleoperation.
Layout: camera dominant, occupancy grid + lidar beside it, teleop and E-stop
pinned bottom.

### 5.3 USV

| Panel | Source | Exists |
|---|---|---|
| Depth + under-keel clearance | `SCALED_PRESSURE2` / NMEA `DBT` | ✅ |
| Compass rose (HDG vs COG) | `VFR_HUD` / NMEA `RMC` | ✅ |
| Thruster ring | `ACTUATOR_OUTPUT_STATUS` | ✅ |
| Contact scope (CPA/TCPA) | AIS | ✅ |
| Battery | `BATTERY_STATUS` | ✅ |
| **AIS on the chart** | AIS + `AisLayer` | ❌ (already noted as follow-on) |
| **Heading / course hold** | autopilot state | ❌ |
| **Rudder / steering angle** | `SERVO_OUTPUT_RAW` | ❌ |
| **Sea state / roll-pitch history** | `ATTITUDE` over time | ❌ |
| **Tide + current set/drift** | derived HDG vs COG | partial |
| **Depth trend** | sounder history | ❌ |
| **Camera / FLIR** | RTSP → HLS | ❌ |

Layout: chart dominant with AIS, contact scope + depth beside it, compass rose
and thrusters in the strip.

## 6. Data plumbing

**One socket, many vehicles.** `MqttTelemetrySource` already routes by topic
filter; extend the same idea to the WebSocket path so a roster of vehicles
multiplexes over one connection rather than N sockets.

**Decouple render rate from message rate.** This is the single highest-impact
performance decision in the whole console. A 50 Hz `ATTITUDE` stream must not
cause 50 React renders per second across fifteen panels. Add
`useCoalescedChannel` to `telemetry/react`: buffer incoming frames, flush the
latest on `requestAnimationFrame`. Charts keep every sample in their ring
buffer; gauges only ever need the newest.

**One clock, at the shell.** `isStale` needs a `now`. Tick it once in
`ConsoleShell` and pass down, rather than each panel running its own timer —
fifteen independent intervals is both wasteful and visibly inconsistent.

## 7. Layout and responsive strategy

Panels declare `priority: "primary" | "secondary" | "ancillary"`. The grid
degrades by priority rather than by ad-hoc breakpoints:

| Width | Behaviour |
|---|---|
| ≥1600 | Full layout, all panels |
| 1200–1600 | Ancillary panels tab-group |
| 768–1200 | Secondary collapse to a strip; primary + command bar remain |
| <768 | Single primary panel + command bar + alerts; everything else in a sheet |

E-stop and alerts never degrade. That is the rule that decides ties.

## 8. Accessibility at console scale

The instrument-level gaps get worse in aggregate and are fixed at this layer:

1. **One live region**, not fifteen (§4.8).
2. **Severity needs a second channel** beyond colour — the instrument doc
   records this as open, and a console full of amber and red makes it acute.
   Icon plus text in `AlertList`, pattern or position in gauges.
3. **Keyboard**: a defined panel focus order, a skip-to-command shortcut, and
   E-stop reachable from anywhere.
4. **Reduced motion** must suppress chart auto-scroll and marker animation.

## 9. Build order

Sequenced so each phase is independently useful:

1. **`PanelFrame` + `ConsoleShell` + `PanelGrid`** — mount the existing sixteen instruments in a real layout. Immediately demoable.
2. **`LinkQuality` + `AlertList` + `useAlertStore`** — the health story; the thing that makes it a console rather than a wall of gauges.
3. **`useCoalescedChannel`** — before panel count makes render cost real.
4. **`CameraFeed`** — unblocks UGV teleoperation.
5. **`TelemetryChart` + ring buffer.**
6. **Command surfaces** — most safety-critical, so it goes after the shell is stable and gets its own review.
7. **Per-type panels** — UAV mode/GPS/RC, UGV costmap/drive-mode, USV AIS layer/rudder.
8. **`TimelineScrubber` + playback.**

## 10. Non-goals and open questions

- **Not** a mission *planner*. Displaying a mission is in scope; authoring one is a different product.
- **Not** vehicle configuration or parameter editing.
- **Open:** does `console` own auth/session, or is that the host app's? Leaning host app.
- **Open:** layout persistence local-only, or synced per operator? Local first.
- **Open:** VDA5050 `Order` publishing stays out of scope until the command-surface discipline in §4.7 is proven on simpler commands.
