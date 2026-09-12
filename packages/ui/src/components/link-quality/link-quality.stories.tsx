// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the LinkQuality component — link states
 * from a clean RTK downlink to one giving out entirely, for visual review and
 * Chromatic regression.
 *
 * @module @resq-systems/ui/components/link-quality/link-quality.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import { LinkQuality } from "./link-quality";

const meta: Meta<typeof LinkQuality> = {
	argTypes: {
		hdop: { control: { max: 20, min: 0, step: 0.1, type: "range" } },
		latencyMs: { control: { max: 2000, min: 0, step: 10, type: "range" } },
		lossPercent: { control: { max: 100, min: 0, step: 0.1, type: "range" } },
		rssi: { control: { max: -30, min: -120, step: 1, type: "range" } },
		satellites: { control: { max: 32, min: 0, step: 1, type: "range" } },
	},
	component: LinkQuality,
	tags: ["autodocs"],
	title: "Console/Link Quality",
};

export default meta;
type Story = StoryObj<typeof LinkQuality>;

/**
 * The baseline every other story is read against: a clean downlink with an RTK
 * solution and all five rows good. An operator who cannot recognise a healthy
 * panel at a glance cannot recognise a degrading one, so this is the state the
 * eye has to learn first.
 */
export const HealthyLink: Story = {
	args: { fix: "rtk", hdop: 0.8, latencyMs: 45, lossPercent: 1.4, rssi: -72, satellites: 18 },
};

/**
 * Nothing here has failed, which is what makes it worth showing. Every row has
 * drifted into the band where commanding starts to feel late, and the operator
 * has a window to act before the link becomes a dropout rather than after.
 */
export const MarginalLink: Story = {
	args: { fix: "3d", hdop: 3.1, latencyMs: 340, lossPercent: 4.5, rssi: -82, satellites: 9 },
};

/**
 * Signal, loss, latency and fix have gone together — the signature of the link
 * giving out, not of the vehicle breaking. Reported as four independent facts so
 * the operator stops commanding instead of starting to diagnose the vehicle.
 */
export const FailingLink: Story = {
	args: { fix: "none", hdop: 8.4, latencyMs: 940, lossPercent: 14.2, rssi: -96, satellites: 2 },
};

/**
 * The radio is fine and only the solution is short. A 2D fix carries no
 * altitude, so anything derived from it is a guess wearing the clothes of a
 * measurement — graded marginal rather than good even while the link is clean.
 */
export const TwoDimensionalFix: Story = {
	args: { fix: "2d", hdop: 1.6, latencyMs: 60, lossPercent: 0.6, rssi: -70, satellites: 5 },
};

/**
 * A fix carrying differential corrections — better than a plain 3D solution,
 * short of RTK, and graded good alongside both. Worth its own frame because the
 * panel states fix quality in words rather than colour, and "DGPS fix" is
 * wording an operator has to be able to trust the moment they see it.
 */
export const DgpsFix: Story = {
	args: { fix: "dgps", hdop: 1.1, latencyMs: 70, lossPercent: 0.9, rssi: -74, satellites: 12 },
};

/**
 * The GNSS receiver has gone quiet while the radio link is untouched — a state
 * that happens in the field, and the one that decides whether this panel is
 * honest. Signal, loss and latency carry good readings while the fix and HDOP
 * rows fall back to an em dash and the word unknown, so unknown has to sit
 * directly beneath good without borrowing any of its confidence.
 */
export const RadioHealthyGnssSilent: Story = {
	args: { latencyMs: 55, lossPercent: 0.7, rssi: -68 },
};

/**
 * A link reporting nothing at all. Every row shows an em dash and the word
 * unknown, because a confident zero here would be read as a good reading and a
 * missing field is not the same claim as a measured one.
 */
export const NoData: Story = {
	args: {},
};

/**
 * A frozen reading is more dangerous than a missing one, because it still
 * invites a decision. Dimmed, badged, and announced as stale before its numbers.
 */
export const Stale: Story = {
	args: { ...HealthyLink.args, stale: true },
};
