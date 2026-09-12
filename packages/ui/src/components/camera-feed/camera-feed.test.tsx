// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { CameraFeed, type CameraFeedProps } from "./camera-feed";

/** Props of the first node matching a predicate, depth-first. */
function find(
	node: unknown,
	match: (candidate: { props?: Record<string, unknown>; type?: unknown }) => boolean,
) {
	let found: Record<string, unknown> | undefined;
	const walk = (current: unknown) => {
		if (found !== undefined) return;
		if (Array.isArray(current)) {
			for (const child of current) walk(child);
			return;
		}
		if (current === null || typeof current !== "object") return;
		const candidate = current as { props?: Record<string, unknown>; type?: unknown };
		if (match(candidate) && candidate.props !== undefined) {
			found = candidate.props;
			return;
		}
		walk(candidate.props?.children);
	};
	walk(node);
	return found;
}

const bySlot = (slot: string) => (candidate: { props?: Record<string, unknown> }) =>
	candidate.props?.["data-slot"] === slot;
const byType = (type: string) => (candidate: { type?: unknown }) => candidate.type === type;

/** Every string the feed renders. */
function textOf(node: unknown, acc: string[] = []): string {
	if (typeof node === "string" || typeof node === "number") {
		acc.push(String(node));
		return acc.join(" ");
	}
	if (Array.isArray(node)) {
		for (const child of node) textOf(child, acc);
		return acc.join(" ");
	}
	if (node !== null && typeof node === "object") {
		textOf((node as { props?: { children?: unknown } }).props?.children, acc);
	}
	return acc.join(" ");
}

const BOW: CameraFeedProps = { name: "Bow" };

describe("CameraFeed", () => {
	it("exposes a group role with a data-slot for instrumentation", () => {
		const element = CameraFeed(BOW);

		expect(element.props.role).toBe("group");
		expect(element.props["data-slot"]).toBe("camera-feed");
	});

	it("names the camera and what it is doing", () => {
		expect(CameraFeed({ ...BOW, latencyMs: 120, status: "live" }).props["aria-label"]).toBe(
			"Bow, live, 120 millisecond latency",
		);
	});

	it("falls back to a generic name when the camera is unnamed", () => {
		expect(CameraFeed({}).props["aria-label"]).toBe("Camera, connecting");
	});

	it("omits latency it cannot measure rather than reporting zero", () => {
		expect(CameraFeed({ ...BOW, latencyMs: Number.NaN, status: "live" }).props["aria-label"]).toBe(
			"Bow, live",
		);
	});

	it("accepts a caller override for the label", () => {
		expect(CameraFeed({ ...BOW, label: "Forward view" }).props["aria-label"]).toBe("Forward view");
	});

	it("does not claim the picture is live until a shell says so", () => {
		// An unwired `status` must not paint a confident LIVE over a black frame.
		// An unknown age is not a young one.
		expect(CameraFeed(BOW).props["data-status"]).toBe("connecting");
		expect(String(CameraFeed(BOW).props["aria-label"])).not.toContain("live");
	});

	it("still announces staleness when the caller supplies its own label", () => {
		// The prefix used to live inside the fallback, so naming a camera silently
		// switched off the frozen-picture warning while the banner kept rendering.
		expect(
			CameraFeed({ ...BOW, label: "Rover 3 bow camera", stale: true }).props["aria-label"],
		).toBe("Stale, Rover 3 bow camera, picture may be frozen");
	});

	it("merges a caller className rather than dropping it", () => {
		expect(CameraFeed({ ...BOW, className: "col-span-2" }).props.className).toContain("col-span-2");
	});

	it("carries a box of its own so a dropped feed cannot collapse the panel", () => {
		// The placeholder is `h-full`, which resolves to nothing unless the root has
		// a height. Without this the panel would shrink the moment a feed dropped.
		expect(CameraFeed(BOW).props.className).toContain("aspect-video");
	});
});

describe("CameraFeed transport", () => {
	it("renders a video and forwards the shell's ref for a stream", () => {
		const ref = { current: null };

		expect(find(CameraFeed({ ...BOW, videoRef: ref }), byType("video"))?.ref).toBe(ref);
	});

	it("does not set a src on a stream, because the shell attaches it", () => {
		expect(find(CameraFeed({ ...BOW, src: "ignored" }), byType("video"))?.src).toBeUndefined();
	});

	it("sets the src for a plain video source", () => {
		const video = find(CameraFeed({ ...BOW, kind: "video", src: "/feed.webm" }), byType("video"));

		expect(video?.src).toBe("/feed.webm");
	});

	it("renders an image for an MJPEG endpoint", () => {
		const element = CameraFeed({ ...BOW, kind: "mjpeg", src: "/stream.mjpg" });

		expect(find(element, byType("img"))?.src).toBe("/stream.mjpg");
		expect(find(element, byType("video"))).toBeUndefined();
	});

	it("gives the MJPEG image alternative text naming the camera", () => {
		expect(find(CameraFeed({ ...BOW, kind: "mjpeg" }), byType("img"))?.alt).toBe("Bow camera feed");
	});

	it("carries explicit dimensions so the console never reflows on first frame", () => {
		const video = find(CameraFeed(BOW), byType("video"));

		expect(video?.width).toBe(640);
		expect(video?.height).toBe(360);
	});

	it("plays inline and muted, or a browser will refuse to autoplay it", () => {
		const video = find(CameraFeed(BOW), byType("video"));

		expect(video?.muted).toBe(true);
		expect(video?.playsInline).toBe(true);
		expect(video?.autoPlay).toBe(true);
	});
});

describe("CameraFeed status", () => {
	it("carries the status for instrumentation", () => {
		expect(CameraFeed({ ...BOW, status: "offline" }).props["data-status"]).toBe("offline");
	});

	it("replaces the picture with a placeholder when the feed is offline", () => {
		const element = CameraFeed({ ...BOW, status: "offline" });

		expect(find(element, byType("video"))).toBeUndefined();
		expect(find(element, bySlot("camera-feed-placeholder"))).toBeDefined();
	});

	it("keeps showing the picture while connecting, since frames may already flow", () => {
		expect(find(CameraFeed({ ...BOW, status: "connecting" }), byType("video"))).toBeDefined();
	});

	it("names every status in words rather than by colour alone", () => {
		expect(textOf(CameraFeed({ ...BOW, status: "no-signal" }))).toContain("No signal");
		expect(textOf(CameraFeed({ ...BOW, status: "offline" }))).toContain("Offline");
		expect(textOf(CameraFeed({ ...BOW, status: "connecting" }))).toContain("Connecting");
		expect(textOf(CameraFeed({ ...BOW, status: "live" }))).toContain("Live");
	});

	it("says the status in the accessible name too", () => {
		expect(CameraFeed({ ...BOW, status: "no-signal" }).props["aria-label"]).toBe("Bow, no signal");
	});
});

describe("CameraFeed staleness", () => {
	it("warns loudly that the picture may be frozen", () => {
		const element = CameraFeed({ ...BOW, stale: true });

		expect(element.props["data-stale"]).toBe("");
		expect(find(element, bySlot("camera-feed-stale-banner"))).toBeDefined();
		expect(textOf(element)).toContain("Picture may be frozen");
	});

	it("says so in the accessible name, not only in the banner", () => {
		expect(CameraFeed({ ...BOW, stale: true, status: "live" }).props["aria-label"]).toBe(
			"Stale, Bow, live, picture may be frozen",
		);
	});

	it("dims the picture as well as banding it", () => {
		expect(String(find(CameraFeed({ ...BOW, stale: true }), byType("video"))?.className)).toContain(
			"opacity-60",
		);
	});

	it("carries no staleness marks when the picture is current", () => {
		const element = CameraFeed(BOW);

		expect(element.props["data-stale"]).toBeUndefined();
		expect(find(element, bySlot("camera-feed-stale-banner"))).toBeUndefined();
		expect(textOf(element)).not.toContain("frozen");
	});
});
