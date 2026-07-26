# AGENTS.md — @resq-systems/map

MapLibre + react-map-gl telemetry map primitives — a themeable map shell, asset markers, and track layers that bind to `@resq-systems/telemetry`. Part of the [ResQ Systems npm workspace](../../AGENTS.md).

## Commands

```bash
bun install                                   # from repo root
bun --filter @resq-systems/map build
bun --filter @resq-systems/map test
```

## What's here

- `src/telemetry-map.tsx` — `TelemetryMap`: react-map-gl/MapLibre shell + token-free style.
- `src/asset-marker.tsx` — `AssetMarker`: heading-arrow (or `children`) at an asset position.
- `src/track-layer.tsx` — `TrackLayer`: GeoJSON breadcrumb trail.
- `src/use-asset-positions.ts` — `useAssetPositions`: telemetry frames → live positions.
- `src/asset.ts` / `src/track.ts` / `src/map-style.ts` — pure helpers (parse frames, build GeoJSON, resolve style).

## Dependencies

- **Runtime:** none.
- **Peers:** `maplibre-gl`, `react-map-gl`, `react`, `react-dom`; `@resq-systems/telemetry` (optional — only for `useAssetPositions`).

## Rules

- Keep pure logic (`asset`, `track`, `map-style`) framework-free and unit-tested; the react-map-gl components are browser-only and covered by those helpers plus visual review.
- `maplibre-gl` / `react-map-gl` / `react` / `react-dom` are **peers** — never bundle them.
- Basemap colours live in the map style (concrete colours, not design tokens — MapLibre paint can't read CSS variables). `AssetMarker` embeds `@resq-systems/ui` instruments only via `children`, so the package doesn't hard-depend on `ui`.
- Consumers import `maplibre-gl/dist/maplibre-gl.css` themselves.

## Changesets

Behavior changes need a `.changeset/*.md` bumping `@resq-systems/map`. See the [root guide](../../AGENTS.md#commits--changesets).

## References

- [Package README](README.md)
- [Workspace guide](../../AGENTS.md)
