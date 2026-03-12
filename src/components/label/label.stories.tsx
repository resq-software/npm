// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/react";

import { Checkbox } from "../checkbox";
import { Input } from "../input";
import { Label } from "./label";

const meta: Meta<typeof Label> = {
	component: Label,
	tags: ["autodocs"],
	title: "Forms/Label",
};

export default meta;
type Story = StoryObj<typeof Label>;

export const Default: Story = {
	args: { children: "Mission name" },
};

export const WithInput: Story = {
	render: () => (
		<div className="grid gap-1.5">
			<Label htmlFor="callsign">Callsign</Label>
			<Input id="callsign" placeholder="e.g. BRAVO-7" />
		</div>
	),
};

export const Required: Story = {
	render: () => (
		<div className="grid gap-1.5">
			<Label htmlFor="zone">
				Zone
				<span aria-hidden className="text-destructive ml-0.5">
					*
				</span>
			</Label>
			<Input id="zone" placeholder="e.g. Grid 4B" required />
		</div>
	),
};

export const WithCheckbox: Story = {
	render: () => (
		<div className="flex items-center gap-2">
			<Checkbox id="confirm" />
			<Label htmlFor="confirm">I confirm this mission data is accurate</Label>
		</div>
	),
};

export const Disabled: Story = {
	render: () => (
		<div className="grid gap-1.5">
			<Label className="opacity-50" htmlFor="readonly-field">
				Read-only field
			</Label>
			<Input defaultValue="Locked value" disabled id="readonly-field" />
		</div>
	),
};
