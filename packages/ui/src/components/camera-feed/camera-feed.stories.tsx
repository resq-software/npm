// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @fileoverview Storybook stories for the CameraFeed component —
 * transport-free feed states for visual review and Chromatic regression.
 *
 * @module @resq-systems/ui/components/camera-feed/camera-feed.stories
 */

import type { Meta, StoryObj } from "@storybook/react";

import { CameraFeed } from "./camera-feed";

/**
 * A stand-in still, inlined rather than served from `staticDirs`.
 *
 * A path into `public/` would 404 here and leave the frame black — reviewing
 * nothing, in the one story whose whole subject is what the poster looks like.
 * Inlining also keeps the Chromatic capture free of a network request.
 */
const POSTER_STILL = `data:image/svg+xml,${encodeURIComponent(
	"<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'>" +
		"<rect width='640' height='360' fill='#3f3f46'/>" +
		"</svg>",
)}`;

const meta: Meta<typeof CameraFeed> = {
	argTypes: {
		height: { control: { max: 720, min: 90, step: 10, type: "range" } },
		latencyMs: { control: { max: 2000, min: 0, step: 10, type: "range" } },
		width: { control: { max: 1280, min: 160, step: 10, type: "range" } },
	},
	component: CameraFeed,
	tags: ["autodocs"],
	title: "Console/Camera Feed",
};

export default meta;
type Story = StoryObj<typeof CameraFeed>;

/**
 * The ordinary case, and the baseline every other story is measured against.
 * Nothing paints inside the box here — the shell attaches the `MediaStream` in
 * the real console — so what is under review is the box holding its size and
 * the header staying readable over an empty frame.
 */
export const Live: Story = {
	args: { className: "w-96", name: "Bow", status: "live" },
};

/**
 * Frames may already be flowing while negotiation finishes, so the picture is
 * kept rather than blanked. Blanking here would train operators to read a
 * momentary handshake as a lost camera.
 */
export const Connecting: Story = {
	args: { className: "w-96", name: "Bow", status: "connecting" },
};

/**
 * The link is gone and the console must say so without collapsing. The
 * placeholder fills exactly the box the picture would, because a panel that
 * shrinks on failure shoves every neighbouring panel sideways mid-manoeuvre.
 */
export const Offline: Story = {
	args: { className: "w-96", name: "Bow", status: "offline" },
};

/**
 * The transport is healthy but the camera is sending nothing — an unplugged lens
 * or a dead sensor. Worth distinguishing from offline, because the two failures
 * send an operator to different places.
 */
export const NoSignal: Story = {
	args: { className: "w-96", name: "Payload", status: "no-signal" },
};

/**
 * An MJPEG endpoint paints as an ordinary image, so the same chrome has to sit
 * correctly over an `<img>` rather than over a player. No real endpoint is
 * attached in Storybook — pointing at one would only fetch and fail, and the
 * failure would land in the snapshot — so the chrome is what is under review.
 */
export const MjpegEndpoint: Story = {
	args: { className: "w-96", kind: "mjpeg", name: "Bow" },
};

/**
 * A recorded clip stands in for a live feed during playback and incident
 * review, and it is the one path where the picture carries its own source
 * rather than waiting for the shell. Operators must still read the same header
 * and the same status word, so the chrome cannot quietly differ here. No clip
 * is attached in Storybook.
 */
export const RecordedClip: Story = {
	args: { className: "w-96", kind: "video", name: "Payload", status: "live" },
};

/**
 * A poster is the still held on screen before the first frame arrives, which is
 * what an operator stares at through the seconds a camera takes to come up. It
 * keeps that wait from reading as a dead feed — which is why it is shown here
 * beside `Connecting`, whose black frame is the alternative.
 */
export const PosterStill: Story = {
	args: {
		className: "w-96",
		kind: "video",
		name: "Payload",
		poster: POSTER_STILL,
		status: "connecting",
	},
};

/**
 * Where the shell can measure glass-to-glass delay, it belongs on the frame: an
 * operator judging a turn needs to know how far behind the picture is.
 */
export const MeasuredLatency: Story = {
	args: { className: "w-96", latencyMs: 184, name: "Bow", status: "live" },
};

/**
 * The most dangerous failure on a teleoperation console. A frozen feed still
 * looks plausible and well-lit while showing a picture minutes old, and an
 * operator will drive on it. So this does not merely dim the way an instrument
 * does — it bands the frame with a word, and says so in the accessible name
 * before anything else.
 */
export const Stale: Story = {
	args: { ...Live.args, stale: true },
};
