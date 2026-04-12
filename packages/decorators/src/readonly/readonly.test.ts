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

import { describe, expect, test } from 'vitest';
import { readonly } from './readonly.js';

describe('readonly', () => {
  test('prevents method reassignment in strict mode', () => {
    class Example {
      @readonly()
      greet() {
        return 'hello';
      }
    }

    const instance = new Example();
    expect(instance.greet()).toBe('hello');

    // In strict mode, assigning to readonly property throws TypeError
    expect(() => {
      (instance as unknown as Record<string, unknown>).greet = () => 'overwritten';
    }).toThrow();
  });

  test('method remains callable', () => {
    class Calculator {
      @readonly()
      add(a: number, b: number) {
        return a + b;
      }
    }

    const calc = new Calculator();
    expect(calc.add(2, 3)).toBe(5);
  });
});
