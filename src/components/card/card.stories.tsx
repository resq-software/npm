// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "./card";

const meta: Meta<typeof Card> = {
	title: "Components/Card",
	component: Card,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
	render: () => (
		<Card className="w-80">
			<CardHeader>
				<CardTitle>Mission Alpha</CardTitle>
				<CardDescription>Search &amp; rescue — Zone 4B</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-sm text-muted-foreground">3 drones active</p>
			</CardContent>
		</Card>
	),
};
