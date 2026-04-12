/**
 * Copyright 2026 ResQ
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

import { Cause, Duration, Effect, Exit, pipe, Schedule, Schema } from 'effect';
import { HttpClient, HttpClientError, HttpClientRequest, type HttpClientResponse } from 'effect/unstable/http';

/**
 * A Schema with DecodingServices constrained to `never`, allowing synchronous decoding.
 * All standard built-in schemas (e.g. `Schema.Struct(...)`) satisfy this constraint.
 */
type SyncSchema<T> = Schema.Schema<T> & { readonly DecodingServices: never };

/**
 * Configuration options for the fetcher utility.
 */
export interface FetcherOptions<T = unknown> {
  /** Number of times to retry the request on failure */
  retries?: number;
  /** Delay in milliseconds between retries */
  retryDelay?: number;
  /** Optional callback invoked on error */
  onError?: (error: unknown) => void;
  /** Timeout in milliseconds for the request */
  timeout?: number;
  /** Additional headers to include in the request */
  headers?: Record<string, string>;
  /** Effect/Schema for runtime validation of the response */
  schema?: SyncSchema<T>;
  /** Abortsignal */
  signal?: AbortSignal;
  /** Body type - defaults to 'json', use 'text' for raw data, 'form' for FormData */
  bodyType?: 'json' | 'text' | 'form';
}

/**
 * Represents all supported HTTP methods for the fetcher utility.
 */
export type HttpMethod = Schema.Schema.Type<typeof HttpMethod>;
/**
 * Represents a type-safe map of query parameters.
 * Each value can be a string, number, boolean, null, undefined, or an array of those types.
 */
export type QueryParams = Schema.Schema.Type<typeof QueryParams>;
/**
 * Represents a type-safe request body for HTTP methods that support a body.
 * Can be an object, array, string, number, boolean, or null.
 */
export type RequestBody = Schema.Schema.Type<typeof RequestBody>;
/**
 * Represents HTTP headers as key-value string pairs.
 */
export type Headers = Schema.Schema.Type<typeof Headers>;

const EMPTY = '';

const safeStringify = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

/**
 * Get the base URL for API requests.
 */
const getBaseURL = (): string => {
  if (globalThis.window !== undefined) {
    return '';
  }
  if (process.env['VITE_SITE_URL']) {
    return process.env['VITE_SITE_URL'].replace(/\/+$/, '');
  }
  if (process.env['SITE_URL']) {
    return process.env['SITE_URL'].replace(/\/+$/, '');
  }
  return 'http://localhost:5173';
};

// HTTP Method type definition
const HttpMethod = Schema.Literals(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']);
// Query parameters type definition
const QueryParams = Schema.Record(
  Schema.String,
  Schema.Union([
    Schema.String,
    Schema.Number,
    Schema.Boolean,
    Schema.Undefined,
    Schema.Null,
    Schema.Array(Schema.Union([Schema.String, Schema.Number, Schema.Boolean])),
  ]),
);
// Request body type definition
const RequestBody = Schema.Any;

// Headers type definition
const Headers = Schema.Record(Schema.String, Schema.String);

/**
 * Custom error class for validation-specific errors.
 */
export class FetcherValidationError extends Error {
  constructor(
    message: string,
    public readonly url: string,
    public readonly problems: string,
    public readonly responseData: unknown,
    public readonly attempt?: number,
  ) {
    super(message);
    this.name = 'FetcherValidationError';
    Object.setPrototypeOf(this, FetcherValidationError.prototype);
  }

  [Symbol.toStringTag] = 'FetcherValidationError';

  override toString(): string {
    const attemptStr = this.attempt ? `, Attempt: ${this.attempt}` : '';
    return `FetcherValidationError: ${this.message} (URL: ${this.url}${attemptStr})`;
  }

  getProblemsString(): string {
    return this.problems;
  }
}

/**
 * Custom error class for fetcher-specific errors.
 */
export class FetcherError extends Error {
  constructor(
    message: string,
    public readonly url: string,
    public readonly status?: number,
    public readonly responseData?: unknown,
    public readonly attempt?: number,
  ) {
    super(message);
    this.name = 'FetcherError';
    Object.setPrototypeOf(this, FetcherError.prototype);
  }

  [Symbol.toStringTag] = 'FetcherError';

  override toString(): string {
    const statusStr = this.status ? `, Status: ${this.status}` : '';
    const attemptStr = this.attempt ? `, Attempt: ${this.attempt}` : '';
    return `FetcherError: ${this.message} (URL: ${this.url}${statusStr}${attemptStr})`;
  }
}

/**
 * Builds a query string from the provided query parameters.
 */
const buildQueryString = (params?: QueryParams): string => {
  if (!params) return EMPTY;
  const urlParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value == null) return;

    if (Array.isArray(value)) {
      value
        .filter((item): item is string | number | boolean => item != null)
        .forEach((item) => {
          urlParams.append(key, String(item));
        });
    } else {
      urlParams.append(key, String(value));
    }
  });

  return urlParams.toString();
};

/**
 * Builds a type-safe HttpClientRequest for the given method and URL.
 */
const buildRequest = (method: HttpMethod, url: string): HttpClientRequest.HttpClientRequest => {
  switch (method) {
    case 'GET':
      return HttpClientRequest.get(url);
    case 'POST':
      return HttpClientRequest.post(url);
    case 'PUT':
      return HttpClientRequest.put(url);
    case 'PATCH':
      return HttpClientRequest.patch(url);
    case 'DELETE':
      return HttpClientRequest.delete(url);
    case 'OPTIONS':
      return HttpClientRequest.options(url);
    case 'HEAD':
      return HttpClientRequest.head(url);
  }
};

/**
 * Validates response data using the provided Effect schema.
 */
const validateResponse = <T>(
  data: unknown,
  attempt: number,
  url: string,
  schema?: SyncSchema<T>,
  onError?: (error: unknown) => void,
): Effect.Effect<T, FetcherValidationError, never> => {
  if (!schema) {
    return Effect.succeed(data as T);
  }

  const result = Schema.decodeUnknownExit(schema as any)(data);

  if (Exit.isFailure(result)) {
    const schemaError = Cause.squash(result.cause);
    const problems = schemaError instanceof Error ? schemaError.message : String(schemaError);
    const validationError = new FetcherValidationError(
      'Response validation failed',
      url,
      problems,
      data,
      attempt,
    );

    if (onError) onError(validationError);
    return Effect.fail(validationError);
  }

  return Effect.succeed(result.value as T);
};

/**
 * Wraps an Effect with a timeout, converting timeout errors to FetcherError.
 */
const withTimeout = <A, E, R>(
  eff: Effect.Effect<A, E, R>,
  timeout: number,
  url: string,
  attempt: number,
): Effect.Effect<A, FetcherError | E, R> =>
  Effect.timeoutOrElse(eff, {
    duration: Duration.millis(timeout),
    orElse: () => Effect.fail(new FetcherError('Request timed out', url, undefined, undefined, attempt)),
  });

/**
 * Type guard: narrows unknown to FetcherError.
 */
const isFetcherError = (error: unknown): error is FetcherError => error instanceof FetcherError;

/**
 * Type guard: narrows unknown to FetcherValidationError.
 */
const isFetcherValidationError = (error: unknown): error is FetcherValidationError =>
  error instanceof FetcherValidationError;

/**
 * Creates a retry schedule with exponential backoff and error filtering.
 */
const createRetrySchedule = (retries: number, retryDelay: number) =>
  pipe(
    Schedule.exponential(Duration.millis(retryDelay)),
    Schedule.both(Schedule.recurs(retries)),
    Schedule.while((metadata) => {
      const error: unknown = metadata.input;
      // Don't retry validation errors or client errors (except 429)
      if (isFetcherValidationError(error)) return Effect.succeed(false);
      if (isFetcherError(error) && error.status) {
        if (error.status === 429) return Effect.succeed(true); // Always retry 429 rate limits
        if (error.status >= 400 && error.status < 500) return Effect.succeed(false); // Don't retry other 4xx
      }
      return Effect.succeed(true);
    }),
  );

/**
 * Parses the response, handling HTTP errors and JSON parsing.
 */
const parseResponse = (
  response: HttpClientResponse.HttpClientResponse,
  url: string,
  attempt: number,
): Effect.Effect<unknown, FetcherError, never> => {
  // Check for HTTP errors (non-2xx status codes)
  if (response.status < 200 || response.status >= 300) {
    return pipe(
      response.json,
      Effect.catch(() => Effect.succeed(undefined as unknown)),
      Effect.flatMap((errorData) =>
        pipe(
          response.text,
          Effect.catch(() => Effect.succeed('Request failed')),
          Effect.flatMap((errorText) => {
            const errorMessage =
              response.status === 429
                ? `Rate limit exceeded (429). Please slow down requests to ${url}`
                : `HTTP ${response.status}: ${errorText}`;
            return Effect.fail(
              new FetcherError(errorMessage, url, response.status, errorData, attempt),
            );
          }),
        ),
      ),
    );
  }

  // Parse response data as JSON, with fallback to text and detailed error reporting
  return pipe(
    response.json,
    Effect.catch((error: HttpClientError.HttpClientError) =>
      pipe(
        response.text,
        Effect.flatMap((text: string) => {
          const errorMessage = `Failed to parse JSON response. Status: ${response.status}, Content-Type: ${response.headers['Content-Type'] || 'unknown'}, Body: ${text.slice(0, 200)}${text.length > 200 ? '...' : ''}`;
          return Effect.fail(
            new FetcherError(
              errorMessage,
              url,
              response.status,
              { originalError: error, responseText: text },
              attempt,
            ),
          );
        }),
        Effect.catch(() =>
          Effect.fail(
            new FetcherError(
              `Failed to parse response: ${error.message}`,
              url,
              response.status,
              undefined,
              attempt,
            ),
          ),
        ),
      ),
    ),
  );
};

// --- Overloaded function signatures for type safety with effect/Schema ---

export function fetcher<T = unknown>(
  input: string,
  method?: 'GET',
  options?: FetcherOptions<T>,
  params?: QueryParams,
): Effect.Effect<T, FetcherError | FetcherValidationError, HttpClient.HttpClient>;

export function fetcher<S extends SyncSchema<Schema.Schema.Type<S>>>(
  input: string,
  method: 'GET',
  options: FetcherOptions<Schema.Schema.Type<S>> & { schema: S },
  params?: QueryParams,
): Effect.Effect<Schema.Schema.Type<S>, FetcherError | FetcherValidationError, HttpClient.HttpClient>;

export function fetcher<T = unknown>(
  input: string,
  method: 'POST' | 'PUT' | 'PATCH',
  options?: FetcherOptions<T>,
  params?: QueryParams,
  body?: RequestBody,
): Effect.Effect<T, FetcherError | FetcherValidationError, HttpClient.HttpClient>;

export function fetcher<S extends SyncSchema<Schema.Schema.Type<S>>>(
  input: string,
  method: 'POST' | 'PUT' | 'PATCH',
  options: FetcherOptions<Schema.Schema.Type<S>> & { schema: S },
  params?: QueryParams,
  body?: RequestBody,
): Effect.Effect<Schema.Schema.Type<S>, FetcherError | FetcherValidationError, HttpClient.HttpClient>;

export function fetcher<T = unknown>(
  input: string,
  method: 'DELETE' | 'OPTIONS' | 'HEAD',
  options?: FetcherOptions<T>,
  params?: QueryParams,
): Effect.Effect<T, FetcherError | FetcherValidationError, HttpClient.HttpClient>;

export function fetcher<T = unknown>(
  input: string,
  method: HttpMethod = 'GET',
  options: FetcherOptions<T> = {},
  params?: QueryParams,
  body?: RequestBody,
): Effect.Effect<T, FetcherError | FetcherValidationError, HttpClient.HttpClient> {
  const {
    retries = 0,
    retryDelay = 1_000,
    onError,
    timeout = 10_000,
    headers = {},
    schema,
    bodyType = 'json',
  } = options;

  const queryString = buildQueryString(params);

  let url: string;
  if (input.startsWith('http')) {
    url = queryString ? `${input}?${queryString}` : input;
  } else {
    const baseURL = getBaseURL();
    const fullPath = baseURL ? `${baseURL}${input}` : input;
    url = queryString ? `${fullPath}?${queryString}` : fullPath;
  }

  return Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    let attempt = 0;

    let req = buildRequest(method, url);

    if (body != null && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      if (bodyType === 'form' || body instanceof FormData) {
        req = HttpClientRequest.bodyFormData(body as FormData)(req);
      } else if (bodyType === 'text') {
        const textBody =
          typeof body === 'object' ? JSON.stringify(body) : String(body);
        req = HttpClientRequest.bodyText(textBody)(req);
      } else {
        req = yield* pipe(
          HttpClientRequest.bodyJson(body)(req),
          Effect.mapError(
            (error: unknown) =>
              new FetcherError(
                `Failed to serialize request body: ${safeStringify(error)}`,
                url,
                undefined,
                undefined,
                attempt,
              ),
          ),
        );
      }
    }

    req = HttpClientRequest.setHeaders(headers)(req);

    const retrySchedule = createRetrySchedule(retries, retryDelay);

    const executeRequest: Effect.Effect<T, FetcherError | FetcherValidationError, never> =
      Effect.gen(function* () {
        attempt++;

        const response = yield* pipe(
          client.execute(req),
          (eff) => withTimeout(eff, timeout, url, attempt),
          Effect.mapError((error): FetcherError => {
            if (error instanceof FetcherError) return error;

            return new FetcherError(
              error instanceof Error ? error.message : String(error),
              url,
              undefined,
              undefined,
              attempt,
            );
          }),
        );

        const rawData: unknown = yield* parseResponse(response, url, attempt);

        const validatedData: T = yield* validateResponse(rawData, attempt, url, schema, onError);

        return validatedData;
      });

    return yield* pipe(
      executeRequest,
      Effect.retry(retrySchedule),
      Effect.catch(
        (error: FetcherError | FetcherValidationError): Effect.Effect<never, FetcherError | FetcherValidationError> => {
          if (onError) onError(error);
          return Effect.fail(error);
        },
      ),
    );
  });
}

export function get<T = unknown>(
  url: string,
  options?: FetcherOptions<T>,
  params?: QueryParams,
): Effect.Effect<T, FetcherError | FetcherValidationError, HttpClient.HttpClient>;

export function get<A>(
  url: string,
  options: FetcherOptions<A> & { schema: Schema.Schema<A> },
  params?: QueryParams,
): Effect.Effect<A, FetcherError | FetcherValidationError, HttpClient.HttpClient>;

export function get<T = unknown>(url: string, options?: FetcherOptions<T>, params?: QueryParams) {
  return fetcher<T>(url, 'GET', options, params);
}

export function post<T = unknown>(
  url: string,
  body?: RequestBody,
  options?: FetcherOptions<T>,
  params?: QueryParams,
): Effect.Effect<T, FetcherError | FetcherValidationError, HttpClient.HttpClient>;

export function post<S extends SyncSchema<Schema.Schema.Type<S>>>(
  url: string,
  body: RequestBody,
  options: FetcherOptions<Schema.Schema.Type<S>> & { schema: S },
  params?: QueryParams,
): Effect.Effect<Schema.Schema.Type<S>, FetcherError | FetcherValidationError, HttpClient.HttpClient>;

export function post<T = unknown>(
  url: string,
  body?: RequestBody,
  options?: FetcherOptions<T>,
  params?: QueryParams,
) {
  return fetcher<T>(url, 'POST', options, params, body);
}

export function put<T = unknown>(
  url: string,
  body?: RequestBody,
  options?: FetcherOptions<T>,
  params?: QueryParams,
): Effect.Effect<T, FetcherError | FetcherValidationError, HttpClient.HttpClient>;

export function put<S extends SyncSchema<Schema.Schema.Type<S>>>(
  url: string,
  body: RequestBody,
  options: FetcherOptions<Schema.Schema.Type<S>> & { schema: S },
  params?: QueryParams,
): Effect.Effect<Schema.Schema.Type<S>, FetcherError | FetcherValidationError, HttpClient.HttpClient>;

export function put<T = unknown>(
  url: string,
  body?: RequestBody,
  options?: FetcherOptions<T>,
  params?: QueryParams,
) {
  return fetcher<T>(url, 'PUT', options, params, body);
}

export function patch<T = unknown>(
  url: string,
  body?: RequestBody,
  options?: FetcherOptions<T>,
  params?: QueryParams,
): Effect.Effect<T, FetcherError | FetcherValidationError, HttpClient.HttpClient>;

export function patch<S extends SyncSchema<Schema.Schema.Type<S>>>(
  url: string,
  body: RequestBody,
  options: FetcherOptions<Schema.Schema.Type<S>> & { schema: S },
  params?: QueryParams,
): Effect.Effect<Schema.Schema.Type<S>, FetcherError | FetcherValidationError, HttpClient.HttpClient>;

export function patch<T = unknown>(
  url: string,
  body?: RequestBody,
  options?: FetcherOptions<T>,
  params?: QueryParams,
) {
  return fetcher<T>(url, 'PATCH', options, params, body);
}

export function del<T = unknown>(
  url: string,
  options?: FetcherOptions<T>,
  params?: QueryParams,
): Effect.Effect<T, FetcherError | FetcherValidationError, HttpClient.HttpClient>;

export function del<S extends SyncSchema<Schema.Schema.Type<S>>>(
  url: string,
  options: FetcherOptions<Schema.Schema.Type<S>> & { schema: S },
  params?: QueryParams,
): Effect.Effect<Schema.Schema.Type<S>, FetcherError | FetcherValidationError, HttpClient.HttpClient>;

export function del<T = unknown>(url: string, options?: FetcherOptions<T>, params?: QueryParams) {
  return fetcher<T>(url, 'DELETE', options, params);
}

export function options<T = unknown>(
  url: string,
  options?: FetcherOptions<T>,
  params?: QueryParams,
): Effect.Effect<T, FetcherError | FetcherValidationError, HttpClient.HttpClient>;

export function options<S extends SyncSchema<Schema.Schema.Type<S>>>(
  url: string,
  options: FetcherOptions<Schema.Schema.Type<S>> & { schema: S },
  params?: QueryParams,
): Effect.Effect<Schema.Schema.Type<S>, FetcherError | FetcherValidationError, HttpClient.HttpClient>;

export function options<T = unknown>(
  url: string,
  options?: FetcherOptions<T>,
  params?: QueryParams,
) {
  return fetcher<T>(url, 'OPTIONS', options, params);
}

export function head<T = unknown>(
  url: string,
  options?: FetcherOptions<T>,
  params?: QueryParams,
): Effect.Effect<T, FetcherError | FetcherValidationError, HttpClient.HttpClient>;

export function head<S extends SyncSchema<Schema.Schema.Type<S>>>(
  url: string,
  options: FetcherOptions<Schema.Schema.Type<S>> & { schema: S },
  params?: QueryParams,
): Effect.Effect<Schema.Schema.Type<S>, FetcherError | FetcherValidationError, HttpClient.HttpClient>;

export function head<T = unknown>(url: string, options?: FetcherOptions<T>, params?: QueryParams) {
  return fetcher<T>(url, 'HEAD', options, params);
}

export const createPaginatedSchema = <T>(itemSchema: Schema.Schema<T>) => {
  return Schema.Struct({
    data: Schema.Array(itemSchema),
    pagination: Schema.Struct({
      page: Schema.Number,
      pageSize: Schema.Number,
      total: Schema.Number,
      totalPages: Schema.Number,
    }),
  });
};

export const createApiResponseSchema = <T>(dataSchema: Schema.Schema<T>) => {
  return Schema.Struct({
    success: Schema.Boolean,
    data: dataSchema,
    message: Schema.optional(Schema.String),
    errors: Schema.optional(Schema.Array(Schema.String)),
  });
};
