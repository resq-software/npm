/*
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

import { describe, expect, test } from 'vitest';
import { bind } from './bind.js';

describe('bind', () => {
  test('preserves this context when method is destructured', () => {
    class Counter {
      value = 0;

      @bind
      increment() {
        this.value++;
        return this.value;
      }
    }

    const counter = new Counter();
    const { increment } = counter;
    expect(increment()).toBe(1);
    expect(increment()).toBe(2);
  });

  test('preserves this context when passed as callback', () => {
    class Greeter {
      name = 'ResQ';

      @bind
      greet() {
        return `Hello, ${this.name}!`;
      }
    }

    const greeter = new Greeter();
    const fn = greeter.greet;
    expect(fn()).toBe('Hello, ResQ!');
  });

  test('different instances have independent bindings', () => {
    class Counter {
      constructor(public value: number) {}

      @bind
      getValue() {
        return this.value;
      }
    }

    const a = new Counter(10);
    const b = new Counter(20);
    const fnA = a.getValue;
    const fnB = b.getValue;
    expect(fnA()).toBe(10);
    expect(fnB()).toBe(20);
  });
});
