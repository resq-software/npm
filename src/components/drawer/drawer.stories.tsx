// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/nextjs";

import { Button } from "../button";
import { Input } from "../input";
import { Label } from "../label";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "./drawer";

const meta: Meta<typeof Drawer> = {
	component: Drawer,
	tags: ["autodocs"],
	title: "Components/Drawer",
};

export default meta;
type Story = StoryObj<typeof Drawer>;

export const Default: Story = {
	render: () => (
		<Drawer>
			<DrawerTrigger asChild>
				<Button variant="outline">Open drawer</Button>
			</DrawerTrigger>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>End mission</DrawerTitle>
					<DrawerDescription>
						This will close all active drone operations and notify the team.
						This action cannot be undone.
					</DrawerDescription>
				</DrawerHeader>
				<DrawerFooter>
					<Button variant="destructive">End mission</Button>
					<DrawerClose asChild>
						<Button variant="outline">Cancel</Button>
					</DrawerClose>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	),
};

export const WithForm: Story = {
	render: () => (
		<Drawer>
			<DrawerTrigger asChild>
				<Button>Report incident</Button>
			</DrawerTrigger>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>Report incident</DrawerTitle>
					<DrawerDescription>
						Provide details about the incident. Your report will be logged
						immediately.
					</DrawerDescription>
				</DrawerHeader>
				<div className="px-4 pb-4 grid gap-3">
					<div className="grid gap-1.5">
						<Label htmlFor="incident-loc">Location</Label>
						<Input id="incident-loc" placeholder="e.g. Grid 4B, north end" />
					</div>
					<div className="grid gap-1.5">
						<Label htmlFor="incident-desc">Description</Label>
						<Input
							id="incident-desc"
							placeholder="Brief description of the incident"
						/>
					</div>
				</div>
				<DrawerFooter>
					<Button>Submit report</Button>
					<DrawerClose asChild>
						<Button variant="outline">Cancel</Button>
					</DrawerClose>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	),
};
