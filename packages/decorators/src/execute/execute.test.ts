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

import { describe, expect, test } from 'vitest';
import { selfExecute } from './execute.js';

describe('selfExecute', () => {
  test('returns the constructor', () => {
    let instantiated = false;

    class Svc {
      constructor() {
        instantiated = true;
      }
    }

    const result = selfExecute(Svc);
    expect(result).toBe(Svc);
    expect(instantiated).toBe(true);
  });

  test('creates an instance as side effect', () => {
    const instances: object[] = [];

    class Svc {
      constructor() {
        instances.push(this);
      }
    }

    selfExecute(Svc);
    expect(instances.length).toBe(1);
    expect(instances[0]).toBeInstanceOf(Svc);
  });

  test('can be used as decorator', () => {
    let constructed = false;

    @selfExecute
    class AutoService {
      constructor() {
        constructed = true;
      }
    }

    expect(constructed).toBe(true);
    // Class is still usable as a constructor
    const instance = new AutoService();
    expect(instance).toBeInstanceOf(AutoService);
  });
});
