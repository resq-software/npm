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

import { describe, expect, it } from 'vitest';
import { getRequestId, shouldRedirectToHttps } from '../src/security.js';

// ------------------------------------------------------------------
// shouldRedirectToHttps
// ------------------------------------------------------------------

describe('shouldRedirectToHttps', () => {
  it('returns null in development environment', () => {
    const result = shouldRedirectToHttps('http', 'http://example.com', {}, 'development');
    expect(result).toBeNull();
  });

  it('returns null in test environment', () => {
    const result = shouldRedirectToHttps('http', 'http://example.com', {}, 'test');
    expect(result).toBeNull();
  });

  it('returns null when protocol is https in production', () => {
    const result = shouldRedirectToHttps('https', 'https://example.com/path', {}, 'production');
    expect(result).toBeNull();
  });

  it('returns null when x-forwarded-proto is https', () => {
    const result = shouldRedirectToHttps(
      'http',
      'http://example.com/path',
      { 'x-forwarded-proto': 'https' },
      'production',
    );
    expect(result).toBeNull();
  });

  it('returns null when x-forwarded-ssl is on', () => {
    const result = shouldRedirectToHttps(
      'http',
      'http://example.com/path',
      { 'x-forwarded-ssl': 'on' },
      'production',
    );
    expect(result).toBeNull();
  });

  it('returns null when URL starts with https://', () => {
    const result = shouldRedirectToHttps('http', 'https://example.com/path', {}, 'production');
    expect(result).toBeNull();
  });

  it('returns HTTPS URL when request is insecure in production', () => {
    const result = shouldRedirectToHttps('http', 'http://example.com/path', {}, 'production');
    expect(result).toBe('https://example.com/path');
  });

  it('preserves path and query string in redirect URL', () => {
    const result = shouldRedirectToHttps(
      'http',
      'http://example.com/api/data?page=1&sort=desc',
      {},
      'production',
    );
    expect(result).toBe('https://example.com/api/data?page=1&sort=desc');
  });

  it('preserves port in redirect URL when present', () => {
    const result = shouldRedirectToHttps(
      'http',
      'http://example.com:8080/path',
      {},
      'production',
    );
    expect(result).toContain('https:');
    expect(result).toContain('/path');
  });

  it('returns redirect when x-forwarded-proto is http', () => {
    const result = shouldRedirectToHttps(
      'http',
      'http://example.com/',
      { 'x-forwarded-proto': 'http' },
      'production',
    );
    expect(result).toBe('https://example.com/');
  });

  it('returns redirect when x-forwarded-ssl is off', () => {
    const result = shouldRedirectToHttps(
      'http',
      'http://example.com/',
      { 'x-forwarded-ssl': 'off' },
      'production',
    );
    expect(result).toBe('https://example.com/');
  });

  it('handles undefined header values gracefully', () => {
    const result = shouldRedirectToHttps(
      'http',
      'http://example.com/',
      { 'x-forwarded-proto': undefined, 'x-forwarded-ssl': undefined },
      'production',
    );
    expect(result).toBe('https://example.com/');
  });

  it('returns null in staging environment with https protocol', () => {
    const result = shouldRedirectToHttps('https', 'https://staging.example.com/', {}, 'staging');
    expect(result).toBeNull();
  });

  it('returns redirect in staging environment with http protocol', () => {
    const result = shouldRedirectToHttps('http', 'http://staging.example.com/', {}, 'staging');
    expect(result).toBe('https://staging.example.com/');
  });
});

// ------------------------------------------------------------------
// getRequestId
// ------------------------------------------------------------------

describe('getRequestId', () => {
  it('returns the existing ID when provided', () => {
    const id = 'req-abc-123';
    expect(getRequestId(id)).toBe(id);
  });

  it('generates a UUID when no ID is provided', () => {
    const id = getRequestId();
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
    // UUID v4 format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('generates a UUID when undefined is passed', () => {
    const id = getRequestId(undefined);
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('generates unique IDs on each call', () => {
    const id1 = getRequestId();
    const id2 = getRequestId();
    expect(id1).not.toBe(id2);
  });

  it('returns empty string when empty string is passed', () => {
    // Empty string is falsy, so a UUID should be generated
    const id = getRequestId('');
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});
