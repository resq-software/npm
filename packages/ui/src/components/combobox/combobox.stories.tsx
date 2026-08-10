// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/react";

import { Label } from "../label";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "./combobox";

const zones = [
	{ label: "Grid 1A — Northern perimeter", value: "grid-1a" },
	{ label: "Grid 2B — Eastern sector", value: "grid-2b" },
	{ label: "Grid 3C — Urban core", value: "grid-3c" },
	{ label: "Grid 4B — Southern valley", value: "grid-4b" },
	{ label: "Grid 5D — Coastal strip", value: "grid-5d" },
	{ label: "Grid 6E — Mountain approach", value: "grid-6e" },
];

const meta: Meta<typeof Combobox> = {
	component: Combobox,
	tags: ["autodocs"],
	title: "Forms/Combobox",
};

export default meta;
type Story = StoryObj<typeof Combobox>;

/**
 * The resting state an operator meets first. A placeholder is a hint, not a
 * name — it vanishes the moment typing starts — so the field carries a visible
 * `Label` that survives input and gives the control a stable name.
 */
export const Default: Story = {
	render: () => (
		<div className="grid gap-1.5 w-64">
			<Label htmlFor="zone-search">Search zone</Label>
			<Combobox>
				<ComboboxInput id="zone-search" placeholder="Search zone…" showClear />
				<ComboboxContent>
					<ComboboxList>
						<ComboboxEmpty>No zones found.</ComboboxEmpty>
						{zones.map((zone) => (
							<ComboboxItem key={zone.value} value={zone.value}>
								{zone.label}
							</ComboboxItem>
						))}
					</ComboboxList>
				</ComboboxContent>
			</Combobox>
		</div>
	),
};

/**
 * Selection is the state that grows the control a second button: the clear
 * affordance only exists once there is something to clear. Two icon-only
 * buttons then sit side by side, and a screen reader user has to tell
 * "Show options" from "Clear selection" without seeing either glyph.
 */
export const WithPreselected: Story = {
	render: () => (
		<div className="grid gap-1.5 w-64">
			<Label htmlFor="zone-search-preselected">Assigned zone</Label>
			<Combobox defaultValue="grid-4b">
				<ComboboxInput id="zone-search-preselected" placeholder="Search zone…" showClear />
				<ComboboxContent>
					<ComboboxList>
						<ComboboxEmpty>No zones found.</ComboboxEmpty>
						{zones.map((zone) => (
							<ComboboxItem key={zone.value} value={zone.value}>
								{zone.label}
							</ComboboxItem>
						))}
					</ComboboxList>
				</ComboboxContent>
			</Combobox>
		</div>
	),
};

/**
 * Dropping the clear affordance suits a field that must always hold a value —
 * dispatch cannot leave a responder slot empty. The trigger is then the only
 * button in the group, and still has to announce itself.
 */
export const WithoutClear: Story = {
	render: () => (
		<div className="grid gap-1.5 w-64">
			<Label htmlFor="responder-search">Assigned responder</Label>
			<Combobox>
				<ComboboxInput id="responder-search" placeholder="Select responder…" />
				<ComboboxContent>
					<ComboboxList>
						<ComboboxEmpty>No responders found.</ComboboxEmpty>
						{[
							{ label: "Sgt. Rivera (BRAVO-1)", value: "sgt-rivera" },
							{ label: "Cpl. Chen (BRAVO-2)", value: "cpl-chen" },
							{ label: "Pvt. Okafor (BRAVO-3)", value: "pvt-okafor" },
						].map((r) => (
							<ComboboxItem key={r.value} value={r.value}>
								{r.label}
							</ComboboxItem>
						))}
					</ComboboxList>
				</ComboboxContent>
			</Combobox>
		</div>
	),
};
