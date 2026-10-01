/**
 * Copyright 2026 ResQ Systems, Inc.
 * SPDX-License-Identifier: Apache-2.0
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
 * Contact assessment for a USV in a harbour approach — @resq-systems/nav.
 *
 * The point of this example is not the trigonometry. It is the REFUSALS.
 *
 * nav will not invent a number it has no basis for, because "a plausible number
 * with no basis is worse than a visibly absent one — only the absent one prompts
 * the operator to look elsewhere". Refusal arrives in four distinct shapes, and
 * all four are on screen below:
 *
 *   1. `null`            — the whole solution is unavailable (`closestApproach`).
 *   2. `undefined`       — one scalar reading is unknowable (everything derived).
 *   3. an ABSENT FIELD   — `observedCurrent` omits `setDeg` at zero drift, because
 *                          reporting `0` would claim the current sets due north.
 *   4. a PESSIMISTIC answer — `isStale(undefined, now)` is `true`; a contact with no
 *                          CPA sorts by range rather than being assumed safe.
 *
 * Note what nav is NOT: it is not a navigation aid. `distanceNm`/`bearingDeg` are
 * haversine (~0.5% off WGS-84), `toLocalNm` is equirectangular and only good over
 * tens of nautical miles, and `closestApproach` is a constant-velocity PROJECTION,
 * not a prediction — which is why the result carries a literal `model` field.
 *
 * Run:  bun --filter example-nav-contacts start
 */

import {
	DEFAULT_MAX_AGE_MS,
	type LatLon,
	type LocalOffset,
	type RankableContact,
	bearingDeg,
	clamp,
	closestApproach,
	compareByRisk,
	courseToVelocity,
	crabAngleDeg,
	crossTrackNm,
	differentialDriveMotion,
	distanceNm,
	enduranceHours,
	formatBearing,
	isStale,
	isUsableCpa,
	knotsToMs,
	metresToFeet,
	nauticalMilesToMetres,
	nearestByRange,
	observedCurrent,
	optional,
	rateOfTurnDegPerSec,
	readingAge,
	slipRatio,
	stoppingDistanceM,
	toLocalNm,
	turnRadiusM,
	worstApproach,
} from "@resq-systems/nav";

// ──────────────────────────────────────────────────────────────────────
// 0. THE DISPLAY CONTRACT
//
// Half of nav's value is thrown away by a console that renders `undefined`
// as 0. One helper, used everywhere, keeps an absent reading visibly absent.
// ──────────────────────────────────────────────────────────────────────

/** What an absent reading looks like. Never a zero, never a blank. */
const ABSENT = "——";

const show = (value: number | undefined, digits = 1): string =>
	value === undefined ? ABSENT : value.toFixed(digits);

const bearing = (value: number | undefined): string =>
	value === undefined ? ABSENT : formatBearing(value);

/** Counts every refusal this run produced, tallied in the ledger at the end. */
const refusals: string[] = [];
const refused = (what: string, why: string): void => {
	refusals.push(`${what.padEnd(34)} ${why}`);
};

// ──────────────────────────────────────────────────────────────────────
// 1. THE PICTURE — own ship, and the contacts around her
// ──────────────────────────────────────────────────────────────────────

/** Fixed instant so the staleness section is reproducible run to run. */
const NOW = Date.UTC(2026, 2, 14, 9, 30, 0);

interface OwnShip {
	readonly name: string;
	readonly position: LatLon;
	/** Where the bow points, degrees true. `undefined` if the compass has failed. */
	readonly headingTrueDeg?: number;
	/** Where she actually travels over ground, degrees true. */
	readonly courseOverGroundDeg: number;
	readonly speedOverGroundKn: number;
	/** Speed through the water from the paddlewheel log. */
	readonly speedThroughWaterKn: number;
}

const own: OwnShip = {
	courseOverGroundDeg: 292,
	headingTrueDeg: 285,
	name: "RESQ-USV-04",
	position: { latitude: 37.808, longitude: -122.465 },
	speedOverGroundKn: 11.4,
	speedThroughWaterKn: 10.6,
};

interface Contact {
	readonly id: string;
	readonly source: "ais" | "radar" | "fused";
	readonly position: LatLon;
	/** Course over ground, degrees true. Absent when the sensor never reported one. */
	readonly courseDeg?: number;
	/** Speed over ground, knots. Absent when the sensor never reported one. */
	readonly speedKn?: number;
	/** Epoch ms of the report. Absent for a track carrying no timestamp at all. */
	readonly observedAt?: number;
}

const contacts: readonly Contact[] = [
	// A ferry on a reciprocal-ish track, reporting everything. The easy case.
	{
		courseDeg: 215,
		id: "AIS-368",
		observedAt: NOW - 2_000,
		position: { latitude: 37.824, longitude: -122.442 },
		source: "ais",
		speedKn: 18,
	},
	// A radar paint with no motion solution yet. The interesting case: the console
	// knows WHERE it is and nothing about where it is going.
	{
		id: "RDR-112",
		observedAt: NOW - 1_500,
		position: { latitude: 37.813, longitude: -122.478 },
		source: "radar",
	},
	// A moored barge. Zero speed is a real answer, not a missing one — nav solves it.
	{
		courseDeg: 0,
		id: "AIS-907",
		observedAt: NOW - 40_000,
		position: { latitude: 37.802, longitude: -122.448 },
		source: "ais",
		speedKn: 0,
	},
	// A small craft crossing from the south, fused from AIS + radar, but the fusion
	// never stamped the track. An unknown age is not a young one — see §6.
	{
		courseDeg: 75,
		id: "FUSED-21",
		position: { latitude: 37.796, longitude: -122.501 },
		source: "fused",
		speedKn: 22,
	},
];

// ──────────────────────────────────────────────────────────────────────
// 2. RANGE AND BEARING — the part that always has an answer
// ──────────────────────────────────────────────────────────────────────

/**
 * A contact worked up into the numbers an operator reads.
 *
 * `range` and `cpa` are named to satisfy {@link RankableContact}, so the whole
 * record can go straight into `compareByRisk` without a projection step.
 */
interface Assessment extends RankableContact {
	readonly contact: Contact;
	readonly bearingDeg: number;
	/** `null` when nav declined to solve the geometry at all. */
	readonly approach: ReturnType<typeof closestApproach>;
}

/** Velocity of `contact` relative to own ship, east/north in knots. */
const relativeVelocity = (contact: Contact, ownVelocity: LocalOffset): LocalOffset => {
	// NOT `?? 0`. A missing course is not a course of 000, and a missing speed is not
	// a stationary target — substituting either here is exactly how a console ends up
	// drawing a confident CPA for a contact nothing has ever measured the motion of.
	const motion = courseToVelocity(contact.courseDeg ?? Number.NaN, contact.speedKn ?? Number.NaN);
	return { east: motion.east - ownVelocity.east, north: motion.north - ownVelocity.north };
};

const ownVelocity = courseToVelocity(own.courseOverGroundDeg, own.speedOverGroundKn);

const assessments: readonly Assessment[] = contacts.map((contact) => {
	const approach = closestApproach(
		toLocalNm(own.position, contact.position),
		relativeVelocity(contact, ownVelocity),
	);
	if (approach === null) {
		refused(`closestApproach(${contact.id})`, "null — no motion reported, so no solution");
	}
	return {
		approach,
		bearingDeg: bearingDeg(own.position, contact.position),
		contact,
		cpa: approach?.cpa,
		range: distanceNm(own.position, contact.position),
	};
});

console.log(`\n${own.name} — contact picture at ${new Date(NOW).toISOString()}\n`);
console.log("  ID         SRC     BRG   RNG nm   RNG m    CPA nm   TCPA min   TREND");
console.log("  ─────────────────────────────────────────────────────────────────────────");
for (const item of assessments) {
	const trend = item.approach === null ? "unknown" : item.approach.opening ? "opening" : "closing";
	console.log(
		`  ${item.contact.id.padEnd(10)} ${item.contact.source.padEnd(7)} ` +
			`${bearing(item.bearingDeg)}  ${show(item.range, 2).padStart(7)}  ` +
			`${show(nauticalMilesToMetres(item.range), 0).padStart(6)}   ` +
			`${show(item.cpa, 2).padStart(6)}   ${show(item.approach?.tcpa, 1).padStart(8)}   ${trend}`,
	);
}

// RDR-112 prints `——` in both CPA columns, and that absence is the whole feature.
// Note the ferry's bearing renders as a three-digit marine group: 7° is `007`, not
// `7`, because that is how a bearing is spoken and it keeps the column aligned.

// Every solution states the assumption it rests on, so a consumer cannot forget it.
const ferry = assessments[0];
if (ferry?.approach !== null && ferry?.approach !== undefined) {
	console.log(`\n  ${ferry.contact.id} solution model: ${ferry.approach.model}`);
	// Conversions live in one place for the same reason: an inlined `/ 0.514444` in
	// one adapter and a `* 1.94384` in another is where units bugs come from, and a
	// units bug in a telemetry console is a wrong number that looks entirely plausible.
	console.log(
		`  own speed ${show(own.speedOverGroundKn)} kn = ${show(knotsToMs(own.speedOverGroundKn), 2)} m/s`,
	);
}

// ──────────────────────────────────────────────────────────────────────
// 3. RANKING — a contact with no CPA is not a safe contact
// ──────────────────────────────────────────────────────────────────────

// `compareByRisk` puts usable CPAs first, smallest first, and falls back to range
// for the rest. It deliberately does NOT sort the unsolved contact to the bottom:
// a contact that is not reporting motion is often the one worth looking at.
const ranked = [...assessments].sort(compareByRisk);

console.log("\n  Risk order (CPA first, then proximity):");
for (const [index, item] of ranked.entries()) {
	const basis = isUsableCpa(item.cpa) ? `cpa ${show(item.cpa, 2)} nm` : `range only, cpa ${ABSENT}`;
	console.log(`    ${index + 1}. ${item.contact.id.padEnd(10)} ${basis}`);
}

const nearest = nearestByRange(assessments);
const worst = worstApproach(assessments);
console.log(`\n  Nearest by range : ${nearest?.contact.id ?? ABSENT}`);
// `worstApproach` guarantees the winner has a usable CPA, but the type cannot say so —
// it is still `number | undefined` here, so render it through the same helper.
console.log(`  Worst approach   : ${worst?.contact.id ?? ABSENT} at ${show(worst?.cpa, 2)} nm`);

// A negative CPA is not a closer one, it is nonsense. `isUsableCpa` rejects it rather
// than letting it hijack the top of the list.
const corrupt: RankableContact = { cpa: -0.4, range: 6.1 };
console.log(`  isUsableCpa(-0.4): ${isUsableCpa(corrupt.cpa)}`);
refused("isUsableCpa(-0.4)", "false — a negative CPA is nonsense, not a nearer one");

// ──────────────────────────────────────────────────────────────────────
// 4. DERIVED READOUTS — on the water
// ──────────────────────────────────────────────────────────────────────

// Crab angle: the gap between where the bow points and where the hull travels.
// On the water that divergence IS the current, which is why it earns a readout
// instead of leaving the operator to subtract two gauges by eye.
const crab = crabAngleDeg(own.headingTrueDeg, own.courseOverGroundDeg);
console.log(`\n  Crab angle           : ${show(crab)}°  (+ is track to starboard of the bow)`);

// Lose the compass and the readout goes away. It does not fall back to 0°.
const blindCrab = crabAngleDeg(undefined, own.courseOverGroundDeg);
if (blindCrab === undefined) refused("crabAngleDeg(no heading)", "undefined — not 0°");
console.log(`  Crab, compass failed : ${show(blindCrab)}`);

// Set and drift observed from the difference between ground track and water track.
// This is an OBSERVATION of what the water did, not a forecast of what it will do.
const ground = courseToVelocity(own.courseOverGroundDeg, own.speedOverGroundKn);
const water = courseToVelocity(
	own.headingTrueDeg ?? own.courseOverGroundDeg,
	own.speedThroughWaterKn,
);
const current = observedCurrent(ground, water);
console.log(
	`  Current              : ${show(current?.drift, 2)} kn toward ${bearing(current?.setDeg)}`,
);

// Slack water: drift is exactly 0, so `setDeg` is ABSENT rather than 0. A zero vector
// has no direction, and `set 000` would claim the current flows due north.
const slack = observedCurrent(ground, ground);
console.log(
	`  Slack water          : drift ${show(slack?.drift, 2)} kn, set ${bearing(slack?.setDeg)}`,
);
if (slack !== undefined && slack.setDeg === undefined) {
	refused("observedCurrent(slack).setDeg", "absent field — zero drift has no direction");
}

// Cross-track error against the declared leg. nav stops at the error and does not
// emit a correction: a correction is a guidance law, and guidance laws issue commands.
const legStart: LatLon = { latitude: 37.7955, longitude: -122.4405 };
const legEnd: LatLon = { latitude: 37.8265, longitude: -122.5255 };
const xte = crossTrackNm(legStart, legEnd, own.position);
console.log(`  Cross-track          : ${show(xte, 3)} nm  (+ is starboard of the track)`);

// A leg with no length has no track to be off, so there is no error to report.
const degenerate = crossTrackNm(legStart, legStart, own.position);
if (degenerate === undefined)
	refused("crossTrackNm(zero-length leg)", "undefined — no track exists");

// ──────────────────────────────────────────────────────────────────────
// 5. DERIVED READOUTS — on the ground
//
// Same package, same convention: the recovery rover shares the console.
// ──────────────────────────────────────────────────────────────────────

const roverSpeedMs = 1.4;

// Stopping distance stays decomposed. The reaction term — sensing, filtering,
// planning, link and actuator delay — dominates at speed, so it is shown rather
// than folded into a single braking figure.
const stopping = stoppingDistanceM({
	brakingMs2: 2.2,
	latencyS: 0.45,
	marginM: 1.5,
	speedMs: roverSpeedMs,
});
// Note the conversion is guarded rather than `metresToFeet(stopping ?? 0)`. Defaulting
// at the display layer undoes the refusal just as thoroughly as defaulting at the source.
const stoppingFt = stopping === undefined ? undefined : metresToFeet(stopping);
console.log(`\n  Rover stopping dist  : ${show(stopping, 2)} m (${show(stoppingFt, 1)} ft)`);

// Slip is refused on a stationary wheel: a stopped wheel has no defined slip, and
// returning 0 there would read as perfect traction at the moment it is least true.
console.log(`  Slip, driving        : ${show(slipRatio(1.2, 1.5), 2)}`);
const stuck = slipRatio(0, 0);
if (stuck === undefined) refused("slipRatio(wheel stopped)", "undefined — 0 would read as grip");
console.log(`  Slip, wheel stopped  : ${show(stuck, 2)}`);

// Turn radius diverges as the vehicle straightens up, so a gyro reading flat zero is
// refused rather than reported as a radius the size of a county. Be honest about where
// the guard sits: it trips below 1e-6 rad/s, so a small-but-real rate still yields a
// large-but-real number — 0.01 °/s here is about 8 km, and that is the correct answer.
console.log(`  Turn radius, turning : ${show(turnRadiusM(roverSpeedMs, 6), 1)} m`);
const straight = turnRadiusM(roverSpeedMs, 0);
if (straight === undefined)
	refused("turnRadiusM(straight running)", "undefined — the radius diverges");
console.log(`  Turn radius, straight: ${show(straight, 1)} m`);

// Rate of turn takes the short way round, so a sweep through north reads as a small
// turn to starboard rather than a 350° turn to port.
console.log(`  Rate of turn         : ${show(rateOfTurnDegPerSec(355, 5, 10), 2)} °/s`);

// Forward kinematics only. The inverse — wheel speeds for a desired motion — is a
// command, and this package does not issue commands.
const drive = differentialDriveMotion(4.1, 3.6, 0.165, 0.52);
console.log(
	`  Diff-drive           : ${show(drive?.speedMs, 2)} m/s, ${show(drive?.yawRateRadPerSec, 3)} rad/s`,
);

// Endurance takes USABLE energy, not nameplate capacity: how much of the pack the
// operator is willing to spend is a policy call nav has no basis to make.
console.log(`  Endurance            : ${show(enduranceHours(540, 180), 2)} h`);
const idle = enduranceHours(540, 0);
if (idle === undefined) refused("enduranceHours(no draw)", "undefined — infinite is not a readout");

// `optional` is the same discipline for raw sensor scalars: a non-finite reading
// becomes absent instead of being clamped into a plausible one.
const depthSounder = Number.NaN;
console.log(`  Depth                : ${show(optional(depthSounder), 1)} m`);
if (optional(depthSounder) === undefined) refused("optional(NaN)", "undefined — not 0 m");
// `clamp` is for values that ARE known and must be bounded, e.g. a throttle demand.
console.log(`  Throttle (clamped)   : ${show(clamp(1.34, 0, 1), 2)}`);

// ──────────────────────────────────────────────────────────────────────
// 6. STALENESS — the pessimistic refusal
// ──────────────────────────────────────────────────────────────────────

console.log(`\n  Staleness (max age ${DEFAULT_MAX_AGE_MS} ms):`);
for (const contact of contacts) {
	const age = readingAge(contact.observedAt, NOW);
	const stale = isStale(contact.observedAt, NOW);
	console.log(
		`    ${contact.id.padEnd(10)} age ${show(age, 0).padStart(6)} ms   ${stale ? "STALE" : "fresh"}`,
	);
}

// FUSED-21 carries no timestamp, and nav calls it STALE rather than fresh. That is a
// refusal too — just one that answers pessimistically instead of not answering, because
// an unknown age is not a young one and silently trusting it is the failure this guards.
refused("isStale(no timestamp)", "true — pessimistic, an unknown age is not a young one");
if (readingAge(undefined, NOW) === undefined) {
	refused("readingAge(no timestamp)", "undefined — the age itself is unknowable");
}

// ──────────────────────────────────────────────────────────────────────
// 7. THE REFUSAL LEDGER
// ──────────────────────────────────────────────────────────────────────

console.log(`\n  ${refusals.length} refusals this run — none of them a bug:\n`);
for (const entry of refusals) console.log(`    ${entry}`);
console.log(
	"\n  Do not 'fix' a refusal by substituting a default. The absent number is the\n" +
		"  one that sends an operator to look at the raw sensor; the invented number\n" +
		"  is the one that gets believed.\n",
);
