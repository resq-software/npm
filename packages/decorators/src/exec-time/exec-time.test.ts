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
import { execTimeFn } from './exec-time.fn.js';

describe('execTimeFn', () => {
  test('calls original method and custom reporter', async () => {
    let reportedData: { execTime: number; args: any[]; result: any } | undefined;
    const original = (x: number) => x * 2;

    const wrapped = execTimeFn(original, (data) => {
      reportedData = data;
    });

    await wrapped(5);

    expect(reportedData).toBeDefined();
    expect(reportedData!.result).toBe(10);
    expect(reportedData!.args).toEqual([5]);
    expect(reportedData!.execTime).toBeGreaterThanOrEqual(0);
  });

  test('handles async methods', async () => {
    let reportedTime = -1;
    const asyncFn = async (x: number) => {
      await new Promise((r) => setTimeout(r, 20));
      return x + 1;
    };

    const wrapped = execTimeFn(asyncFn, (data) => {
      reportedTime = data.execTime;
    });

    await wrapped(10);

    expect(reportedTime).toBeGreaterThanOrEqual(15);
  });

  test('uses default reporter without error', async () => {
    const fn = () => 'ok';
    const wrapped = execTimeFn(fn);

    // Should not throw — default reporter logs via logger.info
    await wrapped();
  });

  test('uses string label as reporter', async () => {
    const fn = () => 42;
    const wrapped = execTimeFn(fn, 'my-operation');

    // Call with an object context so `this[input]` lookup doesn't throw on undefined
    await wrapped.call({});
  });
});
