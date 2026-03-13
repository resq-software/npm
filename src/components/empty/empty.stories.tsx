// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/react";

import { FileSearchIcon, InboxIcon, RadioTowerIcon, ShieldOffIcon } from "lucide-react";

import { Button } from "../button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "./empty";

const meta: Meta<typeof Empty> = {
	component: Empty,
	tags: ["autodocs"],
	title: "Feedback/Empty",
};

export default meta;
type Story = StoryObj<typeof Empty>;

export const Default: Story = {
	render: () => (
		<Empty>
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<InboxIcon />
				</EmptyMedia>
				<EmptyTitle>No messages</EmptyTitle>
				<EmptyDescription>You don't have any messages yet. Start a conversation.</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button size="sm">New message</Button>
			</EmptyContent>
		</Empty>
	),
};

export const NoMissions: Story = {
	render: () => (
		<Empty>
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<RadioTowerIcon />
				</EmptyMedia>
				<EmptyTitle>No active missions</EmptyTitle>
				<EmptyDescription>
					There are no missions running right now. Launch a new mission when an incident is
					reported.
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button size="sm">Launch mission</Button>
			</EmptyContent>
		</Empty>
	),
};

export const NoSearchResults: Story = {
	render: () => (
		<Empty>
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<FileSearchIcon />
				</EmptyMedia>
				<EmptyTitle>No results found</EmptyTitle>
				<EmptyDescription>
					Your search for "Grid 9Z" returned no results. Try a different zone or clear the filters.
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button size="sm" variant="outline">
					Clear filters
				</Button>
			</EmptyContent>
		</Empty>
	),
};

export const NoPermission: Story = {
	render: () => (
		<Empty>
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<ShieldOffIcon />
				</EmptyMedia>
				<EmptyTitle>Access restricted</EmptyTitle>
				<EmptyDescription>
					You don't have permission to view this section. Contact your team lead to request access.
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	),
};
