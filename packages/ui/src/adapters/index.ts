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
 * @fileoverview Public barrel for `@resq-systems/ui/adapters` — pure functions
 * that turn vehicle telemetry messages into instrument props.
 *
 * This is a **separate entry point on purpose**. The instruments themselves take
 * plain numbers and know nothing about ROS 2, MAVLink, AIS, Signal K or
 * VDA5050; keeping the decoders behind their own subpath means importing a gauge
 * never pulls protocol knowledge in behind it, and an application that already
 * has its own decoding layer pays nothing for these.
 *
 * Nothing here imports React or touches the DOM, so the module is equally usable
 * in a worker, on a server, or in a test.
 *
 * @example
 * ```tsx
 * import { LidarScan } from "@resq-systems/ui/lidar-scan";
 * import { laserScanToProps } from "@resq-systems/ui/adapters";
 *
 * <LidarScan {...laserScanToProps(msg)} className="size-64" />
 * ```
 *
 * @module @resq-systems/ui/adapters
 */

export {
	type AisPositionReport,
	aisToContact,
	aisToContacts,
	type Approach,
	computeApproach,
	type OwnShip,
} from "./ais.js";
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
export {
	attitudeToHeading,
	attitudeToTilt,
	batteryStatusToProps,
	type DepthFromPressureOptions,
	type MavlinkAttitude,
	type MavlinkBatteryStatus,
	type MavlinkScaledPressure,
	type MavlinkVfrHud,
	pressureToDepth,
	vfrHudToCompass,
} from "./mavlink.js";
export {
	batteryStateToProps,
	type EulerAngles,
	imuToHeading,
	imuToTilt,
	laserScanToProps,
	occupancyGridToProps,
	odometryToPose,
	quaternionToEuler,
	type Ros2BatteryState,
	type Ros2Imu,
	type Ros2LaserScan,
	type Ros2Odometry,
	type Ros2OccupancyGrid,
	type Ros2Quaternion,
	type Ros2Twist,
	teleopToTwist,
} from "./ros2.js";
export {
	applyDelta,
	flattenDelta,
	latestTimestamp,
	readNumber,
	SIGNALK_PATHS,
	signalKToCompass,
	signalKToDepth,
	type SignalKDelta,
	type SignalKPaths,
	type SignalKUpdate,
	type SignalKValue,
} from "./signalk.js";
export { DEFAULT_MAX_AGE_MS, isStale, readingAge } from "./staleness.js";
export {
	parseTopic,
	stateToBattery,
	stateToCommand,
	stateToErrorSummary,
	stateToPose,
	type Vda5050AgvPosition,
	type Vda5050BatteryState,
	type Vda5050Error,
	type Vda5050ErrorSummary,
	type Vda5050State,
	type Vda5050TopicParts,
	type Vda5050Velocity,
} from "./vda5050.js";
