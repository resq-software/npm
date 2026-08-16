---
"@resq-systems/security": minor
---

Fail closed in `analyzeGraphQLRequest` when the request body cannot be fully read

`analyzeGraphQLRequest` measured whatever `documentsFrom` managed to extract and reported `withinLimits` from that alone. Both ways extraction can stop early returned a short list indistinguishable from a small request, so a body the analyzer could not read was reported as a body with nothing to limit.

Reproduced against 2.0.0, with the default limits of 10 documents and 10 operations:

| Body | documents | operations | withinLimits |
|---|---|---|---|
| 150-operation batch | 150 | 150 | `false` — blocked |
| the same 150, wrapped ten arrays deep | 0 | 0 | **`true`** |
| the same, handed over as raw JSON text | 0 | 0 | **`true`** |
| `"[".repeat(2500)` prefixed to the batch | 1 | 1 | **`true`** |

The first two stop at `MAX_BODY_DEPTH`, which was added to keep the "never throws" contract honest and, in doing so, turned a `RangeError` into a silent pass. The third is different: `JSON.parse` rejects the text, and the `catch` fell through to treating the whole remainder as one bare document — undercounting 150 operations to 1, by whatever margin the client chooses.

`documentsFrom` now reports whether the walk completed, and `analyzeGraphQLRequest` fails closed when it did not, naming the reason in `exceeded`:

- `bodyDepth` — nesting exceeded the internal walk limit, so documents past it were never seen.
- `malformedBody` — a `[`-prefixed string was not valid JSON, so a batch could not be read at all.

A `{`-prefixed string that fails to parse is still treated as a document: that is ordinary anonymous-shorthand GraphQL (`{ user { id } }`), and no GraphQL document starts with `[`, which is what makes the two cases separable.

Bumped `minor` rather than `patch`. No signature changed and `exceeded` was already `readonly string[]`, so this is not `major` under the repo's rules — but a request that previously passed can now be rejected, and a caller branching on `withinLimits` will notice. Callers matching on specific `exceeded` values should expect the two new entries.

One existing test asserted the old behaviour (`{ documents: 0, withinLimits: true }` for a 50,000-deep body). Its stated purpose — that the call never throws — is unchanged and still asserted; only the incidental claim that such a body is within limits was corrected.
