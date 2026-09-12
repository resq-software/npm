// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * CommandButton holds a dwell timer, so — like TeleopPad and unlike its
 * stateless siblings — it has to be rendered rather than called as a function.
 * The harness is the same hand-rolled `createRoot` + `act` one, so no test
 * renderer is added to the package.
 *
 * Only `setInterval` / `clearInterval` are faked. Faking `setTimeout` as well
 * would stall React's own scheduler, and the dwell is the only thing here that
 * needs a controllable clock.
 */

import * as React from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { CommandButton, type CommandState } from "./command-button";

/** The component's own default, restated so the tests pin it rather than read it. */
const DEFAULT_HOLD_MS = 800;

const RTL = { command: "Return to launch" };
const DISARM = { command: "Disarm", confirm: true };

let container: HTMLDivElement | null = null;
let root: Root | null = null;

/** jsdom ships no media-query engine, so this may legitimately be undefined. */
const originalMatchMedia: unknown = Reflect.get(window, "matchMedia");

beforeAll(() => {
	Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});

beforeEach(() => {
	vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
});

afterEach(() => {
	unmount();
	Reflect.set(window, "matchMedia", originalMatchMedia);
	vi.useRealTimers();
});

function render(element: React.ReactElement): HTMLButtonElement {
	container = document.createElement("div");
	document.body.append(container);
	const created = createRoot(container);
	root = created;
	React.act(() => created.render(element));

	const button = container.querySelector("[data-slot='command-button']");
	if (button === null) throw new Error("CommandButton did not render");
	return button as HTMLButtonElement;
}

function unmount(): void {
	if (root !== null) {
		const current = root;
		React.act(() => current.unmount());
	}
	container?.remove();
	root = null;
	container = null;
}

function dispatch(target: HTMLElement, event: Event): void {
	React.act(() => {
		target.dispatchEvent(event);
	});
}

function advance(ms: number): void {
	React.act(() => {
		vi.advanceTimersByTime(ms);
	});
}

function pointerDown(button: HTMLButtonElement, mouseButton = 0): void {
	dispatch(
		button,
		new MouseEvent("pointerdown", { bubbles: true, button: mouseButton, cancelable: true }),
	);
}

function pointerUp(button: HTMLButtonElement): void {
	dispatch(button, new MouseEvent("pointerup", { bubbles: true, cancelable: true }));
}

function pointerCancel(button: HTMLButtonElement): void {
	dispatch(button, new MouseEvent("pointercancel", { bubbles: true, cancelable: true }));
}

/**
 * React derives `onPointerLeave` from a delegated `pointerout` — a real
 * `pointerleave` event does not bubble and would never reach the root listener.
 */
function pointerLeave(button: HTMLButtonElement): void {
	dispatch(button, new MouseEvent("pointerout", { bubbles: true, cancelable: true }));
}

function keyDown(button: HTMLButtonElement, key: string, repeat = false): void {
	dispatch(button, new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key, repeat }));
}

function keyUp(button: HTMLButtonElement, key: string): void {
	dispatch(button, new KeyboardEvent("keyup", { bubbles: true, cancelable: true, key }));
}

/** React listens for the bubbling `focusout`, not the bare `blur`. */
function blur(button: HTMLButtonElement): void {
	dispatch(button, new FocusEvent("focusout", { bubbles: true }));
}

function click(button: HTMLButtonElement): void {
	React.act(() => {
		button.click();
	});
}

/** The filled portion of the hold bar, in SVG user units. */
function fillWidth(button: HTMLButtonElement): string | null {
	const rects = button.querySelectorAll("[data-slot='command-button-hold'] rect");
	const fill = rects[1];
	if (fill === undefined) throw new Error("hold bar did not render a fill");
	return fill.getAttribute("width");
}

function announcement(button: HTMLButtonElement): string {
	return button.querySelector("[data-slot='command-button-hold-status']")?.textContent ?? "";
}

/**
 * Force `prefers-reduced-motion` to a fixed answer for one test. Only the three
 * members the component actually touches are implemented.
 */
function stubReducedMotion(matches: boolean): void {
	const list = {
		addEventListener: () => {},
		matches,
		removeEventListener: () => {},
	} as unknown as MediaQueryList;

	Reflect.set(window, "matchMedia", () => list);
}

describe("CommandButton", () => {
	it("renders a button with a data-slot for instrumentation", () => {
		const button = render(<CommandButton {...RTL} />);

		expect(button.tagName).toBe("BUTTON");
		expect(button.getAttribute("data-slot")).toBe("command-button");
	});

	it("is type=button, so it cannot submit a surrounding form by accident", () => {
		expect(render(<CommandButton {...RTL} />).getAttribute("type")).toBe("button");
	});

	it("names the command", () => {
		const button = render(<CommandButton {...RTL} />);

		expect(button.getAttribute("aria-label")).toBe("Return to launch");
		expect(button.textContent).toContain("Return to launch");
	});

	it("accepts a caller override for the label", () => {
		expect(render(<CommandButton {...RTL} label="RTL" />).getAttribute("aria-label")).toBe("RTL");
	});

	it("merges a caller className rather than dropping it", () => {
		expect(render(<CommandButton {...RTL} className="col-span-2" />).className).toContain(
			"col-span-2",
		);
	});

	it("keeps a visible focus ring, since a console is driven by keyboard", () => {
		expect(render(<CommandButton {...RTL} />).className).toContain("focus-visible:ring");
	});

	it("still hands the node to a caller's ref", () => {
		const ref = React.createRef<HTMLButtonElement>();
		const button = render(<CommandButton {...RTL} ref={ref} />);

		expect(ref.current).toBe(button);
	});
});

describe("CommandButton state", () => {
	it("starts idle and says nothing beyond the command", () => {
		const button = render(<CommandButton {...RTL} />);

		expect(button.getAttribute("data-state")).toBe("idle");
		expect(button.textContent).toBe("Return to launch");
	});

	it("carries the vehicle's reported state for instrumentation", () => {
		const states: CommandState[] = ["sending", "acknowledged", "rejected", "timed-out"];

		for (const state of states) {
			expect(render(<CommandButton {...RTL} state={state} />).getAttribute("data-state")).toBe(
				state,
			);
			unmount();
		}
	});

	it("words a request in flight as sending, not as done", () => {
		const button = render(<CommandButton {...RTL} state="sending" />);

		expect(button.textContent).toContain("Sending");
		expect(button.getAttribute("aria-label")).toBe("Return to launch, sending");
	});

	it("only claims acknowledgement when the vehicle acknowledged", () => {
		expect(render(<CommandButton {...RTL} state="acknowledged" />).getAttribute("aria-label")).toBe(
			"Return to launch, acknowledged",
		);
	});

	it("distinguishes a rejection from silence", () => {
		expect(render(<CommandButton {...RTL} state="rejected" />).textContent).toContain("Rejected");
		unmount();
		expect(render(<CommandButton {...RTL} state="timed-out" />).textContent).toContain(
			"No response",
		);
	});

	it("carries state as a word, never colour alone", () => {
		const states: CommandState[] = ["sending", "acknowledged", "rejected", "timed-out"];

		for (const state of states) {
			const button = render(<CommandButton {...RTL} state={state} />);
			expect(button.textContent?.length ?? 0).toBeGreaterThan("Return to launch".length);
			unmount();
		}
	});

	it("does not change state when clicked, because a click is not an outcome", () => {
		const onClick = vi.fn();
		const button = render(<CommandButton {...RTL} onClick={onClick} />);

		click(button);

		expect(onClick).toHaveBeenCalledTimes(1);
		// The rendered element still follows the prop: the click reports upward and
		// the vehicle decides what the button becomes.
		expect(button.getAttribute("data-state")).toBe("idle");
	});
});

describe("CommandButton hold-to-confirm", () => {
	it("marks a destructive command as needing a hold", () => {
		const button = render(<CommandButton {...DISARM} />);

		expect(button.getAttribute("data-confirm")).toBe("");
		expect(button.getAttribute("aria-label")).toBe("Disarm, destructive, hold to confirm");
	});

	it("draws a hold bar, empty at rest", () => {
		const button = render(<CommandButton {...DISARM} />);

		expect(button.querySelector("[data-slot='command-button-hold']")).not.toBeNull();
		expect(fillWidth(button)).toBe("0");
	});

	it("sends nothing on a plain click", () => {
		const onClick = vi.fn();
		const button = render(<CommandButton {...DISARM} onClick={onClick} />);

		click(button);

		expect(onClick).not.toHaveBeenCalled();
	});

	it("sends nothing on a double click, which used to satisfy press-twice", () => {
		// The press-twice guard this replaced put both presses in the same pixels,
		// so roughly two hundred milliseconds of double-click disarmed a vehicle.
		const onClick = vi.fn();
		const button = render(<CommandButton {...DISARM} onClick={onClick} />);

		click(button);
		click(button);

		expect(onClick).not.toHaveBeenCalled();
	});

	it("sends the command once the dwell completes", () => {
		const onClick = vi.fn();
		const button = render(<CommandButton {...DISARM} onClick={onClick} />);

		pointerDown(button);
		advance(DEFAULT_HOLD_MS);

		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("sends nothing until the dwell is actually up", () => {
		const onClick = vi.fn();
		const button = render(<CommandButton {...DISARM} onClick={onClick} />);

		pointerDown(button);
		advance(DEFAULT_HOLD_MS - 40);

		expect(onClick).not.toHaveBeenCalled();
	});

	it("sends nothing when the operator lets go early", () => {
		const onClick = vi.fn();
		const button = render(<CommandButton {...DISARM} onClick={onClick} />);

		pointerDown(button);
		advance(DEFAULT_HOLD_MS / 2);
		pointerUp(button);
		advance(DEFAULT_HOLD_MS);

		expect(onClick).not.toHaveBeenCalled();
	});

	it("abandons the dwell when the pointer slides off the control", () => {
		const onClick = vi.fn();
		const button = render(<CommandButton {...DISARM} onClick={onClick} />);

		pointerDown(button);
		advance(DEFAULT_HOLD_MS / 2);
		pointerLeave(button);
		advance(DEFAULT_HOLD_MS);

		expect(onClick).not.toHaveBeenCalled();
	});

	it("abandons the dwell when the pointer stream is cancelled", () => {
		const onClick = vi.fn();
		const button = render(<CommandButton {...DISARM} onClick={onClick} />);

		pointerDown(button);
		advance(DEFAULT_HOLD_MS / 2);
		pointerCancel(button);
		advance(DEFAULT_HOLD_MS);

		expect(onClick).not.toHaveBeenCalled();
	});

	it("ignores a secondary-button press, whose release the context menu eats", () => {
		const onClick = vi.fn();
		const button = render(<CommandButton {...DISARM} onClick={onClick} />);

		pointerDown(button, 2);
		advance(DEFAULT_HOLD_MS);

		expect(onClick).not.toHaveBeenCalled();
	});

	it("fills the bar as the dwell runs, and empties it on release", () => {
		const button = render(<CommandButton {...DISARM} />);

		pointerDown(button);
		advance(DEFAULT_HOLD_MS / 2);

		// Half a dwell across a 32-unit bar.
		expect(fillWidth(button)).toBe("16");
		expect(button.getAttribute("data-holding")).toBe("");

		pointerUp(button);

		expect(fillWidth(button)).toBe("0");
		expect(button.getAttribute("data-holding")).toBeNull();
	});

	it("completes a dwell held with the space bar", () => {
		const onClick = vi.fn();
		const button = render(<CommandButton {...DISARM} onClick={onClick} />);

		keyDown(button, " ");
		advance(DEFAULT_HOLD_MS);

		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("completes a dwell held with enter", () => {
		const onClick = vi.fn();
		const button = render(<CommandButton {...DISARM} onClick={onClick} />);

		keyDown(button, "Enter");
		advance(DEFAULT_HOLD_MS);

		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("treats one held key as one dwell, however many repeats the OS sends", () => {
		// A native button activates on Enter keydown and the OS repeats that
		// keydown, so a leaned-on key used to satisfy press-twice on its own. The
		// repeats must neither fire the command nor restart the count.
		const onClick = vi.fn();
		const button = render(<CommandButton {...DISARM} onClick={onClick} />);

		keyDown(button, "Enter");
		advance(DEFAULT_HOLD_MS / 2);

		for (let index = 0; index < 12; index += 1) keyDown(button, "Enter", true);

		expect(onClick).not.toHaveBeenCalled();

		advance(DEFAULT_HOLD_MS / 2);

		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("does not open a second dwell while the same key is still down", () => {
		// The dwell ends but the finger does not, and the OS keeps repeating. With
		// the first dwell finished there is no longer a timer to early-return on,
		// so without the repeat guard the next repeat would open a fresh dwell
		// against a command that has already gone — one continuous press, two
		// commands on the vehicle.
		const onClick = vi.fn();
		const button = render(<CommandButton {...DISARM} onClick={onClick} />);

		keyDown(button, "Enter");
		advance(DEFAULT_HOLD_MS);

		expect(onClick).toHaveBeenCalledTimes(1);

		for (let index = 0; index < 12; index += 1) keyDown(button, "Enter", true);
		advance(DEFAULT_HOLD_MS * 2);

		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("swallows the click a browser raises from a keypress mid-dwell", () => {
		const onClick = vi.fn();
		const button = render(<CommandButton {...DISARM} onClick={onClick} />);

		keyDown(button, " ");
		click(button);

		expect(onClick).not.toHaveBeenCalled();
	});

	it("abandons the dwell when the key comes back up", () => {
		const onClick = vi.fn();
		const button = render(<CommandButton {...DISARM} onClick={onClick} />);

		keyDown(button, " ");
		advance(DEFAULT_HOLD_MS / 2);
		keyUp(button, " ");
		advance(DEFAULT_HOLD_MS);

		expect(onClick).not.toHaveBeenCalled();
	});

	it("abandons the dwell when focus leaves, since the keyup lands elsewhere", () => {
		const onClick = vi.fn();
		const button = render(<CommandButton {...DISARM} onClick={onClick} />);

		keyDown(button, "Enter");
		advance(DEFAULT_HOLD_MS / 2);
		blur(button);
		advance(DEFAULT_HOLD_MS);

		expect(onClick).not.toHaveBeenCalled();
	});

	it("honours a caller's dwell", () => {
		const onClick = vi.fn();
		const button = render(<CommandButton {...DISARM} holdMs={2000} onClick={onClick} />);

		pointerDown(button);
		advance(DEFAULT_HOLD_MS);

		expect(onClick).not.toHaveBeenCalled();

		advance(1200);

		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("falls back to the default dwell when holdMs is unusable", () => {
		// A config that computes to zero would otherwise ship a destructive command
		// that fires on contact.
		const onClick = vi.fn();
		const button = render(<CommandButton {...DISARM} holdMs={0} onClick={onClick} />);

		pointerDown(button);
		advance(1);

		expect(onClick).not.toHaveBeenCalled();

		advance(DEFAULT_HOLD_MS);

		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("keeps the dwell the same length under reduced motion", () => {
		// Reduced motion coarsens the fill; it must not shorten the guard.
		stubReducedMotion(true);
		const onClick = vi.fn();
		const button = render(<CommandButton {...DISARM} onClick={onClick} />);

		pointerDown(button);
		advance(DEFAULT_HOLD_MS - 200);

		expect(onClick).not.toHaveBeenCalled();

		advance(200);

		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("announces the hold, so it is not visible-only", () => {
		const button = render(<CommandButton {...DISARM} />);

		expect(announcement(button)).toBe("");

		pointerDown(button);

		expect(announcement(button)).toBe("Holding to confirm");
	});

	it("says the command was not sent when the hold is released early", () => {
		// Silence reads exactly like a command that went and is still waiting.
		const button = render(<CommandButton {...DISARM} />);

		pointerDown(button);
		advance(DEFAULT_HOLD_MS / 2);
		pointerUp(button);

		expect(announcement(button)).toBe("Hold released, command not sent");
	});

	it("throws away a dwell that the link interrupts", () => {
		const onClick = vi.fn();
		const button = render(<CommandButton {...DISARM} onClick={onClick} />);

		pointerDown(button);
		advance(DEFAULT_HOLD_MS / 2);

		React.act(() => {
			root?.render(<CommandButton {...DISARM} onClick={onClick} unavailableReason="link down" />);
		});
		advance(DEFAULT_HOLD_MS);

		expect(onClick).not.toHaveBeenCalled();
		expect(announcement(button)).toBe("Hold interrupted, command not sent");
	});

	it("never fires a dwell that outlived its button", () => {
		const onClick = vi.fn();
		const button = render(<CommandButton {...DISARM} onClick={onClick} />);

		pointerDown(button);
		advance(DEFAULT_HOLD_MS / 2);
		unmount();
		advance(DEFAULT_HOLD_MS);

		expect(onClick).not.toHaveBeenCalled();
	});

	it("clears the dwell timer on unmount rather than leaving it running", () => {
		// Asserted on the timer itself, not on the callback: React drops the ref on
		// unmount, so a leaked interval would go on ticking forever behind a
		// harmless-looking no-op click and never show up as a fired command.
		const button = render(<CommandButton {...DISARM} />);

		pointerDown(button);

		expect(vi.getTimerCount()).toBe(1);

		unmount();

		expect(vi.getTimerCount()).toBe(0);
	});

	it("leaves a non-destructive command on a plain click", () => {
		const onClick = vi.fn();
		const button = render(<CommandButton {...RTL} onClick={onClick} />);

		expect(button.querySelector("[data-slot='command-button-hold']")).toBeNull();

		click(button);

		expect(onClick).toHaveBeenCalledTimes(1);
	});
});

describe("CommandButton availability", () => {
	it("says why it is unavailable rather than only greying out", () => {
		const button = render(<CommandButton {...RTL} unavailableReason="no GPS fix" />);

		expect(button.getAttribute("aria-label")).toBe("Return to launch, unavailable, no GPS fix");
		expect(button.getAttribute("aria-disabled")).toBe("true");
	});

	it("stays reachable by keyboard so the reason is actually announced", () => {
		// A natively disabled button leaves the tab order, and a screen reader
		// skipping it would never read the reason at all.
		expect(render(<CommandButton {...RTL} unavailableReason="no GPS fix" />).disabled).toBe(false);
	});

	it("refuses to activate while unavailable", () => {
		const onClick = vi.fn();
		const button = render(
			<CommandButton {...RTL} onClick={onClick} unavailableReason="no GPS fix" />,
		);

		click(button);

		expect(onClick).not.toHaveBeenCalled();
	});

	it("refuses to activate while a request is already in flight", () => {
		// The seconds where nothing appears to have happened are exactly when an
		// operator presses again — and a second press is a second command on the
		// vehicle, not a retry.
		const onClick = vi.fn();
		const button = render(<CommandButton {...RTL} onClick={onClick} state="sending" />);

		click(button);

		expect(onClick).not.toHaveBeenCalled();
	});

	it("refuses to start a dwell while unavailable", () => {
		const onClick = vi.fn();
		const button = render(
			<CommandButton {...DISARM} onClick={onClick} unavailableReason="no GPS fix" />,
		);

		pointerDown(button);
		advance(DEFAULT_HOLD_MS);

		expect(onClick).not.toHaveBeenCalled();
	});

	it("dims an unavailable command", () => {
		expect(render(<CommandButton {...RTL} unavailableReason="no GPS fix" />).className).toContain(
			"opacity-45",
		);
	});

	it("puts the reason before any state, since it is why nothing will happen", () => {
		expect(
			render(<CommandButton {...RTL} state="sending" unavailableReason="link down" />).getAttribute(
				"aria-label",
			),
		).toBe("Return to launch, unavailable, link down");
	});

	it("still honours an explicit disabled without inventing a reason", () => {
		const button = render(<CommandButton {...RTL} disabled />);

		expect(button.disabled).toBe(true);
		expect(button.getAttribute("aria-label")).toBe("Return to launch");
	});

	it("is enabled when it is available", () => {
		expect(render(<CommandButton {...RTL} />).disabled).toBe(false);
	});
});
