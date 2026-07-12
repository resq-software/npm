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
 * Format a number with US-English thousands separators using
 * `Intl.NumberFormat` (default options).
 *
 * Note: `Intl.NumberFormat` applies its own locale rounding for
 * presentation — by default it caps fraction digits at 3 for
 * non-integer values. Pass `Intl.NumberFormat` directly when you
 * need precise control over `minimumFractionDigits` /
 * `maximumFractionDigits`.
 *
 * @param num - The number to format. `NaN` and `Infinity` are formatted
 *   per the runtime's `Intl` implementation (typically `"NaN"` / `"∞"`).
 *
 * @returns A locale-formatted string, e.g. `formatNumber(1234567)` →
 *   `"1,234,567"`.
 *
 * @example
 * ```ts
 * formatNumber(1234567);   // → "1,234,567"
 * formatNumber(0);         // → "0"
 * formatNumber(0.5);       // → "0.5"
 * ```
 */
export function formatNumber(num: number): string {
	return new Intl.NumberFormat("en-US").format(num);
}

/**
 * Format a byte count as a binary-prefixed human-readable string
 * (Bytes / KB / MB / GB / TB), where one KB = 1024 Bytes.
 *
 * Note: the unit suffixes use SI symbols for binary prefixes, which is
 * the historical convention rather than IEC's KiB/MiB/… Pick whichever
 * matches your product surface and stick with it.
 *
 * @param bytes - Byte count. `0`, negative, `NaN`, and non-finite inputs
 *   all return `"0 Bytes"`. Values at or beyond 1 PiB are clamped to the
 *   largest available unit (`TB`) rather than overflowing the unit table.
 *
 * @returns Human-readable size to two decimal places, e.g. `"1.50 MB"`.
 *
 * @example
 * ```ts
 * formatBytes(0);             // → "0 Bytes"
 * formatBytes(1024);          // → "1 KB"
 * formatBytes(1_572_864);     // → "1.5 MB"
 * formatBytes(1_073_741_824); // → "1 GB"
 * ```
 */
export function formatBytes(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes <= 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"] as const;
	const rawIndex = Math.floor(Math.log(bytes) / Math.log(k));
	const i = Math.min(Math.max(rawIndex, 0), sizes.length - 1);
	return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`;
}

/**
 * Format a fractional value (0–1 range) as a percentage with one
 * decimal place.
 *
 * @param value - Fractional value where `1` = 100%. Inputs outside the
 *   `[0, 1]` range are formatted as-is (e.g. `formatPercent(2)` →
 *   `"200.0%"`); the helper does not clamp.
 *
 * @returns Percentage string with one decimal place.
 *
 * @example
 * ```ts
 * formatPercent(0);     // → "0.0%"
 * formatPercent(0.5);   // → "50.0%"
 * formatPercent(0.123); // → "12.3%"
 * formatPercent(1);     // → "100.0%"
 * ```
 */
export function formatPercent(value: number): string {
	return `${(value * 100).toFixed(1)}%`;
}
