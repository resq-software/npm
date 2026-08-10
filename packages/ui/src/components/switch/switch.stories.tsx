// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the Switch component — showcases its
 * variants and composition for visual review and Chromatic regression.
 *
 * @module @resq-systems/ui/components/switch/switch.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import { Label } from "../label";
import { Switch } from "./switch";

const meta: Meta<typeof Switch> = {
	component: Switch,
	tags: ["autodocs"],
	title: "Forms/Switch",
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {};

/**
 * The on state is the only cue that the setting behind a switch is live, so it
 * is reviewed beside its label to confirm the track and thumb still read as
 * "on" at a glance in a dense settings panel.
 */
export const Checked: Story = {
	args: { defaultChecked: true },
	render: (args) => (
		<div className="flex items-center gap-2">
			<Switch id="switch-checked" {...args} />
			<Label htmlFor="switch-checked">Perimeter floodlights</Label>
		</div>
	),
};

/**
 * A disabled switch has to read as unavailable rather than merely off, and the
 * dimming must carry across to its label. `Label` is placed after the switch so
 * its `peer-disabled` styling fires — the composition consumers should copy.
 */
export const Disabled: Story = {
	args: { disabled: true },
	render: (args) => (
		<div className="flex items-center gap-2">
			<Switch id="switch-disabled" {...args} />
			<Label htmlFor="switch-disabled">Beacon strobe</Label>
		</div>
	),
};

export const WithLabel: Story = {
	render: () => (
		<div className="flex items-center gap-2">
			<Switch id="airplane-mode" />
			<Label htmlFor="airplane-mode">Airplane Mode</Label>
		</div>
	),
};

export const SettingsPanel: Story = {
	render: () => (
		<div className="grid gap-4 w-72">
			<p className="text-sm font-semibold">Notifications</p>
			{[
				{
					checked: true,
					description: "Receive alerts on your device",
					id: "push",
					label: "Push notifications",
				},
				{
					checked: false,
					description: "Daily summary of activity",
					id: "email",
					label: "Email digest",
				},
				{
					checked: true,
					description: "Critical incidents only",
					id: "sms",
					label: "SMS alerts",
				},
			].map(({ checked, description, id, label }) => (
				<div className="flex items-center justify-between gap-4" key={id}>
					<div>
						<Label className="font-medium" htmlFor={id}>
							{label}
						</Label>
						<p className="text-xs text-muted-foreground">{description}</p>
					</div>
					<Switch defaultChecked={checked} id={id} />
				</div>
			))}
		</div>
	),
};
