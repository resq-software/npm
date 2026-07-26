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
 * @fileoverview Exponential backoff for a reconnecting socket.
 *
 * `createBackoff` is a pure schedule (1s → 2s → 4s → … capped at 30s by
 * default, reset on a successful open). `createReconnectTimer` binds it to a
 * single pending `setTimeout` so socket owners get schedule / cancel / reset
 * without juggling timer handles.
 *
 * @module @resq-systems/telemetry/backoff
 */

/** Default first retry delay. */
const DEFAULT_INITIAL_DELAY_MS = 1_000;
/** Default growth multiplier between attempts. */
const DEFAULT_FACTOR = 2;
/** Default cap for any single delay. */
const DEFAULT_MAX_DELAY_MS = 30_000;

export interface BackoffOptions {
	/** First retry delay in ms (default 1000). */
	initialDelayMs?: number;
	/** Multiplier applied after each handed-out delay (default 2). */
	factor?: number;
	/** Upper bound for any single delay in ms (default 30000). */
	maxDelayMs?: number;
}

export interface Backoff {
	/** Delay for the next attempt, advancing the schedule. */
	nextDelayMs(): number;
	/** The delay the next `nextDelayMs()` will return, without advancing. */
	peekDelayMs(): number;
	/** Number of delays handed out since the last reset. */
	attempts(): number;
	/** Return to the initial delay — call after a successful connect. */
	reset(): void;
}

/** Create an exponential backoff schedule (pure math, no timers). */
export function createBackoff(options: BackoffOptions = {}): Backoff {
	const initial = options.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
	const factor = options.factor ?? DEFAULT_FACTOR;
	const max = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;

	let attempt = 0;
	const delayFor = (n: number): number => Math.min(initial * factor ** n, max);

	return {
		nextDelayMs: () => delayFor(attempt++),
		peekDelayMs: () => delayFor(attempt),
		attempts: () => attempt,
		reset: () => {
			attempt = 0;
		},
	};
}

export interface ReconnectTimer {
	/**
	 * Arm `task` after the next backoff delay (replacing any pending run).
	 * Returns the delay used, mostly for logging / tests.
	 */
	schedule(): number;
	/** Cancel a pending run; no-op when idle. */
	cancel(): void;
	/** Reset the underlying backoff schedule — call on a successful open. */
	reset(): void;
	/** Whether a run is currently armed. */
	pending(): boolean;
}

/**
 * Bind a backoff schedule to a single pending `setTimeout`.
 *
 * @param task    Reconnect callback (e.g. the socket's `connect()` closure).
 * @param backoff Schedule to consume; defaults to `createBackoff()`.
 */
export function createReconnectTimer(
	task: () => void,
	backoff: Backoff = createBackoff(),
): ReconnectTimer {
	let timer: ReturnType<typeof setTimeout> | null = null;

	return {
		schedule() {
			if (timer) clearTimeout(timer);
			const delay = backoff.nextDelayMs();
			timer = setTimeout(() => {
				timer = null;
				task();
			}, delay);
			return delay;
		},
		cancel() {
			if (timer) clearTimeout(timer);
			timer = null;
		},
		reset() {
			backoff.reset();
		},
		pending: () => timer !== null,
	};
}
