// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/nextjs";

import { Badge } from "../badge";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "./table";

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
];

const statusVariant: Record<
	string,
	"default" | "destructive" | "outline" | "secondary"
> = {
	Active: "default",
	Closed: "outline",
	Standby: "secondary",
};

const meta: Meta<typeof Table> = {
	component: Table,
	tags: ["autodocs"],
	title: "Data/Table",
};

export default meta;
type Story = StoryObj<typeof Table>;

export const Default: Story = {
	render: () => (
		<Table>
			<TableCaption>Active and recent missions.</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead className="w-28">Mission ID</TableHead>
					<TableHead>Name</TableHead>
					<TableHead>Zone</TableHead>
					<TableHead className="text-right">Responders</TableHead>
					<TableHead>Status</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{missions.map((m) => (
					<TableRow key={m.id}>
						<TableCell className="font-mono text-xs">{m.id}</TableCell>
						<TableCell className="font-medium">{m.name}</TableCell>
						<TableCell>{m.zone}</TableCell>
						<TableCell className="text-right">{m.responders}</TableCell>
						<TableCell>
							<Badge variant={statusVariant[m.status] ?? "outline"}>
								{m.status}
							</Badge>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	),
};

export const Empty: Story = {
	render: () => (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Mission ID</TableHead>
					<TableHead>Name</TableHead>
					<TableHead>Zone</TableHead>
					<TableHead className="text-right">Responders</TableHead>
					<TableHead>Status</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				<TableRow>
					<TableCell
						className="h-24 text-center text-muted-foreground"
						colSpan={5}
					>
						No missions found.
					</TableCell>
				</TableRow>
			</TableBody>
		</Table>
	),
};
