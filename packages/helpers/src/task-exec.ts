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
 * @fileoverview Earliest-deadline-first task scheduler backed by a binary heap,
 * keeping a single armed timer instead of one `setTimeout` per queued task.
 *
 * @module @resq-systems/helpers/task-exec
 */

import { PriorityQueue } from "@resq-systems/dsa";
import type { TimedTask } from "./task-exec.types.js";

/**
 * Earliest-deadline-first task scheduler backed by a binary heap.
 *
 * Add work via {@link exec | `exec(func, ttl)`}; the scheduler keeps a
 * single active `setTimeout` armed for the next-due task and re-arms
 * it after each fire. Tasks scheduled with shorter `ttl` than what is
 * currently armed pre-empt the current timer (the existing timer is
 * cleared and re-scheduled for the new earliest deadline).
 *
 * Compared to manually calling `setTimeout` per task, this avoids
 * holding many concurrent timers and keeps wall-clock ordering
 * deterministic when many tasks queue at once.
 *
 * @example
 * ```ts
 * const sched = new TaskExec();
 * sched.exec(() => flush(), 5_000);    // run in ~5s
 * sched.exec(() => log("now"), 0);     // runs immediately
 * sched.exec(() => report(), 60_000);  // run in ~60s
 * ```
 */
export class TaskExec {
	private readonly tasks = new PriorityQueue<TimedTask>({
		compareFn: (a, b) => a.execTime - b.execTime,
	});

	private handler: ReturnType<typeof setTimeout> | undefined;

	/**
	 * Schedule a callback to run no sooner than `ttl` milliseconds from
	 * now. Multiple tasks can be queued; each fires at its own deadline.
	 *
	 * Mutates the internal heap and arms/re-arms a single `setTimeout`, so
	 * this is an effectful call tied to the event loop and the clock.
	 *
	 * @param func - Callback to run; receives no arguments. Return value
	 *   is ignored. A synchronous throw bubbles out of the timer callback
	 *   (per `setTimeout` semantics) **before** the scheduler re-arms — so
	 *   the timer is left un-armed and any still-queued tasks stay pending
	 *   until the next `exec` call re-arms it. Keep task bodies
	 *   self-guarding if later tasks must still fire.
	 * @param ttl - Delay in milliseconds. Pass `0` for "run on the next
	 *   tick". Negative values are clamped to `0`.
	 */
	exec(func: () => unknown, ttl: number): void {
		this.tasks.enqueue({ func, execTime: Date.now() + ttl });
		this.handleNext();
	}

	/**
	 * Arm the timer for whichever task is currently at the head of the
	 * heap. No-op when the heap is empty.
	 *
	 * @internal
	 */
	private handleNext(): void {
		if (!this.tasks.size) {
			return;
		}

		const { execTime } = this.tasks.peek()!;
		this.execNext(Math.max(execTime - Date.now(), 0));
	}

	/**
	 * Clear any pending timer and re-arm for `ttl` ms in the future. On
	 * fire, pops the head task, invokes it, then recurses via
	 * {@link handleNext} to arm the next deadline.
	 *
	 * @internal
	 */
	private execNext(ttl: number): void {
		clearTimeout(this.handler);
		this.handler = setTimeout(() => {
			const { func } = this.tasks.dequeue()!;
			func();
			this.handleNext();
		}, ttl);
	}
}
