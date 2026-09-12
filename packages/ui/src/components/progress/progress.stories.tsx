// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the Progress component — showcases its
 * variants and composition for visual review and Chromatic regression.
 *
 * Every bar here is named, because `role="progressbar"` has no implicit
 * accessible name. Where a visible caption exists the bar points at it with
 * `aria-labelledby`; bare bars carry an `aria-label`.
 *
 * @module @resq-systems/ui/components/progress/progress.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import { Progress } from "./progress";

const meta: Meta<typeof Progress> = {
	argTypes: {
		value: { control: { max: 100, min: 0, type: "range" } },
	},
	component: Progress,
	tags: ["autodocs"],
	title: "Display/Progress",
};

export default meta;
type Story = StoryObj<typeof Progress>;

/**
 * The ordinary mid-flight state. There is no visible caption to point at here,
 * so the bar names itself: without a name a screen reader announces only
 * "progress bar, 60 percent", and 60 percent of nothing is not information.
 */
export const Default: Story = {
	args: { "aria-label": "Mission progress", value: 60 },
};

/**
 * Zero earns its own story because an empty track reads as a broken or
 * still-loading bar. It must stay visible as a track and still announce a name
 * alongside its value, so users can tell "not started" from "not rendered".
 */
export const Zero: Story = {
	args: { "aria-label": "Aerial sweep progress", value: 0 },
};

/**
 * Completion is where the fill meets the rounded end of the track — any radius
 * or overflow mismatch surfaces here first, and it is the state a user is most
 * likely to be waiting on, so its announcement has to be unambiguous.
 */
export const Full: Story = {
	args: { "aria-label": "Ground survey progress", value: 100 },
};

/**
 * The reference pattern for a captioned bar, and the one consumers should copy.
 * The caption owns the id and the bar points at it with `aria-labelledby`, so
 * the visible and the announced name are literally the same string and cannot
 * drift apart as copy changes.
 *
 * `<Label htmlFor>` deliberately is not used: `for` only names labelable form
 * controls, and this is a `div` with `role="progressbar"`, so the association
 * would silently produce no accessible name at all.
 */
export const WithLabel: Story = {
	render: () => (
		<div className="grid gap-1.5 w-72">
			<div className="flex justify-between text-sm">
				<span
					className="font-mono text-[10px] uppercase tracking-[0.14em] text-hint"
					id="progress-zone-coverage"
				>
					Zone coverage
				</span>
				<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-hint">68%</span>
			</div>
			<Progress aria-labelledby="progress-zone-coverage" value={68} />
		</div>
	),
};

/**
 * Several bars on one screen is where anonymous names do the most damage: four
 * unnamed bars collapse into four identical "progress bar" entries in a screen
 * reader's element list, and the ordering that makes them legible on screen is
 * gone. Each row points at its own caption id, so every bar announces the phase
 * of the operation it actually tracks.
 */
export const MultipleSteps: Story = {
	render: () => (
		<div className="grid gap-4 w-72">
			{[
				{ id: "progress-ground-survey", label: "Ground survey", value: 100 },
				{ id: "progress-aerial-coverage", label: "Aerial coverage", value: 74 },
				{ id: "progress-survivor-search", label: "Survivor search", value: 45 },
				{ id: "progress-medical-triage", label: "Medical triage", value: 12 },
			].map(({ id, label, value }) => (
				<div className="grid gap-1.5" key={id}>
					<div className="flex justify-between text-sm">
						<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-hint" id={id}>
							{label}
						</span>
						<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-hint">
							{value}%
						</span>
					</div>
					<Progress aria-labelledby={id} value={value} />
				</div>
			))}
		</div>
	),
};
