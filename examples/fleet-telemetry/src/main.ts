/**
 * Copyright 2026 ResQ Systems, Inc.
 * SPDX-License-Identifier: Apache-2.0
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
 * Fleet telemetry ingest — @resq-systems/telemetry feeding @resq-systems/map.
 *
 * The whole path from a socket frame to something a map can draw, with no server
 * and no browser:
 *
 *   wire text ──▶ TelemetrySocket ──▶ coalescer ──▶ parseAssetFrame ──▶ Asset
 *                                                └▶ reduce ──▶ trail ──▶ toTrackGeoJSON
 *
 * Three design decisions make that runnable here, and they are the reason this
 * example exists:
 *
 *   1. BOTH TRANSPORTS ARE INJECTED. `TelemetrySocket` and `MqttTelemetrySource`
 *      take a factory, so a scripted peer substitutes for a broker. This is also
 *      why the package has zero runtime dependencies.
 *   2. COALESCING IS SCHEDULER-INJECTED. Pass a `FlushScheduler` and the 50 Hz
 *      fold becomes a function call instead of an animation frame.
 *   3. THE PARSERS ARE PURE. `parseAssetFrame` and `toTrackGeoJSON` are plain
 *      functions over data, so the data path is testable without a map.
 *
 * NOT covered here, deliberately: the React half — `TelemetryProvider`,
 * `useTelemetry`, `useCoalescedChannel` from `@resq-systems/telemetry/react`, and
 * `<TelemetryMap>` / `<AssetMarker>` / `<TrackLayer>` / `useAssetPositions` from
 * `@resq-systems/map`. Those need a DOM and a WebGL context; everything below is
 * the layer underneath them, which is where the behaviour worth learning lives.
 *
 * Run:  bun --filter example-fleet-telemetry start
 */

import {
	type Asset,
	DEFAULT_MAP_STYLE_URL,
	type LngLat,
	parseAssetFrame,
	resolveMapStyle,
	toTrackGeoJSON,
} from "@resq-systems/map";
import {
	type CoalescedSnapshot,
	type ConnectionState,
	type FlushScheduler,
	MqttTelemetrySource,
	TelemetrySocket,
	createBackoff,
	createCoalescer,
	createReconnectTimer,
	topicMatches,
} from "@resq-systems/telemetry";
import { ReplaySocket, createReplayBroker } from "./fake-transport";
import { burstFrames, edgeFrames, goodFrames, pacificTransit } from "./frames";

const rule = (title: string): void => {
	console.log(`\n── ${title} ${"─".repeat(Math.max(0, 68 - title.length))}\n`);
};

// ══════════════════════════════════════════════════════════════════════
// 1. BACKOFF — pure math, no timers
// ══════════════════════════════════════════════════════════════════════

rule("1. Reconnect schedule");

// `createBackoff` holds no timer and touches no clock, so the schedule a console
// will follow after a dropout can be read off before anything drops.
const backoff = createBackoff();
const ladder = Array.from({ length: 6 }, () => backoff.nextDelayMs());
console.log(`  delays (ms) : ${ladder.join(", ")}`);
console.log(`  attempts    : ${backoff.attempts()}`);
console.log(`  peek next   : ${backoff.peekDelayMs()} ms  (capped; it never gives up)`);

// A successful open resets the ladder. Forgetting this is how a link that flaps
// once an hour ends up waiting 30 s to recover from the next blip.
backoff.reset();
console.log(`  after reset : ${backoff.peekDelayMs()} ms`);

// `createReconnectTimer` binds that schedule to a single pending `setTimeout`, so
// a burst of close events cannot arm five overlapping reconnects.
const timer = createReconnectTimer(() => console.log("  (reconnect would fire here)"));
const armedFor = timer.schedule();
console.log(`  armed for   : ${armedFor} ms, pending=${timer.pending()}`);
timer.cancel();
console.log(`  cancelled   : pending=${timer.pending()}`);

// ══════════════════════════════════════════════════════════════════════
// 2. THE SOCKET — one owner, many consumers, a scripted peer
// ══════════════════════════════════════════════════════════════════════

rule("2. TelemetrySocket against a scripted peer");

const peer = new ReplaySocket();
const socket = new TelemetrySocket({
	// Inject the transport. Omitting this takes the global `WebSocket`, which
	// exists under Bun — the example would quietly dial a fake host forever.
	connect: () => peer,
	url: "wss://fleet.example/fleet/ws",
});

const states: ConnectionState[] = [];
const received: string[] = [];

const unsubscribe = socket.subscribe({
	onClose: () => console.log("  consumer saw: close"),
	onMessage: (raw) => received.push(raw),
	// Fired on EVERY open, including reconnects, which is where a channel
	// handshake belongs — sending it once at startup loses it on the first drop.
	onOpen: () => void socket.send("subscribe:fleet"),
	onStateChange: (state) => states.push(state),
});

// Sending before the handshake is a documented no-op, not an error: the caller
// gets `false` and decides, rather than having a frame swallowed or thrown.
console.log(`  send() while idle   : ${socket.send("too early")}`);

socket.connect();
peer.open();
console.log(`  send() while open   : ${socket.send("ping")}`);

for (const frame of goodFrames) peer.deliver(frame);

// Open-replay: a consumer that attaches after the socket is already up still gets
// its `onOpen`, so a panel mounted late re-issues its handshake like everyone else.
let lateGotOpen = false;
const unsubscribeLate = socket.subscribe({
	onOpen: () => {
		lateGotOpen = true;
	},
});

console.log(`  states              : ${states.join(" → ")}`);
console.log(`  frames received     : ${received.length}`);
console.log(`  peer saw            : ${peer.sent.join(", ")}`);
console.log(`  late subscriber open: ${lateGotOpen}`);

// ══════════════════════════════════════════════════════════════════════
// 3. FRAMES → ASSETS — where map refuses
// ══════════════════════════════════════════════════════════════════════

rule("3. parseAssetFrame");

const assets: Asset[] = [];
for (const raw of received) {
	const asset = parseAssetFrame(raw);
	if (asset !== null) assets.push(asset);
}

for (const asset of assets) {
	// Heading prints as `absent` rather than `0` when the frame carried none. That
	// distinction is the point: 0 is a real bearing, and a marker drawn from it
	// points confidently due north on evidence nobody ever collected.
	const heading = asset.heading === undefined ? "absent" : `${asset.heading.toFixed(0)}°`;
	console.log(
		`  ${asset.id.padEnd(8)} ${asset.latitude.toFixed(4)}, ${asset.longitude.toFixed(4)}` +
			`   heading ${heading.padStart(7)}   battery ${asset.battery ?? "—"}`,
	);
}

// DRN-011 reported `heading_deg: 411`, which comes back as 51 — normalised into
// [0, 360) by @resq-systems/nav, which map depends on for exactly this.
// GND-02 arrived with the `asset_id` / `latitude` / `longitude` aliases instead.

console.log("\n  Frames it declines:\n");
for (const { raw, why } of edgeFrames) {
	const parsed = parseAssetFrame(raw);
	const verdict = parsed === null ? "null" : `${parsed.id} (heading ${parsed.heading ?? "absent"})`;
	console.log(`  ${verdict.padEnd(26)} ← ${why}`);
}

// ══════════════════════════════════════════════════════════════════════
// 4. COALESCING — decouple render rate from talk rate
// ══════════════════════════════════════════════════════════════════════

rule("4. Folding a 50 Hz burst");

// Injecting the scheduler turns "one publish per animation frame" into "one
// publish per `tick()`", which is what makes this deterministic in a console.
let pendingFlush: (() => void) | null = null;
const manualScheduler: FlushScheduler = (flush) => {
	pendingFlush = flush;
	return () => {
		pendingFlush = null;
	};
};
const tick = (): void => {
	const run = pendingFlush;
	pendingFlush = null;
	run?.();
};

let latest: CoalescedSnapshot<Asset> | undefined;
const live = createCoalescer<Asset>({
	onFlush: (snapshot) => {
		latest = snapshot;
	},
	schedule: manualScheduler,
	// A `TelemetrySocket` is ONE undifferentiated stream — there is no `topic`
	// option on a subscription. Per-channel filtering happens right here, by
	// returning `undefined`; that is also how a malformed payload is dropped
	// instead of propagated to a renderer.
	select: (raw) => {
		const asset = parseAssetFrame(raw);
		return asset !== null && asset.id === "DRN-004" ? asset : undefined;
	},
});

for (const frame of burstFrames) live.push(frame);
live.push('{"drone_id":"DRN-011","lat":37.7749,"lon":-122.4194}');
live.push("}{ not json");
tick();

console.log(`  received  : ${latest?.received}   (frames this channel accepted)`);
console.log(`  coalesced : ${latest?.coalesced}   (folded away before any render)`);
console.log(`  published : ${latest?.value.id} at ${latest?.value.latitude.toFixed(4)}`);
console.log("  the DRN-011 frame and the junk never reached `received` — select said no");

// Dropping intermediate frames is the POINT for a latest-wins readout. When every
// sample matters — a chart, a fault counter — pass `reduce` and accumulate instead.
const trail: LngLat[] = [];
const breadcrumbs = createCoalescer<readonly LngLat[]>({
	onFlush: ({ value }) => {
		trail.length = 0;
		trail.push(...value);
	},
	reduce: (previous, next) => [...(previous ?? []), ...next].slice(-600),
	schedule: manualScheduler,
	select: (raw) => {
		const asset = parseAssetFrame(raw);
		if (asset === null || asset.id !== "DRN-004") return undefined;
		return [{ latitude: asset.latitude, longitude: asset.longitude }];
	},
});
for (const frame of burstFrames) breadcrumbs.push(frame);
tick();
console.log(`  trail     : ${trail.length} fixes kept by the accumulating reducer`);

live.dispose();
breadcrumbs.dispose();

// ══════════════════════════════════════════════════════════════════════
// 5. THE TRACK — GeoJSON a <Source> can take verbatim
// ══════════════════════════════════════════════════════════════════════

rule("5. toTrackGeoJSON");

const track = toTrackGeoJSON(trail);
console.log(`  features  : ${track.features.length}`);
console.log(`  points    : ${track.features[0]?.geometry.coordinates.length ?? 0}`);

// A track that crosses the antimeridian is emitted as SEVERAL LineStrings. One
// feature would have to step from +179 to -179, which a renderer draws as a line
// back across the entire globe — the track appears to teleport. The split closes
// one line exactly on the dateline and reopens it on the far side at the same
// interpolated latitude, so neither half is left as a single unusable point.
const crossing = toTrackGeoJSON(pacificTransit);
console.log(
	`\n  Pacific transit, ${pacificTransit.length} fixes → ${crossing.features.length} features`,
);
for (const [index, feature] of crossing.features.entries()) {
	const line = feature.geometry.coordinates;
	const first = line.at(0);
	const last = line.at(-1);
	console.log(
		`    segment ${index + 1}: ${line.length} pts   ` +
			`${first?.[0]?.toFixed(1)} → ${last?.[0]?.toFixed(1)} lon`,
	);
}

// Fewer than two valid points is not a line, so it is an empty collection rather
// than a degenerate feature. Positions that are not real points on Earth are dropped.
const degenerate = toTrackGeoJSON([{ latitude: 37.8, longitude: -122.4 }]);
console.log(`  single fix → ${degenerate.features.length} features`);

// ══════════════════════════════════════════════════════════════════════
// 6. MQTT — when identity lives in the topic, not the payload
// ══════════════════════════════════════════════════════════════════════

rule("6. MqttTelemetrySource");

// Under VDA5050 a vehicle is addressed as
// `<interface>/v<major>/<manufacturer>/<serial>/<topic>`, so consumers need topic
// filters rather than a merged stream. `topicMatches` is MQTT 3.1.1 §4.7, exported
// on its own because routing decisions are worth testing without a broker.
const filters: readonly (readonly [string, string])[] = [
	["uagv/v2/resq/+/state", "uagv/v2/resq/AGV-7/state"],
	["uagv/v2/resq/+/state", "uagv/v2/resq/AGV-7/connection"],
	["sport/#", "sport"],
	["#", "$SYS/broker/uptime"],
	["uagv/#/state", "uagv/v2/state"],
];
for (const [filter, topic] of filters) {
	console.log(`  ${topicMatches(filter, topic) ? "match  " : "no     "} ${filter}  ←  ${topic}`);
}
// `#` misses `$SYS/...` on purpose — a blanket subscription should not drag broker
// internals into a fleet console. A non-terminal `#` is malformed and matches nothing.

const broker = createReplayBroker();
const source = new MqttTelemetrySource({
	connect: () => broker.client,
	// Subscribed on every connect whether or not anyone is listening yet.
	topics: ["uagv/v2/resq/+/connection"],
	url: "wss://broker.example:8084/mqtt",
});

const byTopic: string[] = [];
const unsubscribeMqtt = source.subscribe({
	onMessage: (topic, data) => byTopic.push(`${topic} → ${parseAssetFrame(data)?.id ?? "unparsed"}`),
	topic: "uagv/v2/resq/+/state",
});

source.connect();
broker.announceConnect();
broker.deliver("uagv/v2/resq/AGV-7/state", '{"asset_id":"AGV-7","lat":37.79,"lon":-122.39}');
broker.deliver("uagv/v2/resq/AGV-7/connection", '{"asset_id":"AGV-7","state":"ONLINE"}');

console.log(`\n  subscribed  : ${[...broker.subscribed].join(", ")}`);
console.log(`  delivered   : ${byTopic.join(" | ")}`);
console.log(`  publish()   : ${source.publish("uagv/v2/resq/AGV-7/order", '{"orderId":"A-18"}')}`);
console.log(`  broker got  : ${broker.published.map((item) => item.topic).join(", ")}`);
// The `connection` message was re-checked locally against the filter and dropped,
// even though the broker was willing to hand it over.

// ══════════════════════════════════════════════════════════════════════
// 7. THE BASEMAP, AND SHUTDOWN
// ══════════════════════════════════════════════════════════════════════

rule("7. Style resolution");

// Token-free by default, overridable per deployment — and the override is an
// ARGUMENT, so the package never reaches for anyone's `process.env`.
console.log(`  default       : ${DEFAULT_MAP_STYLE_URL}`);
console.log(
	`  blank override: ${resolveMapStyle("   ") === DEFAULT_MAP_STYLE_URL ? "ignored" : "used"}`,
);
console.log(`  real override : ${resolveMapStyle("https://tiles.internal/dark.json")}`);

unsubscribeLate();
unsubscribe();
unsubscribeMqtt();
// Closing through the client is intentional: `close()` marks the shutdown as
// deliberate so the reconnect ladder does not arm itself on the way out.
socket.close();
source.close();
console.log(`\n  socket state : ${socket.state}`);
console.log(`  mqtt state   : ${source.state}\n`);
