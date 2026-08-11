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
 * @fileoverview TurnCoordinator — a rate-of-turn and coordination instrument
 * rendered as pure SVG. Drive it with `turn` (bank of the miniature aircraft,
 * degrees, + right) and `slip` (inclinometer ball, −1…1, 0 = coordinated). The
 * aircraft banks against fixed wings-level and standard-rate index marks, and
 * the ball slides in a tube at the bottom.
 *
 * Stateless and hook-free (server-renderable). All motion is expressed through
 * SVG attributes (zero inline styles) and every color is a design token, so it
 * tracks the light / dark theme.
 *
 * Original clean-room implementation: the geometry follows standard turn-
 * coordinator display conventions; no third-party instrument source was
 * referenced.
 *
 * @module @resq-systems/ui/components/turn-coordinator/turn-coordinator
 */

import type * as React from "react";

import {
	clamp,
	INSTRUMENT_CENTER,
	INSTRUMENT_VIEW,
	toFinite,
	withStaleness,
} from "../../lib/instrument-dial.js";
import { cn } from "../../lib/utils.js";

//#region Geometry constants

const VIEW = INSTRUMENT_VIEW;
const CENTER = INSTRUMENT_CENTER;

/** Maximum displayed bank of the miniature aircraft. */
const TURN_LIMIT = 30;
/** Miniature-aircraft dimensions. */
const WING_SPAN = 42;
const WINGLET = 5;
const FIN = 16;
const BODY_RADIUS = 6;

/** Standard-rate index-mark geometry (angle below horizontal, radii). */
const STD_MARK_DEG = 18;
const STD_RAD = (STD_MARK_DEG * Math.PI) / 180;
const STD_COS = Math.cos(STD_RAD);
const STD_SIN = Math.sin(STD_RAD);
const MARK_OUTER = 58;
const MARK_INNER = 48;

/** Inclinometer (slip/skid) geometry. */
const BALL_Y = 150;
const BALL_RADIUS = 5;
const BALL_TRAVEL = 16;
const TUBE_HALF = 22;
const CAGE_HALF = 6;

/** When |slip| is below this the ball reads as centred. */
const CENTRED_EPSILON = 0.03;

/** Color tokens (raw theme vars so they resolve in both light and dark). */
const MARK = "var(--foreground)";
const ACCENT = "var(--warning)";

//#endregion

//#region Precomputed static elements

/** Fixed wings-level + standard-rate index marks, built once. */
const REFERENCE_MARKS = (
	<>
		<line
			stroke={MARK}
			strokeLinecap="round"
			strokeWidth={3}
			x1={30}
			x2={44}
			y1={CENTER}
			y2={CENTER}
		/>
		<line
			stroke={MARK}
			strokeLinecap="round"
			strokeWidth={3}
			x1={156}
			x2={170}
			y1={CENTER}
			y2={CENTER}
		/>
		<line
			stroke={MARK}
			strokeLinecap="round"
			strokeWidth={3}
			x1={CENTER - MARK_OUTER * STD_COS}
			x2={CENTER - MARK_INNER * STD_COS}
			y1={CENTER + MARK_OUTER * STD_SIN}
			y2={CENTER + MARK_INNER * STD_SIN}
		/>
		<line
			stroke={MARK}
			strokeLinecap="round"
			strokeWidth={3}
			x1={CENTER + MARK_OUTER * STD_COS}
			x2={CENTER + MARK_INNER * STD_COS}
			y1={CENTER + MARK_OUTER * STD_SIN}
			y2={CENTER + MARK_INNER * STD_SIN}
		/>
	</>
);

/** Inclinometer tube + cage (the ball moves separately), built once. */
const INCLINOMETER_CAGE = (
	<>
		<rect
			fill="none"
			height={12}
			rx={6}
			stroke="var(--border)"
			width={TUBE_HALF * 2}
			x={CENTER - TUBE_HALF}
			y={BALL_Y - 6}
		/>
		<line
			stroke={MARK}
			strokeWidth={1.4}
			x1={CENTER - CAGE_HALF}
			x2={CENTER - CAGE_HALF}
			y1={BALL_Y - 6}
			y2={BALL_Y + 6}
		/>
		<line
			stroke={MARK}
			strokeWidth={1.4}
			x1={CENTER + CAGE_HALF}
			x2={CENTER + CAGE_HALF}
			y1={BALL_Y - 6}
			y2={BALL_Y + 6}
		/>
	</>
);

//#endregion

//#region Component

export interface TurnCoordinatorProps extends React.ComponentProps<"div"> {
	/** Bank of the miniature aircraft in degrees; positive is a right turn. Clamped to ±30. */
	turn?: number;
	/** Inclinometer ball position, −1 (full left) … 1 (full right). 0 is coordinated. */
	slip?: number;
	/**
	 * Marks the reading as no longer trustworthy: dims the figure, shows a STALE
	 * badge, sets `data-stale`, and leads the accessible label with "Stale".
	 *
	 * A boolean rather than a timestamp — this component holds no timer and
	 * could not notice itself going stale. Compute it with `isStale` from
	 * `@resq-systems/ui/adapters`, driven by your own render loop.
	 */
	stale?: boolean;
	/** Overrides the auto-generated `aria-label`. */
	label?: string;
}

/**
 * Turn coordinator with slip/skid ball.
 *
 * @example
 * ```tsx
 * <TurnCoordinator turn={18} slip={0.2} className="size-64" />
 * ```
 */
function TurnCoordinator({
	turn,
	slip,
	stale,
	label,
	className,
	...props
}: Readonly<TurnCoordinatorProps>) {
	const turnDeg = clamp(toFinite(turn), -TURN_LIMIT, TURN_LIMIT);
	const slipValue = clamp(toFinite(slip), -1, 1);
	const rounded = Math.round(turnDeg);
	const ballX = CENTER + slipValue * BALL_TRAVEL;

	const turnPart =
		rounded === 0
			? "wings level"
			: `${Math.abs(rounded)} degrees ${rounded > 0 ? "right" : "left"} bank`;
	const slipPart =
		Math.abs(slipValue) < CENTRED_EPSILON
			? "ball centred"
			: `ball ${slipValue > 0 ? "right" : "left"}`;
	const ariaLabel = withStaleness(label ?? `Turn coordinator, ${turnPart}, ${slipPart}`, stale);

	return (
		<div
			{...props}
			aria-label={ariaLabel}
			className={cn("relative inline-block size-48 select-none", className)}
			data-slot="turn-coordinator"
			data-stale={stale === true ? "" : undefined}
			role="img"
		>
			<div
				className={cn(
					"absolute inset-0 overflow-hidden rounded-full border border-border bg-card",
					stale === true && "opacity-45",
				)}
			>
				<svg
					aria-hidden="true"
					className="block"
					height="100%"
					viewBox={`0 0 ${VIEW} ${VIEW}`}
					width="100%"
				>
					{/* Fixed wings-level and standard-rate index marks. */}
					{REFERENCE_MARKS}

					{/* Banking miniature aircraft (rear view). */}
					<g transform={`rotate(${turnDeg} ${CENTER} ${CENTER})`}>
						<line
							stroke={MARK}
							strokeLinecap="round"
							strokeWidth={4}
							x1={CENTER - WING_SPAN}
							x2={CENTER + WING_SPAN}
							y1={CENTER}
							y2={CENTER}
						/>
						<line
							stroke={MARK}
							strokeLinecap="round"
							strokeWidth={4}
							x1={CENTER - WING_SPAN}
							x2={CENTER - WING_SPAN}
							y1={CENTER}
							y2={CENTER + WINGLET}
						/>
						<line
							stroke={MARK}
							strokeLinecap="round"
							strokeWidth={4}
							x1={CENTER + WING_SPAN}
							x2={CENTER + WING_SPAN}
							y1={CENTER}
							y2={CENTER + WINGLET}
						/>
						<line
							stroke={MARK}
							strokeLinecap="round"
							strokeWidth={4}
							x1={CENTER}
							x2={CENTER}
							y1={CENTER}
							y2={CENTER - FIN}
						/>
						<circle cx={CENTER} cy={CENTER} fill={ACCENT} r={BODY_RADIUS} />
					</g>

					{/* Inclinometer: tube, cage, and ball. */}
					{INCLINOMETER_CAGE}
					<circle cx={ballX} cy={BALL_Y} fill={ACCENT} r={BALL_RADIUS} />
				</svg>
			</div>
			{stale === true ? (
				<span className="absolute top-1 right-1 rounded-[3px] bg-destructive px-1 py-px font-mono text-[9px] uppercase leading-none text-destructive-foreground">
					Stale
				</span>
			) : null}
		</div>
	);
}

//#endregion

export { TurnCoordinator };
