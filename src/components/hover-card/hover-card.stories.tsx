// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/nextjs";

import { CalendarIcon, RadioIcon, ShieldIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "../avatar";
import { Badge } from "../badge";
import { Button } from "../button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card";

const meta: Meta<typeof HoverCard> = {
	component: HoverCard,
	tags: ["autodocs"],
	title: "Components/HoverCard",
};

export default meta;
type Story = StoryObj<typeof HoverCard>;

export const Default: Story = {
	render: () => (
		<HoverCard>
			<HoverCardTrigger asChild>
				<Button variant="link">@nextjs</Button>
			</HoverCardTrigger>
			<HoverCardContent className="w-64">
				<div className="flex flex-col gap-1">
					<h4 className="text-sm font-semibold">@nextjs</h4>
					<p className="text-sm text-muted-foreground">
						The React Framework — created and maintained by @vercel.
					</p>
				</div>
			</HoverCardContent>
		</HoverCard>
	),
};

export const ResponderProfile: Story = {
	render: () => (
		<HoverCard>
			<HoverCardTrigger asChild>
				<Button variant="link">Sgt. Rivera</Button>
			</HoverCardTrigger>
			<HoverCardContent className="w-72">
				<div className="flex gap-3">
					<Avatar className="size-10">
						<AvatarFallback>AR</AvatarFallback>
					</Avatar>
					<div className="flex flex-col gap-1 flex-1">
						<div className="flex items-center gap-2">
							<span className="text-sm font-semibold">Alex Rivera</span>
							<Badge className="text-xs" variant="default">
								<RadioIcon className="size-3" />
								On duty
							</Badge>
						</div>
						<p className="text-xs text-muted-foreground">
							BRAVO-1 · Ground team lead
						</p>
						<div className="flex flex-col gap-1 mt-2 text-xs text-muted-foreground">
							<div className="flex items-center gap-1.5">
								<ShieldIcon className="size-3" />
								Certified paramedic · K9 handler
							</div>
							<div className="flex items-center gap-1.5">
								<CalendarIcon className="size-3" />
								Active since Jan 2023
							</div>
						</div>
					</div>
				</div>
			</HoverCardContent>
		</HoverCard>
	),
};
