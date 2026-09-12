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
 * @fileoverview React bindings for `@resq-systems/telemetry` (the `./react`
 * entry): a provider that owns one shared socket and hooks to consume it.
 *
 * @module @resq-systems/telemetry/react
 */

export {
	TelemetryContext,
	type TelemetryContextValue,
	TelemetryProvider,
	type TelemetryProviderProps,
} from "./telemetry-provider.js";
export {
	type CoalescedChannel,
	type CoalescedChannelOptions,
	useCoalescedChannel,
} from "./use-coalesced-channel.js";
export { type TelemetryChannel, useTelemetry, useTelemetryChannel } from "./use-telemetry.js";
