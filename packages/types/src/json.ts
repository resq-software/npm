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
 * A JSON primitive value: `boolean`, `null`, `string`, or `number`. Note that
 * `undefined` is **not** a primitive here — it is not representable in JSON, and
 * `number` nominally excludes `NaN` / `±Infinity` (which `JSON.stringify` emits
 * as `null`), though the type cannot enforce that finiteness.
 */
export type JsonPrimitive = boolean | null | string | number;

/**
 * A JSON array holding any valid JSON values. Elements are always present (no
 * holes); a sparse slot serializes as `null`, so treat the type as dense.
 */
export type JsonArray = JsonValue[];

/**
 * A JSON object keyed by strings, with JSON values.
 *
 * The `| undefined` in the value type models keys that may be **absent** from
 * the serialized form: `JSON.stringify` drops a property whose value is
 * `undefined` entirely rather than emitting `"key": undefined`. So a member
 * typed `undefined` means "may be omitted", not "serializes to a literal
 * undefined" — round-tripping such a key through `stringify`/`parse` yields an
 * object without it.
 */
export interface JsonObject {
	[key: string]: JsonValue | undefined;
}

/**
 * Any valid JSON value: a primitive, an array, or an object. This is the closed
 * set that survives a `JSON.parse(JSON.stringify(x))` round-trip — it excludes
 * `undefined`, functions, `symbol`, `bigint`, and class instances, none of which
 * JSON can represent. Use it in place of `any` for anything that must serialize.
 */
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;
