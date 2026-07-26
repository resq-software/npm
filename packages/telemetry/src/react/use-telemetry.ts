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
 * @fileoverview React hooks for the shared telemetry socket — `useTelemetry`
 * for the socket + live state, and `useTelemetryChannel` to attach a set of
 * frame/lifecycle handlers and get a `send` bound to the shared connection.
 *
 * @module @resq-systems/telemetry/react/use-telemetry
 */

"use client";

import { useContext, useEffect, useRef } from "react";

import type { TelemetrySubscription } from "../types.js";
import { TelemetryContext, type TelemetryContextValue } from "./telemetry-provider.js";

/** Access the shared telemetry socket and its live connection state. */
export function useTelemetry(): TelemetryContextValue {
	const context = useContext(TelemetryContext);
	if (context === null) {
		throw new Error("useTelemetry must be used within a <TelemetryProvider>.");
	}
	return context;
}

export interface TelemetryChannel {
	/** Whether the shared socket is currently open. */
	connected: boolean;
	/** Send a frame on the shared socket; `false` when not open. */
	send(message: string): boolean;
}

/**
 * Attach handlers to the shared socket for the lifetime of the component and
 * get a `send` bound to it. Handlers are read through a ref so passing fresh
 * closures each render never re-subscribes.
 *
 * @example
 * ```tsx
 * const ops = useTelemetryChannel({
 *   onOpen: () => ops.send("subscribe:ops"),
 *   onMessage: (raw) => applyOps(JSON.parse(raw)),
 * });
 * ```
 */
export function useTelemetryChannel(
	subscription: Readonly<TelemetrySubscription>,
): TelemetryChannel {
	const { socket, connected } = useTelemetry();
	// Sync the latest handlers into a ref in an effect (not during render) so
	// render stays pure; the ref is only read inside async socket callbacks.
	const ref = useRef(subscription);
	useEffect(() => {
		ref.current = subscription;
	}, [subscription]);

	useEffect(
		() =>
			socket.subscribe({
				onClose: () => ref.current.onClose?.(),
				onMessage: (data) => ref.current.onMessage?.(data),
				onOpen: () => ref.current.onOpen?.(),
			}),
		[socket],
	);

	return { connected, send: (message: string) => socket.send(message) };
}
