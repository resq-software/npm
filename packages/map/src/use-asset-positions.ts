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
 * @fileoverview useAssetPositions — subscribes to the shared telemetry socket
 * and accumulates the latest position per asset. Must be used within a
 * `<TelemetryProvider>` from `@resq-systems/telemetry/react`.
 *
 * @module @resq-systems/map/use-asset-positions
 */

"use client";

import { useMemo, useState } from "react";

import { useTelemetryChannel } from "@resq-systems/telemetry/react";

import { type Asset, parseAssetFrame } from "./asset.js";

export interface AssetPositions {
	/** Latest known position per asset. */
	assets: Asset[];
	/** Whether the telemetry socket is open. */
	connected: boolean;
}

/**
 * Track the latest position of every asset seen on the telemetry socket.
 *
 * @example
 * ```tsx
 * const { assets } = useAssetPositions();
 * return <TelemetryMap>{assets.map((a) => <AssetMarker key={a.id} asset={a} />)}</TelemetryMap>;
 * ```
 */
export function useAssetPositions(): AssetPositions {
	const [byId, setById] = useState<ReadonlyMap<string, Asset>>(() => new Map());

	const { connected } = useTelemetryChannel({
		onMessage: (raw) => {
			const asset = parseAssetFrame(raw);
			if (asset === null) return;
			setById((previous) => {
				const next = new Map(previous);
				next.set(asset.id, asset);
				return next;
			});
		},
	});

	const assets = useMemo(() => [...byId.values()], [byId]);
	return { assets, connected };
}
