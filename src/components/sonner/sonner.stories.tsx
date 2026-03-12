// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/nextjs";

import { toast } from "sonner";

import { Button } from "../button";
import { Toaster } from "./sonner";

const meta: Meta<typeof Toaster> = {
	component: Toaster,
	tags: ["autodocs"],
	title: "Feedback/Sonner",
};

export default meta;
type Story = StoryObj<typeof Toaster>;

export const Default: Story = {
	render: () => (
		<>
			<Toaster />
			<div className="flex flex-wrap gap-2">
				<Button
					onClick={() => toast("Mission status updated")}
					variant="outline"
				>
					Default
				</Button>
				<Button
					onClick={() => toast.success("Mission Bravo completed successfully")}
					variant="outline"
				>
					Success
				</Button>
				<Button
					onClick={() => toast.error("Drone EAGLE-3 connection lost")}
					variant="outline"
				>
					Error
				</Button>
				<Button
					onClick={() => toast.warning("Battery at 15% — return to base")}
					variant="outline"
				>
					Warning
				</Button>
				<Button
					onClick={() => toast.info("3 responders en route to Zone 5A")}
					variant="outline"
				>
					Info
				</Button>
			</div>
		</>
	),
};

export const WithAction: Story = {
	render: () => (
		<>
			<Toaster />
			<div className="flex flex-wrap gap-2">
				<Button
					onClick={() =>
						toast("Mission archived", {
							action: {
								label: "Undo",
								onClick: () => toast.info("Archive undone"),
							},
						})
					}
					variant="outline"
				>
					With undo action
				</Button>
				<Button
					onClick={() =>
						toast.error("Failed to save report", {
							action: {
								label: "Retry",
								onClick: () => toast.success("Report saved"),
							},
						})
					}
					variant="outline"
				>
					Error with retry
				</Button>
			</div>
		</>
	),
};

export const Promise: Story = {
	render: () => (
		<>
			<Toaster />
			<Button
				onClick={() =>
					toast.promise(
						new Promise<void>((resolve: () => void) =>
							setTimeout(() => resolve(), 2000),
						),
						{
							error: "Failed to launch mission",
							loading: "Launching mission…",
							success: "Mission launched successfully",
						},
					)
				}
				variant="outline"
			>
				Launch mission (async)
			</Button>
		</>
	),
};
