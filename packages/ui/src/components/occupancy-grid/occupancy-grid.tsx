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
 * @fileoverview OccupancyGrid — a SLAM / Nav2 costmap mini-map rendered as pure
 * SVG. The props mirror `nav_msgs/OccupancyGrid` (`cells`, `width`, `height`,
 * `resolution`, `origin`) plus an optional vehicle `pose` and planned `path`,
 * but as plain numbers, so the component never imports a ROS client.
 *
 * Cell order follows the ROS convention: row-major with row 0 at the **bottom**
 * of the map, values `−1` for unknown and `0–100` for occupancy probability.
 *
 * Scaling is the whole design problem here. A full SLAM map can be millions of
 * cells, so the raster is reduced to at most {@link MAX_BLOCKS}² blocks and then
 * run-length merged into **two `<path>` elements** (unknown, occupied) over a
 * free-space background rect. A 2000×2000 map therefore costs the same number of
 * React elements as an 8×8 one. Block classification takes the *worst* cell in
 * the block, so downsampling can never turn an obstacle into free space, and the
 * whole reduction plus the coverage statistics run in a single pass.
 *
 * Stateless and hook-free (server-renderable), zero inline styles, and every
 * color is a design token so it tracks the light / dark theme.
 *
 * Original clean-room implementation: no third-party instrument source was
 * referenced.
 *
 * @module @resq-systems/ui/components/occupancy-grid/occupancy-grid
 */

import type * as React from "react";

import { INSTRUMENT_VIEW, safePositive, toFinite } from "../../lib/instrument-dial.js";
import { cn } from "../../lib/utils.js";

//#region Geometry constants

const VIEW = INSTRUMENT_VIEW;

/** Plot box the raster is fitted into, preserving the map's aspect ratio. */
const PLOT_X = 10;
const PLOT_Y = 28;
const PLOT_W = 180;
const PLOT_H = 142;

/** Maximum rendered blocks per side; larger maps are reduced to fit. */
const MAX_BLOCKS = 64;
/** Maximum plotted path vertices. */
const MAX_PATH_POINTS = 200;

/** Vehicle marker size in user units. */
const POSE_LENGTH = 7;
const POSE_HALF_WIDTH = 4;

/** Fallbacks when the corresponding prop is missing or invalid. */
const DEFAULT_RESOLUTION = 0.05;
const DEFAULT_OCCUPIED_THRESHOLD = 65;

/** Block classes, ordered so a numerically larger class wins a block. */
const CLASS_UNKNOWN = 0;
const CLASS_FREE = 1;
const CLASS_OCCUPIED = 2;

const RAD_TO_DEG = 180 / Math.PI;
const PERCENT = 100;

/**
 * Shared clip id. The clip geometry is the fixed plot box, identical for every
 * instance, so a constant id stays correct even with several grids on a page.
 */
const CLIP_ID = "resq-occupancy-grid-clip";

/** Color tokens (raw theme vars so they resolve in both light and dark). */
const MARK = "var(--foreground)";
const HINT = "var(--hint)";
const GRID = "var(--border)";
const FREE = "var(--card)";
const UNKNOWN = "var(--muted)";
const OCCUPIED = "var(--foreground)";
const PATH = "var(--info)";
const POSE = "var(--warning)";

//#endregion

//#region Types

/** A point in the map frame, in metres. */
export interface GridPoint {
	x: number;
	y: number;
}

/** Vehicle pose in the map frame. */
export interface GridPose extends GridPoint {
	/** Yaw in radians, counter-clockwise from the map's +x axis. */
	theta?: number;
}

/** Result of the single reduction pass over the raw cells. */
interface Raster {
	readonly classes: Uint8Array;
	readonly cols: number;
	readonly rows: number;
	readonly explored: number;
	readonly occupied: number;
	readonly total: number;
}

/** Screen-space placement of the fitted raster. */
interface Fit {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly pixelsPerMetre: number;
}

//#endregion

//#region Helpers

/** Whole, positive dimension or 0 when the input cannot describe a grid. */
function safeExtent(value: number | undefined): number {
	const resolved = Math.floor(toFinite(value, 0));
	return resolved > 0 ? resolved : 0;
}

/**
 * Reduce the raw cells to a block raster and gather coverage statistics in the
 * same pass. Each block takes its worst cell, so obstacles survive reduction.
 */
function rasterize(
	cells: ArrayLike<number>,
	width: number,
	height: number,
	threshold: number,
): Raster {
	const strideX = Math.max(1, Math.ceil(width / MAX_BLOCKS));
	const strideY = Math.max(1, Math.ceil(height / MAX_BLOCKS));
	const cols = Math.ceil(width / strideX);
	const rows = Math.ceil(height / strideY);
	const classes = new Uint8Array(cols * rows);

	let explored = 0;
	let occupied = 0;

	for (let blockY = 0; blockY < rows; blockY += 1) {
		const cellYEnd = Math.min(height, (blockY + 1) * strideY);

		for (let blockX = 0; blockX < cols; blockX += 1) {
			const cellXEnd = Math.min(width, (blockX + 1) * strideX);
			let worst = CLASS_UNKNOWN;

			for (let cellY = blockY * strideY; cellY < cellYEnd; cellY += 1) {
				const rowOffset = cellY * width;

				for (let cellX = blockX * strideX; cellX < cellXEnd; cellX += 1) {
					const value = cells[rowOffset + cellX];
					if (!Number.isFinite(value) || value < 0) continue;

					explored += 1;
					if (value >= threshold) {
						occupied += 1;
						worst = CLASS_OCCUPIED;
					} else if (worst === CLASS_UNKNOWN) {
						worst = CLASS_FREE;
					}
				}
			}

			// Row 0 is the bottom of the map; SVG y grows downward.
			classes[(rows - 1 - blockY) * cols + blockX] = worst;
		}
	}

	return { classes, cols, explored, occupied, rows, total: width * height };
}

/** Fit the block raster into the plot box without distorting its aspect. */
function fitRaster(raster: Raster, width: number, resolution: number): Fit {
	const blockSize = Math.min(PLOT_W / raster.cols, PLOT_H / raster.rows);
	const fittedWidth = blockSize * raster.cols;
	const fittedHeight = blockSize * raster.rows;

	return {
		height: fittedHeight,
		pixelsPerMetre: fittedWidth / (width * resolution),
		width: fittedWidth,
		x: PLOT_X + (PLOT_W - fittedWidth) / 2,
		y: PLOT_Y + (PLOT_H - fittedHeight) / 2,
	};
}

/**
 * Run-length merge every block of `target` class along each row into a single
 * path. One element for the whole class, whatever the map size.
 */
function classPath(raster: Raster, fit: Fit, target: number): string {
	const blockW = fit.width / raster.cols;
	const blockH = fit.height / raster.rows;
	const parts: string[] = [];

	for (let row = 0; row < raster.rows; row += 1) {
		const rowOffset = row * raster.cols;
		let runStart = -1;

		for (let col = 0; col <= raster.cols; col += 1) {
			const matches = col < raster.cols && raster.classes[rowOffset + col] === target;

			if (matches && runStart === -1) {
				runStart = col;
			} else if (!matches && runStart !== -1) {
				const x = fit.x + runStart * blockW;
				const y = fit.y + row * blockH;
				const w = (col - runStart) * blockW;
				parts.push(
					`M ${x.toFixed(2)} ${y.toFixed(2)} h ${w.toFixed(2)} v ${blockH.toFixed(2)} h -${w.toFixed(2)} Z`,
				);
				runStart = -1;
			}
		}
	}

	return parts.join(" ");
}

/** Map-frame point to screen coordinates. */
function toScreen(point: GridPoint, origin: GridPoint, fit: Fit): { x: number; y: number } {
	return {
		x: fit.x + (toFinite(point.x) - origin.x) * fit.pixelsPerMetre,
		y: fit.y + fit.height - (toFinite(point.y) - origin.y) * fit.pixelsPerMetre,
	};
}

/** Thin the path to at most {@link MAX_PATH_POINTS} vertices, keeping the end. */
function thinPath(path: readonly GridPoint[]): GridPoint[] {
	if (path.length <= MAX_PATH_POINTS) return [...path];

	const stride = Math.ceil(path.length / MAX_PATH_POINTS);
	const thinned: GridPoint[] = [];
	for (let index = 0; index < path.length; index += stride) thinned.push(path[index]);

	const last = path[path.length - 1];
	if (thinned[thinned.length - 1] !== last) thinned.push(last);
	return thinned;
}

/** Percentage of a total, guarding a zero denominator. */
function percentOf(part: number, total: number): number {
	return total === 0 ? 0 : Math.round((part / total) * PERCENT);
}

/** Build a screen-reader sentence describing the map. */
function formatGridLabel(
	raster: Raster | null,
	width: number,
	height: number,
	resolution: number,
	pose: GridPose | undefined,
	pathLength: number,
): string {
	if (raster === null) return "Occupancy grid, no map data";

	const explored = percentOf(raster.explored, raster.total);
	const occupied = percentOf(raster.occupied, raster.total);
	const posePart =
		pose === undefined
			? ""
			: `, vehicle at ${toFinite(pose.x).toFixed(1)} by ${toFinite(pose.y).toFixed(1)} meters heading ${Math.round(toFinite(pose.theta) * RAD_TO_DEG)} degrees`;
	const pathPart = pathLength > 0 ? `, planned path of ${pathLength} waypoints` : "";

	return `Occupancy grid, ${width} by ${height} cells at ${resolution} meter resolution, ${explored} percent explored, ${occupied} percent occupied${posePart}${pathPart}`;
}

//#endregion

//#region Component

export interface OccupancyGridProps extends React.ComponentProps<"div"> {
	/** Row-major occupancy values: `−1` unknown, `0`–`100` probability. Row 0 is the bottom. */
	cells?: ArrayLike<number>;
	/** Grid width in cells. */
	width?: number;
	/** Grid height in cells. */
	height?: number;
	/** Metres per cell. Defaults to 0.05. */
	resolution?: number;
	/** Map-frame position of the grid's bottom-left corner, in metres. */
	origin?: GridPoint;
	/** Vehicle pose in the map frame. */
	pose?: GridPose;
	/** Planned path in the map frame. Thinned to 200 vertices for display. */
	path?: readonly GridPoint[];
	/** Occupancy value at or above which a cell counts as occupied. Defaults to 65. */
	occupiedThreshold?: number;
	/** Overrides the auto-generated `aria-label`. */
	label?: string;
}

/**
 * SLAM / costmap mini-map with vehicle pose and planned path.
 *
 * @example
 * ```tsx
 * <OccupancyGrid
 *   cells={map.data}
 *   width={map.info.width}
 *   height={map.info.height}
 *   resolution={map.info.resolution}
 *   pose={{ x: 1.2, y: 3.4, theta: Math.PI / 2 }}
 *   className="size-64"
 * />
 * ```
 */
function OccupancyGrid({
	cells,
	width,
	height,
	resolution,
	origin,
	pose,
	path,
	occupiedThreshold,
	label,
	className,
	...props
}: Readonly<OccupancyGridProps>) {
	const cols = safeExtent(width);
	const rows = safeExtent(height);
	const data = cells ?? [];
	const metresPerCell = safePositive(resolution, DEFAULT_RESOLUTION);
	const threshold = safePositive(occupiedThreshold, DEFAULT_OCCUPIED_THRESHOLD);

	// A short buffer would silently render a truncated map — refuse instead.
	const usable = cols > 0 && rows > 0 && data.length >= cols * rows;
	const raster = usable ? rasterize(data, cols, rows, threshold) : null;
	const fit = raster === null ? null : fitRaster(raster, cols, metresPerCell);

	const originPoint: GridPoint = {
		x: toFinite(origin?.x),
		y: toFinite(origin?.y),
	};
	const waypoints = path ?? [];
	const ariaLabel =
		label ?? formatGridLabel(raster, cols, rows, metresPerCell, pose, waypoints.length);

	const polyline =
		fit === null || waypoints.length < 2
			? ""
			: thinPath(waypoints)
					.map((point) => {
						const screen = toScreen(point, originPoint, fit);
						return `${screen.x.toFixed(2)},${screen.y.toFixed(2)}`;
					})
					.join(" ");

	const poseScreen = fit === null || pose === undefined ? null : toScreen(pose, originPoint, fit);
	const poseRotation = -toFinite(pose?.theta) * RAD_TO_DEG;

	return (
		<div
			{...props}
			aria-label={ariaLabel}
			className={cn("relative inline-block size-48 select-none", className)}
			data-slot="occupancy-grid"
			role="img"
		>
			<div className="absolute inset-0 overflow-hidden rounded-[6px] border border-border bg-card">
				<svg
					aria-hidden="true"
					className="block"
					height="100%"
					viewBox={`0 0 ${VIEW} ${VIEW}`}
					width="100%"
				>
					<defs>
						<clipPath id={CLIP_ID}>
							<rect height={PLOT_H} width={PLOT_W} x={PLOT_X} y={PLOT_Y} />
						</clipPath>
					</defs>

					<text className="font-mono" fill={HINT} fontSize={8} textAnchor="start" x={6} y={16}>
						MAP
					</text>
					<text className="font-mono" fill={HINT} fontSize={8} textAnchor="end" x={194} y={16}>
						{raster === null ? "—" : `${cols}×${rows} @ ${metresPerCell} m`}
					</text>

					{raster === null || fit === null ? (
						<text
							className="font-mono"
							dominantBaseline="middle"
							fill={HINT}
							fontSize={11}
							textAnchor="middle"
							x={VIEW / 2}
							y={VIEW / 2}
						>
							NO MAP DATA
						</text>
					) : (
						<g>
							{/* Free space is the base layer; the two classes paint over it. */}
							<rect
								fill={FREE}
								height={fit.height}
								stroke={GRID}
								strokeWidth={1}
								width={fit.width}
								x={fit.x}
								y={fit.y}
							/>
							<path d={classPath(raster, fit, CLASS_UNKNOWN)} fill={UNKNOWN} stroke="none" />
							<path d={classPath(raster, fit, CLASS_OCCUPIED)} fill={OCCUPIED} stroke="none" />

							<g clipPath={`url(#${CLIP_ID})`}>
								{polyline === "" ? null : (
									<polyline
										fill="none"
										points={polyline}
										stroke={PATH}
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.8}
									/>
								)}
								{poseScreen === null ? null : (
									<polygon
										fill={POSE}
										points={`${poseScreen.x + POSE_LENGTH},${poseScreen.y} ${poseScreen.x - POSE_HALF_WIDTH},${poseScreen.y - POSE_HALF_WIDTH} ${poseScreen.x - POSE_HALF_WIDTH},${poseScreen.y + POSE_HALF_WIDTH}`}
										transform={`rotate(${poseRotation.toFixed(2)} ${poseScreen.x.toFixed(2)} ${poseScreen.y.toFixed(2)})`}
									/>
								)}
							</g>
						</g>
					)}

					<text className="font-mono" fill={MARK} fontSize={10} textAnchor="start" x={6} y={190}>
						{raster === null ? "" : `${percentOf(raster.explored, raster.total)}% EXPLORED`}
					</text>
					<text className="font-mono" fill={MARK} fontSize={10} textAnchor="end" x={194} y={190}>
						{raster === null ? "" : `${percentOf(raster.occupied, raster.total)}% OCC`}
					</text>
				</svg>
			</div>
		</div>
	);
}

//#endregion

export { OccupancyGrid };
