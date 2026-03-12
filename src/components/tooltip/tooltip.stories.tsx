// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/nextjs";

import { Button } from "../button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./tooltip";

const meta: Meta<typeof Tooltip> = {
	component: Tooltip,
	decorators: [
		(Story) => (
			<TooltipProvider>
				<Story />
			</TooltipProvider>
		),
	],
	tags: ["autodocs"],
	title: "Components/Tooltip",
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
	render: () => (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button variant="outline">Hover me</Button>
			</TooltipTrigger>
			<TooltipContent>
				<p>Add to library</p>
			</TooltipContent>
		</Tooltip>
	),
};

export const WithSide: Story = {
	render: () => (
		<div className="flex gap-4">
			{(["top", "right", "bottom", "left"] as const).map((side) => (
				<Tooltip key={side}>
					<TooltipTrigger asChild>
						<Button size="sm" variant="outline">
							{side}
						</Button>
					</TooltipTrigger>
					<TooltipContent side={side}>
						<p>Tooltip on {side}</p>
					</TooltipContent>
				</Tooltip>
			))}
		</div>
	),
};
