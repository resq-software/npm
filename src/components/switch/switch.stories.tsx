// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

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

export const Checked: Story = {
	args: { defaultChecked: true },
};

export const Disabled: Story = {
	args: { disabled: true },
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
