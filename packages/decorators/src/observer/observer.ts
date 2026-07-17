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
 * @fileoverview `@observe` property decorator — intercepts assignments to a class
 * property and runs a callback (default: log to the console; optional custom
 * handler) for each new value.
 *
 * @module @resq-systems/decorators/observer/observer
 */

import { isFunction } from "../_utils.js";
import type { ObserverCallback } from "./index.js";

/**
 * Builds a property decorator that observes assignments to the decorated
 * property, invoking `cb` (or logging) on each new value.
 *
 * @template T - The type of the property value.
 * @param cb - Callback to invoke on each assignment; when omitted, assignments
 * are logged to the console.
 * @returns The property decorator.
 */
function factory<T>(cb?: ObserverCallback<T>): PropertyDecorator {
	return (target: object, propertyKey: string | symbol) => {
		let value: T;
		const { name } = target.constructor;
		Object.defineProperty(target, propertyKey, {
			set(newValue: T) {
				value = newValue;
				if (cb) {
					cb(newValue);
				} else {
					console.log(`setting property ${name}#${String(propertyKey)} = ${newValue}`);
				}
			},
			get() {
				return value;
			},
		});
	};
}

/**
 * Observe every assignment to a property, logging each new value to the console.
 *
 * @param target - The class prototype.
 * @param propertyKey - The property key.
 * @example
 * ```ts
 * class Counter {
 *   @observe
 *   value: number = 0;
 * }
 *
 * const counter = new Counter();
 * counter.value = 5; // Logs: "setting property Counter#value = 5".
 * counter.value = 10; // Logs: "setting property Counter#value = 10".
 * ```
 */
export function observe(target: object, propertyKey: string | symbol): void;

/**
 * Observe every assignment to a property and invoke `cb` with each new value.
 *
 * @template T - The type of the property value.
 * @param cb - Callback to run on each assignment of the observed property.
 * @returns The property decorator.
 * @example
 * ```ts
 * class User {
 *   @observe((value) => {
 *     console.log("Email changed:", value);
 *     validateEmail(value);
 *   })
 *   email: string = "";
 *
 *   @observe((value) => {
 *     metrics.gauge("user.age", value);
 *   })
 *   age: number = 0;
 * }
 *
 * const user = new User();
 * user.email = "test@example.com"; // Logs and validates.
 * user.age = 25; // Records a metric.
 * ```
 */
export function observe<T>(cb: ObserverCallback<T>): PropertyDecorator;

/**
 * Implementation for the {@link observe} overloads: usable directly as a
 * decorator or as a decorator factory that takes a custom callback.
 *
 * @template T - The type of the property value.
 * @param targetOrCb - Either the class prototype (direct decorator use) or a
 * callback function (factory use).
 * @param propertyKey - The property key, present only for direct decorator use.
 * @returns Nothing for direct use, or the property decorator for factory use.
 * @throws {TypeError} If called with an unsupported argument combination.
 */
export function observe<T>(
	targetOrCb: object | ObserverCallback<T>,
	propertyKey?: string | symbol,
) {
	if (propertyKey && !isFunction(targetOrCb)) {
		const decorator = factory();
		return decorator(targetOrCb, propertyKey);
	}
	if (isFunction(targetOrCb)) {
		return factory(targetOrCb as ObserverCallback<T>);
	}
	throw new TypeError("@observe not used with correct parameters!");
}
