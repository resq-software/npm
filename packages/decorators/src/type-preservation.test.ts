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
import { bind } from "./bind/bind.js";
import { memoize } from "./memoize/memoize.js";
import { memoizeAsync } from "./memoize-async/memoize-async.js";
import { rateLimit } from "./rate-limit/rate-limit.js";
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
function _memoizeSample() {
	const desc = null as unknown as TypedPropertyDescriptor<SyncMethod>;
	return memoize()({}, "m", desc);
}
function _rateLimitSample() {
	const desc = null as unknown as TypedPropertyDescriptor<SyncMethod>;
	return rateLimit({ timeSpanMs: 1000, allowedCalls: 5 })({}, "m", desc);
}
function _bindSample() {
	const desc = null as unknown as TypedPropertyDescriptor<SyncMethod>;
	return bind({}, "m", desc);
}
function _memoizeAsyncSample() {
	const desc = null as unknown as TypedPropertyDescriptor<AsyncFetch>;
	return memoizeAsync()({}, "m", desc);
}

// Compile-time assertions: this alias fails to type-check if any decorator
// erases the decorated method's signature to `Method<any>`. The declaration
// alone triggers the check — `Expect<false>` is itself a type error.
type _SignaturePreservation = [
	Expect<Equal<ReturnType<typeof _throttleSample>, TypedPropertyDescriptor<SyncMethod>>>,
	Expect<Equal<ReturnType<typeof _throttleAsyncSample>, TypedPropertyDescriptor<AsyncFetch>>>,
	Expect<Equal<ReturnType<typeof _beforeSample>, TypedPropertyDescriptor<SyncMethod>>>,
	Expect<Equal<ReturnType<typeof _memoizeSample>, TypedPropertyDescriptor<SyncMethod>>>,
	Expect<Equal<ReturnType<typeof _rateLimitSample>, TypedPropertyDescriptor<SyncMethod>>>,
	Expect<Equal<ReturnType<typeof _bindSample>, TypedPropertyDescriptor<SyncMethod>>>,
	Expect<Equal<ReturnType<typeof _memoizeAsyncSample>, TypedPropertyDescriptor<AsyncFetch>>>,
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

	test("memoize keeps the decorated method's signature and caches by args", () => {
		class Calc {
			calls = 0;

			@memoize()
			square(n: number): number {
				this.calls += 1;
				return n * n;
			}
		}

		const calc = new Calc();
		// Type-checks against the original `(number) => number` signature and
		// returns the real value (not erased to `Method<any>`).
		expect(calc.square(4)).toBe(16);
		expect(calc.square(4)).toBe(16); // served from cache
		expect(calc.calls).toBe(1);
	});

	test("bind keeps the decorated method bound when detached from the instance", () => {
		class Counter {
			count = 0;

			@bind
			increment(): number {
				this.count += 1;
				return this.count;
			}
		}

		const counter = new Counter();
		const { increment } = counter; // detached reference
		expect(increment()).toBe(1);
		expect(counter.count).toBe(1);
	});
});
