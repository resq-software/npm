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
 * @fileoverview Public API for `@resq-systems/telemetry` — a framework-agnostic
 * reconnecting WebSocket client for real-time telemetry. React bindings live
 * behind the `./react` subpath so non-React consumers pull in nothing extra.
 *
 * @example
 * ```ts
 * import { TelemetrySocket } from "@resq-systems/telemetry";
 *
 * const socket = new TelemetrySocket({ url: "wss://host/fleet/ws" });
 * socket.subscribe({ onMessage: (raw) => update(JSON.parse(raw)) });
 * socket.connect();
 * ```
 *
 * @module @resq-systems/telemetry
 */

export {
	type Backoff,
	type BackoffOptions,
	createBackoff,
	createReconnectTimer,
	type ReconnectTimer,
} from "./backoff.js";
export {
	type MqttClientFactory,
	type MqttClientLike,
	type MqttPayload,
	type MqttSubscription,
	MqttTelemetrySource,
	type MqttTelemetrySourceOptions,
} from "./mqtt.js";
export { TelemetrySocket, type TelemetrySocketOptions } from "./socket.js";
export { topicMatches } from "./topic-filter.js";
export type {
	ConnectionState,
	TelemetrySubscription,
	WebSocketFactory,
	WebSocketLike,
} from "./types.js";
