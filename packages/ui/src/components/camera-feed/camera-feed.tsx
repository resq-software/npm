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
 * @fileoverview CameraFeed — video chrome, deliberately without a transport.
 *
 * WebRTC, HLS, MJPEG and a ROS image topic all end up painting the same
 * rectangle, and none of them belong in a design system: they need signalling,
 * negotiation and reconnection, which is shell work. So this renders the
 * rectangle and its states, and takes `videoRef` for the shell to attach a
 * `MediaStream` to. Transport, normalise, present — nothing skips a layer.
 *
 * A frozen feed is the most dangerous failure on a teleoperation console: the
 * operator sees a plausible, well-lit, *minutes-old* picture and drives on it.
 * That is why `stale` here is loud — a band across the frame carrying a word —
 * where an instrument only dims. Dimming a gauge costs a glance; a camera that
 * fails quietly costs the vehicle.
 *
 * Stateless and hook-free. Dimensions default rather than being optional,
 * because a video box that sizes itself from its content shifts the whole
 * console the moment the first frame lands.
 *
 * @module @resq-systems/ui/components/camera-feed/camera-feed
 */

import type * as React from "react";

import { withStaleness } from "../../lib/instrument-dial.js";
import { cn } from "../../lib/utils.js";

//#region Types

/** What the feed is doing, as far as the shell can tell. */
export type CameraStatus = "live" | "connecting" | "offline" | "no-signal";

/**
 * How the picture is delivered. `stream` means the shell attaches a
 * `MediaStream` through `videoRef`; `mjpeg` is a plain `<img>`; `video` is a
 * `<video>` with a `src`.
 */
export type CameraKind = "stream" | "video" | "mjpeg";

const STATUS_WORD: Record<CameraStatus, string> = {
	connecting: "Connecting",
	live: "Live",
	"no-signal": "No signal",
	offline: "Offline",
};

/**
 * Chrome text is white rather than a severity token, and that is a deliberate
 * loss rather than an oversight.
 *
 * The picture area is a letterbox matte: theme-independent, because video is
 * arbitrary content and `object-cover` needs something behind it. The severity
 * tokens are not theme-independent — `--warning` *darkens* in the light theme,
 * so `text-warning` on this scrim measures 1.62:1 and `text-destructive` 1.19:1.
 * Picking the light theme would actively degrade the most-watched panel on the
 * console.
 *
 * The dark variant resolves from a class on `html`, so a subtree cannot opt into
 * dark tokens; hue is simply unavailable on this surface. The status word
 * carries severity alone here — the encoding every panel is meant to be able to
 * fall back to. Restoring hue needs theme-independent video-surface tokens in
 * the theme itself.
 */
const CHROME_TEXT = "text-white";

export interface CameraFeedProps extends Omit<React.ComponentProps<"div">, "children"> {
	/** Camera name, e.g. `"Bow"` or `"Payload"`. Part of the accessible name. */
	name?: string;
	/** Source URL for the `video` and `mjpeg` kinds. Ignored for `stream`. */
	src?: string;
	/** Delivery mechanism; defaults to a shell-attached `MediaStream`. */
	kind?: CameraKind;
	/** Still shown before the first frame. */
	poster?: string;
	status?: CameraStatus;
	/**
	 * The picture is no longer known to be current. Rendered loudly: a frozen
	 * feed is indistinguishable from a live one without it.
	 */
	stale?: boolean;
	/** Glass-to-glass latency in milliseconds, when the shell can measure it. */
	latencyMs?: number;
	/** Intrinsic width in pixels, so the box never reflows on first frame. */
	width?: number;
	/** Intrinsic height in pixels, so the box never reflows on first frame. */
	height?: number;
	/** Attached by the shell to bind a `MediaStream`. */
	videoRef?: React.Ref<HTMLVideoElement>;
	/** Overrides the auto-generated `aria-label`. */
	label?: string;
}

//#endregion

//#region Helpers

/**
 * Build the accessible name: which camera, doing what.
 *
 * Deliberately says nothing about staleness. That is applied to the *resolved*
 * name at the call site, so it survives a caller-supplied `label`.
 */
function formatCameraLabel(props: Readonly<CameraFeedProps>): string {
	const status = props.status ?? "connecting";
	const parts = [props.name ?? "Camera", STATUS_WORD[status].toLowerCase()];

	if (typeof props.latencyMs === "number" && Number.isFinite(props.latencyMs)) {
		parts.push(`${Math.round(props.latencyMs)} millisecond latency`);
	}

	return parts.join(", ");
}

//#endregion

//#region Component

/**
 * A camera rectangle and its states.
 *
 * @example WebRTC, attached by the shell
 * ```tsx
 * <CameraFeed name="Bow" status="live" videoRef={ref} />
 * ```
 *
 * @example An MJPEG endpoint
 * ```tsx
 * <CameraFeed kind="mjpeg" name="Payload" src={url} />
 * ```
 */
function CameraFeed({
	name,
	src,
	kind = "stream",
	poster,
	// Not "live". A shell that forgets to wire `status` would otherwise paint a
	// confident LIVE over a black rectangle, and the repo's own rule is that an
	// unknown age is not a young one. The optimistic value must be asked for.
	status = "connecting",
	stale,
	latencyMs,
	width = 640,
	height = 360,
	videoRef,
	label,
	className,
	...props
}: Readonly<CameraFeedProps>) {
	const showPicture = status === "live" || status === "connecting";
	const hasLatency = typeof latencyMs === "number" && Number.isFinite(latencyMs);
	const pictureClass = cn("block h-full w-full object-cover", stale === true && "opacity-60");

	// Staleness wraps the *resolved* name. Reading `label ?? format(...)` put the
	// "Stale," prefix inside the fallback only, so a shell naming its cameras —
	// "Rover 3 bow camera" — silently switched off the frozen-picture
	// announcement on every one of them, while the visible banner kept rendering
	// and hid the loss from Chromatic and from sighted review.
	const summary = label ?? formatCameraLabel({ latencyMs, name, status });
	const spokenName =
		stale === true ? withStaleness(`${summary}, picture may be frozen`, true) : summary;

	// An MJPEG endpoint is a never-ending multipart response, so the browser paints
	// it as an ordinary image and no player is involved.
	const mjpegFrame = (
		// biome-ignore lint/performance/noImgElement: an image optimiser would buffer an endless multipart response forever instead of ever emitting a file.
		<img
			alt={name === undefined ? "Camera feed" : `${name} camera feed`}
			className={pictureClass}
			height={height}
			src={src}
			width={width}
		/>
	);

	return (
		<div
			{...props}
			aria-label={spokenName}
			// `aspect-video` gives the frame a box of its own, matching the 640x360
			// defaults. Without it the root has no height, the placeholder's `h-full`
			// resolves to nothing, and a feed that drops collapses the panel — the
			// exact reflow the placeholder below exists to prevent. A caller sizing
			// the frame itself overrides this through `className`.
			className={cn("relative aspect-video overflow-hidden bg-black", className)}
			data-slot="camera-feed"
			data-stale={stale === true ? "" : undefined}
			data-status={status}
			role="group"
		>
			{showPicture && kind === "mjpeg" ? mjpegFrame : null}

			{showPicture && kind !== "mjpeg" ? (
				<video
					autoPlay
					className={pictureClass}
					height={height}
					muted
					playsInline
					poster={poster}
					ref={videoRef}
					src={kind === "video" ? src : undefined}
					width={width}
				/>
			) : null}

			{showPicture ? null : (
				// Fills the same box the picture would, so a dropped feed does not
				// collapse the panel and shove every other panel sideways.
				<div
					// No background of its own: it sits on the root's matte. `bg-muted`
					// here meant that in the light theme a dropped feed flipped a black
					// rectangle to a near-white one — a flash across the console at the
					// moment a camera dies, in a room that is usually darkened.
					className="flex h-full w-full items-center justify-center"
					data-slot="camera-feed-placeholder"
				>
					<span className={cn("font-mono text-[11px] uppercase", CHROME_TEXT)}>
						{STATUS_WORD[status]}
					</span>
				</div>
			)}

			<div className="absolute inset-x-0 top-0 flex items-center gap-2 bg-black/55 px-2 py-1">
				<span className="min-w-0 flex-1 truncate font-mono text-[10px] text-white uppercase">
					{name ?? "Camera"}
				</span>
				{hasLatency ? (
					<span className="font-mono text-[10px] text-white tabular-nums">
						{`${Math.round(latencyMs)} ms`}
					</span>
				) : null}
				<span className={cn("font-mono text-[10px] uppercase", CHROME_TEXT)}>
					{STATUS_WORD[status]}
				</span>
			</div>

			{stale === true ? (
				<div
					className="absolute inset-x-0 bottom-0 bg-destructive px-2 py-1 text-center font-mono text-[10px] text-destructive-foreground uppercase"
					data-slot="camera-feed-stale-banner"
				>
					Picture may be frozen
				</div>
			) : null}
		</div>
	);
}

//#endregion

export { CameraFeed };
