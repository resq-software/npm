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
 * @fileoverview TelemetryProvider — owns a single {@link TelemetrySocket} for
 * the React subtree and exposes it (plus live connection state) via context.
 * Consumers attach with the `useTelemetry` / `useTelemetryChannel` hooks; the
 * provider is the sole socket owner, mirroring the dashboard's DroneProvider.
 *
 * @module @resq-systems/telemetry/react/telemetry-provider
 */

"use client";

import { createContext, type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { TelemetrySocket, type TelemetrySocketOptions } from "../socket.js";
import type { ConnectionState } from "../types.js";

export interface TelemetryContextValue {
	/** The shared socket. */
	socket: TelemetrySocket;
	/** Live connection state. */
	state: ConnectionState;
	/** Whether the socket is currently open. */
	connected: boolean;
}

export const TelemetryContext = createContext<TelemetryContextValue | null>(null);

export interface TelemetryProviderProps extends TelemetrySocketOptions {
	children: ReactNode;
}

/**
 * Provide a single reconnecting telemetry socket to the subtree.
 *
 * @example
 * ```tsx
 * <TelemetryProvider url="wss://host/fleet/ws">
 *   <FleetMap />
 * </TelemetryProvider>
 * ```
 */
export function TelemetryProvider({
	url,
	connect,
	backoff,
	children,
}: Readonly<TelemetryProviderProps>) {
	// One socket per provider instance; url/connect/backoff are read once.
	const socketRef = useRef<TelemetrySocket | null>(null);
	if (socketRef.current === null) {
		socketRef.current = new TelemetrySocket({ backoff, connect, url });
	}
	const socket = socketRef.current;
	const [state, setState] = useState<ConnectionState>(socket.state);

	useEffect(() => {
		const unsubscribe = socket.subscribe({ onStateChange: setState });
		socket.connect();
		setState(socket.state);
		return () => {
			unsubscribe();
			socket.close();
		};
	}, [socket]);

	const value = useMemo<TelemetryContextValue>(
		() => ({ connected: state === "open", socket, state }),
		[socket, state],
	);

	return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
}
