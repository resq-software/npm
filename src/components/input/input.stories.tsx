// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/react";

import { expect, userEvent, within } from "storybook/test";

import { Label } from "../label";
import { Input } from "./input";

const meta: Meta<typeof Input> = {
	argTypes: {
		size: { control: "select", options: ["default", "sm"] },
		type: {
			control: "select",
			options: ["text", "email", "password", "search", "number", "tel", "url"],
		},
	},
	component: Input,
	tags: ["autodocs"],
	title: "Forms/Input",
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
	args: { placeholder: "Enter text…" },
};

export const Small: Story = {
	args: { placeholder: "Small input", size: "sm" },
};

export const Email: Story = {
	args: { placeholder: "you@example.com", type: "email" },
};

export const Password: Story = {
	args: { placeholder: "Enter password", type: "password" },
};

export const Search: Story = {
	args: { placeholder: "Search missions…", type: "search" },
};

export const Number: Story = {
	args: { max: 100, min: 0, placeholder: "0", type: "number" },
};

export const WithValue: Story = {
	args: { defaultValue: "Operation Echo", placeholder: "Mission name" },
};

export const Disabled: Story = {
	args: { disabled: true, placeholder: "Read-only field" },
};

export const Invalid: Story = {
	args: {
		"aria-invalid": true,
		defaultValue: "not-an-email",
		placeholder: "you@example.com",
	},
};

export const WithFile: Story = {
	args: { type: "file" },
};

export const WithLabel: Story = {
	render: () => (
		<div className="grid gap-1.5 w-72">
			<Label htmlFor="callsign">Callsign</Label>
			<Input id="callsign" placeholder="e.g. BRAVO-7" />
		</div>
	),
};

export const Typing: Story = {
	play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
		const canvas = within(canvasElement);
		const input = canvas.getByRole("textbox");
		await userEvent.type(input, "EAGLE-3");
		await expect(input).toHaveValue("EAGLE-3");
	},
};
