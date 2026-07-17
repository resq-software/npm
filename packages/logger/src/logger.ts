/**
 * Copyright (c) 2026 ResQ
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
 * @fileoverview Structured logger for both client and server environments —
 * level-filtered console output plus a fan-out to registered transports. Uses
 * native console methods with no external dependencies; output follows the
 * pattern `TIMESTAMP LEVEL [CONTEXT] message { data }`.
 *
 * @module @resq-systems/logger/logger
 */

import { assertNever } from "./_assert.js";
import type {
	LogData,
	LogEntry,
	LoggerOptions,
	LogLevelString,
	LogTransport,
} from "./logger.types.js";

//#region Types

/**
 * Logging levels with their priority values; higher values enable more verbose
 * logging. A message is emitted only when its level is at or below the logger's
 * configured minimum.
 */
export enum LogLevel {
	/** No logging */
	NONE = 0,
	/** Only error messages */
	ERROR = 1,
	/** Errors and warnings */
	WARN = 2,
	/** Errors, warnings, and informational messages */
	INFO = 3,
	/** Errors, warnings, info, and debug messages */
	DEBUG = 4,
	/** Errors, warnings, info, debug, and trace messages */
	TRACE = 5,
	/** All possible log messages */
	ALL = 6,
}

/**
 * The named keys of {@link LogLevel} (e.g. `"INFO"`, `"ERROR"`). Derived from
 * the enum so the parser's accepted level names can never drift from it.
 */
type LogLevelName = keyof typeof LogLevel;

//#endregion

//#region Public API

/**
 * A versatile logging utility that works in both browser and Node.js environments.
 * Supports multiple log levels, colorized output, and structured data logging.
 */
export class Logger {
	/** The context/category name for this logger instance */
	private readonly context: string;

	/** The minimum log level that will be output */
	private minLevel: LogLevel;

	/**
	 * Type guard for a valid {@link LogLevel} name. Numeric enums carry reverse
	 * mappings (`"0".."6"`), so those are excluded — only the named keys
	 * (`"NONE".."ALL"`) are accepted.
	 */
	private static isLogLevelName(value: string): value is LogLevelName {
		return value in LogLevel && Number.isNaN(Number(value));
	}

	/**
	 * Map a (validated) level name to its numeric {@link LogLevel}. The
	 * exhaustive switch — closed by {@link assertNever} — forces this mapping to
	 * be updated in lockstep whenever the enum gains a member.
	 */
	private static levelFromName(name: LogLevelName): LogLevel {
		switch (name) {
			case "NONE":
				return LogLevel.NONE;
			case "ERROR":
				return LogLevel.ERROR;
			case "WARN":
				return LogLevel.WARN;
			case "INFO":
				return LogLevel.INFO;
			case "DEBUG":
				return LogLevel.DEBUG;
			case "TRACE":
				return LogLevel.TRACE;
			case "ALL":
				return LogLevel.ALL;
			default:
				return assertNever(name);
		}
	}

	/**
	 * Parse a log level from an arbitrary string (e.g. an env var), returning
	 * `undefined` when it is absent or not a recognised level name.
	 */
	private static parseLevel(level?: string): LogLevel | undefined {
		if (!level) return undefined;
		const upper = level.toUpperCase();
		return Logger.isLogLevelName(upper) ? Logger.levelFromName(upper) : undefined;
	}

	/** Registry of logger instances to implement the singleton pattern */
	private static readonly instances: Map<string, Logger> = new Map();

	/**
	 * Create a new logger for the given context. Prefer {@link Logger.getLogger}
	 * to reuse a shared instance per context.
	 *
	 * @param context - The context name for this logger (e.g. component or service name).
	 * @param options - Optional logger configuration.
	 */
	constructor(context: string, options: LoggerOptions = {}) {
		this.context = context;

		// Resolve the minimum level by precedence: explicit option, then the
		// LOG_LEVEL / BUN_LOG_LEVEL env vars, then a NODE_ENV-based default.
		const env = typeof process !== "undefined" ? process.env : {};
		const envLevel = Logger.parseLevel(env.LOG_LEVEL || env.BUN_LOG_LEVEL);

		this.minLevel =
			options.minLevel ??
			envLevel ??
			(env.NODE_ENV === "production" ? LogLevel.ERROR : LogLevel.ALL);
	}

	/**
	 * Get the shared logger instance for the given context, creating it on first
	 * use. Subsequent calls with the same context return the same instance, so
	 * `options` is honoured only on creation.
	 *
	 * On first use for a context this mutates the process-global instance
	 * registry; the cached instance then lives for the process lifetime.
	 *
	 * @param context - The context name.
	 * @param options - Optional logger configuration, applied only when creating.
	 * @returns The logger instance for the specified context.
	 */
	public static getLogger(context: string, options?: LoggerOptions): Logger {
		let instance = Logger.instances.get(context);

		if (!instance) {
			instance = new Logger(context, options);
			Logger.instances.set(context, instance);
		}

		return instance;
	}

	/**
	 * Set the global minimum log level across every existing logger instance.
	 *
	 * Mutates the `minLevel` of every logger currently in the registry. Instances
	 * created *after* this call are unaffected and resolve their own level from
	 * options/env as usual — this is a one-shot sweep, not a persistent floor.
	 *
	 * @param level - The minimum level to log across all loggers.
	 */
	public static setGlobalLogLevel(level: LogLevel): void {
		Logger.instances.forEach((logger) => {
			logger.minLevel = level;
		});
	}

	/**
	 * Registered log transports (the Observer pattern). Every log that passes its
	 * level filter is fanned out to each transport as a structured {@link LogEntry},
	 * in addition to the console output.
	 */
	private static readonly transports: LogTransport[] = [];

	/**
	 * Register a {@link LogTransport} to receive a structured {@link LogEntry} for
	 * every log emitted by any logger instance (after level filtering).
	 *
	 * Mutates the process-global transport registry shared by all `Logger`
	 * instances. Idempotent by identity: re-adding the same reference is a no-op
	 * (but a distinct object with the same `name` *is* added again). Calling the
	 * returned unsubscribe more than once is safe.
	 *
	 * @param transport - The transport to add. A transport already present (by
	 *   identity) is not added twice.
	 * @returns An unsubscribe function that removes this transport.
	 *
	 * @example
	 * ```ts
	 * const off = Logger.addTransport(new MemoryTransport());
	 * // ... later
	 * off();
	 * ```
	 */
	public static addTransport(transport: LogTransport): () => void {
		if (!Logger.transports.includes(transport)) {
			Logger.transports.push(transport);
		}
		return () => {
			Logger.removeTransport(transport);
		};
	}

	/**
	 * Remove a previously-registered transport, matched by identity or by its
	 * `name`. No-op if it is not registered.
	 *
	 * Mutates the process-global transport registry. When matching by `name` and
	 * several transports share it, only the first match is removed.
	 *
	 * @param transport - The transport instance to remove, or the `name` to match.
	 */
	public static removeTransport(transport: LogTransport | string): void {
		const index = Logger.transports.findIndex((registered) =>
			typeof transport === "string" ? registered.name === transport : registered === transport,
		);
		if (index !== -1) {
			Logger.transports.splice(index, 1);
		}
	}

	/** Remove every registered transport. */
	public static clearTransports(): void {
		Logger.transports.length = 0;
	}

	/** A read-only snapshot of the currently-registered transports. */
	public static getTransports(): readonly LogTransport[] {
		return [...Logger.transports];
	}

	/**
	 * Fan a structured entry out to every registered transport. Isolation is
	 * total: a transport that throws synchronously or rejects asynchronously must
	 * never break the originating log call or any sibling transport — failures are
	 * caught and swallowed here.
	 */
	private static dispatch(
		level: LogLevelString,
		context: string,
		message: string,
		data?: Record<string, unknown>,
	): void {
		if (Logger.transports.length === 0) {
			return;
		}

		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level,
			context,
			message,
			environment: typeof window === "undefined" ? "server" : "client",
			...(data && Object.keys(data).length > 0 ? { data } : {}),
		};

		for (const transport of Logger.transports) {
			try {
				const result = transport.write(entry);
				if (result instanceof Promise) {
					result.catch(() => {
						// A rejected async transport must not become an unhandled rejection.
					});
				}
			} catch {
				// A throwing transport must not break the log call or the loop.
			}
		}
	}

	/**
	 * Format a timestamp for log output
	 */
	private formatTimestamp(): string {
		const now = new Date();
		const y = now.getFullYear();
		const mo = String(now.getMonth() + 1).padStart(2, "0");
		const d = String(now.getDate()).padStart(2, "0");
		const h = String(now.getHours()).padStart(2, "0");
		const mi = String(now.getMinutes()).padStart(2, "0");
		const s = String(now.getSeconds()).padStart(2, "0");
		const ms = String(now.getMilliseconds()).padStart(3, "0");
		return `${y}-${mo}-${d} ${h}:${mi}:${s}.${ms}`;
	}

	/**
	 * Format structured log data into a readable suffix string.
	 * Returns empty string if data is null/empty.
	 */
	private formatData(data?: Record<string, unknown>): string {
		if (!data || Object.keys(data).length === 0) return "";
		try {
			return ` ${JSON.stringify(data)}`;
		} catch {
			return " [unserializable data]";
		}
	}

	/**
	 * Emit a log entry using the appropriate console method
	 */
	private emit(
		consoleFn: (...args: unknown[]) => void,
		label: string,
		level: LogLevelString,
		message: string,
		data?: Record<string, unknown>,
	): void {
		const ts = this.formatTimestamp();
		const suffix = this.formatData(data);
		consoleFn(`${ts} ${label} [${this.context}] ${message}${suffix}`);
		Logger.dispatch(level, this.context, message, data);
	}

	/**
	 * Log an informational message.
	 *
	 * @param message - The message to log.
	 * @param data - Optional structured data to include.
	 */
	info(message: string, data?: LogData): void {
		if (this.minLevel < LogLevel.INFO) return;
		this.emit(console.info, "INFO", "info", message, data);
	}

	/**
	 * Log an error message. An `Error` value is flattened to `{ name, message,
	 * stack }` (falling back to `error.cause.message` when the top-level message
	 * is empty) before being attached under `data.error`.
	 *
	 * @param message - The error message.
	 * @param error - Optional `Error` or otherwise-unknown error value.
	 * @param data - Optional additional structured data.
	 */
	error(message: string, error?: unknown, data?: LogData): void {
		if (this.minLevel < LogLevel.ERROR) return;

		let errorObj: unknown = error;
		if (error instanceof Error) {
			const errorMessage =
				error.message ||
				("cause" in error && error.cause instanceof Error ? error.cause.message : "");
			errorObj = { name: error.name, message: errorMessage, stack: error.stack };
		}

		this.emit(console.error, "ERROR", "error", message, { ...data, error: errorObj });
	}

	/**
	 * Log a warning message.
	 *
	 * @param message - The warning message.
	 * @param data - Optional structured data to include.
	 */
	warn(message: string, data?: LogData): void {
		if (this.minLevel < LogLevel.WARN) return;
		this.emit(console.warn, "WARN", "warn", message, data);
	}

	/**
	 * Log a debug message.
	 *
	 * @param message - The debug message.
	 * @param data - Optional structured data to include.
	 */
	debug(message: string, data?: LogData): void {
		if (this.minLevel < LogLevel.DEBUG) return;
		this.emit(console.debug, "DEBUG", "debug", message, data);
	}

	/**
	 * Log a trace message (the most verbose level).
	 *
	 * @param message - The trace message.
	 * @param data - Optional structured data to include.
	 */
	trace(message: string, data?: LogData): void {
		if (this.minLevel < LogLevel.TRACE) return;
		this.emit(console.debug, "TRACE", "trace", message, data);
	}

	/**
	 * Log an action message (for server actions or important user interactions).
	 *
	 * @param message - The action message.
	 * @param data - Optional structured data to include.
	 */
	action(message: string, data?: LogData): void {
		if (this.minLevel < LogLevel.INFO) return;
		this.emit(console.info, "ACTION", "action", message, data);
	}

	/**
	 * Log a success message.
	 *
	 * @param message - The success message.
	 * @param data - Optional structured data to include.
	 */
	success(message: string, data?: LogData): void {
		if (this.minLevel < LogLevel.INFO) return;
		this.emit(console.info, "SUCCESS", "success", message, data);
	}

	/**
	 * Open a console group for related log messages (a `console.group` wrapper).
	 *
	 * @param label - The group label.
	 */
	group(label: string): void {
		if (this.minLevel < LogLevel.INFO) return;
		console.group(label);
	}

	/**
	 * Close the current console group (a `console.groupEnd` wrapper).
	 */
	groupEnd(): void {
		if (this.minLevel < LogLevel.INFO) return;
		console.groupEnd();
	}

	/**
	 * Run a function and log how long it took. Below `DEBUG` level the timing is
	 * skipped and the function is still invoked. On failure the elapsed time is
	 * logged via {@link Logger.error} and the error is rethrown.
	 *
	 * Failure is surfaced as a rejected `Promise`: whatever `fn` throws or rejects
	 * with is re-thrown unchanged after the elapsed time is logged. There is no
	 * cancellation hook — `fn` runs to completion.
	 *
	 * @template T - The value the timed function resolves to (its return type).
	 * @param label - Description of the operation being timed.
	 * @param fn - Function to execute and time; may be sync or async.
	 * @returns The resolved result of the function execution.
	 * @throws The exact error `fn` threw or rejected with, re-thrown after logging.
	 */
	async time<T>(label: string, fn: () => Promise<T> | T): Promise<T> {
		if (this.minLevel < LogLevel.DEBUG) return fn();

		const startTime = performance.now();
		try {
			const result = await fn();
			const endTime = performance.now();
			const duration = (endTime - startTime).toFixed(2);
			this.info(`${label} completed`, { duration: `${duration}ms` });
			return result;
		} catch (error) {
			const endTime = performance.now();
			const duration = (endTime - startTime).toFixed(2);
			this.error(`${label} failed`, error, { duration: `${duration}ms` });
			throw error;
		}
	}
}

/**
 * The default shared logger, bound to the `[LOGGER]` context — the convenient
 * entry point for ad-hoc logging without managing a per-context instance.
 */
export const logger = new Logger("[LOGGER]", {
	includeTimestamp: true,
	colorize: true,
});

//#endregion
