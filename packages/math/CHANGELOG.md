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
