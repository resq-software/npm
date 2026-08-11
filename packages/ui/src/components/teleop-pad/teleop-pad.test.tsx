// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * TeleopPad is the one instrument that uses hooks, so — unlike its stateless
 * siblings — it has to be rendered rather than called as a function. jsdom
 * performs no layout, so `ResizeObserver` is stubbed with a fixed 200×200 box
 * and pointer offsets are supplied explicitly on the dispatched events.
 */

import * as React from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { TeleopPad, type TeleopVector } from "./teleop-pad";

const PAD_SIZE = 200;

class StubResizeObserver {
	constructor(private readonly callback: ResizeObserverCallback) {}

	observe(): void {
		this.callback(
			[{ contentRect: { height: PAD_SIZE, width: PAD_SIZE } } as ResizeObserverEntry],
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

function render(element: React.ReactElement): HTMLElement {
	container = document.createElement("div");
	document.body.append(container);
	const created = createRoot(container);
	root = created;
	React.act(() => created.render(element));
	const pad = container.querySelector("[data-slot='teleop-pad']");
	if (pad === null) throw new Error("TeleopPad did not render");
	return pad as HTMLElement;
}

function surfaceOf(pad: HTMLElement): HTMLElement {
	const surface = pad.querySelector("[data-slot='teleop-pad-surface']");
	if (surface === null) throw new Error("pointer surface did not render");
	return surface as HTMLElement;
}

/** Dispatch a pointer event carrying explicit offsets, as jsdom computes none. */
function pointer(target: HTMLElement, type: string, offsetX: number, offsetY: number): void {
	const event = new MouseEvent(type, { bubbles: true, cancelable: true });
	Object.defineProperty(event, "offsetX", { value: offsetX });
	Object.defineProperty(event, "offsetY", { value: offsetY });
	Object.defineProperty(event, "pointerId", { value: 1 });
	React.act(() => {
		target.dispatchEvent(event);
	});
}

function rangeInputs(pad: HTMLElement): HTMLInputElement[] {
	return [...pad.querySelectorAll("input[type='range']")] as HTMLInputElement[];
}

/**
 * Drive a range input the way a user would. Assigning `input.value` directly
 * goes through React's own value setter, which updates its change tracker and
 * makes the subsequent event look like a no-op — so write through the
 * prototype setter instead.
 */
function setRangeValue(input: HTMLInputElement, next: string): void {
	const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
	descriptor?.set?.call(input, next);
	input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("TeleopPad", () => {
	it("exposes a group role with a data-slot for instrumentation", () => {
		const pad = render(<TeleopPad />);

		expect(pad.getAttribute("role")).toBe("group");
		expect(pad.getAttribute("data-slot")).toBe("teleop-pad");
	});

	it("describes a stopped, straight command by default", () => {
		const pad = render(<TeleopPad />);

		expect(pad.getAttribute("aria-label")).toBe("Teleop pad, stopped, straight ahead");
	});

	it("describes a controlled command", () => {
		const pad = render(<TeleopPad value={{ angular: -0.25, linear: 0.6 }} />);

		expect(pad.getAttribute("aria-label")).toBe("Teleop pad, forward 0.60, left 0.25");
	});

	it("clamps a controlled command into ±1", () => {
		const pad = render(<TeleopPad value={{ angular: -4, linear: 9 }} />);

		expect(pad.getAttribute("aria-label")).toBe("Teleop pad, forward 1.00, left 1.00");
	});

	it("treats a non-finite controlled command as stopped", () => {
		const pad = render(
			<TeleopPad value={{ angular: Number.NaN, linear: Number.POSITIVE_INFINITY }} />,
		);

		expect(pad.getAttribute("aria-label")).toBe("Teleop pad, stopped, straight ahead");
	});

	it("maps a pointer press to a normalized command", () => {
		const onChange = vi.fn();
		const pad = render(<TeleopPad onChange={onChange} />);

		// Top-right corner of a 200×200 pad → full forward, full right.
		pointer(surfaceOf(pad), "pointerdown", PAD_SIZE, 0);

		expect(onChange).toHaveBeenCalledWith<[TeleopVector]>({ angular: 1, linear: 1 });
	});

	it("maps the pad centre to a zero command", () => {
		const onChange = vi.fn();
		const pad = render(<TeleopPad onChange={onChange} />);

		pointer(surfaceOf(pad), "pointerdown", PAD_SIZE / 2, PAD_SIZE / 2);

		expect(onChange).toHaveBeenCalledWith<[TeleopVector]>({ angular: 0, linear: 0 });
	});

	it("tracks pointer movement while dragging", () => {
		const onChange = vi.fn();
		const pad = render(<TeleopPad onChange={onChange} />);
		const surface = surfaceOf(pad);

		pointer(surface, "pointerdown", PAD_SIZE / 2, PAD_SIZE / 2);
		pointer(surface, "pointermove", PAD_SIZE / 2, 0);

		expect(onChange).toHaveBeenLastCalledWith<[TeleopVector]>({ angular: 0, linear: 1 });
	});

	it("ignores pointer movement that is not part of a drag", () => {
		const onChange = vi.fn();
		const pad = render(<TeleopPad onChange={onChange} />);

		pointer(surfaceOf(pad), "pointermove", 0, 0);

		expect(onChange).not.toHaveBeenCalled();
	});

	it("commands zero on release by default", () => {
		const onChange = vi.fn();
		const pad = render(<TeleopPad onChange={onChange} />);
		const surface = surfaceOf(pad);

		pointer(surface, "pointerdown", PAD_SIZE, 0);
		pointer(surface, "pointerup", PAD_SIZE, 0);

		expect(onChange).toHaveBeenLastCalledWith<[TeleopVector]>({ angular: 0, linear: 0 });
	});

	it("latches the command on release when returnToCenter is off", () => {
		const onChange = vi.fn();
		const pad = render(<TeleopPad onChange={onChange} returnToCenter={false} />);
		const surface = surfaceOf(pad);

		pointer(surface, "pointerdown", PAD_SIZE, 0);
		pointer(surface, "pointerup", PAD_SIZE, 0);

		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenLastCalledWith<[TeleopVector]>({ angular: 1, linear: 1 });
	});

	it("commands zero when a pointer interaction is cancelled", () => {
		const onChange = vi.fn();
		const pad = render(<TeleopPad onChange={onChange} />);
		const surface = surfaceOf(pad);

		pointer(surface, "pointerdown", 0, 0);
		pointer(surface, "pointercancel", 0, 0);

		expect(onChange).toHaveBeenLastCalledWith<[TeleopVector]>({ angular: 0, linear: 0 });
	});

	it("ignores pointer input while disabled", () => {
		const onChange = vi.fn();
		const pad = render(<TeleopPad disabled onChange={onChange} />);

		pointer(surfaceOf(pad), "pointerdown", PAD_SIZE, 0);

		expect(onChange).not.toHaveBeenCalled();
		expect(pad.getAttribute("aria-disabled")).toBe("true");
	});

	it("updates itself when uncontrolled", () => {
		const pad = render(<TeleopPad returnToCenter={false} />);

		pointer(surfaceOf(pad), "pointerdown", PAD_SIZE, PAD_SIZE);

		expect(pad.getAttribute("aria-label")).toBe("Teleop pad, reverse 1.00, right 1.00");
	});

	it("starts from defaultValue when uncontrolled", () => {
		const pad = render(<TeleopPad defaultValue={{ angular: 0.5, linear: -0.5 }} />);

		expect(pad.getAttribute("aria-label")).toBe("Teleop pad, reverse 0.50, right 0.50");
	});

	it("does not move a controlled pad without the owner re-rendering it", () => {
		const pad = render(<TeleopPad value={{ angular: 0, linear: 0 }} />);

		pointer(surfaceOf(pad), "pointerdown", PAD_SIZE, 0);

		expect(pad.getAttribute("aria-label")).toBe("Teleop pad, stopped, straight ahead");
	});

	it("exposes both axes as native range inputs", () => {
		const pad = render(<TeleopPad value={{ angular: -0.25, linear: 0.6 }} />);
		const [linear, angular] = rangeInputs(pad);

		expect(linear.getAttribute("aria-label")).toBe("Linear velocity command");
		expect(angular.getAttribute("aria-label")).toBe("Yaw rate command");
		expect(linear.value).toBe("0.6");
		expect(angular.value).toBe("-0.25");
	});

	it("commits axis changes made through the hidden range inputs", () => {
		const onChange = vi.fn();
		const pad = render(<TeleopPad onChange={onChange} />);
		const [linear] = rangeInputs(pad);

		React.act(() => {
			setRangeValue(linear, "0.4");
		});

		expect(onChange).toHaveBeenLastCalledWith<[TeleopVector]>({ angular: 0, linear: 0.4 });
	});

	it("commands zero on Escape", () => {
		const onChange = vi.fn();
		const pad = render(<TeleopPad onChange={onChange} value={{ angular: 1, linear: 1 }} />);

		React.act(() => {
			pad.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
		});

		expect(onChange).toHaveBeenLastCalledWith<[TeleopVector]>({ angular: 0, linear: 0 });
	});

	it("honours a custom label override", () => {
		const pad = render(<TeleopPad label="Rover 3 drive command" />);

		expect(pad.getAttribute("aria-label")).toBe("Rover 3 drive command");
	});

	it("uses keyboardStep as the native step on both axis inputs", () => {
		const pad = render(<TeleopPad keyboardStep={0.25} />);
		const [linear, angular] = rangeInputs(pad);

		expect(linear.getAttribute("step")).toBe("0.25");
		expect(angular.getAttribute("step")).toBe("0.25");
	});

	it("falls back to the default step for a non-positive keyboardStep", () => {
		const pad = render(<TeleopPad keyboardStep={0} />);

		expect(rangeInputs(pad)[0].getAttribute("step")).toBe("0.01");
	});

	it("forwards a consumer onKeyDown alongside the stop key", () => {
		const onKeyDown = vi.fn();
		const onChange = vi.fn();
		const pad = render(
			<TeleopPad onChange={onChange} onKeyDown={onKeyDown} value={{ angular: 1, linear: 1 }} />,
		);

		React.act(() => {
			pad.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
		});

		// Both must run: the pad still commands zero, and the consumer still hears it.
		expect(onChange).toHaveBeenLastCalledWith<[TeleopVector]>({ angular: 0, linear: 0 });
		expect(onKeyDown).toHaveBeenCalledTimes(1);
	});

	it("forwards a consumer onKeyDown for keys the pad ignores", () => {
		const onKeyDown = vi.fn();
		const pad = render(<TeleopPad onKeyDown={onKeyDown} />);

		React.act(() => {
			pad.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "a" }));
		});

		expect(onKeyDown).toHaveBeenCalledTimes(1);
	});

	it("merges a consumer className over the base size", () => {
		const pad = render(<TeleopPad className="size-64" />);

		expect(pad.className).toContain("size-64");
		expect(pad.className).not.toContain("size-48");
	});
});
