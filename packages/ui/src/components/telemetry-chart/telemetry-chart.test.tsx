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

/** The inner plot's props — geometry now lives one level below the root. */
function plotOf(props: Record<string, unknown>): Record<string, unknown> {
	return slots(TelemetryChart(props), "telemetry-chart-plot")[0] ?? {};
}

/** The text a visible slot renders, or an empty string when it is absent. */
function textOf(props: Record<string, unknown>, slot: string): string {
	return String(slots(TelemetryChart(props), slot)[0]?.children ?? "");
}

/** The x coordinate of the path's last point, in viewBox units (0 to 300). */
function finalX(path: string): number {
	const pairs = path.split(/[ML]/).filter((part) => part.trim() !== "");
	return Number((pairs[pairs.length - 1] ?? "").trim().split(" ")[0]);
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

	it("keeps the trace in a plot of its own, silent to a screen reader", () => {
		// The root carries the role and the name; a second described node inside it
		// would have the whole window announced twice.
		const plot = plotOf({ samples: steady([1, 2, 3]) });

		expect(plot["data-slot"]).toBe("telemetry-chart-plot");
		expect(plot["aria-hidden"]).toBe("true");
	});

	it("stretches that plot to the panel rather than sitting it in a letterbox", () => {
		const plot = plotOf({ samples: steady([1, 2, 3]) });

		expect(plot.preserveAspectRatio).toBe("none");
		expect(plot.viewBox).toBe("0 0 300 100");
	});

	it("gives the root a height so the plot has something to fill", () => {
		// The plot is absolutely positioned inside the root, so a root with no
		// height of its own would render the component as two lines of text.
		expect(String(TelemetryChart({ samples: steady([1]) }).props.className)).toContain("h-24");
	});

	it("lets a caller size the strip themselves", () => {
		const element = TelemetryChart({ className: "h-40", samples: steady([1]) });

		expect(String(element.props.className)).toContain("h-40");
		expect(String(element.props.className)).not.toContain("h-24");
	});
});

describe("TelemetryChart readout", () => {
	it("prints the latest value where an operator can read it", () => {
		// Everything this component knew used to live in its aria-label alone: the
		// shape of the pack voltage was on screen and the number was not.
		expect(
			textOf(
				{ name: "Pack voltage", samples: steady([24.1, 25.5]), unit: "volts" },
				"telemetry-chart-value",
			),
		).toBe("25.5");
	});

	it("shows the unit beside the figure", () => {
		expect(textOf({ samples: steady([25.5]), unit: "volts" }, "telemetry-chart-unit")).toBe(
			"volts",
		);
	});

	it("names what the series measures", () => {
		expect(textOf({ name: "Pack voltage", samples: steady([25.5]) }, "telemetry-chart-name")).toBe(
			"Pack voltage",
		);
	});

	it("rounds a float rather than printing its noise", () => {
		// A reading arrives off the vehicle as 0.30000000000000004, and fourteen
		// decimal places is fourteen digits before the one that changed.
		expect(textOf({ samples: [{ t: 0, value: 0.1 + 0.2 }] }, "telemetry-chart-value")).toBe("0.30");
	});

	it("sheds decimals as the figure grows", () => {
		expect(textOf({ samples: [{ t: 0, value: 481.27 }] }, "telemetry-chart-value")).toBe("481");
	});

	it("holds the digits in their columns as they change", () => {
		// Proportional figures make the headline shuffle sideways on every frame.
		const value = slots(TelemetryChart({ samples: steady([1]) }), "telemetry-chart-value")[0];

		expect(String(value?.className)).toContain("tabular-nums");
	});

	it("shows an em dash rather than a number it does not have", () => {
		expect(textOf({ unit: "volts" }, "telemetry-chart-value")).toBe("—");
	});
});

describe("TelemetryChart axis bounds", () => {
	it("prints the domain a caller fixed", () => {
		const args = { max: 100, min: 0, samples: steady([10, 90]) };

		expect(textOf(args, "telemetry-chart-axis-high")).toBe("100");
		expect(textOf(args, "telemetry-chart-axis-low")).toBe("0");
	});

	it("shows where a band pushed the domain, since the props never say", () => {
		// The axis absorbs band edges, so a chart drawn from 24 volt readings can
		// have a 48 volt scale and nothing else on screen would admit it.
		const args = {
			bands: [{ from: 46, severity: "critical" as const }],
			samples: [
				{ t: 0, value: 24 },
				{ t: 1000, value: 26 },
			],
		};

		expect(textOf(args, "telemetry-chart-axis-high")).toBe("48.2");
		expect(textOf(args, "telemetry-chart-axis-low")).toBe("24.0");
	});

	it("gives both bounds one precision so they read as a single scale", () => {
		const args = { samples: steady([0.25, 0.75]) };

		expect(textOf(args, "telemetry-chart-axis-high")).toBe("0.75");
		expect(textOf(args, "telemetry-chart-axis-low")).toBe("0.25");
	});

	it("claims no scale over a feed that sent nothing", () => {
		// The empty domain is a 0 to 1 fallback, not a measurement.
		expect(textOf({}, "telemetry-chart-axis-high")).toBe("—");
		expect(textOf({}, "telemetry-chart-axis-low")).toBe("—");
	});
});

describe("TelemetryChart empty state", () => {
	it("says NO DATA rather than rendering a blank rectangle", () => {
		// An empty box reads as a panel that failed to render, and sends an
		// operator hunting a console fault instead of a silent vehicle.
		expect(textOf({ name: "Pack voltage", unit: "volts" }, "telemetry-chart-empty")).toBe(
			"NO DATA",
		);
	});

	it("keeps the spoken summary it has always given", () => {
		expect(labelOf({})).toBe("Telemetry, no data");
	});

	it("drops the notice the moment a reading arrives", () => {
		expect(slots(TelemetryChart({ samples: steady([1]) }), "telemetry-chart-empty")).toHaveLength(
			0,
		);
	});
});

describe("TelemetryChart pinned window", () => {
	/** Twenty-one seconds of a 1 Hz feed, then silence. */
	const stopped = steady(Array.from({ length: 21 }, (_unused, index) => index));

	it("stops the trace short when the feed stopped short", () => {
		// Twenty of the window's sixty seconds carry data, so the stroke ends a
		// third of the way across and the silence occupies the width it really did.
		expect(finalX(pathOf(stopped, { now: 60_000, windowMs: 60_000 }))).toBeCloseTo(100, 2);
	});

	it("draws that same dead feed to the right edge without a window", () => {
		// The failure the prop exists for: an axis fitted to its own data puts the
		// newest sample flush right however old it is, so a feed that stopped forty
		// seconds ago is indistinguishable from one still reporting.
		expect(finalX(pathOf(stopped))).toBeCloseTo(300, 2);
	});

	it("starts the pinned window at its own left edge", () => {
		expect(pathOf(stopped, { now: 60_000, windowMs: 60_000 }).startsWith("M0.00")).toBe(true);
	});

	it("ignores a window with no instant to anchor it", () => {
		expect(finalX(pathOf(stopped, { windowMs: 60_000 }))).toBeCloseTo(300, 2);
	});

	it("ignores an anchor with no window to measure back from", () => {
		expect(finalX(pathOf(stopped, { now: 60_000 }))).toBeCloseTo(300, 2);
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

	it("raises no alarm over an empty feed", () => {
		// Over no data the domain falls back to 0..1, so a downward-open critical
		// band — under-voltage, under-keel, the commonest kind — used to fill the
		// whole panel solid red while the label said "no data". Absence of data is
		// not an alarm condition.
		expect(
			slots(
				TelemetryChart({ bands: [{ severity: "critical", to: 46 }], samples: [] }),
				"telemetry-chart-band",
			),
		).toHaveLength(0);
	});

	it("fits the axis around a band so a threshold is actually visible", () => {
		// A threshold is by definition outside the data range; without folding its
		// edges into an auto-fitted domain every band computed zero height and drew
		// nothing at all — including in the component's own documented example.
		const band = slots(
			TelemetryChart({
				bands: [{ from: 46, severity: "critical" }],
				samples: [
					{ t: 0, value: 24 },
					{ t: 1000, value: 26 },
				],
			}),
			"telemetry-chart-band",
		)[0];

		expect(Number(band?.height)).toBeGreaterThan(0);
	});

	it("keeps a caller-fixed bound exactly, moving only the automatic side", () => {
		const band = slots(
			TelemetryChart({
				bands: [{ from: 46, severity: "critical" }],
				min: 0,
				samples: [{ t: 0, value: 24 }],
			}),
			"telemetry-chart-band",
		)[0];

		// min stays 0, so the band's lower edge maps below the top of the frame.
		expect(Number(band?.height)).toBeGreaterThan(0);
		expect(Number(band?.y)).toBe(0);
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
