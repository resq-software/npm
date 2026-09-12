// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";

import { AlertList, type ConsoleAlert } from "./alert-list";

//#region Element-tree helpers

/** Collect props of every node carrying `data-slot`, depth-first in render order. */
function collectSlots(node: unknown, slot: string, acc: Record<string, unknown>[] = []) {
	if (Array.isArray(node)) {
		for (const child of node) collectSlots(child, slot, acc);
		return acc;
	}
	if (node === null || typeof node !== "object") return acc;

	const props = (node as { props?: Record<string, unknown> }).props;
	if (props === undefined) return acc;
	if (props["data-slot"] === slot) acc.push(props);

	collectSlots(props.children, slot, acc);
	return acc;
}

/** Rendered rows, in the order the operator sees them. */
function rowsOf(alerts: readonly ConsoleAlert[], maxVisible?: number) {
	return collectSlots(AlertList({ alerts, maxVisible }), "alert-list-item");
}

/** All text a row renders, joined so a single assertion can look for a fragment. */
function textOf(row: Record<string, unknown>): string {
	const texts: string[] = [];
	const walk = (node: unknown) => {
		if (typeof node === "string" || typeof node === "number") {
			texts.push(String(node));
			return;
		}
		if (Array.isArray(node)) {
			for (const child of node) walk(child);
			return;
		}
		if (node === null || typeof node !== "object") return;
		walk((node as { props?: { children?: unknown } }).props?.children);
	};
	walk(row.children);
	return texts.join(" ");
}

/** Locate the acknowledge button inside a row, if the row offers one. */
function buttonOf(row: Record<string, unknown>): { onClick?: () => void } | undefined {
	let found: { onClick?: () => void } | undefined;
	const walk = (node: unknown) => {
		if (found !== undefined) return;
		if (Array.isArray(node)) {
			for (const child of node) walk(child);
			return;
		}
		if (node === null || typeof node !== "object") return;
		const candidate = node as { props?: Record<string, unknown>; type?: unknown };
		if (candidate.type === "button" && candidate.props !== undefined) {
			found = candidate.props as { onClick?: () => void };
			return;
		}
		walk(candidate.props?.children);
	};
	walk(row.children);
	return found;
}

//#endregion

const CRITICAL: ConsoleAlert = {
	firstSeen: 2000,
	id: "overcurrent",
	message: "Motor overcurrent",
	severity: "critical",
	source: "battery",
};

const WARNING: ConsoleAlert = {
	firstSeen: 1000,
	id: "gps-degraded",
	message: "GPS degraded",
	severity: "warning",
	source: "gnss",
};

const INFO: ConsoleAlert = {
	firstSeen: 500,
	id: "mission-start",
	message: "Mission started",
	severity: "info",
	source: "planner",
};

describe("AlertList", () => {
	it("exposes a group role with a data-slot for instrumentation", () => {
		const element = AlertList({ alerts: [CRITICAL] });

		expect(element.props.role).toBe("group");
		expect(element.props["data-slot"]).toBe("alert-list");
	});

	it("summarises counts rather than reciting every row", () => {
		const element = AlertList({ alerts: [CRITICAL, WARNING, INFO] });

		expect(element.props["aria-label"]).toBe(
			"Alerts, 1 critical, 1 warning, 1 info, 3 unacknowledged",
		);
	});

	it("reports an empty list as none", () => {
		expect(AlertList({}).props["aria-label"]).toBe("Alerts, none");
	});

	it("excludes acknowledged alerts from the unacknowledged count", () => {
		const element = AlertList({ alerts: [{ ...CRITICAL, acknowledged: true }, WARNING] });

		expect(element.props["aria-label"]).toBe("Alerts, 1 critical, 1 warning, 1 unacknowledged");
	});

	it("accepts a caller override for the label", () => {
		expect(AlertList({ alerts: [CRITICAL], label: "Faults" }).props["aria-label"]).toBe("Faults");
	});
});

describe("AlertList ordering", () => {
	it("ranks by severity before age", () => {
		// INFO is the oldest and CRITICAL the newest, so severity must still win.
		const rows = rowsOf([INFO, WARNING, CRITICAL]);

		expect(rows.map((row) => row["data-severity"])).toEqual(["critical", "warning", "info"]);
	});

	it("ranks an unacknowledged alert above an acknowledged one of equal severity", () => {
		// The acknowledged one is far older, so age alone would have put it first.
		const rows = rowsOf([
			{ ...WARNING, acknowledged: true, firstSeen: 1, id: "old-ack" },
			{ ...WARNING, id: "fresh" },
		]);

		expect(rows[0]?.["data-acknowledged"]).toBeUndefined();
		expect(rows[1]?.["data-acknowledged"]).toBe("");
	});

	it("ranks a live alert above one that cleared but is still latched", () => {
		const rows = rowsOf([
			{ ...WARNING, active: false, firstSeen: 1, id: "cleared" },
			{ ...WARNING, active: true, id: "live" },
		]);

		expect(rows[0]?.["data-cleared"]).toBeUndefined();
		expect(rows[1]?.["data-cleared"]).toBe("");
	});

	it("breaks a tie by first-seen, oldest first", () => {
		const rows = rowsOf([
			{ ...CRITICAL, firstSeen: 900, id: "newer", message: "Newer" },
			{ ...CRITICAL, firstSeen: 100, id: "older", message: "Older" },
		]);

		expect(rows.map((row) => textOf(row).includes("Older"))).toEqual([true, false]);
	});

	it("does not reorder when only the repeat count changed", () => {
		// A repeating fault bumps `count`; that must never touch the ordering key.
		const before = rowsOf([CRITICAL, WARNING]).map((row) => row["data-severity"]);
		const after = rowsOf([{ ...CRITICAL, count: 600 }, WARNING]).map((row) => row["data-severity"]);

		expect(after).toEqual(before);
	});

	it("leaves the caller's array untouched", () => {
		const alerts = [INFO, CRITICAL];

		AlertList({ alerts });

		expect(alerts[0]).toBe(INFO);
	});
});

describe("AlertList repeats and latching", () => {
	it("shows a repeat count instead of a row per occurrence", () => {
		const rows = rowsOf([{ ...CRITICAL, count: 600 }]);

		expect(rows).toHaveLength(1);
		expect(textOf(rows[0] ?? {})).toContain("x600");
	});

	it("omits the count when the fault has been seen once", () => {
		expect(textOf(rowsOf([{ ...CRITICAL, count: 1 }])[0] ?? {})).not.toContain("x1");
	});

	it("keeps a cleared fault visible and marks it cleared", () => {
		const rows = rowsOf([{ ...CRITICAL, active: false }]);

		expect(rows).toHaveLength(1);
		expect(textOf(rows[0] ?? {})).toContain("cleared");
	});

	it("does not mark a live fault as cleared", () => {
		expect(textOf(rowsOf([{ ...CRITICAL, active: true }])[0] ?? {})).not.toContain("cleared");
	});

	it("falls back to a system source when none is given", () => {
		const rows = rowsOf([{ id: "x", message: "Unattributed", severity: "info" }]);

		expect(textOf(rows[0] ?? {})).toContain("system");
	});

	it("names the severity in text, not by colour alone", () => {
		expect(textOf(rowsOf([CRITICAL])[0] ?? {})).toContain("critical");
	});
});

describe("AlertList acknowledgement", () => {
	it("reports the acknowledged id upward", () => {
		const onAcknowledge = vi.fn();
		const rows = collectSlots(AlertList({ alerts: [CRITICAL], onAcknowledge }), "alert-list-item");

		buttonOf(rows[0] ?? {})?.onClick?.();

		expect(onAcknowledge).toHaveBeenCalledWith("overcurrent");
	});

	it("offers no acknowledge control when the caller cannot handle it", () => {
		expect(buttonOf(rowsOf([CRITICAL])[0] ?? {})).toBeUndefined();
	});

	it("offers no acknowledge control on an already-acknowledged alert", () => {
		const rows = collectSlots(
			AlertList({ alerts: [{ ...CRITICAL, acknowledged: true }], onAcknowledge: vi.fn() }),
			"alert-list-item",
		);

		expect(buttonOf(rows[0] ?? {})).toBeUndefined();
	});
});

describe("AlertList truncation", () => {
	const many = Array.from({ length: 40 }, (_unused, index) => ({
		firstSeen: index,
		id: `alert-${index}`,
		message: `Fault ${index}`,
		severity: "warning" as const,
	}));

	it("renders no more rows than maxVisible", () => {
		expect(rowsOf(many, 5)).toHaveLength(5);
	});

	it("keeps the worst alerts when truncating", () => {
		expect(rowsOf([...many, CRITICAL], 1)[0]?.["data-severity"]).toBe("critical");
	});

	it("treats a negative budget as zero rather than throwing", () => {
		expect(rowsOf(many, -3)).toHaveLength(0);
	});

	it("still counts every alert in the accessible summary when truncating", () => {
		const element = AlertList({ alerts: many, maxVisible: 2 });

		expect(element.props["aria-label"]).toBe("Alerts, 40 warning, 40 unacknowledged");
	});
});
