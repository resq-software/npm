# Drone Fleet Route Optimization

A demonstration of `@resq-sw/dsa` in a disaster response scenario: optimizing drone delivery routes after an earthquake.

## What it shows

- **Graph + Dijkstra + A\***: Model a network of locations (hospital, shelters, supply depot, landing zones) and find optimal drone routes.
- **PriorityQueue**: Triage incoming rescue requests by urgency level.
- **BloomFilter**: Track surveyed grid zones to avoid redundant reconnaissance flights.
- **Distance**: Calculate haversine distances between GPS coordinates of response locations.
- **Trie**: Autocomplete search over location names for dispatchers.

## Running

```bash
# From the workspace root
bun install
bun --filter example-dsa-pathfinding start

# Or from this directory
cd examples/dsa-pathfinding
bun run start
```
