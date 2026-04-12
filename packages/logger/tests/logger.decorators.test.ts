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

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Log, LogClass, LogError, LogTiming } from '../src/logger.decorators.js';

/**
 * Helper: manually apply a method decorator (legacy-style) since Bun uses
 * TC39 decorators by default which are incompatible with legacy MethodDecorator.
 */
function applyMethodDecorator(
  decorator: MethodDecorator,
  target: object,
  methodName: string,
): void {
  const descriptor = Object.getOwnPropertyDescriptor(target, methodName)!;
  const result = decorator(target, methodName, descriptor);
  if (result) Object.defineProperty(target, methodName, result);
}

let captured: string[];
let originalInfo: typeof console.info;
let originalError: typeof console.error;
let originalWarn: typeof console.warn;
let originalDebug: typeof console.debug;

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

// ------------------------------------------------------------------
// @Log
// ------------------------------------------------------------------

describe('@Log', () => {
  it('logs method entry and exit for sync methods', () => {
    class Service {
      greet(name: string) { return `Hello, ${name}`; }
    }
    applyMethodDecorator(Log(), Service.prototype, 'greet');

    new Service().greet('Alice');
    expect(captured.length).toBe(2);
    expect(captured[0]).toContain('greet called');
    expect(captured[0]).toContain('Alice');
    expect(captured[1]).toContain('greet completed');
  });

  it('logs arguments when logArgs is true (default)', () => {
    class Service {
      add(a: number, b: number) { return a + b; }
    }
    applyMethodDecorator(Log({ logArgs: true }), Service.prototype, 'add');

    new Service().add(2, 3);
    expect(captured[0]).toContain('arguments');
    expect(captured[0]).toContain('2');
    expect(captured[0]).toContain('3');
  });

  it('does not log arguments when logArgs is false', () => {
    class Service {
      work() { return 42; }
    }
    applyMethodDecorator(Log({ logArgs: false }), Service.prototype, 'work');

    new Service().work();
    expect(captured[0]).toContain('work called');
    expect(captured[0]).not.toContain('arguments');
  });

  it('logs return value when logResult is true', () => {
    class Service {
      compute() { return 99; }
    }
    applyMethodDecorator(Log({ logResult: true }), Service.prototype, 'compute');

    new Service().compute();
    expect(captured[1]).toContain('returned');
    expect(captured[1]).toContain('99');
  });

  it('logs entry and exit for async methods', async () => {
    class Service {
      async fetch() { return 'data'; }
    }
    applyMethodDecorator(Log(), Service.prototype, 'fetch');

    await new Service().fetch();
    expect(captured.length).toBe(2);
    expect(captured[0]).toContain('fetch called');
    expect(captured[1]).toContain('fetch completed');
  });

  it('logs async return value when logResult is true', async () => {
    class Service {
      async fetch() { return { id: 1 }; }
    }
    applyMethodDecorator(Log({ logResult: true }), Service.prototype, 'fetch');

    await new Service().fetch();
    expect(captured[1]).toContain('returned');
    expect(captured[1]).toContain('"id"');
  });

  it('logs error when async method rejects', async () => {
    class Service {
      async fail() { throw new Error('async boom'); }
    }
    applyMethodDecorator(Log(), Service.prototype, 'fail');

    await expect(new Service().fail()).rejects.toThrow('async boom');
    expect(captured.some((c) => c.includes('failed'))).toBe(true);
  });

  it('uses custom message prefix', () => {
    class Service {
      run() { return true; }
    }
    applyMethodDecorator(Log({ message: 'CustomOp' }), Service.prototype, 'run');

    new Service().run();
    expect(captured[0]).toContain('CustomOp called');
    expect(captured[1]).toContain('CustomOp completed');
  });
});

// ------------------------------------------------------------------
// @LogTiming
// ------------------------------------------------------------------

describe('@LogTiming', () => {
  it('logs timing for sync methods', () => {
    class Service {
      compute() { return 42; }
    }
    applyMethodDecorator(LogTiming(), Service.prototype, 'compute');

    new Service().compute();
    expect(captured.length).toBe(1);
    expect(captured[0]).toContain('completed in');
    expect(captured[0]).toContain('ms');
  });

  it('logs timing for async methods', async () => {
    class Service {
      async fetch() { return 'result'; }
    }
    applyMethodDecorator(LogTiming(), Service.prototype, 'fetch');

    await new Service().fetch();
    expect(captured.length).toBe(1);
    expect(captured[0]).toContain('completed in');
  });

  it('does not log when duration is below threshold', () => {
    class Service {
      fast() { return 1; }
    }
    applyMethodDecorator(LogTiming({ threshold: 10000 }), Service.prototype, 'fast');

    new Service().fast();
    expect(captured.length).toBe(0);
  });

  it('uses custom label', () => {
    class Service {
      work() { return true; }
    }
    applyMethodDecorator(LogTiming({ label: 'my-timer' }), Service.prototype, 'work');

    new Service().work();
    expect(captured[0]).toContain('my-timer');
  });
});

// ------------------------------------------------------------------
// @LogError
// ------------------------------------------------------------------

describe('@LogError', () => {
  it('logs and rethrows sync errors by default', () => {
    class Service {
      fail() { throw new Error('sync boom'); }
    }
    applyMethodDecorator(LogError(), Service.prototype, 'fail');

    expect(() => new Service().fail()).toThrow('sync boom');
    expect(captured.length).toBe(1);
    expect(captured[0]).toContain('ERROR');
    expect(captured[0]).toContain('fail error');
  });

  it('suppresses error when rethrow is false', () => {
    class Service {
      fail() { throw new Error('suppressed'); }
    }
    applyMethodDecorator(LogError({ rethrow: false }), Service.prototype, 'fail');

    const result = new Service().fail();
    expect(result).toBeUndefined();
    expect(captured[0]).toContain('ERROR');
  });

  it('logs and rethrows async errors by default', async () => {
    class Service {
      async fail() { throw new Error('async boom'); }
    }
    applyMethodDecorator(LogError(), Service.prototype, 'fail');

    await expect(new Service().fail()).rejects.toThrow('async boom');
    expect(captured[0]).toContain('ERROR');
  });

  it('suppresses async error when rethrow is false', async () => {
    class Service {
      async fail() { throw new Error('suppressed async'); }
    }
    applyMethodDecorator(LogError({ rethrow: false }), Service.prototype, 'fail');

    const result = await new Service().fail();
    expect(result).toBeUndefined();
  });

  it('includes stack trace by default', () => {
    class Service {
      fail() { throw new Error('stack test'); }
    }
    applyMethodDecorator(LogError(), Service.prototype, 'fail');

    try { new Service().fail(); } catch { /* expected */ }
    expect(captured[0]).toContain('stack');
  });

  it('uses custom error message', () => {
    class Service {
      fail() { throw new Error('boom'); }
    }
    applyMethodDecorator(LogError({ message: 'Operation failed' }), Service.prototype, 'fail');

    try { new Service().fail(); } catch { /* expected */ }
    expect(captured[0]).toContain('Operation failed');
  });
});

// ------------------------------------------------------------------
// @LogClass
// ------------------------------------------------------------------

describe('@LogClass', () => {
  it('logs calls for all methods in the class', () => {
    class Service {
      methodA() { return 'a'; }
      methodB() { return 'b'; }
    }
    LogClass()(Service);

    const svc = new Service();
    svc.methodA();
    svc.methodB();

    const calls = captured.filter((c) => c.includes('called'));
    const completions = captured.filter((c) => c.includes('completed'));
    expect(calls.length).toBe(2);
    expect(completions.length).toBe(2);
  });

  it('excludes methods in the exclude list', () => {
    class Service {
      public_method() { return 'ok'; }
      secret() { return 'hidden'; }
    }
    LogClass({ exclude: ['secret'] })(Service);

    const svc = new Service();
    svc.public_method();
    svc.secret();

    const secretLogs = captured.filter((c) => c.includes('secret'));
    expect(secretLogs.length).toBe(0);
  });

  it('logs timing when timing option is true', () => {
    class Service {
      work() { return 1; }
    }
    LogClass({ timing: true })(Service);

    new Service().work();
    expect(captured.some((c) => c.includes('completed in'))).toBe(true);
  });

  it('handles async methods in decorated class', async () => {
    class Service {
      async fetch() { return 'data'; }
    }
    LogClass()(Service);

    await new Service().fetch();
    expect(captured.some((c) => c.includes('fetch called'))).toBe(true);
    expect(captured.some((c) => c.includes('fetch completed'))).toBe(true);
  });

  it('does not decorate the constructor', () => {
    class Service {
      value: number;
      constructor() { this.value = 42; }
      getVal() { return this.value; }
    }
    LogClass()(Service);

    const svc = new Service();
    const constructorLogs = captured.filter((c) => c.includes('constructor'));
    expect(constructorLogs.length).toBe(0);
    expect(svc.getVal()).toBe(42);
  });
});
