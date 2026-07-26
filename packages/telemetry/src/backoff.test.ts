// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createBackoff, createReconnectTimer } from "./backoff";

describe("createBackoff", () => {
	it("doubles from the initial delay up to the cap", () => {
		const backoff = createBackoff({ factor: 2, initialDelayMs: 1000, maxDelayMs: 30000 });

		expect(backoff.nextDelayMs()).toBe(1000);
		expect(backoff.nextDelayMs()).toBe(2000);
		expect(backoff.nextDelayMs()).toBe(4000);
		expect(backoff.nextDelayMs()).toBe(8000);
		expect(backoff.nextDelayMs()).toBe(16000);
		expect(backoff.nextDelayMs()).toBe(30000); // 32000 → capped
		expect(backoff.nextDelayMs()).toBe(30000);
	});

	it("peeks without advancing and counts attempts", () => {
		const backoff = createBackoff();

		expect(backoff.peekDelayMs()).toBe(1000);
		expect(backoff.attempts()).toBe(0);
		expect(backoff.nextDelayMs()).toBe(1000);
		expect(backoff.attempts()).toBe(1);
		expect(backoff.peekDelayMs()).toBe(2000);
	});

	it("resets to the initial delay", () => {
		const backoff = createBackoff();
		backoff.nextDelayMs();
		backoff.nextDelayMs();

		backoff.reset();

		expect(backoff.attempts()).toBe(0);
		expect(backoff.nextDelayMs()).toBe(1000);
	});
});

describe("createReconnectTimer", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("arms the task after the backoff delay", () => {
		const task = vi.fn();
		const timer = createReconnectTimer(task);

		expect(timer.schedule()).toBe(1000);
		expect(timer.pending()).toBe(true);

		vi.advanceTimersByTime(1000);

		expect(task).toHaveBeenCalledTimes(1);
		expect(timer.pending()).toBe(false);
	});

	it("replaces a pending run when scheduled again", () => {
		const task = vi.fn();
		const timer = createReconnectTimer(task);

		timer.schedule(); // 1000
		expect(timer.schedule()).toBe(2000); // cancels the first

		vi.advanceTimersByTime(2000);

		expect(task).toHaveBeenCalledTimes(1);
	});

	it("cancels a pending run", () => {
		const task = vi.fn();
		const timer = createReconnectTimer(task);

		timer.schedule();
		timer.cancel();

		expect(timer.pending()).toBe(false);
		vi.advanceTimersByTime(60000);
		expect(task).not.toHaveBeenCalled();
	});

	it("resets the schedule back to the initial delay", () => {
		const task = vi.fn();
		const timer = createReconnectTimer(task);

		timer.schedule(); // consumes 1000
		timer.cancel();
		timer.reset();

		expect(timer.schedule()).toBe(1000);
	});
});
