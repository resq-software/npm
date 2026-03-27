/*
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

import { describe, expect, test } from 'vitest';
import type { Coordinates2D, Coordinates3D } from '../src/distance.js';
import { Distance } from '../src/distance.js';

describe('Distance', () => {
  describe('euclidean', () => {
    test('calculates distance between two 2D points', () => {
      const p1: Coordinates2D = { lat: 0, lng: 0 };
      const p2: Coordinates2D = { lat: 3, lng: 4 };
      expect(Distance.euclidean(p1, p2)).toBeCloseTo(5, 5);
    });

    test('returns 0 for identical points', () => {
      const p: Coordinates2D = { lat: 5, lng: 5 };
      expect(Distance.euclidean(p, p)).toBeCloseTo(0, 5);
    });

    test('throws for non-finite coordinates', () => {
      const p1: Coordinates2D = { lat: Number.NaN, lng: 0 };
      const p2: Coordinates2D = { lat: 0, lng: 0 };
      expect(() => Distance.euclidean(p1, p2)).toThrow();
    });
  });

  describe('haversine', () => {
    test('calculates distance between NYC and London', () => {
      const nyc: Coordinates2D = { lat: 40.7128, lng: -74.006 };
      const london: Coordinates2D = { lat: 51.5074, lng: -0.1278 };
      const km = Distance.haversine(nyc, london);
      // Known distance is ~5570 km
      expect(km).toBeGreaterThan(5500);
      expect(km).toBeLessThan(5600);
    });

    test('returns 0 for identical points', () => {
      const p: Coordinates2D = { lat: 40.7128, lng: -74.006 };
      expect(Distance.haversine(p, p)).toBeCloseTo(0, 5);
    });

    test('throws for out-of-range latitude', () => {
      const p1: Coordinates2D = { lat: 91, lng: 0 };
      const p2: Coordinates2D = { lat: 0, lng: 0 };
      expect(() => Distance.haversine(p1, p2)).toThrow();
    });

    test('throws for out-of-range longitude', () => {
      const p1: Coordinates2D = { lat: 0, lng: 181 };
      const p2: Coordinates2D = { lat: 0, lng: 0 };
      expect(() => Distance.haversine(p1, p2)).toThrow();
    });
  });

  describe('manhattan', () => {
    test('calculates sum of absolute differences', () => {
      const p1: Coordinates2D = { lat: 0, lng: 0 };
      const p2: Coordinates2D = { lat: 3, lng: 4 };
      expect(Distance.manhattan(p1, p2)).toBeCloseTo(7, 5);
    });
  });

  describe('chebyshev', () => {
    test('calculates max of absolute differences', () => {
      const p1: Coordinates2D = { lat: 0, lng: 0 };
      const p2: Coordinates2D = { lat: 3, lng: 7 };
      expect(Distance.chebyshev(p1, p2)).toBeCloseTo(7, 5);
    });
  });

  describe('threed', () => {
    test('calculates 3D distance with altitude', () => {
      const a: Coordinates3D = { lat: 0, lng: 0, alt: 0 };
      const b: Coordinates3D = { lat: 0, lng: 0, alt: 100 };
      const dist = Distance.threed(a, b);
      expect(dist).toBeGreaterThan(0);
    });

    test('throws for missing altitude', () => {
      const a = { lat: 0, lng: 0 } as Coordinates3D;
      const b: Coordinates3D = { lat: 0, lng: 0, alt: 100 };
      expect(() => Distance.threed(a, b)).toThrow();
    });
  });

  describe('calculate', () => {
    test('dispatches to euclidean', () => {
      const p1: Coordinates2D = { lat: 0, lng: 0 };
      const p2: Coordinates2D = { lat: 3, lng: 4 };
      const result = Distance.calculate('euclidean', p1, p2);
      expect(result).toBeCloseTo(5, 5);
    });

    test('dispatches to haversine', () => {
      const p1: Coordinates2D = { lat: 40.7128, lng: -74.006 };
      const p2: Coordinates2D = { lat: 51.5074, lng: -0.1278 };
      const result = Distance.calculate('haversine', p1, p2);
      expect(result).toBeGreaterThan(5500);
    });

    test('dispatches to manhattan', () => {
      const p1: Coordinates2D = { lat: 1, lng: 2 };
      const p2: Coordinates2D = { lat: 4, lng: 6 };
      expect(Distance.calculate('manhattan', p1, p2)).toBeCloseTo(7, 5);
    });
  });

  describe('safe', () => {
    test('returns valid result for good coordinates', () => {
      const p1: Coordinates2D = { lat: 0, lng: 0 };
      const p2: Coordinates2D = { lat: 3, lng: 4 };
      const result = Distance.calculateSafe('euclidean', p1, p2);
      expect(result.valid).toBe(true);
      expect(result.distance).toBeCloseTo(5, 5);
      expect(result.formula).toBe('euclidean');
    });

    test('returns invalid result for bad coordinates', () => {
      const p1: Coordinates2D = { lat: Number.NaN, lng: 0 };
      const p2: Coordinates2D = { lat: 0, lng: 0 };
      const result = Distance.calculateSafe('euclidean', p1, p2);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
