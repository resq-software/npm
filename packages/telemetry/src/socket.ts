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
 * @fileoverview TelemetrySocket — a single-owner reconnecting WebSocket client.
 *
 * One socket is shared by many consumers: each `subscribe()`s for raw frames
 * and/or lifecycle events, and any consumer may `send()`. The socket owns the
 * connection, reconnects with exponential backoff after an unexpected close,
 * and replays `onOpen` to late subscribers so channel handshakes survive
 * reconnects. Generalises the ResQ fleet dashboard's shared `/fleet/ws` owner.
 *
 * @module @resq-systems/telemetry/socket
 */

import {
	type BackoffOptions,
	createBackoff,
	createReconnectTimer,
	type ReconnectTimer,
} from "./backoff.js";
import type {
	ConnectionState,
	TelemetrySubscription,
	WebSocketFactory,
	WebSocketLike,
} from "./types.js";

/** `WebSocket.OPEN` — the numeric readyState for an open connection. */
const WS_OPEN = 1;

export interface TelemetrySocketOptions {
	/** WebSocket URL to connect to (e.g. `wss://host/fleet/ws`). */
	url: string;
	/**
	 * WebSocket implementation factory. Defaults to the global `WebSocket`;
	 * inject one to run under Node (`ws`) or in tests.
	 */
	connect?: WebSocketFactory;
	/** Reconnect backoff tuning. */
	backoff?: BackoffOptions;
}

/** Default factory: use the platform's global `WebSocket`. */
function defaultFactory(url: string): WebSocketLike {
	if (typeof WebSocket === "undefined") {
		throw new Error(
			"@resq-systems/telemetry: no global WebSocket available — pass options.connect with a WebSocket implementation.",
		);
	}
	return new WebSocket(url) as unknown as WebSocketLike;
}

/**
 * A reconnecting WebSocket shared by many consumers.
 *
 * @example
 * ```ts
 * const socket = new TelemetrySocket({ url: "wss://host/fleet/ws" });
 * const off = socket.subscribe({ onMessage: (raw) => handle(JSON.parse(raw)) });
 * socket.connect();
 * socket.send("subscribe:ops");
 * // later: off(); socket.close();
 * ```
 */
export class TelemetrySocket {
	readonly #url: string;
	readonly #factory: WebSocketFactory;
	readonly #subscribers = new Set<TelemetrySubscription>();
	readonly #timer: ReconnectTimer;
	#ws: WebSocketLike | null = null;
	#state: ConnectionState = "idle";
	#closedByUser = false;

	constructor(options: Readonly<TelemetrySocketOptions>) {
		this.#url = options.url;
		this.#factory = options.connect ?? defaultFactory;
		this.#timer = createReconnectTimer(() => this.#reconnect(), createBackoff(options.backoff));
	}

	/** Current connection state. */
	get state(): ConnectionState {
		return this.#state;
	}

	/** Whether the socket is currently open. */
	get connected(): boolean {
		return this.#state === "open";
	}

	/** Open the connection (idempotent while already connecting/open). */
	connect(): this {
		this.#closedByUser = false;
		if (this.#state === "idle" || this.#state === "closed") {
			this.#open(false);
		}
		return this;
	}

	/** Close intentionally and stop reconnecting. */
	close(): void {
		this.#closedByUser = true;
		this.#timer.cancel();
		const ws = this.#ws;
		if (ws) {
			ws.close();
		} else {
			this.#setState("closed");
		}
	}

	/** Send a frame; returns `false` (no-op) when not open. */
	send(message: string): boolean {
		const ws = this.#ws;
		if (ws && ws.readyState === WS_OPEN) {
			ws.send(message);
			return true;
		}
		return false;
	}

	/** Attach a consumer. Returns an unsubscribe function. */
	subscribe(subscription: TelemetrySubscription): () => void {
		this.#subscribers.add(subscription);
		// Open-replay: a late subscriber on an already-open socket still gets its
		// onOpen so it can (re)send channel handshakes.
		if (this.#state === "open") {
			subscription.onOpen?.();
		}
		return () => {
			this.#subscribers.delete(subscription);
		};
	}

	#reconnect(): void {
		try {
			this.#open(true);
		} catch {
			// Factory failed (e.g. transient): keep retrying on the schedule.
			this.#timer.schedule();
		}
	}

	/**
	 * Invoke one subscriber callback in isolation.
	 *
	 * A consumer that throws must not affect any other consumer, and must not
	 * affect this socket's own control flow. The `onClose` fan-out is the case
	 * that matters: the reconnect is scheduled *after* it, so an unguarded throw
	 * there skipped `#setState("reconnecting")` and `#timer.schedule()` and
	 * permanently disabled reconnection for the life of the socket — one broken
	 * consumer silently took the transport down for every other consumer.
	 *
	 * Reported to `console.error` rather than swallowed: a throwing subscriber is
	 * a bug in that subscriber, and it should stay visible even though it can no
	 * longer propagate.
	 */
	#notify(sub: TelemetrySubscription, deliver: (sub: TelemetrySubscription) => void): void {
		try {
			deliver(sub);
		} catch (error) {
			console.error("[telemetry] subscriber callback threw; continuing delivery", error);
		}
	}

	#open(reconnecting: boolean): void {
		this.#setState(reconnecting ? "reconnecting" : "connecting");
		const ws = this.#factory(this.#url);
		this.#ws = ws;

		ws.onopen = () => {
			this.#timer.reset();
			this.#setState("open");
			for (const sub of this.#subscribers) this.#notify(sub, (s) => s.onOpen?.());
		};
		ws.onmessage = (event) => {
			const data = typeof event.data === "string" ? event.data : String(event.data);
			for (const sub of this.#subscribers) this.#notify(sub, (s) => s.onMessage?.(data));
		};
		ws.onclose = () => {
			this.#ws = null;
			for (const sub of this.#subscribers) this.#notify(sub, (s) => s.onClose?.());
			if (this.#closedByUser) {
				this.#setState("closed");
				return;
			}
			this.#setState("reconnecting");
			this.#timer.schedule();
		};
		// Errors are followed by a close on every real implementation, so the
		// reconnect runs from onclose; swallow the error event itself.
		ws.onerror = () => {};
	}

	#setState(next: ConnectionState): void {
		if (next === this.#state) return;
		this.#state = next;
		for (const sub of this.#subscribers) this.#notify(sub, (s) => s.onStateChange?.(next));
	}
}
