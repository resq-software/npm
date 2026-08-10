// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the AlertList component —
 * the fault states an operator has to read correctly at a glance,
 * for visual review and Chromatic regression.
 *
 * @module @resq-systems/ui/components/alert-list/alert-list.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import { AlertList } from "./alert-list";

/**
 * A fixed epoch rather than the clock. Chromatic diffs pixels, so first-seen
 * stamps that moved between runs would flag every build as a change.
 */
const START_MS = 1_767_225_600_000;

const meta: Meta<typeof AlertList> = {
	argTypes: {
		maxVisible: { control: { max: 20, min: 0, step: 1, type: "range" } },
	},
	component: AlertList,
	tags: ["autodocs"],
	title: "Console/Alert List",
};

export default meta;
type Story = StoryObj<typeof AlertList>;

/**
 * Handed in the order a feed produces — oldest and least important first — which
 * is the worst order to read under load. Rank puts the fault that ends the
 * mission at the top, so it is never the row somebody has to scroll to find.
 */
export const MixedSeverities: Story = {
	args: {
		alerts: [
			{
				firstSeen: START_MS + 500,
				id: "mission-start",
				message: "Mission started",
				severity: "info",
				source: "planner",
			},
			{
				firstSeen: START_MS + 1_000,
				id: "gps-degraded",
				message: "GPS degraded, four satellites locked",
				severity: "warning",
				source: "gnss",
			},
			{
				firstSeen: START_MS + 2_000,
				id: "overcurrent",
				message: "Motor overcurrent on port drive",
				severity: "critical",
				source: "battery",
			},
		],
	},
};

/**
 * The same faults, but the operator can now clear them. Acknowledgement is the
 * only thing that retires a latched row, so without this control the list only
 * ever grows and stops being read.
 */
export const Acknowledgeable: Story = {
	args: { ...MixedSeverities.args, onAcknowledge: () => undefined },
};

/**
 * One stuck fault on a 10 Hz feed would push six hundred rows through the panel
 * in a minute and bury everything underneath it. Folded into a single row that
 * carries its own count, the burst becomes evidence of severity instead of noise.
 */
export const RepeatingFault: Story = {
	args: {
		alerts: [
			{
				count: 600,
				firstSeen: START_MS + 200,
				id: "overcurrent",
				message: "Motor overcurrent on port drive",
				severity: "critical",
				source: "battery",
			},
			{
				count: 4,
				firstSeen: START_MS + 900,
				id: "thruster-fault",
				message: "Thruster 2 fault, no feedback",
				severity: "warning",
				source: "propulsion",
			},
		],
		onAcknowledge: () => undefined,
	},
};

/**
 * The condition went away on its own; the row does not. A momentary overcurrent
 * that appears and vanishes between glances is precisely the fault nobody sees,
 * so it stays listed and marked cleared until somebody has answered for it —
 * and it sits below the live fault, which still needs the hands.
 */
export const LatchedAndCleared: Story = {
	args: {
		alerts: [
			{
				active: false,
				count: 18,
				firstSeen: START_MS + 300,
				id: "overcurrent",
				message: "Motor overcurrent on port drive",
				severity: "critical",
				source: "battery",
			},
			{
				active: true,
				firstSeen: START_MS + 1_400,
				id: "thruster-fault",
				message: "Thruster 2 fault, no feedback",
				severity: "critical",
				source: "propulsion",
			},
		],
		onAcknowledge: () => undefined,
	},
};

/**
 * An acknowledged fault is dimmed and sinks below its unacknowledged peers, but
 * it is not deleted. Removing it would erase the history an operator needs when
 * the same fault returns ten minutes later, so it is demoted rather than hidden.
 */
export const PartlyAcknowledged: Story = {
	args: {
		alerts: [
			{
				acknowledged: true,
				firstSeen: START_MS + 100,
				id: "gps-degraded",
				message: "GPS degraded, four satellites locked",
				severity: "warning",
				source: "gnss",
			},
			{
				acknowledged: false,
				firstSeen: START_MS + 1_600,
				id: "thruster-fault",
				message: "Thruster 2 fault, no feedback",
				severity: "warning",
				source: "propulsion",
			},
			{
				acknowledged: true,
				firstSeen: START_MS + 400,
				id: "mission-start",
				message: "Mission started",
				severity: "info",
				source: "planner",
			},
		],
		onAcknowledge: () => undefined,
	},
};

/**
 * A console panel has a fixed height and a fault storm does not. Truncation
 * keeps the worst rows on screen and summarises the tail in one line, so the
 * list degrades by dropping the least urgent rather than by scrolling away
 * the most urgent.
 */
export const Truncated: Story = {
	args: {
		alerts: [
			{
				count: 240,
				firstSeen: START_MS + 100,
				id: "overcurrent",
				message: "Motor overcurrent on port drive",
				severity: "critical",
				source: "battery",
			},
			{
				firstSeen: START_MS + 150,
				id: "gps-degraded",
				message: "GPS degraded, four satellites locked",
				severity: "warning",
				source: "gnss",
			},
			...Array.from({ length: 12 }, (_unused, index) => ({
				firstSeen: START_MS + 200 + index,
				id: `thruster-${index}`,
				message: `Thruster ${index + 1} fault, no feedback`,
				severity: "warning" as const,
				source: "propulsion",
			})),
		],
		maxVisible: 5,
		onAcknowledge: () => undefined,
	},
};

/**
 * Faults arrive worded by whoever wrote the node, and some of them arrive as a
 * paragraph. A row is one line tall and clips rather than wraps, so a talkative
 * fault cannot grow tall enough to push the rows beneath it off the panel. The
 * severity word, the source and the acknowledge control keep their positions no
 * matter how long the text runs, which is what makes the column scannable.
 */
export const LongMessages: Story = {
	args: {
		alerts: [
			{
				count: 3,
				firstSeen: START_MS + 200,
				id: "overcurrent",
				message:
					"Motor overcurrent on port drive: sustained draw above the continuous rating for 4.2 seconds, controller now limited to 60 percent until the winding temperature falls back under the limit",
				severity: "critical",
				source: "battery",
			},
			{
				firstSeen: START_MS + 800,
				id: "gps-degraded",
				message:
					"GPS degraded, four satellites locked and horizontal accuracy above the mission threshold; position hold will drift until a fifth satellite is acquired",
				severity: "warning",
				source: "gnss",
			},
			{
				firstSeen: START_MS + 1_200,
				id: "mission-start",
				message: "Mission started",
				severity: "info",
				source: "planner",
			},
		],
		onAcknowledge: () => undefined,
	},
};

/**
 * The whole ladder at one severity, so the ordering rule is visible without
 * colour doing the work: live and unanswered on top, then the latched clear that
 * still wants an answer, then the answered fault that is still happening, and at
 * the bottom the fault that both cleared itself and was acknowledged. That last
 * row asks nothing of anybody, yet it is not deleted — "it happened and we saw
 * it" is exactly the evidence wanted when the same fault returns in ten minutes.
 */
export const FullyRetired: Story = {
	args: {
		alerts: [
			{
				acknowledged: false,
				active: true,
				firstSeen: START_MS + 100,
				id: "thruster-fault",
				message: "Thruster 2 fault, no feedback",
				severity: "warning",
				source: "propulsion",
			},
			{
				acknowledged: false,
				active: false,
				count: 6,
				firstSeen: START_MS + 400,
				id: "gps-degraded",
				message: "GPS degraded, four satellites locked",
				severity: "warning",
				source: "gnss",
			},
			{
				acknowledged: true,
				active: true,
				firstSeen: START_MS + 900,
				id: "tether-tension",
				message: "Tether tension above the working limit",
				severity: "warning",
				source: "winch",
			},
			{
				acknowledged: true,
				active: false,
				count: 18,
				firstSeen: START_MS + 1_500,
				id: "overcurrent",
				message: "Motor overcurrent on port drive",
				severity: "warning",
				source: "battery",
			},
		],
		onAcknowledge: () => undefined,
	},
};

/**
 * Quiet has to look deliberate. A blank panel is indistinguishable from a dead
 * feed, so an empty list says in words that there is nothing to answer for.
 */
export const NoData: Story = {
	args: {},
};
