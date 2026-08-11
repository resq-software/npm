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

# @resq-systems/map

MapLibre + react-map-gl telemetry map primitives: a themeable dark map shell,
asset markers, and track layers that bind to
[`@resq-systems/telemetry`](../telemetry).

## Install

```sh
bun add @resq-systems/map
# peers:
bun add maplibre-gl react-map-gl react react-dom
# and, for useAssetPositions:
bun add @resq-systems/telemetry
```

Import the MapLibre stylesheet once in your app:

```ts
import "maplibre-gl/dist/maplibre-gl.css";
```

## Usage

```tsx
import "maplibre-gl/dist/maplibre-gl.css";
import { TelemetryProvider } from "@resq-systems/telemetry/react";
import { TelemetryMap, AssetMarker, TrackLayer, useAssetPositions } from "@resq-systems/map";

function Fleet() {
  const { assets } = useAssetPositions(); // parses /fleet/ws frames → positions

  return (
    <div style={{ position: "relative", height: 480 }}>
      <TelemetryMap initialViewState={{ longitude: -98.5, latitude: 39.8, zoom: 3.6 }}>
        {assets.map((asset) => (
          <AssetMarker key={asset.id} asset={asset} onSelect={select} />
        ))}
      </TelemetryMap>
    </div>
  );
}

export function App() {
  return (
    <TelemetryProvider url="wss://host/fleet/ws">
      <Fleet />
    </TelemetryProvider>
  );
}
```

### Richer markers

`AssetMarker` renders a self-contained heading arrow by default. Drop in the
`HeadingIndicator` from `@resq-systems/ui` for a full compass rose:

```tsx
import { HeadingIndicator } from "@resq-systems/ui/heading-indicator";

<AssetMarker asset={asset}>
  <HeadingIndicator heading={asset.heading} className="size-10" />
</AssetMarker>;
```

## API

- **`TelemetryMap`** — react-map-gl/MapLibre shell. `mapStyle` overrides the
  token-free dark default (or set it from your `NEXT_PUBLIC_MAP_STYLE_URL`).
- **`AssetMarker`** — places an `Asset`; default heading arrow or `children`.
- **`TrackLayer`** — breadcrumb trail from an ordered `LngLat[]`.
- **`useAssetPositions()`** — live `Asset[]` from the shared telemetry socket.
- **`parseAssetFrame`**, **`toTrackGeoJSON`**, **`resolveMapStyle`** — the pure
  helpers behind them.

## License

Apache-2.0
