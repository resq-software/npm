// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/react";

import { AspectRatio } from "./aspect-ratio";

const meta: Meta<typeof AspectRatio> = {
	argTypes: {
		ratio: { control: "number" },
	},
	component: AspectRatio,
	tags: ["autodocs"],
	title: "Layout/Aspect Ratio",
};

export default meta;
type Story = StoryObj<typeof AspectRatio>;

export const Default: Story = {
	args: { ratio: 16 / 9 },
	render: (args) => (
		<div className="w-80">
			<AspectRatio {...args} className="overflow-hidden rounded-lg bg-muted">
				<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
					16 / 9
				</div>
			</AspectRatio>
		</div>
	),
};

export const Square: Story = {
	args: { ratio: 1 },
	render: (args) => (
		<div className="w-40">
			<AspectRatio {...args} className="overflow-hidden rounded-lg bg-muted">
				<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
					1 / 1
				</div>
			</AspectRatio>
		</div>
	),
};
