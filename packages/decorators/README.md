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

# @resq-sw/decorators

> TypeScript method and class decorators for caching, rate limiting, control flow, and observability.

## Installation

```bash
bun add @resq-sw/decorators
```

Zero runtime dependencies.

## Quick Start

```ts
import { memoize, throttle, bind, debounce } from "@resq-sw/decorators";

class SearchService {
  @memoize()
  computeExpensive(n: number): number { return n * n; }

  @throttle(200)
  handleScroll(): void { /* at most once per 200ms */ }

  @debounce(300)
  onInput(query: string): void { /* fires after 300ms idle */ }

  @bind
  handleClick(): void { /* `this` always bound to instance */ }
}
```

## API Reference

### `@after(config)`

Executes a function after the decorated method completes.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `func` | `((data: { args, response }) => void) \| string` | required | Callback or method name on `this` |
| `wait` | `boolean` | `false` | Whether to await the original method before calling `func` |

```ts
class Service {
  @after({ func: ({ response }) => console.log(response), wait: true })
  async save(data: string) { return db.save(data); }
}
```

Also exported: `afterFn(method, config)` -- standalone wrapper function.

### `@before(config)`

Executes a function before the decorated method runs.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `func` | `(() => void) \| string` | required | Callback or method name on `this` |
| `wait` | `boolean` | `false` | Whether to await the before function |

```ts
class Service {
  @before({ func: 'validateState', wait: true })
  process() { /* runs after validateState */ }
}
```

Also exported: `beforeFn(method, config)`.

### `@bind`

Automatically binds a method to its class instance using lazy binding on first access.

```ts
class Component {
  @bind
  handleClick(): void { /* `this` is always correct */ }
}
const fn = new Component().handleClick; // safely detached
```

Also exported: `bindFn(method, context)`.

### `@debounce(delayMs)`

Debounces method calls -- only executes after `delayMs` of inactivity.

- **delayMs** (`number`) -- delay in milliseconds.

```ts
class Editor {
  @debounce(500)
  autoSave(content: string): void { localStorage.setItem("draft", content); }
}
```

Also exported: `debounceFn(method, delayMs)`.

### `@delay(delayMs)`

Delays method execution by `delayMs` milliseconds.

- **delayMs** (`number`) -- delay in milliseconds.

```ts
class Animator {
  @delay(1000)
  fadeOut(el: HTMLElement): void { el.style.opacity = "0"; }
}
```

Also exported: `delayFn(method, delayMs)`.

### `@delegate(keyResolver?)`

Deduplicates concurrent async method calls. Calls with the same key share a single promise.

- **keyResolver** (`(...args) => string`, optional) -- custom key function; defaults to `JSON.stringify(args)`.

```ts
class Api {
  @delegate((id: string) => id)
  async fetchUser(id: string): Promise<User> { return fetch(`/users/${id}`).then(r => r.json()); }
}
```

Also exported: `delegateFn(method, keyResolver?)`.

### `@execTime(arg?)`

Measures and reports method execution time. Supports both legacy and Stage 3 decorators.

- **arg** (`ReportFunction | string`, optional) -- custom reporter function, a label string, or a method name on `this`.

```ts
class Monitor {
  @execTime()
  processData(data: unknown[]): void { /* logs execution time */ }

  @execTime("DB Query")
  async query(): Promise<void> { /* logs "DB Query execution time: Xms" */ }

  @execTime((data) => metrics.record(data.execTime))
  compute(): void { /* custom reporter */ }
}
```

Also exported: `execTimeFn(method, arg?)`.

### `@selfExecute`

Class decorator that auto-instantiates the class on load.

```ts
@selfExecute
class Singleton {
  constructor() { console.log("Created"); }
}
// Instance created immediately when module loads
```

### `@memoize(configOrTTL?)`

Caches synchronous method results by arguments.

| Overload | Parameter | Description |
|----------|-----------|-------------|
| `@memoize()` | none | Cache indefinitely |
| `@memoize(60000)` | `number` | Cache with TTL in ms |
| `@memoize({ cache, keyResolver, expirationTimeMs })` | `MemoizeConfig` | Full config |

```ts
class Calc {
  @memoize(30000)
  fibonacci(n: number): number { return n <= 1 ? n : this.fibonacci(n-1) + this.fibonacci(n-2); }
}
```

Also exported: `memoizeFn(method, configOrTTL?)`.

### `@memoizeAsync(configOrTTL?)`

Caches async method results with promise deduplication. Same overloads as `@memoize`.

```ts
class Api {
  @memoizeAsync({ expirationTimeMs: 60000 })
  async getConfig(): Promise<Config> { return fetch("/config").then(r => r.json()); }
}
```

Also exported: `memoizeAsyncFn(method, configOrTTL?)`.

### `@observe` / `@observe(callback)`

Property decorator that watches assignments.

```ts
class State {
  @observe
  count: number = 0; // logs "setting property State#count = <value>"

  @observe((val: string) => analytics.track("name", val))
  name: string = "";
}
```

### `@rateLimit(config)`

Limits method calls to a fixed number within a time window.

| Option | Type | Description |
|--------|------|-------------|
| `timeSpanMs` | `number` | Time window in ms |
| `allowedCalls` | `number` | Max calls per window |
| `exceedHandler` | `() => void` | Called when limit exceeded |
| `keyResolver` | `(...args) => string` | Per-key limiting |
| `rateLimitCounter` | `RateLimitCounter` | Custom counter implementation |

```ts
class Api {
  @rateLimit({ timeSpanMs: 1000, allowedCalls: 5 })
  call(): void { /* max 5 per second */ }
}
```

Also exported: `rateLimitFn(method, config)`, `SimpleRateLimitCounter`.

### `@readonly()`

Makes a method non-writable (prevents reassignment).

```ts
class Secure {
  @readonly()
  getSecret(): string { return this.secret; }
}
```

### `@throttle(delayMs)`

Throttles method calls to at most once per `delayMs` milliseconds.

- **delayMs** (`number`) -- throttle interval.

```ts
class Scroll {
  @throttle(100)
  onScroll(): void { /* max once per 100ms */ }
}
```

Also exported: `throttleFn(method, delayMs)`.

### `@throttleAsync(parallelCalls?)`

Limits concurrent async method executions. Excess calls are queued.

- **parallelCalls** (`number`, default `1`) -- max concurrent executions.

```ts
class Processor {
  @throttleAsync(3)
  async process(item: Item): Promise<Result> { /* max 3 concurrent */ }
}
```

Also exported: `throttleAsyncFn(method, parallelCalls?)`, `ThrottleAsyncExecutor`.

## Types

All decorator types are exported: `Method`, `Decorator`, `AsyncMethod`, `AsyncDecorator`.

## License

Apache-2.0
