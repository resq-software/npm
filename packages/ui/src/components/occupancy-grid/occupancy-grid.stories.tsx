// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the OccupancyGrid component — synthetic
 * costmaps covering a partially explored room, a corridor, a large SLAM map and
 * an empty feed, for visual review and Chromatic regression.
 *
 * @module @resq-systems/ui/components/occupancy-grid/occupancy-grid.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import { OccupancyGrid } from "./occupancy-grid";

const ROOM_SIZE = 60;

/** Walled room, explored up to a frontier partway across. */
function room(): number[] {
	return Array.from({ length: ROOM_SIZE * ROOM_SIZE }, (_unused, index) => {
		const x = index % ROOM_SIZE;
		const y = Math.floor(index / ROOM_SIZE);
		const onWall = x === 0 || y === 0 || x === ROOM_SIZE - 1 || y === ROOM_SIZE - 1;
		if (onWall) return 100;
		if (y > 42) return -1;
		if (x > 20 && x < 26 && y > 12 && y < 34) return 100;
		return 0;
	});
}

/** Narrow corridor with a doorway. */
function corridor(): number[] {
	return Array.from({ length: ROOM_SIZE * ROOM_SIZE }, (_unused, index) => {
		const x = index % ROOM_SIZE;
		const y = Math.floor(index / ROOM_SIZE);
		const wall = (x < 22 || x > 38) && !(y > 26 && y < 34);
		return wall ? 100 : 0;
	});
}

/** 400×400 SLAM map with scattered structure — exercises the reduction path. */
function slamMap(): Int8Array {
	const size = 400;
	const cells = new Int8Array(size * size);
	for (let index = 0; index < cells.length; index += 1) {
		const x = index % size;
		const y = Math.floor(index / size);
		if (y > 320) {
			cells[index] = -1;
		} else if (x % 71 === 0 || y % 83 === 0) {
			cells[index] = 100;
		}
	}
	return cells;
}

const PLANNED_PATH = Array.from({ length: 120 }, (_unused, index) => ({
	x: 0.6 + index * 0.012,
	y: 0.6 + Math.sin(index / 18) * 0.4 + index * 0.008,
}));

const meta: Meta<typeof OccupancyGrid> = {
	argTypes: {
		occupiedThreshold: { control: { max: 100, min: 1, step: 1, type: "range" } },
	},
	component: OccupancyGrid,
	tags: ["autodocs"],
	title: "Instruments/Occupancy Grid",
};

export default meta;
type Story = StoryObj<typeof OccupancyGrid>;

export const PartiallyExploredRoom: Story = {
	args: {
		cells: room(),
		height: ROOM_SIZE,
		pose: { theta: Math.PI / 3, x: 0.9, y: 0.7 },
		resolution: 0.05,
		width: ROOM_SIZE,
	},
};

export const WithPlannedPath: Story = {
	args: {
		cells: room(),
		height: ROOM_SIZE,
		path: PLANNED_PATH,
		pose: { theta: 0.5, x: 0.6, y: 0.6 },
		resolution: 0.05,
		width: ROOM_SIZE,
	},
};

export const Corridor: Story = {
	args: {
		cells: corridor(),
		height: ROOM_SIZE,
		pose: { theta: 0, x: 1.5, y: 1.5 },
		resolution: 0.05,
		width: ROOM_SIZE,
	},
};

export const LargeSlamMap: Story = {
	args: {
		cells: slamMap(),
		height: 400,
		pose: { theta: -0.8, x: 6, y: 6 },
		resolution: 0.05,
		width: 400,
	},
};

export const NonSquareMap: Story = {
	args: {
		cells: Array.from({ length: 80 * 30 }, (_unused, index) => (index % 37 === 0 ? 100 : 0)),
		height: 30,
		resolution: 0.1,
		width: 80,
	},
};

export const NoData: Story = {
	args: {},
};
