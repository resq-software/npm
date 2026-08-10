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
 * `confirm` exists because destructive commands — disarm, release, surface —
 * should cost a second deliberate action. The armed state is owned by the
 * caller rather than stashed here, so the shell can disarm every command at
 * once the moment the link drops.
 *
 * Stateless and hook-free.
 *
 * @module @resq-systems/ui/components/command-button/command-button
 */

import type * as React from "react";

import { cn } from "../../lib/utils.js";

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
	 * Marks the command destructive, so it takes a second deliberate press. Pair
	 * with `armed`, which the shell owns and can clear for every command at once
	 * when the link drops.
	 */
	confirm?: boolean;
	/** Whether a destructive command is waiting for its confirming press. */
	armed?: boolean;
	/** Why the command is unavailable — spoken, not merely implied by greying. */
	unavailableReason?: string;
	/** Overrides the auto-generated `aria-label`. */
	label?: string;
}

//#endregion

//#region Helpers

/** Build the accessible name: what it does, where it got to, why it cannot. */
function formatCommandLabel(props: Readonly<CommandButtonProps>): string {
	if (props.unavailableReason !== undefined) {
		return `${props.command}, unavailable, ${props.unavailableReason}`;
	}

	const parts = [props.command];
	if (props.confirm === true) {
		parts.push(
			props.armed === true ? "press again to confirm" : "destructive, confirmation required",
		);
	}

	const state = props.state ?? "idle";
	if (state !== "idle") parts.push(STATE_WORD[state].toLowerCase());

	return parts.join(", ");
}

//#endregion

//#region Component

/**
 * A command control whose appearance follows the vehicle, not the click.
 *
 * @example
 * ```tsx
 * <CommandButton
 *   armed={armed}
 *   command="Return to launch"
 *   confirm
 *   onClick={arm}
 *   state={rtlState}
 * />
 * ```
 */
function CommandButton({
	command,
	state = "idle",
	confirm,
	armed,
	unavailableReason,
	label,
	className,
	disabled,
	onClick,
	...props
}: Readonly<CommandButtonProps>) {
	const unavailable = unavailableReason !== undefined;
	const word = STATE_WORD[state];
	const isArmed = confirm === true && armed === true;

	return (
		<button
			{...props}
			// `aria-disabled`, not the native attribute: a natively disabled button
			// leaves the tab order and is skipped by sequential screen-reader
			// navigation, so the reason it carries would never actually be read out —
			// the exact failure this prop exists to prevent. The native attribute is
			// reserved for the caller's own `disabled`, which makes no such promise.
			aria-disabled={unavailable ? true : undefined}
			aria-label={
				label ?? formatCommandLabel({ armed, command, confirm, state, unavailableReason })
			}
			className={cn(
				"flex min-w-0 items-center gap-2 border bg-card px-2 py-1 text-left font-mono text-[11px] uppercase",
				"focus-visible:ring-2 focus-visible:ring-ring",
				STATE_TONE[state],
				isArmed && "border-destructive text-destructive",
				unavailable && "opacity-45",
				className,
			)}
			data-armed={isArmed ? "" : undefined}
			data-confirm={confirm === true ? "" : undefined}
			data-slot="command-button"
			data-state={state}
			disabled={disabled === true}
			onClick={(event) => {
				// Reachable and readable, but inert: `aria-disabled` alone does not
				// stop activation.
				//
				// `sending` is inert for a different and sharper reason. This control
				// exists for links where an acknowledgement takes seconds, so the
				// interval where nothing appears to have happened is exactly the
				// interval an operator presses again — and a second press would put a
				// second RETURN_TO_LAUNCH on the vehicle. A request in flight is not a
				// request you may repeat.
				if (unavailable || state === "sending") {
					event.preventDefault();
					return;
				}
				onClick?.(event);
			}}
			type="button"
		>
			<span className="min-w-0 flex-1 truncate">{command}</span>

			{isArmed ? (
				<span className="shrink-0 text-[9px]" data-slot="command-button-confirm">
					Confirm?
				</span>
			) : null}

			{word === "" ? null : (
				<span className="shrink-0 text-[9px]" data-slot="command-button-state">
					{word}
				</span>
			)}
		</button>
	);
}

//#endregion

export { CommandButton };
