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

import { describe, expect, it } from 'vitest';
import { BloomFilter } from '../src/bloom.js';

describe('BloomFilter', () => {
  it('has() returns true for added items', () => {
    const bf = new BloomFilter(1000);
    bf.add('drone-001');
    bf.add('drone-002');
    expect(bf.has('drone-001')).toBe(true);
    expect(bf.has('drone-002')).toBe(true);
  });

  it('has() returns false for absent items', () => {
    const bf = new BloomFilter(1000, 0.001);
    bf.add('seen');
    expect(bf.has('unseen')).toBe(false);
    expect(bf.has('also-unseen')).toBe(false);
  });

  it('never has false negatives', () => {
    const bf = new BloomFilter(500);
    const items = Array.from({ length: 100 }, (_, i) => `item-${i}`);
    items.forEach((x) => bf.add(x));
    expect(items.every((x) => bf.has(x))).toBe(true);
  });
});
