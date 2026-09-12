// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the Native Select component — showcases its
 * variants and composition for visual review and Chromatic regression.
 *
 * @module @resq-systems/ui/components/native-select/native-select.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import { Label } from "../label";
import { NativeSelect, NativeSelectOption } from "./native-select";

const meta: Meta<typeof NativeSelect> = {
	argTypes: {
		size: { control: "select", options: ["default", "sm"] },
	},
	component: NativeSelect,
	tags: ["autodocs"],
	title: "Forms/Native Select",
};

export default meta;
type Story = StoryObj<typeof NativeSelect>;

/**
 * Pairing with a plain `<label for>` is the reason to reach for this component over
 * the styled `Select`, so the base story shows the two together. The first option is a
 * prompt rather than a name — on its own it leaves the control anonymous to a screen
 * reader, and it disappears entirely once a real zone is chosen.
 */
export const Default: Story = {
	render: (args) => (
		<div className="grid gap-1.5">
			<Label htmlFor="operating-zone">Operating zone</Label>
			<NativeSelect {...args} className="w-48" id="operating-zone">
				<NativeSelectOption value="">Select zone…</NativeSelectOption>
				<NativeSelectOption value="4a">Zone 4A</NativeSelectOption>
				<NativeSelectOption value="4b">Zone 4B</NativeSelectOption>
				<NativeSelectOption value="5a">Zone 5A</NativeSelectOption>
				<NativeSelectOption value="5b">Zone 5B</NativeSelectOption>
			</NativeSelect>
		</div>
	),
};

/**
 * The compact size is for dense toolbars and filter bars, which is exactly where the
 * temptation to drop the label is strongest. The label is small enough to sit above a
 * 28px control without unbalancing the row, so the space saving never justifies losing it.
 */
export const Small: Story = {
	args: { size: "sm" },
	render: (args) => (
		<div className="grid gap-1.5">
			<Label htmlFor="filter-status">Filter status</Label>
			<NativeSelect {...args} className="w-36" id="filter-status">
				<NativeSelectOption value="active">Active</NativeSelectOption>
				<NativeSelectOption value="standby">Standby</NativeSelectOption>
				<NativeSelectOption value="closed">Closed</NativeSelectOption>
			</NativeSelect>
		</div>
	),
};

/**
 * A disabled control is still announced, so it still needs a name — otherwise a screen
 * reader reaches an unexplained dead field. Only the wrapper dims (`has-[select:disabled]`),
 * leaving the label at full contrast to say what the field would have been for.
 */
export const Disabled: Story = {
	args: { disabled: true },
	render: (args) => (
		<div className="grid gap-1.5">
			<Label htmlFor="assigned-zone">Assigned zone</Label>
			<NativeSelect {...args} className="w-48" id="assigned-zone">
				<NativeSelectOption value="none">No zones available</NativeSelectOption>
			</NativeSelect>
		</div>
	),
};

export const WithLabel: Story = {
	render: () => (
		<div className="grid gap-1.5 w-48">
			<Label htmlFor="status-select">Mission status</Label>
			<NativeSelect id="status-select">
				<NativeSelectOption value="">All statuses</NativeSelectOption>
				<NativeSelectOption value="active">Active</NativeSelectOption>
				<NativeSelectOption value="standby">Standby</NativeSelectOption>
				<NativeSelectOption value="closed">Closed</NativeSelectOption>
			</NativeSelect>
		</div>
	),
};
