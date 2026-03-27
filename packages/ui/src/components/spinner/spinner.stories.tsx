// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../button";
import { Spinner } from "./spinner";

const meta: Meta<typeof Spinner> = {
	component: Spinner,
	tags: ["autodocs"],
	title: "Display/Spinner",
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const Default: Story = {};

export const Sizes: Story = {
	render: () => (
		<div className="flex items-center gap-4">
			<Spinner className="size-3" />
			<Spinner className="size-4" />
			<Spinner className="size-6" />
			<Spinner className="size-8" />
			<Spinner className="size-10" />
		</div>
	),
};

export const InButton: Story = {
	render: () => (
		<div className="flex gap-2">
			<Button disabled>
				<Spinner />
				Saving…
			</Button>
			<Button disabled variant="outline">
				<Spinner />
				Loading
			</Button>
		</div>
	),
};

export const Standalone: Story = {
	render: () => (
		<div className="flex flex-col items-center gap-2 p-8">
			<Spinner className="size-8" />
			<p className="text-sm text-muted-foreground">Fetching mission data…</p>
		</div>
	),
};
