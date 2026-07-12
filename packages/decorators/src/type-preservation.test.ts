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

import { describe, expect, test } from "vitest";
import { before } from "./before/before.js";
import { throttle } from "./throttle/throttle.js";
import { throttleAsync } from "./throttle-async/throttle-async.js";

/**
 * Compile-time assertion helpers. `Equal` is the standard invariant-safe
 * type-equality check; `Expect<T>` only accepts `true`, so a failed assertion is
 * a type error rather than a silent pass.
 */
type Equal<A, B> =
	(<G>() => G extends A ? 1 : 2) extends <G>() => G extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

type SyncMethod = (a: number, b: string) => boolean;
type AsyncFetch = (id: string) => Promise<{ id: string }>;

// Each `_sample*` applies a decorator to a descriptor of a known method type
// (never invoked at runtime — referenced only in `typeof` positions below). The
// `_SignaturePreservation` tuple below asserts each returned descriptor's method
// type is IDENTICAL to the input: proof that the generic-preserving decorator
// shape keeps the decorated method's signature end-to-end and never erases it to
// `Method<any>`. Any regression turns these into compile errors.
function _throttleSample() {
	const desc = null as unknown as TypedPropertyDescriptor<SyncMethod>;
	return throttle(100)({}, "m", desc);
}
function _throttleAsyncSample() {
	const desc = null as unknown as TypedPropertyDescriptor<AsyncFetch>;
	return throttleAsync(2)({}, "m", desc);
}
function _beforeSample() {
	const desc = null as unknown as TypedPropertyDescriptor<SyncMethod>;
	return before<{ hook(): void }>({ func: "hook" })({ hook() {} }, "m", desc);
}

// Compile-time assertions: this alias fails to type-check if any decorator
// erases the decorated method's signature to `Method<any>`. The declaration
// alone triggers the check — `Expect<false>` is itself a type error.
type _SignaturePreservation = [
	Expect<Equal<ReturnType<typeof _throttleSample>, TypedPropertyDescriptor<SyncMethod>>>,
	Expect<Equal<ReturnType<typeof _throttleAsyncSample>, TypedPropertyDescriptor<AsyncFetch>>>,
	Expect<Equal<ReturnType<typeof _beforeSample>, TypedPropertyDescriptor<SyncMethod>>>,
];

describe("decorator signature preservation", () => {
	test("throttle keeps the decorated method callable with its original signature", () => {
		class Widget {
			calls = 0;

			@throttle(1000)
			resize(width: number, height: number): number {
				this.calls += 1;
				return width * height;
			}
		}

		const widget = new Widget();

		// The decorated method still type-checks against its original `(number,
		// number)` signature — the whole point of signature preservation.
		widget.resize(4, 5);
		expect(widget.calls).toBe(1);

		// And it is genuinely throttled: the immediate second call is suppressed.
		widget.resize(6, 7);
		expect(widget.calls).toBe(1);
	});
});
