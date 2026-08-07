// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * TeleopPad uses hooks, so the element-tree walkers in `perf-test-utils` cannot
 * be pointed at a plain function call the way the stateless instruments do.
 * These checks assert the same budgets against the rendered DOM instead: node
 * count, zero inline style writes, and the Element Timing `data-slot` hook.
 */

import * as React from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { TeleopPad } from "./teleop-pad";

class StubResizeObserver {
	constructor(private readonly callback: ResizeObserverCallback) {}

	observe(): void {
		this.callback(
			[{ contentRect: { height: 200, width: 200 } } as ResizeObserverEntry],
			this as unknown as ResizeObserver,
		);
	}

	unobserve(): void {}
	disconnect(): void {}
}

let container: HTMLDivElement | null = null;
let root: Root | null = null;

beforeAll(() => {
	Reflect.set(globalThis, "ResizeObserver", StubResizeObserver);
	Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});

afterEach(() => {
	if (root !== null) {
		const current = root;
		React.act(() => current.unmount());
	}
	container?.remove();
	root = null;
	container = null;
});

function render(element: React.ReactElement): HTMLDivElement {
	container = document.createElement("div");
	document.body.append(container);
	const created = createRoot(container);
	root = created;
	React.act(() => created.render(element));
	return container;
}

describe("TeleopPad performance", () => {
	it("stays within the DOM node budget", () => {
		const mounted = render(<TeleopPad value={{ angular: -0.25, linear: 0.6 }} />);

		expect(mounted.querySelectorAll("*").length).toBeLessThanOrEqual(40);
	});

	it("writes no inline styles", () => {
		const mounted = render(<TeleopPad value={{ angular: 0.4, linear: -0.2 }} />);

		expect(mounted.querySelectorAll("[style]").length).toBe(0);
	});

	it("keeps the Element Timing hook on the root", () => {
		const mounted = render(<TeleopPad />);

		expect(mounted.querySelector("[data-slot='teleop-pad']")).not.toBeNull();
	});

	it("does not grow the tree when the command changes", () => {
		const mounted = render(<TeleopPad value={{ angular: 0, linear: 0 }} />);
		const before = mounted.querySelectorAll("*").length;

		const created = root;
		if (created === null) throw new Error("root was not created");
		React.act(() => created.render(<TeleopPad value={{ angular: 1, linear: -1 }} />));

		expect(mounted.querySelectorAll("*").length).toBe(before);
	});
});
