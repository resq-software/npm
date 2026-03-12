// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/react";

import { Badge } from "../badge";
import { Separator } from "../separator";
import { ScrollArea } from "./scroll-area";

const missions = [
	{ id: "MSN-001", name: "Operation Echo", status: "Active", zone: "Grid 4B" },
	{ id: "MSN-002", name: "Mission Bravo", status: "Standby", zone: "Grid 2A" },
	{ id: "MSN-003", name: "Alpha Recovery", status: "Closed", zone: "Grid 7C" },
	{ id: "MSN-004", name: "Search Delta", status: "Active", zone: "Grid 1D" },
	{ id: "MSN-005", name: "Foxtrot Sweep", status: "Active", zone: "Grid 6E" },
	{ id: "MSN-006", name: "India Watch", status: "Standby", zone: "Grid 3C" },
	{ id: "MSN-007", name: "Lima Scout", status: "Closed", zone: "Grid 5D" },
	{ id: "MSN-008", name: "November Rescue", status: "Active", zone: "Grid 8F" },
];

const meta: Meta<typeof ScrollArea> = {
	component: ScrollArea,
	tags: ["autodocs"],
	title: "Layout/Scroll Area",
};

export default meta;
type Story = StoryObj<typeof ScrollArea>;

export const Default: Story = {
	render: () => (
		<ScrollArea className="h-64 w-72 rounded-md border">
			<div className="p-4">
				<h4 className="mb-3 text-sm font-semibold">Missions</h4>
				{missions.map((mission, i) => (
					<div key={mission.id}>
						<div className="flex items-center justify-between py-2">
							<div>
								<p className="text-sm font-medium">{mission.name}</p>
								<p className="text-xs text-muted-foreground">
									{mission.zone} · {mission.id}
								</p>
							</div>
							<Badge
								variant={
									mission.status === "Active"
										? "default"
										: mission.status === "Standby"
											? "secondary"
											: "outline"
								}
							>
								{mission.status}
							</Badge>
						</div>
						{i < missions.length - 1 && <Separator />}
					</div>
				))}
			</div>
		</ScrollArea>
	),
};

export const Horizontal: Story = {
	render: () => (
		<ScrollArea className="w-72 whitespace-nowrap rounded-md border">
			<div className="flex gap-3 p-4">
				{missions.map((mission) => (
					<div className="flex flex-col gap-1 rounded-md border p-3 w-40 shrink-0" key={mission.id}>
						<p className="text-sm font-medium truncate">{mission.name}</p>
						<p className="text-xs text-muted-foreground">{mission.zone}</p>
						<Badge
							className="w-fit mt-1"
							variant={
								mission.status === "Active"
									? "default"
									: mission.status === "Standby"
										? "secondary"
										: "outline"
							}
						>
							{mission.status}
						</Badge>
					</div>
				))}
			</div>
		</ScrollArea>
	),
};
