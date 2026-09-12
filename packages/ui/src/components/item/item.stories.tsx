// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
	DotsThreeIcon,
	FileTextIcon,
	MapPinIcon,
	UsersIcon,
	WrenchIcon,
} from "@phosphor-icons/react";
import type { Meta, StoryObj } from "@storybook/react";

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
	title: "Display/Item",
};

export default meta;
type Story = StoryObj<typeof Item>;

/**
 * One row, and still inside an `ItemGroup` — because a lone `Item` is not a
 * lighter version of this story, it is a broken one. `Item` is this family's
 * `<li>`: it carries `role="listitem"`, which assistive tech only exposes when
 * a `role="list"` ancestor owns it, so an orphaned row can be dropped from the
 * accessibility tree with nothing visibly wrong. A group of one is the honest
 * shape for a single row, exactly as a one-item `<ul>` is.
 */
export const Default: Story = {
	render: () => (
		<ItemGroup className="w-80">
			<Item>
				<ItemMedia variant="icon">
					<FileTextIcon />
				</ItemMedia>
				<ItemContent>
					<ItemTitle>Incident report #4821.pdf</ItemTitle>
					<ItemDescription>Modified 2 hours ago · 184 KB</ItemDescription>
				</ItemContent>
				<ItemActions>
					<Button aria-label="More options" size="icon-sm" variant="ghost">
						<DotsThreeIcon />
					</Button>
				</ItemActions>
			</Item>
		</ItemGroup>
	),
};

/**
 * The outline variant drops the surface fill so the row reads as a boundary
 * rather than a raised card — the treatment to reach for when rows already sit
 * on a panel and a second fill would flatten the depth order. Grouped for the
 * same reason as `Default`.
 */
export const Outline: Story = {
	render: () => (
		<ItemGroup className="w-80">
			<Item variant="outline">
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
		</ItemGroup>
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
					icon: WrenchIcon,
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
						<Badge variant={status === "Active" ? "default" : "secondary"}>{status}</Badge>
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
