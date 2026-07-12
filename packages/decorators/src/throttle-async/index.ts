/**
 * Copyright 2026 ResQ Systems, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview `@throttleAsync(parallelCalls?)` decorator and
 * `throttleAsyncFn` function form — limit concurrent in-flight
 * executions of an async method (default `1`). Excess calls queue
 * and resolve in FIFO order. Typical use: outbound API
 * concurrency caps, IO-bound work funnels, expensive ML
 * inference calls.
 *
 * Also exports `ThrottleAsyncExecutor` for callers that need
 * direct queue access.
 */

export * from "./throttle-async.js";
