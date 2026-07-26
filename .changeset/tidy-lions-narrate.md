---
"@resq-systems/helpers": minor
---

Add supported-media MIME literal unions and replace `any` with precise types across helpers

`MediaHelpers.isImageType`, `isAnimatedImageType`, `isStaticImageType`, and `isVectorImageType` now
return type predicates over the new `SupportedImageType` / `SupportedAnimatedImageType` /
`SupportedStaticImageType` / `SupportedVectorImageType` unions (`SupportedVideoType` and
`SupportedMediaType` are exported too). `measureCbDuration` is now generic and returns the
callback's own type instead of `any`. Tightened types on `dedupe`, `compact`, `sortById`,
`getFirstFromIterable`, `promiseWithResolve`, and `Timers`. `parseCodePath` and
`parseCodePathDetailed` now accept `null`/`undefined` for `entity`, matching the
`"UnknownEntity"` fallback they already implemented.

Type-only breaking changes: `sortById` now requires `id` to be a `string` or `number`, and
`dedupe`'s `equals` callback is typed `(a: T, b: T)`. Runtime behavior is unchanged.
