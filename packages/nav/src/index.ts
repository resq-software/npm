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
 * @fileoverview Earth and vehicle geometry, collision geometry, and derived navigation
 * quantities for telemetry consoles.
 *
 * **This is not a navigation aid.** See the package README for the accuracy limits of
 * every function here, and for the admission test any new formula has to pass.
 *
 * Each module is independently importable — `@resq-systems/nav/geo`,
 * `@resq-systems/nav/units` and so on — so a console that only needs unit conversions
 * does not pull in collision geometry.
 *
 * @module @resq-systems/nav
 */

export {
	type Approach,
	type ApproachGeometry,
	type ApproachSource,
	closestApproach,
} from "./approach.js";
export {
	compareByRisk,
	formatBearing,
	isUsableCpa,
	nearestByRange,
	type RankableContact,
	worstApproach,
} from "./arpa.js";
export {
	crabAngleDeg,
	crossTrackNm,
	type Current,
	differentialDriveMotion,
	type DifferentialDriveMotion,
	enduranceHours,
	observedCurrent,
	rateOfTurnDegPerSec,
	slipRatio,
	type StoppingDistanceInput,
	stoppingDistanceM,
	turnRadiusM,
} from "./derived.js";
export {
	bearingDeg,
	courseToVelocity,
	distanceNm,
	isPosition,
	type LatLon,
	type LocalOffset,
	normalizeBearing,
	toLocalNm,
} from "./geo.js";
export { clamp, optional } from "./numeric.js";
export * from "./staleness.js";
export * from "./units.js";
