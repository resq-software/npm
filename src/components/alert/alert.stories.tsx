// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/react";

import {
	AlertCircleIcon,
	CheckCircle2Icon,
	InfoIcon,
	TerminalIcon,
	TriangleAlertIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "./alert";

const meta: Meta<typeof Alert> = {
	argTypes: {
		variant: { control: "select", options: ["default", "destructive"] },
	},
	component: Alert,
	tags: ["autodocs"],
	title: "Display/Alert",
};

export default meta;
type Story = StoryObj<typeof Alert>;

export const Default: Story = {
	render: () => (
		<Alert className="w-96">
			<TerminalIcon className="size-4" />
			<AlertTitle>System update available</AlertTitle>
			<AlertDescription>
				A new firmware version is available for your drone fleet. Update during low-activity
				windows.
			</AlertDescription>
		</Alert>
	),
};

export const Destructive: Story = {
	render: () => (
		<Alert className="w-96" variant="destructive">
			<AlertCircleIcon className="size-4" />
			<AlertTitle>Connection lost</AlertTitle>
			<AlertDescription>
				Drone EAGLE-3 has lost telemetry. Last known position: Grid 4B, 47.832°N 13.041°E.
			</AlertDescription>
		</Alert>
	),
};

export const AllVariants: Story = {
	render: () => (
		<div className="flex flex-col gap-3 w-96">
			<Alert>
				<InfoIcon className="size-4" />
				<AlertTitle>Info</AlertTitle>
				<AlertDescription>3 responders are en route to Zone 5A.</AlertDescription>
			</Alert>
			<Alert>
				<CheckCircle2Icon className="size-4" />
				<AlertTitle>Success</AlertTitle>
				<AlertDescription>
					Mission Bravo completed successfully. All personnel accounted for.
				</AlertDescription>
			</Alert>
			<Alert>
				<TriangleAlertIcon className="size-4" />
				<AlertTitle>Warning</AlertTitle>
				<AlertDescription>Drone battery at 15%. Return to base recommended.</AlertDescription>
			</Alert>
			<Alert variant="destructive">
				<AlertCircleIcon className="size-4" />
				<AlertTitle>Critical</AlertTitle>
				<AlertDescription>
					Emergency beacon detected in Grid 7C. Immediate response required.
				</AlertDescription>
			</Alert>
		</div>
	),
};
