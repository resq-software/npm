# @resq-systems/math

## 0.2.1

### Patch Changes

- [#195](https://github.com/resq-software/npm/pull/195) [`2860be7`](https://github.com/resq-software/npm/commit/2860be7c0f4a16c3f61952668450553b2e959998) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Add exhaustive assertNever guards to all AST/value dispatch switches and replace unsafe `as` casts in register* with validated type guards

## 0.2.0

### Minor Changes

- [#190](https://github.com/resq-software/npm/pull/190) [`4d900b6`](https://github.com/resq-software/npm/commit/4d900b6118ab8be7fd0b0a32786eb38fda79402b) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Add record sort support and dot member property access to the math expression engine

- [#190](https://github.com/resq-software/npm/pull/190) [`4d900b6`](https://github.com/resq-software/npm/commit/4d900b6118ab8be7fd0b0a32786eb38fda79402b) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Initialize new @resq-systems/math package containing a type-safe mathematical expression engine with sort-based dispatch, static validation, and a Pratt parser.

### Patch Changes

- [#191](https://github.com/resq-software/npm/pull/191) [`570cb77`](https://github.com/resq-software/npm/commit/570cb779323ec04d6b46c7db55c1b5552372db0f) Thanks [@WomB0ComB0](https://github.com/WomB0ComB0)! - Harden math expression engine safety: add recursion depth checks in compiler, checker, and printer, optimize set operators to avoid intermediate array allocations, and restrict record property access in the static checker.
