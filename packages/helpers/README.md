# @resq-sw/helpers

> Functional utilities, type guards, result types, formatting, browser detection, and async task execution.

## Installation

```bash
bun add @resq-sw/helpers
```

Dependencies: `@resq-sw/logger`, `tinyqueue`.

## Quick Start

```ts
import { catchError, success, failure, isString, Stringify, getURL } from "@resq-sw/helpers";

const result = await catchError(fetch, "/api/data");
if (result.success) console.log(result.value);

const json = Stringify({ name: "ResQ" });
const url = getURL("api/users"); // origin-relative URL
```

## API Reference

### Result Types

Railway-oriented programming primitives for error handling without exceptions.

#### `success(value): Success<T>`

Creates a successful result wrapping `value`.

#### `failure(error): Failure<E>`

Creates a failed result wrapping `error`.

#### `catchError(asyncFn, ...args): Promise<Result<T, Error>>`

Wraps an async function call in a `Result`. Returns `Success` on resolve, `Failure` on rejection.

```ts
const result = await catchError(fetchUser, userId);
if (result.success) console.log(result.value);
```

#### `map(fn): (result) => Result<U, E>`

Transforms the value inside a successful result.

```ts
const double = map((n: number) => n * 2);
double(success(5)); // success(10)
```

#### `bindResult(fn): (result) => Result<U, E>`

Chains a result-returning function after a successful result (flatMap).

#### `railway(input, ...fns): Result<T, E>`

Pipes an input through a chain of result-returning functions, short-circuiting on the first failure. Supports up to 5 functions with full type inference.

```ts
const result = railway(
  "42",
  (s) => success(parseInt(s)),
  (n) => n > 0 ? success(n) : failure("must be positive"),
);
```

#### `recover(fn): (result) => Result<T, E2>`

Recovers from a failure by applying `fn` to the error.

#### `tap(fn): (result) => Result<T, E>`

Executes a side effect on success without modifying the result.

### Utilities

#### `Stringify(obj): string`

Converts an object to a pretty-printed JSON string (2-space indent).

#### `getURL(path?): string`

Builds a full URL from `globalThis.location.origin` (browser) or environment variables (`VITE_BASE_URL`, `NEXT_PUBLIC_BASE_URL`, `BASE_URL`).

- **path** (`string`, default `""`) -- path to append.
- Returns `""` if no origin is available.

### Type Guards

| Function | Narrows to |
|----------|-----------|
| `isNumber(value)` | `number` |
| `isString(value)` | `string` |
| `isFunction(value)` | `Function` |
| `isPromise(value)` | `Promise<unknown>` |

### TaskExec

Priority-queue-based delayed task executor. Tasks are sorted by execution time and fired in order.

```ts
import { TaskExec } from "@resq-sw/helpers";

const exec = new TaskExec();
exec.exec(() => console.log("later"), 5000);  // runs after 5s
exec.exec(() => console.log("sooner"), 1000); // runs after 1s
```

#### `exec(func, ttl): void`

Schedules `func` to run after `ttl` milliseconds.

### parseCodePath / parseCodePathDetailed

Constructs formatted source-location strings for debugging.

#### `parseCodePath(context, entity): string`

- **context** -- description of the operation.
- **entity** -- function, class, string, or symbol whose name is extracted.
- Returns `"location: <path> @<entity>: <context>"`.

#### `parseCodePathDetailed(context, entity, options?): string`

Extended version with optional line number, ISO timestamp, and custom prefix.

| Option | Type | Description |
|--------|------|-------------|
| `includeLineNumber` | `boolean` | Append call-site line number |
| `includeTimestamp` | `boolean` | Append ISO 8601 timestamp |
| `customPrefix` | `string` | Replace default `"location"` prefix |

### Formatting (`@resq-sw/helpers/formatting`)

#### Date Formatting

| Function | Signature | Description |
|----------|-----------|-------------|
| `formatDate` | `(date: string \| Date, options?: DateFormatOptions) => string` | Formats a date with Intl.DateTimeFormat (UTC) |
| `formatDatePeriod` | `(start, end?, isCurrent?) => string` | Formats a date range (e.g. `"Jan 2023 - Present"`) |
| `formatDateTime` | `(date) => string` | Full date + time (e.g. `"January 15, 2023, 02:30 PM"`) |
| `formatDateOnly` | `(date) => string` | Date without time (e.g. `"January 15, 2023"`) |
| `formatMonthYear` | `(date) => string` | Short month + year (e.g. `"Jan 2023"`) |
| `formatRelativeTime` | `(date) => string` | Relative time (e.g. `"2 days ago"`, `"Just now"`) |

#### Number Formatting

| Function | Signature | Description |
|----------|-----------|-------------|
| `formatNumber` | `(num: number) => string` | Locale-formatted number (`1,234,567`) |
| `formatBytes` | `(bytes: number) => string` | Human-readable bytes (`1.5 MB`) |
| `formatPercent` | `(value: number) => string` | Percentage from decimal (`0.85` -> `"85.0%"`) |

#### String Formatting

| Function | Signature | Description |
|----------|-----------|-------------|
| `capitalize` | `(str: string) => string` | Capitalize first character |
| `truncate` | `(str: string, length: number) => string` | Truncate with `...` |
| `slugify` | `(str: string) => string` | URL-safe slug |

### Browser (`@resq-sw/helpers/browser`)

#### Platform Detection

| Function | Returns |
|----------|---------|
| `isIOS()` | `boolean` |
| `isAndroid()` | `boolean` |
| `isMacOS()` | `boolean` |
| `isWindows()` | `boolean` |
| `isChromeOS()` | `boolean` |
| `getPlatform()` | `"ios" \| "android" \| "macos" \| "chromeos" \| "windows" \| "unknown"` |
| `isTouchScreen()` | `boolean` |

#### Browser Detection

| Function | Returns |
|----------|---------|
| `getBrowser()` | `"edge" \| "chrome" \| "firefox" \| "safari" \| "opera" \| "android" \| "iphone" \| "unknown"` |
| `isChrome()` | `boolean` |
| `isFirefox()` | `boolean` |
| `isSafari()` | `boolean` |
| `isOpera()` | `boolean` |
| `isEdge()` | `boolean` |

Combo detectors: `isIOSSafari`, `isIOSChrome`, `isAndroidChrome`, `isMacOSChrome`, `isWindowsChrome`, `isIOSFirefox`, `isAndroidFirefox`, `isIOSEdge`, `isAndroidEdge`, `isMacOSEdge`, `isWindowsEdge`, `isIOSOpera`, `isAndroidOpera`.

#### HTML Entities

#### `obfuscateLink(opts): { href, encodedText }`

Encodes contact links (mailto/tel) as HTML character references for spam protection.

| Option | Type | Description |
|--------|------|-------------|
| `scheme` | `"mailto" \| "tel"` | URI scheme |
| `address` | `string` | Email or phone |
| `params` | `Record<string, string>` | Optional query params |
| `text` | `string` | Display text (defaults to address) |

```ts
const { href, encodedText } = obfuscateLink({
  scheme: "mailto",
  address: "jane@example.com",
  text: "Contact Jane",
});
```

## License

Apache-2.0
