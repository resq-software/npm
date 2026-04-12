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

import { describe, expect, it } from 'vitest';
import { Duration, Effect, Layer, Schema } from 'effect';
import {
    HttpClient,
    HttpClientRequest,
    HttpClientResponse,
} from 'effect/unstable/http';
import {
    createApiResponseSchema,
    createPaginatedSchema,
    del,
    fetcher,
    FetcherError,
    FetcherValidationError,
    get,
    head,
    options as optionsHelper,
    patch,
    post,
    put,
} from '../src/fetcher.js';

/**
 * Creates a test HttpClient layer using the Effect 4 beta API.
 * `HttpClient.make` signature: (request, url, signal, fiber) => Effect
 */
const makeClient = (
  handler: (
    req: HttpClientRequest.HttpClientRequest,
  ) => Effect.Effect<HttpClientResponse.HttpClientResponse, unknown, never>,
) => {
  const client = HttpClient.make((req, _url, _signal, _fiber) => handler(req));
  return Layer.succeed(HttpClient.HttpClient, client);
};

// ------------------------------------------------------------------
// Schemas used across tests
// ------------------------------------------------------------------

const UserSchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
});
type User = typeof UserSchema.Type;

const ItemSchema = Schema.Struct({
  id: Schema.Number,
  title: Schema.String,
  active: Schema.Boolean,
});
type Item = typeof ItemSchema.Type;

// ------------------------------------------------------------------
// Error class tests
// ------------------------------------------------------------------

describe('FetcherError', () => {
  it('stores url, status, responseData, and attempt', () => {
    const error = new FetcherError('bad request', '/api/x', 400, { detail: 'oops' }, 2);
    expect(error.message).toBe('bad request');
    expect(error.url).toBe('/api/x');
    expect(error.status).toBe(400);
    expect(error.responseData).toEqual({ detail: 'oops' });
    expect(error.attempt).toBe(2);
    expect(error.name).toBe('FetcherError');
  });

  it('toString includes status and attempt', () => {
    const error = new FetcherError('not found', '/api/y', 404, undefined, 1);
    const str = error.toString();
    expect(str).toContain('FetcherError');
    expect(str).toContain('/api/y');
    expect(str).toContain('404');
    expect(str).toContain('Attempt: 1');
  });

  it('toString omits status/attempt when absent', () => {
    const error = new FetcherError('network', '/api/z');
    const str = error.toString();
    expect(str).toContain('/api/z');
    expect(str).not.toContain('Status');
    expect(str).not.toContain('Attempt');
  });

  it('is an instance of Error', () => {
    const error = new FetcherError('fail', '/');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('FetcherValidationError', () => {
  it('stores url, problems, responseData, and attempt', () => {
    const error = new FetcherValidationError('invalid', '/api', 'id: expected number', { id: 'x' }, 3);
    expect(error.message).toBe('invalid');
    expect(error.url).toBe('/api');
    expect(error.problems).toBe('id: expected number');
    expect(error.responseData).toEqual({ id: 'x' });
    expect(error.attempt).toBe(3);
    expect(error.name).toBe('FetcherValidationError');
  });

  it('toString includes url and optional attempt', () => {
    const error = new FetcherValidationError('bad schema', '/api/check', 'nope', null, 2);
    const str = error.toString();
    expect(str).toContain('FetcherValidationError');
    expect(str).toContain('/api/check');
    expect(str).toContain('Attempt: 2');
  });

  it('getProblemsString returns the problems field', () => {
    const error = new FetcherValidationError('fail', '/', 'problems-detail', null);
    expect(error.getProblemsString()).toBe('problems-detail');
  });

  it('is an instance of Error', () => {
    const error = new FetcherValidationError('fail', '/', '', null);
    expect(error).toBeInstanceOf(Error);
  });
});

// ------------------------------------------------------------------
// GET requests
// ------------------------------------------------------------------

describe('fetcher – GET', () => {
  it('makes a GET request and returns parsed JSON', async () => {
    const responseData = { id: 1, name: 'Test' };
    const clientLayer = makeClient((req) => {
      expect(req.method).toBe('GET');
      expect(req.url).toContain('/api/test');
      return Effect.succeed(
        HttpClientResponse.fromWeb(req, new Response(JSON.stringify(responseData), { status: 200 })),
      );
    });

    const result = await Effect.runPromise(Effect.provide(fetcher('/api/test'), clientLayer));
    expect(result).toEqual(responseData);
  });

  it('appends query parameters correctly', async () => {
    const params = { page: 1, sort: 'desc', active: true, tags: ['a', 'b'] };

    const clientLayer = makeClient((req) => {
      const url = new URL(req.url, 'http://localhost');
      expect(url.searchParams.get('page')).toBe('1');
      expect(url.searchParams.get('sort')).toBe('desc');
      expect(url.searchParams.get('active')).toBe('true');
      expect(url.searchParams.getAll('tags')).toEqual(['a', 'b']);
      return Effect.succeed(
        HttpClientResponse.fromWeb(req, new Response(JSON.stringify({}), { status: 200 })),
      );
    });

    await Effect.runPromise(Effect.provide(fetcher('/api/search', 'GET', {}, params), clientLayer));
  });

  it('skips null/undefined query params', async () => {
    const params = { present: 'yes', missing: undefined, gone: null };

    const clientLayer = makeClient((req) => {
      const url = new URL(req.url, 'http://localhost');
      expect(url.searchParams.get('present')).toBe('yes');
      expect(url.searchParams.has('missing')).toBe(false);
      expect(url.searchParams.has('gone')).toBe(false);
      return Effect.succeed(
        HttpClientResponse.fromWeb(req, new Response(JSON.stringify({}), { status: 200 })),
      );
    });

    await Effect.runPromise(Effect.provide(fetcher('/api/q', 'GET', {}, params), clientLayer));
  });

  it('validates response with Schema.Struct', async () => {
    const validData: User = { id: 1, name: 'Alice' };

    const clientLayer = makeClient((req) =>
      Effect.succeed(
        HttpClientResponse.fromWeb(req, new Response(JSON.stringify(validData), { status: 200 })),
      ),
    );

    const result: User = await Effect.runPromise(
      Effect.provide(fetcher('/api/user', 'GET', { schema: UserSchema }), clientLayer),
    );
    expect(result).toEqual(validData);
  });

  it('fails with FetcherValidationError for invalid schema data', async () => {
    const invalidData = { id: 'not-a-number', name: 'User' };

    const clientLayer = makeClient((req) =>
      Effect.succeed(
        HttpClientResponse.fromWeb(req, new Response(JSON.stringify(invalidData), { status: 200 })),
      ),
    );

    const program = fetcher('/api/user', 'GET', { schema: UserSchema });
    const error = await Effect.runPromise(Effect.flip(Effect.provide(program, clientLayer)));

    expect(error).toBeInstanceOf(FetcherValidationError);
    const validationError = error as FetcherValidationError;
    expect(validationError.url).toContain('/api/user');
    expect(validationError.responseData).toEqual(invalidData);
    expect(validationError.problems.length).toBeGreaterThan(0);
  });

  it('passes custom headers', async () => {
    const clientLayer = makeClient((req) => {
      // Effect 4 stores headers on the request object
      const headerRecord = req.headers as unknown as Record<string, string>;
      expect(headerRecord['x-custom']).toBe('value');
      return Effect.succeed(
        HttpClientResponse.fromWeb(req, new Response(JSON.stringify({}), { status: 200 })),
      );
    });

    await Effect.runPromise(
      Effect.provide(fetcher('/api/h', 'GET', { headers: { 'x-custom': 'value' } }), clientLayer),
    );
  });
});

// ------------------------------------------------------------------
// POST requests
// ------------------------------------------------------------------

describe('fetcher – POST', () => {
  it('sends a POST with JSON body', async () => {
    const requestBody = { title: 'New', active: true };
    const responseData: Item = { id: 1, title: 'New', active: true };

    const clientLayer = makeClient((req) => {
      expect(req.method).toBe('POST');
      expect(req.url).toContain('/api/items');
      return Effect.succeed(
        HttpClientResponse.fromWeb(req, new Response(JSON.stringify(responseData), { status: 201 })),
      );
    });

    const result = await Effect.runPromise(
      Effect.provide(post('/api/items', requestBody), clientLayer),
    );
    expect(result).toEqual(responseData);
  });

  it('sends a POST with text body', async () => {
    const clientLayer = makeClient((req) => {
      expect(req.method).toBe('POST');
      return Effect.succeed(
        HttpClientResponse.fromWeb(req, new Response(JSON.stringify({ ok: true }), { status: 200 })),
      );
    });

    const result = await Effect.runPromise(
      Effect.provide(fetcher('/api/text', 'POST', { bodyType: 'text' }, undefined, 'raw text'), clientLayer),
    );
    expect(result).toEqual({ ok: true });
  });
});

// ------------------------------------------------------------------
// PUT, PATCH, DELETE, OPTIONS, HEAD helpers
// ------------------------------------------------------------------

describe('HTTP method helpers', () => {
  it('put sends PUT method', async () => {
    const clientLayer = makeClient((req) => {
      expect(req.method).toBe('PUT');
      return Effect.succeed(
        HttpClientResponse.fromWeb(req, new Response(JSON.stringify({ updated: true }), { status: 200 })),
      );
    });

    const result = await Effect.runPromise(
      Effect.provide(put('/api/items/1', { title: 'Updated' }), clientLayer),
    );
    expect(result).toEqual({ updated: true });
  });

  it('patch sends PATCH method', async () => {
    const clientLayer = makeClient((req) => {
      expect(req.method).toBe('PATCH');
      return Effect.succeed(
        HttpClientResponse.fromWeb(req, new Response(JSON.stringify({ patched: true }), { status: 200 })),
      );
    });

    const result = await Effect.runPromise(
      Effect.provide(patch('/api/items/1', { active: false }), clientLayer),
    );
    expect(result).toEqual({ patched: true });
  });

  it('del sends DELETE method', async () => {
    const clientLayer = makeClient((req) => {
      expect(req.method).toBe('DELETE');
      return Effect.succeed(
        HttpClientResponse.fromWeb(req, new Response(JSON.stringify({ deleted: true }), { status: 200 })),
      );
    });

    const result = await Effect.runPromise(
      Effect.provide(del('/api/items/1'), clientLayer),
    );
    expect(result).toEqual({ deleted: true });
  });

  it('options sends OPTIONS method', async () => {
    const clientLayer = makeClient((req) => {
      expect(req.method).toBe('OPTIONS');
      return Effect.succeed(
        HttpClientResponse.fromWeb(req, new Response(JSON.stringify({ allowed: ['GET', 'POST'] }), { status: 200 })),
      );
    });

    const result = await Effect.runPromise(
      Effect.provide(optionsHelper('/api/items'), clientLayer),
    );
    expect(result).toEqual({ allowed: ['GET', 'POST'] });
  });

  it('head sends HEAD method', async () => {
    const clientLayer = makeClient((req) => {
      expect(req.method).toBe('HEAD');
      return Effect.succeed(
        HttpClientResponse.fromWeb(req, new Response(JSON.stringify({}), { status: 200 })),
      );
    });

    await Effect.runPromise(Effect.provide(head('/api/items'), clientLayer));
  });

  it('get helper returns typed result with schema', async () => {
    const validData: User = { id: 42, name: 'Bob' };
    const clientLayer = makeClient((req) =>
      Effect.succeed(
        HttpClientResponse.fromWeb(req, new Response(JSON.stringify(validData), { status: 200 })),
      ),
    );

    const result: User = await Effect.runPromise(
      Effect.provide(get('/api/user', { schema: UserSchema }), clientLayer),
    );
    expect(result.id).toBe(42);
    expect(result.name).toBe('Bob');
  });
});

// ------------------------------------------------------------------
// HTTP error handling
// ------------------------------------------------------------------

describe('fetcher – HTTP errors', () => {
  it('returns FetcherError on 404', async () => {
    const clientLayer = makeClient((req) =>
      Effect.succeed(
        HttpClientResponse.fromWeb(req, new Response('Not Found', { status: 404 })),
      ),
    );

    const error = await Effect.runPromise(Effect.flip(Effect.provide(fetcher('/api/missing'), clientLayer)));
    expect(error).toBeInstanceOf(FetcherError);
    const fetcherErr = error as FetcherError;
    expect(fetcherErr.status).toBe(404);
    expect(fetcherErr.url).toContain('/api/missing');
  });

  it('returns FetcherError on 500', async () => {
    const clientLayer = makeClient((req) =>
      Effect.succeed(
        HttpClientResponse.fromWeb(req, new Response(JSON.stringify({ error: 'server' }), { status: 500 })),
      ),
    );

    const error = await Effect.runPromise(Effect.flip(Effect.provide(fetcher('/api/error'), clientLayer)));
    expect(error).toBeInstanceOf(FetcherError);
    const fetcherErr = error as FetcherError;
    expect(fetcherErr.status).toBe(500);
  });

  it('returns FetcherError with rate limit message on 429', async () => {
    const clientLayer = makeClient((req) =>
      Effect.succeed(
        HttpClientResponse.fromWeb(req, new Response('Too Many', { status: 429 })),
      ),
    );

    const error = await Effect.runPromise(Effect.flip(Effect.provide(fetcher('/api/rate'), clientLayer)));
    expect(error).toBeInstanceOf(FetcherError);
    const fetcherErr = error as FetcherError;
    expect(fetcherErr.status).toBe(429);
    expect(fetcherErr.message).toContain('Rate limit exceeded');
  });

  it('returns FetcherError on network failure', async () => {
    const clientLayer = makeClient(() => Effect.fail(new Error('Connection refused')));

    const error = await Effect.runPromise(Effect.flip(Effect.provide(fetcher('/api/dead'), clientLayer)));
    expect(error).toBeInstanceOf(FetcherError);
    const fetcherErr = error as FetcherError;
    expect(fetcherErr.message).toContain('Connection refused');
    expect(fetcherErr.status).toBeUndefined();
  });
});

// ------------------------------------------------------------------
// Retry logic
// ------------------------------------------------------------------

describe('fetcher – retries', () => {
  it('retries on 503 and succeeds on second attempt', async () => {
    let attempts = 0;
    const clientLayer = makeClient((req) => {
      attempts++;
      if (attempts === 1) {
        return Effect.succeed(
          HttpClientResponse.fromWeb(req, new Response('Service Unavailable', { status: 503 })),
        );
      }
      return Effect.succeed(
        HttpClientResponse.fromWeb(req, new Response(JSON.stringify({ ok: true }), { status: 200 })),
      );
    });

    const result = await Effect.runPromise(
      Effect.provide(fetcher('/api/retry', 'GET', { retries: 1, retryDelay: 10 }), clientLayer),
    );
    expect(result).toEqual({ ok: true });
    expect(attempts).toBe(2);
  });

  it('does NOT retry on 400 (client error)', async () => {
    let attempts = 0;
    const clientLayer = makeClient((req) => {
      attempts++;
      return Effect.succeed(
        HttpClientResponse.fromWeb(req, new Response('Bad Request', { status: 400 })),
      );
    });

    const error = await Effect.runPromise(
      Effect.flip(Effect.provide(fetcher('/api/bad', 'GET', { retries: 2, retryDelay: 10 }), clientLayer)),
    );
    expect(error).toBeInstanceOf(FetcherError);
    expect(attempts).toBe(1);
  });

  it('does NOT retry on FetcherValidationError', async () => {
    let attempts = 0;
    const clientLayer = makeClient((req) => {
      attempts++;
      return Effect.succeed(
        HttpClientResponse.fromWeb(
          req,
          new Response(JSON.stringify({ id: 'invalid' }), { status: 200 }),
        ),
      );
    });

    const error = await Effect.runPromise(
      Effect.flip(
        Effect.provide(
          fetcher('/api/validate', 'GET', { retries: 2, retryDelay: 10, schema: UserSchema }),
          clientLayer,
        ),
      ),
    );
    expect(error).toBeInstanceOf(FetcherValidationError);
    expect(attempts).toBe(1);
  });

  it('retries on 429 (rate limit)', async () => {
    let attempts = 0;
    const clientLayer = makeClient((req) => {
      attempts++;
      if (attempts <= 2) {
        return Effect.succeed(
          HttpClientResponse.fromWeb(req, new Response('Rate Limited', { status: 429 })),
        );
      }
      return Effect.succeed(
        HttpClientResponse.fromWeb(req, new Response(JSON.stringify({ ok: true }), { status: 200 })),
      );
    });

    const result = await Effect.runPromise(
      Effect.provide(fetcher('/api/limited', 'GET', { retries: 3, retryDelay: 10 }), clientLayer),
    );
    expect(result).toEqual({ ok: true });
    expect(attempts).toBe(3);
  });
});

// ------------------------------------------------------------------
// Timeout
// ------------------------------------------------------------------

describe('fetcher – timeout', () => {
  it('fails with FetcherError when timeout is exceeded', async () => {
    const clientLayer = makeClient((req) =>
      Effect.delay(
        Effect.succeed(HttpClientResponse.fromWeb(req, new Response('ok', { status: 200 }))),
        Duration.millis(200),
      ),
    );

    const error = await Effect.runPromise(
      Effect.flip(Effect.provide(fetcher('/api/slow', 'GET', { timeout: 30 }), clientLayer)),
    );
    expect(error).toBeInstanceOf(FetcherError);
    const fetcherErr = error as FetcherError;
    expect(fetcherErr.message).toContain('Request timed out');
  });
});

// ------------------------------------------------------------------
// onError callback
// ------------------------------------------------------------------

describe('fetcher – onError callback', () => {
  it('invokes onError for HTTP errors', async () => {
    const errors: unknown[] = [];
    const clientLayer = makeClient((req) =>
      Effect.succeed(
        HttpClientResponse.fromWeb(req, new Response('Not Found', { status: 404 })),
      ),
    );

    await Effect.runPromise(
      Effect.flip(
        Effect.provide(
          fetcher('/api/missing', 'GET', { onError: (e) => errors.push(e) }),
          clientLayer,
        ),
      ),
    );
    expect(errors.length).toBe(1);
    expect(errors[0]).toBeInstanceOf(FetcherError);
  });

  it('invokes onError for validation errors', async () => {
    const errors: unknown[] = [];
    const clientLayer = makeClient((req) =>
      Effect.succeed(
        HttpClientResponse.fromWeb(
          req,
          new Response(JSON.stringify({ id: 'bad' }), { status: 200 }),
        ),
      ),
    );

    await Effect.runPromise(
      Effect.flip(
        Effect.provide(
          fetcher('/api/user', 'GET', { schema: UserSchema, onError: (e) => errors.push(e) }),
          clientLayer,
        ),
      ),
    );
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.some((e) => e instanceof FetcherValidationError)).toBe(true);
  });
});

// ------------------------------------------------------------------
// Schema helpers
// ------------------------------------------------------------------

describe('createPaginatedSchema', () => {
  it('validates a paginated response', () => {
    const PaginatedItems = createPaginatedSchema(ItemSchema);

    const valid = {
      data: [{ id: 1, title: 'A', active: true }],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    };

    const result = Schema.decodeUnknownExit(PaginatedItems)(valid);
    expect(result._tag).toBe('Success');
  });

  it('rejects invalid paginated data', () => {
    const PaginatedItems = createPaginatedSchema(ItemSchema);

    const invalid = {
      data: [{ id: 'bad', title: 'A', active: true }],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    };

    const result = Schema.decodeUnknownExit(PaginatedItems)(invalid);
    expect(result._tag).toBe('Failure');
  });
});

describe('createApiResponseSchema', () => {
  it('validates an API response envelope', () => {
    const ApiUser = createApiResponseSchema(UserSchema);

    const valid = {
      success: true,
      data: { id: 1, name: 'Alice' },
    };

    const result = Schema.decodeUnknownExit(ApiUser)(valid);
    expect(result._tag).toBe('Success');
  });

  it('rejects response with invalid data field', () => {
    const ApiUser = createApiResponseSchema(UserSchema);

    const invalid = {
      success: true,
      data: { id: 'wrong', name: 'Alice' },
    };

    const result = Schema.decodeUnknownExit(ApiUser)(invalid);
    expect(result._tag).toBe('Failure');
  });
});

// ------------------------------------------------------------------
// URL construction
// ------------------------------------------------------------------

describe('fetcher – URL construction', () => {
  it('uses absolute URL when input starts with http', async () => {
    const clientLayer = makeClient((req) => {
      expect(req.url).toBe('https://example.com/api/data');
      return Effect.succeed(
        HttpClientResponse.fromWeb(req, new Response(JSON.stringify({}), { status: 200 })),
      );
    });

    await Effect.runPromise(
      Effect.provide(fetcher('https://example.com/api/data'), clientLayer),
    );
  });

  it('appends query string to absolute URL', async () => {
    const clientLayer = makeClient((req) => {
      expect(req.url).toContain('https://example.com/api?key=val');
      return Effect.succeed(
        HttpClientResponse.fromWeb(req, new Response(JSON.stringify({}), { status: 200 })),
      );
    });

    await Effect.runPromise(
      Effect.provide(fetcher('https://example.com/api', 'GET', {}, { key: 'val' }), clientLayer),
    );
  });
});
