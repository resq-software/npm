# @resq-sw/rate-limiting

> Rate limiting algorithms, throttle/debounce utilities, and distributed rate limit stores.

## Installation

```bash
bun add @resq-sw/rate-limiting effect
```

Optional peer dependencies for Redis-backed limiting:

```bash
bun add @upstash/ratelimit @upstash/redis
```

## Quick Start

```ts
import { throttle, debounce, TokenBucketLimiter } from "@resq-sw/rate-limiting";

const save = throttle(() => persist(data), 1000);
const search = debounce((q: string) => fetchResults(q), 300);

const limiter = new TokenBucketLimiter(5, 60000); // 5 per minute
await limiter.acquire();
```

## API Reference

### `throttle(func, wait, options?)`

Limits function execution to at most once per `wait` milliseconds.

- **func** (`T extends (...args) => unknown`) -- function to throttle.
- **wait** (`number`) -- interval in ms.
- **options** (`ThrottleOptions`) -- see below.
- Returns the throttled function with a `.cancel()` method.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `leading` | `boolean` | `true` | Call on leading edge |
| `trailing` | `boolean` | `true` | Call on trailing edge |

```ts
const fn = throttle(handleScroll, 200, { trailing: false });
fn(); // executes immediately
fn(); // ignored
fn.cancel(); // cancel pending trailing call
```

### `debounce(func, wait, options?)`

Delays function execution until `wait` ms after the last call.

- **func** (`T extends (...args) => unknown`) -- function to debounce.
- **wait** (`number`) -- delay in ms.
- **options** (`DebounceOptions`) -- see below.
- Returns the debounced function with `.cancel()` and `.flush()` methods.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `leading` | `boolean` | `false` | Call on leading edge |
| `maxWait` | `number` | -- | Maximum time before forced execution |

```ts
const search = debounce(fetchResults, 300, { maxWait: 1000 });
search("a"); search("ab"); search("abc");
// Executes after 300ms idle, or forced after 1000ms
search.flush(); // execute immediately
search.cancel(); // cancel pending
```

### `KeyedThrottle<T>`

Per-key throttle manager. Each key gets its own independent throttle.

```ts
const perUser = new KeyedThrottle(handleRequest, 1000);
perUser.execute("user:123", requestData);  // throttled per user
perUser.cancel("user:123");                // cancel specific key
perUser.cancelAll();                       // cancel all keys
perUser.getStats();                        // { activeKeys: number, keys: string[] }
```

### `KeyedDebounce<T>`

Per-key debounce manager. Each key gets its own independent debounce.

```ts
const perField = new KeyedDebounce(validate, 300);
perField.execute("email", value);   // debounced per field
perField.flush("email");            // execute immediately
perField.cancel("email");           // cancel specific key
perField.cancelAll();               // cancel all keys
perField.getStats();                // { activeKeys, keys }
```

### `TokenBucketLimiter`

Token bucket algorithm -- tokens refill over time.

```ts
const limiter = new TokenBucketLimiter(capacity, windowMs);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `capacity` | `number` | Max tokens (burst size) |
| `windowMs` | `number` | Refill window in ms |

| Method | Returns | Description |
|--------|---------|-------------|
| `acquire()` | `Promise<void>` | Wait for a token (blocks if empty) |
| `tryAcquire()` | `boolean` | Try to get a token without waiting |
| `getStats()` | `RateLimiterStats` | `{ availableTokens, queueSize, capacity }` |
| `reset()` | `void` | Reset to full capacity |

```ts
const limiter = new TokenBucketLimiter(10, 60000); // 10 req/min
if (limiter.tryAcquire()) {
  await handleRequest();
} else {
  return new Response("Too Many Requests", { status: 429 });
}
```

### `LeakyBucketLimiter`

Leaky bucket algorithm -- requests drain at a constant rate for smoother limiting.

```ts
const limiter = new LeakyBucketLimiter(capacity, requestsPerSecond);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `capacity` | `number` | Max queue size |
| `requestsPerSecond` | `number` | Drain rate |

| Method | Returns | Description |
|--------|---------|-------------|
| `acquire()` | `Promise<void>` | Queue a request (throws if queue full) |
| `tryAcquire()` | `boolean` | Check if immediate processing is possible |
| `getStats()` | `RateLimiterStats` | `{ availableTokens, queueSize, capacity }` |
| `reset()` | `void` | Clear the queue |

```ts
const limiter = new LeakyBucketLimiter(100, 10); // 100 queue, 10 req/sec
try {
  await limiter.acquire();
  await processRequest();
} catch (e) {
  // "Rate limit exceeded: queue full"
}
```

### `SlidingWindowCounter`

Sliding window counter for accurate per-key rate limiting.

```ts
const counter = new SlidingWindowCounter(windowMs, maxRequests);
```

| Method | Returns | Description |
|--------|---------|-------------|
| `check(key)` | `{ allowed, remaining, resetAt }` | Check and increment counter |
| `reset(key)` | `void` | Reset counter for a key |
| `getStats()` | `KeyedStats` | `{ activeKeys, keys }` |

```ts
const counter = new SlidingWindowCounter(60000, 100); // 100 per minute
const { allowed, remaining, resetAt } = counter.check("user:123");
if (!allowed) {
  return new Response("Rate limited", {
    status: 429,
    headers: { "X-RateLimit-Remaining": String(remaining), "X-RateLimit-Reset": String(resetAt) },
  });
}
```

### Rate Limit Stores

#### `MemoryRateLimitStore`

In-memory store implementing `IRateLimitStore`. Suitable for single-process applications.

```ts
const store = new MemoryRateLimitStore();
const result = await store.check("key", windowMs, maxRequests);
// { limited, remaining, resetTime, total }
```

#### `RedisRateLimitStore`

Redis-backed store using `@upstash/ratelimit` with sliding window algorithm.

```ts
import { Redis } from "@upstash/redis";
const store = new RedisRateLimitStore(new Redis({ url: "...", token: "..." }));
const result = await store.check("key", 60000, 100);
```

### Presets

```ts
import { RATE_LIMIT_PRESETS } from "@resq-sw/rate-limiting";
```

| Preset | Window | Max Requests |
|--------|--------|-------------|
| `auth` | 15 min | 5 |
| `api` | 1 min | 100 |
| `read` | 1 min | 200 |
| `upload` | 1 hour | 20 |

### Effect Schemas

Exported for runtime validation: `ThrottleOptionsSchema`, `DebounceOptionsSchema`, `RateLimiterStatsSchema`, `KeyedStatsSchema`, `RateLimitConfigSchema`, `RateLimitCheckResultSchema`.

## License

Apache-2.0
