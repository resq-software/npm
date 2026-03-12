// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/nextjs";

import {
	DrillIcon,
	FileTextIcon,
	MapPinIcon,
	MoreHorizontalIcon,
	UsersIcon,
} from "lucide-react";

import { Badge } from "../badge";
import { Button } from "../button";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemTitle,
} from "./item";

const meta: Meta<typeof Item> = {
	argTypes: {
		size: { control: "select", options: ["default", "sm", "xs"] },
		variant: { control: "select", options: ["default", "outline", "muted"] },
	},
	component: Item,
	tags: ["autodocs"],
	title: "Components/Item",
};

export default meta;
type Story = StoryObj<typeof Item>;

export const Default: Story = {
	render: () => (
		<Item className="w-80">
			<ItemMedia variant="icon">
				<FileTextIcon />
			</ItemMedia>
			<ItemContent>
				<ItemTitle>Incident report #4821.pdf</ItemTitle>
				<ItemDescription>Modified 2 hours ago · 184 KB</ItemDescription>
			</ItemContent>
			<ItemActions>
				<Button aria-label="More options" size="icon-sm" variant="ghost">
					<MoreHorizontalIcon />
				</Button>
			</ItemActions>
		</Item>
	),
};

export const Outline: Story = {
	render: () => (
		<Item className="w-80" variant="outline">
			<ItemMedia variant="icon">
				<MapPinIcon />
			</ItemMedia>
			<ItemContent>
				<ItemTitle>Zone 4B — Southern valley</ItemTitle>
				<ItemDescription>2.4 km² · Active</ItemDescription>
			</ItemContent>
			<ItemActions>
				<Badge variant="default">Active</Badge>
			</ItemActions>
		</Item>
	),
};

export const MissionList: Story = {
	render: () => (
		<ItemGroup className="w-80">
			{[
				{
					icon: MapPinIcon,
					name: "Mission Alpha",
					status: "Active",
					zone: "Grid 4B",
				},
				{
					icon: DrillIcon,
					name: "Mission Bravo",
					status: "Standby",
					zone: "Grid 2A",
				},
				{
					icon: UsersIcon,
					name: "Search Delta",
					status: "Active",
					zone: "Grid 1D",
				},
			].map(({ icon: Icon, name, status, zone }) => (
				<Item key={name} variant="outline">
					<ItemMedia variant="icon">
						<Icon />
					</ItemMedia>
					<ItemContent>
						<ItemTitle>{name}</ItemTitle>
						<ItemDescription>{zone}</ItemDescription>
					</ItemContent>
					<ItemActions>
						<Badge variant={status === "Active" ? "default" : "secondary"}>
							{status}
						</Badge>
					</ItemActions>
				</Item>
			))}
		</ItemGroup>
	),
};

export const Small: Story = {
	render: () => (
		<ItemGroup className="w-72">
			{["EAGLE-1", "EAGLE-2", "EAGLE-3"].map((callsign) => (
				<Item key={callsign} size="sm" variant="outline">
					<ItemContent>
						<ItemTitle>{callsign}</ItemTitle>
						<ItemDescription>Drone · Airborne</ItemDescription>
					</ItemContent>
				</Item>
			))}
		</ItemGroup>
	),
};
