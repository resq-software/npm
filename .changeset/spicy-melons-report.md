<!--
  Copyright 2026 ResQ

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

---
"@resq-systems/decorators": minor
---

Fix decorator signature preservation and execTime return value

- `@execTime` / `execTimeFn` now return the wrapped method's original value and
  stay synchronous for synchronous methods. Previously the wrapper returned
  `Promise<void>`, discarding the result and forcing every decorated method to
  become async — so downstream callers that consume the return value (e.g.
  passing the result into `Array.prototype.filter`) silently received a promise
  instead of their data. Async methods still report timing after they settle and
  now forward the resolved value.
- `@memoize`, `@memoizeAsync`, `@rateLimit`, and `@bind` now return the
  signature-preserving `Decorator<T>` / `AsyncDecorator<T>` shape instead of a
  `Method<D>`-erased descriptor. Applying them to concretely-typed methods under
  strict `strictFunctionTypes` no longer fails to type-check with TS1241 /
  TS1270 at the decoration site.
- Deprecate the now-superseded `Memoizable`, `AsyncMemoizable`, and
  `RateLimitable` types in favor of `Decorator` / `AsyncDecorator`. They remain
  exported for back-compat.
