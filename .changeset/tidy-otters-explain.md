---
"@resq-systems/dsa": minor
---

Export the `Coordinates2D`, `Coordinates3D` and `PointFor` type names

`Distance`'s methods take these shapes, so callers were already passing them — but the names were never re-exported from the barrel, and `distance.ts` has no subpath entry. A consumer could construct a value that satisfied `Distance`, and could not annotate the variable holding it or type a helper that forwarded one.

Found by type-checking `examples/dsa-pathfinding`, which imports `Coordinates2D` and had been failing to compile unnoticed: examples declare no build or test script, so the workspace-wide filters skipped them and nothing ever checked them. CI now type-checks the examples.

Additive and type-only. `export type` erases, so `@resq-systems/dsa` remains zero-runtime-dependency.
