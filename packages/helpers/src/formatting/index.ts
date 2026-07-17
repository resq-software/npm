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
 * @fileoverview Locale-aware formatting helpers for
 * `@resq-systems/helpers/formatting`.
 *
 * - `date` — `Intl.DateTimeFormat`-backed date/time presentation,
 *   relative time, week/quarter helpers.
 * - `number` — currency, compact, percentage, and unit formatting via
 *   `Intl.NumberFormat`.
 * - `string` — case conversions, slugification, truncation, and
 *   plurals.
 *
 * Pure functions; no DOM or Node-only globals. Safe in SSR and worker
 * contexts.
 *
 * @module @resq-systems/helpers/formatting
 */

export * from "./date.js";
export type * from "./date.types.js";
export * from "./number.js";
export * from "./string.js";
