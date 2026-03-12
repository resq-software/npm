// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/nextjs";

import {
	ActivityIcon,
	MapPinIcon,
	RadioIcon,
	SettingsIcon,
	UsersIcon,
} from "lucide-react";

import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "./command";

const meta: Meta<typeof Command> = {
	component: Command,
	tags: ["autodocs"],
	title: "Overlays/Command",
};

export default meta;
type Story = StoryObj<typeof Command>;

export const Default: Story = {
	render: () => (
		<Command className="rounded-lg border shadow-md w-72">
			<CommandInput placeholder="Type a command or search…" />
			<CommandList>
				<CommandEmpty>No results found.</CommandEmpty>
				<CommandGroup heading="Missions">
					<CommandItem>
						<ActivityIcon />
						Active missions
						<CommandShortcut>⌘M</CommandShortcut>
					</CommandItem>
					<CommandItem>
						<MapPinIcon />
						Zone overview
					</CommandItem>
					<CommandItem>
						<RadioIcon />
						Live comms
					</CommandItem>
				</CommandGroup>
				<CommandSeparator />
				<CommandGroup heading="Team">
					<CommandItem>
						<UsersIcon />
						Responders
						<CommandShortcut>⌘R</CommandShortcut>
					</CommandItem>
					<CommandItem>
						<SettingsIcon />
						Settings
						<CommandShortcut>⌘,</CommandShortcut>
					</CommandItem>
				</CommandGroup>
			</CommandList>
		</Command>
	),
};

export const Inline: Story = {
	render: () => (
		<Command className="rounded-lg border shadow-md w-72 max-h-48">
			<CommandInput placeholder="Filter zones…" />
			<CommandList>
				<CommandEmpty>No zones match your search.</CommandEmpty>
				<CommandGroup>
					{[
						"Grid 1A — Northern perimeter",
						"Grid 2B — Eastern sector",
						"Grid 3C — Urban core",
						"Grid 4B — Southern valley",
						"Grid 5D — Coastal strip",
					].map((zone) => (
						<CommandItem key={zone}>
							<MapPinIcon />
							{zone}
						</CommandItem>
					))}
				</CommandGroup>
			</CommandList>
		</Command>
	),
};
