// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/nextjs";

import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "./resizable";

const meta: Meta<typeof ResizablePanelGroup> = {
	component: ResizablePanelGroup,
	tags: ["autodocs"],
	title: "Components/Resizable",
};

export default meta;
type Story = StoryObj<typeof ResizablePanelGroup>;

export const Default: Story = {
	render: () => (
		<ResizablePanelGroup
			className="h-48 w-full max-w-xl rounded-lg border"
			direction="horizontal"
		>
			<ResizablePanel defaultSize={30} minSize={20}>
				<div className="flex h-full flex-col p-4 gap-1">
					<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
						Missions
					</p>
					<p className="text-sm">Operation Echo</p>
					<p className="text-sm">Mission Bravo</p>
					<p className="text-sm text-muted-foreground">Search Delta</p>
				</div>
			</ResizablePanel>
			<ResizableHandle withHandle />
			<ResizablePanel defaultSize={70}>
				<div className="flex h-full flex-col p-4 gap-1">
					<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
						Details
					</p>
					<p className="text-sm font-medium">Operation Echo</p>
					<p className="text-sm text-muted-foreground">
						Zone 4B · 12 responders · Active
					</p>
				</div>
			</ResizablePanel>
		</ResizablePanelGroup>
	),
};

export const Vertical: Story = {
	render: () => (
		<ResizablePanelGroup
			className="h-64 w-80 rounded-lg border"
			direction="vertical"
		>
			<ResizablePanel defaultSize={40} minSize={20}>
				<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
					Map view
				</div>
			</ResizablePanel>
			<ResizableHandle withHandle />
			<ResizablePanel defaultSize={60}>
				<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
					Detail panel
				</div>
			</ResizablePanel>
		</ResizablePanelGroup>
	),
};

export const ThreePane: Story = {
	render: () => (
		<ResizablePanelGroup
			className="h-48 w-full max-w-2xl rounded-lg border"
			direction="horizontal"
		>
			<ResizablePanel defaultSize={20} minSize={15}>
				<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
					Nav
				</div>
			</ResizablePanel>
			<ResizableHandle withHandle />
			<ResizablePanel defaultSize={50}>
				<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
					Content
				</div>
			</ResizablePanel>
			<ResizableHandle withHandle />
			<ResizablePanel defaultSize={30} minSize={20}>
				<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
					Inspector
				</div>
			</ResizablePanel>
		</ResizablePanelGroup>
	),
};
