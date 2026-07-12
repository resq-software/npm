<!--
  Copyright 2026 ResQ Systems, Inc.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->

# @resq-systems/logger

[![npm](https://img.shields.io/npm/v/%40resq-systems%2Flogger?style=flat-square)](https://www.npmjs.com/package/@resq-systems/logger)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)](../../LICENSE.md)
[![deps](https://img.shields.io/badge/runtime%20deps-0-25c68a?style=flat-square)](./package.json)

> Structured logging with log levels, decorators, and singleton management for Node.js and Bun.

## Installation

```bash
bun add @resq-systems/logger
```

Zero runtime dependencies.

## Quick Start

```ts
import { Logger, LogLevel } from "@resq-systems/logger";

const log = Logger.getLogger("[MyService]");

log.info("Server started", { port: 3000 });
log.warn("Disk usage high", { percent: 92 });
log.error("Connection failed", new Error("timeout"), { host: "db" });
log.debug("Cache hit", { key: "user:123" });
```

Output format: `YYYY-MM-DD HH:mm:ss.SSS LEVEL [context] message {data}`

## API Reference

### Logger Class

#### `Logger.getLogger(context, options?): Logger`

Returns a singleton Logger instance for the given context. Subsequent calls with the same context return the same instance.

#### `new Logger(context, options?)`

Creates a new Logger instance.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minLevel` | `LogLevel` | env-based | Minimum log level |
| `includeTimestamp` | `boolean` | -- | Include timestamps |
| `colorize` | `boolean` | -- | Colorize output |
| `logToFile` | `boolean` | -- | Write to file (server-side) |
| `filePath` | `string` | -- | Log file path |

**Level resolution priority**: `options.minLevel` > `LOG_LEVEL` env > `BUN_LOG_LEVEL` env > `LogLevel.ERROR` (production) / `LogLevel.ALL` (development).

#### `Logger.setGlobalLogLevel(level: LogLevel): void`

Sets the minimum log level for all existing logger instances.

#### `logger` (singleton)

A ready-to-use `Logger` instance with context `[LOGGER]` is also exported for quick, app-wide logging without managing your own instance.

```ts
import { logger } from "@resq-systems/logger";

logger.info("ready");
```

### Log Levels

```ts
enum LogLevel {
  NONE  = 0,  // No logging
  ERROR = 1,  // Errors only
  WARN  = 2,  // Errors + warnings
  INFO  = 3,  // + informational
  DEBUG = 4,  // + debug messages
  TRACE = 5,  // + trace messages
  ALL   = 6,  // Everything
}
```

### Logging Methods

All methods accept an optional `data` parameter (`Record<string, unknown>`).

| Method | Min Level | Console Method | Description |
|--------|-----------|----------------|-------------|
| `info(message, data?)` | `INFO` | `console.info` | Informational messages |
| `error(message, error?, data?)` | `ERROR` | `console.error` | Errors (auto-serializes Error objects) |
| `warn(message, data?)` | `WARN` | `console.warn` | Warnings |
| `debug(message, data?)` | `DEBUG` | `console.debug` | Debug messages |
| `trace(message, data?)` | `TRACE` | `console.debug` | Trace messages (most verbose) |
| `action(message, data?)` | `INFO` | `console.info` | Server actions / user interactions |
| `success(message, data?)` | `INFO` | `console.info` | Success confirmations |

### Grouping

```ts
log.group("Request Processing");
log.info("Step 1");
log.info("Step 2");
log.groupEnd();
```

### Timing

#### `logger.time<T>(label, fn): Promise<T>`

Measures and logs execution time of a sync or async function.

```ts
const result = await log.time("DB query", async () => {
  return await db.query("SELECT * FROM users");
});
// Logs: "DB query completed" { duration: "12.34ms" }
```

On error, logs the failure with duration and rethrows.

## Transports

Beyond console output, every log that passes its level filter is fanned out to any registered **transports** as a structured `LogEntry` (an Observer pipeline). Transports are managed with static methods on `Logger` and apply globally across all logger instances. A transport that throws or rejects is isolated -- it never breaks the originating log call or sibling transports.

| Method | Description |
|--------|-------------|
| `Logger.addTransport(transport)` | Register a transport; returns an unsubscribe function. Adding the same transport twice is a no-op. |
| `Logger.removeTransport(transport \| name)` | Remove a transport by identity or by its `name`. |
| `Logger.clearTransports()` | Remove every registered transport. |
| `Logger.getTransports()` | Read-only snapshot of registered transports. |

### Built-in Transports

- **`MemoryTransport`** -- buffers entries for inspection or testing. Optional `capacity` makes it a bounded ring buffer (oldest dropped). Exposes `entries` (snapshot, oldest first) and `clear()`.
- **`JsonTransport`** -- serializes each entry to a single JSON line and hands it to a `sink` (defaults to `console.log`). Unserializable `data` is emitted with a marker instead of throwing.

### Filtering

- **`createFilterTransport(inner, predicate)`** -- wraps a transport so it only receives entries for which `predicate` returns `true`.
- **`byLevel(...levels)`** -- predicate factory matching entries whose `level` is one of `levels`.

```ts
import {
  Logger,
  MemoryTransport,
  JsonTransport,
  createFilterTransport,
  byLevel,
} from "@resq-systems/logger";

const log = Logger.getLogger("[App]");

// Buffer the last 100 entries in memory
const mem = new MemoryTransport({ capacity: 100 });
const off = Logger.addTransport(mem);

log.info("hi");
mem.entries.at(-1)?.message; // "hi"
off(); // unsubscribe

// Structured JSON output, gated to errors + warnings only
Logger.addTransport(createFilterTransport(new JsonTransport(), byLevel("error", "warn")));
```

Implement the `LogTransport` interface (`name` plus `write(entry: LogEntry)`) to build custom transports.

## Decorators

### `@Log(options?)`

Logs method entry and exit with optional argument and return value logging.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `logArgs` | `boolean` | `true` | Log method arguments |
| `logResult` | `boolean` | `false` | Log return value |
| `message` | `string` | method name | Custom message prefix |
| `level` | `SimpleLogLevel` | `"debug"` | Log level to use (excludes `"error"`, whose second arg is an error, not data) |

```ts
class UserService {
  @Log({ logArgs: true, logResult: true, level: "info" })
  async getUser(id: string) { return { id, name: "John" }; }
}
```

### `@LogTiming(options?)`

Logs method execution time. Works with both sync and async methods.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `label` | `string` | `ClassName.methodName` | Custom timing label |
| `threshold` | `number` | `0` | Only log if duration exceeds this (ms) |
| `level` | `LogLevelString` | `"info"` | Log level to use |

```ts
class DataService {
  @LogTiming({ threshold: 100 })
  async fetchData() { /* only logged if > 100ms */ }
}
```

### `@LogError(options?)`

Wraps method in try/catch, logs errors with stack traces.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `rethrow` | `boolean` | `true` | Rethrow after logging |
| `message` | `string` | `"<method> error"` | Custom error prefix |
| `includeStack` | `boolean` | `true` | Include stack trace in log |

```ts
class Api {
  @LogError({ rethrow: false, message: "API call failed" })
  async callApi() { throw new Error("Network error"); }
  // Error is logged but swallowed; method returns undefined
}
```

### `@LogClass(options?)`

Class decorator that applies logging to all methods on the prototype.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `exclude` | `string[]` | `[]` | Method names to skip |
| `logCalls` | `boolean` | `true` | Log method entry/exit |
| `timing` | `boolean` | `false` | Log execution times |

```ts
@LogClass({ exclude: ["internalHelper"], timing: true })
class MyService {
  publicMethod() { /* logged with timing */ }
  internalHelper() { /* not logged */ }
}
```

## Types

Exported types: `LogData`, `LoggerOptions`, `LogLevel`, `LogLevelString`, `SimpleLogLevel`, `ColorKey`, `LogEntry`, `LogTransport`, `LogMethodOptions`, `LogTimingOptions`, `LogErrorOptions`, `LogClassOptions`.

## Prerequisites

- **Runtime**: Bun 1.1+ or Node.js 20+

## Configuration

- **Log Levels**: Configure `LOG_LEVEL` environment variable (`debug`, `info`, `warn`, `error`). Defaults to `info`.

## Testing

```sh
bun --filter @resq-systems/logger test
```

## Troubleshooting

- **Missing Logs in Production**: Verify `LOG_LEVEL` is not set too high. Check that decorator logs are initialized correctly.


## License

Apache-2.0
