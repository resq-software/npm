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
 * @fileoverview ExecTime decorator - measures and reports the execution time of methods.
 * Useful for performance monitoring and debugging slow operations.
 *
 * @module @resq/typescript/decorators/exec-time
 *
 * @example
 * ```typescript
 * class DataService {
 *   @execTime()
 *   async fetchLargeDataset(): Promise<Data[]> {
 *     return await database.query('SELECT * FROM large_table');
 *   }
 *
 *   @execTime('Heavy computation')
 *   computePrimes(n: number): number[] {
 *     // ... computation
 *   }
 * }
 * ```
 *
 * @copyright Copyright (c) 2026 ResQ
 * @license MIT
 */

import type { AsyncMethod, Method } from '../types.js';
import { execTimeFn } from './exec-time.fn.js';
import type { ReportFunction } from './exec-time.types.js';

/**
 * Decorator that measures and reports the execution time of methods.
 * Supports both legacy (TypeScript) and standard (Stage 3) decorator formats.
 *
 * @param {ReportFunction | string} [arg] - Optional reporter function or label string
 * @returns {any} The decorator function
 *
 * @throws {Error} When applied to a non-method property
 *
 * @example
 * ```typescript
 * class PerformanceMonitor {
 *   // Uses default console reporter
 *   @execTime()
 *   processData(data: any[]): void {
 *     // Processing...
 *   }
 *
 *   // Uses custom label
 *   @execTime('Database Query')
 *   async fetchUsers(): Promise<User[]> {
 *     return db.users.findAll();
 *   }
 *
 *   // Uses custom reporter function
 *   @execTime((data) => {
 *     metrics.histogram('method_duration', data.execTime);
 *     console.log(`${data.execTime}ms: ${data.args.join(', ')}`);
 *   })
 *   heavyCalculation(input: number): number {
 *     return input ** 2;
 *   }
 * }
 * ```
 */
export function execTime<T = any>(arg?: ReportFunction | string): any {
  return (
    targetOrValue: unknown,
    propertyNameOrContext: keyof T | ClassMethodDecoratorContext,
    descriptor?: TypedPropertyDescriptor<any>,
  ): any => {
    // Legacy decorator
    if (descriptor) {
      if (descriptor.value) {
        descriptor.value = execTimeFn(descriptor.value, arg);
        return descriptor;
      }
      throw new Error('@execTime is applicable only on methods.');
    }

    // Standard decorator (Stage 3)
    // targetOrValue is the method itself
    // propertyNameOrContext is the context
    const method = targetOrValue as Method | AsyncMethod;
    const context = propertyNameOrContext as ClassMethodDecoratorContext;

    if (context.kind === 'method') {
      return execTimeFn(method, arg);
    }

    throw new Error('@execTime is applicable only on methods.');
  };
}
