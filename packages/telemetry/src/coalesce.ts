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
 * @fileoverview Frame coalescing — decouples the rate a console *renders* from
 * the rate a vehicle *talks*.
 *
 * A MAVLink `ATTITUDE` stream at 50 Hz, a ROS odometry topic at 100 Hz and an
 * AIS feed at 0.1 Hz all arrive on the same socket. Rendering once per frame
 * means the attitude stream alone drives 50 React renders a second, most of
 * them discarded before a monitor ever draws them, and the slow feeds get
 * starved behind that work.
 *
 * So frames are folded in memory and published once per scheduler tick —
 * normally one animation frame. Dropping intermediate frames is the *point*:
 * a display showing 60 of 50 attitudes per second loses nothing an operator
 * could have perceived. When a caller genuinely needs every frame (a chart
 * feeding a ring buffer, a fault counter), it passes `reduce` and accumulates
 * instead of replacing.
 *
 * Deliberately framework-free so it can be tested without a DOM and reused
 * outside React; the React binding is a thin wrapper in `./react`.
 *
 * @module @resq-systems/telemetry/coalesce
 */

//#region Types

/**
 * Schedules a flush and returns a function that cancels it. Injected so tests
 * and non-browser hosts do not depend on `requestAnimationFrame`.
 */
export type FlushScheduler = (flush: () => void) => () => void;

/** What a flush publishes. Counts let a console prove coalescing is working. */
export interface CoalescedSnapshot<T> {
	/** The folded value. */
	value: T;
	/** Frames accepted since creation, including ones folded away. */
	received: number;
	/** Frames folded into another frame's render rather than causing one. */
	coalesced: number;
}

export interface CoalescerOptions<T> {
	/**
	 * Turn a raw frame into a value. Return `undefined` to ignore the frame —
	 * that is how a channel filters messages it does not care about, and how a
	 * malformed payload is dropped rather than propagated.
	 */
	select: (raw: string) => T | undefined;
	/**
	 * Fold a new frame into what is already pending. Defaults to latest-wins.
	 * `previous` is the pending value if one exists, otherwise the last value
	 * published — so an accumulator stays continuous across flushes.
	 */
	reduce?: (previous: T | undefined, next: T) => T;
	/** Publishes a folded value. Called at most once per scheduler tick. */
	onFlush: (snapshot: CoalescedSnapshot<T>) => void;
	/** Defaults to one animation frame, falling back to a macrotask. */
	schedule?: FlushScheduler;
}

/** Accepts frames and publishes folded snapshots. */
export interface Coalescer {
	/** Offer a raw frame. Cheap: no work beyond `select` and `reduce`. */
	push(raw: string): void;
	/** Publish any pending value immediately rather than waiting for the tick. */
	flush(): void;
	/** Cancel any pending flush and ignore all further frames. */
	dispose(): void;
}

//#endregion

//#region Default scheduler

/**
 * One animation frame where there is a compositor, otherwise a macrotask.
 *
 * The branch is chosen by capability, not by visibility. The macrotask fallback
 * covers hosts with no compositor — Node, and tests. A background browser tab
 * still defines `requestAnimationFrame`, so it takes the first branch and its
 * flushes pause until the tab is shown again; frames keep folding in memory
 * meanwhile and the newest one publishes on the first tick after that.
 */
export function defaultScheduler(flush: () => void): () => void {
	if (typeof globalThis.requestAnimationFrame === "function") {
		const handle = globalThis.requestAnimationFrame(() => flush());
		return () => globalThis.cancelAnimationFrame(handle);
	}

	const timer = setTimeout(flush, 0);
	return () => clearTimeout(timer);
}

//#endregion

//#region Factory

/**
 * Create a coalescer.
 *
 * @example Latest-wins attitude at render rate
 * ```ts
 * const attitude = createCoalescer({
 *   select: (raw) => parseAttitude(raw),
 *   onFlush: ({ value }) => setAttitude(value),
 * });
 * ```
 *
 * @example Accumulate every sample for a chart
 * ```ts
 * const series = createCoalescer({
 *   select: (raw) => [Number(raw)],
 *   reduce: (previous, next) => [...(previous ?? []), ...next].slice(-600),
 *   onFlush: ({ value }) => setSeries(value),
 * });
 * ```
 */
export function createCoalescer<T>(options: Readonly<CoalescerOptions<T>>): Coalescer {
	const { select, onFlush, reduce, schedule = defaultScheduler } = options;

	let pending: { value: T } | undefined;
	let published: { value: T } | undefined;
	let cancel: (() => void) | undefined;
	let received = 0;
	let coalesced = 0;
	let disposed = false;

	function publish(): void {
		// The scheduler has fired, or an explicit flush pre-empted it; either way
		// no tick is outstanding any more.
		cancel = undefined;
		if (disposed || pending === undefined) return;

		const snapshot = pending;
		// Clear before calling out: `onFlush` may push synchronously, and that
		// frame must land in a fresh pending value rather than one already sent.
		pending = undefined;
		published = snapshot;
		onFlush({ coalesced, received, value: snapshot.value });
	}

	return {
		dispose(): void {
			disposed = true;
			pending = undefined;
			cancel?.();
			cancel = undefined;
		},

		flush(): void {
			if (disposed) return;
			cancel?.();
			publish();
		},

		push(raw: string): void {
			if (disposed) return;

			const next = select(raw);
			if (next === undefined) return;

			received += 1;
			// A frame arriving while a tick is already outstanding will never get a
			// render of its own — that is exactly the work being saved.
			if (cancel !== undefined) coalesced += 1;

			// Pick the box, then read it. `pending?.value ?? published?.value` would
			// fall through to the published value whenever the pending one is `null`,
			// handing the reducer a stale `previous` for any `T` that admits null.
			const seed = pending ?? published;
			pending = { value: reduce === undefined ? next : reduce(seed?.value, next) };

			if (cancel === undefined) cancel = schedule(publish);
		},
	};
}

//#endregion
