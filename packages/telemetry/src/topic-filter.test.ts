// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { topicMatches } from "./topic-filter";

describe("topicMatches", () => {
	it("matches an exact topic", () => {
		expect(topicMatches("uagv/v2/resq/AGV-7/state", "uagv/v2/resq/AGV-7/state")).toBe(true);
	});

	it("rejects a different topic", () => {
		expect(topicMatches("uagv/v2/resq/AGV-7/state", "uagv/v2/resq/AGV-8/state")).toBe(false);
	});

	it("matches a single-level wildcard", () => {
		expect(topicMatches("uagv/v2/+/+/state", "uagv/v2/resq/AGV-7/state")).toBe(true);
	});

	it("requires a single-level wildcard to consume exactly one level", () => {
		expect(topicMatches("sport/+", "sport/tennis/player1")).toBe(false);
		expect(topicMatches("sport/+", "sport")).toBe(false);
		expect(topicMatches("sport/+", "sport/tennis")).toBe(true);
	});

	it("matches a trailing multi-level wildcard across any depth", () => {
		expect(topicMatches("sport/#", "sport/tennis/player1/score")).toBe(true);
		expect(topicMatches("sport/#", "sport/tennis")).toBe(true);
	});

	it("matches the parent level with a multi-level wildcard", () => {
		// Per §4.7.1.2, `sport/#` also matches the bare parent `sport`.
		expect(topicMatches("sport/#", "sport")).toBe(true);
	});

	it("matches everything with a bare hash", () => {
		expect(topicMatches("#", "a")).toBe(true);
		expect(topicMatches("#", "a/b/c")).toBe(true);
	});

	it("keeps reserved topics out of leading wildcards", () => {
		expect(topicMatches("#", "$SYS/broker/uptime")).toBe(false);
		expect(topicMatches("+/broker/uptime", "$SYS/broker/uptime")).toBe(false);
	});

	it("still matches reserved topics through an explicit prefix", () => {
		expect(topicMatches("$SYS/#", "$SYS/broker/uptime")).toBe(true);
		expect(topicMatches("$SYS/broker/+", "$SYS/broker/uptime")).toBe(true);
	});

	it("treats a non-terminal hash as malformed and matches nothing", () => {
		expect(topicMatches("sport/#/player1", "sport/tennis/player1")).toBe(false);
	});

	it("does not match a shorter topic than the filter", () => {
		expect(topicMatches("a/b/c", "a/b")).toBe(false);
	});

	it("does not match a longer topic than the filter", () => {
		expect(topicMatches("a/b", "a/b/c")).toBe(false);
	});

	it("treats empty levels as real levels", () => {
		expect(topicMatches("a//b", "a//b")).toBe(true);
		expect(topicMatches("a/+/b", "a//b")).toBe(true);
	});
});

describe("malformed filters", () => {
	it("matches nothing even against an identical string", () => {
		// The exact-match fast path must not resurrect an invalid filter.
		expect(topicMatches("sport/#/player1", "sport/#/player1")).toBe(false);
	});

	it("rejects a wildcard sharing a level with other characters", () => {
		expect(topicMatches("sport#", "sport#")).toBe(false);
		expect(topicMatches("sport+", "sport+")).toBe(false);
		expect(topicMatches("sp+rt/x", "sp+rt/x")).toBe(false);
	});

	it("still accepts the well-formed wildcard placements", () => {
		expect(topicMatches("#", "a/b")).toBe(true);
		expect(topicMatches("sport/#", "sport/tennis")).toBe(true);
		expect(topicMatches("sport/+/x", "sport/tennis/x")).toBe(true);
	});
});
