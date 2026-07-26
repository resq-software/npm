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
 * @fileoverview Shared types for the telemetry transport — the connection
 * lifecycle, the minimal WebSocket surface the client depends on, and the
 * per-consumer subscription callbacks.
 *
 * @module @resq-systems/telemetry/types
 */

/** Lifecycle of a {@link TelemetrySocket} connection. */
export type ConnectionState = "idle" | "connecting" | "open" | "reconnecting" | "closed";

/**
 * The minimal WebSocket surface the client relies on. Both the browser
 * `WebSocket` and the Node `ws` package satisfy this structurally, so the
 * transport stays environment-agnostic and free of a DOM dependency.
 */
export interface WebSocketLike {
	readonly readyState: number;
	send(data: string): void;
	close(code?: number, reason?: string): void;
	onopen: ((event: unknown) => void) | null;
	onmessage: ((event: { data: unknown }) => void) | null;
	onclose: ((event: unknown) => void) | null;
	onerror: ((event: unknown) => void) | null;
}

/** Creates a connection for a URL — inject one for Node or tests. */
export type WebSocketFactory = (url: string) => WebSocketLike;

/**
 * A consumer attached to the shared socket. Every callback is optional so a
 * consumer subscribes only to what it needs (raw frames, lifecycle, or both).
 */
export interface TelemetrySubscription {
	/** Every raw text frame from the socket. */
	onMessage?(data: string): void;
	/**
	 * Fired on every open — including immediately at subscribe time when the
	 * socket is already connected — so late subscribers can (re)send channel
	 * handshakes across reconnects.
	 */
	onOpen?(): void;
	/** Fired when the underlying socket closes (before any reconnect). */
	onClose?(): void;
	/** Fired whenever the connection state changes. */
	onStateChange?(state: ConnectionState): void;
}
