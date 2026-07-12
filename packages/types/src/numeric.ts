/**
 * Copyright 2026 ResQ Systems, Inc.
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
 * @fileoverview Branded bounded numerics.
 *
 * Raw `number` says nothing about its range. A rate-limit window of `-1`, a
 * bloom-filter error rate of `2`, a `0`-byte secure token, a retry count that
 * is secretly a float — all pass `: number` and blow up (or silently misbehave)
 * at runtime. These brands + smart constructors move the bound to the type
 * boundary: a function that takes a {@link PositiveInt} can never receive `0`,
 * `-3`, `1.5`, or `NaN` without an explicit, auditable construction step.
 */

import { type Brand, brandRefiner } from "./brand.js";

/** A finite integer strictly greater than zero (`1, 2, 3, …`). */
export type PositiveInt = Brand<number, "PositiveInt">;

/** A finite integer greater than or equal to zero (`0, 1, 2, …`). */
export type NonNegativeInt = Brand<number, "NonNegativeInt">;

/** A finite duration in milliseconds, strictly greater than zero. */
export type PositiveMillis = Brand<number, "PositiveMillis">;

/**
 * A finite real number strictly greater than zero — rates, weights, and scale
 * factors that may legitimately be fractional (e.g. `0.5` requests/second),
 * unlike {@link PositiveInt}.
 */
export type PositiveNumber = Brand<number, "PositiveNumber">;

/**
 * A real number in the closed unit interval `[0, 1]` — probabilities, error
 * rates, fractions, ratios.
 */
export type UnitInterval = Brand<number, "UnitInterval">;

const positiveInt = brandRefiner<number, "PositiveInt">(
	(n) => Number.isInteger(n) && n > 0,
	"PositiveInt (integer > 0)",
);
const nonNegativeInt = brandRefiner<number, "NonNegativeInt">(
	(n) => Number.isInteger(n) && n >= 0,
	"NonNegativeInt (integer >= 0)",
);
const positiveMillis = brandRefiner<number, "PositiveMillis">(
	(n) => Number.isFinite(n) && n > 0,
	"PositiveMillis (finite > 0)",
);
const positiveNumber = brandRefiner<number, "PositiveNumber">(
	(n) => Number.isFinite(n) && n > 0,
	"PositiveNumber (finite > 0)",
);
const unitInterval = brandRefiner<number, "UnitInterval">(
	(n) => Number.isFinite(n) && n >= 0 && n <= 1,
	"UnitInterval ([0, 1])",
);

/** Type guard for {@link PositiveInt}. */
export const isPositiveInt: (n: number) => n is PositiveInt = positiveInt.is;
/** Assert `n` is a {@link PositiveInt}, throwing `TypeError` otherwise. */
export const toPositiveInt: (n: number) => PositiveInt = positiveInt.from;
/** Return `n` as a {@link PositiveInt}, or `null` when out of range. */
export const coercePositiveInt: (n: number) => PositiveInt | null = positiveInt.coerce;

/** Type guard for {@link NonNegativeInt}. */
export const isNonNegativeInt: (n: number) => n is NonNegativeInt = nonNegativeInt.is;
/** Assert `n` is a {@link NonNegativeInt}, throwing `TypeError` otherwise. */
export const toNonNegativeInt: (n: number) => NonNegativeInt = nonNegativeInt.from;
/** Return `n` as a {@link NonNegativeInt}, or `null` when out of range. */
export const coerceNonNegativeInt: (n: number) => NonNegativeInt | null = nonNegativeInt.coerce;

/** Type guard for {@link PositiveMillis}. */
export const isPositiveMillis: (n: number) => n is PositiveMillis = positiveMillis.is;
/** Assert `n` is a {@link PositiveMillis}, throwing `TypeError` otherwise. */
export const toPositiveMillis: (n: number) => PositiveMillis = positiveMillis.from;
/** Return `n` as a {@link PositiveMillis}, or `null` when out of range. */
export const coercePositiveMillis: (n: number) => PositiveMillis | null = positiveMillis.coerce;

/** Type guard for {@link PositiveNumber}. */
export const isPositiveNumber: (n: number) => n is PositiveNumber = positiveNumber.is;
/** Assert `n` is a {@link PositiveNumber}, throwing `TypeError` otherwise. */
export const toPositiveNumber: (n: number) => PositiveNumber = positiveNumber.from;
/** Return `n` as a {@link PositiveNumber}, or `null` when out of range. */
export const coercePositiveNumber: (n: number) => PositiveNumber | null = positiveNumber.coerce;

/** Type guard for {@link UnitInterval}. */
export const isUnitInterval: (n: number) => n is UnitInterval = unitInterval.is;
/** Assert `n` is a {@link UnitInterval}, throwing `TypeError` otherwise. */
export const toUnitInterval: (n: number) => UnitInterval = unitInterval.from;
/** Return `n` as a {@link UnitInterval}, or `null` when out of range. */
export const coerceUnitInterval: (n: number) => UnitInterval | null = unitInterval.coerce;
