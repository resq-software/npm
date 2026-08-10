/**
 * Copyright 2026 ResQ Systems, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview TelemetryChart — a time series that refuses to invent data.
 *
 * Three things separate this from a general-purpose charting component:
 *
 * 1. **Gaps are gaps.** When the link drops for thirty seconds, a chart library
 *    joins the sample before to the sample after with a straight line. That
 *    line is a claim about readings the vehicle never sent. Here a dropout
 *    breaks the path, so absent data looks absent.
 * 2. **Spikes survive downsampling.** Above the point budget the series is
 *    bucketed and each bucket contributes its minimum *and* maximum, in the
 *    order they occurred. Averaging would erase the one-sample overcurrent that
 *    is the entire reason someone opened the chart.
 * 3. **Element count is bounded.** The whole series is one `<path>` whatever
 *    the sample count, because a console runs a dozen of these at once and
 *    per-sample DOM nodes are how a dashboard stops answering the keyboard.
 *
 * The caller owns the ring buffer; this renders whatever window it is handed.
 * Stateless, hook-free, pure SVG — no charting dependency reaches the console.
 *
 * @module @resq-systems/ui/components/telemetry-chart/telemetry-chart
 */

import type * as React from "react";

import { cn } from "../../lib/utils.js";

//#region Constants

/** Plot area in user units. Wide and short, as a sparkline strip should be. */
const VIEW_WIDTH = 300;
const VIEW_HEIGHT = 100;

/**
 * Points the path may contain. Bounded so a 10 Hz feed over an hour renders in
 * the same time as a one-minute window.
 */
const MAX_POINTS = 240;

/** Bands rendered; anything beyond is dropped rather than silently stacking. */
const MAX_BANDS = 4;

/** A y-range of zero cannot be scaled, so it is padded by this much. */
const FLAT_RANGE_PAD = 0.5;

/** Nominal intervals of silence that constitute a dropout, not a slow feed. */
const GAP_INTERVALS = 4;

/**
 * Quantile used to estimate the feed's nominal period.
 *
 * Deliberately not the median. A dropout can only ever make an interval
 * *longer*, never shorter, so the median is safe only while fewer than half the
 * intervals are outages — and a link bad enough to break that is precisely the
 * one whose dropouts must not be hidden. A low quantile keeps the estimate
 * anchored to the feed's healthy rate however ragged the window becomes.
 */
const NOMINAL_QUANTILE = 0.25;

const BAND_TONE = {
	critical: "fill-destructive/15",
	warning: "fill-warning/15",
} as const;

//#endregion

//#region Types

/** One reading. `value` absent or non-finite means the vehicle sent nothing. */
export interface ChartSample {
	/** Epoch milliseconds. Used only for x-position and gap detection. */
	t: number;
	value?: number;
}

/** A shaded region of the value axis, e.g. "above 46 volts is critical". */
export interface ThresholdBand {
	/** Lower edge; omit for an open-ended band running to the axis minimum. */
	from?: number;
	/** Upper edge; omit for an open-ended band running to the axis maximum. */
	to?: number;
	severity: "warning" | "critical";
}

export interface TelemetryChartProps extends React.ComponentProps<"svg"> {
	samples?: readonly ChartSample[];
	/** Fixed axis minimum. Defaults to the data's own minimum. */
	min?: number;
	/** Fixed axis maximum. Defaults to the data's own maximum. */
	max?: number;
	/**
	 * Silence longer than this is a dropout. Defaults to four times the feed's
	 * nominal period, so a 1 Hz feed and a 50 Hz feed each get a sensible
	 * threshold without the caller having to state one.
	 */
	gapMs?: number;
	bands?: readonly ThresholdBand[];
	/** Unit for the accessible summary, e.g. `"volts"`. */
	unit?: string;
	/** What the series measures, e.g. `"Pack voltage"`. */
	name?: string;
	stale?: boolean;
	/** Overrides the auto-generated `aria-label`. */
	label?: string;
}

//#endregion

//#region Data preparation

/** A sample that actually carries a reading. */
interface Reading {
	t: number;
	value: number;
}

/** A reading chosen for drawing, plus whether it starts a new stroke. */
interface Point extends Reading {
	/** True when a dropout separates this point from the one drawn before it. */
	broken: boolean;
}

/** Keep only plottable samples, in time order. */
function readingsOf(samples: readonly ChartSample[]): Reading[] {
	const kept: Reading[] = [];
	for (const sample of samples) {
		if (!Number.isFinite(sample.t)) continue;
		if (sample.value === undefined || !Number.isFinite(sample.value)) continue;
		kept.push({ t: sample.t, value: sample.value });
	}
	// Sorting the array `filter` already produced, so the caller's stays untouched.
	return kept.sort((left, right) => left.t - right.t);
}

/** Estimate the feed's healthy period from a low quantile of its intervals. */
function nominalInterval(readings: readonly Reading[]): number {
	if (readings.length < 2) return 0;

	const deltas: number[] = [];
	for (let index = 1; index < readings.length; index += 1) {
		deltas.push((readings[index]?.t ?? 0) - (readings[index - 1]?.t ?? 0));
	}
	deltas.sort((left, right) => left - right);
	return deltas[Math.floor((deltas.length - 1) * NOMINAL_QUANTILE)] ?? 0;
}

/**
 * For each reading, how many dropouts precede it.
 *
 * Computed across the *whole* series, before any downsampling, so a bucket
 * boundary can never be mistaken for an outage and an outage can never be
 * swallowed by a bucket.
 */
function gapPrefix(readings: readonly Reading[], gapMs: number): number[] {
	const prefix: number[] = [0];
	for (let index = 1; index < readings.length; index += 1) {
		const delta = (readings[index]?.t ?? 0) - (readings[index - 1]?.t ?? 0);
		const isGap = gapMs > 0 && delta > gapMs;
		prefix.push((prefix[index - 1] ?? 0) + (isGap ? 1 : 0));
	}
	return prefix;
}

/** Indices of the readings worth drawing, at most `MAX_POINTS` of them. */
function chooseIndices(readings: readonly Reading[]): number[] {
	if (readings.length <= MAX_POINTS) return readings.map((_unused, index) => index);

	const buckets = Math.floor(MAX_POINTS / 2);
	const size = readings.length / buckets;
	const chosen: number[] = [];

	for (let bucket = 0; bucket < buckets; bucket += 1) {
		const start = Math.floor(bucket * size);
		const end = Math.min(readings.length, Math.floor((bucket + 1) * size));
		if (start >= end) continue;

		let lowest = start;
		let highest = start;
		for (let index = start + 1; index < end; index += 1) {
			const value = readings[index]?.value ?? 0;
			if (value < (readings[lowest]?.value ?? 0)) lowest = index;
			if (value > (readings[highest]?.value ?? 0)) highest = index;
		}

		// Occurrence order keeps the line's direction honest, and keeps the chosen
		// indices monotonic so gap counting stays a simple prefix difference.
		if (lowest <= highest) chosen.push(lowest, highest);
		else chosen.push(highest, lowest);
	}

	return chosen;
}

/** Reduce the series to drawable points, each knowing whether it starts anew. */
function toPoints(readings: readonly Reading[], gapMs: number): Point[] {
	const prefix = gapPrefix(readings, gapMs);
	const points: Point[] = [];
	let previous: number | undefined;

	for (const index of chooseIndices(readings)) {
		const reading = readings[index];
		if (reading === undefined) continue;

		// A dropout anywhere between the last drawn point and this one breaks the
		// stroke, even if both ends of the outage were bucketed away.
		const broken = previous === undefined || (prefix[index] ?? 0) - (prefix[previous] ?? 0) > 0;
		points.push({ broken, t: reading.t, value: reading.value });
		previous = index;
	}

	return points;
}

//#endregion

//#region Geometry

interface Scale {
	low: number;
	high: number;
	first: number;
	last: number;
}

/** Work out the axis ranges, honouring caller-fixed bounds. */
function scaleOf(readings: readonly Reading[], min?: number, max?: number): Scale {
	const values = readings.map((reading) => reading.value);
	const dataLow = values.length === 0 ? 0 : Math.min(...values);
	const dataHigh = values.length === 0 ? 1 : Math.max(...values);

	let low = Number.isFinite(min) ? (min as number) : dataLow;
	let high = Number.isFinite(max) ? (max as number) : dataHigh;
	if (high <= low) {
		// A flat series still has to be drawable, and it belongs mid-frame rather
		// than pinned to an edge where it would read as an extreme.
		low -= FLAT_RANGE_PAD;
		high += FLAT_RANGE_PAD;
	}

	return {
		first: readings[0]?.t ?? 0,
		high,
		last: readings[readings.length - 1]?.t ?? 1,
		low,
	};
}

/** Map a value onto the vertical axis, clamped into the plot area. */
function toY(value: number, scale: Scale): number {
	const ratio = (value - scale.low) / (scale.high - scale.low);
	const clamped = Math.min(1, Math.max(0, ratio));
	return VIEW_HEIGHT - clamped * VIEW_HEIGHT;
}

/** Map a timestamp onto the horizontal axis. */
function toX(t: number, scale: Scale): number {
	const span = scale.last - scale.first;
	if (span <= 0) return VIEW_WIDTH;
	return ((t - scale.first) / span) * VIEW_WIDTH;
}

/**
 * Build one path for the whole series. A dropout emits a fresh `M`, which
 * breaks the stroke instead of drawing a line across data that never arrived.
 */
function buildPath(points: readonly Point[], scale: Scale): string {
	return points
		.map((point) => {
			const x = toX(point.t, scale).toFixed(2);
			const y = toY(point.value, scale).toFixed(2);
			return `${point.broken ? "M" : "L"}${x} ${y}`;
		})
		.join(" ");
}

//#endregion

//#region Label

/** Summarise the window: a screen reader cannot read a polyline. */
function formatChartLabel(
	readings: readonly Reading[],
	scale: Scale,
	gaps: number,
	name?: string,
	unit?: string,
): string {
	const subject = name ?? "Telemetry";
	if (readings.length === 0) return `${subject}, no data`;

	const suffix = unit === undefined ? "" : ` ${unit}`;
	const latest = readings[readings.length - 1]?.value ?? 0;
	const values = readings.map((reading) => reading.value);
	const lowest = Math.min(...values);
	const highest = Math.max(...values);
	const parts = [
		`latest ${latest}${suffix}`,
		`range ${lowest} to ${highest}${suffix}`,
		`${readings.length} samples`,
	];

	if (gaps > 0) parts.push(gaps === 1 ? "1 dropout" : `${gaps} dropouts`);
	// The axis is mentioned only when it hides part of the data; otherwise it
	// would merely restate the range already given.
	if (scale.low > lowest || scale.high < highest) {
		parts.push(`axis clipped to ${scale.low} to ${scale.high}${suffix}`);
	}

	return `${subject}, ${parts.join(", ")}`;
}

//#endregion

//#region Component

/**
 * A dropout-aware time series.
 *
 * @example
 * ```tsx
 * <TelemetryChart
 *   bands={[{ from: 46, severity: "critical" }]}
 *   name="Pack voltage"
 *   samples={window}
 *   unit="volts"
 * />
 * ```
 */
function TelemetryChart({
	samples,
	min,
	max,
	gapMs,
	bands,
	unit,
	name,
	stale,
	label,
	className,
	...props
}: Readonly<TelemetryChartProps>) {
	const readings = readingsOf(samples ?? []);
	const scale = scaleOf(readings, min, max);
	const threshold = Number.isFinite(gapMs)
		? (gapMs as number)
		: nominalInterval(readings) * GAP_INTERVALS;

	const points = toPoints(readings, threshold);
	// Every point but the first that starts a new stroke does so because of a
	// dropout, so the stroke breaks and the spoken count can never disagree.
	const gaps = Math.max(0, points.filter((point) => point.broken).length - 1);
	const path = buildPath(points, scale);
	const summary = label ?? formatChartLabel(readings, scale, gaps, name, unit);

	return (
		<svg
			{...props}
			aria-label={stale === true ? `Stale, ${summary}` : summary}
			className={cn("h-full w-full", stale === true && "opacity-45", className)}
			data-slot="telemetry-chart"
			data-stale={stale === true ? "" : undefined}
			preserveAspectRatio="none"
			role="img"
			viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
		>
			{(bands ?? []).slice(0, MAX_BANDS).map((band) => {
				const top = toY(Number.isFinite(band.to) ? (band.to as number) : scale.high, scale);
				const bottom = toY(Number.isFinite(band.from) ? (band.from as number) : scale.low, scale);
				return (
					<rect
						className={BAND_TONE[band.severity]}
						data-slot="telemetry-chart-band"
						height={Math.max(0, bottom - top)}
						key={`${band.severity}-${band.from ?? "min"}-${band.to ?? "max"}`}
						width={VIEW_WIDTH}
						x={0}
						y={top}
					/>
				);
			})}

			{path === "" ? null : (
				<path
					className="fill-none stroke-foreground"
					d={path}
					data-slot="telemetry-chart-line"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					// The viewBox stretches to the panel, so without this the stroke
					// would stretch with it and read thicker on a wide panel.
					vectorEffect="non-scaling-stroke"
				/>
			)}
		</svg>
	);
}

//#endregion

export { TelemetryChart };
