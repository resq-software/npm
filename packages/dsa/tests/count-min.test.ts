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
import { CountMinSketch } from '../src/count-min.js';

describe('CountMinSketch', () => {
  it('tracks frequency with bounded overcount', () => {
    const cms = new CountMinSketch(0.01, 0.01);
    cms.increment('drone-1', 5);
    cms.increment('drone-1', 3);
    cms.increment('drone-2', 1);
    expect(cms.estimate('drone-1')).toBeGreaterThanOrEqual(8);
    expect(cms.estimate('drone-2')).toBeGreaterThanOrEqual(1);
  });

  it('returns 0 for untracked keys', () => {
    const cms = new CountMinSketch(0.1, 0.1);
    expect(cms.estimate('ghost')).toBe(0);
  });

  it('increment defaults to 1', () => {
    const cms = new CountMinSketch(0.01, 0.01);
    cms.increment('key');
    cms.increment('key');
    expect(cms.estimate('key')).toBeGreaterThanOrEqual(2);
  });
});
