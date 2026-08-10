// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the Select component — showcases its
 * variants and composition for visual review and Chromatic regression.
 *
 * @module @resq-systems/ui/components/select/select.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import { Label } from "../label";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "./select";

const meta: Meta<typeof Select> = {
	component: Select,
	tags: ["autodocs"],
	title: "Forms/Select",
};

export default meta;
type Story = StoryObj<typeof Select>;

/**
 * The trigger exposes `role="combobox"`, which forbids naming from its own
 * content — so its placeholder is invisible to assistive technology and an
 * associated `Label` is the only thing that names the control. Every story
 * here ships one so the pattern is never copied without it.
 */
export const Default: Story = {
	render: () => (
		<div className="grid gap-1.5 w-48">
			<Label htmlFor="priority-select">Priority</Label>
			<Select>
				<SelectTrigger id="priority-select">
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
	),
};

/**
 * The compact trigger is what dense toolbars and table filter rows reach for,
 * where the temptation to drop the label to save vertical space is strongest.
 */
export const Small: Story = {
	render: () => (
		<div className="grid gap-1.5 w-36">
			<Label htmlFor="status-select">Status</Label>
			<Select>
				<SelectTrigger id="status-select" size="sm">
					<SelectValue placeholder="Status" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="active">Active</SelectItem>
					<SelectItem value="standby">Standby</SelectItem>
					<SelectItem value="closed">Closed</SelectItem>
				</SelectContent>
			</Select>
		</div>
	),
};

/**
 * Section headings inside the list group the options but never name the
 * control itself, so the outer `Label` still carries the accessible name.
 */
export const Grouped: Story = {
	render: () => (
		<div className="grid gap-1.5 w-56">
			<Label htmlFor="responder-select">Assign responder</Label>
			<Select>
				<SelectTrigger id="responder-select">
					<SelectValue placeholder="Assign responder" />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						<SelectLabel>Ground team</SelectLabel>
						<SelectItem value="gnd-1">Sgt. Rivera (BRAVO-1)</SelectItem>
						<SelectItem value="gnd-2">Cpl. Chen (BRAVO-2)</SelectItem>
						<SelectItem value="gnd-3">Pvt. Okafor (BRAVO-3)</SelectItem>
					</SelectGroup>
					<SelectSeparator />
					<SelectGroup>
						<SelectLabel>Air support</SelectLabel>
						<SelectItem value="air-1">Pilot Torres (EAGLE-1)</SelectItem>
						<SelectItem disabled value="air-2">
							Pilot Müller (EAGLE-2) — unavailable
						</SelectItem>
					</SelectGroup>
				</SelectContent>
			</Select>
		</div>
	),
};

/**
 * A disabled select must still read as a named, present field rather than
 * vanishing from the accessibility tree, so it keeps its `Label` — dimmed in
 * step with the trigger via the `group` disabled treatment.
 */
export const Disabled: Story = {
	render: () => (
		<div className="grid gap-1.5 w-48 group" data-disabled="true">
			<Label htmlFor="relief-crew-select">Relief crew</Label>
			<Select disabled>
				<SelectTrigger id="relief-crew-select">
					<SelectValue placeholder="No options available" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="a">Option A</SelectItem>
				</SelectContent>
			</Select>
		</div>
	),
};

export const WithLabel: Story = {
	render: () => (
		<div className="grid gap-1.5 w-56">
			<Label htmlFor="zone-select">Search zone</Label>
			<Select>
				<SelectTrigger id="zone-select">
					<SelectValue placeholder="Select zone" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="4a">Zone 4A</SelectItem>
					<SelectItem value="4b">Zone 4B</SelectItem>
					<SelectItem value="5a">Zone 5A</SelectItem>
					<SelectItem value="5b">Zone 5B</SelectItem>
				</SelectContent>
			</Select>
		</div>
	),
};
