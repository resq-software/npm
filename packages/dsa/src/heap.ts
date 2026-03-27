/**
 * Copyright 2026 ResQ Software
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

export interface Distanced {
  distance: number;
}

export class BoundedHeap<T extends Distanced> {
  readonly #data: T[] = [];
  readonly limit: number;

  constructor(limit: number) {
    this.limit = limit;
  }

  insert(entry: T): void {
    if (this.#data.length < this.limit) {
      this.#data.push(entry);
      this.#siftUp(this.#data.length - 1);
    } else if (this.#data.length > 0 && entry.distance < this.#data[0]!.distance) {
      this.#data[0] = entry;
      this.#siftDown(0);
    }
  }

  peek(): T | undefined {
    return this.#data[0];
  }

  toSorted(): T[] {
    return [...this.#data].sort((a, b) => a.distance - b.distance);
  }

  get size(): number {
    return this.#data.length;
  }

  #siftUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.#data[parent]!.distance >= this.#data[i]!.distance) break;
      [this.#data[parent], this.#data[i]] = [this.#data[i]!, this.#data[parent]!];
      i = parent;
    }
  }

  #siftDown(i: number): void {
    const n = this.#data.length;
    while (true) {
      let largest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this.#data[l]!.distance > this.#data[largest]!.distance) largest = l;
      if (r < n && this.#data[r]!.distance > this.#data[largest]!.distance) largest = r;
      if (largest === i) break;
      [this.#data[i], this.#data[largest]] = [this.#data[largest]!, this.#data[i]!];
      i = largest;
    }
  }
}
