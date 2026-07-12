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

Harden decorator types: make `Decorator`/`AsyncDecorator` generic over the decorated method so its signature is preserved end-to-end instead of erased to `Method<any>`; default Method/AsyncMethod to unknown and drop `any` across the package; narrow the isFunction/isPromise guards and cache reads; await after-hook responses; and resolve rate-limit async counters and key resolvers. Fixes a `memoizeAsync` cache race where a TTL expiry or concurrent delete between `has()` and `get()` returned `null` instead of recomputing.
