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
 * @fileoverview MqttTelemetrySource — the topic-addressed sibling of
 * {@link module:@resq-systems/telemetry/socket|TelemetrySocket}.
 *
 * `TelemetrySocket` models one undifferentiated frame stream, which is the right
 * shape for a bespoke `/fleet/ws` endpoint. It is the wrong shape for MQTT-based
 * fleets: under VDA5050 the vehicle identity lives in the **topic**
 * (`<interface>/v<major>/<manufacturer>/<serial>/<topic>`), not in the payload,
 * so consumers need to address traffic by topic filter rather than sift a merged
 * stream.
 *
 * Two deliberate constraints:
 *
 * 1. **The client is injected, never bundled.** The package has zero runtime
 *    dependencies and keeps them; callers bring their own MQTT implementation
 *    (`mqtt.js` over WebSocket in a browser, or anything satisfying
 *    {@link MqttClientLike}). This mirrors how `TelemetrySocket` accepts a
 *    `WebSocketFactory`.
 * 2. **The client owns reconnection.** Every real MQTT client already implements
 *    backoff and resubscription; re-implementing it here would mean two
 *    schedulers fighting over one connection. This class maps the client's
 *    lifecycle onto {@link ConnectionState}, re-subscribes every known filter on
 *    each reconnect, and replays `onOpen` to late subscribers.
 *
 * Payloads are decoded to strings and passed through untouched — parsing belongs
 * to the consumer, and vehicle-domain schemas never enter this package.
 *
 * @module @resq-systems/telemetry/mqtt
 */

import { topicMatches } from "./topic-filter.js";
import type { ConnectionState } from "./types.js";

//#region Types

/** Payload shapes an MQTT client may hand us. */
export type MqttPayload = string | Uint8Array;

/**
 * The minimal MQTT client surface this source depends on. `mqtt.js`'s client
 * satisfies it structurally.
 */
export interface MqttClientLike {
	on(event: "connect" | "reconnect" | "close", handler: () => void): void;
	on(event: "error", handler: (error: unknown) => void): void;
	on(event: "message", handler: (topic: string, payload: MqttPayload) => void): void;
	subscribe(topic: string): void;
	unsubscribe(topic: string): void;
	publish(topic: string, payload: string): void;
	end(force?: boolean): void;
}

/** Creates a client for a broker URL — inject one for Node, a browser, or tests. */
export type MqttClientFactory = (url: string) => MqttClientLike;

/** A consumer attached to the shared MQTT connection. */
export interface MqttSubscription {
	/**
	 * Topic filter to receive, supporting `+` and `#`. The filter is subscribed
	 * on the broker and re-checked locally on delivery. Omit to receive every
	 * message the source already sees, without subscribing anything new.
	 */
	topic?: string;
	/** A message on a matching topic; `data` is the decoded payload. */
	onMessage?(topic: string, data: string): void;
	/**
	 * Fired on every connect — including immediately at subscribe time when the
	 * connection is already up — so consumers can (re)issue handshakes.
	 */
	onOpen?(): void;
	/** Fired when the connection drops, before any reconnect. */
	onClose?(): void;
	/** Fired whenever the connection state changes. */
	onStateChange?(state: ConnectionState): void;
}

export interface MqttTelemetrySourceOptions {
	/** Broker URL, e.g. `wss://broker.example.com:8084/mqtt`. */
	url: string;
	/** Client factory. Required — there is no global MQTT implementation. */
	connect: MqttClientFactory;
	/** Topic filters subscribed on every connect, regardless of subscribers. */
	topics?: readonly string[];
}

//#endregion

//#region Payload decoding

/** Lazily created, then reused: constructing a decoder per message is wasteful. */
let sharedDecoder: TextDecoder | null = null;

/** Decode an MQTT payload to a string without assuming a runtime. */
function decodePayload(payload: MqttPayload): string {
	if (typeof payload === "string") return payload;
	if (typeof TextDecoder === "undefined") return String(payload);
	sharedDecoder ??= new TextDecoder();
	return sharedDecoder.decode(payload);
}

//#endregion

//#region Source

/**
 * A topic-addressed MQTT telemetry source shared by many consumers.
 *
 * @example
 * ```ts
 * import mqtt from "mqtt";
 *
 * const source = new MqttTelemetrySource({
 *   url: "wss://broker.example.com:8084/mqtt",
 *   connect: (url) => mqtt.connect(url) as unknown as MqttClientLike,
 * });
 *
 * const off = source.subscribe({
 *   topic: "uagv/v2/resq/+/state",
 *   onMessage: (topic, data) => update(topic, JSON.parse(data)),
 * });
 *
 * source.connect();
 * // later: off(); source.close();
 * ```
 */
export class MqttTelemetrySource {
	readonly #url: string;
	readonly #factory: MqttClientFactory;
	readonly #staticTopics: readonly string[];
	readonly #subscribers = new Set<MqttSubscription>();
	/** Subscriber topic filters, reference-counted so unsubscribe is safe. */
	readonly #filters = new Map<string, number>();
	#client: MqttClientLike | null = null;
	#state: ConnectionState = "idle";
	#closedByUser = false;

	constructor(options: Readonly<MqttTelemetrySourceOptions>) {
		this.#url = options.url;
		this.#factory = options.connect;
		this.#staticTopics = options.topics ?? [];
	}

	/** Current connection state. */
	get state(): ConnectionState {
		return this.#state;
	}

	/** Whether the connection is currently up. */
	get connected(): boolean {
		return this.#state === "open";
	}

	/** Open the connection (idempotent while already connecting/open). */
	connect(): this {
		this.#closedByUser = false;
		if (this.#state === "idle" || this.#state === "closed") {
			this.#open();
		}
		return this;
	}

	/** Close intentionally and stop reconnecting. */
	close(): void {
		this.#closedByUser = true;
		const client = this.#client;
		this.#client = null;
		if (client) client.end(true);
		this.#setState("closed");
	}

	/** Publish a message; returns `false` (no-op) when not connected. */
	publish(topic: string, message: string): boolean {
		const client = this.#client;
		if (client === null || this.#state !== "open") return false;
		client.publish(topic, message);
		return true;
	}

	/** Attach a consumer. Returns an unsubscribe function. */
	subscribe(subscription: MqttSubscription): () => void {
		this.#subscribers.add(subscription);

		const filter = subscription.topic;
		if (filter !== undefined) {
			const count = this.#filters.get(filter) ?? 0;
			this.#filters.set(filter, count + 1);
			// Only the first subscriber for a filter needs a broker subscription.
			if (count === 0 && this.#client !== null && this.#state === "open") {
				this.#client.subscribe(filter);
			}
		}

		// Open-replay, matching TelemetrySocket: a late subscriber on an already
		// open connection still gets its onOpen.
		if (this.#state === "open") subscription.onOpen?.();

		return () => {
			if (!this.#subscribers.delete(subscription)) return;
			if (filter === undefined) return;

			const remaining = (this.#filters.get(filter) ?? 1) - 1;
			if (remaining > 0) {
				this.#filters.set(filter, remaining);
				return;
			}
			this.#filters.delete(filter);
			if (this.#client !== null && this.#state === "open") {
				this.#client.unsubscribe(filter);
			}
		};
	}

	#open(): void {
		this.#setState("connecting");
		const client = this.#factory(this.#url);
		this.#client = client;

		// Every handler is scoped to the client that registered it. `close()` drops
		// the reference but cannot unregister these, so a delayed event from a
		// superseded client would otherwise revive the state or deliver stale
		// telemetry onto a newer connection.
		const isCurrent = () => this.#client === client;

		client.on("connect", () => {
			if (!isCurrent()) return;
			this.#setState("open");
			this.#resubscribe();
			for (const sub of this.#subscribers) sub.onOpen?.();
		});

		client.on("reconnect", () => {
			if (!isCurrent()) return;
			if (!this.#closedByUser) this.#setState("reconnecting");
		});

		client.on("close", () => {
			if (!isCurrent()) return;
			for (const sub of this.#subscribers) sub.onClose?.();
			this.#setState(this.#closedByUser ? "closed" : "reconnecting");
		});

		// A close always follows an error on real clients, so reconnection is
		// driven from "close"; swallow the error itself.
		client.on("error", () => {});

		client.on("message", (topic: string, payload: MqttPayload) => {
			if (!isCurrent()) return;
			const data = decodePayload(payload);
			for (const sub of this.#subscribers) {
				if (sub.topic === undefined || topicMatches(sub.topic, topic)) {
					sub.onMessage?.(topic, data);
				}
			}
		});
	}

	/** Re-issue every known subscription; brokers do not retain them across sessions. */
	#resubscribe(): void {
		const client = this.#client;
		if (client === null) return;
		for (const topic of this.#staticTopics) client.subscribe(topic);
		for (const filter of this.#filters.keys()) client.subscribe(filter);
	}

	#setState(next: ConnectionState): void {
		if (next === this.#state) return;
		this.#state = next;
		for (const sub of this.#subscribers) sub.onStateChange?.(next);
	}
}

//#endregion
