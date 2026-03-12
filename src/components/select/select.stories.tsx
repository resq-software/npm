// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/nextjs";

import { Label } from "../label";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "./select";

const meta: Meta<typeof Select> = {
	component: Select,
	tags: ["autodocs"],
	title: "Forms/Select",
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
	render: () => (
		<Select>
			<SelectTrigger className="w-48">
				<SelectValue placeholder="Select priority" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="critical">Critical</SelectItem>
				<SelectItem value="high">High</SelectItem>
				<SelectItem value="medium">Medium</SelectItem>
				<SelectItem value="low">Low</SelectItem>
			</SelectContent>
		</Select>
	),
};

export const Small: Story = {
	render: () => (
		<Select>
			<SelectTrigger className="w-36" size="sm">
				<SelectValue placeholder="Status" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="active">Active</SelectItem>
				<SelectItem value="standby">Standby</SelectItem>
				<SelectItem value="closed">Closed</SelectItem>
			</SelectContent>
		</Select>
	),
};

export const Grouped: Story = {
	render: () => (
		<Select>
			<SelectTrigger className="w-56">
				<SelectValue placeholder="Assign responder" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					<SelectLabel>Ground team</SelectLabel>
					<SelectItem value="gnd-1">Sgt. Rivera (BRAVO-1)</SelectItem>
					<SelectItem value="gnd-2">Cpl. Chen (BRAVO-2)</SelectItem>
					<SelectItem value="gnd-3">Pvt. Okafor (BRAVO-3)</SelectItem>
				</SelectGroup>
				<SelectSeparator />
				<SelectGroup>
					<SelectLabel>Air support</SelectLabel>
					<SelectItem value="air-1">Pilot Torres (EAGLE-1)</SelectItem>
					<SelectItem disabled value="air-2">
						Pilot Müller (EAGLE-2) — unavailable
					</SelectItem>
				</SelectGroup>
			</SelectContent>
		</Select>
	),
};

export const Disabled: Story = {
	render: () => (
		<Select disabled>
			<SelectTrigger className="w-48">
				<SelectValue placeholder="No options available" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="a">Option A</SelectItem>
			</SelectContent>
		</Select>
	),
};

export const WithLabel: Story = {
	render: () => (
		<div className="grid gap-1.5 w-56">
			<Label htmlFor="zone-select">Search zone</Label>
			<Select>
				<SelectTrigger id="zone-select">
					<SelectValue placeholder="Select zone" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="4a">Zone 4A</SelectItem>
					<SelectItem value="4b">Zone 4B</SelectItem>
					<SelectItem value="5a">Zone 5A</SelectItem>
					<SelectItem value="5b">Zone 5B</SelectItem>
				</SelectContent>
			</Select>
		</div>
	),
};
