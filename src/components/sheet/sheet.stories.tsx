// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/nextjs";

import { MapPinIcon } from "lucide-react";

import { Badge } from "../badge";
import { Button } from "../button";
import { Input } from "../input";
import { Label } from "../label";
import { Separator } from "../separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "./sheet";

const meta: Meta<typeof Sheet> = {
	component: Sheet,
	tags: ["autodocs"],
	title: "Components/Sheet",
};

export default meta;
type Story = StoryObj<typeof Sheet>;

export const Default: Story = {
	render: () => (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant="outline">Edit profile</Button>
			</SheetTrigger>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Edit profile</SheetTitle>
					<SheetDescription>
						Make changes to your profile here. Click save when you're done.
					</SheetDescription>
				</SheetHeader>
				<div className="grid gap-4 py-4">
					<div className="grid grid-cols-4 items-center gap-4">
						<Label className="text-right" htmlFor="sheet-name">
							Name
						</Label>
						<Input
							className="col-span-3"
							defaultValue="Alex Rivera"
							id="sheet-name"
						/>
					</div>
					<div className="grid grid-cols-4 items-center gap-4">
						<Label className="text-right" htmlFor="sheet-callsign">
							Callsign
						</Label>
						<Input
							className="col-span-3"
							defaultValue="BRAVO-7"
							id="sheet-callsign"
						/>
					</div>
				</div>
				<SheetFooter>
					<Button type="submit">Save changes</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	),
};

export const Left: Story = {
	render: () => (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant="outline">Open navigation</Button>
			</SheetTrigger>
			<SheetContent side="left">
				<SheetHeader>
					<SheetTitle>ResQ Navigation</SheetTitle>
				</SheetHeader>
				<nav className="flex flex-col gap-1 py-4">
					{[
						{ icon: "📊", label: "Dashboard" },
						{ icon: "🎯", label: "Missions" },
						{ icon: "🗺️", label: "Zones" },
						{ icon: "👥", label: "Responders" },
						{ icon: "📋", label: "Reports" },
						{ icon: "⚙️", label: "Settings" },
					].map(({ icon, label }) => (
						<button
							className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent text-left"
							key={label}
						>
							<span>{icon}</span>
							{label}
						</button>
					))}
				</nav>
			</SheetContent>
		</Sheet>
	),
};

export const MissionDetail: Story = {
	render: () => (
		<Sheet>
			<SheetTrigger asChild>
				<Button size="sm" variant="ghost">
					<MapPinIcon />
					Mission Alpha
				</Button>
			</SheetTrigger>
			<SheetContent className="w-96 sm:max-w-96">
				<SheetHeader>
					<SheetTitle className="flex items-center gap-2">
						Mission Alpha
						<Badge variant="default">Active</Badge>
					</SheetTitle>
					<SheetDescription>Search &amp; rescue — Zone 4B</SheetDescription>
				</SheetHeader>
				<div className="py-4 grid gap-4 text-sm">
					<Separator />
					<div className="grid grid-cols-2 gap-2">
						<div>
							<p className="text-muted-foreground">Responders</p>
							<p className="font-medium">12 deployed</p>
						</div>
						<div>
							<p className="text-muted-foreground">Drones</p>
							<p className="font-medium">3 active</p>
						</div>
						<div>
							<p className="text-muted-foreground">Zone coverage</p>
							<p className="font-medium">68%</p>
						</div>
						<div>
							<p className="text-muted-foreground">Started</p>
							<p className="font-medium">09:14 UTC</p>
						</div>
					</div>
					<Separator />
					<div>
						<p className="text-muted-foreground mb-1">Latest update</p>
						<p>
							EAGLE-2 detected heat signature at Grid 4B-North. Ground team
							dispatched.
						</p>
					</div>
				</div>
				<SheetFooter>
					<Button className="w-full" variant="destructive">
						End mission
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	),
};
