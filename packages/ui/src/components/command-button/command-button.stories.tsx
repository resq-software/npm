// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the CommandButton component —
 * every state the vehicle can report, plus hold-to-confirm and unavailability,
 * for visual review and Chromatic regression.
 *
 * @module @resq-systems/ui/components/command-button/command-button.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import { CommandButton } from "./command-button";

const meta: Meta<typeof CommandButton> = {
	component: CommandButton,
	tags: ["autodocs"],
	title: "Console/Command Button",
};

export default meta;
type Story = StoryObj<typeof CommandButton>;

/**
 * The resting state, and the only one a click can leave on its own. Pressing
 * this button reaches `sending` and stops there: the remaining states belong to
 * the vehicle. Optimistic UI on a two-second link would tell the operator the
 * act completed when all that happened is that the request left, and the two
 * readings diverge exactly during the dropout that makes the answer matter.
 */
export const Idle: Story = {
	args: { command: "Return to launch" },
};

/** A request in flight. Worded as a request, never as a completed act. */
export const Sending: Story = {
	args: { ...Idle.args, state: "sending" },
};

/** The vehicle answered. This is the only state that claims the act happened. */
export const Acknowledged: Story = {
	args: { ...Idle.args, state: "acknowledged" },
};

/**
 * The vehicle answered no. A refusal is information — something aboard declined
 * — and must not be mistaken for the silence below it.
 */
export const Rejected: Story = {
	args: { ...Idle.args, state: "rejected" },
};

/**
 * Nothing came back. The command may have run, may never have arrived, and the
 * console does not know which — so it says no response rather than guessing.
 */
export const TimedOut: Story = {
	args: { ...Idle.args, state: "timed-out" },
};

/**
 * A destructive command costs a sustained hold. Press and keep holding: the bar
 * fills, and the command leaves only when it is full. Let go early and nothing
 * is sent at all — which the control says aloud, because silence reads exactly
 * like a command that went and is still waiting.
 *
 * The bar is the point of the pattern. A dialog would ask the same question in
 * a different place, and a dialog in the way of a routine action trains people
 * to click through it; a hold cannot be cleared by reflex, and it cannot be
 * reached by a double-click or by leaning on the Enter key.
 */
export const HoldToConfirm: Story = {
	args: { command: "Disarm", confirm: true },
};

/**
 * A longer dwell for a command with no undo. Two seconds is a long time to hold
 * a button, which is the entire argument for spending it here and nowhere else.
 */
export const LongHold: Story = {
	args: { command: "Release payload", confirm: true, holdMs: 2000 },
};

/**
 * A destructive command whose request is already in flight. The dwell is inert
 * while `sending`, and a hold already under way is thrown away rather than
 * resumed the moment the command goes inert — an operator who began holding
 * under one reading of the link should not release under another.
 */
export const HoldWhileSending: Story = {
	args: { ...HoldToConfirm.args, state: "sending" },
};

/**
 * Greying alone tells a screen-reader user nothing. This stays in the tab order
 * via `aria-disabled` rather than the native attribute, so the reason is
 * actually announced instead of being skipped along with the button.
 */
export const Unavailable: Story = {
	args: { command: "Release payload", unavailableReason: "no GPS fix" },
};

/**
 * The other kind of unavailable, and the reason the component keeps the two
 * apart. The native attribute drops the control out of the tab order entirely,
 * so a keyboard operator never lands on it and hears no reason — right for a
 * command this vehicle simply does not carry, wrong for one that is merely
 * blocked at this moment. Compare with the story above, which stays reachable
 * and speaks its reason aloud.
 */
export const NativelyDisabled: Story = {
	args: { command: "Release payload", disabled: true },
};

/**
 * Operators name commands after the procedure, not after the space on the
 * panel, and that space is narrow. The name truncates instead of wrapping, so a
 * long command cannot push the state word off the end of the control — the part
 * an operator has to keep reading through a dropout.
 */
export const LongCommand: Story = {
	args: {
		className: "w-56",
		command: "Deploy secondary recovery parachute and release the main canopy",
		state: "sending",
	},
};
