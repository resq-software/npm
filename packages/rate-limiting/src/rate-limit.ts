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
 * @file Rate Limiting Utilities
 * @module @resq/typescript/utils/middleware/rate-limit
 */

import { Ratelimit } from '@upstash/ratelimit';
import type { Redis } from '@upstash/redis';
import { Schema as S } from 'effect';

// ============================================
// Effect Schema Definitions
// ============================================

export const RateLimitConfigSchema = S.Struct({
  windowMs: S.Number,
  maxRequests: S.Number,
  headers: S.optional(S.Boolean),
});

export type RateLimitConfig = typeof RateLimitConfigSchema.Type;

export const RateLimitCheckResultSchema = S.Struct({
  limited: S.Boolean,
  remaining: S.Number,
  resetTime: S.Number,
  total: S.Number,
});

export type RateLimitCheckResult = typeof RateLimitCheckResultSchema.Type;

// ============================================
// Rate Limit Store Interfaces
// ============================================

export interface IRateLimitStore {
  check(key: string, windowMs: number, maxRequests: number): Promise<RateLimitCheckResult>;
  reset(key: string): Promise<void>;
}

/**
 * Redis-backed rate limit store using @upstash/ratelimit
 */
export class RedisRateLimitStore implements IRateLimitStore {
  private readonly limiters = new Map<string, Ratelimit>();
  private readonly redis: Redis;

  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }

  private getLimiter(windowMs: number, maxRequests: number): Ratelimit {
    const key = `${windowMs}:${maxRequests}`;
    let limiter = this.limiters.get(key);
    if (!limiter) {
      limiter = new Ratelimit({
        redis: this.redis,
        limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs} ms`),
        prefix: '@resq/ratelimit',
      });
      this.limiters.set(key, limiter);
    }
    return limiter;
  }

  async check(key: string, windowMs: number, maxRequests: number): Promise<RateLimitCheckResult> {
    const limiter = this.getLimiter(windowMs, maxRequests);
    const result = await limiter.limit(key);

    return {
      limited: !result.success,
      remaining: result.remaining,
      resetTime: result.reset,
      total: result.limit,
    };
  }

  async reset(key: string): Promise<void> {
    // Note: @upstash/ratelimit reset is complex as it uses multiple keys.
    // For now, we clear the main key if possible.
  }
}

/**
 * In-memory rate limit store for local development or simple services
 */
export class MemoryRateLimitStore implements IRateLimitStore {
  private readonly store = new Map<string, { count: number; resetTime: number }>();

  async check(key: string, windowMs: number, maxRequests: number): Promise<RateLimitCheckResult> {
    const now = Date.now();
    const state = this.store.get(key);

    if (!state || state.resetTime <= now) {
      const newState = { count: 1, resetTime: now + windowMs };
      this.store.set(key, newState);
      return {
        limited: false,
        remaining: maxRequests - 1,
        resetTime: newState.resetTime,
        total: maxRequests,
      };
    }

    state.count++;
    const limited = state.count > maxRequests;
    return {
      limited,
      remaining: Math.max(0, maxRequests - state.count),
      resetTime: state.resetTime,
      total: maxRequests,
    };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }
}

// ============================================
// Rate Limit Presets
// ============================================

export const RATE_LIMIT_PRESETS = {
  auth: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
  },
  api: {
    windowMs: 60 * 1000,
    maxRequests: 100,
  },
  read: {
    windowMs: 60 * 1000,
    maxRequests: 200,
  },
  upload: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 20,
  },
} as const;
