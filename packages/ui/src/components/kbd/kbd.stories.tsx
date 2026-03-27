// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/react";

import { Kbd, KbdGroup } from "./kbd";

const meta: Meta<typeof Kbd> = {
	component: Kbd,
	tags: ["autodocs"],
	title: "Display/Kbd",
};

export default meta;
type Story = StoryObj<typeof Kbd>;

export const Default: Story = {
	args: { children: "⌘" },
};

export const Shortcut: Story = {
	render: () => (
		<KbdGroup>
			<Kbd>⌘</Kbd>
			<Kbd>K</Kbd>
		</KbdGroup>
	),
};

export const CommonShortcuts: Story = {
	render: () => (
		<div className="flex flex-col gap-3 w-72 text-sm">
			{[
				{ keys: ["⌘", "K"], label: "Open command palette" },
				{ keys: ["⌘", "N"], label: "New mission" },
				{ keys: ["⌘", "S"], label: "Save changes" },
				{ keys: ["⌘", "Z"], label: "Undo" },
				{ keys: ["⌘", "B"], label: "Toggle sidebar" },
				{ keys: ["/"], label: "Search" },
			].map(({ keys, label }) => (
				<div className="flex items-center justify-between" key={label}>
					<span className="text-muted-foreground">{label}</span>
					<KbdGroup>
						{keys.map((key) => (
							<Kbd key={key}>{key}</Kbd>
						))}
					</KbdGroup>
				</div>
			))}
		</div>
	),
};

export const Multiple: Story = {
	render: () => (
		<div className="flex gap-2">
			<Kbd>Ctrl</Kbd>
			<Kbd>Alt</Kbd>
			<Kbd>Delete</Kbd>
		</div>
	),
};
