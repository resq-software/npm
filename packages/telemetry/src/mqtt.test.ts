// Copyright 2026 ResQ Systems, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";

import { type MqttClientLike, MqttTelemetrySource, type MqttPayload } from "./mqtt";

/** A controllable stand-in for an injected MQTT client. */
class FakeClient implements MqttClientLike {
	readonly subscribed: string[] = [];
	readonly unsubscribed: string[] = [];
	readonly published: { topic: string; payload: string }[] = [];
	ended = false;

	readonly #handlers = new Map<string, ((...args: never[]) => void)[]>();

	on(event: string, handler: (...args: never[]) => void): void {
		const existing = this.#handlers.get(event) ?? [];
		this.#handlers.set(event, [...existing, handler]);
	}

	subscribe(topic: string): void {
		this.subscribed.push(topic);
	}

	unsubscribe(topic: string): void {
		this.unsubscribed.push(topic);
	}

	publish(topic: string, payload: string): void {
		this.published.push({ payload, topic });
	}

	end(): void {
		this.ended = true;
	}

	/** Drive a lifecycle event from the test. */
	emit(event: "connect" | "reconnect" | "close" | "error"): void {
		for (const handler of this.#handlers.get(event) ?? []) {
			(handler as () => void)();
		}
	}

	/** Deliver a message from the test. */
	deliver(topic: string, payload: MqttPayload): void {
		for (const handler of this.#handlers.get("message") ?? []) {
			(handler as unknown as (t: string, p: MqttPayload) => void)(topic, payload);
		}
	}
}

function makeSource(topics?: readonly string[]) {
	const client = new FakeClient();
	const source = new MqttTelemetrySource({
		connect: () => client,
		topics,
		url: "wss://broker.invalid/mqtt",
	});
	return { client, source };
}

const STATE_TOPIC = "uagv/v2/resq/AGV-7/state";

describe("MqttTelemetrySource", () => {
	it("starts idle and reports connecting then open", () => {
		const { client, source } = makeSource();

		expect(source.state).toBe("idle");
		source.connect();
		expect(source.state).toBe("connecting");
		client.emit("connect");
		expect(source.state).toBe("open");
		expect(source.connected).toBe(true);
	});

	it("subscribes static topics on connect", () => {
		const { client, source } = makeSource(["uagv/v2/resq/+/state"]);

		source.connect();
		client.emit("connect");

		expect(client.subscribed).toEqual(["uagv/v2/resq/+/state"]);
	});

	it("delivers a matching message to a filtered subscriber", () => {
		const { client, source } = makeSource();
		const onMessage = vi.fn();
		source.subscribe({ onMessage, topic: "uagv/v2/resq/+/state" });
		source.connect();
		client.emit("connect");

		client.deliver(STATE_TOPIC, '{"driving":true}');

		expect(onMessage).toHaveBeenCalledWith(STATE_TOPIC, '{"driving":true}');
	});

	it("withholds a non-matching message", () => {
		const { client, source } = makeSource();
		const onMessage = vi.fn();
		source.subscribe({ onMessage, topic: "uagv/v2/other/+/state" });
		source.connect();
		client.emit("connect");

		client.deliver(STATE_TOPIC, "{}");

		expect(onMessage).not.toHaveBeenCalled();
	});

	it("delivers every message to a subscriber with no filter", () => {
		const { client, source } = makeSource();
		const onMessage = vi.fn();
		source.subscribe({ onMessage });
		source.connect();
		client.emit("connect");

		client.deliver(STATE_TOPIC, "{}");
		client.deliver("anything/else", "{}");

		expect(onMessage).toHaveBeenCalledTimes(2);
		// A filterless subscriber listens but never subscribes anything new.
		expect(client.subscribed).toEqual([]);
	});

	it("decodes a binary payload", () => {
		const { client, source } = makeSource();
		const onMessage = vi.fn();
		source.subscribe({ onMessage });
		source.connect();
		client.emit("connect");

		client.deliver(STATE_TOPIC, new TextEncoder().encode('{"driving":false}'));

		expect(onMessage).toHaveBeenCalledWith(STATE_TOPIC, '{"driving":false}');
	});

	it("subscribes a filter once however many consumers share it", () => {
		const { client, source } = makeSource();
		source.connect();
		client.emit("connect");

		const first = source.subscribe({ topic: "fleet/+/state" });
		source.subscribe({ topic: "fleet/+/state" });

		expect(client.subscribed).toEqual(["fleet/+/state"]);

		// Still one consumer left, so the broker subscription stays.
		first();
		expect(client.unsubscribed).toEqual([]);
	});

	it("unsubscribes a filter once its last consumer detaches", () => {
		const { client, source } = makeSource();
		source.connect();
		client.emit("connect");

		const first = source.subscribe({ topic: "fleet/+/state" });
		const second = source.subscribe({ topic: "fleet/+/state" });

		first();
		second();

		expect(client.unsubscribed).toEqual(["fleet/+/state"]);
	});

	it("is idempotent when an unsubscribe runs twice", () => {
		const { client, source } = makeSource();
		source.connect();
		client.emit("connect");

		const off = source.subscribe({ topic: "fleet/+/state" });
		off();
		off();

		expect(client.unsubscribed).toEqual(["fleet/+/state"]);
	});

	it("re-subscribes every filter after a reconnect", () => {
		const { client, source } = makeSource(["static/#"]);
		source.subscribe({ topic: "fleet/+/state" });
		source.connect();
		client.emit("connect");

		client.emit("close");
		client.emit("reconnect");
		client.emit("connect");

		expect(client.subscribed).toEqual(["static/#", "fleet/+/state", "static/#", "fleet/+/state"]);
	});

	it("replays onOpen to a late subscriber", () => {
		const { client, source } = makeSource();
		source.connect();
		client.emit("connect");

		const onOpen = vi.fn();
		source.subscribe({ onOpen });

		expect(onOpen).toHaveBeenCalledTimes(1);
	});

	it("subscribes a late filter immediately when already open", () => {
		const { client, source } = makeSource();
		source.connect();
		client.emit("connect");

		source.subscribe({ topic: "late/#" });

		expect(client.subscribed).toEqual(["late/#"]);
	});

	it("reports reconnecting after an unexpected close", () => {
		const { client, source } = makeSource();
		const onStateChange = vi.fn();
		const onClose = vi.fn();
		source.subscribe({ onClose, onStateChange });
		source.connect();
		client.emit("connect");

		client.emit("close");

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(source.state).toBe("reconnecting");
		expect(onStateChange).toHaveBeenLastCalledWith("reconnecting");
	});

	it("reports closed after an intentional close", () => {
		const { client, source } = makeSource();
		source.connect();
		client.emit("connect");

		source.close();

		expect(client.ended).toBe(true);
		expect(source.state).toBe("closed");
		expect(source.connected).toBe(false);
	});

	it("swallows an error event without changing state", () => {
		const { client, source } = makeSource();
		source.connect();
		client.emit("connect");

		client.emit("error");

		expect(source.state).toBe("open");
	});

	it("publishes only while open", () => {
		const { client, source } = makeSource();

		expect(source.publish(STATE_TOPIC, "{}")).toBe(false);

		source.connect();
		client.emit("connect");
		expect(source.publish(STATE_TOPIC, '{"ok":true}')).toBe(true);
		expect(client.published).toEqual([{ payload: '{"ok":true}', topic: STATE_TOPIC }]);

		source.close();
		expect(source.publish(STATE_TOPIC, "{}")).toBe(false);
	});

	it("does not reopen on a repeated connect call", () => {
		const client = new FakeClient();
		const factory = vi.fn(() => client);
		const source = new MqttTelemetrySource({ connect: factory, url: "wss://broker.invalid/mqtt" });

		source.connect();
		source.connect();

		expect(factory).toHaveBeenCalledTimes(1);
	});

	it("stops treating a close as a reconnect once closed by the user", () => {
		const { client, source } = makeSource();
		source.connect();
		client.emit("connect");

		source.close();
		client.emit("close");

		expect(source.state).toBe("closed");
	});
});

describe("MqttTelemetrySource superseded clients", () => {
	it("ignores a delayed connect from a client that was closed", () => {
		const { client, source } = makeSource();
		source.connect();
		client.emit("connect");
		source.close();

		// The old client still holds our handlers; a late event must not revive it.
		client.emit("connect");

		expect(source.state).toBe("closed");
	});

	it("ignores a delayed message from a superseded client", () => {
		const first = new FakeClient();
		const second = new FakeClient();
		const clients = [first, second];
		let index = 0;
		const source = new MqttTelemetrySource({
			connect: () => clients[index++],
			url: "wss://broker.invalid/mqtt",
		});
		const onMessage = vi.fn();
		source.subscribe({ onMessage });

		source.connect();
		first.emit("connect");
		source.close();
		source.connect();
		second.emit("connect");

		first.deliver(STATE_TOPIC, '{"stale":true}');

		expect(onMessage).not.toHaveBeenCalled();
	});

	it("still delivers from the live client after a reconnect cycle", () => {
		const first = new FakeClient();
		const second = new FakeClient();
		const clients = [first, second];
		let index = 0;
		const source = new MqttTelemetrySource({
			connect: () => clients[index++],
			url: "wss://broker.invalid/mqtt",
		});
		const onMessage = vi.fn();
		source.subscribe({ onMessage });

		source.connect();
		first.emit("connect");
		source.close();
		source.connect();
		second.emit("connect");

		second.deliver(STATE_TOPIC, '{"live":true}');

		expect(onMessage).toHaveBeenCalledWith(STATE_TOPIC, '{"live":true}');
	});
});
