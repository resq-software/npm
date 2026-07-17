// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the Textarea component — showcases its
 * variants and composition for visual review and Chromatic regression.
 *
 * @module @resq-systems/ui/components/textarea/textarea.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import * as React from "react";

import { Label } from "../label";
import { Textarea } from "./textarea";

const meta: Meta<typeof Textarea> = {
	component: Textarea,
	tags: ["autodocs"],
	title: "Forms/Textarea",
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
	args: { placeholder: "Type your message here." },
};

export const Disabled: Story = {
	args: {
		defaultValue: "Locked incident notes cannot be edited after submission.",
		disabled: true,
		placeholder: "This field is read-only.",
	},
};

export const Invalid: Story = {
	args: {
		"aria-invalid": true,
		defaultValue: "x",
		placeholder: "Incident description",
	},
};

export const WithLabel: Story = {
	render: () => (
		<div className="grid gap-1.5 w-80">
			<Label htmlFor="notes">Mission notes</Label>
			<Textarea
				id="notes"
				placeholder="Describe the situation, zone boundaries, and any hazards…"
				rows={4}
			/>
		</div>
	),
};

function CharacterCountDemo() {
	const max = 280;
	const [value, setValue] = React.useState("");
	return (
		<div className="grid gap-1.5 w-80">
			<Label htmlFor="broadcast">Broadcast message</Label>
			<Textarea
				id="broadcast"
				maxLength={max}
				onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value)}
				placeholder="Enter message to broadcast to all responders…"
				rows={3}
				value={value}
			/>
			<p className="text-xs text-muted-foreground text-right">
				{value.length}/{max}
			</p>
		</div>
	);
}

export const CharacterCount: Story = {
	render: () => <CharacterCountDemo />,
};
