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
 * @fileoverview ContactScope — a plan-position display of nearby traffic,
 * rendered as pure SVG. Contacts are plotted by bearing and range from own
 * vehicle, coloured by closest-point-of-approach risk, with a course vector
 * whose length tracks speed.
 *
 * This is deliberately **not** a map. It takes no latitude, does no projection
 * and pulls in no basemap library — geographic AIS rendering belongs in
 * `@resq-systems/map`. A relative-bearing scope answers a different question
 * ("what is closing on me, and how fast") and stays a plot, which is why it can
 * live in a dependency-free UI package.
 *
 * Contacts are sorted nearest-first and capped, so a busy shipping lane cannot
 * turn into thousands of DOM nodes; when the cap bites, the accessible label
 * says so rather than silently under-reporting.
 *
 * Stateless and hook-free (server-renderable), zero inline styles, and every
 * color is a design token so it tracks the light / dark theme.
 *
 * Original clean-room implementation: the layout follows standard radar
 * plan-position-indicator conventions; no third-party instrument source was
 * referenced.
 *
 * @module @resq-systems/ui/components/contact-scope/contact-scope
 */

import type * as React from "react";

import {
	clamp,
	INSTRUMENT_CENTER,
	INSTRUMENT_VIEW,
	isReading,
	polar,
	safePositive,
} from "../../lib/instrument-dial.js";
import { cn } from "../../lib/utils.js";

//#region Geometry constants

const VIEW = INSTRUMENT_VIEW;
const CENTER = INSTRUMENT_CENTER;

/** Screen radius of the outermost range ring. */
const SCOPE_RADIUS = 74;
/** Range rings drawn as fractions of `rangeMax`. */
const RING_FRACTIONS = [1 / 3, 2 / 3, 1];

/** Contact marker and its course vector. */
const CONTACT_RADIUS = 3.2;
const VECTOR_MIN = 5;
const VECTOR_MAX = 16;
/** Speed in knots at which a contact's course vector reaches full length. */
const DEFAULT_SPEED_SCALE = 15;

/** Own-vehicle symbol. */
const OWN_TIP = 9;
const OWN_HALF_WIDTH = 5;

/** Contacts beyond this are dropped; the count is surfaced in the label. */
const MAX_CONTACTS = 48;

/** Fallbacks when the corresponding prop is missing or invalid. */
const DEFAULT_RANGE_MAX = 6;
const DEFAULT_CPA_WARNING = 1;
const DEFAULT_CPA_ALERT = 0.5;

const FULL_TURN = 360;

/** Color tokens (raw theme vars so they resolve in both light and dark). */
const MARK = "var(--foreground)";
const HINT = "var(--hint)";
const GRID = "var(--border)";
const NOMINAL = "var(--info)";
const CAUTION = "var(--warning)";
const DANGER = "var(--destructive)";
const OWN_SHIP = "var(--success)";

//#endregion

//#region Types

/** A tracked contact, as reported by AIS or radar. */
export interface ScopeContact {
	/** Stable identifier — MMSI, call sign or track number. */
	id: string;
	/** True bearing to the contact, in degrees clockwise from north. */
	bearing: number;
	/** Range to the contact, in the same unit as `rangeMax`. */
	range: number;
	/** Contact's course over ground in degrees true. */
	course?: number;
	/** Contact's speed over ground in knots; scales its course vector. */
	speed?: number;
	/** Closest point of approach, in the same unit as `range`. */
	cpa?: number;
	/** Time to closest point of approach, in minutes. */
	tcpa?: number;
}

//#endregion

//#region Helpers

/** Wrap a bearing into [0, 360). */
function normalizeBearing(value: number): number {
	return ((value % FULL_TURN) + FULL_TURN) % FULL_TURN;
}

/** Three-digit marine bearing, so 7° reads as `007`. */
function formatBearing(value: number): string {
	return String(Math.round(normalizeBearing(value)) % FULL_TURN).padStart(3, "0");
}

/** A contact is plottable only with a finite bearing and an in-scope range. */
function isPlottable(contact: ScopeContact, rangeMax: number): boolean {
	return (
		isReading(contact.bearing) &&
		isReading(contact.range) &&
		contact.range >= 0 &&
		contact.range <= rangeMax
	);
}

/**
 * Whether a CPA is usable. A negative closest-approach distance is not a
 * shorter one — it is nonsense, and treating it as such would paint the nearest
 * possible risk and hijack the summary line.
 */
function isUsableCpa(cpa: number | undefined): cpa is number {
	return isReading(cpa) && cpa >= 0;
}

/** Token for a contact's closest-point-of-approach risk. */
function riskColor(cpa: number | undefined, warning: number, alert: number): string {
	if (!isUsableCpa(cpa)) return NOMINAL;
	if (cpa <= alert) return DANGER;
	if (cpa <= warning) return CAUTION;
	return NOMINAL;
}

/** The contact with the smallest reported CPA, if any reports one. */
function worstApproach(contacts: readonly ScopeContact[]): ScopeContact | null {
	let worst: ScopeContact | null = null;
	for (const contact of contacts) {
		if (!isUsableCpa(contact.cpa)) continue;
		if (worst === null || contact.cpa < (worst.cpa as number)) worst = contact;
	}
	return worst;
}

/** Build a screen-reader sentence describing the traffic picture. */
function formatScopeLabel(
	shown: readonly ScopeContact[],
	total: number,
	rangeMax: number,
	unit: string,
	alert: number,
): string {
	if (shown.length === 0) return `Contact scope, no contacts within ${rangeMax} ${unit}`;

	const countPart =
		total > shown.length
			? `showing ${shown.length} of ${total} contacts`
			: `${shown.length} contact${shown.length === 1 ? "" : "s"}`;

	const nearest = shown[0];
	const parts = [
		`${countPart} within ${rangeMax} ${unit}`,
		`nearest ${nearest.id} at ${nearest.range.toFixed(1)} ${unit} bearing ${formatBearing(nearest.bearing)} degrees`,
	];

	const worst = worstApproach(shown);
	if (worst !== null) {
		const cpa = worst.cpa as number;
		const timePart = isReading(worst.tcpa) ? ` in ${Math.round(worst.tcpa)} minutes` : "";
		parts.push(`closest point of approach ${cpa.toFixed(1)} ${unit}${timePart} for ${worst.id}`);
		if (cpa <= alert) parts.push("collision risk");
	}

	return `Contact scope, ${parts.join(", ")}`;
}

//#endregion

//#region Precomputed static elements

/** Range rings and the cardinal crosshair, built once. */
const SCOPE_GRID = (
	<g>
		{RING_FRACTIONS.map((fraction) => (
			<circle
				key={`ring-${fraction}`}
				cx={CENTER}
				cy={CENTER}
				fill="none"
				r={SCOPE_RADIUS * fraction}
				stroke={GRID}
				strokeWidth={1}
			/>
		))}
		<line
			stroke={GRID}
			strokeOpacity={0.6}
			strokeWidth={1}
			x1={CENTER - SCOPE_RADIUS}
			x2={CENTER + SCOPE_RADIUS}
			y1={CENTER}
			y2={CENTER}
		/>
		<line
			stroke={GRID}
			strokeOpacity={0.6}
			strokeWidth={1}
			x1={CENTER}
			x2={CENTER}
			y1={CENTER - SCOPE_RADIUS}
			y2={CENTER + SCOPE_RADIUS}
		/>
	</g>
);

//#endregion

//#region Component

export interface ContactScopeProps extends React.ComponentProps<"div"> {
	/** Tracked contacts. Sorted nearest-first; beyond 48 are dropped. */
	contacts?: readonly ScopeContact[];
	/** Full-scale range of the outer ring. Defaults to 6. */
	rangeMax?: number;
	/** Unit shown alongside ranges. Defaults to `"NM"`. */
	rangeUnit?: string;
	/** Own heading in degrees true; orients the own-vehicle symbol. */
	heading?: number;
	/** Plot true bearings (north-up). Set `false` for a head-up plot. Defaults to `true`. */
	northUp?: boolean;
	/** CPA at or below which a contact turns amber. Defaults to 1. */
	cpaWarning?: number;
	/** CPA at or below which a contact turns red. Defaults to 0.5. */
	cpaAlert?: number;
	/** Speed at which a contact's course vector reaches full length. Defaults to 15. */
	speedScale?: number;
	/** Overrides the auto-generated `aria-label`. */
	label?: string;
}

/**
 * Relative-bearing contact scope for AIS or radar tracks.
 *
 * @example
 * ```tsx
 * <ContactScope
 *   contacts={[{ bearing: 45, cpa: 0.3, id: "CONTACT-A", range: 1.2, tcpa: 8 }]}
 *   heading={310}
 *   className="size-64"
 * />
 * ```
 */
function ContactScope({
	contacts,
	rangeMax,
	rangeUnit = "NM",
	heading,
	northUp = true,
	cpaWarning,
	cpaAlert,
	speedScale,
	label,
	className,
	...props
}: Readonly<ContactScopeProps>) {
	const max = safePositive(rangeMax, DEFAULT_RANGE_MAX);
	const warning = safePositive(cpaWarning, DEFAULT_CPA_WARNING);
	const alert = safePositive(cpaAlert, DEFAULT_CPA_ALERT);
	const scale = safePositive(speedScale, DEFAULT_SPEED_SCALE);
	const ownHeading = isReading(heading) ? normalizeBearing(heading) : 0;

	// Nearest-first, so the cap keeps the contacts that actually matter. `filter`
	// has already produced a fresh array, so sorting it in place cannot reach the
	// caller's prop — which keeps the non-mutating guarantee without `toSorted`,
	// unavailable at this package's compilation target.
	const plottable = (contacts ?? [])
		.filter((contact) => isPlottable(contact, max))
		.sort((left, right) => left.range - right.range);
	const shown = plottable.slice(0, MAX_CONTACTS);

	const ariaLabel = label ?? formatScopeLabel(shown, plottable.length, max, rangeUnit, alert);
	const worst = worstApproach(shown);
	const worstCpa = worst === null ? null : (worst.cpa as number);

	/** Head-up plots rotate every bearing by own heading. */
	const plotBearing = (bearing: number): number =>
		northUp ? normalizeBearing(bearing) : normalizeBearing(bearing - ownHeading);

	return (
		<div
			{...props}
			aria-label={ariaLabel}
			className={cn("relative inline-block size-48 select-none", className)}
			data-slot="contact-scope"
			role="img"
		>
			<div className="absolute inset-0 overflow-hidden rounded-full border border-border bg-card">
				<svg
					aria-hidden="true"
					className="block"
					height="100%"
					viewBox={`0 0 ${VIEW} ${VIEW}`}
					width="100%"
				>
					{SCOPE_GRID}

					{shown.map((contact, index) => {
						const bearing = plotBearing(contact.bearing);
						const radius = (clamp(contact.range, 0, max) / max) * SCOPE_RADIUS;
						const point = polar(bearing, radius);
						const color = riskColor(contact.cpa, warning, alert);
						const hasVector = isReading(contact.course);
						const speedFraction = isReading(contact.speed)
							? Math.min(1, Math.abs(contact.speed) / scale)
							: 0.5;
						const vectorLength = VECTOR_MIN + speedFraction * (VECTOR_MAX - VECTOR_MIN);
						const vectorBearing = hasVector ? plotBearing(contact.course as number) : 0;
						const vectorEnd = polar(vectorBearing, vectorLength);

						return (
							<g key={`contact-${index}-${contact.id}`}>
								{hasVector ? (
									<line
										stroke={color}
										strokeLinecap="round"
										strokeWidth={1.4}
										x1={point.x}
										x2={point.x + (vectorEnd.x - CENTER)}
										y1={point.y}
										y2={point.y + (vectorEnd.y - CENTER)}
									/>
								) : null}
								<circle cx={point.x} cy={point.y} fill={color} r={CONTACT_RADIUS} />
							</g>
						);
					})}

					{/* Own vehicle, oriented by heading on a north-up plot. */}
					<polygon
						fill={OWN_SHIP}
						points={`${CENTER},${CENTER - OWN_TIP} ${CENTER - OWN_HALF_WIDTH},${CENTER + OWN_HALF_WIDTH} ${CENTER + OWN_HALF_WIDTH},${CENTER + OWN_HALF_WIDTH}`}
						transform={`rotate(${northUp ? ownHeading : 0} ${CENTER} ${CENTER})`}
					/>

					<text className="font-mono" fill={HINT} fontSize={8} textAnchor="start" x={6} y={16}>
						{northUp ? "N-UP" : "H-UP"}
					</text>
					<text className="font-mono" fill={HINT} fontSize={8} textAnchor="end" x={194} y={16}>
						{`${max} ${rangeUnit}`}
					</text>
					<text className="font-mono" fill={MARK} fontSize={10} textAnchor="start" x={6} y={192}>
						{`${shown.length} TRK`}
					</text>
					<text
						className="font-mono"
						fill={worstCpa !== null && worstCpa <= alert ? DANGER : HINT}
						fontSize={10}
						textAnchor="end"
						x={194}
						y={192}
					>
						{worstCpa === null ? "NO CPA" : `CPA ${worstCpa.toFixed(1)}`}
					</text>
				</svg>
			</div>
		</div>
	);
}

//#endregion

export { ContactScope };
