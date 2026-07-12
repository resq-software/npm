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

# @resq-systems/http

[![npm](https://img.shields.io/npm/v/%40resq-systems%2Fhttp?style=flat-square)](https://www.npmjs.com/package/@resq-systems/http)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)](../../LICENSE.md)

> Effect-based HTTP client with retry, timeout, schema validation, and security middleware.

## Installation

```bash
bun add @resq-systems/http effect
```

Peer dependency: `effect`.

## Quick Start

```ts
import { get, post } from "@resq-systems/http";
import { Effect } from "effect";
import { HttpClient } from "effect/unstable/http";

const program = Effect.gen(function* () {
  const users = yield* get<User[]>("/api/users");
  const created = yield* post<User>("/api/users", { name: "Alice" });
  return { users, created };
});

// Run with the default HTTP client
Effect.runPromise(program.pipe(Effect.provide(HttpClient.layer)));
```

## API Reference

### `fetcher(url, method?, options?, params?, body?)`

Core HTTP function. All convenience methods delegate to this.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | `string` | required | URL path or absolute URL |
| `method` | `HttpMethod` | `"GET"` | HTTP method |
| `options` | `FetcherOptions<T>` | `{}` | Request options |
| `params` | `QueryParams` | -- | Query parameters |
| `body` | `RequestBody` | -- | Request body (POST/PUT/PATCH only) |

Returns `Effect.Effect<T, FetcherError | FetcherValidationError, HttpClient.HttpClient>`.

URL resolution: absolute URLs are used as-is; relative paths are prefixed with `VITE_SITE_URL`, `SITE_URL`, or `http://localhost:5173`.

### FetcherOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `retries` | `number` | `0` | Retry count on failure |
| `retryDelay` | `number` | `1000` | Base delay between retries (exponential backoff) |
| `timeout` | `number` | `10000` | Request timeout in ms |
| `headers` | `Record<string, string>` | `{}` | Additional request headers |
| `schema` | `Schema.Schema<T>` | -- | Effect Schema for response validation |
| `onError` | `(error: unknown) => void` | -- | Error callback |
| `signal` | `AbortSignal` | -- | Abort signal |
| `bodyType` | `"json" \| "text" \| "form"` | `"json"` | Request body encoding. `"form"` requires a `FormData` body (fails fast otherwise) |
| `allowedHosts` | `readonly HostPattern[]` | -- | SSRF allow-list. When set, absolute-URL requests to any other host fail with `FetcherError` |
| `blockedHosts` | `readonly HostPattern[]` | -- | SSRF block-list. Absolute-URL requests to a matching host fail with `FetcherError` |

The exported `HostPattern` type (`` Lowercase<string> | `*.${string}` ``) documents the two supported shapes: an exact hostname (`"api.example.com"`) or a wildcard-subdomain pattern (`` `*.example.com` ``, which matches the apex and any subdomain). Matching is case-insensitive at runtime. These filters apply only to **absolute** URLs — relative paths join to the trusted base URL, so `fetcher("/api/...")` is never blocked. This is basic hostname filtering, not full SSRF defence against DNS rebinding or alternate IP encodings.

### Retry Behavior

- Uses exponential backoff starting from `retryDelay`.
- **Always retries**: 429 (rate limit), 5xx, network errors, timeouts.
- **Never retries**: validation errors, 4xx (except 429).

### Convenience Methods

All return `Effect.Effect<T, FetcherError | FetcherValidationError, HttpClient.HttpClient>`.

| Function | Signature |
|----------|-----------|
| `get` | `(url, options?, params?) => Effect` |
| `post` | `(url, body?, options?, params?) => Effect` |
| `put` | `(url, body?, options?, params?) => Effect` |
| `patch` | `(url, body?, options?, params?) => Effect` |
| `del` | `(url, options?, params?) => Effect` |
| `options` | `(url, options?, params?) => Effect` |
| `head` | `(url, options?, params?) => Effect` |

All methods support schema overloads for compile-time type safety:

```ts
import { Schema } from "effect";

const UserSchema = Schema.Struct({ id: Schema.Number, name: Schema.String });

const user = get("/api/users/1", { schema: UserSchema });
// Type: Effect<{ id: number; name: string }, ...>
```

### Schema Helpers

#### `createPaginatedSchema(itemSchema)`

Creates a schema for paginated API responses.

```ts
const PagedUsers = createPaginatedSchema(UserSchema);
// { data: User[], pagination: { page, pageSize, total, totalPages } }
```

#### `createApiResponseSchema(dataSchema)`

Creates a schema for standard API responses.

```ts
const ApiUser = createApiResponseSchema(UserSchema);
// { success: boolean, data: User, message?: string, errors?: string[] }
```

### Error Types

#### `FetcherError`

Thrown on network errors, timeouts, and non-2xx responses.

| Property | Type | Description |
|----------|------|-------------|
| `message` | `string` | Error description |
| `url` | `string` | Request URL |
| `status` | `number?` | HTTP status code |
| `responseData` | `unknown?` | Response body if available |
| `attempt` | `number?` | Retry attempt number |

#### `FetcherValidationError`

Thrown when response data fails schema validation.

| Property | Type | Description |
|----------|------|-------------|
| `message` | `string` | Error description |
| `url` | `string` | Request URL |
| `problems` | `string` | Schema validation errors |
| `responseData` | `unknown` | Raw response data |
| `attempt` | `number?` | Retry attempt number |

### Security Utilities

#### `shouldRedirectToHttps(protocol, url, headers, nodeEnv?): string | null`

Checks if a request should be redirected to HTTPS. Handles proxy headers (`x-forwarded-proto`, `x-forwarded-ssl`). Returns the HTTPS URL or `null`.

- Skipped in `development` and `test` environments.

```ts
const redirect = shouldRedirectToHttps("http", req.url, req.headers);
if (redirect) return Response.redirect(redirect, 301);
```

#### `getRequestId(existingId?): RequestId`

Resolves the per-request correlation ID: sanitizes a caller-supplied value (via `sanitizeRequestId`) or mints a fresh UUID v4. Returns a branded `RequestId` — a plain `string` is not assignable, so an unsanitized header value cannot be logged as a request ID by accident.

```ts
const reqId = getRequestId(headers["x-request-id"]);
res.headers.set("x-request-id", reqId);
```

#### `sanitizeRequestId(raw): RequestId`

The only safe minting path for an untrusted correlation ID. Strips every character outside `[A-Za-z0-9_-]` (defeating CRLF/log injection and header smuggling) and truncates to 200 chars. When no usable characters remain, mints a fresh UUID v4 instead.

#### `isRequestId(value): value is RequestId`

Type guard that narrows a `string` to `RequestId` when it already consists solely of the safe charset and is within the length bound.

The `RequestId` type is exported for annotating values threaded through logs, response headers, and downstream hops.

## Prerequisites

- **Runtime**: Bun 1.1+ or Node.js 20+
- **Peer Dependencies**: `effect` (v4.0.0-beta.93+)

## Configuration

- **Effect Configuration**: Client instances are constructed through standard Effect Layers.

## Testing

```sh
bun --filter @resq-systems/http test
```

## Troubleshooting

- **Effect Version Mismatch**: Ensure your root project resolves to `effect: 4.0.0-beta.93` using overrides to prevent duplicate effect typings.


## License

Apache-2.0
