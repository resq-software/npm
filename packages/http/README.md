# @resq-sw/http

> Effect-based HTTP client with retry, timeout, schema validation, and security middleware.

## Installation

```bash
bun add @resq-sw/http effect
```

Peer dependency: `effect`.

## Quick Start

```ts
import { get, post } from "@resq-sw/http";
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
| `bodyType` | `"json" \| "text" \| "form"` | `"json"` | Request body encoding |

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

#### `getRequestId(existingId?): string`

Returns the existing request ID or generates a new UUID.

```ts
const reqId = getRequestId(headers["x-request-id"]);
```

## License

Apache-2.0
