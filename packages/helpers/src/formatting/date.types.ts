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
 * Format options for date display — the subset of `Intl.DateTimeFormat`
 * component options the formatters expose.
 *
 * Every field is optional and passed straight through to `Intl`: only the
 * components you set appear in the output, and the set of present fields
 * determines the shape of the result (e.g. `month` + `year` yields `"Jan 2023"`,
 * adding `hour` + `minute` yields a date-time). The token values match `Intl`'s
 * own vocabulary.
 */
export interface DateFormatOptions {
	/** `"short"` → `Jan`, `"long"` → `January`, `"numeric"` → `1`. */
	month?: "short" | "long" | "numeric";
	/** `"numeric"` → `2023`, `"2-digit"` → `23`. */
	year?: "numeric" | "2-digit";
	/** `"numeric"` → `5`, `"2-digit"` → `05`. */
	day?: "numeric" | "2-digit";
	/** Hour digits; rendered in the formatter's fixed UTC zone. */
	hour?: "numeric" | "2-digit";
	/** Minute digits, e.g. `"2-digit"` → `07`. */
	minute?: "numeric" | "2-digit";
}
