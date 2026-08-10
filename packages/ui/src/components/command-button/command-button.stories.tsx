// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the CommandButton component —
 * every state the vehicle can report, plus confirmation and unavailability,
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
 * A destructive command costs a second deliberate press. Disarming in flight is
 * not something an operator should be able to do with one stray click.
 */
export const AwaitingConfirmation: Story = {
	args: { command: "Disarm", confirm: true },
};

/**
 * The same command with its confirming press pending. The shell owns `armed`,
 * so every armed command can be cleared at once the moment the link drops.
 */
export const Armed: Story = {
	args: { ...AwaitingConfirmation.args, armed: true },
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
