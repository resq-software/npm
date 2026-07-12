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

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { LogLevel, Logger } from "../src/logger.js";
import type { LogEntry, LogTransport } from "../src/logger.types.js";
import {
	byLevel,
	createFilterTransport,
	JsonTransport,
	MemoryTransport,
} from "../src/transports.js";

const log = new Logger("transport-test", { minLevel: LogLevel.ALL });

beforeEach(() => {
	// Suppress the human-readable console output the logger also emits.
	vi.spyOn(console, "info").mockImplementation(() => {});
	vi.spyOn(console, "warn").mockImplementation(() => {});
	vi.spyOn(console, "error").mockImplementation(() => {});
	vi.spyOn(console, "debug").mockImplementation(() => {});
	vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
	Logger.clearTransports();
	vi.restoreAllMocks();
});

describe("Logger transports (Observer)", () => {
	test("fans a structured entry out to a registered transport", () => {
		const mem = new MemoryTransport();
		Logger.addTransport(mem);

		log.info("hello", { userId: 7 });

		expect(mem.entries).toHaveLength(1);
		const entry = mem.entries[0] as LogEntry;
		expect(entry.level).toBe("info");
		expect(entry.context).toBe("transport-test");
		expect(entry.message).toBe("hello");
		expect(entry.data).toEqual({ userId: 7 });
		expect(entry.environment).toBe("server");
		expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
	});

	test("maps each level method to its LogLevelString", () => {
		const mem = new MemoryTransport();
		Logger.addTransport(mem);

		log.warn("w");
		log.debug("d");
		log.trace("t");
		log.action("a");
		log.success("s");
		log.error("e");

		expect(mem.entries.map((e) => e.level)).toEqual([
			"warn",
			"debug",
			"trace",
			"action",
			"success",
			"error",
		]);
	});

	test("omits data when there is none", () => {
		const mem = new MemoryTransport();
		Logger.addTransport(mem);
		log.info("no data");
		expect(mem.entries[0]?.data).toBeUndefined();
	});

	test("addTransport returns an unsubscribe function", () => {
		const mem = new MemoryTransport();
		const off = Logger.addTransport(mem);
		log.info("before");
		off();
		log.info("after");
		expect(mem.entries).toHaveLength(1);
		expect(mem.entries[0]?.message).toBe("before");
	});

	test("does not register the same transport twice", () => {
		const mem = new MemoryTransport();
		Logger.addTransport(mem);
		Logger.addTransport(mem);
		expect(Logger.getTransports()).toHaveLength(1);
	});

	test("removeTransport works by name and clearTransports empties the registry", () => {
		Logger.addTransport(new MemoryTransport({ name: "a" }));
		Logger.addTransport(new MemoryTransport({ name: "b" }));
		Logger.removeTransport("a");
		expect(Logger.getTransports().map((t) => t.name)).toEqual(["b"]);
		Logger.clearTransports();
		expect(Logger.getTransports()).toHaveLength(0);
	});

	test("only receives entries that pass the logger's minLevel", () => {
		const mem = new MemoryTransport();
		Logger.addTransport(mem);
		const quiet = new Logger("quiet", { minLevel: LogLevel.WARN });
		quiet.info("dropped");
		quiet.warn("kept");
		expect(mem.entries.map((e) => e.message)).toEqual(["kept"]);
	});

	test("a throwing transport does not break logging or sibling transports", () => {
		const boom: LogTransport = {
			name: "boom",
			write() {
				throw new Error("transport failure");
			},
		};
		const mem = new MemoryTransport();
		Logger.addTransport(boom);
		Logger.addTransport(mem);

		expect(() => log.info("resilient")).not.toThrow();
		expect(mem.entries).toHaveLength(1);
	});

	test("a rejecting async transport does not surface as an unhandled rejection", () => {
		const asyncBoom: LogTransport = {
			name: "async-boom",
			write() {
				return Promise.reject(new Error("async failure"));
			},
		};
		Logger.addTransport(asyncBoom);
		expect(() => log.info("safe")).not.toThrow();
	});
});

describe("MemoryTransport capacity", () => {
	test("drops the oldest entries beyond capacity (ring buffer)", () => {
		const mem = new MemoryTransport({ capacity: 2 });
		Logger.addTransport(mem);
		log.info("1");
		log.info("2");
		log.info("3");
		expect(mem.entries.map((e) => e.message)).toEqual(["2", "3"]);
		Logger.clearTransports();
	});

	test("clear() empties the buffer", () => {
		const mem = new MemoryTransport();
		mem.write({
			timestamp: new Date().toISOString(),
			level: "info",
			context: "x",
			message: "m",
			environment: "server",
		});
		expect(mem.entries).toHaveLength(1);
		mem.clear();
		expect(mem.entries).toHaveLength(0);
	});
});

describe("JsonTransport", () => {
	test("serializes each entry to a JSON line", () => {
		const lines: string[] = [];
		const json = new JsonTransport({ sink: (line) => lines.push(line) });
		Logger.addTransport(json);
		log.info("json", { a: 1 });
		expect(lines).toHaveLength(1);
		expect(JSON.parse(lines[0] as string)).toMatchObject({
			level: "info",
			message: "json",
			data: { a: 1 },
		});
	});

	test("degrades gracefully on unserializable data instead of throwing", () => {
		const lines: string[] = [];
		const json = new JsonTransport({ sink: (line) => lines.push(line) });
		Logger.addTransport(json);
		const circular: Record<string, unknown> = {};
		circular.self = circular;
		expect(() => log.info("circular", circular)).not.toThrow();
		expect(JSON.parse(lines[0] as string).data).toBe("[unserializable]");
	});
});

describe("createFilterTransport + byLevel", () => {
	test("only forwards entries matching the predicate", () => {
		const mem = new MemoryTransport();
		Logger.addTransport(createFilterTransport(mem, byLevel("error", "warn")));
		log.info("dropped");
		log.warn("kept-warn");
		log.error("kept-error");
		expect(mem.entries.map((e) => e.message)).toEqual(["kept-warn", "kept-error"]);
	});
});
