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
"@resq-systems/dsa": minor
---

Export the `Coordinates2D`, `Coordinates3D` and `PointFor` type names

`Distance`'s methods take these shapes, so callers were already passing them — but the names were never re-exported from the barrel, and `distance.ts` has no subpath entry. A consumer could construct a value that satisfied `Distance`, and could not annotate the variable holding it or type a helper that forwarded one.

Found by type-checking `examples/dsa-pathfinding`, which imports `Coordinates2D` and had been failing to compile unnoticed: examples declare no build or test script, so the workspace-wide filters skipped them and nothing ever checked them. CI now type-checks the examples.

Additive and type-only. `export type` erases, so `@resq-systems/dsa` remains zero-runtime-dependency.
