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
 */
export interface LogData {
	/** Arbitrary key-value pairs to include in the log. */
	[key: string]: unknown;
}

/**
 * Configuration options for a {@link Logger} instance.
 */
export interface LoggerOptions {
	/** The minimum level of messages to log. */
	minLevel?: LogLevel;
	/** Whether to include timestamps in log messages. */
	includeTimestamp?: boolean;
	/** Whether to colorize log output. */
	colorize?: boolean;
	/** Whether to write logs to a file (server-side only). */
	logToFile?: boolean;
	/** Path to the log file when {@link LoggerOptions.logToFile} is enabled. */
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
 */
export interface LogEntry {
	/** ISO-8601 timestamp of the log. */
	timestamp: string;
	/** Severity level of the entry. */
	level: LogLevelString;
	/** Logger context/category that emitted the entry. */
	context: string;
	/** Human-readable log message. */
	message: string;
	/** Optional structured data payload. */
	data?: LogData;
	/** Environment the entry originated in. */
	environment: "client" | "server";
}

/**
 * Contract for a custom log transport that receives structured {@link LogEntry}
 * values (see {@link Logger.addTransport}).
 */
export interface LogTransport {
	/** Transport name, used for identification and removal by name. */
	name: string;
	/** Write a single entry; may be synchronous or return a promise. */
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
