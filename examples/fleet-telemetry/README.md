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

# Example: Fleet Telemetry Ingest

The path from a socket frame to something a map can draw, with no server and no browser:

```text
wire text ──▶ TelemetrySocket ──▶ coalescer ──▶ parseAssetFrame ──▶ Asset
                                           └──▶ reduce ──▶ trail ──▶ toTrackGeoJSON
```

Three design decisions make that runnable in a terminal, and they are what the example
is for:

1. **Both transports are injected.** `TelemetrySocket` and `MqttTelemetrySource` take a
   factory, so `src/fake-transport.ts` substitutes a scripted peer for a real one. It is
   also why `@resq-systems/telemetry` has zero runtime dependencies.
2. **Coalescing is scheduler-injected.** Pass a `FlushScheduler` and the 50 Hz fold
   becomes a function call instead of an animation frame.
3. **The parsers are pure.** `parseAssetFrame` and `toTrackGeoJSON` are plain functions
   over data, so the whole data path is exercisable without a WebGL context.

## What it shows

**`@resq-systems/telemetry`** — `createBackoff` and `createReconnectTimer` (the ladder is
readable before anything drops); `TelemetrySocket` with lifecycle callbacks, the `false`
return from `send()` before the handshake, and open-replay for a late subscriber;
`createCoalescer` with both latest-wins and an accumulating `reduce`, with the
`received` / `coalesced` counters that prove folding happened; `MqttTelemetrySource` and
`topicMatches` for fleets where identity lives in the topic rather than the payload.

**`@resq-systems/map`** — `parseAssetFrame` on the ResQ fleet field aliases, including
the three frames it refuses and the heading it leaves **absent** rather than defaulting
to `0` (due north is a real bearing); `toTrackGeoJSON`, including the antimeridian split
that stops a Pacific transit drawing a line back across the globe; `resolveMapStyle` and
`DEFAULT_MAP_STYLE_URL`.

Because `@resq-systems/map` depends on `@resq-systems/nav` for `isPosition` and
`normalizeBearing`, the refusals above are nav's refusals — a frame reporting latitude
800 is dropped, not clamped, and `heading_deg: 411` comes back as `51`.

## Not covered here

The React half, deliberately: `TelemetryProvider` / `useTelemetry` /
`useTelemetryChannel` / `useCoalescedChannel` from `@resq-systems/telemetry/react`, and
`<TelemetryMap>` / `<AssetMarker>` / `<TrackLayer>` / `useAssetPositions` from
`@resq-systems/map`. Those need a DOM and a WebGL context; everything in this example is
the layer underneath them.

## On the devDependencies

`maplibre-gl`, `react-map-gl`, `react` and `react-dom` are listed although nothing here
imports them. `@resq-systems/map`'s ESM barrel is eager — `import { parseAssetFrame }
from "@resq-systems/map"` loads the React map shell too — so its peers must resolve at
runtime even for a console program that only uses the pure helpers. They are required to
run the example, never to type-check it.

## Running

```bash
# From the workspace root
bun install
bun --filter example-fleet-telemetry start

# Or from this directory
cd examples/fleet-telemetry
bun run start
```
