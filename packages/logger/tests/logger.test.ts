/*
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

import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { LogLevel, Logger } from '../src/logger.js';

describe('Logger', () => {
  let originalInfo: typeof console.info;
  let originalError: typeof console.error;
  let originalWarn: typeof console.warn;
  let originalDebug: typeof console.debug;
  let captured: string[];

  beforeEach(() => {
    captured = [];
    originalInfo = console.info;
    originalError = console.error;
    originalWarn = console.warn;
    originalDebug = console.debug;

    const capture = (...args: unknown[]) => {
      captured.push(args.map(String).join(' '));
    };
    console.info = capture;
    console.error = capture;
    console.warn = capture;
    console.debug = capture;
  });

  afterEach(() => {
    console.info = originalInfo;
    console.error = originalError;
    console.warn = originalWarn;
    console.debug = originalDebug;
  });

  test('info logs with context', () => {
    const logger = new Logger('TestCtx', { minLevel: LogLevel.ALL });
    logger.info('hello world');
    expect(captured.length).toBe(1);
    expect(captured[0]).toContain('[TestCtx]');
    expect(captured[0]).toContain('INFO');
    expect(captured[0]).toContain('hello world');
  });

  test('error logs with error object', () => {
    const logger = new Logger('ErrCtx', { minLevel: LogLevel.ALL });
    logger.error('failed', new Error('boom'));
    expect(captured.length).toBe(1);
    expect(captured[0]).toContain('ERROR');
    expect(captured[0]).toContain('failed');
    expect(captured[0]).toContain('boom');
  });

  test('warn logs warning messages', () => {
    const logger = new Logger('WarnCtx', { minLevel: LogLevel.ALL });
    logger.warn('careful');
    expect(captured.length).toBe(1);
    expect(captured[0]).toContain('WARN');
    expect(captured[0]).toContain('careful');
  });

  test('debug logs debug messages', () => {
    const logger = new Logger('DbgCtx', { minLevel: LogLevel.ALL });
    logger.debug('debugging');
    expect(captured.length).toBe(1);
    expect(captured[0]).toContain('DEBUG');
  });

  test('trace logs trace messages', () => {
    const logger = new Logger('TrcCtx', { minLevel: LogLevel.ALL });
    logger.trace('tracing');
    expect(captured.length).toBe(1);
    expect(captured[0]).toContain('TRACE');
  });

  test('respects minimum log level', () => {
    const logger = new Logger('LvlCtx', { minLevel: LogLevel.ERROR });
    logger.info('should not appear');
    logger.debug('should not appear');
    logger.warn('should not appear');
    expect(captured.length).toBe(0);

    logger.error('should appear');
    expect(captured.length).toBe(1);
  });

  test('NONE level suppresses all logs', () => {
    const logger = new Logger('NoneCtx', { minLevel: LogLevel.NONE });
    logger.error('nope');
    logger.info('nope');
    logger.debug('nope');
    expect(captured.length).toBe(0);
  });

  test('logs structured data as JSON', () => {
    const logger = new Logger('DataCtx', { minLevel: LogLevel.ALL });
    logger.info('with data', { userId: '123', count: 5 });
    expect(captured[0]).toContain('"userId"');
    expect(captured[0]).toContain('"123"');
  });

  test('action method logs at INFO level', () => {
    const logger = new Logger('ActCtx', { minLevel: LogLevel.ALL });
    logger.action('user clicked');
    expect(captured[0]).toContain('ACTION');
  });

  test('success method logs at INFO level', () => {
    const logger = new Logger('SuccCtx', { minLevel: LogLevel.ALL });
    logger.success('done!');
    expect(captured[0]).toContain('SUCCESS');
  });

  test('getLogger returns singleton per context', () => {
    const a = Logger.getLogger('singleton-test');
    const b = Logger.getLogger('singleton-test');
    expect(a).toBe(b);
  });

  test('getLogger returns different instances for different contexts', () => {
    const a = Logger.getLogger('ctx-a');
    const b = Logger.getLogger('ctx-b');
    expect(a).not.toBe(b);
  });

  test('time measures execution duration', async () => {
    const logger = new Logger('TimeCtx', { minLevel: LogLevel.ALL });
    const result = await logger.time('op', () => 42);
    expect(result).toBe(42);
    expect(captured.length).toBe(1);
    expect(captured[0]).toContain('op completed');
    expect(captured[0]).toContain('duration');
  });

  test('time logs error on failure', async () => {
    const logger = new Logger('TimeErrCtx', { minLevel: LogLevel.ALL });
    try {
      await logger.time('op', () => {
        throw new Error('boom');
      });
    } catch (e) {
      // expected
    }
    expect(captured.length).toBe(1);
    expect(captured[0]).toContain('op failed');
  });

  test('error handles non-Error objects', () => {
    const logger = new Logger('NonErrCtx', { minLevel: LogLevel.ALL });
    logger.error('problem', 'string error');
    expect(captured.length).toBe(1);
    expect(captured[0]).toContain('problem');
  });
});
