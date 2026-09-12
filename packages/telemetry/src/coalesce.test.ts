// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";

import { type CoalescedSnapshot, createCoalescer } from "./coalesce";

/** A scheduler the test drives by hand, standing in for animation frames. */
function manualScheduler() {
	let queued: (() => void) | undefined;
	let cancels = 0;

	return {
		get cancels() {
			return cancels;
		},
		get pending() {
			return queued !== undefined;
		},
		schedule(flush: () => void) {
			queued = flush;
			return () => {
				queued = undefined;
				cancels += 1;
			};
		},
		/** Fire the queued flush, as a compositor tick would. */
		tick() {
			const run = queued;
			queued = undefined;
			run?.();
		},
	};
}

/** A coalescer over numeric frames, plus the snapshots it published. */
function numeric(reduce?: (previous: number | undefined, next: number) => number) {
	const scheduler = manualScheduler();
	const flushes: CoalescedSnapshot<number>[] = [];
	const coalescer = createCoalescer<number>({
		onFlush: (snapshot) => flushes.push(snapshot),
		reduce,
		schedule: scheduler.schedule,
		select: (raw) => {
			const value = Number(raw);
			return Number.isFinite(value) ? value : undefined;
		},
	});

	return { coalescer, flushes, scheduler };
}

describe("createCoalescer", () => {
	it("publishes nothing until the scheduler ticks", () => {
		const { coalescer, flushes } = numeric();

		coalescer.push("1");

		expect(flushes).toEqual([]);
	});

	it("publishes one snapshot per tick however many frames arrived", () => {
		const { coalescer, flushes, scheduler } = numeric();

		for (const raw of ["1", "2", "3", "4", "5"]) coalescer.push(raw);
		scheduler.tick();

		expect(flushes).toHaveLength(1);
	});

	it("keeps the newest frame when folding latest-wins", () => {
		const { coalescer, flushes, scheduler } = numeric();

		coalescer.push("1");
		coalescer.push("2");
		coalescer.push("3");
		scheduler.tick();

		expect(flushes[0]?.value).toBe(3);
	});

	it("counts frames folded away so a console can prove it is coalescing", () => {
		const { coalescer, flushes, scheduler } = numeric();

		coalescer.push("1");
		coalescer.push("2");
		coalescer.push("3");
		scheduler.tick();

		// Three frames, one render: the first scheduled the tick, two folded in.
		expect(flushes[0]).toMatchObject({ coalesced: 2, received: 3 });
	});

	it("does not count the frame that scheduled the tick as coalesced", () => {
		const { coalescer, flushes, scheduler } = numeric();

		coalescer.push("1");
		scheduler.tick();

		expect(flushes[0]).toMatchObject({ coalesced: 0, received: 1 });
	});

	it("keeps counts cumulative across ticks", () => {
		const { coalescer, flushes, scheduler } = numeric();

		coalescer.push("1");
		coalescer.push("2");
		scheduler.tick();
		coalescer.push("3");
		scheduler.tick();

		expect(flushes[1]).toMatchObject({ coalesced: 1, received: 3 });
	});

	it("schedules again after a tick so a later frame still arrives", () => {
		const { coalescer, flushes, scheduler } = numeric();

		coalescer.push("1");
		scheduler.tick();
		coalescer.push("2");
		scheduler.tick();

		expect(flushes.map((snapshot) => snapshot.value)).toEqual([1, 2]);
	});

	it("does not publish on an idle tick", () => {
		const { coalescer, flushes, scheduler } = numeric();

		coalescer.push("1");
		scheduler.tick();
		scheduler.tick();

		expect(flushes).toHaveLength(1);
	});

	it("does not schedule a tick for a frame it ignored", () => {
		const { coalescer, scheduler } = numeric();

		coalescer.push("not-a-number");

		expect(scheduler.pending).toBe(false);
	});

	it("does not count an ignored frame as received", () => {
		const { coalescer, flushes, scheduler } = numeric();

		coalescer.push("not-a-number");
		coalescer.push("7");
		scheduler.tick();

		expect(flushes[0]).toMatchObject({ received: 1, value: 7 });
	});
});

describe("createCoalescer accumulation", () => {
	it("folds every frame when the caller supplies a reducer", () => {
		const { coalescer, flushes, scheduler } = numeric((previous, next) => (previous ?? 0) + next);

		coalescer.push("1");
		coalescer.push("2");
		coalescer.push("3");
		scheduler.tick();

		expect(flushes[0]?.value).toBe(6);
	});

	it("stays continuous across ticks by seeding from the last published value", () => {
		const { coalescer, flushes, scheduler } = numeric((previous, next) => (previous ?? 0) + next);

		coalescer.push("1");
		scheduler.tick();
		coalescer.push("2");
		scheduler.tick();

		// Not 2: the accumulator carried the published 1 forward.
		expect(flushes[1]?.value).toBe(3);
	});

	it("passes undefined as the seed for the very first frame", () => {
		const reduce = vi.fn((previous: number | undefined, next: number) => (previous ?? 0) + next);
		const { coalescer } = numeric(reduce);

		coalescer.push("5");

		expect(reduce).toHaveBeenCalledWith(undefined, 5);
	});

	it("seeds from a pending null rather than falling back to the published value", () => {
		// `T` here admits null, which is where reading through `??` would skip the
		// pending value and hand the reducer a stale `previous`.
		const scheduler = manualScheduler();
		const seeds: (number | null | undefined)[] = [];
		const coalescer = createCoalescer<number | null>({
			onFlush: () => undefined,
			reduce: (previous, next) => {
				seeds.push(previous);
				return next;
			},
			schedule: scheduler.schedule,
			select: (raw) => (raw === "null" ? null : Number(raw)),
		});

		coalescer.push("7");
		scheduler.tick();
		coalescer.push("null");
		coalescer.push("9");

		expect(seeds).toEqual([undefined, 7, null]);
	});
});

describe("createCoalescer explicit flush", () => {
	it("publishes immediately rather than waiting for the tick", () => {
		const { coalescer, flushes } = numeric();

		coalescer.push("1");
		coalescer.flush();

		expect(flushes[0]?.value).toBe(1);
	});

	it("cancels the pending tick so the frame is not published twice", () => {
		const { coalescer, flushes, scheduler } = numeric();

		coalescer.push("1");
		coalescer.flush();
		scheduler.tick();

		expect(flushes).toHaveLength(1);
	});

	it("publishes nothing when there is nothing pending", () => {
		const { coalescer, flushes } = numeric();

		coalescer.flush();

		expect(flushes).toEqual([]);
	});

	it("accepts a frame pushed from inside onFlush without losing it", () => {
		const scheduler = manualScheduler();
		const flushes: number[] = [];
		let reentered = false;
		const coalescer = createCoalescer<number>({
			onFlush: ({ value }) => {
				flushes.push(value);
				if (reentered) return;
				reentered = true;
				coalescer.push("99");
			},
			schedule: scheduler.schedule,
			select: (raw) => Number(raw),
		});

		coalescer.push("1");
		scheduler.tick();
		scheduler.tick();

		expect(flushes).toEqual([1, 99]);
	});
});

describe("createCoalescer disposal", () => {
	it("cancels a pending tick", () => {
		const { coalescer, scheduler } = numeric();

		coalescer.push("1");
		coalescer.dispose();

		expect(scheduler.cancels).toBe(1);
	});

	it("publishes nothing if a cancelled tick fires anyway", () => {
		const { coalescer, flushes, scheduler } = numeric();

		coalescer.push("1");
		coalescer.dispose();
		scheduler.tick();

		expect(flushes).toEqual([]);
	});

	it("ignores frames pushed after disposal", () => {
		const { coalescer, flushes, scheduler } = numeric();

		coalescer.dispose();
		coalescer.push("1");
		scheduler.tick();

		expect(flushes).toEqual([]);
	});

	it("ignores an explicit flush after disposal", () => {
		const { coalescer, flushes } = numeric();

		coalescer.push("1");
		coalescer.dispose();
		coalescer.flush();

		expect(flushes).toEqual([]);
	});

	it("is idempotent when disposed twice", () => {
		const { coalescer, scheduler } = numeric();

		coalescer.push("1");
		coalescer.dispose();
		coalescer.dispose();

		expect(scheduler.cancels).toBe(1);
	});
});
