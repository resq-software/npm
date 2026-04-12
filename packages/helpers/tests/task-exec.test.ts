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
import { TaskExec } from '../src/task-exec.js';

describe('TaskExec', () => {
  test('executes a task after the specified ttl', async () => {
    const executor = new TaskExec();
    let executed = false;

    executor.exec(() => {
      executed = true;
    }, 30);

    expect(executed).toBe(false);
    await new Promise((r) => setTimeout(r, 50));
    expect(executed).toBe(true);
  });

  test('executes tasks in order by time', async () => {
    const executor = new TaskExec();
    const order: number[] = [];

    executor.exec(() => order.push(2), 60);
    executor.exec(() => order.push(1), 20);

    await new Promise((r) => setTimeout(r, 100));
    expect(order).toEqual([1, 2]);
  });

  test('executes immediate tasks (ttl = 0)', async () => {
    const executor = new TaskExec();
    let executed = false;

    executor.exec(() => {
      executed = true;
    }, 0);

    await new Promise((r) => setTimeout(r, 20));
    expect(executed).toBe(true);
  });

  test('handles multiple tasks with same ttl', async () => {
    const executor = new TaskExec();
    let count = 0;

    executor.exec(() => count++, 20);
    executor.exec(() => count++, 20);

    await new Promise((r) => setTimeout(r, 80));
    expect(count).toBe(2);
  });
});
