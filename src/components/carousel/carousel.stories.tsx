// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/react";

import { Badge } from "../badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "./carousel";

const missions = [
	{
		id: "MSN-001",
		name: "Operation Echo",
		responders: 12,
		status: "Active",
		zone: "Grid 4B",
	},
	{
		id: "MSN-002",
		name: "Mission Bravo",
		responders: 8,
		status: "Standby",
		zone: "Grid 2A",
	},
	{
		id: "MSN-003",
		name: "Alpha Recovery",
		responders: 5,
		status: "Closed",
		zone: "Grid 7C",
	},
	{
		id: "MSN-004",
		name: "Search Delta",
		responders: 15,
		status: "Active",
		zone: "Grid 1D",
	},
	{
		id: "MSN-005",
		name: "Foxtrot Sweep",
		responders: 9,
		status: "Active",
		zone: "Grid 6E",
	},
];

const meta: Meta<typeof Carousel> = {
	argTypes: {
		orientation: { control: "select", options: ["horizontal", "vertical"] },
	},
	component: Carousel,
	tags: ["autodocs"],
	title: "Layout/Carousel",
};

export default meta;
type Story = StoryObj<typeof Carousel>;

export const Default: Story = {
	render: () => (
		<Carousel className="w-full max-w-xs">
			<CarouselContent>
				{missions.map((mission) => {
					const badgeVariant =
						mission.status === "Active"
							? "default"
							: mission.status === "Standby"
								? "secondary"
								: "outline";
					return (
						<CarouselItem key={mission.id}>
							<div className="p-1">
								<Card>
									<CardHeader className="pb-2">
										<div className="flex items-center justify-between">
											<CardTitle className="text-sm">{mission.name}</CardTitle>
											<Badge variant={badgeVariant}>{mission.status}</Badge>
										</div>
										<CardDescription>{mission.zone}</CardDescription>
									</CardHeader>
									<CardContent>
										<p className="text-sm text-muted-foreground">
											{mission.responders} responders deployed
										</p>
									</CardContent>
								</Card>
							</div>
						</CarouselItem>
					);
				})}
			</CarouselContent>
			<CarouselPrevious />
			<CarouselNext />
		</Carousel>
	),
};

export const Numeric: Story = {
	render: () => (
		<Carousel className="w-full max-w-xs">
			<CarouselContent>
				{Array.from({ length: 5 }).map((_, index) => (
					<CarouselItem key={`item-${Number(index)}`}>
						<div className="p-1">
							<Card>
								<CardContent className="flex aspect-square items-center justify-center p-6">
									<span className="text-4xl font-semibold">{index + 1}</span>
								</CardContent>
							</Card>
						</div>
					</CarouselItem>
				))}
			</CarouselContent>
			<CarouselPrevious />
			<CarouselNext />
		</Carousel>
	),
};

export const Vertical: Story = {
	render: () => (
		<Carousel className="w-full max-w-xs" orientation="vertical">
			<CarouselContent className="-mt-1 h-48">
				{Array.from({ length: 5 }).map((_, index) => (
					<CarouselItem className="pt-1 md:basis-1/2" key={`item-${Number(index)}`}>
						<div className="p-1">
							<Card>
								<CardContent className="flex items-center justify-center p-6">
									<span className="text-3xl font-semibold">{index + 1}</span>
								</CardContent>
							</Card>
						</div>
					</CarouselItem>
				))}
			</CarouselContent>
			<CarouselPrevious />
			<CarouselNext />
		</Carousel>
	),
};
