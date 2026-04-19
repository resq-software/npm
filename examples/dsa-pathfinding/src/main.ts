/**
 * Copyright 2026 ResQ Systems, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Drone Fleet Route Optimization — Earthquake Response
 *
 * Demonstrates @resq-sw/dsa data structures in a realistic disaster
 * response scenario where drones must deliver medical supplies, survey
 * damage, and prioritize rescue requests across an affected region.
 *
 * Location data is loosely based on the San Francisco Bay Area.
 */

import {
  Graph,
  Distance,
  PriorityQueue,
  BloomFilter,
  Trie,
} from "@resq-sw/dsa";

// ──────────────────────────────────────────────
// 1. LOCATION DATA — GPS coordinates of key sites
// ──────────────────────────────────────────────

interface Location {
  name: string;
  lat: number;
  lng: number;
  type: "hospital" | "shelter" | "depot" | "landing-zone";
}

const locations: Record<string, Location> = {
  "SF-General":   { name: "SF General Hospital",         lat: 37.7554, lng: -122.4034, type: "hospital" },
  "UCSF-Medical": { name: "UCSF Medical Center",         lat: 37.7631, lng: -122.4576, type: "hospital" },
  "Shelter-A":    { name: "Moscone Center Shelter",       lat: 37.7840, lng: -122.4010, type: "shelter" },
  "Shelter-B":    { name: "Marina Green Shelter",         lat: 37.8070, lng: -122.4350, type: "shelter" },
  "Shelter-C":    { name: "Golden Gate Park Shelter",     lat: 37.7694, lng: -122.4862, type: "shelter" },
  "Supply-Depot": { name: "Oakland Supply Depot",         lat: 37.8044, lng: -122.2712, type: "depot" },
  "LZ-North":    { name: "Crissy Field Landing Zone",     lat: 37.8039, lng: -122.4644, type: "landing-zone" },
  "LZ-South":    { name: "Candlestick Point Landing Zone", lat: 37.7134, lng: -122.3830, type: "landing-zone" },
};

// ──────────────────────────────────────────────
// 2. HAVERSINE DISTANCE — real distances between sites
// ──────────────────────────────────────────────

console.log("═══════════════════════════════════════════");
console.log("  DRONE FLEET ROUTE OPTIMIZATION");
console.log("  Earthquake Response — San Francisco");
console.log("═══════════════════════════════════════════\n");

console.log("── Section 1: Distance Calculations ──\n");

const depot = locations["Supply-Depot"]!;
for (const [id, loc] of Object.entries(locations)) {
  if (id === "Supply-Depot") continue;
  const km = Distance.haversine(depot, loc);
  console.log(`  ${depot.name} → ${loc.name}: ${km.toFixed(2)} km`);
}

// ──────────────────────────────────────────────
// 3. GRAPH + DIJKSTRA — build route network
// ──────────────────────────────────────────────

console.log("\n── Section 2: Route Network (Graph) ──\n");

// Build an undirected weighted graph where edge weights are haversine distances.
const routeGraph = new Graph<string>({ directed: false });

// Define flyable corridors (not every pair is directly reachable due to
// no-fly zones, building obstructions, etc.)
const corridors: [string, string][] = [
  ["Supply-Depot", "LZ-North"],
  ["Supply-Depot", "LZ-South"],
  ["LZ-North", "Shelter-A"],
  ["LZ-North", "Shelter-B"],
  ["LZ-North", "Shelter-C"],
  ["LZ-South", "SF-General"],
  ["LZ-South", "Shelter-A"],
  ["Shelter-A", "UCSF-Medical"],
  ["Shelter-A", "SF-General"],
  ["Shelter-B", "UCSF-Medical"],
  ["Shelter-C", "UCSF-Medical"],
  ["SF-General", "UCSF-Medical"],
];

for (const [from, to] of corridors) {
  const a = locations[from]!;
  const b = locations[to]!;
  const weight = Distance.haversine(a, b);
  routeGraph.addEdge(from, to, weight);
}

console.log(`  Vertices: ${routeGraph.vertexCount}  |  Edges: ${routeGraph.edgeCount}\n`);

// Dijkstra: shortest path from depot to each hospital
const hospitalIds = ["SF-General", "UCSF-Medical"] as const;
for (const hId of hospitalIds) {
  const result = routeGraph.findShortestPath("Supply-Depot", hId);
  if (result.found) {
    const names = result.path.map((id) => locations[id]!.name);
    console.log(`  Shortest route to ${locations[hId]!.name}:`);
    console.log(`    Path : ${names.join(" → ")}`);
    console.log(`    Dist : ${result.distance.toFixed(2)} km\n`);
  }
}

// A* search with haversine heuristic
console.log("  A* search (Supply Depot → Golden Gate Park Shelter):");
const astarResult = routeGraph.astar("Supply-Depot", "Shelter-C", (a, b) => {
  return Distance.haversine(locations[a]!, locations[b]!);
});
if (astarResult) {
  const names = astarResult.path.map((id) => locations[id]!.name);
  console.log(`    Path : ${names.join(" → ")}`);
  console.log(`    Cost : ${astarResult.cost.toFixed(2)} km`);
}

// ──────────────────────────────────────────────
// 4. PRIORITY QUEUE — triage rescue requests
// ──────────────────────────────────────────────

console.log("\n── Section 3: Rescue Request Triage (PriorityQueue) ──\n");

interface RescueRequest {
  id: string;
  location: string;
  urgency: "critical" | "high" | "medium" | "low";
  description: string;
}

const urgencyWeight: Record<RescueRequest["urgency"], number> = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
};

const rescueQueue = new PriorityQueue<RescueRequest>({
  compareFn: (a, b) => urgencyWeight[a.urgency] - urgencyWeight[b.urgency],
});

// Incoming requests arrive in arbitrary order
rescueQueue.enqueue({ id: "RQ-001", location: "Shelter-A", urgency: "medium",   description: "Water resupply needed" });
rescueQueue.enqueue({ id: "RQ-002", location: "SF-General", urgency: "critical", description: "Blood supply critically low" });
rescueQueue.enqueue({ id: "RQ-003", location: "Shelter-B", urgency: "low",      description: "Blanket request (50 units)" });
rescueQueue.enqueue({ id: "RQ-004", location: "Shelter-C", urgency: "high",     description: "Insulin delivery for 12 patients" });
rescueQueue.enqueue({ id: "RQ-005", location: "UCSF-Medical", urgency: "critical", description: "Surgical kit resupply" });
rescueQueue.enqueue({ id: "RQ-006", location: "Shelter-A", urgency: "high",     description: "Infant formula shortage" });

console.log(`  ${rescueQueue.size} requests queued. Processing in priority order:\n`);

let order = 1;
while (!rescueQueue.isEmpty) {
  const req = rescueQueue.dequeue()!;
  const tag = req.urgency.toUpperCase().padEnd(8);
  console.log(`  ${order}. [${tag}] ${req.id} — ${req.description} (${locations[req.location]!.name})`);
  order++;
}

// ──────────────────────────────────────────────
// 5. BLOOM FILTER — track surveyed grid zones
// ──────────────────────────────────────────────

console.log("\n── Section 4: Aerial Survey Tracker (BloomFilter) ──\n");

// Divide the affected area into a grid of ~100 zones
const surveyFilter = new BloomFilter(100, 0.01);

// Simulate surveying some zones
const surveyedZones = [
  "zone-37.75-122.40", "zone-37.76-122.40", "zone-37.77-122.40",
  "zone-37.75-122.41", "zone-37.76-122.41", "zone-37.77-122.41",
  "zone-37.78-122.40", "zone-37.78-122.41", "zone-37.79-122.40",
  "zone-37.80-122.43",
];

for (const zone of surveyedZones) {
  surveyFilter.add(zone);
}

console.log(`  ${surveyedZones.length} grid zones marked as surveyed.\n`);

// Check new drone assignments — skip zones already surveyed
const candidateZones = [
  "zone-37.75-122.40", // already done
  "zone-37.81-122.44", // new
  "zone-37.76-122.41", // already done
  "zone-37.82-122.45", // new
  "zone-37.83-122.46", // new
];

console.log("  Checking candidate zones for next flight:");
for (const zone of candidateZones) {
  const alreadySurveyed = surveyFilter.has(zone);
  const status = alreadySurveyed ? "SKIP (already surveyed)" : "ASSIGN to drone";
  console.log(`    ${zone} → ${status}`);
}

// ──────────────────────────────────────────────
// 6. TRIE — autocomplete for dispatcher search
// ──────────────────────────────────────────────

console.log("\n── Section 5: Location Search (Trie) ──\n");

const locationTrie = new Trie<Location>({ caseInsensitive: true, maxResults: 5 });

// Index all locations by their full name
for (const loc of Object.values(locations)) {
  locationTrie.insert(loc.name, loc);
}

// Simulate dispatcher typing partial names
const queries = ["SF", "Mosc", "Golden", "Cr", "Oak"];

for (const query of queries) {
  const results = locationTrie.searchByPrefix(query);
  const matches = results.map((r) => r.word).join(", ") || "(no matches)";
  console.log(`  "${query}" → ${matches}`);
}

// ──────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════");
console.log("  All sections complete.");
console.log("═══════════════════════════════════════════\n");
