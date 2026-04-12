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

import { describe, expect, vi, test } from 'vitest';
import { observe } from './observer.js';

describe('observe decorator', () => {
  test('logs to console when no callback provided', () => {
    const logSpy = vi.fn();
    const originalLog = console.log;
    console.log = logSpy;

    try {
      class Component {
        @observe
        count: number = 0;
      }

      const comp = new Component();
      comp.count = 42;

      expect(logSpy).toHaveBeenCalledWith('setting property Component#count = 42');
    } finally {
      console.log = originalLog;
    }
  });

  test('invokes custom callback on property set', () => {
    const cb = vi.fn();

    class Component {
      @observe(cb)
      name: string = '';
    }

    const comp = new Component();
    comp.name = 'hello';

    expect(cb).toHaveBeenCalledWith('hello');
  });

  test('getter returns the set value', () => {
    class Component {
      @observe(() => {})
      value: number = 0;
    }

    const comp = new Component();
    comp.value = 99;
    expect(comp.value).toBe(99);
  });

  test('calls callback on every assignment', () => {
    const values: number[] = [];

    class Component {
      @observe((v: number) => values.push(v))
      counter: number = 0;
    }

    const comp = new Component();
    comp.counter = 1;
    comp.counter = 2;
    comp.counter = 3;

    expect(values).toEqual([0, 1, 2, 3]); // initial + 3 assignments
  });

  test('throws TypeError with incorrect parameters', () => {
    expect(() => {
      (observe as unknown as (arg: number) => void)(123);
    }).toThrow(TypeError);
  });
});
