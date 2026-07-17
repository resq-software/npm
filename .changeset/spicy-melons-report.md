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

Fix `@execTime`/`execTimeFn` to return the wrapped method's value and stay synchronous for sync methods (was returning `Promise<void>`), and make `@memoize`/`@memoizeAsync`/`@rateLimit`/`@bind` return signature-preserving `Decorator`/`AsyncDecorator` so decorating concretely-typed methods no longer fails under strict `strictFunctionTypes` (TS1241/TS1270); deprecate `Memoizable`/`AsyncMemoizable`/`RateLimitable`
