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
 * @fileoverview Hand-driven transports for the example.
 *
 * Neither `TelemetrySocket` nor `MqttTelemetrySource` constructs its own
 * connection: both take a factory. That is not a testing affordance bolted on
 * afterwards — it is why the package has zero runtime dependencies, and it is
 * what lets this example run the real client against a scripted peer with no
 * server, no network and no flake.
 *
 * Omitting `connect` on `TelemetrySocket` falls back to the global `WebSocket`,
 * which EXISTS under Bun and Node >= 22 — so an example that leaves it out does
 * not sit inert, it dials a fake URL and reconnects forever. Always inject.
 */

import type { MqttClientLike, MqttPayload, WebSocketLike } from "@resq-systems/telemetry";

/** `WebSocket.CONNECTING`. */
const WS_CONNECTING = 0;
/** `WebSocket.OPEN` — the only value `send()` treats as writable. */
const WS_OPEN = 1;
/** `WebSocket.CLOSED`. */
const WS_CLOSED = 3;

/** A {@link WebSocketLike} whose lifecycle the caller drives by hand. */
export class ReplaySocket implements WebSocketLike {
	readyState: number = WS_CONNECTING;
	onopen: ((event: unknown) => void) | null = null;
	onmessage: ((event: { data: unknown }) => void) | null = null;
	onclose: ((event: unknown) => void) | null = null;
	onerror: ((event: unknown) => void) | null = null;

	/** Everything the console wrote to us, so the handshake can be inspected. */
	readonly sent: string[] = [];

	send(data: string): void {
		this.sent.push(data);
	}

	close(): void {
		if (this.readyState === WS_CLOSED) return;
		this.readyState = WS_CLOSED;
		this.onclose?.(null);
	}

	/** Complete the handshake, which is what makes the socket writable. */
	open(): void {
		this.readyState = WS_OPEN;
		this.onopen?.(null);
	}

	/** Deliver one text frame to every consumer. */
	deliver(frame: string): void {
		if (this.readyState !== WS_OPEN) return;
		this.onmessage?.({ data: frame });
	}
}

/** A scripted MQTT broker plus the handle used to drive it. */
export interface ReplayBroker {
	/** Hand this to `MqttTelemetrySource`'s `connect` option. */
	readonly client: MqttClientLike;
	/** Fire the client's `connect` event. */
	announceConnect(): void;
	/** Publish a message from the broker side. */
	deliver(topic: string, payload: MqttPayload): void;
	/** Filters the source has subscribed on our behalf. */
	readonly subscribed: ReadonlySet<string>;
	/** Everything the console published. */
	readonly published: readonly { readonly topic: string; readonly payload: string }[];
}

/**
 * A broker that records what was subscribed and replays what you tell it to.
 *
 * Note it never raises `reconnect` or `error`: the real client owns reconnection
 * (re-implementing it inside the source would mean two schedulers fighting over
 * one connection), and this fake has nothing to recover from.
 */
export function createReplayBroker(): ReplayBroker {
	const connectHandlers = new Set<() => void>();
	const closeHandlers = new Set<() => void>();
	const messageHandlers = new Set<(topic: string, payload: MqttPayload) => void>();
	const subscribed = new Set<string>();
	const published: { topic: string; payload: string }[] = [];

	type AnyHandler =
		| (() => void)
		| ((error: unknown) => void)
		| ((topic: string, payload: MqttPayload) => void);

	function on(event: "connect" | "reconnect" | "close", handler: () => void): void;
	function on(event: "error", handler: (error: unknown) => void): void;
	function on(event: "message", handler: (topic: string, payload: MqttPayload) => void): void;
	function on(event: string, handler: AnyHandler): void {
		if (event === "connect") connectHandlers.add(handler as () => void);
		else if (event === "close") closeHandlers.add(handler as () => void);
		else if (event === "message") {
			messageHandlers.add(handler as (topic: string, payload: MqttPayload) => void);
		}
	}

	const client: MqttClientLike = {
		end: () => {
			for (const handler of closeHandlers) handler();
		},
		on,
		publish: (topic, payload) => {
			published.push({ payload, topic });
		},
		subscribe: (topic) => {
			subscribed.add(topic);
		},
		unsubscribe: (topic) => {
			subscribed.delete(topic);
		},
	};

	return {
		announceConnect: () => {
			for (const handler of connectHandlers) handler();
		},
		client,
		deliver: (topic, payload) => {
			for (const handler of messageHandlers) handler(topic, payload);
		},
		published,
		subscribed,
	};
}
