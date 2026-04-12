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
 * Represents a node in the queue's linked list structure.
 */
export interface QueueNode<T> {
  next: QueueNode<T> | null;
  value: T;
}

/**
 * A generic FIFO (First In, First Out) queue data structure.
 * Implements queue operations using a linked list for efficient O(1) enqueue and dequeue.
 *
 * @class Queue
 * @template T - The type of elements stored in the queue
 */
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
