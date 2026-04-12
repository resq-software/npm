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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type IRateLimitStore,
  MemoryRateLimitStore,
  RATE_LIMIT_PRESETS,
  type RateLimitCheckResult,
} from '../src/rate-limit.js';

// ------------------------------------------------------------------
// MemoryRateLimitStore
// ------------------------------------------------------------------

describe('MemoryRateLimitStore', () => {
  let store: MemoryRateLimitStore;

  beforeEach(() => {
    store = new MemoryRateLimitStore();
  });

  it('allows the first request within the window', async () => {
    const result = await store.check('user:1', 60_000, 5);
    expect(result.limited).toBe(false);
    expect(result.remaining).toBe(4);
    expect(result.total).toBe(5);
  });

  it('decrements remaining count on each request', async () => {
    await store.check('user:1', 60_000, 5);
    const result = await store.check('user:1', 60_000, 5);
    expect(result.remaining).toBe(3);
    expect(result.limited).toBe(false);
  });

  it('marks as limited when requests exceed maxRequests', async () => {
    const key = 'user:flood';
    const max = 3;
    await store.check(key, 60_000, max);
    await store.check(key, 60_000, max);
    await store.check(key, 60_000, max);

    const result = await store.check(key, 60_000, max);
    expect(result.limited).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it('returns remaining 0 when exactly at limit', async () => {
    const key = 'user:exact';
    const max = 2;
    await store.check(key, 60_000, max);
    await store.check(key, 60_000, max);

    // 2 requests with max 2 — count equals max, not over yet
    // Third request pushes count to 3 which is > max
    const result = await store.check(key, 60_000, max);
    expect(result.limited).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it('resets the counter for a key', async () => {
    const key = 'user:reset';
    await store.check(key, 60_000, 2);
    await store.check(key, 60_000, 2);

    await store.reset(key);

    const result = await store.check(key, 60_000, 2);
    expect(result.limited).toBe(false);
    expect(result.remaining).toBe(1);
  });

  it('tracks different keys independently', async () => {
    await store.check('user:a', 60_000, 1);
    await store.check('user:a', 60_000, 1);

    const resultA = await store.check('user:a', 60_000, 1);
    const resultB = await store.check('user:b', 60_000, 1);

    expect(resultA.limited).toBe(true);
    expect(resultB.limited).toBe(false);
  });

  it('resets window after expiration', async () => {
    vi.useFakeTimers();
    try {
      const key = 'user:expire';
      const windowMs = 1000;

      await store.check(key, windowMs, 1);
      await store.check(key, windowMs, 1); // over limit

      // Advance past window
      vi.advanceTimersByTime(1001);

      const result = await store.check(key, windowMs, 1);
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns a valid resetTime in the future', async () => {
    const before = Date.now();
    const result = await store.check('user:time', 60_000, 10);
    expect(result.resetTime).toBeGreaterThan(before);
  });

  it('implements IRateLimitStore interface', () => {
    const iface: IRateLimitStore = store;
    expect(typeof iface.check).toBe('function');
    expect(typeof iface.reset).toBe('function');
  });

  it('returns correct total value', async () => {
    const result = await store.check('user:total', 60_000, 42);
    expect(result.total).toBe(42);
  });
});

// ------------------------------------------------------------------
// RATE_LIMIT_PRESETS
// ------------------------------------------------------------------

describe('RATE_LIMIT_PRESETS', () => {
  it('has an auth preset with windowMs and maxRequests', () => {
    expect(RATE_LIMIT_PRESETS.auth).toBeDefined();
    expect(RATE_LIMIT_PRESETS.auth.windowMs).toBe(15 * 60 * 1000);
    expect(RATE_LIMIT_PRESETS.auth.maxRequests).toBe(5);
  });

  it('has an api preset with windowMs and maxRequests', () => {
    expect(RATE_LIMIT_PRESETS.api).toBeDefined();
    expect(RATE_LIMIT_PRESETS.api.windowMs).toBe(60 * 1000);
    expect(RATE_LIMIT_PRESETS.api.maxRequests).toBe(100);
  });

  it('has a read preset with windowMs and maxRequests', () => {
    expect(RATE_LIMIT_PRESETS.read).toBeDefined();
    expect(RATE_LIMIT_PRESETS.read.windowMs).toBe(60 * 1000);
    expect(RATE_LIMIT_PRESETS.read.maxRequests).toBe(200);
  });

  it('has an upload preset with windowMs and maxRequests', () => {
    expect(RATE_LIMIT_PRESETS.upload).toBeDefined();
    expect(RATE_LIMIT_PRESETS.upload.windowMs).toBe(60 * 60 * 1000);
    expect(RATE_LIMIT_PRESETS.upload.maxRequests).toBe(20);
  });

  it('auth preset is more restrictive than api preset', () => {
    expect(RATE_LIMIT_PRESETS.auth.maxRequests).toBeLessThan(
      RATE_LIMIT_PRESETS.api.maxRequests,
    );
  });
});
