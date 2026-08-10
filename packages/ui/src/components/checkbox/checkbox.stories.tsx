// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/react";

import { expect, userEvent, within } from "storybook/test";

import { Label } from "../label";
import { Checkbox } from "./checkbox";

const meta: Meta<typeof Checkbox> = {
	component: Checkbox,
	tags: ["autodocs"],
	title: "Forms/Checkbox",
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

/**
 * The baseline every other state is read against. It carries a label because an
 * unlabelled checkbox is not a simpler demo, it is a broken one — the tick is
 * silent to a screen reader, and a story is the thing consumers copy.
 */
export const Default: Story = {
	render: (args) => (
		<div className="flex items-center gap-2">
			<Checkbox {...args} id="default-notify-dispatch" />
			<Label htmlFor="default-notify-dispatch">Notify dispatch on arrival</Label>
		</div>
	),
};

/**
 * A pre-ticked box is how a form proposes a default on the user's behalf, so it
 * has to be obvious that the choice was made for them and is theirs to undo.
 * That only reads correctly when a label states what has been agreed to — the
 * tick on its own is silent to a screen reader.
 */
export const Checked: Story = {
	args: { defaultChecked: true },
	render: (args) => (
		<div className="flex items-center gap-2">
			<Checkbox {...args} id="checked-share-location" />
			<Label htmlFor="checked-share-location">Share my live location with dispatch</Label>
		</div>
	),
};

/**
 * Unavailable options are dimmed rather than hidden precisely so the user can
 * still find out what they are missing and why. The label carries that
 * explanation, so a disabled box without one leaves a dead end.
 */
export const Disabled: Story = {
	args: { disabled: true },
	render: (args) => (
		<div className="flex items-center gap-2">
			<Checkbox {...args} id="disabled-offline-maps" />
			<Label className="opacity-50" htmlFor="disabled-offline-maps">
				Download offline maps (unavailable on this device)
			</Label>
		</div>
	),
};

/**
 * The most demanding combination: an option locked on by policy. The tick and
 * the dimming have to survive together, or it collapses into looking merely
 * editable or merely off — and the label is the only place the user learns the
 * setting is enforced rather than broken.
 */
export const CheckedDisabled: Story = {
	args: { defaultChecked: true, disabled: true },
	render: (args) => (
		<div className="flex items-center gap-2">
			<Checkbox {...args} id="checked-disabled-audit-trail" />
			<Label className="opacity-50" htmlFor="checked-disabled-audit-trail">
				Keep an audit trail of every dispatch (required by policy)
			</Label>
		</div>
	),
};

export const WithLabel: Story = {
	render: () => (
		<div className="flex items-center gap-2">
			<Checkbox id="terms" />
			<Label htmlFor="terms">Accept terms and conditions</Label>
		</div>
	),
};

/**
 * The interaction story drove an unlabelled control, which is the one thing a
 * keyboard or screen-reader user cannot do with it.
 */
export const Toggle: Story = {
	render: (args) => (
		<div className="flex items-center gap-2">
			<Checkbox {...args} id="toggle-confirm-waypoint" />
			<Label htmlFor="toggle-confirm-waypoint">Confirm waypoint before executing</Label>
		</div>
	),
	play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
		const canvas = within(canvasElement);
		const checkbox = canvas.getByRole("checkbox");
		await expect(checkbox).not.toBeChecked();
		await userEvent.click(checkbox);
		await expect(checkbox).toBeChecked();
	},
};

export const Form: Story = {
	render: () => (
		<div className="grid gap-3 w-64">
			<p className="text-sm font-medium">Notify me when:</p>
			{[
				{ id: "mission-start", label: "A mission starts" },
				{ checked: true, id: "drone-return", label: "A drone returns to base" },
				{
					checked: true,
					id: "incident-resolved",
					label: "An incident is resolved",
				},
				{ id: "weekly-report", label: "Weekly summary is ready" },
			].map(({ checked, id, label }) => (
				<div className="flex items-center gap-2" key={id}>
					<Checkbox defaultChecked={checked} id={id} />
					<Label htmlFor={id}>{label}</Label>
				</div>
			))}
		</div>
	),
};
