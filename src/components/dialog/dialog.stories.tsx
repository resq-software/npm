// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/nextjs";

import { Button } from "../button";
import { Input } from "../input";
import { Label } from "../label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../select";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "./dialog";

const meta: Meta<typeof Dialog> = {
	component: Dialog,
	tags: ["autodocs"],
	title: "Overlays/Dialog",
};

export default meta;
type Story = StoryObj<typeof Dialog>;

export const Default: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline">Edit profile</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Edit profile</DialogTitle>
					<DialogDescription>
						Make changes to your profile here. Click save when you're done.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="grid grid-cols-4 items-center gap-4">
						<Label className="text-right" htmlFor="name">
							Name
						</Label>
						<Input
							className="col-span-3"
							defaultValue="Alex Rivera"
							id="name"
						/>
					</div>
					<div className="grid grid-cols-4 items-center gap-4">
						<Label className="text-right" htmlFor="callsign">
							Callsign
						</Label>
						<Input
							className="col-span-3"
							defaultValue="BRAVO-7"
							id="callsign"
						/>
					</div>
				</div>
				<DialogFooter>
					<Button type="submit">Save changes</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
};

export const CreateMission: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger asChild>
				<Button>New mission</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Create mission</DialogTitle>
					<DialogDescription>
						Configure a new search &amp; rescue mission. You can update the
						details after launch.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="grid gap-1.5">
						<Label htmlFor="mission-name">Mission name</Label>
						<Input id="mission-name" placeholder="e.g. Operation Echo" />
					</div>
					<div className="grid gap-1.5">
						<Label htmlFor="mission-zone">Primary zone</Label>
						<Input id="mission-zone" placeholder="e.g. Grid 4B" />
					</div>
					<div className="grid gap-1.5">
						<Label htmlFor="mission-priority">Priority</Label>
						<Select>
							<SelectTrigger id="mission-priority">
								<SelectValue placeholder="Select priority" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="critical">Critical</SelectItem>
								<SelectItem value="high">High</SelectItem>
								<SelectItem value="medium">Medium</SelectItem>
								<SelectItem value="low">Low</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline">Cancel</Button>
					<Button>Launch mission</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
};

export const Destructive: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="destructive">Delete account</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Delete account</DialogTitle>
					<DialogDescription>
						This action is permanent and cannot be undone. All missions,
						reports, and data associated with your account will be deleted.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-1.5 py-4">
					<Label htmlFor="confirm-email">Type your email to confirm</Label>
					<Input id="confirm-email" placeholder="you@example.com" />
				</div>
				<DialogFooter>
					<Button variant="outline">Cancel</Button>
					<Button variant="destructive">Delete account</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
};
