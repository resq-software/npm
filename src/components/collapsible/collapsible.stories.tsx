// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/react";

import { ChevronsUpDownIcon } from "lucide-react";

import { Badge } from "../badge";
import { Button } from "../button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";

const meta: Meta<typeof Collapsible> = {
	component: Collapsible,
	tags: ["autodocs"],
	title: "Layout/Collapsible",
};

export default meta;
type Story = StoryObj<typeof Collapsible>;

export const Default: Story = {
	render: () => (
		<Collapsible className="w-72 space-y-2">
			<div className="flex items-center justify-between">
				<h4 className="text-sm font-semibold">Mission Alpha — active responders</h4>
				<CollapsibleTrigger asChild>
					<Button aria-label="Toggle responders" size="icon-sm" variant="ghost">
						<ChevronsUpDownIcon />
					</Button>
				</CollapsibleTrigger>
			</div>
			<div className="rounded-md border px-4 py-2 text-sm font-mono">BRAVO-1 (Sgt. Rivera)</div>
			<CollapsibleContent className="space-y-2">
				<div className="rounded-md border px-4 py-2 text-sm font-mono">BRAVO-2 (Cpl. Chen)</div>
				<div className="rounded-md border px-4 py-2 text-sm font-mono">BRAVO-3 (Pvt. Okafor)</div>
				<div className="rounded-md border px-4 py-2 text-sm font-mono">BRAVO-4 (Pvt. Torres)</div>
			</CollapsibleContent>
		</Collapsible>
	),
};

export const OpenByDefault: Story = {
	render: () => (
		<Collapsible className="w-72 space-y-2" defaultOpen>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<h4 className="text-sm font-semibold">Drone fleet status</h4>
					<Badge variant="default">3 active</Badge>
				</div>
				<CollapsibleTrigger asChild>
					<Button aria-label="Toggle drone fleet status" size="icon-sm" variant="ghost">
						<ChevronsUpDownIcon />
					</Button>
				</CollapsibleTrigger>
			</div>
			<CollapsibleContent className="space-y-2">
				{[
					{ battery: "87%", id: "EAGLE-1", zone: "Grid 4B-North" },
					{ battery: "62%", id: "EAGLE-2", zone: "Grid 4B-South" },
					{ battery: "18%", id: "EAGLE-3", zone: "Returning to base" },
				].map(({ battery, id, zone }) => (
					<div className="rounded-md border px-4 py-2 text-sm flex justify-between" key={id}>
						<span className="font-mono">{id}</span>
						<span className="text-muted-foreground">{zone}</span>
						<span>{battery}</span>
					</div>
				))}
			</CollapsibleContent>
		</Collapsible>
	),
};
