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
 * @fileoverview TeleopPad — a two-axis velocity command pad. It is the one
 * interactive member of the instrument set: everything else displays telemetry,
 * this one produces it. Vertical travel is linear velocity, horizontal travel is
 * yaw rate, both emitted normalized to ±1 so the caller scales them into a
 * `geometry_msgs/Twist` (or a MAVLink manual-control frame) itself.
 *
 * Three decisions worth knowing about:
 *
 * 1. **Deadman by default.** `returnToCenter` defaults to `true`, so releasing
 *    the pointer commands zero. A teleoperated vehicle that keeps driving after
 *    the operator lets go is a hazard, so the safe behaviour is the default and
 *    latching is opt-in.
 * 2. **No layout reads.** Pointer position comes from the event's `offsetX` /
 *    `offsetY` (computed at dispatch, so nothing is measured on demand) divided
 *    by a size kept in state by a `ResizeObserver`. The measuring DOM APIs that
 *    force synchronous layout are never called; the package's perf guards block
 *    them outright.
 * 3. **Real controls underneath.** Two visually-hidden `<input type="range">`
 *    elements carry the axes, so keyboard and assistive-technology users get
 *    native slider semantics, announcements and stepping instead of a `div`
 *    pretending to be a control. The pointer surface is an overlay above them.
 *
 * Zero inline styles; every color is a design token so it tracks the light /
 * dark theme.
 *
 * Original clean-room implementation: no third-party instrument source was
 * referenced.
 *
 * @module @resq-systems/ui/components/teleop-pad/teleop-pad
 */

"use client";

import * as React from "react";

import { clamp, INSTRUMENT_CENTER, INSTRUMENT_VIEW } from "../../lib/instrument-dial.js";
import { cn } from "../../lib/utils.js";

//#region Geometry constants

const VIEW = INSTRUMENT_VIEW;
const CENTER = INSTRUMENT_CENTER;

/** Half-extent of the command square in user units. */
const PAD_HALF = 72;
/** Knob radius and the radius of the centre detent. */
const KNOB_RADIUS = 11;
const DETENT_RADIUS = 3;

/** Axis values are rounded to this many decimals before being emitted. */
const VALUE_DECIMALS = 3;
/** Native range-input granularity for the hidden axis controls. */
const INPUT_STEP = 0.01;

const DEFAULT_KEYBOARD_STEP = 0.1;

/** Color tokens (raw theme vars so they resolve in both light and dark). */
const MARK = "var(--foreground)";
const HINT = "var(--hint)";
const GRID = "var(--border)";
const ACTIVE = "var(--primary)";
const IDLE = "var(--muted-foreground)";

//#endregion

//#region Types

/** A normalized two-axis velocity command. */
export interface TeleopVector {
	/** Linear velocity command in −1 (full reverse) … +1 (full forward). */
	linear: number;
	/** Yaw-rate command in −1 (full left) … +1 (full right). */
	angular: number;
}

//#endregion

//#region Helpers

/** A fresh zero command. */
function zeroVector(): TeleopVector {
	return { angular: 0, linear: 0 };
}

/** Round to {@link VALUE_DECIMALS} so repeated key steps stay exact. */
function round(value: number): number {
	const factor = 10 ** VALUE_DECIMALS;
	return Math.round(value * factor) / factor;
}

/** Coerce arbitrary input into a clamped, rounded, finite command. */
function normalizeVector(value: Partial<TeleopVector> | undefined): TeleopVector {
	const linear = value?.linear;
	const angular = value?.angular;
	return {
		angular: Number.isFinite(angular) ? round(clamp(angular as number, -1, 1)) : 0,
		linear: Number.isFinite(linear) ? round(clamp(linear as number, -1, 1)) : 0,
	};
}

/** Build a screen-reader sentence describing the current command. */
function formatTeleopLabel(command: TeleopVector): string {
	const linearPart =
		command.linear === 0
			? "stopped"
			: `${command.linear > 0 ? "forward" : "reverse"} ${Math.abs(command.linear).toFixed(2)}`;
	const angularPart =
		command.angular === 0
			? "straight ahead"
			: `${command.angular > 0 ? "right" : "left"} ${Math.abs(command.angular).toFixed(2)}`;
	return `Teleop pad, ${linearPart}, ${angularPart}`;
}

/** Axis readout: engineering units when a scale is given, else normalized. */
function formatAxis(value: number, scale: number | undefined, unit: string): string {
	return typeof scale === "number" && Number.isFinite(scale)
		? `${(value * scale).toFixed(1)} ${unit}`
		: value.toFixed(2);
}

//#endregion

//#region Precomputed static elements

/** Command square, axes and centre detent — independent of the live command. */
const PAD_GRID = (
	<g>
		<rect
			fill="none"
			height={PAD_HALF * 2}
			rx={4}
			stroke={GRID}
			strokeWidth={1}
			width={PAD_HALF * 2}
			x={CENTER - PAD_HALF}
			y={CENTER - PAD_HALF}
		/>
		<line
			stroke={GRID}
			strokeWidth={1}
			x1={CENTER - PAD_HALF}
			x2={CENTER + PAD_HALF}
			y1={CENTER}
			y2={CENTER}
		/>
		<line
			stroke={GRID}
			strokeWidth={1}
			x1={CENTER}
			x2={CENTER}
			y1={CENTER - PAD_HALF}
			y2={CENTER + PAD_HALF}
		/>
		<circle cx={CENTER} cy={CENTER} fill={GRID} r={DETENT_RADIUS} />
	</g>
);

//#endregion

//#region Component

export interface TeleopPadProps
	extends Omit<React.ComponentProps<"div">, "defaultValue" | "onChange"> {
	/** Controlled command. Supply with `onChange` to own the state. */
	value?: TeleopVector;
	/** Initial command when uncontrolled. Defaults to zero. */
	defaultValue?: TeleopVector;
	/** Fired on every command change, with values already clamped to ±1. */
	onChange?: (value: TeleopVector) => void;
	/** Command zero when the pointer is released. Defaults to `true` (deadman). */
	returnToCenter?: boolean;
	/** Axis increment per arrow-key press. Defaults to 0.1. */
	keyboardStep?: number;
	/** Blocks input and dims the pad. */
	disabled?: boolean;
	/** Display-only: metres per second at full linear deflection. */
	linearScale?: number;
	/** Display-only: radians per second at full angular deflection. */
	angularScale?: number;
	/** Overrides the auto-generated `aria-label`. */
	label?: string;
}

/**
 * Two-axis teleoperation command pad.
 *
 * @example
 * ```tsx
 * <TeleopPad
 *   linearScale={1.5}
 *   angularScale={2}
 *   onChange={(v) => publish({ linear: { x: v.linear * 1.5 }, angular: { z: v.angular * 2 } })}
 *   className="size-64"
 * />
 * ```
 */
function TeleopPad({
	value,
	defaultValue,
	onChange,
	returnToCenter = true,
	keyboardStep = DEFAULT_KEYBOARD_STEP,
	disabled = false,
	linearScale,
	angularScale,
	label,
	className,
	...props
}: Readonly<TeleopPadProps>) {
	const padRef = React.useRef<HTMLDivElement>(null);
	const [size, setSize] = React.useState({ height: 0, width: 0 });
	const [dragging, setDragging] = React.useState(false);
	const [internal, setInternal] = React.useState(() => normalizeVector(defaultValue));

	const isControlled = value !== undefined;
	const command = isControlled ? normalizeVector(value) : internal;

	// ResizeObserver rather than an on-demand measurement: measuring the element
	// inside the pointer handler would force synchronous layout every frame.
	React.useEffect(() => {
		const node = padRef.current;
		if (node === null || typeof ResizeObserver === "undefined") return;

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (entry === undefined) return;
			setSize({ height: entry.contentRect.height, width: entry.contentRect.width });
		});
		observer.observe(node);
		return () => observer.disconnect();
	}, []);

	const commit = React.useCallback(
		(next: TeleopVector) => {
			if (!isControlled) setInternal(next);
			onChange?.(next);
		},
		[isControlled, onChange],
	);

	const updateFromPointer = React.useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			if (size.width <= 0 || size.height <= 0) return;
			const native = event.nativeEvent;
			commit(
				normalizeVector({
					angular: (native.offsetX / size.width) * 2 - 1,
					linear: 1 - (native.offsetY / size.height) * 2,
				}),
			);
		},
		[commit, size.height, size.width],
	);

	const handlePointerDown = React.useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			if (disabled) return;
			const target = event.currentTarget;
			if (typeof target.setPointerCapture === "function") {
				target.setPointerCapture(event.pointerId);
			}
			setDragging(true);
			updateFromPointer(event);
		},
		[disabled, updateFromPointer],
	);

	const handlePointerMove = React.useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			if (disabled || !dragging) return;
			updateFromPointer(event);
		},
		[disabled, dragging, updateFromPointer],
	);

	const handlePointerUp = React.useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			if (!dragging) return;
			const target = event.currentTarget;
			if (typeof target.releasePointerCapture === "function") {
				target.releasePointerCapture(event.pointerId);
			}
			setDragging(false);
			if (returnToCenter) commit(zeroVector());
		},
		[commit, dragging, returnToCenter],
	);

	const handleLinearInput = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			commit(
				normalizeVector({ angular: command.angular, linear: event.currentTarget.valueAsNumber }),
			);
		},
		[command.angular, commit],
	);

	const handleAngularInput = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			commit(
				normalizeVector({ angular: event.currentTarget.valueAsNumber, linear: command.linear }),
			);
		},
		[command.linear, commit],
	);

	const handleKeyDown = React.useCallback(
		(event: React.KeyboardEvent<HTMLDivElement>) => {
			if (disabled || (event.key !== "Escape" && event.key !== " ")) return;
			event.preventDefault();
			commit(zeroVector());
		},
		[commit, disabled],
	);

	const ariaLabel = label ?? formatTeleopLabel(command);
	const knobX = CENTER + command.angular * PAD_HALF;
	const knobY = CENTER - command.linear * PAD_HALF;
	const knobColor = dragging ? ACTIVE : IDLE;

	return (
		<div
			{...props}
			aria-disabled={disabled || undefined}
			aria-label={ariaLabel}
			className={cn(
				"relative inline-block size-48 select-none rounded-[6px]",
				"has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ring",
				disabled && "opacity-50",
				className,
			)}
			data-slot="teleop-pad"
			onKeyDown={handleKeyDown}
			role="group"
		>
			<div className="absolute inset-0 overflow-hidden rounded-[6px] border border-border bg-card">
				<svg
					aria-hidden="true"
					className="block"
					height="100%"
					viewBox={`0 0 ${VIEW} ${VIEW}`}
					width="100%"
				>
					{PAD_GRID}

					<text
						className="font-mono"
						fill={HINT}
						fontSize={8}
						textAnchor="middle"
						x={CENTER}
						y={14}
					>
						FWD
					</text>
					<text
						className="font-mono"
						fill={HINT}
						fontSize={8}
						textAnchor="middle"
						x={CENTER}
						y={VIEW - 24}
					>
						REV
					</text>
					<text
						className="font-mono"
						dominantBaseline="middle"
						fill={HINT}
						fontSize={8}
						textAnchor="start"
						x={4}
						y={CENTER}
					>
						L
					</text>
					<text
						className="font-mono"
						dominantBaseline="middle"
						fill={HINT}
						fontSize={8}
						textAnchor="end"
						x={VIEW - 4}
						y={CENTER}
					>
						R
					</text>

					{/* Command vector and knob. */}
					<line
						stroke={knobColor}
						strokeLinecap="round"
						strokeOpacity={0.5}
						strokeWidth={2}
						x1={CENTER}
						x2={knobX}
						y1={CENTER}
						y2={knobY}
					/>
					<circle
						cx={knobX}
						cy={knobY}
						fill={knobColor}
						r={KNOB_RADIUS}
						stroke={MARK}
						strokeWidth={1}
					/>

					<text
						className="font-mono"
						fill={MARK}
						fontSize={10}
						textAnchor="start"
						x={6}
						y={VIEW - 6}
					>
						{formatAxis(command.linear, linearScale, "m/s")}
					</text>
					<text
						className="font-mono"
						fill={MARK}
						fontSize={10}
						textAnchor="end"
						x={VIEW - 6}
						y={VIEW - 6}
					>
						{formatAxis(command.angular, angularScale, "rad/s")}
					</text>
				</svg>
			</div>

			{/* Real controls for keyboard and assistive technology. */}
			<input
				aria-label="Linear velocity command"
				className="sr-only"
				disabled={disabled}
				max={1}
				min={-1}
				onChange={handleLinearInput}
				step={INPUT_STEP}
				type="range"
				value={command.linear}
			/>
			<input
				aria-label="Yaw rate command"
				className="sr-only"
				disabled={disabled}
				max={1}
				min={-1}
				onChange={handleAngularInput}
				step={INPUT_STEP}
				type="range"
				value={command.angular}
			/>

			{/* Pointer surface, above the hidden inputs. */}
			<div
				ref={padRef}
				className="absolute inset-0 touch-none"
				data-slot="teleop-pad-surface"
				onPointerCancel={handlePointerUp}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
			/>
		</div>
	);
}

//#endregion

export { TeleopPad };
