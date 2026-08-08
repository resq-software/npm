// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the ContactScope component — traffic
 * pictures covering open water, a close-quarters situation, a busy lane and
 * head-up orientation, for visual review and Chromatic regression.
 *
 * @module @resq-systems/ui/components/contact-scope/contact-scope.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import { ContactScope, type ScopeContact } from "./contact-scope";

const OPEN_WATER: ScopeContact[] = [
	{ bearing: 120, course: 300, cpa: 2.4, id: "BRAVO", range: 3.4, speed: 8, tcpa: 22 },
	{ bearing: 300, course: 95, cpa: 3.1, id: "CHARLIE", range: 5.1, speed: 14, tcpa: 34 },
];

const CLOSE_QUARTERS: ScopeContact[] = [
	{ bearing: 45, course: 210, cpa: 0.3, id: "ALFA", range: 1.2, speed: 12, tcpa: 8 },
	{ bearing: 78, course: 250, cpa: 0.8, id: "BRAVO", range: 2.1, speed: 9, tcpa: 14 },
	{ bearing: 190, course: 20, cpa: 2.6, id: "CHARLIE", range: 3.8, speed: 6, tcpa: 30 },
	{ bearing: 330, id: "DELTA", range: 4.6 },
];

/** A busy approach lane, past the render cap. */
const SHIPPING_LANE: ScopeContact[] = Array.from({ length: 120 }, (_unused, index) => ({
	bearing: (index * 37) % 360,
	course: (index * 53) % 360,
	cpa: index % 9 === 0 ? 0.4 : 1.5 + (index % 5),
	id: `MMSI-${200_000_000 + index}`,
	range: 0.6 + (index % 52) / 10,
	speed: 4 + (index % 14),
	tcpa: 5 + (index % 40),
}));

const meta: Meta<typeof ContactScope> = {
	argTypes: {
		cpaAlert: { control: { max: 5, min: 0.1, step: 0.1, type: "range" } },
		cpaWarning: { control: { max: 8, min: 0.2, step: 0.1, type: "range" } },
		heading: { control: { max: 359, min: 0, step: 1, type: "range" } },
		rangeMax: { control: { max: 24, min: 1, step: 1, type: "range" } },
	},
	component: ContactScope,
	tags: ["autodocs"],
	title: "Instruments/Contact Scope",
};

export default meta;
type Story = StoryObj<typeof ContactScope>;

export const OpenWater: Story = {
	args: { contacts: OPEN_WATER, heading: 42 },
};

export const CloseQuarters: Story = {
	args: { contacts: CLOSE_QUARTERS, heading: 310 },
};

export const HeadUp: Story = {
	args: { contacts: CLOSE_QUARTERS, heading: 310, northUp: false },
};

export const ShippingLane: Story = {
	args: { contacts: SHIPPING_LANE, heading: 95 },
};

export const MetreScale: Story = {
	args: {
		contacts: [
			{ bearing: 20, cpa: 40, id: "BUOY-3", range: 220, speed: 0 },
			{ bearing: 200, course: 15, cpa: 90, id: "TENDER", range: 640, speed: 5 },
		],
		cpaAlert: 50,
		cpaWarning: 120,
		rangeMax: 1000,
		rangeUnit: "m",
	},
};

export const NoContacts: Story = {
	args: { contacts: [] },
};
