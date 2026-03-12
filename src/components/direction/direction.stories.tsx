// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/nextjs";

import { DirectionProvider } from "./direction";

const meta: Meta<typeof DirectionProvider> = {
	argTypes: {
		dir: { control: "select", options: ["ltr", "rtl"] },
	},
	component: DirectionProvider,
	tags: ["autodocs"],
	title: "Components/Direction",
};

export default meta;
type Story = StoryObj<typeof DirectionProvider>;

export const LTR: Story = {
	args: { dir: "ltr" },
	render: (args) => (
		<DirectionProvider {...args}>
			<p className="text-sm">Left-to-right text direction.</p>
		</DirectionProvider>
	),
};

export const RTL: Story = {
	args: { dir: "rtl" },
	render: (args) => (
		<DirectionProvider {...args}>
			<p className="text-sm">Right-to-left text direction (RTL).</p>
		</DirectionProvider>
	),
};
