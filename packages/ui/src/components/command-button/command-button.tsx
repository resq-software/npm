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
 * @fileoverview CommandButton — a control that never lies about what happened.
 *
 * Optimistic UI is correct for a web form and wrong for a vehicle. When a
 * button turns green the instant it is clicked, an operator on a link with
 * two-second latency reads "the hatch is closed" when the truth is "a request
 * to close the hatch has left the building". The two readings diverge exactly
 * when it matters — during the dropout.
 *
 * So state comes from the vehicle's acknowledgement and nowhere else:
 * `idle` → `sending` → `acknowledged` | `rejected` | `timed-out`. No click
 * alone can drive a transition past `sending`, and `sending` is worded as a
 * request in flight rather than a completed act.
 *
 * `confirm` marks a destructive command — disarm, release, surface — and makes
 * it cost a sustained hold. It replaces an earlier press-twice guard that put
 * both presses in the same pixels: a double-click cleared that in about two
 * hundred milliseconds, and a native button activates on Enter *keydown*, which
 * the OS repeats while the key stays down, so one leaned-on Enter key disarmed
 * a vehicle in flight. A dwell is reachable by neither. The operator has to
 * keep holding for `holdMs`, letting go early sends nothing at all, and a
 * dialog is avoided on purpose because a dialog trains people to click through.
 *
 * **Stateful, deliberately.** This file used to say "stateless and hook-free",
 * and that was a real virtue: the render was a pure function of props, so the
 * shell could never disagree with the control about what was armed. Elapsed
 * time cannot be a prop. Lifting the dwell to the caller would mean every
 * console shipping its own timer, and the interesting bugs here — a repeat
 * keydown restarting the count, a dwell that outlives the button and fires at a
 * vehicle nobody is watching — would be re-implemented, differently, at every
 * call site. So the timing lives here once, where it can be tested once. What
 * stays lifted is everything the vehicle owns: `state` is still reported, never
 * inferred, and the local state is discarded — not reconciled — the moment the
 * command goes inert.
 *
 * @module @resq-systems/ui/components/command-button/command-button
 */

"use client";

import * as React from "react";

import { cn } from "../../lib/utils.js";

//#region Constants

/** Dwell for a destructive command when the caller names none. */
const DEFAULT_HOLD_MS = 800;

/** Fill updates across one dwell — enough to read as movement, not as a jump. */
const HOLD_STEPS = 20;

/**
 * Reduced motion keeps the feedback and drops the smoothness: four visible
 * jumps instead of twenty. Removing the bar entirely would leave a
 * motion-sensitive operator holding a destructive command with no idea how much
 * longer, which is a worse deal than the movement they asked to avoid.
 */
const REDUCED_MOTION_STEPS = 4;

/** Hold-bar geometry, in SVG user units — which are also its CSS pixels. */
const BAR_WIDTH = 32;
const BAR_HEIGHT = 4;

/** The two keys a native button activates on, and so the two that can dwell. */
const HOLD_KEYS = new Set([" ", "Enter"]);

/** The bar is drawn, not spoken, so the dwell is announced separately. */
const HOLD_ANNOUNCEMENT = "Holding to confirm";

/**
 * An operator who lets go early has to hear that nothing went. Silence here
 * reads identically to a command that was sent and is still waiting.
 */
const RELEASE_ANNOUNCEMENT = "Hold released, command not sent";
const INTERRUPT_ANNOUNCEMENT = "Hold interrupted, command not sent";

//#endregion

//#region Types

/** Where a command has actually got to. Never inferred from the click. */
export type CommandState = "idle" | "sending" | "acknowledged" | "rejected" | "timed-out";

const STATE_WORD: Record<CommandState, string> = {
	acknowledged: "Acknowledged",
	idle: "",
	rejected: "Rejected",
	sending: "Sending",
	"timed-out": "No response",
};

/**
 * Fill tokens on the border, `-text` variants on the word. The raw tokens are
 * 3:1 UI-component colours and fall to 2.81:1 as text on `bg-card` in the light
 * theme — and the word carries the whole distinction here, since "Rejected" and
 * "No response" are not separable by hue.
 */
const STATE_TONE: Record<CommandState, string> = {
	acknowledged: "border-success text-success-text",
	idle: "border-border text-foreground",
	rejected: "border-destructive text-destructive-text",
	sending: "border-warning text-warning-text",
	"timed-out": "border-destructive text-destructive-text",
};

export interface CommandButtonProps extends Omit<React.ComponentProps<"button">, "children"> {
	/** What the command does, e.g. `"Return to launch"`. */
	command: string;
	/** Where the command has got to, as reported by the vehicle. */
	state?: CommandState;
	/**
	 * Marks the command destructive, so it takes a sustained hold instead of a
	 * click. A press that ends before the dwell is up sends nothing.
	 */
	confirm?: boolean;
	/**
	 * How long the hold must last, in milliseconds. Defaults to 800. Ignored
	 * without `confirm`.
	 */
	holdMs?: number;
	/** Why the command is unavailable — spoken, not merely implied by greying. */
	unavailableReason?: string;
	/** Overrides the auto-generated `aria-label`. */
	label?: string;
}

//#endregion

//#region Helpers

/** Build the accessible name: what it does, where it got to, why it cannot. */
function formatCommandLabel(
	props: Readonly<Pick<CommandButtonProps, "command" | "confirm" | "state" | "unavailableReason">>,
): string {
	if (props.unavailableReason !== undefined) {
		return `${props.command}, unavailable, ${props.unavailableReason}`;
	}

	const parts = [props.command];
	if (props.confirm === true) parts.push("destructive, hold to confirm");

	const state = props.state ?? "idle";
	if (state !== "idle") parts.push(STATE_WORD[state].toLowerCase());

	return parts.join(", ");
}

/**
 * A dwell of zero is not a dwell. A caller who computes `holdMs` from config
 * and gets `NaN` or a negative back would otherwise ship a destructive command
 * that fires on contact, so an unusable value falls back rather than propagates.
 */
function resolveHoldMs(holdMs: number | undefined): number {
	return typeof holdMs === "number" && Number.isFinite(holdMs) && holdMs > 0
		? holdMs
		: DEFAULT_HOLD_MS;
}

//#endregion

//#region Component

/**
 * A command control whose appearance follows the vehicle, not the click.
 *
 * @example
 * ```tsx
 * <CommandButton
 *   command="Disarm"
 *   confirm
 *   holdMs={1200}
 *   onClick={sendDisarm}
 *   state={disarmState}
 * />
 * ```
 */
function CommandButton({
	command,
	state = "idle",
	confirm,
	holdMs,
	unavailableReason,
	label,
	className,
	disabled,
	onBlur,
	onClick,
	onKeyDown,
	onKeyUp,
	onPointerCancel,
	onPointerDown,
	onPointerLeave,
	onPointerUp,
	ref,
	...props
}: Readonly<CommandButtonProps>) {
	const buttonRef = React.useRef<HTMLButtonElement>(null);
	const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
	// The step count drives the timer and the display drives the bar. Keeping the
	// authoritative count in a ref means completion is decided by the interval
	// callback rather than inside a state updater, which React is free to run
	// twice.
	const stepRef = React.useRef(0);
	const dwellCompleteRef = React.useRef(false);
	const [dwellStep, setDwellStep] = React.useState<number | null>(null);
	const [announcement, setAnnouncement] = React.useState("");
	const [reducedMotion, setReducedMotion] = React.useState(false);

	const guarded = confirm === true;
	const unavailable = unavailableReason !== undefined;
	// Both reasons the control refuses to act, and both reasons a dwell already
	// under way has to be thrown away rather than resumed.
	const refuses = unavailable || state === "sending";
	const steps = reducedMotion ? REDUCED_MOTION_STEPS : HOLD_STEPS;

	// The caller's own ref would otherwise be dropped on the floor by ours, and a
	// console that cannot focus its E-stop programmatically has lost something it
	// is entitled to.
	const attachRef = React.useCallback(
		(node: HTMLButtonElement | null) => {
			buttonRef.current = node;
			if (typeof ref === "function") {
				ref(node);
				return;
			}
			if (ref !== null && ref !== undefined) ref.current = node;
		},
		[ref],
	);

	const stopDwell = React.useCallback(() => {
		if (timerRef.current !== null) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}
		stepRef.current = 0;
		setDwellStep(null);
	}, []);

	// A dwell that outlived its button would put a command on a vehicle whose
	// console has already been torn down — nobody is watching the acknowledgement
	// that comes back.
	React.useEffect(() => stopDwell, [stopDwell]);

	React.useEffect(() => {
		if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

		const query = window.matchMedia("(prefers-reduced-motion: reduce)");
		setReducedMotion(query.matches);

		const handleChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
		query.addEventListener("change", handleChange);
		return () => query.removeEventListener("change", handleChange);
	}, []);

	// The link can drop with a finger already down. Counting on towards a release
	// the operator began under information that has since gone stale is precisely
	// the press-through this control exists to prevent, so the dwell is abandoned
	// and has to be started again against the new reading.
	React.useEffect(() => {
		if (!refuses || timerRef.current === null) return;
		stopDwell();
		setAnnouncement(INTERRUPT_ANNOUNCEMENT);
	}, [refuses, stopDwell]);

	const completeDwell = React.useCallback(() => {
		stopDwell();
		setAnnouncement("");
		// Re-enter through the button's own activation path instead of fabricating
		// an event: the caller's `onClick` gets a real click whose target really is
		// this button, and there stays exactly one route by which a command leaves.
		dwellCompleteRef.current = true;
		buttonRef.current?.click();
		dwellCompleteRef.current = false;
	}, [stopDwell]);

	const startDwell = React.useCallback(() => {
		if (!guarded || refuses || disabled === true || timerRef.current !== null) return;

		stepRef.current = 0;
		setDwellStep(0);
		setAnnouncement(HOLD_ANNOUNCEMENT);

		const dwell = resolveHoldMs(holdMs);
		timerRef.current = setInterval(
			() => {
				stepRef.current += 1;
				if (stepRef.current >= steps) {
					completeDwell();
					return;
				}
				setDwellStep(stepRef.current);
			},
			Math.max(1, Math.round(dwell / steps)),
		);
	}, [completeDwell, disabled, guarded, holdMs, refuses, steps]);

	const abandonDwell = React.useCallback(() => {
		if (timerRef.current === null) return;
		stopDwell();
		setAnnouncement(RELEASE_ANNOUNCEMENT);
	}, [stopDwell]);

	const handlePointerDown = React.useCallback(
		(event: React.PointerEvent<HTMLButtonElement>) => {
			// Secondary buttons are excluded because the context menu that follows
			// swallows the release, leaving a dwell running under a menu.
			if (event.button === 0) startDwell();
			onPointerDown?.(event);
		},
		[onPointerDown, startDwell],
	);

	const handlePointerUp = React.useCallback(
		(event: React.PointerEvent<HTMLButtonElement>) => {
			abandonDwell();
			onPointerUp?.(event);
		},
		[abandonDwell, onPointerUp],
	);

	const handlePointerLeave = React.useCallback(
		(event: React.PointerEvent<HTMLButtonElement>) => {
			// Sliding off the control is the documented way to back out of a hold, so
			// it has to abandon rather than keep counting off-target.
			abandonDwell();
			onPointerLeave?.(event);
		},
		[abandonDwell, onPointerLeave],
	);

	const handlePointerCancel = React.useCallback(
		(event: React.PointerEvent<HTMLButtonElement>) => {
			abandonDwell();
			onPointerCancel?.(event);
		},
		[abandonDwell, onPointerCancel],
	);

	const handleKeyDown = React.useCallback(
		(event: React.KeyboardEvent<HTMLButtonElement>) => {
			if (guarded && HOLD_KEYS.has(event.key)) {
				// `event.repeat` is the whole point. A held key streams keydown events
				// at the OS repeat rate, and each one would otherwise restart the count
				// — so a leaned-on Enter would either never finish or, worse, finish on
				// every repeat. One press starts one dwell.
				//
				// The default action goes with it: Enter's is the very activation this
				// control is taking over, and Space's is scrolling the console away
				// from the command being held.
				event.preventDefault();
				if (!event.repeat) startDwell();
			}
			onKeyDown?.(event);
		},
		[guarded, onKeyDown, startDwell],
	);

	const handleKeyUp = React.useCallback(
		(event: React.KeyboardEvent<HTMLButtonElement>) => {
			if (guarded && HOLD_KEYS.has(event.key)) abandonDwell();
			onKeyUp?.(event);
		},
		[abandonDwell, guarded, onKeyUp],
	);

	const handleBlur = React.useCallback(
		(event: React.FocusEvent<HTMLButtonElement>) => {
			// Focus can leave mid-hold — an alt-tab, a shell that moves focus on an
			// alert — and the keyup then lands in another window and never reaches us.
			// Without this the dwell would quietly run to term and command a vehicle
			// the operator is no longer looking at.
			abandonDwell();
			onBlur?.(event);
		},
		[abandonDwell, onBlur],
	);

	const handleClick = React.useCallback(
		(event: React.MouseEvent<HTMLButtonElement>) => {
			// Reachable and readable, but inert: `aria-disabled` alone does not
			// stop activation.
			//
			// `sending` is inert for a different and sharper reason. This control
			// exists for links where an acknowledgement takes seconds, so the
			// interval where nothing appears to have happened is exactly the
			// interval an operator presses again — and a second press would put a
			// second RETURN_TO_LAUNCH on the vehicle. A request in flight is not a
			// request you may repeat.
			if (refuses) {
				event.preventDefault();
				return;
			}

			// A destructive command leaves only by way of a completed dwell. Every
			// other click arriving here is one of the two the press-twice guard used
			// to honour: a real one, or the one the browser raises from a keypress.
			if (guarded && !dwellCompleteRef.current) {
				event.preventDefault();
				return;
			}

			dwellCompleteRef.current = false;
			onClick?.(event);
		},
		[guarded, onClick, refuses],
	);

	const word = STATE_WORD[state];
	const holding = dwellStep !== null;
	const fillWidth = dwellStep === null ? 0 : Math.round((dwellStep / steps) * BAR_WIDTH);

	return (
		<button
			{...props}
			ref={attachRef}
			// `aria-disabled`, not the native attribute: a natively disabled button
			// leaves the tab order and is skipped by sequential screen-reader
			// navigation, so the reason it carries would never actually be read out —
			// the exact failure this prop exists to prevent. The native attribute is
			// reserved for the caller's own `disabled`, which makes no such promise.
			aria-disabled={unavailable ? true : undefined}
			// The name says the command needs holding and then stops moving. A name
			// that changed under the operator would be re-announced mid-dwell by the
			// screen readers that watch for it, talking over the live region below —
			// which is the thing actually reporting the hold.
			aria-label={label ?? formatCommandLabel({ command, confirm, state, unavailableReason })}
			className={cn(
				"flex min-w-0 items-center gap-2 border bg-card px-2 py-1 text-left font-mono text-[11px] uppercase",
				"focus-visible:ring-2 focus-visible:ring-ring",
				// Only destructive commands opt out of touch scrolling and long-press
				// selection: a browser that decides a press was a scroll cancels the
				// pointer stream, which would abandon the dwell under the operator's
				// own finger.
				guarded && "touch-none select-none",
				STATE_TONE[state],
				holding && "border-destructive text-destructive-text",
				unavailable && "opacity-45",
				className,
			)}
			data-confirm={guarded ? "" : undefined}
			data-holding={holding ? "" : undefined}
			data-slot="command-button"
			data-state={state}
			disabled={disabled === true}
			onBlur={handleBlur}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			onKeyUp={handleKeyUp}
			onPointerCancel={handlePointerCancel}
			onPointerDown={handlePointerDown}
			onPointerLeave={handlePointerLeave}
			onPointerUp={handlePointerUp}
			type="button"
		>
			<span className="min-w-0 flex-1 truncate">{command}</span>

			{guarded ? (
				// Geometry, not CSS: the fill is a `width` attribute on a `rect`, so
				// the dwell can be drawn at an arbitrary `holdMs` without a style
				// write and without animating a layout-bound property.
				//
				// The raw `destructive` token is right here and wrong on a word: this
				// is a 3:1 UI shape, not text.
				<svg
					aria-hidden="true"
					className="h-1 w-8 shrink-0"
					data-slot="command-button-hold"
					height={BAR_HEIGHT}
					viewBox={`0 0 ${BAR_WIDTH} ${BAR_HEIGHT}`}
					width={BAR_WIDTH}
				>
					<rect className="fill-border" height={BAR_HEIGHT} width={BAR_WIDTH} x={0} y={0} />
					<rect className="fill-destructive" height={BAR_HEIGHT} width={fillWidth} x={0} y={0} />
				</svg>
			) : null}

			{word === "" ? null : (
				<span className="shrink-0 text-[9px]" data-slot="command-button-state">
					{word}
				</span>
			)}

			{guarded ? (
				<span className="sr-only" data-slot="command-button-hold-status" role="status">
					{announcement}
				</span>
			) : null}
		</button>
	);
}

//#endregion

export { CommandButton };
