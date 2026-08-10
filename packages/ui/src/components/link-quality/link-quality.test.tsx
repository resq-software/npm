// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { LinkQuality, type LinkQualityProps } from "./link-quality";

/** The five rows, keyed by their name, as the component hands them to `Row`. */
function rows(props: Readonly<LinkQualityProps>) {
	// The stale badge and the `null` that stands in for it when current are also
	// children, so select the Rows by shape rather than assuming position.
	const children = LinkQuality(props).props.children as ({
		props?: { name?: string; value?: string; grade?: string; note?: string };
	} | null)[];
	const rowProps = children
		.map((child) => child?.props)
		.filter(
			(p): p is { name: string; value: string; grade: string; note: string } =>
				p?.name !== undefined,
		);
	return Object.fromEntries(rowProps.map((p) => [p.name, p]));
}

const HEALTHY: LinkQualityProps = {
	fix: "rtk",
	hdop: 0.8,
	latencyMs: 45,
	lossPercent: 1.4,
	rssi: -72,
	satellites: 18,
};

describe("LinkQuality", () => {
	it("exposes a group role with a data-slot for instrumentation", () => {
		const element = LinkQuality(HEALTHY);

		expect(element.props.role).toBe("group");
		expect(element.props["data-slot"]).toBe("link-quality");
	});

	it("narrates every reading it was given", () => {
		expect(LinkQuality(HEALTHY).props["aria-label"]).toBe(
			"Link quality, signal -72 dBm, 1 percent packet loss, 45 millisecond latency, RTK fix, 18 satellites, HDOP 0.8",
		);
	});

	it("says so plainly when it has no link data at all", () => {
		expect(LinkQuality({}).props["aria-label"]).toBe("Link quality, fix unknown");
	});

	it("accepts a caller override for the label", () => {
		expect(LinkQuality({ ...HEALTHY, label: "Downlink" }).props["aria-label"]).toBe("Downlink");
	});
});

describe("LinkQuality grading", () => {
	it("grades a strong signal good and a weak one poor", () => {
		expect(rows({ rssi: -60 }).Signal?.grade).toBe("good");
		expect(rows({ rssi: -80 }).Signal?.grade).toBe("marginal");
		expect(rows({ rssi: -95 }).Signal?.grade).toBe("poor");
	});

	it("grades packet loss with lower being better", () => {
		expect(rows({ lossPercent: 0.5 }).Loss?.grade).toBe("good");
		expect(rows({ lossPercent: 4 }).Loss?.grade).toBe("marginal");
		expect(rows({ lossPercent: 14 }).Loss?.grade).toBe("poor");
	});

	it("grades latency by whether commanding is still sane", () => {
		expect(rows({ latencyMs: 45 }).Latency?.grade).toBe("good");
		expect(rows({ latencyMs: 300 }).Latency?.grade).toBe("marginal");
		expect(rows({ latencyMs: 900 }).Latency?.grade).toBe("poor");
	});

	it("treats a 2D fix as marginal, not as a usable solution", () => {
		expect(rows({ fix: "3d" }).Fix?.grade).toBe("good");
		expect(rows({ fix: "2d" }).Fix?.grade).toBe("marginal");
		expect(rows({ fix: "none" }).Fix?.grade).toBe("poor");
	});

	it("grades weak geometry by HDOP", () => {
		expect(rows({ hdop: 0.9 }).HDOP?.grade).toBe("good");
		expect(rows({ hdop: 3 }).HDOP?.grade).toBe("marginal");
		expect(rows({ hdop: 8 }).HDOP?.grade).toBe("poor");
	});

	it("reports an absent reading as unknown rather than good", () => {
		const absent = rows({});

		expect(absent.Signal?.grade).toBe("unknown");
		expect(absent.Loss?.grade).toBe("unknown");
		expect(absent.Latency?.grade).toBe("unknown");
		expect(absent.Fix?.grade).toBe("unknown");
		expect(absent.HDOP?.grade).toBe("unknown");
	});

	it("treats a non-finite reading as unknown rather than plotting it", () => {
		expect(rows({ rssi: Number.NaN }).Signal?.grade).toBe("unknown");
		expect(rows({ latencyMs: Number.POSITIVE_INFINITY }).Latency?.grade).toBe("unknown");
	});
});

describe("LinkQuality severity wording", () => {
	it("carries severity as a word, never colour alone", () => {
		expect(rows({ rssi: -95 }).Signal?.note).toBe("poor");
		expect(rows({ lossPercent: 4 }).Loss?.note).toBe("marginal");
	});

	it("spells out the fix type rather than grading it silently", () => {
		expect(rows({ fix: "dgps" }).Fix?.note).toBe("DGPS fix");
		expect(rows({}).Fix?.note).toBe("fix unknown");
	});

	it("shows an em dash for an unknown value instead of a misleading zero", () => {
		expect(rows({}).Signal?.value).toBe("—");
		expect(rows({}).Latency?.value).toBe("—");
	});

	it("formats readings with their units", () => {
		const shown = rows(HEALTHY);

		expect(shown.Signal?.value).toBe("-72 dBm");
		expect(shown.Loss?.value).toBe("1.4%");
		expect(shown.Latency?.value).toBe("45 ms");
		expect(shown.Fix?.value).toBe("18 sats");
		expect(shown.HDOP?.value).toBe("0.8");
	});
});

describe("LinkQuality staleness", () => {
	it("marks stale readings for instrumentation and screen readers", () => {
		const element = LinkQuality({ ...HEALTHY, stale: true });

		expect(element.props["data-stale"]).toBe("");
		expect(String(element.props["aria-label"]).startsWith("Stale, ")).toBe(true);
	});

	it("badges staleness rather than only dimming", () => {
		// A dropout dims several panels at once, so dimming alone does not say
		// which reading is old. Every instrument and PanelFrame badge it.
		const children = LinkQuality({ ...HEALTHY, stale: true }).props.children as {
			props?: Record<string, unknown>;
		}[];
		const badge = children.find(
			(child) => child?.props?.["data-slot"] === "link-quality-stale-badge",
		);

		expect(badge).toBeDefined();
	});

	it("shows no badge when the readings are current", () => {
		const children = LinkQuality(HEALTHY).props.children as { props?: Record<string, unknown> }[];

		expect(
			children.find((child) => child?.props?.["data-slot"] === "link-quality-stale-badge"),
		).toBeUndefined();
	});

	it("dims the panel when stale", () => {
		expect(LinkQuality({ ...HEALTHY, stale: true }).props.className).toContain("opacity-45");
	});

	it("carries no staleness marks when the readings are current", () => {
		const element = LinkQuality(HEALTHY);

		expect(element.props["data-stale"]).toBeUndefined();
		expect(element.props.className).not.toContain("opacity-45");
	});

	it("prefixes a custom label with staleness too", () => {
		expect(LinkQuality({ ...HEALTHY, label: "Downlink", stale: true }).props["aria-label"]).toBe(
			"Stale, Downlink",
		);
	});

	it("merges a caller className rather than dropping it", () => {
		expect(LinkQuality({ ...HEALTHY, className: "col-span-2" }).props.className).toContain(
			"col-span-2",
		);
	});
});
