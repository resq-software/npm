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

import "@resq-sw/ui/styles/globals.css";

// ── @resq-sw/ui — Component library ────────────────────────────
import { Badge } from "@resq-sw/ui/badge";
import { Button } from "@resq-sw/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@resq-sw/ui/card";
import { Progress } from "@resq-sw/ui/progress";
import { Separator } from "@resq-sw/ui/separator";
import { Spinner } from "@resq-sw/ui/spinner";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@resq-sw/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@resq-sw/ui/tabs";

// ── @resq-sw/dsa — Distance + PriorityQueue + BloomFilter ─────
import { Distance, BloomFilter, PriorityQueue } from "@resq-sw/dsa";

// ── @resq-sw/helpers — Formatting + type guards ────────────────
import { capitalize, truncate } from "@resq-sw/helpers/formatting";
import { getBrowser, getPlatform } from "@resq-sw/helpers/browser";
import { isNumber } from "@resq-sw/helpers";

// ── @resq-sw/logger — Structured logging ───────────────────────
import { Logger } from "@resq-sw/logger";

// ── @resq-sw/rate-limiting — Throttle refresh actions ──────────
import { throttle } from "@resq-sw/rate-limiting";

// ── @resq-sw/security — Sanitize log display (browser-safe subpath) ─
import { escapeHtml } from "@resq-sw/security/sanitize";

// ── @resq-sw/http — Request tracking (browser-safe subpath) ────
import { getRequestId } from "@resq-sw/http/security";

import { useMemo, useState } from "react";

// ── Logger instance ────────────────────────────────────────────
const logger = Logger.getLogger("[Dashboard]");

// ── Session ID via @resq-sw/http ───────────────────────────────
const sessionId = getRequestId();

// ── HQ coordinates (Oakland Supply Depot) ──────────────────────
const HQ = { lat: 37.8044, lng: -122.2712 };

// ── Fleet data ─────────────────────────────────────────────────
const assets = [
  { id: "DRN-001", name: "Falcon Alpha", battery: 92, status: "active", mission: "Sector 7 sweep", lat: 37.7749, lng: -122.4194 },
  { id: "DRN-002", name: "Falcon Bravo", battery: 64, status: "active", mission: "River crossing reconnaissance", lat: 37.8716, lng: -122.2727 },
  { id: "DRN-003", name: "Hawk Charlie", battery: 18, status: "returning", mission: "RTB — low battery", lat: 37.8044, lng: -122.2712 },
  { id: "DRN-004", name: "Hawk Delta", battery: 100, status: "standby", mission: "Awaiting dispatch", lat: 37.8044, lng: -122.2712 },
  { id: "DRN-005", name: "Eagle Echo", battery: 45, status: "active", mission: "Thermal scan zone 3", lat: 37.7599, lng: -122.4148 },
];

// ── Raw log entries (will be sanitized via @resq-sw/security) ──
const rawLogs = [
  "09:14 — DRN-003 triggered low-battery RTB at 18%",
  "09:10 — DRN-005 began thermal scan of <zone-3>",
  "09:02 — DRN-001 completed waypoint 4/6 in sector 7",
  "08:55 — DRN-002 deployed to river crossing",
  "08:40 — Mission Control started shift rotation B",
];

// ── Throttled refresh via @resq-sw/rate-limiting ───────────────
const throttledRefresh = throttle(() => {
  logger.info("Fleet data refreshed", { sessionId });
}, 2000);

// ── Badge variant helper using @resq-sw/helpers ────────────────
const statusVariant = (s: string) =>
  s === "active" ? "default" as const : s === "returning" ? "destructive" as const : "outline" as const;

export function App() {
  const [tab, setTab] = useState("overview");
  const [refreshCount, setRefreshCount] = useState(0);

  // ── @resq-sw/helpers — type guard ────────────────────────────
  const activeCount = assets.filter((a) => {
    const bat = a.battery;
    return isNumber(bat) && bat > 0 && a.status === "active";
  }).length;

  const avgBattery = Math.round(assets.reduce((s, a) => s + a.battery, 0) / assets.length);

  // ── @resq-sw/dsa — Distance calculations ─────────────────────
  const droneDistances = useMemo(
    () => assets.map((a) => ({
      id: a.id,
      distKm: Distance.haversine(HQ, { lat: a.lat, lng: a.lng }).toFixed(1),
    })),
    [],
  );

  // ── @resq-sw/dsa — PriorityQueue for mission priority ────────
  const missionQueue = useMemo(() => {
    const pq = new PriorityQueue<{ id: string; urgency: number; label: string }>({
      compare: (a, b) => a.urgency - b.urgency,
    });
    pq.enqueue({ id: "DRN-003", urgency: 0, label: "CRITICAL — RTB low battery" });
    pq.enqueue({ id: "DRN-005", urgency: 1, label: "HIGH — Thermal anomaly detected" });
    pq.enqueue({ id: "DRN-001", urgency: 2, label: "MEDIUM — Waypoint check-in" });
    pq.enqueue({ id: "DRN-002", urgency: 3, label: "LOW — Routine recon" });
    const ordered: { id: string; urgency: number; label: string }[] = [];
    while (pq.size > 0) ordered.push(pq.dequeue()!);
    return ordered;
  }, []);

  // ── @resq-sw/dsa — BloomFilter for processed alerts ──────────
  const processedAlerts = useMemo(() => {
    const bf = new BloomFilter({ expectedItems: 100, falsePositiveRate: 0.01 });
    bf.add("DRN-003-LOW-BAT");
    bf.add("DRN-005-THERMAL");
    return bf;
  }, []);

  // ── @resq-sw/security — Sanitize logs for safe display ───────
  const sanitizedLogs = useMemo(() => rawLogs.map((log) => escapeHtml(log)), []);

  // ── @resq-sw/helpers/browser — Platform info ─────────────────
  const platform = useMemo(() => `${capitalize(getPlatform())} / ${capitalize(getBrowser())}`, []);

  const handleRefresh = () => {
    throttledRefresh();
    setRefreshCount((c) => c + 1);
    logger.info("Refresh clicked", { count: refreshCount + 1 });
  };

  return (
    <div className="bg-background text-foreground min-h-screen p-6 md:p-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mission Control</h1>
          <p className="text-muted-foreground text-sm">ResQ Drone Fleet Dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-mono text-xs">{platform}</Badge>
          <Badge variant="default">System Online</Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh}>Refresh</Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground font-mono">
        <span>Session: {truncate(sessionId, 12)}</span>
        <Separator orientation="vertical" className="h-3" />
        <span>Alerts processed: {processedAlerts.has("DRN-003-LOW-BAT") ? "DRN-003" : "—"}, {processedAlerts.has("DRN-005-THERMAL") ? "DRN-005" : "—"}</span>
      </div>

      <Separator className="mb-6" />

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => { setTab(v); logger.debug(`Tab switched to ${v}`); }}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="missions">Missions</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm text-muted-foreground">Fleet Size</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{assets.length}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm text-muted-foreground">Active Missions</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{activeCount}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm text-muted-foreground">Avg Battery</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold mb-2">{avgBattery}%</p>
                <Progress value={avgBattery} />
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader><CardTitle className="text-sm text-muted-foreground">Fleet Battery Levels</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {assets.map((a) => (
                <div key={a.id} className="flex items-center gap-3">
                  <span className="text-xs font-mono w-20 shrink-0">{a.id}</span>
                  <Progress value={a.battery} className="flex-1" />
                  <span className="text-xs text-muted-foreground w-10 text-right">{a.battery}%</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assets — with @resq-sw/dsa Distance */}
        <TabsContent value="assets" className="mt-6">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Battery</TableHead>
                    <TableHead>Dist to HQ</TableHead>
                    <TableHead>Mission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((a) => {
                    const dist = droneDistances.find((d) => d.id === a.id);
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-xs">{a.id}</TableCell>
                        <TableCell>{a.name}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(a.status)}>{capitalize(a.status)}</Badge>
                        </TableCell>
                        <TableCell>{a.battery}%</TableCell>
                        <TableCell className="font-mono text-xs">{dist?.distKm} km</TableCell>
                        <TableCell className="text-muted-foreground">{truncate(a.mission, 24)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Missions — @resq-sw/dsa PriorityQueue */}
        <TabsContent value="missions" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-sm text-muted-foreground">Mission Priority Queue</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {missionQueue.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3 text-sm">
                  <span className="text-xs font-mono text-muted-foreground w-6">{i + 1}.</span>
                  <Badge variant={m.urgency === 0 ? "destructive" : m.urgency === 1 ? "default" : "outline"} className="w-20 justify-center">
                    {m.urgency === 0 ? "CRIT" : m.urgency === 1 ? "HIGH" : m.urgency === 2 ? "MED" : "LOW"}
                  </Badge>
                  <span className="font-mono text-xs">{m.id}</span>
                  <span className="text-muted-foreground">{m.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs — sanitized via @resq-sw/security */}
        <TabsContent value="logs" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Spinner className="size-4" />
              <CardTitle className="text-sm text-muted-foreground">Live Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm font-mono">
                {sanitizedLogs.map((log, i) => (
                  <li key={i} className="text-muted-foreground">{log}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
