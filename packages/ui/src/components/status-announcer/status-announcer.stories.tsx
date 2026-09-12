// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the StatusAnnouncer component —
 * announcement states for visual review and Chromatic regression.
 *
 * The component is the console's single live region and is visually hidden, so
 * it draws nothing on the canvas by design. That would leave three identical
 * snapshots, so the decorator reads each story's live args and prints the
 * message and urgency it passes down. The caption is what differs between
 * stories and what Chromatic can actually diff; the component's real output is
 * what a screen reader says when the message changes.
 *
 * @module @resq-systems/ui/components/status-announcer/status-announcer.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import { StatusAnnouncer, type StatusAnnouncerProps } from "./status-announcer";

const meta: Meta<typeof StatusAnnouncer> = {
	component: StatusAnnouncer,
	decorators: [
		(Story, { args }: { args: StatusAnnouncerProps }) => (
			<div className="max-w-prose rounded-md border border-dashed p-4 text-sm text-muted-foreground">
				<p>
					The live region itself draws nothing. It is visually hidden but still in the accessibility
					tree, so a screen reader reads its message aloud each time the text changes — politely, or
					interrupting, depending on the urgency. The readout below mirrors what this story hands
					the component.
				</p>
				<dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono">
					<dt>urgency</dt>
					<dd className="text-foreground">{args.urgency ?? "polite"}</dd>
					<dt>message</dt>
					<dd className="text-foreground">
						{args.message ? args.message : "(empty — mounted, nothing said yet)"}
					</dd>
				</dl>
				<Story />
			</div>
		),
	],
	tags: ["autodocs"],
	title: "Console/Status Announcer",
};

export default meta;
type Story = StoryObj<typeof StatusAnnouncer>;

/**
 * Most of what the console has to say can wait a sentence. Polite queues behind
 * whatever is being read, so an operator is never cut off mid-word to be told
 * something they were about to see anyway.
 */
export const RoutineUpdate: Story = {
	args: { message: "Link restored on channel 2", urgency: "polite" },
};

/**
 * Interrupting is a cost, and it is worth paying exactly once: when the vehicle
 * has taken an action nobody asked for. Anything less urgent that borrows
 * `assertive` teaches operators to tune out the one announcement that matters.
 */
export const FailsafeTriggered: Story = {
	args: {
		...RoutineUpdate.args,
		message: "Failsafe triggered — vehicle holding position",
		urgency: "assertive",
	},
};

/**
 * The region has to already be in the DOM before the message changes. Mount it
 * together with its first announcement and that announcement is frequently
 * missed outright — so the shell renders this empty state from the start and
 * only ever varies the text inside it.
 */
export const MountedEmpty: Story = {
	args: { ...RoutineUpdate.args, message: "" },
};
