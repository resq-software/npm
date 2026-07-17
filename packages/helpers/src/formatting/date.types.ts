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
 * @fileoverview Options type for the date formatters, mirroring the subset of
 * `Intl.DateTimeFormat` fields the helpers expose.
 *
 * @module @resq-systems/helpers/formatting/date.types
 */

/**
 * Format options for date display.
 *
 * @property month - Month display format.
 * @property year - Year display format.
 * @property day - Day display format.
 * @property hour - Hour display format.
 * @property minute - Minute display format.
 */
export interface DateFormatOptions {
	month?: "short" | "long" | "numeric";
	year?: "numeric" | "2-digit";
	day?: "numeric" | "2-digit";
	hour?: "numeric" | "2-digit";
	minute?: "numeric" | "2-digit";
}
