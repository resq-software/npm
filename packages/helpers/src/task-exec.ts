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

import TinyQueue from 'tinyqueue';
import type { TimedTask } from './task-exec.types.js';

export class TaskExec {
  private readonly tasks = new TinyQueue<TimedTask>([], (a, b) => a.execTime - b.execTime);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handler: ReturnType<typeof setTimeout> | undefined;

  exec(func: (...args: unknown[]) => unknown, ttl: number): void {
    this.tasks.push({ func, execTime: Date.now() + ttl });
    this.handleNext();
  }

  private handleNext(): void {
    if (!this.tasks.length) {
      return;
    }

    const { execTime } = this.tasks.peek()!;
    this.execNext(Math.max(execTime - Date.now(), 0));
  }

  private execNext(ttl: number): void {
    clearTimeout(this.handler);
    this.handler = setTimeout(() => {
      const { func } = this.tasks.pop()!;
      func();
      this.handleNext();
    }, ttl);
  }
}
