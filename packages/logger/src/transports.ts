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
 * @fileoverview Built-in {@link LogTransport} implementations for the Observer
 * pipeline exposed by {@link Logger.addTransport}. Zero-dependency and
 * composable: a {@link MemoryTransport} for inspection/testing, a
 * {@link JsonTransport} for structured output, and {@link createFilterTransport}
 * to gate any transport by a predicate.
 *
 * @module @resq-systems/logger/transports
 */

import type { LogEntry, LogLevelString, LogTransport } from "./logger.types.js";

//#region Public API

/**
 * Buffers log entries in memory for inspection or testing.
 *
 * Optionally bounded: once `capacity` entries are held, the oldest are dropped
 * (a ring buffer), so it is safe to leave attached in long-running processes.
 *
 * @example
 * ```ts
 * const mem = new MemoryTransport({ capacity: 100 });
 * const off = Logger.addTransport(mem);
 * logger.info("hi");
 * expect(mem.entries.at(-1)?.message).toBe("hi");
 * off();
 * ```
 */
export class MemoryTransport implements LogTransport {
	readonly name: string;
	private readonly buffer: LogEntry[] = [];
	private readonly capacity: number;

	/**
	 * @param options - Optional transport `name` and buffer `capacity`; a
	 *   non-positive or omitted capacity means unbounded.
	 */
	constructor(options: { readonly name?: string; readonly capacity?: number } = {}) {
		this.name = options.name ?? "memory";
		this.capacity =
			options.capacity !== undefined && options.capacity > 0
				? options.capacity
				: Number.POSITIVE_INFINITY;
	}

	/**
	 * Append an entry, evicting the oldest entries once `capacity` is exceeded.
	 *
	 * @param entry - The log entry to buffer.
	 */
	write(entry: LogEntry): void {
		this.buffer.push(entry);
		if (this.buffer.length > this.capacity) {
			this.buffer.splice(0, this.buffer.length - this.capacity);
		}
	}

	/** A snapshot of the buffered entries, oldest first. */
	get entries(): readonly LogEntry[] {
		return [...this.buffer];
	}

	/** Discard all buffered entries. */
	clear(): void {
		this.buffer.length = 0;
	}
}

/**
 * Serializes each entry to a single JSON line and hands it to a sink
 * (`console.log` by default) — the shape most log aggregators ingest.
 *
 * Serialization is defensive: an entry whose `data` cannot be stringified
 * (circular references, BigInt, …) is emitted with `data` replaced by a marker
 * rather than throwing.
 */
export class JsonTransport implements LogTransport {
	readonly name: string;
	private readonly sink: (line: string) => void;

	/**
	 * @param options - Optional transport `name` and a `sink` for each JSON line
	 *   (defaults to `console.log`).
	 */
	constructor(options: { readonly name?: string; readonly sink?: (line: string) => void } = {}) {
		this.name = options.name ?? "json";
		this.sink =
			options.sink ??
			((line) => {
				console.log(line);
			});
	}

	/**
	 * Serialize the entry to one JSON line and hand it to the sink, substituting
	 * a marker for `data` that cannot be stringified rather than throwing.
	 *
	 * @param entry - The log entry to serialize.
	 */
	write(entry: LogEntry): void {
		try {
			this.sink(JSON.stringify(entry));
		} catch {
			this.sink(JSON.stringify({ ...entry, data: "[unserializable]" }));
		}
	}
}

/**
 * Wrap a transport so it only receives entries for which `predicate` is true —
 * a composable filter (Decorator over Observer). Compose with {@link byLevel}
 * for the common "only these levels" case.
 *
 * The wrapper is transparent to the write channel: for a matching entry it
 * returns exactly what `inner.write` returns (forwarding its promise when the
 * inner transport is async); for a non-matching entry it returns `undefined`
 * without invoking `inner`. The wrapper is stateless — `predicate` owns any
 * state — and its `name` is derived as `filter(<inner.name>)`.
 *
 * @param inner - The transport that receives entries passing the predicate.
 * @param predicate - Returns `true` for entries that should reach `inner`.
 * @returns A transport that forwards only matching entries to `inner`.
 *
 * @example
 * ```ts
 * Logger.addTransport(createFilterTransport(new JsonTransport(), byLevel("error", "warn")));
 * ```
 */
export function createFilterTransport(
	inner: LogTransport,
	predicate: (entry: LogEntry) => boolean,
): LogTransport {
	return {
		name: `filter(${inner.name})`,
		write(entry: LogEntry): void | Promise<void> {
			return predicate(entry) ? inner.write(entry) : undefined;
		},
	};
}

/**
 * Predicate factory for {@link createFilterTransport}: matches entries whose
 * `level` is one of `levels`.
 *
 * @param levels - The levels to admit.
 * @returns A predicate that is `true` only for entries at one of `levels`.
 */
export function byLevel(...levels: LogLevelString[]): (entry: LogEntry) => boolean {
	const allowed = new Set<LogLevelString>(levels);
	return (entry) => allowed.has(entry.level);
}

//#endregion
