// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TelemetrySocket } from "./socket";
import type { WebSocketLike } from "./types";

/** In-memory WebSocket with manual lifecycle triggers for deterministic tests. */
class FakeWebSocket implements WebSocketLike {
	static instances: FakeWebSocket[] = [];

	readyState = 0; // CONNECTING
	onopen: ((event: unknown) => void) | null = null;
	onmessage: ((event: { data: unknown }) => void) | null = null;
	onclose: ((event: unknown) => void) | null = null;
	onerror: ((event: unknown) => void) | null = null;
	readonly sent: string[] = [];

	constructor(readonly url: string) {
		FakeWebSocket.instances.push(this);
	}

	send(data: string): void {
		this.sent.push(data);
	}

	close(): void {
		this.readyState = 3;
		this.onclose?.(undefined);
	}

	triggerOpen(): void {
		this.readyState = 1;
		this.onopen?.(undefined);
	}

	triggerMessage(data: unknown): void {
		this.onmessage?.({ data });
	}

	triggerClose(): void {
		this.readyState = 3;
		this.onclose?.(undefined);
	}
}

function makeSocket() {
	return new TelemetrySocket({
		connect: (url) => new FakeWebSocket(url),
		url: "wss://host/fleet/ws",
	});
}

describe("TelemetrySocket", () => {
	beforeEach(() => {
		FakeWebSocket.instances = [];
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("connects and notifies subscribers on open", () => {
		const socket = makeSocket();
		const onOpen = vi.fn();
		const onStateChange = vi.fn();
		socket.subscribe({ onOpen, onStateChange });

		socket.connect();
		expect(socket.state).toBe("connecting");

		FakeWebSocket.instances[0].triggerOpen();

		expect(socket.state).toBe("open");
		expect(socket.connected).toBe(true);
		expect(onOpen).toHaveBeenCalledTimes(1);
		expect(onStateChange).toHaveBeenCalledWith("open");
	});

	it("replays onOpen for a late subscriber", () => {
		const socket = makeSocket();
		socket.connect();
		FakeWebSocket.instances[0].triggerOpen();

		const onOpen = vi.fn();
		socket.subscribe({ onOpen });

		expect(onOpen).toHaveBeenCalledTimes(1);
	});

	it("dispatches string message frames to subscribers", () => {
		const socket = makeSocket();
		const onMessage = vi.fn();
		socket.subscribe({ onMessage });
		socket.connect();
		FakeWebSocket.instances[0].triggerOpen();

		FakeWebSocket.instances[0].triggerMessage('{"drone_id":"UNIT-1"}');

		expect(onMessage).toHaveBeenCalledWith('{"drone_id":"UNIT-1"}');
	});

	it("sends only when open", () => {
		const socket = makeSocket();
		expect(socket.send("x")).toBe(false); // idle

		socket.connect();
		expect(socket.send("x")).toBe(false); // connecting

		FakeWebSocket.instances[0].triggerOpen();
		expect(socket.send("hello")).toBe(true);
		expect(FakeWebSocket.instances[0].sent).toEqual(["hello"]);
	});

	it("reconnects with backoff after an unexpected close", () => {
		const socket = makeSocket();
		socket.connect();
		FakeWebSocket.instances[0].triggerOpen();

		FakeWebSocket.instances[0].triggerClose();
		expect(socket.state).toBe("reconnecting");

		vi.advanceTimersByTime(1000);
		expect(FakeWebSocket.instances).toHaveLength(2);

		FakeWebSocket.instances[1].triggerOpen();
		expect(socket.state).toBe("open");
	});

	it("does not reconnect after an intentional close", () => {
		const socket = makeSocket();
		const onClose = vi.fn();
		socket.subscribe({ onClose });
		socket.connect();
		FakeWebSocket.instances[0].triggerOpen();

		socket.close();

		expect(socket.state).toBe("closed");
		expect(onClose).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(60000);
		expect(FakeWebSocket.instances).toHaveLength(1);
	});

	it("stops delivering to an unsubscribed consumer", () => {
		const socket = makeSocket();
		const onMessage = vi.fn();
		const unsubscribe = socket.subscribe({ onMessage });
		socket.connect();
		FakeWebSocket.instances[0].triggerOpen();

		unsubscribe();
		FakeWebSocket.instances[0].triggerMessage("x");

		expect(onMessage).not.toHaveBeenCalled();
	});

	it("resets the backoff after a successful reconnect", () => {
		const socket = makeSocket();
		socket.connect();
		FakeWebSocket.instances[0].triggerOpen();

		FakeWebSocket.instances[0].triggerClose(); // schedules 1000
		vi.advanceTimersByTime(1000);
		FakeWebSocket.instances[1].triggerOpen(); // resets the schedule

		FakeWebSocket.instances[1].triggerClose(); // should schedule 1000 again, not 2000
		vi.advanceTimersByTime(999);
		expect(FakeWebSocket.instances).toHaveLength(2);
		vi.advanceTimersByTime(1);
		expect(FakeWebSocket.instances).toHaveLength(3);
	});
});
