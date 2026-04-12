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
 * @fileoverview A comprehensive logging utility for both client and server environments.
 * Provides structured logging with support for different log levels, colorization,
 * and contextual information.
 *
 * This logger uses native console methods with structured formatting — no external
 * dependencies are required. Log output follows the pattern:
 *   TIMESTAMP LEVEL [CONTEXT] message { data }
 */

/**
 * Enum representing different logging levels with their priority values.
 * Higher values indicate more verbose logging.
 * @enum {number}
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
 * Available color keys for log formatting
 * @typedef {'reset' | 'red' | 'yellow' | 'blue' | 'green' | 'gray' | 'bold' | 'magenta' | 'cyan' | 'white'} ColorKey
 */
export type ColorKey =
  | 'reset'
  | 'red'
  | 'yellow'
  | 'blue'
  | 'green'
  | 'gray'
  | 'bold'
  | 'magenta'
  | 'cyan'
  | 'white';

/**
 * Interface for structured data that can be attached to log messages
 * @interface
 */
export interface LogData {
  /**
   * Any key-value pairs to include in the log
   */
  [key: string]: unknown;
}

/**
 * Configuration options for the Logger
 * @interface
 */
export interface LoggerOptions {
  /**
   * The minimum level of messages to log
   */
  minLevel?: LogLevel;

  /**
   * Whether to include timestamps in log messages
   */
  includeTimestamp?: boolean;

  /**
   * Whether to colorize log output
   */
  colorize?: boolean;

  /**
   * Whether to write logs to a file (server-side only)
   */
  logToFile?: boolean;

  /**
   * Path to the log file if logToFile is enabled
   */
  filePath?: string;
}

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
   * Parse log level from string or return default
   */
  private static parseLevel(level?: string): LogLevel | undefined {
    if (!level) return undefined;
    const upper = level.toUpperCase();
    switch (upper) {
      case 'NONE': return LogLevel.NONE;
      case 'ERROR': return LogLevel.ERROR;
      case 'WARN': return LogLevel.WARN;
      case 'INFO': return LogLevel.INFO;
      case 'DEBUG': return LogLevel.DEBUG;
      case 'TRACE': return LogLevel.TRACE;
      case 'ALL': return LogLevel.ALL;
      default: return undefined;
    }
  }

  /** Registry of logger instances to implement the singleton pattern */
  private static readonly instances: Map<string, Logger> = new Map();

  /**
   * Create a new Logger instance or return an existing one for the given context
   * @param {string} context - The context name for this logger (e.g., component or service name)
   * @param {LoggerOptions} [options={}] - Optional logger configuration
   */
  constructor(context: string, options: LoggerOptions = {}) {
    this.context = context;

    // Priority: options.minLevel > LOG_LEVEL env > BUN_LOG_LEVEL env > Default
    const env = typeof process !== 'undefined' ? process.env : {};
    const envLevel = Logger.parseLevel(env['LOG_LEVEL'] || env['BUN_LOG_LEVEL']);

    this.minLevel =
      options.minLevel ??
      envLevel ??
      (env['NODE_ENV'] === 'production' ? LogLevel.ERROR : LogLevel.ALL);
  }

  /**
   * Get a logger instance for the given context.
   * If a logger with this context already exists, returns the existing instance.
   *
   * @param {string} context - The context name
   * @param {LoggerOptions} [options] - Optional logger configuration
   * @returns {Logger} A logger instance for the specified context
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
   * Set global minimum log level for all logger instances
   *
   * @param {LogLevel} level - The minimum level to log across all loggers
   */
  public static setGlobalLogLevel(level: LogLevel): void {
    Logger.instances.forEach((logger) => {
      logger.minLevel = level;
    });
  }

  /**
   * Format a timestamp for log output
   */
  private formatTimestamp(): string {
    const now = new Date();
    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `${y}-${mo}-${d} ${h}:${mi}:${s}.${ms}`;
  }

  /**
   * Format structured log data into a readable suffix string.
   * Returns empty string if data is null/empty.
   */
  private formatData(data?: Record<string, unknown>): string {
    if (!data || Object.keys(data).length === 0) return '';
    try {
      return ` ${JSON.stringify(data)}`;
    } catch {
      return ' [unserializable data]';
    }
  }

  /**
   * Emit a log entry using the appropriate console method
   */
  private emit(
    consoleFn: (...args: unknown[]) => void,
    level: string,
    message: string,
    data?: Record<string, unknown>,
  ): void {
    const ts = this.formatTimestamp();
    const suffix = this.formatData(data);
    consoleFn(`${ts} ${level} [${this.context}] ${message}${suffix}`);
  }

  /**
   * Log an informational message
   *
   * @param {string} message - The message to log
   * @param {LogData} [data] - Optional data to include
   */
  info(message: string, data?: LogData): void {
    if (this.minLevel < LogLevel.INFO) return;
    this.emit(console.info, 'INFO', message, data);
  }

  /**
   * Log an error message
   *
   * @param {string} message - The error message
   * @param {Error|unknown} [error] - Optional Error object or unknown error
   * @param {LogData} [data] - Optional additional data
   */
  error(message: string, error?: unknown, data?: LogData): void {
    if (this.minLevel < LogLevel.ERROR) return;

    let errorObj: unknown = error;
    if (error instanceof Error) {
      const errorMessage =
        error.message || ('cause' in error && error.cause instanceof Error ? error.cause.message : '');
      errorObj = { name: error.name, message: errorMessage, stack: error.stack };
    }

    this.emit(console.error, 'ERROR', message, { ...data, error: errorObj });
  }

  /**
   * Log a warning message
   *
   * @param {string} message - The warning message
   * @param {LogData} [data] - Optional data to include
   */
  warn(message: string, data?: LogData): void {
    if (this.minLevel < LogLevel.WARN) return;
    this.emit(console.warn, 'WARN', message, data);
  }

  /**
   * Log a debug message
   *
   * @param {string} message - The debug message
   * @param {LogData} [data] - Optional data to include
   */
  debug(message: string, data?: LogData): void {
    if (this.minLevel < LogLevel.DEBUG) return;
    this.emit(console.debug, 'DEBUG', message, data);
  }

  /**
   * Log a trace message (most verbose level)
   *
   * @param {string} message - The trace message
   * @param {LogData} [data] - Optional data to include
   */
  trace(message: string, data?: LogData): void {
    if (this.minLevel < LogLevel.TRACE) return;
    this.emit(console.debug, 'TRACE', message, data);
  }

  /**
   * Log an action message (for server actions or important user interactions)
   *
   * @param {string} message - The action message
   * @param {LogData} [data] - Optional data to include
   */
  action(message: string, data?: LogData): void {
    if (this.minLevel < LogLevel.INFO) return;
    this.emit(console.info, 'ACTION', message, data);
  }

  /**
   * Log a success message
   *
   * @param {string} message - The success message
   * @param {LogData} [data] - Optional data to include
   */
  success(message: string, data?: LogData): void {
    if (this.minLevel < LogLevel.INFO) return;
    this.emit(console.info, 'SUCCESS', message, data);
  }

  /**
   * Group related log messages (console.group wrapper)
   *
   * @param {string} label - The group label
   */
  group(label: string): void {
    if (this.minLevel < LogLevel.INFO) return;
    console.group(label);
  }

  /**
   * End a log group (console.groupEnd wrapper)
   */
  groupEnd(): void {
    if (this.minLevel < LogLevel.INFO) return;
    console.groupEnd();
  }

  /**
   * Log execution time of a function
   *
   * @template T - The return type of the function being timed
   * @param {string} label - Description of the operation being timed
   * @param {() => Promise<T> | T} fn - Function to execute and time
   * @returns {Promise<T>} The result of the function execution
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

export const logger = new Logger('[LOGGER]', {
  includeTimestamp: true,
  colorize: true,
});
