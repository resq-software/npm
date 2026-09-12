// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the TelemetryChart component —
 * representative feed states for visual review and Chromatic regression.
 *
 * @module @resq-systems/ui/components/telemetry-chart/telemetry-chart.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import { type ChartSample, TelemetryChart } from "./telemetry-chart";

/**
 * A fixed epoch rather than the clock. Chromatic diffs pixels, so a series whose
 * timestamps moved between runs would flag every build as a change.
 */
const START_MS = 1_767_225_600_000;

/** Nominal period of the feeds below: 1 Hz, as a vehicle link usually reports. */
const STEP_MS = 1_000;

/** Ninety seconds of silence — long enough that no threshold could excuse it. */
const OUTAGE_MS = 90_000;

/**
 * The shape the chart actually ships in. Sizing goes on the root, which now
 * holds the readout and the axis bounds as well as the trace — hung on the plot
 * instead, the figures above and beside it would be unconstrained and Chromatic
 * would capture a silhouette no console will ever render. A little taller than
 * the trace alone needs, so the strip keeps its proportions under the readout.
 */
const STRIP = "h-28 w-[420px]";

/** Samples in the long window — far past the component's point budget. */
const LONG_WINDOW = 2_000;

/** Where the one-sample overcurrent lands: mid-window, well inside a bucket. */
const SPIKE_INDEX = 1_237;

/** Span of the pinned-window story: two minutes, as a console strip carries. */
const PINNED_WINDOW_MS = 120_000;

/** How much of that window the feed in `PinnedWindow` never got to fill. */
const PINNED_SILENCE_MS = 40_000;

/**
 * A deterministic swell. `Math.sin` gives the shape of a real feed without a
 * random number generator, and the rounding keeps the spoken summary readable.
 */
function wave(index: number, mid: number, amplitude: number, period: number): number {
	return Number((mid + amplitude * Math.sin(index / period)).toFixed(2));
}

/**
 * Build a window of samples. `valueAt` returning `undefined` is a reading the
 * vehicle never sent, and `timeAt` lets a story open a hole in the timeline.
 */
function series(
	count: number,
	valueAt: (index: number) => number | undefined,
	timeAt: (index: number) => number = (index) => index * STEP_MS,
): ChartSample[] {
	return Array.from({ length: count }, (_unused, index) => ({
		t: START_MS + timeAt(index),
		value: valueAt(index),
	}));
}

const meta: Meta<typeof TelemetryChart> = {
	argTypes: {
		gapMs: { control: { max: 30_000, min: 500, step: 500, type: "range" } },
		max: { control: { max: 120, min: 0, step: 1, type: "range" } },
		min: { control: { max: 120, min: 0, step: 1, type: "range" } },
		windowMs: { control: { max: 300_000, min: 10_000, step: 10_000, type: "range" } },
	},
	component: TelemetryChart,
	tags: ["autodocs"],
	title: "Console/Telemetry Chart",
};

export default meta;
type Story = StoryObj<typeof TelemetryChart>;

/**
 * The baseline an operator learns to glance past. Its job is to make every other
 * story here legible by contrast: one unbroken stroke means the link held for
 * the whole window.
 */
export const SteadyFeed: Story = {
	args: {
		className: STRIP,
		name: "Pack voltage",
		samples: series(180, (index) => wave(index, 24.6, 0.35, 9)),
		unit: "volts",
	},
};

/**
 * The reason this component exists. A charting library handed the same window
 * would draw a straight line across readings the vehicle never sent, and that
 * line is a claim — it says the pack held steady through the outage when in
 * truth nobody was listening. Here the stroke simply stops and starts again, so
 * the operator sees that a decision about that ninety seconds has no evidence
 * behind it. The window also contains a single missing reading early on, which
 * is thinning rather than an outage and correctly leaves the stroke intact.
 */
export const Dropout: Story = {
	args: {
		className: STRIP,
		name: "Pack voltage",
		samples: series(
			160,
			(index) => (index === 12 ? undefined : wave(index, 24.4, 0.5, 11)),
			(index) => index * STEP_MS + (index > 74 ? OUTAGE_MS : 0),
		),
		unit: "volts",
	},
};

/**
 * The empty third at the right-hand edge is the story. This feed stopped forty
 * seconds into a two-minute window, and every other chart here would have drawn
 * it flush against the right edge — because an axis fitted to its own data puts
 * the newest sample there whether it landed this second or last minute. The
 * shape would be identical to `SteadyFeed`, and an operator reading a dead pack
 * would see a live one.
 *
 * Given `windowMs` and `now`, the axis stops being a description of the data and
 * becomes a description of time, so the silence takes up exactly as much of the
 * strip as it took of the last two minutes. Nothing is drawn in that third,
 * because nothing was received in it.
 */
export const PinnedWindow: Story = {
	args: {
		className: STRIP,
		name: "Pack voltage",
		now: START_MS + PINNED_WINDOW_MS,
		samples: series((PINNED_WINDOW_MS - PINNED_SILENCE_MS) / STEP_MS, (index) =>
			wave(index, 24.6, 0.4, 12),
		),
		unit: "volts",
		windowMs: PINNED_WINDOW_MS,
	},
};

/**
 * Bands turn a number into a judgement without the operator holding the limits
 * in their head. The stroke leaving the safe middle and entering the shaded
 * region is the alarm, several seconds before any threshold latches.
 */
export const ThresholdBands: Story = {
	args: {
		bands: [
			{ from: 27, severity: "critical" },
			{ from: 26, severity: "warning", to: 27 },
			{ from: 22, severity: "warning", to: 23 },
			{ severity: "critical", to: 22 },
		],
		className: STRIP,
		max: 28,
		min: 21,
		name: "Pack voltage",
		samples: series(200, (index) => wave(index, 25.4, 1.6, 14)),
		unit: "volts",
	},
};

/**
 * A fixed axis keeps a panel of charts comparable, but it can hide an excursion
 * by pinning it to the frame's edge. The summary says the axis is clipped so a
 * reader is never told a peak was 40 amps when the vehicle reported 48.
 */
export const ClippedAxis: Story = {
	args: {
		className: STRIP,
		max: 40,
		min: 0,
		name: "Motor current",
		samples: series(200, (index) => wave(index, 26, 22, 17)),
		unit: "amps",
	},
};

/**
 * Half an hour of motor current at 1 Hz, several times the point budget, with a
 * single one-sample overcurrent buried in the middle of it. The window has to be
 * thinned to be drawable at all, and how it is thinned decides whether that one
 * sample survives: each bucket contributes its lowest *and* highest reading, so
 * the spike still reaches the screen as a lone spar above the swell. An average
 * would fold it into the sixteen ordinary readings either side of it and quietly
 * delete the excursion that is the whole reason someone opened this chart.
 *
 * The other thing worth checking here is that the stroke stays a stroke. This is
 * the story that proves a long window costs no more elements than a short one.
 */
export const LongWindow: Story = {
	args: {
		className: STRIP,
		name: "Motor current",
		samples: series(LONG_WINDOW, (index) =>
			index === SPIKE_INDEX ? 61.4 : wave(index, 18, 6, 40),
		),
		unit: "amps",
	},
};

/**
 * A pack sitting perfectly still. Drawn mid-frame rather than pinned to an edge,
 * because a flat line hugging the top of the plot reads as an extreme at a
 * glance and would send someone to a fault that is not there.
 */
export const FlatSeries: Story = {
	args: {
		className: STRIP,
		name: "Pack voltage",
		samples: series(120, () => 24.6),
		unit: "volts",
	},
};

/**
 * One reading is a point in time, not a trend. Nothing is drawn between samples
 * that do not exist, and the summary counts a single sample so the operator
 * knows the panel has only just started listening.
 */
export const SingleSample: Story = {
	args: {
		className: STRIP,
		name: "Pack voltage",
		samples: series(1, () => 24.6),
		unit: "volts",
	},
};

/**
 * A silent feed reads as empty, never as zero. An empty plot invites someone to
 * go and find out why; a flat line at the bottom of the frame invites them to
 * act on a reading the vehicle never sent.
 */
export const NoData: Story = {
	args: { className: STRIP, name: "Pack voltage", unit: "volts" },
};

/**
 * A frozen trace is more dangerous than a missing one, because it still invites
 * a decision. Dimmed and announced as stale before any of its numbers.
 */
export const Stale: Story = {
	args: { ...SteadyFeed.args, stale: true },
};
