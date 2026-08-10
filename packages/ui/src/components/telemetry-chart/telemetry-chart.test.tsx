// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import * as stories from "./telemetry-chart.stories";
import { type ChartSample, TelemetryChart } from "./telemetry-chart";

/** Props of every node carrying `data-slot`, depth-first. */
function slots(node: unknown, slot: string, acc: Record<string, unknown>[] = []) {
	if (Array.isArray(node)) {
		for (const child of node) slots(child, slot, acc);
		return acc;
	}
	if (node === null || typeof node !== "object") return acc;

	const props = (node as { props?: Record<string, unknown> }).props;
	if (props === undefined) return acc;
	if (props["data-slot"] === slot) acc.push(props);

	slots(props.children, slot, acc);
	return acc;
}

/** The rendered path's `d` attribute, or an empty string when none was drawn. */
function pathOf(samples: readonly ChartSample[], extra: Record<string, unknown> = {}): string {
	const line = slots(TelemetryChart({ samples, ...extra }), "telemetry-chart-line")[0];
	return String(line?.d ?? "");
}

/** The accessible summary. */
function labelOf(props: Record<string, unknown>): string {
	return String(TelemetryChart(props).props["aria-label"]);
}

/** A steady 1 Hz series. */
function steady(values: readonly number[], stepMs = 1000): ChartSample[] {
	return values.map((value, index) => ({ t: index * stepMs, value }));
}

describe("TelemetryChart", () => {
	it("exposes an img role with a data-slot for instrumentation", () => {
		const element = TelemetryChart({ samples: steady([1, 2, 3]) });

		expect(element.props.role).toBe("img");
		expect(element.props["data-slot"]).toBe("telemetry-chart");
	});

	it("summarises the window, since a screen reader cannot read a polyline", () => {
		expect(labelOf({ name: "Pack voltage", samples: steady([24, 26, 25]), unit: "volts" })).toBe(
			"Pack voltage, latest 25 volts, range 24 to 26 volts, 3 samples",
		);
	});

	it("says so plainly when it has nothing to draw", () => {
		expect(labelOf({})).toBe("Telemetry, no data");
	});

	it("draws no path when there is nothing to draw", () => {
		expect(slots(TelemetryChart({}), "telemetry-chart-line")).toHaveLength(0);
	});

	it("accepts a caller override for the label", () => {
		expect(labelOf({ label: "Voltage trend", samples: steady([1]) })).toBe("Voltage trend");
	});
});

describe("TelemetryChart dropouts", () => {
	it("breaks the stroke across a dropout instead of drawing through it", () => {
		// Steady 1 Hz, then thirty seconds of silence, then resumption.
		const path = pathOf([
			{ t: 0, value: 1 },
			{ t: 1000, value: 2 },
			{ t: 2000, value: 3 },
			{ t: 32_000, value: 4 },
			{ t: 33_000, value: 5 },
		]);

		// Two subpaths: one before the outage, one after.
		expect(path.match(/M/g)).toHaveLength(2);
	});

	it("draws one unbroken stroke when the feed is steady", () => {
		expect(pathOf(steady([1, 2, 3, 4, 5])).match(/M/g)).toHaveLength(1);
	});

	it("reports a dropout in the accessible summary", () => {
		expect(
			labelOf({
				samples: [
					{ t: 0, value: 1 },
					{ t: 1000, value: 2 },
					{ t: 2000, value: 3 },
					{ t: 32_000, value: 4 },
				],
			}),
		).toContain("1 dropout");
	});

	it("pluralises multiple dropouts", () => {
		expect(
			labelOf({
				samples: [
					{ t: 0, value: 1 },
					{ t: 1000, value: 2 },
					{ t: 2000, value: 3 },
					{ t: 40_000, value: 4 },
					{ t: 90_000, value: 5 },
				],
			}),
		).toContain("2 dropouts");
	});

	it("mentions no dropouts when the feed never lapsed", () => {
		expect(labelOf({ samples: steady([1, 2, 3]) })).not.toContain("dropout");
	});

	it("draws a reading that is isolated between two dropouts", () => {
		// SVG renders nothing for a moveto never followed by a line, so a reading
		// stranded between two outages would silently vanish — and it is usually
		// the most diagnostically valuable one in the window. A zero-length segment
		// renders as a dot under stroke-linecap="round".
		const path = pathOf([
			{ t: 0, value: 1 },
			{ t: 1000, value: 2 },
			{ t: 60_000, value: 9 },
			{ t: 120_000, value: 4 },
			{ t: 121_000, value: 5 },
		]);

		// The stranded reading is the series maximum, so it sits at the top edge.
		expect(path).toContain("M148.76 0.00 L148.76 0.00");
	});

	it("leaves no bare moveto anywhere in the path", () => {
		const path = pathOf([
			{ t: 0, value: 1 },
			{ t: 60_000, value: 9 },
			{ t: 120_000, value: 4 },
		]);

		// Every subpath must carry at least one drawing command, or it renders
		// nothing at all.
		for (const subpath of path.split("M").slice(1)) {
			expect(subpath).toContain("L");
		}
	});

	it("draws a single-sample window rather than rendering blank", () => {
		expect(pathOf([{ t: 0, value: 7 }])).toBe("M150.00 50.00 L150.00 50.00");
	});

	it("centres a lone reading instead of pinning it to an edge", () => {
		// One instant has no position along a time axis; an edge would imply one.
		expect(pathOf([{ t: 5000, value: 7 }])).toContain("150.00");
	});

	it("still detects dropouts when most of the window is dropout", () => {
		// Three of four intervals are outages, so the median interval is itself an
		// outage. Estimating the period from the median would inflate the threshold
		// until nothing counted as a gap — hiding dropouts on exactly the link that
		// is failing worst.
		expect(
			labelOf({
				samples: [
					{ t: 0, value: 1 },
					{ t: 1000, value: 2 },
					{ t: 40_000, value: 3 },
					{ t: 90_000, value: 4 },
					{ t: 150_000, value: 5 },
				],
			}),
		).toContain("3 dropouts");
	});

	it("invents no dropouts in a dense window that downsampling bucketed", () => {
		// Bucketing leaves seconds between drawn points on a 10 Hz feed; that is an
		// artefact of the budget, not an outage, and must not break the stroke.
		const dense = Array.from({ length: 5000 }, (_unused, index) => ({
			t: index * 100,
			value: index % 50,
		}));

		expect(labelOf({ samples: dense })).not.toContain("dropout");
		expect(pathOf(dense).match(/M/g)).toHaveLength(1);
	});

	it("keeps the spoken count and the broken stroke in agreement when nothing is dropped", () => {
		const ragged = [
			{ t: 0, value: 1 },
			{ t: 1000, value: 2 },
			{ t: 40_000, value: 3 },
			{ t: 41_000, value: 4 },
			{ t: 120_000, value: 5 },
		];

		// Below the point budget every reading is drawn, so two outages means three
		// strokes and the summary must say two.
		expect(pathOf(ragged).match(/M/g)).toHaveLength(3);
		expect(labelOf({ samples: ragged })).toContain("2 dropouts");
	});

	it("counts every outage even when downsampling merges them into one break", () => {
		// Two outages inside a single bucket, far from its extremes, so neither
		// endpoint survives downsampling and they collapse to one stroke break.
		// Counting breaks would report one dropout for two — understating exactly
		// what the operator needs.
		// Buckets here span 41 readings, so 2510 and 2520 sit well inside bucket 60
		// while its drawn extremes are the readings at each end.
		let offset = 0;
		const merged = Array.from({ length: 5000 }, (_unused, index) => {
			if (index === 2510 || index === 2520) offset += 60_000;
			return { t: index * 100 + offset, value: index };
		});

		expect(pathOf(merged).match(/M/g)).toHaveLength(2);
		expect(labelOf({ samples: merged })).toContain("2 dropouts");
	});

	it("honours an explicit gap threshold over the inferred one", () => {
		// A steady 1 Hz feed, but the caller says half a second is already a lapse.
		expect(pathOf(steady([1, 2, 3]), { gapMs: 500 }).match(/M/g)).toHaveLength(3);
	});

	it("treats a missing reading as absent rather than plotting it as zero", () => {
		expect(
			labelOf({ samples: [{ t: 0, value: 1 }, { t: 1000 }, { t: 2000, value: 3 }] }),
		).toContain("2 samples");
	});

	it("ignores a non-finite reading", () => {
		expect(
			labelOf({
				samples: [
					{ t: 0, value: 1 },
					{ t: 1000, value: Number.NaN },
				],
			}),
		).toMatch(/1 sample$/);
	});

	it("says one sample rather than 1 samples", () => {
		expect(labelOf({ samples: steady([7]) })).toMatch(/1 sample$/);
	});
});

describe("TelemetryChart scaling", () => {
	it("orders samples by time even when handed them shuffled", () => {
		expect(
			labelOf({
				samples: [
					{ t: 2000, value: 30 },
					{ t: 0, value: 10 },
					{ t: 1000, value: 20 },
				],
			}),
		).toContain("latest 30");
	});

	it("leaves the caller's array untouched", () => {
		const samples = [
			{ t: 2000, value: 30 },
			{ t: 0, value: 10 },
		];

		TelemetryChart({ samples });

		expect(samples[0]?.t).toBe(2000);
	});

	it("draws a flat series mid-frame rather than pinned to an edge", () => {
		expect(pathOf(steady([5, 5, 5]))).toContain("50.00");
	});

	it("clamps a reading beyond a caller-fixed axis into the plot area", () => {
		const path = pathOf(steady([0, 200]), { max: 100, min: 0 });

		// Pinned to the top edge, never drawn off-canvas.
		expect(path).toContain("0.00");
		expect(path).not.toContain("-");
	});

	it("says when the axis hides part of the data", () => {
		expect(labelOf({ max: 100, min: 0, samples: steady([0, 200]) })).toContain(
			"axis clipped to 0 to 100",
		);
	});

	it("does not mention the axis when it shows everything", () => {
		expect(labelOf({ max: 100, min: 0, samples: steady([10, 90]) })).not.toContain("clipped");
	});
});

describe("TelemetryChart bands", () => {
	it("renders a band per threshold", () => {
		const element = TelemetryChart({
			bands: [
				{ from: 80, severity: "critical" },
				{ from: 60, severity: "warning", to: 80 },
			],
			max: 100,
			min: 0,
			samples: steady([50]),
		});

		expect(slots(element, "telemetry-chart-band")).toHaveLength(2);
	});

	it("runs an open-ended band to the axis edge", () => {
		const band = slots(
			TelemetryChart({
				bands: [{ from: 80, severity: "critical" }],
				max: 100,
				min: 0,
				samples: steady([50]),
			}),
			"telemetry-chart-band",
		)[0];

		// From 80 up to the axis maximum: the top fifth of the frame.
		expect(band?.y).toBeCloseTo(0, 6);
		expect(band?.height).toBeCloseTo(20, 6);
	});

	it("distinguishes severities by class, not position alone", () => {
		const bands = slots(
			TelemetryChart({
				bands: [
					{ from: 80, severity: "critical" },
					{ from: 60, severity: "warning", to: 80 },
				],
				max: 100,
				min: 0,
				samples: steady([50]),
			}),
			"telemetry-chart-band",
		);

		expect(String(bands[0]?.className)).toContain("destructive");
		expect(String(bands[1]?.className)).toContain("warning");
	});

	it("caps the number of bands rather than stacking them without limit", () => {
		const bands = Array.from({ length: 12 }, (_unused, index) => ({
			from: index * 5,
			severity: "warning" as const,
			to: index * 5 + 4,
		}));

		expect(
			slots(TelemetryChart({ bands, samples: steady([1]) }), "telemetry-chart-band").length,
		).toBeLessThanOrEqual(4);
	});
});

describe("TelemetryChart element budget", () => {
	const many = Array.from({ length: 5000 }, (_unused, index) => ({
		t: index * 100,
		value: index,
	}));

	it("renders one path however many samples it is handed", () => {
		expect(slots(TelemetryChart({ samples: many }), "telemetry-chart-line")).toHaveLength(1);
	});

	it("bounds the point count so a long window costs no more than a short one", () => {
		expect(pathOf(many).split(/[ML]/).length - 1).toBeLessThanOrEqual(240);
	});

	it("survives a window larger than the engine's argument limit", () => {
		// The caller owns the ring buffer, so this length is not hypothetical.
		// `Math.min(...values)` would throw RangeError here and take the whole
		// panel's render down with it.
		const huge = Array.from({ length: 200_000 }, (_unused, index) => ({
			t: index * 100,
			value: index % 97,
		}));

		expect(() => TelemetryChart({ samples: huge })).not.toThrow();
		expect(labelOf({ samples: huge })).toContain("range 0 to 96");
	});

	it("keeps a one-sample spike rather than averaging it away", () => {
		const spiky = Array.from({ length: 5000 }, (_unused, index) => ({
			t: index * 100,
			value: index === 2500 ? 999 : 1,
		}));

		// The spike must survive downsampling into the window's maximum.
		expect(labelOf({ samples: spiky })).toContain("to 999");
	});
});

describe("TelemetryChart documented states", () => {
	/** Every exported story except the default meta, as name/args pairs. */
	const cases = Object.entries(stories as Record<string, unknown>)
		.filter(([name]) => name !== "default")
		.map(
			([name, story]) => [name, (story as { args?: Record<string, unknown> }).args ?? {}] as const,
		);

	it("exports the stories under test", () => {
		expect(cases.length).toBeGreaterThan(5);
	});

	it.each(cases)("renders something visible for %s", (name, args) => {
		const line = slots(TelemetryChart(args), "telemetry-chart-line")[0];
		const bands = slots(TelemetryChart(args), "telemetry-chart-band");
		const drawn = String(line?.d ?? "");

		// `NoData` is the one state with genuinely nothing to draw.
		if (name === "NoData") {
			expect(drawn).toBe("");
			return;
		}

		// A path made only of movetos renders as an empty box, which reads to an
		// operator as a broken panel rather than as data.
		expect(drawn, `${name} drew no path`).not.toBe("");
		expect(drawn, `${name} drew only movetos`).toContain("L");
		expect(bands.length + (drawn === "" ? 0 : 1)).toBeGreaterThan(0);
	});
});

describe("TelemetryChart staleness", () => {
	it("marks stale data for instrumentation and screen readers", () => {
		const element = TelemetryChart({ samples: steady([1, 2]), stale: true });

		expect(element.props["data-stale"]).toBe("");
		expect(String(element.props["aria-label"]).startsWith("Stale, ")).toBe(true);
	});

	it("dims the chart when stale", () => {
		expect(TelemetryChart({ samples: steady([1]), stale: true }).props.className).toContain(
			"opacity-45",
		);
	});

	it("prefixes a custom label with staleness too", () => {
		expect(labelOf({ label: "Voltage trend", samples: steady([1]), stale: true })).toBe(
			"Stale, Voltage trend",
		);
	});

	it("carries no staleness marks when current", () => {
		const element = TelemetryChart({ samples: steady([1]) });

		expect(element.props["data-stale"]).toBeUndefined();
		expect(element.props.className).not.toContain("opacity-45");
	});
});
