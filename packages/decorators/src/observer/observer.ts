/**
 * Copyright 2026 ResQ
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
 * @fileoverview Observer decorator - observes property changes and invokes
 * a callback when the property value changes.
 *
 * @module @resq/typescript/decorators/observer
 *
 * @example
 * ```typescript
 * class Component {
 *   @observe
 *   count: number = 0;
 *
 *   @observe((newValue) => {
 *     console.log('Name changed to:', newValue);
 *   })
 *   name: string = '';
 * }
 *
 * const comp = new Component();
 * comp.count = 5; // Logs: "setting property Component#count = 5"
 * comp.name = 'John'; // Logs: "Name changed to: John"
 * ```
 *
 * @copyright Copyright (c) 2026 ResQ
 * @license MIT
 */

import { isFunction } from '../_utils.js';
import type { ObserverCallback } from './index.js';

/**
 * Creates a property decorator factory that observes property changes.
 *
 * @template T - The type of the property value
 * @param {ObserverCallback<T>} [cb] - Optional callback to invoke on changes
 * @returns {PropertyDecorator} The property decorator
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
 * Observe all changes of a property. All assignments will be logged to the console.
 *
 * @param {object} target - The class prototype
 * @param {string | symbol} propertyKey - The property key
 * @returns {void}
 *
 * @example
 * ```typescript
 * class Counter {
 *   @observe
 *   value: number = 0;
 * }
 *
 * const counter = new Counter();
 * counter.value = 5; // Logs: "setting property Counter#value = 5"
 * counter.value = 10; // Logs: "setting property Counter#value = 10"
 * ```
 */
export function observe(target: object, propertyKey: string | symbol): void;

/**
 * Observe all changes of a property and invoke a provided callback on each assignment.
 *
 * @template T - The type of the property value
 * @param {ObserverCallback<T>} cb - Callback to execute on assignment of observed variable
 * @returns {PropertyDecorator} The property decorator
 *
 * @example
 * ```typescript
 * class User {
 *   @observe((value) => {
 *     console.log('Email changed:', value);
 *     validateEmail(value);
 *   })
 *   email: string = '';
 *
 *   @observe((value) => {
 *     metrics.gauge('user.age', value);
 *   })
 *   age: number = 0;
 * }
 *
 * const user = new User();
 * user.email = 'test@example.com'; // Logs and validates
 * user.age = 25; // Records metric
 * ```
 */
export function observe<T>(cb: ObserverCallback<T>): PropertyDecorator;

/**
 * Overloaded function for observing property changes.
 * Can be used with or without a custom callback.
 *
 * @param {object | ObserverCallback<T>} targetOrCb - Either the class prototype or a callback function
 * @param {string | symbol} [propertyKey] - The property key (when used without callback)
 * @returns {void | PropertyDecorator} Either void or the decorator function
 *
 * @throws {TypeError} When used with incorrect parameters
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
  throw new TypeError('@observe not used with correct parameters!');
}
