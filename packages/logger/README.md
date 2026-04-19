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

# @resq-sw/logger

> Structured logging with log levels, decorators, and singleton management for Node.js and Bun.

## Installation

```bash
bun add @resq-sw/logger
```

Zero runtime dependencies.

## Quick Start

```ts
import { Logger, LogLevel } from "@resq-sw/logger";

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

## Decorators

### `@Log(options?)`

Logs method entry and exit with optional argument and return value logging.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `logArgs` | `boolean` | `true` | Log method arguments |
| `logResult` | `boolean` | `false` | Log return value |
| `message` | `string` | method name | Custom message prefix |
| `level` | `LogLevelString` | `"debug"` | Log level to use |

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

Exported types: `LogData`, `LoggerOptions`, `LogLevel`, `LogLevelString`, `ColorKey`, `LogEntry`, `LogTransport`, `LogMethodOptions`, `LogTimingOptions`, `LogErrorOptions`, `LogClassOptions`.

## License

Apache-2.0
