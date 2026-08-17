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

import "@resq-systems/ui/styles/globals.css";

// ── @resq-systems/ui — Component library ────────────────────────────
import { Badge } from "@resq-systems/ui/badge";
import { Button } from "@resq-systems/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@resq-systems/ui/card";
import { Progress } from "@resq-systems/ui/progress";
import { Separator } from "@resq-systems/ui/separator";
import { Spinner } from "@resq-systems/ui/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@resq-systems/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@resq-systems/ui/tabs";

// ── @resq-systems/dsa — Distance + PriorityQueue + BloomFilter ─────
import {
	BloomFilter,
	Distance,
	PriorityQueue,
	toLatitude,
	toLongitude,
	toProbability,
} from "@resq-systems/dsa";

// ── @resq-systems/helpers — Formatting + type guards ────────────────
import { capitalize, truncate } from "@resq-systems/helpers/formatting";
import { getBrowser, getPlatform } from "@resq-systems/helpers/browser";
import { isNumber } from "@resq-systems/helpers";

// ── @resq-systems/logger — Structured logging ───────────────────────
import { Logger } from "@resq-systems/logger";

// ── @resq-systems/rate-limiting — Throttle refresh actions ──────────
import { throttle } from "@resq-systems/rate-limiting";

// ── @resq-systems/security — Sanitize log display (browser-safe subpath) ─
import { escapeHtml } from "@resq-systems/security/sanitize";

// ── @resq-systems/http — Request tracking (browser-safe subpath) ────
import { getRequestId } from "@resq-systems/http/security";

// ── @resq-systems/analytics — Typed product analytics ───────────────
import { initAnalytics, pageview, track } from "@resq-systems/analytics";

// ── @resq-systems/constants — Shared oklch design tokens ────────────
import { colors, radii } from "@resq-systems/constants";

// ── @resq-systems/types — Total orderings that interop with dsa ─────
import { mapInput, orderNumber } from "@resq-systems/types/order";

import { useEffect, useMemo, useState } from "react";

// @resq-systems/analytics — augment the event registry once per app so
// `track()` names + payloads are type-checked. `track("fleet_refreshed", { count })`
// compiles; a typo'd name or a wrong-shaped payload does not.
declare module "@resq-systems/analytics" {
	interface AnalyticsEvents {
		fleet_refreshed: { count: number };
	}
}

// Disabled in the example (no PostHog/GA4 keys), so every `track()` / `pageview()`
// below is a safe no-op. Set `disabled: false` + pass a provider config to send.
void initAnalytics({ disabled: true });

// ── Logger instance ────────────────────────────────────────────
const logger = Logger.getLogger("[Dashboard]");

// ── Session ID via @resq-systems/http ───────────────────────────────
const sessionId = getRequestId();

// ── HQ coordinates (Oakland Supply Depot) ──────────────────────
const HQ = { lat: toLatitude(37.8044), lng: toLongitude(-122.2712) };

// ── Fleet data ─────────────────────────────────────────────────
const assets = [
	{
		id: "DRN-001",
		name: "Falcon Alpha",
		battery: 92,
		status: "active",
		mission: "Sector 7 sweep",
		lat: 37.7749,
		lng: -122.4194,
	},
	{
		id: "DRN-002",
		name: "Falcon Bravo",
		battery: 64,
		status: "active",
		mission: "River crossing reconnaissance",
		lat: 37.8716,
		lng: -122.2727,
	},
	{
		id: "DRN-003",
		name: "Hawk Charlie",
		battery: 18,
		status: "returning",
		mission: "RTB — low battery",
		lat: 37.8044,
		lng: -122.2712,
	},
	{
		id: "DRN-004",
		name: "Hawk Delta",
		battery: 100,
		status: "standby",
		mission: "Awaiting dispatch",
		lat: 37.8044,
		lng: -122.2712,
	},
	{
		id: "DRN-005",
		name: "Eagle Echo",
		battery: 45,
		status: "active",
		mission: "Thermal scan zone 3",
		lat: 37.7599,
		lng: -122.4148,
	},
];

// ── Raw log entries (will be sanitized via @resq-systems/security) ──
const rawLogs = [
	"09:14 — DRN-003 triggered low-battery RTB at 18%",
	"09:10 — DRN-005 began thermal scan of <zone-3>",
	"09:02 — DRN-001 completed waypoint 4/6 in sector 7",
	"08:55 — DRN-002 deployed to river crossing",
	"08:40 — Mission Control started shift rotation B",
];

// ── Throttled refresh via @resq-systems/rate-limiting ───────────────
const throttledRefresh = throttle(() => {
	logger.info("Fleet data refreshed", { sessionId });
}, 2000);

// ── Badge variant helper using @resq-systems/helpers ────────────────
const statusVariant = (s: string) =>
	s === "active"
		? ("default" as const)
		: s === "returning"
			? ("destructive" as const)
			: ("outline" as const);

export function App() {
	const [tab, setTab] = useState("overview");
	const [refreshCount, setRefreshCount] = useState(0);

	// @resq-systems/analytics — record a page view on mount (no-op while disabled).
	useEffect(() => {
		pageview();
	}, []);

	// ── @resq-systems/helpers — type guard ────────────────────────────
	const activeCount = assets.filter((a) => {
		const bat = a.battery;
		return isNumber(bat) && bat > 0 && a.status === "active";
	}).length;

	const avgBattery = Math.round(assets.reduce((s, a) => s + a.battery, 0) / assets.length);

	// ── @resq-systems/dsa — Distance calculations ─────────────────────
	const droneDistances = useMemo(
		() =>
			assets.map((a) => ({
				id: a.id,
				distKm: Distance.haversine(HQ, { lat: toLatitude(a.lat), lng: toLongitude(a.lng) }).toFixed(
					1,
				),
			})),
		[],
	);

	// ── @resq-systems/dsa — PriorityQueue for mission priority ────────
	const missionQueue = useMemo(() => {
		// @resq-systems/types — `Order<A>` is `(a, b) => -1 | 0 | 1` and dsa's
		// `CompareFn<T>` is `(a, b) => number`, so an Order drops straight into
		// PriorityQueue with no dependency edge from dsa to types. dsa is
		// zero-runtime-dep and has to stay that way; the two interoperate structurally.
		//
		// `a.urgency - b.urgency` also works, and is exactly why `fromCompare` exists:
		// subtraction yields NaN the moment a field is missing or non-numeric, and every
		// comparison against NaN is false, so the heap mis-orders silently.
		// `mapInput(orderNumber, …)` cannot produce NaN.
		const byUrgency = mapInput(orderNumber, (m: { urgency: number }) => m.urgency);
		const pq = new PriorityQueue<{ id: string; urgency: number; label: string }>({
			compareFn: byUrgency,
		});
		pq.enqueue({ id: "DRN-003", urgency: 0, label: "CRITICAL — RTB low battery" });
		pq.enqueue({ id: "DRN-005", urgency: 1, label: "HIGH — Thermal anomaly detected" });
		pq.enqueue({ id: "DRN-001", urgency: 2, label: "MEDIUM — Waypoint check-in" });
		pq.enqueue({ id: "DRN-002", urgency: 3, label: "LOW — Routine recon" });
		const ordered: { id: string; urgency: number; label: string }[] = [];
		while (pq.size > 0) ordered.push(pq.dequeue()!);
		return ordered;
	}, []);

	// ── @resq-systems/dsa — BloomFilter for processed alerts ──────────
	const processedAlerts = useMemo(() => {
		const bf = new BloomFilter(100, toProbability(0.01));
		bf.add("DRN-003-LOW-BAT");
		bf.add("DRN-005-THERMAL");
		return bf;
	}, []);

	// ── @resq-systems/security — Sanitize logs for safe display ───────
	const sanitizedLogs = useMemo(() => rawLogs.map((log) => escapeHtml(log)), []);

	// ── @resq-systems/helpers/browser — Platform info ─────────────────
	const platform = useMemo(() => `${capitalize(getPlatform())} / ${capitalize(getBrowser())}`, []);

	const handleRefresh = () => {
		throttledRefresh();
		setRefreshCount((c) => c + 1);
		// @resq-systems/analytics — type-checked against the AnalyticsEvents registry.
		track("fleet_refreshed", { count: assets.length });
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
					<Badge variant="outline" className="font-mono text-xs">
						{platform}
					</Badge>
					{/* @resq-systems/constants — design tokens drive this status dot */}
					<span
						aria-hidden
						style={{
							width: 8,
							height: 8,
							borderRadius: radii.full,
							backgroundColor: colors.hex.success,
						}}
					/>
					<Badge variant="default">System Online</Badge>
					<Button variant="outline" size="sm" onClick={handleRefresh}>
						Refresh
					</Button>
				</div>
			</div>

			<div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground font-mono">
				<span>Session: {truncate(sessionId, 12)}</span>
				<Separator orientation="vertical" className="h-3" />
				<span>
					Alerts processed: {processedAlerts.has("DRN-003-LOW-BAT") ? "DRN-003" : "—"},{" "}
					{processedAlerts.has("DRN-005-THERMAL") ? "DRN-005" : "—"}
				</span>
			</div>

			<Separator className="mb-6" />

			{/* Tabs */}
			<Tabs
				value={tab}
				onValueChange={(v) => {
					setTab(v);
					logger.debug(`Tab switched to ${v}`);
				}}
			>
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
							<CardHeader>
								<CardTitle className="text-sm text-muted-foreground">Fleet Size</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-3xl font-bold">{assets.length}</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle className="text-sm text-muted-foreground">Active Missions</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-3xl font-bold">{activeCount}</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle className="text-sm text-muted-foreground">Avg Battery</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-3xl font-bold mb-2">{avgBattery}%</p>
								<Progress value={avgBattery} />
							</CardContent>
						</Card>
					</div>

					<Card className="mt-6">
						<CardHeader>
							<CardTitle className="text-sm text-muted-foreground">Fleet Battery Levels</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							{assets.map((a) => (
								<div key={a.id} className="flex items-center gap-3">
									<span className="text-xs font-mono w-20 shrink-0">{a.id}</span>
									<Progress value={a.battery} className="flex-1" />
									<span className="text-xs text-muted-foreground w-10 text-right">
										{a.battery}%
									</span>
								</div>
							))}
						</CardContent>
					</Card>
				</TabsContent>

				{/* Assets — with @resq-systems/dsa Distance */}
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
												<TableCell className="text-muted-foreground">
													{truncate(a.mission, 24)}
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Missions — @resq-systems/dsa PriorityQueue */}
				<TabsContent value="missions" className="mt-6">
					<Card>
						<CardHeader>
							<CardTitle className="text-sm text-muted-foreground">
								Mission Priority Queue
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							{missionQueue.map((m, i) => (
								<div key={m.id} className="flex items-center gap-3 text-sm">
									<span className="text-xs font-mono text-muted-foreground w-6">{i + 1}.</span>
									<Badge
										variant={
											m.urgency === 0 ? "destructive" : m.urgency === 1 ? "default" : "outline"
										}
										className="w-20 justify-center"
									>
										{m.urgency === 0
											? "CRIT"
											: m.urgency === 1
												? "HIGH"
												: m.urgency === 2
													? "MED"
													: "LOW"}
									</Badge>
									<span className="font-mono text-xs">{m.id}</span>
									<span className="text-muted-foreground">{m.label}</span>
								</div>
							))}
						</CardContent>
					</Card>
				</TabsContent>

				{/* Logs — sanitized via @resq-systems/security */}
				<TabsContent value="logs" className="mt-6">
					<Card>
						<CardHeader className="flex flex-row items-center gap-2">
							<Spinner className="size-4" />
							<CardTitle className="text-sm text-muted-foreground">Live Feed</CardTitle>
						</CardHeader>
						<CardContent>
							<ul className="space-y-2 text-sm font-mono">
								{sanitizedLogs.map((log, i) => (
									<li key={i} className="text-muted-foreground">
										{log}
									</li>
								))}
							</ul>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
