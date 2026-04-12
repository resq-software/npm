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
 * @fileoverview Inlined utilities for the decorators package.
 * These are minimal copies of utilities from the monorepo to keep this package zero-dependency.
 */

// --- Type guards ---

export const isPromise = (value: unknown): value is Promise<unknown> =>
  value instanceof Promise ||
  (typeof value === 'object' && value !== null && typeof (value as any).then === 'function');

export const isFunction = (value: unknown): value is Function =>
  typeof value === 'function';

export const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && !Number.isNaN(value);

export const isString = (value: unknown): value is string =>
  typeof value === 'string';

// --- Logger stub ---

export const logger = {
  info(message: string, data?: Record<string, unknown>): void {
    const suffix = data ? ` ${JSON.stringify(data)}` : '';
    console.info(`INFO [decorators] ${message}${suffix}`);
  },
};

// --- Queue (linked-list FIFO) ---

interface QueueNode<T> {
  next: QueueNode<T> | null;
  value: T;
}

export class Queue<T> {
  private firstItem: QueueNode<T> | null = null;
  private lastItem: QueueNode<T> | null = null;
  private size = 0;

  public getSize(): number {
    return this.size;
  }

  public isEmpty(): boolean {
    return this.size === 0;
  }

  public enqueue(item: T): void {
    const newItem: QueueNode<T> = { next: null, value: item };
    if (this.isEmpty()) {
      this.firstItem = newItem;
      this.lastItem = newItem;
    } else {
      if (this.lastItem) {
        this.lastItem.next = newItem;
      }
      this.lastItem = newItem;
    }
    this.size += 1;
  }

  public dequeue(): T | null {
    let removedItem: T | null = null;
    if (!this.isEmpty() && this.firstItem) {
      removedItem = this.firstItem.value;
      this.firstItem = this.firstItem.next;
      this.size -= 1;
    }
    return removedItem;
  }
}

// --- TaskExec (simple priority-based delayed execution) ---

interface TimedTask {
  func: (...args: unknown[]) => unknown;
  execTime: number;
}

export class TaskExec {
  private readonly tasks: TimedTask[] = [];
  private handler: ReturnType<typeof setTimeout> | undefined;

  exec(func: (...args: unknown[]) => unknown, ttl: number): void {
    this.tasks.push({ func, execTime: Date.now() + ttl });
    this.tasks.sort((a, b) => a.execTime - b.execTime);
    this.handleNext();
  }

  private handleNext(): void {
    if (!this.tasks.length) return;
    const { execTime } = this.tasks[0]!;
    this.execNext(Math.max(execTime - Date.now(), 0));
  }

  private execNext(ttl: number): void {
    clearTimeout(this.handler);
    this.handler = setTimeout(() => {
      const task = this.tasks.shift();
      if (task) task.func();
      this.handleNext();
    }, ttl);
  }
}
