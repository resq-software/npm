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
 * @fileoverview Locale-aware date/time formatting built on `Intl.DateTimeFormat`
 * (fixed to UTC to avoid SSR hydration mismatches): absolute dates, periods, and
 * relative time.
 *
 * @module @resq-systems/helpers/formatting/date
 */

import type { DateFormatOptions } from "./date.types.js";

/**
 * Format a date to a consistent, UTC-fixed string to prevent hydration
 * mismatches. Invalid dates return `"Invalid date"` rather than throwing.
 *
 * @param date - The date to format (ISO string or `Date` object).
 * @param options - Optional formatting options.
 * @returns The formatted date string, or `"Invalid date"` when the input cannot be parsed.
 * @example
 * ```ts
 * formatDate('2023-01-15T10:00:00Z', { month: 'short', year: 'numeric' })
 * // Returns: "Jan 2023"
 * ```
 */
export function formatDate(
	date: string | Date,
	options: DateFormatOptions = {
		month: "short",
		year: "numeric",
	},
): string {
	try {
		const dateObj = typeof date === "string" ? new Date(date) : date;

		if (Number.isNaN(dateObj.getTime())) {
			return "Invalid date";
		}

		const formatter = new Intl.DateTimeFormat("en-US", {
			...options,
			timeZone: "UTC",
		});

		return formatter.format(dateObj);
	} catch (error) {
		console.error("Error formatting date:", error);
		return "Invalid date";
	}
}

/**
 * Formats a date period (start to end or start to present).
 *
 * @param startDate - The start date.
 * @param endDate - The end date, or `null` for ongoing.
 * @param isCurrent - Whether the period is current/ongoing.
 * @returns The formatted date period string.
 * @example
 * ```ts
 * formatDatePeriod('2023-01-01', '2023-12-31')
 * // Returns: "Jan 2023 - Dec 2023"
 *
 * formatDatePeriod('2023-01-01', null, true)
 * // Returns: "Jan 2023 - Present"
 * ```
 */
export function formatDatePeriod(
	startDate: string | Date,
	endDate?: string | Date | null,
	isCurrent: boolean = false,
): string {
	const formattedStart = formatDate(startDate, { month: "short", year: "numeric" });

	if (isCurrent) {
		return `${formattedStart} - Present`;
	}

	if (endDate) {
		const formattedEnd = formatDate(endDate, { month: "short", year: "numeric" });
		return `${formattedStart} - ${formattedEnd}`;
	}

	return `${formattedStart} - Present`;
}

/**
 * Formats a full date with time for display.
 *
 * @param date - The date to format.
 * @returns The formatted date and time string.
 * @example
 * ```ts
 * formatDateTime('2023-01-15T14:30:00Z')
 * // Returns: "January 15, 2023, 02:30 PM"
 * ```
 */
export function formatDateTime(date: string | Date): string {
	return formatDate(date, {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

/**
 * Formats a date for display without time.
 *
 * @param date - The date to format.
 * @returns The formatted date string.
 * @example
 * ```ts
 * formatDateOnly('2023-01-15')
 * // Returns: "January 15, 2023"
 * ```
 */
export function formatDateOnly(date: string | Date): string {
	return formatDate(date, {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

/**
 * Formats a month and year for display.
 *
 * @param date - The date to format.
 * @returns The formatted month and year string.
 * @example
 * ```ts
 * formatMonthYear('2023-01-15')
 * // Returns: "Jan 2023"
 * ```
 */
export function formatMonthYear(date: string | Date): string {
	return formatDate(date, {
		month: "short",
		year: "numeric",
	});
}

/**
 * Formats a relative time string (e.g. "2 days ago").
 *
 * @param date - The date to format.
 * @returns The relative time string.
 */
export function formatRelativeTime(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date;
	const now = new Date();
	const diff = now.getTime() - d.getTime();

	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
	if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
	if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
	return "Just now";
}
