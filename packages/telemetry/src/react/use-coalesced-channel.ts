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
 * @fileoverview `useCoalescedChannel` — subscribe to the shared socket and
 * re-render at the display's rate rather than the vehicle's.
 *
 * A thin binding over `createCoalescer`; all the folding logic lives in the
 * framework-free core so it can be tested without a DOM. What this adds is the
 * React lifecycle: one coalescer per mounted socket, disposed on unmount so a
 * pending flush can never publish into an unmounted tree.
 *
 * @module @resq-systems/telemetry/react/use-coalesced-channel
 */

"use client";

import { useEffect, useRef, useState } from "react";

import {
	type CoalescedSnapshot,
	createCoalescer,
	defaultScheduler,
	type FlushScheduler,
} from "../coalesce.js";
import { type TelemetryChannel, useTelemetry } from "./use-telemetry.js";

//#region Types

export interface CoalescedChannelOptions<T> {
	/** Turn a raw frame into a value; `undefined` ignores the frame. */
	select: (raw: string) => T | undefined;
	/** Fold consecutive frames. Defaults to latest-wins. */
	reduce?: (previous: T | undefined, next: T) => T;
	/** Defaults to one animation frame. */
	schedule?: FlushScheduler;
	/** Called when the shared socket opens, including replay for a late mount. */
	onOpen?: () => void;
	/** Called when the shared socket closes. */
	onClose?: () => void;
}

export interface CoalescedChannel<T> extends TelemetryChannel {
	/** The most recently published value; `undefined` until the first flush. */
	value: T | undefined;
	/** Frames accepted since mount, including ones folded away. */
	received: number;
	/** Frames folded into another frame's render rather than causing one. */
	coalesced: number;
}

//#endregion

//#region Hook

/**
 * Subscribe to the shared socket, folding frames to one render per tick.
 *
 * The returned `value` stays at its last reading when the link drops — going
 * blank would claim the vehicle reported nothing, which is a different fact.
 * Deciding that a reading has gone stale belongs to the timestamp layer, not
 * here.
 *
 * @example
 * ```tsx
 * const attitude = useCoalescedChannel({
 *   select: (raw) => parseAttitude(raw),
 * });
 *
 * return <AttitudeIndicator {...attitude.value} stale={!attitude.connected} />;
 * ```
 */
export function useCoalescedChannel<T>(
	options: Readonly<CoalescedChannelOptions<T>>,
): CoalescedChannel<T> {
	const { socket, connected } = useTelemetry();
	const [snapshot, setSnapshot] = useState<CoalescedSnapshot<T> | undefined>(undefined);

	// Every callback is read through a ref, so a caller passing fresh closures
	// each render never tears down the subscription — the same contract
	// `useTelemetryChannel` offers.
	const ref = useRef(options);
	useEffect(() => {
		ref.current = options;
	}, [options]);

	useEffect(() => {
		const coalescer = createCoalescer<T>({
			onFlush: setSnapshot,
			reduce: (previous, next) => {
				const fold = ref.current.reduce;
				return fold === undefined ? next : fold(previous, next);
			},
			schedule: (flush) => (ref.current.schedule ?? defaultScheduler)(flush),
			select: (raw) => ref.current.select(raw),
		});

		const unsubscribe = socket.subscribe({
			onClose: () => ref.current.onClose?.(),
			onMessage: (data) => coalescer.push(data),
			onOpen: () => ref.current.onOpen?.(),
		});

		return () => {
			unsubscribe();
			// Dispose after unsubscribing: no frame can arrive in between, and any
			// tick already scheduled is cancelled before React drops the tree.
			coalescer.dispose();
		};
	}, [socket]);

	return {
		coalesced: snapshot?.coalesced ?? 0,
		connected,
		received: snapshot?.received ?? 0,
		send: (message: string) => socket.send(message),
		value: snapshot?.value,
	};
}

//#endregion
