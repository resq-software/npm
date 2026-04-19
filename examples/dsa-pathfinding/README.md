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
