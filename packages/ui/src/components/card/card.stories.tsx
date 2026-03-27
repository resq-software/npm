// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import { ActivityIcon, MapPinIcon, UsersIcon, WrenchIcon } from "@phosphor-icons/react";
import type { Meta, StoryObj } from "@storybook/react";

import { Badge } from "../badge";
import { Button } from "../button";
import { Input } from "../input";
import { Label } from "../label";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "./card";

const meta: Meta<typeof Card> = {
	component: Card,
	tags: ["autodocs"],
	title: "Layout/Card",
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
				<p className="text-sm text-muted-foreground">3 drones active · 12 responders deployed</p>
			</CardContent>
		</Card>
	),
};

export const WithFooter: Story = {
	render: () => (
		<Card className="w-80">
			<CardHeader>
				<CardTitle>Incident Report #2847</CardTitle>
				<CardDescription>Filed on March 12, 2026</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-sm text-muted-foreground">
					Structural collapse reported at 14:32. Two survivors located. Awaiting heavy-lift
					equipment.
				</p>
			</CardContent>
			<CardFooter className="flex gap-2">
				<Button size="sm">View full report</Button>
				<Button size="sm" variant="outline">
					Dismiss
				</Button>
			</CardFooter>
		</Card>
	),
};

export const WithAction: Story = {
	render: () => (
		<Card className="w-80">
			<CardHeader>
				<CardTitle>Active Zones</CardTitle>
				<CardDescription>Current search perimeter</CardDescription>
				<CardAction>
					<Badge variant="default">Live</Badge>
				</CardAction>
			</CardHeader>
			<CardContent>
				<p className="text-sm text-muted-foreground">Zone 4B · 2.4 km² covered</p>
			</CardContent>
		</Card>
	),
};

export const Stats: Story = {
	render: () => (
		<div className="grid grid-cols-2 gap-4 w-96">
			{[
				{
					delta: "+3 today",
					icon: ActivityIcon,
					label: "Active missions",
					value: "12",
				},
				{ delta: "On duty", icon: UsersIcon, label: "Responders", value: "84" },
				{
					delta: "2 returning",
					icon: WrenchIcon,
					label: "Drones deployed",
					value: "7",
				},
				{
					delta: "of 45",
					icon: MapPinIcon,
					label: "Zones covered",
					value: "31",
				},
			].map(({ delta, icon: Icon, label, value }) => (
				<Card key={label}>
					<CardHeader className="pb-2">
						<CardDescription className="flex items-center gap-1">
							<Icon className="size-3.5" />
							{label}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">{value}</p>
						<p className="text-xs text-muted-foreground mt-0.5">{delta}</p>
					</CardContent>
				</Card>
			))}
		</div>
	),
};

export const FormCard: Story = {
	render: () => (
		<Card className="w-80">
			<CardHeader>
				<CardTitle>Create mission</CardTitle>
				<CardDescription>
					Enter the details for the new search &amp; rescue mission.
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-3">
				<div className="grid gap-1.5">
					<Label htmlFor="mission-name">Mission name</Label>
					<Input id="mission-name" placeholder="e.g. Operation Echo" />
				</div>
				<div className="grid gap-1.5">
					<Label htmlFor="zone">Zone</Label>
					<Input id="zone" placeholder="e.g. Grid 4B" />
				</div>
			</CardContent>
			<CardFooter>
				<Button className="w-full">Launch mission</Button>
			</CardFooter>
		</Card>
	),
};
