// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/react";

import { FilterIcon, SlidersHorizontalIcon } from "lucide-react";

import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { Input } from "../input";
import { Label } from "../label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "./popover";

const meta: Meta<typeof Popover> = {
	component: Popover,
	tags: ["autodocs"],
	title: "Overlays/Popover",
};

export default meta;
type Story = StoryObj<typeof Popover>;

export const Default: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline">Open popover</Button>
			</PopoverTrigger>
			<PopoverContent>
				<PopoverHeader>
					<PopoverTitle>Dimensions</PopoverTitle>
					<PopoverDescription>Set the dimensions for the layer.</PopoverDescription>
				</PopoverHeader>
				<div className="grid gap-2">
					<div className="grid grid-cols-3 items-center gap-2">
						<Label htmlFor="width">Width</Label>
						<Input className="col-span-2 h-7" defaultValue="100%" id="width" />
					</div>
					<div className="grid grid-cols-3 items-center gap-2">
						<Label htmlFor="height">Height</Label>
						<Input className="col-span-2 h-7" defaultValue="25px" id="height" />
					</div>
				</div>
			</PopoverContent>
		</Popover>
	),
};

export const FilterPopover: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline">
					<FilterIcon />
					Filters
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-64">
				<PopoverHeader>
					<PopoverTitle>Filter missions</PopoverTitle>
				</PopoverHeader>
				<div className="grid gap-3">
					<div className="grid gap-1.5">
						<Label htmlFor="status-filter">Status</Label>
						<Select>
							<SelectTrigger id="status-filter">
								<SelectValue placeholder="All statuses" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="standby">Standby</SelectItem>
								<SelectItem value="closed">Closed</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-col gap-2">
						<Label className="text-sm">Show only</Label>
						{["Unassigned zones", "Critical priority", "Missing persons"].map((label) => (
							<div className="flex items-center gap-2" key={label}>
								<Checkbox id={label} />
								<Label className="font-normal" htmlFor={label}>
									{label}
								</Label>
							</div>
						))}
					</div>
					<div className="flex gap-2">
						<Button className="flex-1" size="sm">
							Apply
						</Button>
						<Button size="sm" variant="outline">
							Reset
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	),
};

export const SettingsPopover: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button aria-label="View settings" size="icon" variant="ghost">
					<SlidersHorizontalIcon />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-52" side="bottom">
				<PopoverHeader>
					<PopoverTitle>View settings</PopoverTitle>
					<PopoverDescription>Customize the mission table.</PopoverDescription>
				</PopoverHeader>
				<div className="flex flex-col gap-2">
					{["Show zone codes", "Show responder count", "Compact rows"].map((label) => (
						<div className="flex items-center gap-2" key={label}>
							<Checkbox defaultChecked id={label} />
							<Label className="font-normal" htmlFor={label}>
								{label}
							</Label>
						</div>
					))}
				</div>
			</PopoverContent>
		</Popover>
	),
};
