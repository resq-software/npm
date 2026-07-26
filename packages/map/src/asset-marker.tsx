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
 * @fileoverview AssetMarker — places an {@link Asset} on the map. By default it
 * renders a self-contained heading arrow (rotated to the asset's heading); pass
 * `children` (e.g. `<HeadingIndicator heading={asset.heading} />` from
 * `@resq-systems/ui`) to swap in a richer marker.
 *
 * @module @resq-systems/map/asset-marker
 */

"use client";

import type { ReactNode } from "react";
import { Marker } from "react-map-gl/maplibre";

import type { Asset } from "./asset.js";

/** Default amber marker fill. */
const DEFAULT_COLOR = "#f59e0b";
/** Dark outline for contrast over any basemap. */
const OUTLINE = "#0b0f1a";

export interface AssetMarkerProps {
	/** The asset to place. */
	asset: Asset;
	/** Marker size in px (default 28). */
	size?: number;
	/** Fill colour of the default arrow. */
	color?: string;
	/** Selection handler. */
	onSelect?: (asset: Asset) => void;
	/** Custom marker content; replaces the default heading arrow. */
	children?: ReactNode;
}

/** A north-pointing arrow rotated to `heading`. */
function HeadingArrow({ heading, size, color }: { heading: number; size: number; color: string }) {
	return (
		<svg
			aria-hidden="true"
			height={size}
			style={{ display: "block" }}
			viewBox="0 0 24 24"
			width={size}
		>
			<g transform={`rotate(${heading} 12 12)`}>
				<path
					d="M12 2 L19 21 L12 16 L5 21 Z"
					fill={color}
					stroke={OUTLINE}
					strokeLinejoin="round"
					strokeWidth={1}
				/>
			</g>
		</svg>
	);
}

/**
 * Place an asset on the map.
 *
 * @example
 * ```tsx
 * <AssetMarker asset={asset} onSelect={setSelected} />
 * // richer: <AssetMarker asset={asset}><HeadingIndicator heading={asset.heading} className="size-10" /></AssetMarker>
 * ```
 */
export function AssetMarker({
	asset,
	size = 28,
	color = DEFAULT_COLOR,
	onSelect,
	children,
}: Readonly<AssetMarkerProps>) {
	return (
		<Marker
			anchor="center"
			latitude={asset.latitude}
			longitude={asset.longitude}
			onClick={() => onSelect?.(asset)}
		>
			{children ?? <HeadingArrow color={color} heading={asset.heading} size={size} />}
		</Marker>
	);
}
