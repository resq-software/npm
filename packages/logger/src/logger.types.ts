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
 * @fileoverview Shared type definitions for `@resq-systems/logger` — log levels,
 * logger options, the structured {@link LogEntry}/{@link LogTransport} contract,
 * and the option shapes consumed by the logging decorators.
 *
 * @module @resq-systems/logger/logger.types
 */

import type { LogLevel, Logger } from "./logger.js";

//#region Types

/**
 * Structured data attached to a log message — an open bag of key-value pairs.
 *
 * Values should be JSON-serializable: the console formatter and
 * {@link JsonTransport} render this bag via `JSON.stringify`, and a value that
 * cannot be stringified (circular references, `BigInt`, …) is replaced with an
 * unserializable marker rather than throwing. Keys are not namespaced, so a
 * caller-supplied `error` key collides with the one {@link Logger.error} injects.
 */
export interface LogData {
	/** Arbitrary key-value pairs to include in the log. */
	[key: string]: unknown;
}

/**
 * Configuration options for a {@link Logger} instance.
 *
 * Only {@link LoggerOptions.minLevel} currently influences behavior; the
 * remaining fields are accepted but not yet applied by the console formatter —
 * timestamps are always emitted and output is never colorized regardless of what
 * is passed. Treat the formatting/file fields as reserved surface.
 */
export interface LoggerOptions {
	/**
	 * Minimum level a message must meet to be emitted. When omitted, the
	 * constructor falls back to the `LOG_LEVEL`/`BUN_LOG_LEVEL` env var, then to a
	 * `NODE_ENV`-based default (`ERROR` in production, `ALL` otherwise).
	 */
	minLevel?: LogLevel;
	/** Reserved: timestamps are currently emitted unconditionally. */
	includeTimestamp?: boolean;
	/** Reserved: console output is not currently colorized. */
	colorize?: boolean;
	/** Reserved: file output is not currently implemented (server-side intent). */
	logToFile?: boolean;
	/** Reserved: only meaningful alongside {@link LoggerOptions.logToFile}. */
	filePath?: string;
}

/**
 * Available color keys for log formatting.
 */
export type ColorKey =
	| "reset"
	| "red"
	| "yellow"
	| "blue"
	| "green"
	| "gray"
	| "bold"
	| "magenta"
	| "cyan"
	| "white";

/**
 * Log level strings used across the transport and decorator surfaces.
 */
export type LogLevelString = "error" | "warn" | "info" | "debug" | "trace" | "action" | "success";

/**
 * The subset of {@link LogLevelString} whose {@link Logger} method accepts a
 * `(message: string, data?: LogData)` call signature.
 *
 * Deliberately excludes `"error"`: `Logger.error`'s second parameter is an
 * `Error`/`unknown`, not structured {@link LogData}, so routing log data
 * through it would silently misinterpret the payload. Derived from the actual
 * method signatures on {@link Logger} (a method's second parameter must accept
 * only {@link LogData}), so it cannot drift from the class.
 */
export type SimpleLogLevel = {
	[K in LogLevelString]: Parameters<Logger[K]>[1] extends LogData | undefined ? K : never;
}[LogLevelString];

/**
 * A structured log entry as delivered to every registered {@link LogTransport}.
 *
 * Assembled fresh per emitted log after level filtering; the same object
 * instance is handed to every transport, so a transport must treat it as
 * read-only rather than mutate the shared entry.
 */
export interface LogEntry {
	/** UTC timestamp in ISO-8601 (`Date#toISOString`), captured at dispatch time. */
	timestamp: string;
	/** Severity level of the entry. */
	level: LogLevelString;
	/** Logger context/category that emitted the entry. */
	context: string;
	/** Human-readable log message. */
	message: string;
	/**
	 * Structured payload. Absent when no data was passed *or* the passed object
	 * was empty — an empty bag is dropped rather than emitted as `{}`.
	 */
	data?: LogData;
	/**
	 * Where the entry originated, derived from `typeof window`: `"server"` when
	 * `window` is undefined, otherwise `"client"`.
	 */
	environment: "client" | "server";
}

/**
 * Contract for a custom log transport that receives structured {@link LogEntry}
 * values (see {@link Logger.addTransport}).
 *
 * A transport's {@link LogTransport.write} runs inside the emitting log call.
 * Errors are isolated by {@link Logger}: a synchronous throw is caught and a
 * rejected promise is swallowed, so a failing transport never breaks the log
 * call or sibling transports — but it also means write failures are silent, so a
 * transport that needs delivery guarantees must handle its own errors.
 */
export interface LogTransport {
	/** Transport name, used for identification and removal by name. */
	name: string;
	/**
	 * Write a single entry. May run synchronously or return a promise; the
	 * returned promise is not awaited by the logger, only guarded against
	 * rejection, so ordering across async transports is not guaranteed.
	 */
	write(entry: LogEntry): void | Promise<void>;
}

/**
 * Options for the `@Log` decorator.
 */
export interface LogMethodOptions {
	/** Whether to log method arguments (default: `true`). */
	logArgs?: boolean;
	/** Whether to log the return value (default: `false`). */
	logResult?: boolean;
	/** Custom message prefix. */
	message?: string;
	/** Log level to use (default: `"debug"`); `"error"` is excluded — see {@link SimpleLogLevel}. */
	level?: SimpleLogLevel;
}

/**
 * Options for the `@LogTiming` decorator.
 */
export interface LogTimingOptions {
	/** Custom label for timing logs. */
	label?: string;
	/** Threshold in ms — only log when execution exceeds this (default: `0`). */
	threshold?: number;
	/** Log level to use (default: `"info"`). */
	level?: LogLevelString;
}

/**
 * Options for the `@LogError` decorator.
 */
export interface LogErrorOptions {
	/** Whether to rethrow the error after logging (default: `true`). */
	rethrow?: boolean;
	/** Custom error message prefix. */
	message?: string;
	/** Whether to log the stack trace (default: `true`). */
	includeStack?: boolean;
}

/**
 * Options for the `@LogClass` decorator.
 */
export interface LogClassOptions {
	/** Methods to exclude from logging. */
	exclude?: string[];
	/** Whether to log all method calls (default: `true`). */
	logCalls?: boolean;
	/** Whether to time all method calls (default: `false`). */
	timing?: boolean;
}

//#endregion
