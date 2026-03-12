// Copyright 2026 ResQ
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from "@storybook/nextjs";

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

export const Default: Story = {
	render: () => (
		<Combobox>
			<ComboboxInput placeholder="Search zone…" showClear />
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
	),
};

export const WithPreselected: Story = {
	render: () => (
		<Combobox defaultValue="grid-4b">
			<ComboboxInput placeholder="Search zone…" showClear />
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
	),
};

export const WithoutClear: Story = {
	render: () => (
		<Combobox>
			<ComboboxInput placeholder="Select responder…" />
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
	),
};
