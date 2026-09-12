// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the Slider component — showcases its
 * variants and composition for visual review and Chromatic regression.
 *
 * Every thumb here is named, because `role="slider"` sits on the thumb and has
 * no implicit accessible name. Where a visible caption exists the thumb points
 * at it with `thumbAriaLabelledBy`; bare thumbs carry a `thumbAriaLabels` entry.
 * Range stories name each end separately, since one shared name leaves a user
 * unable to tell which bound they are dragging.
 *
 * @module @resq-systems/ui/components/slider/slider.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import * as React from "react";

import { Slider } from "./slider";

const meta: Meta<typeof Slider> = {
	argTypes: {
		max: { control: "number" },
		min: { control: "number" },
		step: { control: "number" },
	},
	component: Slider,
	tags: ["autodocs"],
	title: "Forms/Slider",
};

export default meta;
type Story = StoryObj<typeof Slider>;

/**
 * The ordinary single-thumb slider, and the story the controls panel drives.
 * One thumb is the case Radix leaves nameless — its built-in fallback only
 * starts at two thumbs — so this is where an unnamed slider announces a bare
 * "slider, 50": a number with nothing to attach it to.
 */
export const Default: Story = {
	args: {
		className: "w-64",
		defaultValue: [50],
		max: 100,
		step: 1,
		thumbAriaLabels: ["Search radius"],
	},
};

/**
 * Two thumbs on one track is where an anonymous name does the most damage: the
 * user hears two identically-named controls and has to guess which end of the
 * band they are dragging. Radix's fallback here is a subject-less "Minimum" /
 * "Maximum", so each thumb is named with the quantity it bounds as well.
 */
export const Range: Story = {
	args: {
		className: "w-64",
		defaultValue: [25, 75],
		max: 100,
		step: 1,
		thumbAriaLabels: ["Search radius minimum", "Search radius maximum"],
	},
};

/**
 * The locked state still has to say what it is. A disabled thumb drops out of
 * the tab order but stays in the accessibility tree, so someone browsing the
 * page still reaches it; without a name they learn only that something
 * unidentified is unavailable, which is not enough to act on.
 */
export const Disabled: Story = {
	args: {
		className: "w-64",
		defaultValue: [40],
		disabled: true,
		max: 100,
		thumbAriaLabels: ["Search radius"],
	},
};

function WithLabelDemo() {
	const [value, setValue] = React.useState([5]);
	return (
		<div className="grid gap-3 w-72">
			<div className="flex justify-between text-sm">
				<span className="font-medium" id="slider-drone-altitude-limit">
					Drone altitude limit
				</span>
				<span className="text-muted-foreground">{value[0]} km</span>
			</div>
			<Slider
				max={12}
				min={0}
				onValueChange={setValue}
				step={0.5}
				thumbAriaLabelledBy={["slider-drone-altitude-limit"]}
				value={value}
			/>
			<p className="text-xs text-muted-foreground">Maximum 12 km for extended-range units.</p>
		</div>
	);
}

/**
 * The reference pattern for a captioned slider, and the one consumers should
 * copy. The caption owns the id and the thumb points at it, so the seen and the
 * announced name are literally the same string and cannot drift apart as copy
 * changes.
 *
 * `<Label htmlFor>` deliberately is not used: `for` only names labelable form
 * controls, and the thumb is a `span` with `role="slider"`, so the association
 * would look right in the markup and silently produce no accessible name at all.
 */
export const WithLabel: Story = {
	render: () => <WithLabelDemo />,
};

function RangeWithLabelDemo() {
	const [range, setRange] = React.useState([20, 80]);
	return (
		<div className="grid gap-3 w-72">
			<div className="flex justify-between text-sm">
				<span className="font-medium">Altitude range</span>
				<span className="text-muted-foreground">
					{range[0]}–{range[1]} m
				</span>
			</div>
			<Slider
				max={150}
				min={0}
				onValueChange={setRange}
				step={5}
				thumbAriaLabels={["Altitude range minimum", "Altitude range maximum"]}
				value={range}
			/>
		</div>
	);
}

/**
 * A captioned band, showing why a caption alone cannot carry a range. The name
 * has to land on each thumb individually: pointing both at "Altitude range"
 * would announce one string twice and lose the lower bound against the upper,
 * so each end folds the caption into its own name instead.
 */
export const RangeWithLabel: Story = {
	render: () => <RangeWithLabelDemo />,
};
