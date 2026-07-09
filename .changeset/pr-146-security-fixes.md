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
"@resq-sw/dsa": minor
"@resq-sw/rate-limiting": minor
"@resq-sw/security": minor
"@resq-sw/http": minor
---

Resolve security, algorithmic consistency, and memory leak issues:
- @resq-sw/security: Implement recursive prototype pollution protection in `sanitizeJson` and `sanitizeObject`. Integrate DOMPurify for HTML sanitization when `allowHtml` is enabled in `validateUserInput`.
- @resq-sw/http: Add SSRF protection with optional `allowedHosts` and `blockedHosts` in `FetcherOptions` to restrict requests to internal or untrusted networks.
- @resq-sw/rate-limiting: Address memory leaks in memory-based rate-limit stores, `KeyedThrottle`, and `KeyedDebounce` by using the LRU cache from `@resq-sw/dsa` with configurable capacity limits.
- @resq-sw/dsa: Add an optional `onEvict` callback to `LRUCache` to support cleanup tasks like canceling active timers during eviction, and skip expired entries when calling keys(), values(), and entries() iterators.
