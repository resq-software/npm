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
 * @fileoverview ROS 2 message → instrument prop mappers.
 *
 * The message interfaces here are **structural minimums**, not generated types:
 * they describe only the fields each instrument needs, so a frame straight off
 * `rosbridge` satisfies them without `roslibjs` being a dependency of anything.
 *
 * Angles follow REP-103 (radians, counter-clockwise, x forward) on the way in;
 * instruments that display degrees get the conversion here rather than in the
 * component, so the component stays a pure renderer.
 *
 * @module @resq-systems/ui/adapters/ros2
 */

import type { BatteryGaugeProps } from "../components/battery-gauge/index.js";
import type { LidarScanProps } from "../components/lidar-scan/index.js";
import type { GridPose, OccupancyGridProps } from "../components/occupancy-grid/index.js";
import type { TeleopVector } from "../components/teleop-pad/index.js";
import type { TiltIndicatorProps } from "../components/tilt-indicator/index.js";
import { clamp, optional } from "./numeric.js";

//#region Constants

const RAD_TO_DEG = 180 / Math.PI;
const FULL_TURN = 360;
/** `sensor_msgs/BatteryState.percentage` is a 0–1 fraction. */
const FRACTION_TO_PERCENT = 100;

//#endregion

//#region Message shapes

/** Minimal `sensor_msgs/LaserScan`. */
export interface Ros2LaserScan {
	ranges: ArrayLike<number>;
	angle_min: number;
	angle_increment: number;
	range_min?: number;
	range_max?: number;
}

/** Minimal `nav_msgs/OccupancyGrid`. */
export interface Ros2OccupancyGrid {
	data: ArrayLike<number>;
	info: {
		width: number;
		height: number;
		resolution: number;
		origin?: { position?: { x?: number; y?: number } };
	};
}

/** Minimal `sensor_msgs/BatteryState`. */
export interface Ros2BatteryState {
	percentage?: number;
	voltage?: number;
	current?: number;
	temperature?: number;
	cell_voltage?: readonly number[];
}

/** `geometry_msgs/Quaternion`. */
export interface Ros2Quaternion {
	x: number;
	y: number;
	z: number;
	w: number;
}

/** Minimal `sensor_msgs/Imu`. */
export interface Ros2Imu {
	orientation: Ros2Quaternion;
}

/** Minimal `nav_msgs/Odometry`. */
export interface Ros2Odometry {
	pose: {
		pose: {
			position: { x: number; y: number };
			orientation: Ros2Quaternion;
		};
	};
}

/** `geometry_msgs/Twist`. */
export interface Ros2Twist {
	linear: { x: number; y: number; z: number };
	angular: { x: number; y: number; z: number };
}

/** Roll, pitch and yaw in radians. */
export interface EulerAngles {
	roll: number;
	pitch: number;
	yaw: number;
}

//#endregion

//#region Mappers

/**
 * `sensor_msgs/LaserScan` → {@link LidarScanProps}.
 *
 * @example
 * ```tsx
 * <LidarScan {...laserScanToProps(msg)} warnRange={0.8} />
 * ```
 */
export function laserScanToProps(
	scan: Readonly<Ros2LaserScan>,
): Pick<LidarScanProps, "ranges" | "angleMin" | "angleIncrement" | "rangeMin" | "rangeMax"> {
	return {
		angleIncrement: scan.angle_increment,
		angleMin: scan.angle_min,
		rangeMax: optional(scan.range_max),
		rangeMin: optional(scan.range_min),
		ranges: scan.ranges,
	};
}

/**
 * `nav_msgs/OccupancyGrid` → {@link OccupancyGridProps}. The grid's origin
 * position becomes the component's map-frame `origin`, so a pose in the same
 * frame lands in the right place.
 */
export function occupancyGridToProps(
	grid: Readonly<Ros2OccupancyGrid>,
): Pick<OccupancyGridProps, "cells" | "width" | "height" | "resolution" | "origin"> {
	const position = grid.info.origin?.position;
	return {
		cells: grid.data,
		height: grid.info.height,
		origin: { x: optional(position?.x) ?? 0, y: optional(position?.y) ?? 0 },
		resolution: grid.info.resolution,
		width: grid.info.width,
	};
}

/**
 * `sensor_msgs/BatteryState` → {@link BatteryGaugeProps}.
 *
 * ROS reports `percentage` as a 0–1 fraction; the gauge takes 0–100, so the
 * scaling happens here. The current sign convention already matches (negative
 * while discharging), so it passes through untouched.
 */
export function batteryStateToProps(
	state: Readonly<Ros2BatteryState>,
): Pick<BatteryGaugeProps, "percentage" | "voltage" | "current" | "temperature" | "cellVoltages"> {
	const fraction = optional(state.percentage);
	const cells = state.cell_voltage?.filter((volts) => Number.isFinite(volts));

	return {
		cellVoltages: cells !== undefined && cells.length > 0 ? cells : undefined,
		current: optional(state.current),
		percentage: fraction === undefined ? undefined : clamp(fraction, 0, 1) * FRACTION_TO_PERCENT,
		temperature: optional(state.temperature),
		voltage: optional(state.voltage),
	};
}

/**
 * Quaternion → intrinsic Z-Y-X Euler angles in radians. Pitch is clamped before
 * `asin` so a slightly non-unit quaternion cannot produce `NaN`.
 */
export function quaternionToEuler(q: Readonly<Ros2Quaternion>): EulerAngles {
	const { w, x, y, z } = q;
	return {
		pitch: Math.asin(clamp(2 * (w * y - z * x), -1, 1)),
		roll: Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y)),
		yaw: Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z)),
	};
}

/** `sensor_msgs/Imu` → {@link TiltIndicatorProps} roll and pitch, in degrees. */
export function imuToTilt(imu: Readonly<Ros2Imu>): Pick<TiltIndicatorProps, "roll" | "pitch"> {
	const euler = quaternionToEuler(imu.orientation);
	return {
		pitch: euler.pitch * RAD_TO_DEG,
		roll: euler.roll * RAD_TO_DEG,
	};
}

/** `sensor_msgs/Imu` → heading in degrees clockwise from the map's +x axis. */
export function imuToHeading(imu: Readonly<Ros2Imu>): number {
	const yaw = quaternionToEuler(imu.orientation).yaw * RAD_TO_DEG;
	return ((yaw % FULL_TURN) + FULL_TURN) % FULL_TURN;
}

/**
 * `nav_msgs/Odometry` → {@link GridPose}. `theta` stays in radians because that
 * is what `OccupancyGrid` expects.
 */
export function odometryToPose(odom: Readonly<Ros2Odometry>): GridPose {
	const { orientation, position } = odom.pose.pose;
	return {
		theta: quaternionToEuler(orientation).yaw,
		x: position.x,
		y: position.y,
	};
}

/**
 * {@link TeleopVector} → `geometry_msgs/Twist`, scaling the normalized ±1 axes
 * into real units. This is the one mapper that runs *outbound*: the pad emits
 * normalized values precisely so the caller owns the speed limits.
 *
 * @example
 * ```ts
 * publish(teleopToTwist(command, { angular: 2, linear: 1.5 }));
 * ```
 */
export function teleopToTwist(
	command: Readonly<TeleopVector>,
	scale: Readonly<{ linear: number; angular: number }>,
): Ros2Twist {
	return {
		angular: { x: 0, y: 0, z: command.angular * scale.angular },
		linear: { x: command.linear * scale.linear, y: 0, z: 0 },
	};
}

//#endregion
