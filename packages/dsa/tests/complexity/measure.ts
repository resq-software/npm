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

import {
  perf,
  type AlgorithmCandidate,
  type ComplexityDomain,
  type AveragedTestResultPerSize,
} from '@jsheaven/perf';

export type { AlgorithmCandidate, ComplexityDomain };

/**
 * Canonical Big-O notation strings returned by @jsheaven/perf in
 * ComplexityDomain.scientificNotation.
 */
export type BigONotation =
  | 'O(1)'
  | 'O(log n)'
  | 'O(n)'
  | 'O(n log n)'
  | 'O(n\u02E3)'   // polynomial
  | 'O(X\u207F)'   // exponential
  | 'O(n!)';

export interface PerformanceResult {
  duration: number;
  complexity: number;
  estimatedDomains: ComplexityDomain[];
}

/**
 * Measures algorithmic performance and estimates Big-O complexity
 * using @jsheaven/perf.
 *
 * @param algorithms - One or more algorithm candidates to measure
 * @returns Record keyed by algorithm name with duration and estimated domains
 */
export const measurePerformance = async (
  algorithms: AlgorithmCandidate | AlgorithmCandidate[],
): Promise<Record<string, PerformanceResult>> => {
  const algorithmArray = Array.isArray(algorithms) ? algorithms : [algorithms];
  const results = await perf(algorithmArray);
  return Object.entries(results).reduce(
    (acc, [name, data]) => {
      const d = data as AveragedTestResultPerSize;
      return {
        ...acc,
        [name]: {
          duration: d.duration,
          complexity: d.complexity,
          estimatedDomains: d.estimatedDomains,
        },
      };
    },
    {} as Record<string, PerformanceResult>,
  );
};

/**
 * Checks whether any of the estimated complexity domains match one of the
 * expected Big-O notations.
 */
export const domainMatchesAny = (
  domains: ComplexityDomain[],
  expected: BigONotation[],
): boolean => {
  return domains.some((d) => expected.includes(d.scientificNotation as BigONotation));
};
