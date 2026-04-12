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

import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDate,
  formatDatePeriod,
  formatDateTime,
  formatDateOnly,
  formatMonthYear,
  formatRelativeTime,
} from '../src/formatting/date.js';

describe('formatDate', () => {
  test('formats an ISO string with default options (short month + year)', () => {
    expect(formatDate('2023-01-15T10:00:00Z')).toBe('Jan 2023');
  });

  test('formats a Date object', () => {
    expect(formatDate(new Date('2023-06-01T00:00:00Z'))).toBe('Jun 2023');
  });

  test('returns "Invalid date" for invalid string', () => {
    expect(formatDate('not-a-date')).toBe('Invalid date');
  });

  test('returns "Invalid date" for invalid Date object', () => {
    expect(formatDate(new Date('invalid'))).toBe('Invalid date');
  });

  test('respects custom options (long month + day)', () => {
    const result = formatDate('2023-07-04T00:00:00Z', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    expect(result).toBe('July 4, 2023');
  });

  test('handles numeric month format', () => {
    const result = formatDate('2023-12-25T00:00:00Z', {
      month: 'numeric',
      year: 'numeric',
    });
    expect(result).toBe('12/2023');
  });

  test('uses UTC timezone to avoid locale drift', () => {
    // Midnight UTC on Jan 1 should still be Jan in UTC regardless of local timezone
    const result = formatDate('2023-01-01T00:00:00Z');
    expect(result).toBe('Jan 2023');
  });
});

describe('formatDatePeriod', () => {
  test('formats a start-to-end period', () => {
    expect(formatDatePeriod('2023-01-01T00:00:00Z', '2023-12-31T00:00:00Z')).toBe(
      'Jan 2023 - Dec 2023',
    );
  });

  test('returns "Present" when isCurrent is true', () => {
    expect(formatDatePeriod('2023-01-01T00:00:00Z', null, true)).toBe(
      'Jan 2023 - Present',
    );
  });

  test('returns "Present" when endDate is null and isCurrent is false', () => {
    expect(formatDatePeriod('2023-06-01T00:00:00Z', null)).toBe(
      'Jun 2023 - Present',
    );
  });

  test('returns "Present" when endDate is undefined', () => {
    expect(formatDatePeriod('2023-06-01T00:00:00Z')).toBe(
      'Jun 2023 - Present',
    );
  });

  test('accepts Date objects', () => {
    const start = new Date('2022-03-01T00:00:00Z');
    const end = new Date('2022-09-01T00:00:00Z');
    expect(formatDatePeriod(start, end)).toBe('Mar 2022 - Sep 2022');
  });
});

describe('formatDateTime', () => {
  test('formats a full date with time', () => {
    const result = formatDateTime('2023-01-15T14:30:00Z');
    expect(result).toContain('January');
    expect(result).toContain('15');
    expect(result).toContain('2023');
    // Time portion should be present
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  test('returns "Invalid date" for bad input', () => {
    expect(formatDateTime('nope')).toBe('Invalid date');
  });
});

describe('formatDateOnly', () => {
  test('formats a date without time', () => {
    const result = formatDateOnly('2023-01-15T00:00:00Z');
    expect(result).toBe('January 15, 2023');
  });

  test('accepts a Date object', () => {
    const result = formatDateOnly(new Date('2024-12-25T00:00:00Z'));
    expect(result).toBe('December 25, 2024');
  });
});

describe('formatMonthYear', () => {
  test('formats month and year', () => {
    expect(formatMonthYear('2023-01-15T00:00:00Z')).toBe('Jan 2023');
  });

  test('formats from Date object', () => {
    expect(formatMonthYear(new Date('2024-11-01T00:00:00Z'))).toBe('Nov 2024');
  });
});

describe('formatRelativeTime', () => {
  let dateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Fix "now" to 2023-06-15T12:00:00Z
    dateSpy = vi.spyOn(Date.prototype, 'getTime');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('returns "Just now" for very recent dates', () => {
    const now = new Date();
    const recent = new Date(now.getTime() - 5_000); // 5 seconds ago
    vi.setSystemTime(now);
    expect(formatRelativeTime(recent)).toBe('Just now');
    vi.useRealTimers();
  });

  test('returns minutes ago', () => {
    const now = new Date('2023-06-15T12:00:00Z');
    vi.setSystemTime(now);
    const fiveMinAgo = new Date('2023-06-15T11:55:00Z');
    expect(formatRelativeTime(fiveMinAgo)).toBe('5 minutes ago');
    vi.useRealTimers();
  });

  test('returns singular minute', () => {
    const now = new Date('2023-06-15T12:00:00Z');
    vi.setSystemTime(now);
    const oneMinAgo = new Date('2023-06-15T11:59:00Z');
    expect(formatRelativeTime(oneMinAgo)).toBe('1 minute ago');
    vi.useRealTimers();
  });

  test('returns hours ago', () => {
    const now = new Date('2023-06-15T12:00:00Z');
    vi.setSystemTime(now);
    const threeHrsAgo = new Date('2023-06-15T09:00:00Z');
    expect(formatRelativeTime(threeHrsAgo)).toBe('3 hours ago');
    vi.useRealTimers();
  });

  test('returns singular hour', () => {
    const now = new Date('2023-06-15T12:00:00Z');
    vi.setSystemTime(now);
    const oneHrAgo = new Date('2023-06-15T11:00:00Z');
    expect(formatRelativeTime(oneHrAgo)).toBe('1 hour ago');
    vi.useRealTimers();
  });

  test('returns days ago', () => {
    const now = new Date('2023-06-15T12:00:00Z');
    vi.setSystemTime(now);
    const twoDaysAgo = new Date('2023-06-13T12:00:00Z');
    expect(formatRelativeTime(twoDaysAgo)).toBe('2 days ago');
    vi.useRealTimers();
  });

  test('returns singular day', () => {
    const now = new Date('2023-06-15T12:00:00Z');
    vi.setSystemTime(now);
    const oneDayAgo = new Date('2023-06-14T12:00:00Z');
    expect(formatRelativeTime(oneDayAgo)).toBe('1 day ago');
    vi.useRealTimers();
  });

  test('accepts a string date', () => {
    const now = new Date('2023-06-15T12:00:00Z');
    vi.setSystemTime(now);
    expect(formatRelativeTime('2023-06-15T11:00:00Z')).toBe('1 hour ago');
    vi.useRealTimers();
  });
});
