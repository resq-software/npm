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
 * @fileoverview Type describing a single unit of deferred work scheduled by the
 * `TaskExec` earliest-deadline-first scheduler.
 *
 * @module @resq-systems/helpers/task-exec.types
 */

/**
 * A unit of deferred work tracked by {@link TaskExec}.
 *
 * Tasks are ordered by `execTime` (a Unix epoch millisecond) — the
 * earliest-due task is always at the head of the priority queue.
 */
export type TimedTask = {
	/** Callback to invoke when the task fires. Invoked with no arguments; return value is ignored. */
	func: () => unknown;
	/** Earliest time (epoch ms) at which `func` should run. */
	execTime: number;
};
