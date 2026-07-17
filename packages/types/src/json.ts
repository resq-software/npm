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
 * @fileoverview Structural JSON value types.
 *
 * @module @resq-systems/types/json
 *
 * The recursive {@link JsonValue} shape and its constituents, for typing
 * anything that must round-trip through `JSON.parse` / `JSON.stringify` without
 * falling back to `any`.
 */

/**
 * A JSON primitive value: `boolean`, `null`, `string`, or `number`.
 */
export type JsonPrimitive = boolean | null | string | number;

/**
 * A JSON array holding any valid JSON values.
 */
export type JsonArray = JsonValue[];

/**
 * A JSON object keyed by strings, with JSON values. Optional (`undefined`)
 * members model keys omitted from the serialized form.
 */
export interface JsonObject {
	[key: string]: JsonValue | undefined;
}

/**
 * Any valid JSON value: a primitive, an array, or an object.
 */
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;
